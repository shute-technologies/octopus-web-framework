import { OFColor } from '../../ofColor';
import { OFGraphicDevice } from '../../../../device/ofGraphicDevice';
import { OFImageContent } from '../../../../content/ofImageContent';
import { OFBaseShader } from '../../../shader/ofBaseShader';
import { OFConsole } from '../../../../../helpers/ofConsole';
import { IOFRenderArgs } from '../../../../../interfaces/iofRenderArgs';
import { OFFrameworkFactory } from '../../../../../ofFrameworkFactory';
import { OFTranslations } from '../../../../../settings/ofTranslations';
import { OFEnumVBOObjectType } from '../../../../device/optimization/gpu/ofEnumVBOObjectType';
import { OFVBOObject } from '../../../../device/optimization/gpu/ofVBOObject';
import { mat4 } from 'gl-matrix';
import { OFEnumShaderDataTypes } from '../../../../../../cross-cutting/shader-analizer/ofEnumShaderDataTypes';
import { OFEnumBlendMode } from '../../../shader/ofEnumBlendMode';
import { IDictionary } from 'shute-technologies.common-and-utils';

export interface OFIPolygonBatcherUniformData {
  index: number;
  type: OFEnumShaderDataTypes;
  value: OFColor | WebGLTexture;
}

export class OFPolygonBatcher {
  private static readonly MAX_VERTICES = 10920;
  private static readonly CURRENT_DEFAULT_SHADER = 'SpineShaderTexture';
  // aVertexPosition(2) + aVertexColor(4) + aTextureCoord(2), the layout pushQuads() takes.
  private static readonly FLOATS_PER_VERTEX = 8;

  private _vertexCount: number;
  private _indexCount: number;
  private _imageContent: OFImageContent;
  private _graphicDevice: OFGraphicDevice;
  private _GL: WebGLRenderingContext;

  private _arrayBufferGPUVertex: Float32Array;
  private _arrayBufferGPUIndex: Uint16Array;
  // What the GPU buffers hold, in floats and indices: endDraw() re-allocates them only to grow.
  private _gpuVertexCapacity = 0;
  private _gpuIndexCapacity = 0;

  private _shader: OFBaseShader;

  blendMode: OFEnumBlendMode = OFEnumBlendMode.Alpha;

  // Get a VBO for this object
  private _vBOObject: OFVBOObject;
  // Get a IBO for this object
  private _iBOObject: OFVBOObject;

  // count: where the array starts in the batch, in floats; length: how many of its floats are used (all when unset).
  private _vertices: Array<{ array: ArrayLike<number>; count: number; length?: number }>;
  private _indices: Array<number>;
  // Each pushQuads() call: where its indices go among _indices, its first vertex, and how many quads.
  private _quadRuns: Array<{ indexAt: number; firstVertex: number; quadCount: number }>;
  // Set by endDraw(): the batch is quads only, and draws with the device's shared quad index buffer.
  private _drawsQuads = false;

  set imageContent(val: OFImageContent) {
    this._imageContent = val;
  }

  constructor() {
    this._vertexCount = 0;
    this._indexCount = 0;
    this._imageContent = null;
    this._vertices = [];
    this._indices = [];
    this._quadRuns = [];

    this._graphicDevice = OFFrameworkFactory.currentFramewok.mainGraphicDevice;
    this._shader = this._graphicDevice.shaderFactory.retrieveShader(OFPolygonBatcher.CURRENT_DEFAULT_SHADER);
    this._GL = this._graphicDevice.graphicContext;

    // Get a VBO for this object
    this._vBOObject = this._graphicDevice.deviceOptimizationManager.vboPooler.getAvailableVBO(OFEnumVBOObjectType.VertexBuffer);
    this._vBOObject.activate(OFEnumVBOObjectType.VertexBuffer);
    // Get a IBO for this object
    this._iBOObject = this._graphicDevice.deviceOptimizationManager.vboPooler.getAvailableVBO(OFEnumVBOObjectType.IndexBuffer);
    this._iBOObject.activate(OFEnumVBOObjectType.IndexBuffer);
  }

  changeShader(name: string): void {
    let changed = false;

    if (name && name.length > 0) {
      const shader = this._graphicDevice.shaderFactory.retrieveShader(name);

      if (shader) {
        changed = true;
        this._shader = shader;
      } else {
        this._shader = this._graphicDevice.shaderFactory.retrieveShader(OFPolygonBatcher.CURRENT_DEFAULT_SHADER);
      }
    }

    if (!changed) {
      OFConsole.warn(this, OFTranslations.Framework.GraphicsOptimization.PolygonBatcher.changeShader, name);
    }
  }

