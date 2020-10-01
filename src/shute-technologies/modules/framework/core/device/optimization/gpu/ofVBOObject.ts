import { OFVBOPooler } from "./ofVBOPooler";
import { OFEnumVBOObjectType } from "./ofEnumVBOObjectType";
import { IOFRenderArgs } from "../../../../interfaces/iofRenderArgs";

export class OFVBOObject {

  static readonly defaultNodeLifeTime = 4500.0 / 1000.0;

  private _objectId: number;
  private _isAvailable: boolean;
  private _lifeTime: number;
  private _GL: WebGLRenderingContext;

  vbo: WebGLBuffer;
  bufferType: OFEnumVBOObjectType;
  isWaitingForDelete: boolean;
  
  get id (): number { return this._objectId; }     
  get isAvailable (): boolean { return this._isAvailable; } 

  constructor(private readonly _vboPooler: OFVBOPooler) {
    this._lifeTime = OFVBOObject.defaultNodeLifeTime;
    this.bufferType = OFEnumVBOObjectType.Unsigned;
    this._GL = _vboPooler.graphicDeviceOptManager.graphicDevice.graphicContext;
  }

  initialize(id: number): void {
    this._objectId = id;
    this._isAvailable = true;
    this.vbo = this._GL.createBuffer();
  }

  activate (bufferType: OFEnumVBOObjectType): void {
    if (this.bufferType === OFEnumVBOObjectType.Unsigned || !this.bufferType) {
      this.bufferType = bufferType;
    }
    
    this._isAvailable = false;
  }

  deactivate (): void {
    this._isAvailable = true;
    // Reset Lifetime
    this._lifeTime = OFVBOObject.defaultNodeLifeTime;
  }

  update (args: IOFRenderArgs): void {
    if (this._isAvailable) {
      this._lifeTime -= args.dt;
        
      if (this._lifeTime <= 0) {
        this.isWaitingForDelete = true;
      }
    }
  }

  destroy (): void {
    this._GL.deleteBuffer(this.vbo);
  }
}
