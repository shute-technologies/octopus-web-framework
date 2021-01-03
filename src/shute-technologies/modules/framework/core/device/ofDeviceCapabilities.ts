import { OFFramework } from '../../ofFramework';
import { OFEnumRenderEngineType } from '../../enums/ofEnumRenderEngine';

export class OFDeviceCapabilities {

  private _renderEngineType: OFEnumRenderEngineType;
  private _graphiContext: WebGLRenderingContext | RenderingContext;

  get renderEngineType(): OFEnumRenderEngineType { return this._renderEngineType; }
  get graphiContext(): WebGLRenderingContext | RenderingContext { return this._graphiContext; }

  private constructor(private readonly _framework: OFFramework, forceCanvas: boolean) {
    const canvasElement = this._framework.canvasElement;

    if (!forceCanvas) {
      this._graphiContext = this._framework.canvasContextManager.construcWebGLCanvas(canvasElement);
    }

    if (!this._graphiContext) {
      this._graphiContext = this._framework.canvasContextManager.constructCanvas(canvasElement);
      this._renderEngineType = OFEnumRenderEngineType.CanvasContext2D;
    } else {
      this._renderEngineType = OFEnumRenderEngineType.WebGL;
    }
  }

  static create(framework: OFFramework, forceCanvas: boolean): OFDeviceCapabilities {
    return new OFDeviceCapabilities(framework, forceCanvas);
  }
}
