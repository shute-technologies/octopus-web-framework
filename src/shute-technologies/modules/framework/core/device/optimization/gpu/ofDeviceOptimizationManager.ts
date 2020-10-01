import { OFGraphicDevice } from "../../ofGraphicDevice";
import { OFVBOPooler } from "./ofVBOPooler";
import { IOFRenderArgs } from "../../../../interfaces/iofRenderArgs";

export class OFDeviceOptimizationManager {

  private _vboPooler: OFVBOPooler;

  get vboPooler(): OFVBOPooler { return this._vboPooler; }
  get graphicDevice(): OFGraphicDevice { return this._graphicDevice; }

  constructor(private readonly _graphicDevice: OFGraphicDevice) {
    this._vboPooler = new OFVBOPooler(this);
    this._vboPooler.initialize();
  }

  update(args: IOFRenderArgs): void {
    this._vboPooler.update(args);
  }
}
