import { OFAudioDevice } from "../../ofAudioDevice";
import { OFAudioNodePooler } from "./ofAudioNodePooler";
import { IOFRenderArgs } from "../../../../interfaces/iofRenderArgs";

export class OFAudioDeviceOptimizationManager {

  private _audioNodePooler: OFAudioNodePooler;

  get audioNodePooler(): OFAudioNodePooler { return this._audioNodePooler; }

  constructor(readonly audioDevice: OFAudioDevice) {
    this._audioNodePooler = new OFAudioNodePooler(this);
    this._audioNodePooler.initialize();
  }

  update(args: IOFRenderArgs): void {
    this._audioNodePooler.update(args);
  }
}