import { OFColor } from '../../ofColor';
import { OFOptSpriteQuadStruct, OFOptSpriteQuadUVStruct } from '../../data/ofSpriteQuad';
import { OFFramework } from '../../../../../ofFramework';
import { OFGraphicDevice } from '../../../../device/ofGraphicDevice';
import { OFBaseShader } from '../../../shader/ofBaseShader';
import { OFFrameworkFactory } from '../../../../../ofFrameworkFactory';
import { OFShaderTexture } from '../../../shader/ofShaderTexture';
import { OFImageContent } from '../../../../content/ofImageContent';
import { OFEnumVBOObjectType } from '../../../../device/optimization/gpu/ofEnumVBOObjectType';
import { IOFRenderArgs } from '../../../../../interfaces/iofRenderArgs';
import { mat4 } from 'gl-matrix';
import { OFOptSpriteBatcherRenderData } from '../../data/ofOptSpriteBatcherRenderData';

export class OFOptSpriteBatcher {

  protected readonly _framework: OFFramework;
  protected readonly _graphicDevice: OFGraphicDevice;
  protected readonly _graphicContext: WebGLRenderingContext;

  protected _shader: OFBaseShader;
  protected _spriteQuadData: Array<OFOptSpriteQuadStruct>;
  protected _spriteBatchRenderData: Array<OFOptSpriteBatcherRenderData>;
  protected _alreadyTransformedForRender: boolean;

  color: OFColor;

  constructor () {
    this._graphicDevice = OFFrameworkFactory.currentFramewok.mainGraphicDevice;
    this._graphicContext = this._graphicDevice.graphicContext;
    this._framework = this._graphicDevice.framework;

    this._shader = this._graphicDevice.shaderFactory.retrieveShader<OFShaderTexture>('ShaderTexture');
    this.color = OFColor.white();
    this._spriteQuadData = [];
    this._spriteBatchRenderData = [];
    this._alreadyTransformedForRender = false;
  }

  begin(): void {
    if (this._spriteBatchRenderData.length > 0) {
      this._spriteBatchRenderData.forEach(x => {
        x.vboObject.deactivate();
        x.iboObject.deactivate();
      });
    }

    this._spriteQuadData = [];
    this._spriteBatchRenderData = [];
    this._alreadyTransformedForRender = false;
  }

  pushSprite(x: number, y: number, width: number, height: number, uvs: OFOptSpriteQuadUVStruct, imageContent: OFImageContent, sortId: string): void {
    const quadData = {
      x,
      y,
      width,
      height,
      imageContent,
      uv00_x: 0, uv00_y: 0,
      uv10_x: 0, uv10_y: 0,
      uv11_x: 0, uv11_y: 0,
      uv01_x: 0, uv01_y: 0,
      sortId
    } as OFOptSpriteQuadStruct;

    if (!uvs) {
      quadData.uv00_x = 0; quadData.uv00_y = 0;
      quadData.uv10_x = 0; quadData.uv10_y = 0;
      quadData.uv11_x = 0; quadData.uv11_y = 0;
      quadData.uv01_x = 0; quadData.uv01_y = 0;
    } else {
      quadData.uv00_x = uvs.uv00_x; quadData.uv00_y = uvs.uv00_y;
      quadData.uv10_x = uvs.uv10_x; quadData.uv10_y = uvs.uv10_y;
      quadData.uv11_x = uvs.uv11_x; quadData.uv11_y = uvs.uv11_y;
      quadData.uv01_x = uvs.uv01_x; quadData.uv01_y = uvs.uv01_y;
    }

    this._spriteQuadData.push(quadData);
  }