  setShader(shader: OFBaseShader): void {
    let changed = false;

    if (shader && this._shader && this._shader.name !== shader.name) {
      changed = true;
      this._shader = shader;
    } else {
      if (!shader) {
        this._shader = this._graphicDevice.shaderFactory.retrieveShader(OFPolygonBatcher.CURRENT_DEFAULT_SHADER);
      }
    }

    if (!changed) {
      OFConsole.warn(this, OFTranslations.Framework.GraphicsOptimization.PolygonBatcher.changeShader, this._shader.name);
    }
  }

  beginDraw(): void {
    // Emptied, not replaced: a batcher drawn every frame allocates nothing here.
    if (this._vertices) { this._vertices.length = 0; } else { this._vertices = []; }
    if (this._indices) { this._indices.length = 0; } else { this._indices = []; }
    if (this._quadRuns) { this._quadRuns.length = 0; } else { this._quadRuns = []; }
    this._vertexCount = 0;
    this._indexCount = 0;
  }

  /**
   * Adds `quadCount` quads: 4 vertices each of 8 floats (aVertexPosition 2, aVertexColor 4, aTextureCoord 2) in
   * OFSprite's triangle-strip corner order, drawn as the triangles 0, 1, 2 and 2, 1, 3. No indices are built: a
   * batch of quads only draws with the device's shared quad index buffer (OFGraphicDevice.quadIndexBuffer()).
   * Quads and pushPolygon() may be mixed in one batch, and draw in the order they were pushed.
   *
   * `vertices` is kept until endDraw() copies it, so a caller must not change it before then. A batch draws at
   * most OFGraphicDevice.maxQuadsPerDraw quads, the most 16-bit indices reach.
   */
  pushQuads(vertices: ArrayLike<number>, quadCount: number): void {
    if (!vertices || !(quadCount > 0)) {
      return;
    }

    const floatsPerQuad = OFPolygonBatcher.FLOATS_PER_VERTEX * 4;
    const count = Math.min(Math.floor(quadCount), Math.floor(vertices.length / floatsPerQuad));

    if (count <= 0) {
      return;
    }

    this._quadRuns.push({
      indexAt: this._indices.length,
      firstVertex: this._vertexCount / OFPolygonBatcher.FLOATS_PER_VERTEX,
      quadCount: count
    });
    this._vertices.push({ array: vertices, count: this._vertexCount, length: count * floatsPerQuad });

    this._indexCount += count * 6;
    this._vertexCount += count * floatsPerQuad;
  }

  pushPolygon(vertices: Array<number>, indices: Array<number>): void {
    if (!vertices || !indices) {
      return;
    }
    // TODO: Should group them in drawGroups, and in the end draw everything

    // 8 floats per vertex: aVertexPosition(2) + aVertexColor(4) + aTextureCoord(2).
    const indexStart = this._vertexCount / 8;

    // Rebase the *incoming* indices onto this batch. This loop used to walk `this._indices` (the
    // still-empty accumulator), so every batch uploaded an empty index buffer and then drew
    // `_indexCount` elements from it: GL_INVALID_OPERATION, and nothing on screen.
    for (const index of indices) {
      this._indices.push(index + indexStart);
    }

    this._vertices.push({ array: vertices, count: this._vertexCount });

    this._indexCount += indices.length;
    this._vertexCount += vertices.length;

    // if (texture != this.lastTexture) {
    // this.flush();
    // this.lastTexture = texture;
    // texture.bind();
    // }
    // else if (this.verticesLength + vertices.length > this.mesh.getVertices().length ||
    //    this.indicesLength + indices.length > this.mesh.getIndices().length) {

    // this.flush();
    // }
  }

  /** The capacity a grow-only array takes to hold `needed`: exactly that the first time, then at least double. */
  private static grownCapacity(current: number, needed: number): number {
    return current === 0 ? needed : Math.max(needed, current * 2);
  }

