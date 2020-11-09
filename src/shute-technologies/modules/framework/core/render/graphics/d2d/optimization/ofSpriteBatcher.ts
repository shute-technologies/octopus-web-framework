import { IOFRenderArgs } from "../../../../../interfaces/iofRenderArgs";
import { OFFramework } from "../../../../../ofFramework";
import { OFFrameworkFactory } from "../../../../../ofFrameworkFactory";
import { OFImageContent } from "../../../../content/ofImageContent";
import { OFGraphicDevice } from "../../../../device/ofGraphicDevice";
import { OFEnumVBOObjectType } from "../../../../device/optimization/gpu/ofEnumVBOObjectType";
import { OFVBOObject } from "../../../../device/optimization/gpu/ofVBOObject";
import { OFBaseShader } from "../../../shader/ofBaseShader";
import { OFShaderTexture } from "../../../shader/ofShaderTexture";
import { OFSprite } from "../ofSprite";

export class OFSpriteBatcher {

  protected readonly _framework: OFFramework;
  protected readonly _graphicDevice: OFGraphicDevice;
  protected readonly _graphicContext: WebGLRenderingContext;

  protected _vboObject: OFVBOObject;
  protected _iboObject: OFVBOObject;
  protected _shader: OFBaseShader;
  protected _vertices: number[];
  protected _indices: number[];

  private _imageContent: OFImageContent;
  private _imageGLTexture: WebGLTexture;
  private _arrayBufferGPUVertex: Float32Array;
  private _arrayBufferGPUIndex: Uint16Array;

  private _vertexCount: number;
  private _indexCount: number;

  constructor (spritePath: string) {
    this._vertexCount = 0;
    this._indexCount = 0;
    this._vertices = [];
    this._indices = [];

    this._graphicDevice = OFFrameworkFactory.currentFramewok.mainGraphicDevice;
    this._graphicContext = this._graphicDevice.graphicContext;
    this._framework = this._graphicDevice.framework;

    this._imageContent = this._framework.contentManager.getContent<OFImageContent>(spritePath);
    this._imageGLTexture = this._imageContent.imageTexture;

    this._shader = this._graphicDevice.shaderFactory.retrieveShader<OFShaderTexture>("ShaderTexture");
  }

  initialize(): void {
    // Get a VBO for this object
    this._vboObject = this._graphicDevice.deviceOptimizationManager
      .vboPooler.getAvailableVBO(OFEnumVBOObjectType.VertexBuffer);
    this._vboObject.activate(OFEnumVBOObjectType.VertexBuffer);
    // Get a IBO for this object
    this._iboObject = this._graphicDevice.deviceOptimizationManager
      .vboPooler.getAvailableVBO(OFEnumVBOObjectType.IndexBuffer);
    this._iboObject.activate(OFEnumVBOObjectType.IndexBuffer);
  }

  beginDraw(): void {
    this._vertices = [];
    this._indices = [];
    this._vertexCount = 0;
    this._indexCount = 0;
  }

