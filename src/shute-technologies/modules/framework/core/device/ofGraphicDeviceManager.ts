import { OFFramework } from '../../ofFramework';
import { OFGraphicDevice } from './ofGraphicDevice';
import { OFConsole } from '../../helpers/ofConsole';
import { OFTranslations } from '../../settings/ofTranslations';
import { IOFRenderArgs } from '../../interfaces/iofRenderArgs';
import { IOFCanvasElement } from '../ofCanvasContextManager';
import { OFShaderFactory } from '../render/shader/ofShaderFactory';
import { IDictionary } from 'shute-technologies.common-and-utils';

export class  OFGraphicDeviceManager {

  private readonly _graphicDevices: IDictionary<OFGraphicDevice>;

  get shaderFactories(): Array<OFShaderFactory> {
    const result: Array<OFShaderFactory> = [];

    for (const key of Object.keys(this._graphicDevices)) {
      const shaderFactory = this._graphicDevices[key].shaderFactory;

      if (shaderFactory) {
        result.push(shaderFactory);
      }
    }

    return result;
  }

  constructor(private readonly _framework: OFFramework) {
    this._graphicDevices = {};
  }

  initialize(): void { /* NOTHING */ }

  createGraphicDevice (id: string, canvasObject: IOFCanvasElement): OFGraphicDevice {
    const graphicDevice = new OFGraphicDevice(this._framework);
    graphicDevice.initialize(canvasObject);

    this._graphicDevices[id] = graphicDevice;

    OFConsole.log(OFTranslations.Framework.GraphicDeviceManager.createGraphicDevice,
      this._framework.frameworkIdentifier.toString(), id);

    return graphicDevice;
  }

  loadDefault(): void {
    for (const key of Object.keys(this._graphicDevices)) {
      if (this._graphicDevices[key].shaderFactory) {
        this._graphicDevices[key].shaderFactory.loadDefault();
      }
    }
  }

  resize (width: number, height: number, oldWidth: number, oldHeight: number) {
    for (const key of Object.keys(this._graphicDevices)) {
      this._graphicDevices[key].resize(width, height, oldWidth, oldHeight);
    }
  }

  update (args: IOFRenderArgs) {
    for (const key of Object.keys(this._graphicDevices)) {
      this._graphicDevices[key].update(args);
    }
  }
}
