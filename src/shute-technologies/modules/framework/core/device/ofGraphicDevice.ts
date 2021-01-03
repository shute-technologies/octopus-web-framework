import { OFFramework } from '../../ofFramework';
import { OFRenderCamera } from '../render/camera/ofRenderCamera';
import { OFColor } from '../render/graphics/ofColor';
import { OFShaderFactory } from '../render/shader/ofShaderFactory';
import { OFDeviceOptimizationManager } from './optimization/gpu/ofDeviceOptimizationManager';
import { IOFRenderArgs } from '../../interfaces/iofRenderArgs';
import { IOFCanvasElement } from '../ofCanvasContextManager';

export class OFGraphicDevice {

  private _canvasObject: IOFCanvasElement;
  private _graphicContext: WebGLRenderingContext;
  private _renderCamera: OFRenderCamera;
  private _shaderFactory: OFShaderFactory;
  private _deviceOptimizationManager: OFDeviceOptimizationManager;

  private _hasCustomCamera: boolean;
  private _currentShaderProgram: WebGLProgram;

  clearColor: OFColor;

  get currentShaderProgram(): WebGLProgram { return this._currentShaderProgram; }
  get hasCustomCamera(): boolean { return this._hasCustomCamera; }
  get graphicContext(): WebGLRenderingContext { return this._graphicContext; }
  get canvasElement(): HTMLCanvasElement { return this._canvasObject.canvasElement; }
  get renderCamera(): OFRenderCamera { return this._renderCamera; }
  get shaderFactory(): OFShaderFactory { return this._shaderFactory; }
  get deviceOptimizationManager(): OFDeviceOptimizationManager { return this._deviceOptimizationManager; }

  constructor(readonly framework: OFFramework) {
    this._hasCustomCamera = false;
    this.clearColor = this.framework.settings.renderClearColor;
  }

  initialize(canvasObject: IOFCanvasElement): void {
    this._canvasObject = canvasObject;
    this._graphicContext = canvasObject.context;

    // Create RenderCamera and initialize it
    this._renderCamera = new OFRenderCamera(this.framework);
    this._renderCamera.initialize(this);

    // configure
    this._currentShaderProgram = 0;

    // Create a Shader Factory and Load all the Shaders in the application
    this._shaderFactory = new OFShaderFactory(this);

    // Create device optimization managment
    this._deviceOptimizationManager = new OFDeviceOptimizationManager(this);
  }

  invalidateConfiguration(): void {
    // resize camera
    this._renderCamera.invalidateConfiguration();
  }

  resize(width: number, height: number, oldWidth: number, oldHeight: number): void {
    // Resize canvas element
    const canvasElement = this._canvasObject.canvasElement;
    canvasElement.setAttribute('width', width.toString());
    canvasElement.setAttribute('height', height.toString());

    // resize camera
    if (!this._hasCustomCamera) {
      this._renderCamera.resize(width, height, oldWidth, oldHeight);
    }
  }

  useCustomRenderCamera(hasCustomCamera: boolean): void {
    this._hasCustomCamera = hasCustomCamera;
  }

  useShaderProgram(shaderProgram: WebGLProgram): void {
    const _GL = this._graphicContext;

   // if (this._currentShaderProgram !== shaderProgram) {
      this._currentShaderProgram = shaderProgram;
      _GL.useProgram(shaderProgram);
   // }
  }

  clear(): void {
    const _GL = this._graphicContext;
    const color = this.clearColor;

    _GL.clearColor(color.r, color.g, color.b, color.a);
    _GL.clear(_GL.COLOR_BUFFER_BIT);

    // _GL.enable(_GL.DEPTH_TEST);
    // _GL.depthFunc(_GL.LEQUAL);
  }

  update (args: IOFRenderArgs): void {
    this.clear();
    this._renderCamera.update(args);
    this._deviceOptimizationManager.update(args);
  }
}
