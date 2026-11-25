import { OFGraphicDevice } from '../../device/ofGraphicDevice';
import { OFDeviceCapabilities } from '../../device/ofDeviceCapabilities';

/** A render target's colour format. 'half-float' falls back to 'rgba8' where the context cannot render to it. */
export type OFRenderTargetFormat = 'rgba8' | 'half-float';

/**
 * A framebuffer with one colour texture, to draw into instead of the canvas and then sample.
 *
 * The texture is LINEAR and CLAMP_TO_EDGE with no mipmaps, so any size works on WebGL 1.
 *
 * Content: drawn into with Alpha from a transparent clear, a target holds premultiplied colour (rgb·a, a);
 * composite it with the Premultiplied blend mode, copy it with Replace. Over an opaque clear it is the same
 * as straight colour.
 *
 * Orientation: rows run bottom-up, as in any framebuffer. A full-screen pass reads it the right way up, but
 * sampled as a sprite's image (whose v=0 is the top) it appears flipped vertically.
 *
 * bind() makes it the draw target (viewport 0, 0, width, height; scissor test off) and unbind() restores what
 * was there before, through the device, so binds nest and a `: Viewport` input is right inside the target.
 * Never use OFRenderCamera.setViewport for a target: it resizes the canvas of a non-child camera.
 */
export class OFRenderTarget {

  private readonly _graphicContext: WebGLRenderingContext;
  private _framebuffer: WebGLFramebuffer;
  private _texture: WebGLTexture;
  private _width = 0;
  private _height = 0;
  private _format: OFRenderTargetFormat;
  private _textureType: number;
  private _isBound = false;

  /** The colour texture: bind it to sample what was drawn. */
  get texture(): WebGLTexture { return this._texture; }
  get framebuffer(): WebGLFramebuffer { return this._framebuffer; }
  get width(): number { return this._width; }
  get height(): number { return this._height; }
  /** The format actually used: 'rgba8' when 'half-float' was asked for and is not supported. */
  get format(): OFRenderTargetFormat { return this._format; }
  get isBound(): boolean { return this._isBound; }
  get isDestroyed(): boolean { return !this._framebuffer; }

  constructor(private readonly _graphicDevice: OFGraphicDevice, width: number, height: number,
    format: OFRenderTargetFormat = 'rgba8') {
    const _GL = this._graphicContext = _graphicDevice.graphicContext;

    if (format === 'half-float' && OFDeviceCapabilities.supportsHalfFloatTarget(_GL)) {
      this._format = 'half-float';
      this._textureType = _GL.getExtension('OES_texture_half_float').HALF_FLOAT_OES;
    } else {
      this._format = 'rgba8';
      this._textureType = _GL.UNSIGNED_BYTE;
    }

    // Setup leaves the caller's bindings as they were: a texture set before this target is made stays bound.
    const previousFramebuffer = _GL.getParameter(_GL.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const previousTexture = _GL.getParameter(_GL.TEXTURE_BINDING_2D) as WebGLTexture | null;

    this._texture = _GL.createTexture();
    _GL.bindTexture(_GL.TEXTURE_2D, this._texture);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, _GL.LINEAR);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, _GL.CLAMP_TO_EDGE);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, _GL.CLAMP_TO_EDGE);
    this.allocate(width, height);

    this._framebuffer = _GL.createFramebuffer();
    _GL.bindFramebuffer(_GL.FRAMEBUFFER, this._framebuffer);
    _GL.framebufferTexture2D(_GL.FRAMEBUFFER, _GL.COLOR_ATTACHMENT0, _GL.TEXTURE_2D, this._texture, 0);
    _GL.bindFramebuffer(_GL.FRAMEBUFFER, previousFramebuffer);
    _GL.bindTexture(_GL.TEXTURE_2D, previousTexture);
  }

  /** Reallocates the texture when the size changes; the same size makes no GL call. The contents are lost. */
  resize(width: number, height: number): void {
    if (width === this._width && height === this._height) { return; }

    const _GL = this._graphicContext;
    const previousTexture = _GL.getParameter(_GL.TEXTURE_BINDING_2D) as WebGLTexture | null;

    _GL.bindTexture(_GL.TEXTURE_2D, this._texture);
    this.allocate(width, height);
    _GL.bindTexture(_GL.TEXTURE_2D, previousTexture);
    // While bound, the viewport follows the new size.
    if (this._isBound) { this._graphicDevice.setViewport(0, 0, this._width, this._height); }
  }

  /** Draws go here from now on, until unbind(). */
  bind(): void {
    if (this._isBound) { return; }

    this._graphicDevice.bindRenderTarget(this._framebuffer, this._width, this._height);
    this._isBound = true;
  }

  /** Puts back the framebuffer, viewport and scissor test bind() replaced. */
  unbind(): void {
    if (!this._isBound) { return; }

    this._graphicDevice.unbindRenderTarget(this._framebuffer);
    this._isBound = false;
  }

  /**
   * Clears the whole target to the colour, whether or not it is bound, and only this target. When it is not the
   * one being drawn to, it is bound on top for the clear and unbound again, also when it is bound lower down.
   */
  clear(r: number, g: number, b: number, a: number): void {
    const device = this._graphicDevice;
    const isCurrent = device.currentFramebuffer === this._framebuffer;

    if (!isCurrent) { device.bindRenderTarget(this._framebuffer, this._width, this._height); }

    const _GL = this._graphicContext;
    _GL.clearColor(r, g, b, a);
    _GL.clear(_GL.COLOR_BUFFER_BIT);

    if (!isCurrent) { device.unbindRenderTarget(this._framebuffer); }
  }

  /** Frees the framebuffer and texture. Unbinds first if bound. */
  destroy(): void {
    if (!this._framebuffer) { return; }

    this.unbind();

    const _GL = this._graphicContext;
    _GL.deleteFramebuffer(this._framebuffer);
    _GL.deleteTexture(this._texture);
    this._framebuffer = null;
    this._texture = null;
  }

  // Expects the texture bound on TEXTURE_2D; leaves TEXTURE_2D unbound: the callers restore the old binding.
  private allocate(width: number, height: number): void {
    const _GL = this._graphicContext;

    this._width = Math.max(1, Math.floor(width));
    this._height = Math.max(1, Math.floor(height));
    _GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, this._width, this._height, 0, _GL.RGBA, this._textureType, null);
    _GL.bindTexture(_GL.TEXTURE_2D, null);
  }
}
