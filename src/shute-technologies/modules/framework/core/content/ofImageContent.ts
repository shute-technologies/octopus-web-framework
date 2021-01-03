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

    if (path) { this.load(path); }

    this._image = imageHTML;

    const magFilter = !params['WebGL_MinFilter'] ? _GL.LINEAR : params['WebGL_MinFilter'];
    const minFilter = !params['WebGL_MagFilter'] ? _GL.LINEAR : params['WebGL_MagFilter'];
    const wrapS = !params['WebGL_WrapS'] ? _GL.CLAMP_TO_EDGE : params['WebGL_WrapS'];
    const wrapT = !params['WebGL_WrapT'] ? _GL.CLAMP_TO_EDGE : params['WebGL_WrapT'];
    const generateMipMaps = !params['GenerateMipMap'] ? false : params['GenerateMipMap'];

    // create image texture on WebGL
    this._imageTexture = _GL.createTexture();

    _GL.bindTexture(_GL.TEXTURE_2D, this._imageTexture);
    _GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, _GL.RGBA, _GL.UNSIGNED_BYTE, this._image);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, magFilter);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, minFilter);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, wrapS);
    _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, wrapT);

    // For mipmapping (BETTER PERFORMANCE IN 3D ENVIOREMENT)
    if (generateMipMaps) {
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR_MIPMAP_NEAREST);
      _GL.generateMipmap(_GL.TEXTURE_2D);
    }
    // unbind
    _GL.bindTexture(_GL.TEXTURE_2D, null);

    this._isLoaded = true;
  }

  changeProperties (params?: {}) {
    if (this.isLoaded) {
      params = !params ? {} : params;
      const _GL = this.graphicContext;

      const minFilter = !params['WebGL_MinFilter'] ? _GL.LINEAR : params['WebGL_MinFilter'];
      const magFilter = !params['WebGL_MagFilter'] ? _GL.LINEAR : params['WebGL_MagFilter'];
      const wrapS = !params['WebGL_WrapS'] ? _GL.CLAMP_TO_EDGE : params['WebGL_WrapS'];
      const wrapT = !params['WebGL_WrapT'] ? _GL.CLAMP_TO_EDGE : params['WebGL_WrapT'];
      const generateMipMaps = !params['GenerateMipMap'] ? false : params['GenerateMipMap'];

      // unbind first
      _GL.bindTexture(_GL.TEXTURE_2D, null);

      _GL.bindTexture(_GL.TEXTURE_2D, this._imageTexture);
      _GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, _GL.RGBA, _GL.UNSIGNED_BYTE, this._image);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, magFilter);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, minFilter);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, wrapS);
      _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, wrapT);

      // For mipmapping (BETTER PERFORMANCE IN 3D ENVIOREMENT)
      if (generateMipMaps) {
        _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR_MIPMAP_NEAREST);
        _GL.generateMipmap(_GL.TEXTURE_2D);
      }
      // unbind
      _GL.bindTexture(_GL.TEXTURE_2D, null);
    }
  }
}