  /**
   * Uploads the batch. The typed arrays and the GPU buffers only grow: within their capacity the data goes in with
   * bufferSubData and nothing is allocated. A batch of quads only uploads no indices (see pushQuads()).
   */
  // tslint:disable-next-line: cyclomatic-complexity
  endDraw(): void {
    if (this._vertexCount === 0) {
      return;
    }

    const _GL = this._GL;
    const device = this._graphicDevice;
    const vertexCount = this._vertexCount;
    let vertexArray = this._arrayBufferGPUVertex;

    if (!vertexArray || vertexArray.length < vertexCount) {
      vertexArray = this._arrayBufferGPUVertex = new Float32Array(
        OFPolygonBatcher.grownCapacity(vertexArray ? vertexArray.length : 0, vertexCount));
    }

    for (let i = 0, lengthArray = this._vertices.length; i < lengthArray; i++) {
      const obj = this._vertices[i];
      const array = obj.array;

      if (obj.length === undefined || obj.length >= array.length) {
        vertexArray.set(array, obj.count);
      } else {
        for (let f = 0, at = obj.count; f < obj.length; f++, at++) { vertexArray[at] = array[f]; }
      }
    }

    // Now we set the vertices interleaved array to the VertexBuffer
    device.bindBuffer(_GL.ARRAY_BUFFER, this._vBOObject.vbo);

    if (!(this._gpuVertexCapacity >= vertexCount)) {
      _GL.bufferData(_GL.ARRAY_BUFFER, vertexArray, _GL.DYNAMIC_DRAW);
      this._gpuVertexCapacity = vertexArray.length;
    } else {
      _GL.bufferSubData(_GL.ARRAY_BUFFER, 0, vertexArray.subarray(0, vertexCount));
    }

    const quadRuns = this._quadRuns || [];
    const indices = this._indices;

    if (indices.length === 0 && quadRuns.length > 0) {
      this._drawsQuads = true;
      return;
    }

    this._drawsQuads = false;

    // The indices, with each run of quads' indices written where it was pushed.
    let quadIndexCount = 0;

    for (const run of quadRuns) { quadIndexCount += run.quadCount * 6; }

    const indexCount = indices.length + quadIndexCount;
    let indexArray = this._arrayBufferGPUIndex;

    if (!indexArray || indexArray.length < indexCount) {
      indexArray = this._arrayBufferGPUIndex = new Uint16Array(
        OFPolygonBatcher.grownCapacity(indexArray ? indexArray.length : 0, indexCount));
    }

    if (quadRuns.length === 0) {
      indexArray.set(indices, 0);
    } else {
      let from = 0;
      let at = 0;

      for (const run of quadRuns) {
        for (; from < run.indexAt; from++, at++) { indexArray[at] = indices[from]; }

        for (let quad = 0, first = run.firstVertex; quad < run.quadCount; quad++, first += 4) {
          indexArray[at++] = first;
          indexArray[at++] = first + 1;
          indexArray[at++] = first + 2;
          indexArray[at++] = first + 2;
          indexArray[at++] = first + 1;
          indexArray[at++] = first + 3;
        }
      }

      for (; from < indices.length; from++, at++) { indexArray[at] = indices[from]; }
    }

    // Now we set the indices array to the IndexBuffer
    device.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iBOObject.vbo);

    if (!(this._gpuIndexCapacity >= indexCount)) {
      _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, indexArray, _GL.DYNAMIC_DRAW);
      this._gpuIndexCapacity = indexArray.length;
    } else {
      _GL.bufferSubData(_GL.ELEMENT_ARRAY_BUFFER, 0, indexArray.subarray(0, indexCount));
    }
  }

  draw(args: IOFRenderArgs, transformationMatrix?: mat4, renderMode?: number, uniformData?: IDictionary<OFIPolygonBatcherUniformData>): void {
    const _renderMode = !renderMode ? this._GL.TRIANGLES : renderMode;

    if (!transformationMatrix) {
      // TODO: Optimize this in a single identity function
      this._shader.setTranslate(0, 0, 0);
      this._shader.setRotation(0, 0, 0);
      this._shader.setScale(1, 1, 1);
    }

    if (uniformData) {
      for (const key of Object.keys(uniformData)) {
        const uData = uniformData[key];

        switch (uData.type) {
          case OFEnumShaderDataTypes.IColor:
            this._shader.setColorByIndex(uData.index, uData.value as OFColor);
            break;
          case OFEnumShaderDataTypes.ITexture:
            this._shader.setTextureByIndex(uData.index, uData.value as WebGLTexture);
            break;
        }
      }
    }

    if (this._imageContent) {
      this._shader.setTextureByIndex(0, this._imageContent.imageTexture);
    }

    // The shader is shared per name, so the mode is written before every draw.
    this._shader.blendMode = this.blendMode;
    // The buffers stay bound after the draw: the device skips binding them again for the next one.
    if (this._drawsQuads) {
      const indexCount = Math.min(this._indexCount, OFGraphicDevice.maxQuadsPerDraw * 6);

      this._shader.draw(args, this._vBOObject.vbo, transformationMatrix, _renderMode,
        this._graphicDevice.quadIndexBuffer(), indexCount);
    } else {
      this._shader.draw(args, this._vBOObject.vbo, transformationMatrix, _renderMode, this._iBOObject.vbo, this._indexCount);
    }
  }

  destroy(): void {
    this._GL = null;
    this._graphicDevice = null;
    this._imageContent = null;

    this._arrayBufferGPUVertex = null;
    this._arrayBufferGPUIndex = null;
    this._vertices = null;
    this._indices = null;
    this._quadRuns = null;
    this._shader = null;

    if (this._vBOObject) {
      this._vBOObject.deactivate();
    }
    if (this._iBOObject) {
      this._iBOObject.deactivate();
    }

    this._vBOObject = null;
    this._iBOObject = null;
  }
}