  drawGraphic(graphic: OFSprite): void {
    const qTC = graphic.quadTextCoords;
    const vx = graphic.x;
    const vy = graphic.y;
    const hw = (qTC.width / 2) * graphic.scaleX;
    const hh = (qTC.height / 2) * graphic.scaleY;

    if (graphic.rotation !== 0) {
      const cosAngle = Math.cos(graphic.rotation);
      const sinAngle = Math.sin(graphic.rotation);

      let x_0 = vx + hw;
      let x_1 = vx - hw;
      let x_2 = vx + hw;
      let x_3 = vx - hw;
      
      let y_0 = vy + hh;
      let y_1 = vy + hh;
      let y_2 = vy - hh;
      let y_3 = vy - hh;

      const centerX = (x_0 + x_1 + x_2 + x_3) * 0.25;
      const centerY = (y_0 + y_1 + y_2 + y_3) * 0.25;

      x_0 -= centerX;
      x_1 -= centerX;
      x_2 -= centerX;
      x_3 -= centerX;

      y_0 -= centerY;
      y_1 -= centerY;
      y_2 -= centerY;
      y_3 -= centerY;

      let _x_0 = x_0;
      let _x_1 = x_1;
      let _x_2 = x_2;
      let _x_3 = x_3;
      
      let _y_0 = y_0;
      let _y_1 = y_1;
      let _y_2 = y_2;
      let _y_3 = y_3;

      x_0 = (cosAngle * _x_0 - sinAngle * _y_0);
      y_0 = (sinAngle * _x_0 + cosAngle * _y_0);

      x_1 = (cosAngle * _x_1 - sinAngle * _y_1);
      y_1 = (sinAngle * _x_1 + cosAngle * _y_1);

      x_2 = (cosAngle * _x_2 - sinAngle * _y_2);
      y_2 = (sinAngle * _x_2 + cosAngle * _y_2);

      x_3 = (cosAngle * _x_3 - sinAngle * _y_3);
      y_3 = (sinAngle * _x_3 + cosAngle * _y_3);

      x_0 += centerX;
      x_1 += centerX;
      x_2 += centerX;
      x_3 += centerX;

      y_0 += centerY;
      y_1 += centerY;
      y_2 += centerY;
      y_3 += centerY;

      this._vertices.push(
        x_0, y_0, 0.0, qTC.right, qTC.down,
        x_1, y_1, 0.0, qTC.left, qTC.down,
        x_2, y_2, 0.0, qTC.right, qTC.up,
        x_3, y_3, 0.0, qTC.left, qTC.up);
    }
    else {
      this._vertices.push(
        vx + hw, vy + hh, 0.0, qTC.right, qTC.down,
        vx - hw, vy + hh, 0.0, qTC.left, qTC.down,
        vx + hw, vy - hh, 0.0, qTC.right, qTC.up,
        vx - hw, vy - hh, 0.0, qTC.left, qTC.up);
    }

    // Degenerate indices    
    if (this._vertexCount !== 0) {
      this._indices.push(this._vertexCount -1, this._vertexCount, this._vertexCount, 
        this._vertexCount + 1, this._vertexCount + 2, this._vertexCount + 3);
    }
    else {
      this._indices.push(this._vertexCount, this._vertexCount + 1, this._vertexCount + 2,
        this._vertexCount + 3);
    }

    this._vertexCount += 4;
    this._indexCount = this._indices.length;
  }

  endDraw(): void {
    if (this._vertexCount !== 0) {
      if (this._arrayBufferGPUVertex != null) { this._arrayBufferGPUVertex = null; }
      if (this._arrayBufferGPUIndex != null) { this._arrayBufferGPUIndex = null; }

      this._arrayBufferGPUVertex = new Float32Array(this._vertices);
      this._arrayBufferGPUIndex = new Uint16Array(this._indices);
      
      const _GL = this._graphicContext;
      // Now we set the vertices interleaved array to the VertexBuffer
      _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
      _GL.bufferData(_GL.ARRAY_BUFFER, this._arrayBufferGPUVertex, _GL.DYNAMIC_DRAW);
      // Now we set the indices array to the IndexBuffer
      _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iboObject.vbo);
      _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, this._arrayBufferGPUIndex, _GL.STATIC_DRAW);
    }
  }

  update(args: IOFRenderArgs): void {
    if (this._vertexCount !== 0) {        
      if (this._imageContent.isLoaded && this._vertexCount !== 0) {
        const shader = this._shader as OFShaderTexture;

        shader.setTranslate(0, 0, 0);
        shader.rotationZ = 0;
        shader.setScale(1, 1, 1);
        shader.drawElements(args, this._imageGLTexture, this._iboObject.vbo, this._vboObject.vbo, this._indexCount);
    
        const _GL = this._graphicContext;
        _GL.bindBuffer(_GL.ARRAY_BUFFER, null);
        _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, null);
      }
    }
  }

  destroy(): void {
    if (this._arrayBufferGPUVertex) { this._arrayBufferGPUVertex = null; }
    if (this._arrayBufferGPUIndex) { this._arrayBufferGPUIndex = null; }

    if (this._vboObject) { this._vboObject.deactivate(); }
    if (this._iboObject) { this._iboObject.deactivate(); }

    this._vboObject = null;
    this._iboObject = null;
    this._vertices = null;
    this._indices = null;
  }
}
