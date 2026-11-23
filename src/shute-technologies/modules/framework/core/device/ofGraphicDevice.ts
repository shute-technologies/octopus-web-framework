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
  // Vertex attribute arrays are context state, not program state; see useVertexAttributes().
  private readonly _enabledVertexAttributes = new Set<number>();

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

    // Resize the device camera even with a custom camera: it still draws everything the host does
    // not give a camera of its own (no `cameraMVP`), and used to keep its boot-time projection, so
    // that content stretched with the canvas. Skip a zero size (a hidden container), which would
    // make the projection singular.
    if (width > 0 && height > 0) {
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

  /**
   * Enables the vertex attribute arrays a draw reads, and disables every one an earlier draw
   * enabled that this draw does not read. Every shader's draw goes through here.
   *
   * Enabled arrays belong to the context, not to the program: a textured draw leaves its texture
   * coordinates enabled, pointing at its own vertex buffer. Once the VBO pool deletes that buffer,
   * every later draw that leaves the array enabled fails with INVALID_OPERATION ("no buffer is bound
   * to enabled attribute") and draws nothing. Inactive locations (-1) are skipped.
   */
  useVertexAttributes(locations: ReadonlyArray<number>): void {
    const _GL = this._graphicContext;

    this._enabledVertexAttributes.forEach((location) => {
      if (locations.indexOf(location) < 0) {
        _GL.disableVertexAttribArray(location);
        this._enabledVertexAttributes.delete(location);
      }
    });

    // Enabled on every draw, not only when new: cheap, and right even if a host changed the state.
    for (const location of locations) {
      if (location >= 0) {
        _GL.enableVertexAttribArray(location);
        this._enabledVertexAttributes.add(location);
      }
    }
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
