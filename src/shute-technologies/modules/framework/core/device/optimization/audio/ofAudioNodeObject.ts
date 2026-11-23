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
    this.renewLifeTime();
  }

  deactivate(): void {
    // Back to the pool: cut the node out of the graph it was playing in, or the next user of
    // this node would inherit its old connections.
    this.disconnectWebAudioNode();
    this._isAvailable = true;
    this.renewLifeTime();
  }

  /**
   * Restarts the idle countdown and clears `isWaitingForDelete`. The pool calls it when it hands a
   * node out again: a node that had aged out and was reused before the next sweep used to be
   * destroyed (disconnected) while playing.
   */
  renewLifeTime(): void {
    this._lifeTime = OFAudioNodeObject.defaultNodeLifeTime;
    this.isWaitingForDelete = false;
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
    this.disconnectWebAudioNode();
    this.webAudioNode = null;
  }

  private disconnectWebAudioNode(): void {
    if (this.webAudioNode) {
      try {
        this.webAudioNode.disconnect();
      } catch (e) {
        // Older WebKit throws when the node has no connections; nothing to undo then.
      }
    }
  }
}
