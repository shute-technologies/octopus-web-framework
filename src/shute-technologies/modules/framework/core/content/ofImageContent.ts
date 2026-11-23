import { OFBaseContent } from './ofBaseContent';
import { OFContentManager } from './ofContentManager';

export class OFImageContent extends OFBaseContent {

  private _image: HTMLImageElement;
  private _imageTexture: WebGLTexture;

  get imageHTML (): HTMLImageElement { return this._image; }
  get imageWidth () { return this._image.width; }
  get imageHeight () { return this._image.height; }
  get imageTexture (): WebGLTexture { return this._imageTexture; }

  constructor(contentManager: OFContentManager) {
    super(contentManager);
  }

  initialize(): void {
    super.initialize();
  }

  load (path: string): void {
    super.load(path);

    this._image = new Image();

    const _GL = this.graphicContext;

    // create image texture on WebGL
    this._imageTexture = _GL.createTexture();

    // Extends the OnLoad image event for WebGL support
    this._image.onload = () => {
      _GL.bindTexture(_GL.TEXTURE_2D, this._imageTexture);
      _GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, _GL.RGBA, _GL.UNSIGNED_BYTE, this._image);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, _GL.LINEAR);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, _GL.CLAMP_TO_EDGE);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, _GL.CLAMP_TO_EDGE);

      // For mipmapping (BETTER PERFORMANCE IN 3D ENVIOREMENT)
      // GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR_MIPMAP_NEAREST);
      // GL.generateMipmap(GL.TEXTURE_2D);

      _GL.bindTexture(_GL.TEXTURE_2D, null);

      this._isLoaded = true;
    };

    // Finally then set it's path to the Image to load
    this._image.src = path;
  }

  loadFromImageHTML (imageHTML: HTMLImageElement, path: string, params?: {}) {
    params = !params ? {} : params;
    const _GL = this.graphicContext;

    // Record the path only. This called this.load(path), which also creates an Image, points it at
    // `path` (a content key, not necessarily a URL: a 404 per image) and allocates a texture that
    // the lines below immediately replace.
    if (path) { super.load(path); }

    this._image = imageHTML;

    // create image texture on WebGL
    this._imageTexture = _GL.createTexture();
    this.uploadTexture(params);

    this._isLoaded = true;
  }

  changeProperties (params?: {}) {
    if (this.isLoaded) {
      this.uploadTexture(params);
    }
  }

  /**
   * The texture parameters to use for `params`, an image of `width` x `height`, on a WebGL 1 context.
   *
   * Keys are read in either spelling: `webGL_MinFilter`, `webGL_MagFilter`, `webGL_WrapS`,
   * `webGL_WrapT`, `generateMipMap` (what hosts pass, e.g. an image resource object) or the original
   * `WebGL_MinFilter`, ... `GenerateMipMap`. Only the latter used to be read, with min and mag
   * swapped, so a host's settings never applied: every texture was LINEAR / CLAMP_TO_EDGE.
   *
   * WebGL 1 draws an incomplete texture black, so the result is always complete: a non-power-of-two
   * image is clamped and never mipmapped (a mipmap min filter falls back to its base filter), and a
   * mipmap min filter on a power-of-two image generates the mipmaps it needs. Asking for mipmaps with
   * a plain min filter uses that filter's mipmap form (LINEAR -> LINEAR_MIPMAP_NEAREST, as before).
   */
  static resolveTextureParams(_GL: WebGLRenderingContext, params: {}, width: number, height: number): OFITextureParams {
    params = params || {};
    const read = (camelCase: string, pascalCase: string) =>
      params[camelCase] !== undefined && params[camelCase] !== null ? params[camelCase] : params[pascalCase];
    const oneOf = (value: number, allowed: number[], fallback: number) => allowed.indexOf(value) >= 0 ? value : fallback;

    const plainFilters = [_GL.NEAREST, _GL.LINEAR];
    const mipmapFilters = [_GL.NEAREST_MIPMAP_NEAREST, _GL.LINEAR_MIPMAP_NEAREST,
      _GL.NEAREST_MIPMAP_LINEAR, _GL.LINEAR_MIPMAP_LINEAR];
    const wraps = [_GL.CLAMP_TO_EDGE, _GL.REPEAT, _GL.MIRRORED_REPEAT];

    const magFilter = oneOf(read('webGL_MagFilter', 'WebGL_MagFilter'), plainFilters, _GL.LINEAR);
    let minFilter = oneOf(read('webGL_MinFilter', 'WebGL_MinFilter'), plainFilters.concat(mipmapFilters), _GL.LINEAR);
    let wrapS = oneOf(read('webGL_WrapS', 'WebGL_WrapS'), wraps, _GL.CLAMP_TO_EDGE);
    let wrapT = oneOf(read('webGL_WrapT', 'WebGL_WrapT'), wraps, _GL.CLAMP_TO_EDGE);
    let generateMipMaps = !!read('generateMipMap', 'GenerateMipMap');

    const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
    const minIsMipmap = mipmapFilters.indexOf(minFilter) >= 0;
    // NEAREST_MIPMAP_* -> NEAREST, LINEAR_MIPMAP_* -> LINEAR, and the reverse for the plain ones.
    const baseOf = (filter: number) => filter === _GL.NEAREST_MIPMAP_NEAREST || filter === _GL.NEAREST_MIPMAP_LINEAR
      ? _GL.NEAREST : (filter === _GL.NEAREST ? _GL.NEAREST : _GL.LINEAR);

    if (!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
      wrapS = wrapT = _GL.CLAMP_TO_EDGE;
      generateMipMaps = false;
      minFilter = baseOf(minFilter);
    } else if (minIsMipmap) {
      generateMipMaps = true;
    } else if (generateMipMaps) {
      minFilter = baseOf(minFilter) === _GL.NEAREST ? _GL.NEAREST_MIPMAP_NEAREST : _GL.LINEAR_MIPMAP_NEAREST;
    }

    return { magFilter, minFilter, wrapS, wrapT, generateMipMaps };
  }

  private uploadTexture(params?: {}): void {
    const _GL = this.graphicContext;
    const image = this._image as HTMLImageElement;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const resolved = OFImageContent.resolveTextureParams(_GL, params, width, height);

    // unbind first
    _GL.bindTexture(_GL.TEXTURE_2D, null);

    _GL.bindTexture(_GL.TEXTURE_2D, this._imageTexture);
    _GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, _GL.RGBA, _GL.UNSIGNED_BYTE, this._image);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, resolved.magFilter);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, resolved.minFilter);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, resolved.wrapS);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, resolved.wrapT);

    if (resolved.generateMipMaps) {
      _GL.generateMipmap(_GL.TEXTURE_2D);
    }
    // unbind
    _GL.bindTexture(_GL.TEXTURE_2D, null);
  }
}

export interface OFITextureParams {
  magFilter: number;
  minFilter: number;
  wrapS: number;
  wrapT: number;
  generateMipMaps: boolean;
}
