import { OFColor } from "./ofColor";
import { mat4 } from "gl-matrix";
import { OFBaseShader } from "../shader/ofBaseShader";
import { OFFrameworkFactory } from "../../../ofFrameworkFactory";
import { OFGraphicDevice } from "../../device/ofGraphicDevice";
import { OFVBOObject } from "../../device/optimization/gpu/ofVBOObject";
import { IOFRenderArgs } from "../../../interfaces/iofRenderArgs";
import { OFFramework } from "../../../ofFramework";
import { OFSpriteBatcher } from "./d2d/optimization/ofSpriteBatcher";

export abstract class OFDrawable2D {

  protected readonly _framework: OFFramework;
  protected readonly _graphicDevice: OFGraphicDevice;
  protected readonly _graphicContext: WebGLRenderingContext;

  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  rotation: number;

  protected _debugMode: boolean;
  protected _color: OFColor;
  protected _transformation: mat4;
  protected _shader: OFBaseShader;
  protected _vboObject: OFVBOObject;
  protected _iboObject: OFVBOObject;
  protected _vertices: number[] | Float32Array;
  protected _indices: number[];
  protected _spriteBatchInstance: OFSpriteBatcher;

  get vboObject(): OFVBOObject { return this._vboObject; }
  get iboObject(): OFVBOObject { return this._iboObject; }
  get hasSpriteBatch(): boolean { return !!this._spriteBatchInstance; }

  abstract get color(): OFColor;
  abstract set color(val: OFColor);

  get alpha(): number { return this._color.a; }
  set alpha(val: number) { this._color.a = val; }

  get debugMode(): boolean { return this._debugMode; }
  set debugMode(val: boolean) { this._debugMode = val; }

  constructor(x: number, y: number, spriteBatch?: OFSpriteBatcher) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
    this._debugMode = false;
    this._color = OFColor.white();

    this._graphicDevice = OFFrameworkFactory.currentFramewok.mainGraphicDevice;
    this._graphicContext = this._graphicDevice.graphicContext;
    this._framework = this._graphicDevice.framework;

    this.setSpriteBatch(spriteBatch);
  }

  setSpriteBatch(spriteBatch: OFSpriteBatcher): void {
    this._spriteBatchInstance = spriteBatch;

    if (this._spriteBatchInstance) {
      // release the current
      if (this._vboObject) { this._vboObject.deactivate(); }
      if (this._iboObject) { this._iboObject.deactivate(); }
      this._vboObject = null;
      this._iboObject = null;
    }
  }

  setShader (shader: OFBaseShader): void {
    this._shader = shader;
  }

  setTransformationMatrix (matrix: mat4): void {
    this._transformation = matrix;
  }

  protected abstract initialize();
  protected abstract createVBOs();
  abstract hitTest<T extends OFDrawable2D>(other: T): boolean;
  abstract hitTestByPoint(x: number, y: number): boolean;
  abstract update(args: IOFRenderArgs): void;

  destroy(): void {
    if (this._vboObject) { this._vboObject.deactivate(); }
    if (this._iboObject) { this._iboObject.deactivate(); }

    this._vboObject = null;
    this._iboObject = null;
    this._vertices = null;
    this._indices = null;
    this._transformation = null;
    this._shader = null;
    this._color = null;
  }
}
