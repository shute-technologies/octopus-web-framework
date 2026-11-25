import { OFFramework } from '../../ofFramework';
import { OFEnumRenderEngineType } from '../../enums/ofEnumRenderEngine';

// The answer per context: the probe allocates GL objects, so it runs once.
const halfFloatTargetByContext = new WeakMap<WebGLRenderingContext, boolean>();

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

  /** Whether this context can render to, and linearly sample, a half-float RGBA texture. See the static form. */
  get supportsHalfFloatTarget(): boolean {
    return this._renderEngineType === OFEnumRenderEngineType.WebGL
      && OFDeviceCapabilities.supportsHalfFloatTarget(this._graphiContext as WebGLRenderingContext);
  }

  /**
   * Whether `gl` can render to, and linearly sample, a half-float RGBA texture. Extension names alone are not
   * enough on some drivers, so a 1x1 half-float framebuffer is made and its status checked; the answer is kept
   * per context. Needs OES_texture_half_float (the type), OES_texture_half_float_linear (LINEAR filtering, without
   * which the texture samples black) and a complete framebuffer; EXT_color_buffer_half_float is enabled when present.
   * Leaves the framebuffer and the 2D texture (on the active unit) bound as they were.
   */
  static supportsHalfFloatTarget(gl: WebGLRenderingContext): boolean {
    if (!gl) { return false; }

    const known = halfFloatTargetByContext.get(gl);
    if (known !== undefined) { return known; }

    let result = false;
    const halfFloat = gl.getExtension('OES_texture_half_float');
    const halfFloatLinear = gl.getExtension('OES_texture_half_float_linear');
    gl.getExtension('EXT_color_buffer_half_float');

    if (halfFloat && halfFloatLinear) {
      const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
      const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, halfFloat.HALF_FLOAT_OES, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      result = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
      gl.bindTexture(gl.TEXTURE_2D, previousTexture);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
    }

    halfFloatTargetByContext.set(gl, result);
    return result;
  }

  static create(framework: OFFramework, forceCanvas: boolean): OFDeviceCapabilities {
    return new OFDeviceCapabilities(framework, forceCanvas);
  }
}
