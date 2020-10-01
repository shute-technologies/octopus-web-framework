import { OFAudioNodePooler } from "./ofAudioNodePooler";
import { OFEnumAudioNodeType } from "./ofEnumAudioNodeType";
import { IOFRenderArgs } from "../../../../interfaces/iofRenderArgs";

export class OFAudioNodeObject<T extends AudioNode> {
  static readonly defaultNodeLifeTime = 10000 / 1000.0;

  private _objectId: number;
  private _isAvailable: boolean;
  private _lifeTime: number; 

  webAudioNode: T;
  bufferType: OFEnumAudioNodeType;
  isWaitingForDelete: boolean;

  get id(): number { return this._objectId; }
  get isAvailable(): boolean { return this._isAvailable; }

  constructor (private readonly _audioNodePooler: OFAudioNodePooler) {
    this._lifeTime = OFAudioNodeObject.defaultNodeLifeTime;
    this.bufferType = OFEnumAudioNodeType.Unsigned;
    this.isWaitingForDelete = false;
  }

  initialize(id: number): void {
    this._objectId = id;
    this._isAvailable = true;
  }

  setWebAudioNode (webAudioNode: T, bufferType: OFEnumAudioNodeType): void {
    if (this.bufferType === OFEnumAudioNodeType.Unsigned || !this.bufferType) {
      this.bufferType = bufferType;
      this.webAudioNode = webAudioNode;
    }
  }

  activate(): void {
    this._isAvailable = false;
  }

  deactivate(): void {
    this._isAvailable = true;
    // Reset Lifetime
    this._lifeTime = OFAudioNodeObject.defaultNodeLifeTime;
  }

  update(args: IOFRenderArgs): void {
    if (this._isAvailable) {
      this._lifeTime -= args.dt;

      if (this._lifeTime <= 0) {
        this.isWaitingForDelete = true;
      }
    }
  }

  destroy(): void {
    if (this.webAudioNode) {
      this.webAudioNode.disconnect();
    }

    this.webAudioNode = null;
  }
}
