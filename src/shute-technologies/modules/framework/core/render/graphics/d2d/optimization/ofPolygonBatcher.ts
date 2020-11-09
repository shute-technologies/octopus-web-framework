import { OFColor } from "../../ofColor";
import { OFGraphicDevice } from '../../../../device/ofGraphicDevice';
import { OFImageContent } from '../../../../content/ofImageContent';
import { OFBaseShader } from "../../../shader/ofBaseShader";
import { Dictionary } from "../../../../../common/ofInterfaces";
import { OFConsole } from "../../../../../helpers/ofConsole";
import { IOFRenderArgs } from "../../../../../interfaces/iofRenderArgs";
import { OFFrameworkFactory } from "../../../../../ofFrameworkFactory";
import { OFTranslations } from "../../../../../settings/ofTranslations";
import { OFEnumVBOObjectType } from "../../../../device/optimization/gpu/ofEnumVBOObjectType";
import { OFVBOObject } from "../../../../device/optimization/gpu/ofVBOObject";

export enum OFEnumInternalShaderTypes {
  IColor = 19,
  ITexture = 20,
}

export interface OFIPolygonBatcherUniformData {
  index: number;
  type: OFEnumInternalShaderTypes;
  value: OFColor | WebGLTexture;
}

export class OFPolygonBatcher {
  private static readonly MAX_VERTICES = 10920;
  private static readonly CURRENT_DEFAULT_SHADER = 'SpineShaderTexture';

  private _vertexCount: number;
  private _indexCount: number;
  private _imageContent: OFImageContent;
  private _graphicDevice: OFGraphicDevice;
  private _GL: WebGLRenderingContext;

  private _arrayBufferGPUVertex;
  private _arrayBufferGPUIndex;

  private _shader: OFBaseShader;

  // Get a VBO for this object
  private _vBOObject: OFVBOObject;
  // Get a IBO for this object
  private _iBOObject: OFVBOObject;

  private _vertices: Array<{ array: Array<number>; count: number }>;
  private _indices: Array<number>;

  set imageContent(val: OFImageContent) {
    this._imageContent = val;
  }

  constructor() {
    this._vertexCount = 0;
    this._indexCount = 0;
    this._imageContent = null;
    this._vertices = [];
    this._indices = [];

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
      OFConsole.warn(OFTranslations.Framework.GraphicsOptimization.PolygonBatcher.changeShader, name);
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
      OFConsole.warn(OFTranslations.Framework.GraphicsOptimization.PolygonBatcher.changeShader, this._shader.name);
    }
  }

  beginDraw(): void {
    this._vertices = [];
    this._indices = [];
    this._vertexCount = 0;
    this._indexCount = 0;
  }

  pushPolygon(vertices: Array<number>, indices: Array<number>): void {
    if (!vertices || !indices) {
      return;
    }
    // TODO: Should group them in drawGroups, and in the end draw everything

    const indexStart = this._vertexCount / 8;

    for (let i = 0; i < indices.length; i++) {
      this._indices.push(indices[i] + indexStart);
    }

    this._vertices.push({ array: vertices, count: this._vertexCount });

    this._indexCount += indices.length;
    this._vertexCount += vertices.length;

    //if (texture != this.lastTexture) {
    //this.flush();
    //this.lastTexture = texture;
    //texture.bind();
    //}
    //else if (this.verticesLength + vertices.length > this.mesh.getVertices().length ||
    //    this.indicesLength + indices.length > this.mesh.getIndices().length) {

    //this.flush();
    //}
  }

  endDraw(): void {
    if (this._vertexCount !== 0) {
      if (this._arrayBufferGPUVertex) {
        this._arrayBufferGPUVertex = null;
      }
      if (this._arrayBufferGPUIndex) {
        this._arrayBufferGPUIndex = null;
      }

      this._arrayBufferGPUVertex = new Float32Array(this._vertexCount);
      this._arrayBufferGPUIndex = new Uint16Array(this._indices);

      for (let i = 0, lengthArray = this._vertices.length; i < lengthArray; i++) {
        const obj = this._vertices[i];
        this._arrayBufferGPUVertex.set(obj.array, obj.count);
      }

      // Now we set the vertices interleaved array to the VertexBuffer
      this._GL.bindBuffer(this._GL.ARRAY_BUFFER, this._vBOObject.vbo);
      this._GL.bufferData(this._GL.ARRAY_BUFFER, this._arrayBufferGPUVertex, this._GL.DYNAMIC_DRAW);
      // Now we set the indices array to the IndexBuffer
      this._GL.bindBuffer(this._GL.ELEMENT_ARRAY_BUFFER, this._iBOObject.vbo);
      this._GL.bufferData(this._GL.ELEMENT_ARRAY_BUFFER, this._arrayBufferGPUIndex, this._GL.STATIC_DRAW);

      this._GL.bindBuffer(this._GL.ARRAY_BUFFER, null);
      this._GL.bindBuffer(this._GL.ELEMENT_ARRAY_BUFFER, null);
    }
  }

  draw(args: IOFRenderArgs, transformationMatrix, renderMode?: number, uniformData?: Dictionary<OFIPolygonBatcherUniformData>): void {
    const _renderMode = !renderMode ? this._GL.TRIANGLES : renderMode;

    //_GL.bindBuffer(_GL.ARRAY_BUFFER, mVBOObject.VBO);
    //_GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, mIBOObject.VBO);

    if (!transformationMatrix) {
      // TODO: Optimize this in a single identity function
      this._shader.setTranslate(0, 0, 0);
      this._shader.setRotation(0, 0, 0);
      this._shader.setScale(1, 1, 1);
    }

    if (uniformData) {
      for (const key in uniformData) {
        const uData = uniformData[key];

        switch (uData.type) {
          case OFEnumInternalShaderTypes.IColor:
            this._shader.setColorByIndex(uData.index, uData.value as OFColor);
            break;
          case OFEnumInternalShaderTypes.ITexture:
            this._shader.setTextureByIndex(uData.index, uData.value as WebGLTexture);
            break;
        }
      }
    }

    if (this._imageContent) {
      this._shader.setTextureByIndex(0, this._imageContent.imageTexture);
    }

    this._shader.draw(args, this._vBOObject.vbo, transformationMatrix, _renderMode, this._iBOObject.vbo, this._indexCount);

    this._GL.bindBuffer(this._GL.ARRAY_BUFFER, null);
    this._GL.bindBuffer(this._GL.ELEMENT_ARRAY_BUFFER, null);
  }

  destroy(): void {
    this._GL = null;
    this._graphicDevice = null;
    this._imageContent = null;

    this._arrayBufferGPUVertex = null;
    this._arrayBufferGPUIndex = null;
    this._vertices = null;
    this._indices = null;
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
