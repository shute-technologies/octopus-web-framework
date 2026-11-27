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
  // Whether _currentShaderProgram is known to be the context's program. False after resetStateCache().
  private _isShaderProgramKnown = false;
  // Vertex attribute arrays are context state, not program state; see useVertexAttributes().
  private readonly _enabledVertexAttributes = new Set<number>();
  // Whether _enabledVertexAttributes is known to be enabled on the context. False after resetStateCache().
  private _areVertexAttributesKnown = false;
  // The buffers bound through bindBuffer(); undefined when unknown, which always binds.
  private _boundArrayBuffer: WebGLBuffer | null | undefined = undefined;
  private _boundElementArrayBuffer: WebGLBuffer | null | undefined = undefined;
  // Counts resetStateCache() calls; a shader's copy of the uniforms it sent is valid while this is unchanged.
  private _stateEpoch = 0;
  // The index buffer pushQuads() batches draw with, built once; see quadIndexBuffer().
  private _quadIndexBuffer: WebGLBuffer = null;
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

  /** The most quads one draw with quadIndexBuffer() reaches: 4 vertices each, within 16-bit indices. */
  static readonly maxQuadsPerDraw = 16384;

  /** True for the blend modes whose blend function expects premultiplied colour. */
  static premultipliesFor(mode: OFEnumBlendMode): boolean {
    return mode === OFEnumBlendMode.Multiply || mode === OFEnumBlendMode.Screen;
  }

  readonly sharedUniforms = new Map<string, number | ArrayLike<number> | WebGLTexture>();

  get currentShaderProgram(): WebGLProgram { return this._currentShaderProgram; }
  /**
   * Changes on every resetStateCache(). A shader that skips re-sending a uniform value it sent before trusts its
   * copy only while this number is the one the value was sent under.
   */
  get stateEpoch(): number { return this._stateEpoch || 0; }
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
    this._isShaderProgramKnown = false;

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

  /**
   * Makes `shaderProgram` the context's program, skipping the GL call when it already is. Every program switch in
   * octopus goes through here. A host that calls `useProgram` itself calls resetStateCache() afterwards.
   *
   * Deleting the current program cannot leave this stale: a deleted program is never used again, and any other
   * program is a different object, which always switches.
   */
  useShaderProgram(shaderProgram: WebGLProgram): void {
    if (this._isShaderProgramKnown && this._currentShaderProgram === shaderProgram) { return; }

    this._currentShaderProgram = shaderProgram;
    this._isShaderProgramKnown = true;
    this._graphicContext.useProgram(shaderProgram);
  }

  /**
   * Binds `buffer` to `target`, skipping the GL call when ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER already holds it.
   * Every buffer bind in octopus goes through here. A host that binds buffers itself calls resetStateCache()
   * afterwards. Any other target is bound every time.
   */
  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    const _GL = this._graphicContext;

    if (target === _GL.ARRAY_BUFFER) {
      if (this._boundArrayBuffer === buffer) { return; }
      this._boundArrayBuffer = buffer;
    } else if (target === _GL.ELEMENT_ARRAY_BUFFER) {
      if (this._boundElementArrayBuffer === buffer) { return; }
      this._boundElementArrayBuffer = buffer;
    }

    _GL.bindBuffer(target, buffer);
  }

  /** Deletes `buffer` and forgets it wherever bindBuffer() recorded it (GL unbinds a buffer it deletes). */
  deleteBuffer(buffer: WebGLBuffer): void {
    if (!buffer) { return; }

    if (this._boundArrayBuffer === buffer) { this._boundArrayBuffer = undefined; }
    if (this._boundElementArrayBuffer === buffer) { this._boundElementArrayBuffer = undefined; }

    this._graphicContext.deleteBuffer(buffer);
  }

  /**
   * An index buffer for `OFGraphicDevice.maxQuadsPerDraw` quads, built on first use and shared by every batcher on
   * this device. Quad q is the triangles 4q, 4q+1, 4q+2 and 4q+2, 4q+1, 4q+3: OFSprite's triangle-strip corners.
   * Never deleted. It is left bound to ELEMENT_ARRAY_BUFFER after it is built.
   */
  quadIndexBuffer(): WebGLBuffer {
    if (!this._quadIndexBuffer) {
      const _GL = this._graphicContext;
      const quadCount = OFGraphicDevice.maxQuadsPerDraw;
      const indices = new Uint16Array(quadCount * 6);

      for (let quad = 0, at = 0; quad < quadCount; quad++, at += 6) {
        const first = quad * 4;

        indices[at] = first;
        indices[at + 1] = first + 1;
        indices[at + 2] = first + 2;
        indices[at + 3] = first + 2;
        indices[at + 4] = first + 1;
        indices[at + 5] = first + 3;
      }

      this._quadIndexBuffer = _GL.createBuffer();
      this.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._quadIndexBuffer);
      _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, indices, _GL.STATIC_DRAW);
    }

    return this._quadIndexBuffer;
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

  /**
   * Forgets every GL state the device skips setting when unchanged: the blend mode, the program, the buffers bound to
   * ARRAY_BUFFER and ELEMENT_ARRAY_BUFFER, which vertex attribute arrays are enabled, and (through stateEpoch) the
   * uniform values shaders skip re-sending. The next draw sets each of them again.
   *
   * A host that changes any of that state with its own GL calls (useProgram, bindBuffer, enable or disable of a
   * vertex attribute array, a uniform of an octopus shader's program, the blend function) calls this afterwards.
   */
  resetStateCache(): void {
    this._currentBlendMode = undefined;
    this._isShaderProgramKnown = false;
    this._boundArrayBuffer = undefined;
    this._boundElementArrayBuffer = undefined;
    this._areVertexAttributesKnown = false;
    this._stateEpoch = (this._stateEpoch || 0) + 1;
  }

  /**
   * Enables the vertex attribute arrays a draw reads, and disables every one an earlier draw
   * enabled that this draw does not read. Every shader's draw goes through here.
   *
   * Enabled arrays belong to the context, not to the program: a textured draw leaves its texture
   * coordinates enabled, pointing at its own vertex buffer. Once the VBO pool deletes that buffer,
   * every later draw that leaves the array enabled fails with INVALID_OPERATION ("no buffer is bound
   * to enabled attribute") and draws nothing. Inactive locations (-1) are skipped.
   *
   * An array this already enabled is not enabled again. After resetStateCache() the next call enables
   * every location it is given, as a host may have disabled one; it still disables everything an
   * earlier call enabled that this one does not read.
   */
  useVertexAttributes(locations: ReadonlyArray<number>): void {
    const _GL = this._graphicContext;
    const enabled = this._enabledVertexAttributes;
    const known = this._areVertexAttributesKnown;

    enabled.forEach((location) => {
      if (locations.indexOf(location) < 0) {
        _GL.disableVertexAttribArray(location);
        enabled.delete(location);
      }
    });

    for (const location of locations) {
      if (location >= 0 && (!known || !enabled.has(location))) {
        _GL.enableVertexAttribArray(location);
        enabled.add(location);
      }
    }

    this._areVertexAttributesKnown = true;
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
