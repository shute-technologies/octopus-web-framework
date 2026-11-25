import { OFFramework } from '../../ofFramework';
import { OFRenderCamera } from '../render/camera/ofRenderCamera';
import { OFColor } from '../render/graphics/ofColor';
import { OFShaderFactory } from '../render/shader/ofShaderFactory';
import { OFDeviceOptimizationManager } from './optimization/gpu/ofDeviceOptimizationManager';
import { IOFRenderArgs } from '../../interfaces/iofRenderArgs';
import { IOFCanvasElement } from '../ofCanvasContextManager';
import { OFEnumBlendMode } from '../render/shader/ofEnumBlendMode';

interface OFIRenderTargetState {
  // The framebuffer this entry's bindRenderTarget() bound, to check unbinds come in reverse order.
  bound: WebGLFramebuffer;
  framebuffer: WebGLFramebuffer | null;
  viewport: { x: number; y: number; width: number; height: number };
  scissor: boolean;
}

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
  // The blend mode last set on the context; undefined when unknown, which always sets.
  private _currentBlendMode: OFEnumBlendMode;
  // Whether that blend mode was set while a render target was bound: Alpha differs there.
  private _currentBlendInTarget = false;
  // The framebuffer bound through bindRenderTarget(); null is the canvas.
  private _currentFramebuffer: WebGLFramebuffer | null = null;
  // What bindRenderTarget() replaced, restored by unbindRenderTarget(); nests.
  private readonly _renderTargetStack: OFIRenderTargetState[] = [];

  clearColor: OFColor;
  /** Seconds since the framework started, summed from the frames' `dt`. Fills a `: Time` input. */
  elapsedSeconds = 0;
  /** The viewport last set through setViewport(), in drawing-buffer pixels. Fills a `: Viewport` input. */
  readonly currentViewport = { x: 0, y: 0, width: 0, height: 0 };
  /** Values by uniform name that fill a `: Shared` input of any shader. A texture takes a unit. */
  /**
   * The shared uniform a shader declares (`uniform float uPremultiplyAlpha : Shared;`) to output
   * premultiplied colour. Textures are straight alpha, and the Multiply and Screen blend functions
   * are the premultiplied ones.
   */
  static readonly premultiplyUniformName = 'uPremultiplyAlpha';

  /** True for the blend modes whose blend function expects premultiplied colour. */
  static premultipliesFor(mode: OFEnumBlendMode): boolean {
    return mode === OFEnumBlendMode.Multiply || mode === OFEnumBlendMode.Screen;
  }

  readonly sharedUniforms = new Map<string, number | ArrayLike<number> | WebGLTexture>();

  get currentShaderProgram(): WebGLProgram { return this._currentShaderProgram; }
  /** The framebuffer draws go to: null for the canvas, else the bound render target's. */
  get currentFramebuffer(): WebGLFramebuffer | null { return this._currentFramebuffer; }
  /** How many render targets are bound, nested; 0 when drawing to the canvas. */
  get renderTargetDepth(): number { return this._renderTargetStack.length; }
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
   * Enables blending and sets the blend function for `mode`. Skips every GL call when the mode is
   * the one set last. A host that changes GL blend state itself calls resetStateCache() afterwards.
   */
  useBlendMode(mode: OFEnumBlendMode): void {
    // Set on every call, before the early return: the next draw reads the shared value, not the context.
    this.sharedUniforms.set(OFGraphicDevice.premultiplyUniformName, OFGraphicDevice.premultipliesFor(mode) ? 1 : 0);

    const inTarget = this._renderTargetStack.length > 0;

    if (this._currentBlendMode === mode && this._currentBlendInTarget === inTarget) { return; }

    const _GL = this._graphicContext;

    // Replace disables BLEND, and every other mode enables it again: it never relies on the cache.
    if (mode !== OFEnumBlendMode.Replace) { _GL.enable(_GL.BLEND); }

    switch (mode) {
      case OFEnumBlendMode.Replace:
        _GL.disable(_GL.BLEND);
        break;
      case OFEnumBlendMode.Premultiplied:
        _GL.blendFuncSeparate(_GL.ONE, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
        break;
      case OFEnumBlendMode.Additive:
        _GL.blendFuncSeparate(_GL.SRC_ALPHA, _GL.ONE, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
        break;
      case OFEnumBlendMode.Multiply:
        _GL.blendFuncSeparate(_GL.DST_COLOR, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
        break;
      case OFEnumBlendMode.Screen:
        _GL.blendFuncSeparate(_GL.ONE, _GL.ONE_MINUS_SRC_COLOR, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
        break;
      default:
        if (inTarget) {
          // Alpha as one blendFunc would also blend the alpha channel (a² + dA(1-a)), wrong for a transparent
          // target. The canvas has no alpha channel to keep right, and keeps the plain call.
          _GL.blendFuncSeparate(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
        } else {
          _GL.blendFunc(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA);
        }
        break;
    }

    this._currentBlendMode = mode;
    this._currentBlendInTarget = inTarget;
  }

  /** Records the viewport and sets it on the context. */
  setViewport(x: number, y: number, width: number, height: number): void {
    const viewport = this.currentViewport;

    viewport.x = x;
    viewport.y = y;
    viewport.width = width;
    viewport.height = height;

    this._graphicContext.viewport(x, y, width, height);
  }

  /**
   * Makes `framebuffer` the draw target with a viewport of `width` x `height` at 0, 0, and disables the
   * scissor test (a camera's scissor rectangle is in canvas pixels and would clip the target). Remembers the
   * framebuffer, viewport and scissor state it replaces; unbindRenderTarget() restores them. Nests.
   */
  bindRenderTarget(framebuffer: WebGLFramebuffer, width: number, height: number): void {
    const _GL = this._graphicContext;
    const viewport = this.currentViewport;

    this._renderTargetStack.push({
      bound: framebuffer,
      framebuffer: this._currentFramebuffer,
      viewport: { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height },
      scissor: !!_GL.isEnabled(_GL.SCISSOR_TEST)
    });

    this.bindFramebuffer(framebuffer);
    _GL.disable(_GL.SCISSOR_TEST);
    this.setViewport(0, 0, width, height);
    // Alpha blends differently in a target; see useBlendMode().
    this.resetStateCache();
  }

  /**
   * Restores what the matching bindRenderTarget() replaced. Does nothing when no target is bound. `framebuffer`
   * is the one being unbound: it must be the most recent bind, or this throws and changes nothing.
   */
  unbindRenderTarget(framebuffer: WebGLFramebuffer): void {
    const stack = this._renderTargetStack;

    if (stack.length === 0) { return; }

    if (stack[stack.length - 1].bound !== framebuffer) {
      throw new Error('OFGraphicDevice.unbindRenderTarget: render targets must be unbound in reverse order.');
    }

    const previous = stack.pop();

    const _GL = this._graphicContext;
    const viewport = previous.viewport;

    this.bindFramebuffer(previous.framebuffer);
    this.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

    if (previous.scissor) { _GL.enable(_GL.SCISSOR_TEST); }

    this.resetStateCache();
  }

  /**
   * Binds `framebuffer` (null: the canvas) and records it. For a render target's own setup; drawing into one
   * goes through bindRenderTarget(), which also sets the viewport.
   */
  bindFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    const _GL = this._graphicContext;

    this._currentFramebuffer = framebuffer;
    _GL.bindFramebuffer(_GL.FRAMEBUFFER, framebuffer);
  }

  /** Forgets the cached blend mode, so the next useBlendMode() sets it on the context. */
  resetStateCache(): void {
    this._currentBlendMode = undefined;
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
    this.elapsedSeconds += args.dt;
    this.clear();
    this._renderCamera.update(args);
    this._deviceOptimizationManager.update(args);
  }
}
