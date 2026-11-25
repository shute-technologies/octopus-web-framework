import { mat4 } from 'gl-matrix';
import { OFGraphicDevice } from '../../device/ofGraphicDevice';
import { OFShaderAbstract } from '../shader/ofShaderAbstract';
import { OFRenderTarget } from './ofRenderTarget';
import { OFEnumShaderDataTypes } from '../../../../cross-cutting/shader-analizer/ofEnumShaderDataTypes';
import { OFDefaultShaderSources } from '../../../default-assets/ofDefaultShaderSources';
import type { IOFMoreRenderArgs } from '../../../interfaces/iofMoreRenderArgs';

/**
 * Draws one quad over the current viewport with any OFShaderAbstract, to blit or post-process a texture.
 *
 * The quad is in clip space (-1..1) and the shader's `: Camera` input gets the identity matrix, so it covers
 * the viewport whatever the device camera is. The pass sets no viewport itself: inside a bound render target
 * it covers the target, on the canvas it covers the current viewport. The shader's own blendMode is applied.
 * The source goes to the shader's first `: Texture` input; any other input is the caller's to set.
 *
 * draw() throws when the source is the render target currently bound (a feedback loop: WebGL draws nothing),
 * and when the shader's attributes are not exactly a vec3 aVertexPosition and a vec2 aTextureCoord, the
 * layout of the quad (20 bytes a vertex).
 */
export class OFFullscreenPass {

  /** The name the built-in copy shader is registered under in the shader factory. */
  static readonly CopyShaderName = 'OFFullscreenCopy';

  // aVertexPosition (vec3) + aTextureCoord (vec2), in TRIANGLE_STRIP order: 4 vertices, 20 bytes each.
  private static readonly QuadVertices = new Float32Array([
    -1, -1, 0, 0, 0,
    1, -1, 0, 1, 0,
    -1, 1, 0, 0, 1,
    1, 1, 0, 1, 1
  ]);

  private readonly _graphicContext: WebGLRenderingContext;
  private readonly _identity: mat4 = mat4.create();
  private readonly _args: IOFMoreRenderArgs;
  private _vertexBuffer: WebGLBuffer = null;
  private _copyShader: OFShaderAbstract = null;

  /** The built-in copy shader (the texture, unchanged), created on first use. */
  get copyShader(): OFShaderAbstract {
    if (!this._copyShader) {
      const factory = this._graphicDevice.shaderFactory;

      this._copyShader = factory.retrieveShader<OFShaderAbstract>(OFFullscreenPass.CopyShaderName)
        || factory.loadAndAddShaderWithCodeInfo(OFFullscreenPass.CopyShaderName,
          OFDefaultShaderSources.SourcesFullscreenCopy, null, OFFullscreenPass.CopyShaderName);
    }

    return this._copyShader;
  }

  constructor(private readonly _graphicDevice: OFGraphicDevice) {
    this._graphicContext = _graphicDevice.graphicContext;
    this._args = { hasCustomCamera: true, cameraMVP: this._identity } as IOFMoreRenderArgs;
  }

  draw(shader: OFShaderAbstract, source?: OFRenderTarget | WebGLTexture): void {
    const _GL = this._graphicContext;

    if (source instanceof OFRenderTarget && source.framebuffer === this._graphicDevice.currentFramebuffer) {
      throw new Error('OFFullscreenPass.draw: the source is the render target being drawn to (a feedback loop).');
    }

    const attributes = shader.shaderCodeInfo.attributes;

    if (shader.shaderCodeInfo.attributeCount !== 2
      || attributes[0].inputName !== 'aVertexPosition' || attributes[0].inputVariableType !== OFEnumShaderDataTypes.Vector3
      || attributes[1].inputName !== 'aTextureCoord' || attributes[1].inputVariableType !== OFEnumShaderDataTypes.Vector2) {
      throw new Error('OFFullscreenPass.draw: the shader attributes must be a vec3 aVertexPosition and a vec2 aTextureCoord.');
    }

    if (!this._vertexBuffer) {
      this._vertexBuffer = _GL.createBuffer();
      _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vertexBuffer);
      _GL.bufferData(_GL.ARRAY_BUFFER, OFFullscreenPass.QuadVertices, _GL.STATIC_DRAW);
      _GL.bindBuffer(_GL.ARRAY_BUFFER, null);
    }

    if (source) {
      shader.setTextureByIndex(0, source instanceof OFRenderTarget ? source.texture : source);
    }

    // Identity camera and identity model: the quad stays in clip space. Passing the identity as the
    // transformation also keeps the shader's own world matrix out of it.
    shader.draw(this._args, this._vertexBuffer, this._identity, _GL.TRIANGLE_STRIP, null, 4);

    _GL.bindBuffer(_GL.ARRAY_BUFFER, null);
  }

  /** Frees the quad's buffer. The copy shader belongs to the shader factory and stays there. */
  destroy(): void {
    if (this._vertexBuffer) {
      this._graphicContext.deleteBuffer(this._vertexBuffer);
      this._vertexBuffer = null;
    }
  }
}
