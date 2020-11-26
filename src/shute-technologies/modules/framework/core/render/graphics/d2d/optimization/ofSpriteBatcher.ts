import { IOFRenderArgs } from '../../../../../interfaces/iofRenderArgs';
import { OFFramework } from '../../../../../ofFramework';
import { OFFrameworkFactory } from '../../../../../ofFrameworkFactory';
import { OFImageContent } from '../../../../content/ofImageContent';
import { OFGraphicDevice } from '../../../../device/ofGraphicDevice';
import { OFEnumVBOObjectType } from '../../../../device/optimization/gpu/ofEnumVBOObjectType';
import { OFVBOObject } from '../../../../device/optimization/gpu/ofVBOObject';
import { OFBaseShader } from '../../../shader/ofBaseShader';
import { OFShaderTexture } from '../../../shader/ofShaderTexture';
import { OFSprite } from '../ofSprite';

class OFSBBatchGroup {
  vboObject: OFVBOObject;
  iboObject: OFVBOObject;
  vertices: number[];
  indices: number[];
  vertexCount: number;
  indexCount: number;
  enabled: boolean;
  isWaitingForDelete: boolean;

  constructor(
    readonly index: number,
    private readonly _graphicDevice: OFGraphicDevice
  ) {
    this.initialize();
  }

  private initialize(): void {
    this.enabled = false;
    this.isWaitingForDelete = false;
    this.vertexCount = 0;
    this.indexCount = 0;
    this.vertices = [];
    this.indices = [];

    // Get a VBO for this object
    this.vboObject = this._graphicDevice.deviceOptimizationManager
      .vboPooler.getAvailableVBO(OFEnumVBOObjectType.VertexBuffer);
    this.vboObject.activate(OFEnumVBOObjectType.VertexBuffer);
    // Get a IBO for this object
    this.iboObject = this._graphicDevice.deviceOptimizationManager
      .vboPooler.getAvailableVBO(OFEnumVBOObjectType.IndexBuffer);
    this.iboObject.activate(OFEnumVBOObjectType.IndexBuffer);
  }

  reset(): void {
    this.enabled = false;
    this.vertexCount = 0;
    this.indexCount = 0;
    this.vertices = [];
    this.indices = [];
  }

  destroy(): void {
    this.isWaitingForDelete = true;
    this.vboObject?.deactivate();
    this.iboObject?.deactivate();
    this.vboObject = null;
    this.iboObject = null;
    this.vertices = null;
    this.indices = null;
  }
}

export class OFSpriteBatcher {

  private static readonly MAX_VERTICES = 20920;

  protected readonly _framework: OFFramework;
  protected readonly _graphicDevice: OFGraphicDevice;
  protected readonly _graphicContext: WebGLRenderingContext;

  protected _batchGroups: Array<OFSBBatchGroup>;
  protected _currentBatchGroup: OFSBBatchGroup;
  protected _shader: OFBaseShader;

  private _imageContent: OFImageContent;
  private _imageGLTexture: WebGLTexture;

  get totalQuads(): number {
    let countTotalQuads = 0;
    this._batchGroups.forEach(x => countTotalQuads += (x.vertexCount / 4));
    return countTotalQuads;
  }

  get totalDrawCalls(): number {
    return this._batchGroups.filter(x => x.enabled).length;
  }

  constructor (spritePath: string) {
    this._graphicDevice = OFFrameworkFactory.currentFramewok.mainGraphicDevice;
    this._graphicContext = this._graphicDevice.graphicContext;
    this._framework = this._graphicDevice.framework;

    this._imageContent = this._framework.contentManager.getContent<OFImageContent>(spritePath);
    this._imageGLTexture = this._imageContent.imageTexture;

    this._shader = this._graphicDevice.shaderFactory.retrieveShader<OFShaderTexture>('ShaderTexture');
    this._batchGroups = [new OFSBBatchGroup(0, this._graphicDevice)];
  }

  beginDraw(): void {
    this._batchGroups.forEach(x => x.reset());

    if (this._batchGroups.length === 0) {
      this._batchGroups = [new OFSBBatchGroup(0, this._graphicDevice)];
    }

    this._currentBatchGroup = this._batchGroups[0];
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

      this._currentBatchGroup.vertices.push(
        x_0, y_0, 0.0, qTC.right, qTC.down,
        x_1, y_1, 0.0, qTC.left, qTC.down,
        x_2, y_2, 0.0, qTC.right, qTC.up,
        x_3, y_3, 0.0, qTC.left, qTC.up);
    } else {
      this._currentBatchGroup.vertices.push(
        vx + hw, vy + hh, 0.0, qTC.right, qTC.down,
        vx - hw, vy + hh, 0.0, qTC.left, qTC.down,
        vx + hw, vy - hh, 0.0, qTC.right, qTC.up,
        vx - hw, vy - hh, 0.0, qTC.left, qTC.up);
    }

    // Degenerate indices
    if (this._currentBatchGroup.vertexCount !== 0) {
      this._currentBatchGroup.indices.push(this._currentBatchGroup.vertexCount - 1, this._currentBatchGroup.vertexCount, this._currentBatchGroup.vertexCount,
        this._currentBatchGroup.vertexCount + 1, this._currentBatchGroup.vertexCount + 2, this._currentBatchGroup.vertexCount + 3);
    } else {
      this._currentBatchGroup.indices.push(this._currentBatchGroup.vertexCount, this._currentBatchGroup.vertexCount + 1, this._currentBatchGroup.vertexCount + 2,
        this._currentBatchGroup.vertexCount + 3);
    }

    this._currentBatchGroup.vertexCount += 4;
    this._currentBatchGroup.indexCount = this._currentBatchGroup.indices.length;

    if (this._currentBatchGroup.vertexCount >= OFSpriteBatcher.MAX_VERTICES) {
      // use next batch group, and create one if needs it
      if (this._currentBatchGroup.index >= (this._batchGroups.length - 1)) {
        this._batchGroups.push(new OFSBBatchGroup(this._batchGroups.length, this._graphicDevice));
      }
      // move to the next Batch Group
      this._currentBatchGroup = this._batchGroups[this._currentBatchGroup.index + 1];
    }
  }

  endDraw(): void {
    const _GL = this._graphicContext;

    this._batchGroups.forEach(x => {
      if (x.vertexCount !== 0) {
        x.enabled = true;

        // Now we set the vertices interleaved array to the VertexBuffer
        _GL.bindBuffer(_GL.ARRAY_BUFFER, x.vboObject.vbo);
        _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(x.vertices), _GL.DYNAMIC_DRAW);
        // Now we set the indices array to the IndexBuffer
        _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, x.iboObject.vbo);
        _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(x.indices), _GL.STATIC_DRAW);
      } else {
        x.destroy();
      }
    });

    // remove destroy batch groups
    this._batchGroups = this._batchGroups.filter(x => !x.isWaitingForDelete);
  }

  update(args: IOFRenderArgs): void {
    if (this._imageContent.isLoaded) {
      this._batchGroups.forEach(x => {
        if (x.enabled) {
          const shader = this._shader as OFShaderTexture;

          shader.setTranslate(0, 0, 0);
          shader.rotationZ = 0;
          shader.setScale(1, 1, 1);
          shader.drawElements(args, this._imageGLTexture, x.iboObject.vbo, x.vboObject.vbo, x.indexCount);
        }
      });
    }
  }

  destroy(): void {
    this._batchGroups.forEach(x => x.destroy());
    this._batchGroups = null;
  }
}