  end(): void {
    if (!this._alreadyTransformedForRender) {
      this._alreadyTransformedForRender = true;

      if (this._spriteQuadData.length > 0) {
        // Sort first: Doesn't matter the order, only the grouping
        this._spriteQuadData = this._spriteQuadData.sort((a, b) => a.sortId.localeCompare(b.sortId));

        const sortId = this._spriteQuadData[0].sortId;
        let vertices = [];
        let indices = [];
        let imageContent = null;
        let indicesCount = 0;
        let vertexCount = 0;

        this._spriteQuadData.forEach(sqData => {
          if (sortId !== sqData.sortId) {
            // Phase 1: Flush it!
            this.flush(imageContent, vertices, indices, vertexCount, indicesCount);

            // Phase 2: Clear and start again
            vertices = [];
            indices = [];
            vertexCount = 0;
            indicesCount = 0;
          }

          const vx = sqData.x;
          const vy = sqData.y;
          const vw = sqData.width;
          const vh = sqData.height;

          imageContent = sqData.imageContent;

          vertices.push(
            vx + 0, vy + 0, 0.0,    sqData.uv00_x, sqData.uv00_y,
            vx + vw, vy + 0, 0.0,   sqData.uv10_x, sqData.uv10_y,
            vx + vw, vy + vh, 0.0,  sqData.uv11_x, sqData.uv11_y,
            vx + 0, vy + vh, 0.0,   sqData.uv01_x, sqData.uv01_y
          );

          indices.push(
            vertexCount + 0, vertexCount + 1, vertexCount + 2,
            vertexCount + 2, vertexCount + 3, vertexCount + 0
          );

          vertexCount += 4;
          indicesCount += 6;
        });

        // Last flush
        if (vertexCount > 0 && indicesCount > 0) {
          this.flush(imageContent, vertices, indices, vertexCount, indicesCount);
        }
      }

      this._spriteQuadData = [];
    }
  }

  private flush (imageContent: OFImageContent, vertices: Array<number>, indices: Array<number>, 
    vertexCount: number, indicesCount: number): void {

    const _GL = this._graphicContext;
    let arrayBufferGPUVertex = new Float32Array(vertices);
    let arrayBufferGPUIndex = new Uint16Array(indices);

    // Get a VBO for this object
    const vboObject = this._graphicDevice.deviceOptimizationManager.vboPooler
      .getAvailableVBO(OFEnumVBOObjectType.VertexBuffer);
    vboObject.activate(OFEnumVBOObjectType.VertexBuffer);
    // Get a IBO for this object
    const iboObject = this._graphicDevice.deviceOptimizationManager.vboPooler
      .getAvailableVBO(OFEnumVBOObjectType.IndexBuffer);
    iboObject.activate(OFEnumVBOObjectType.IndexBuffer);

    // Now we set the vertices interleaved array to the VertexBuffer
    _GL.bindBuffer(_GL.ARRAY_BUFFER, vboObject.vbo);
    _GL.bufferData(_GL.ARRAY_BUFFER, arrayBufferGPUVertex, _GL.DYNAMIC_DRAW);
    // Now we set the indices array to the IndexBuffer
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, iboObject.vbo);
    _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, arrayBufferGPUIndex, _GL.DYNAMIC_DRAW);
    // Clear it
    _GL.bindBuffer(_GL.ARRAY_BUFFER, null);
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, null);

    arrayBufferGPUVertex = null;
    arrayBufferGPUIndex = null;

    // Now store it as a batch render data
    const renderData = {} as OFOptSpriteBatcherRenderData;
    renderData.vboObject = vboObject;
    renderData.iboObject = iboObject;
    renderData.vertexCount = vertexCount;
    renderData.indicesCount = indicesCount;
    renderData.imageTexture = imageContent.imageTexture;

    this._spriteBatchRenderData.push(renderData);
  }

  draw (args: IOFRenderArgs, transformationMatrix: mat4): void {
    const _GL = this._graphicContext;

    for (const renderData of this._spriteBatchRenderData) {
      if (!transformationMatrix) {
        this._shader.setTranslate(0, 0, 0);
        this._shader.setRotation(0, 0, 0);
        this._shader.setScale(1, 1, 1);
      }

      this._shader.setColorByIndex(0, this.color);
      this._shader.setTextureByIndex(0, renderData.imageTexture);
      this._shader.draw(args, renderData.vboObject.vbo, transformationMatrix,
        _GL.TRIANGLES, renderData.iboObject.vbo, renderData.indicesCount);
    }
  }

  destroy(): void {
    (this as any)['_framework'] = null;
    (this as any)['_graphicDevice'] = null;
    (this as any)['_graphicContext'] = null;

    this.color = null;
    this._spriteQuadData = null;
    this._shader = null;

    this._spriteBatchRenderData?.forEach(x => {
      x.vboObject?.deactivate();
      x.iboObject?.deactivate();
    });
    this._spriteBatchRenderData = null;
  }
}
