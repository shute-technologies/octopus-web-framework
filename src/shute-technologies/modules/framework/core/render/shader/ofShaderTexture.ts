import { OFBaseShader } from './ofBaseShader';
import { OFShaderFactory } from './ofShaderFactory';
import { IOFDefaultShaderSource } from '../../../default-assets/ofDefaultShaderSources';
import { OFColor } from '../graphics/ofColor';
import { IOFRenderArgs } from '../../../interfaces/iofRenderArgs';
import { mat4 } from 'gl-matrix';

export class OFShaderTexture extends OFBaseShader {

  color: OFColor;

  private _vertexPositionAttr: number;
  private _textureCoordPositionAttr: number;
  private _samplerPositionUniform: WebGLUniformLocation;
  private _uniformWVPMatrix: WebGLUniformLocation;
  private _uniformColor: WebGLUniformLocation;

  constructor(protected readonly _shaderFactory: OFShaderFactory, sourceTarget: IOFDefaultShaderSource) {
    super(_shaderFactory, sourceTarget);

    this.color = OFColor.white();
  }

  getShaderLocations(_GL: WebGLRenderingContext): void {
    this._vertexPositionAttr = _GL.getAttribLocation(this._shaderProgram, 'aVertexPosition');
    this._textureCoordPositionAttr = _GL.getAttribLocation(this._shaderProgram, 'aTextureCoord');
    this._samplerPositionUniform = _GL.getUniformLocation(this._shaderProgram, 'uSamplerTexture');
    this._uniformWVPMatrix = _GL.getUniformLocation(this._shaderProgram, 'uWVPMatrix');
    this._uniformColor = _GL.getUniformLocation(this._shaderProgram, 'uColor');
  }

  draw (args: IOFRenderArgs, texture: WebGLTexture, vertexBuffer: WebGLBuffer, transformation?: mat4): void {
    const _GL = this._graphicContext;

    // Enable blending
    _GL.enable(_GL.BLEND);
    _GL.blendFunc(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA);

    _GL.useProgram(this._shaderProgram);

    _GL.activeTexture(_GL.TEXTURE0);
    _GL.bindTexture(_GL.TEXTURE_2D, texture);
    _GL.uniform1i(this._samplerPositionUniform, 0);

    _GL.bindBuffer(_GL.ARRAY_BUFFER, vertexBuffer);

    _GL.enableVertexAttribArray(this._vertexPositionAttr);
    _GL.enableVertexAttribArray(this._textureCoordPositionAttr);
    _GL.vertexAttribPointer(this._vertexPositionAttr, 3, _GL.FLOAT, false, 20, 0);
    _GL.vertexAttribPointer(this._textureCoordPositionAttr, 2, _GL.FLOAT, false, 20, 12);

    // Get Transformation Matrix from RenderCamera
    const transformedMatrix = this._renderCamera.transformedMatrix;

    // Now multiply the Camera transformed Matrix with the local
    // transformations Matrix.
    if (!transformation) {
      mat4.multiply(transformedMatrix, transformedMatrix, this._world);
    } else {
      mat4.multiply(transformedMatrix, transformedMatrix, transformation);
    }

    // Set uniform for WVP Matrix
    _GL.uniformMatrix4fv(this._uniformWVPMatrix, false, transformedMatrix);
    // Set uniform for Color
    _GL.uniform4f(this._uniformColor, this.color.r, this.color.g, this.color.b, this.color.a);

    // Now draw arrays
    _GL.drawArrays(_GL.TRIANGLE_STRIP, 0, 4);
  }

  drawElements (args: IOFRenderArgs, texture: WebGLTexture, indexBuffer: WebGLBuffer,
    vertexBuffer: WebGLBuffer, indexCount: number) {

    const _GL = this._graphicContext;

    // Enable blending
    _GL.enable(_GL.BLEND);
    _GL.blendFunc(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA);

    _GL.useProgram(this._shaderProgram);

    _GL.activeTexture(_GL.TEXTURE0);
    _GL.bindTexture(_GL.TEXTURE_2D, texture);
    _GL.uniform1i(this._samplerPositionUniform, 0);

    _GL.bindBuffer(_GL.ARRAY_BUFFER, vertexBuffer);
    _GL.enableVertexAttribArray(this._vertexPositionAttr);
    _GL.enableVertexAttribArray(this._textureCoordPositionAttr);
    _GL.vertexAttribPointer(this._vertexPositionAttr, 3, _GL.FLOAT, false, 20, 0);
    _GL.vertexAttribPointer(this._textureCoordPositionAttr, 2, _GL.FLOAT, false, 20, 12);

    // Get Transformation Matrix from RenderCamera
    const transformedMatrix = this._renderCamera.transformedMatrix;

    // Now multiply the Camera transformed Matrix with the local
    // transformations Matrix.
    mat4.multiply(transformedMatrix, transformedMatrix, this._world);

    // Set uniform for WVP Matrix
    _GL.uniformMatrix4fv(this._uniformWVPMatrix, false, transformedMatrix);
    // Set uniform for Color
    _GL.uniform4f(this._uniformColor, this.color.r, this.color.g, this.color.b, this.color.a);

    // Now draw arrays
    // GL.drawArrays(GL.TRIANGLE_STRIP, 0, indexCount);
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
    _GL.drawElements(_GL.TRIANGLE_STRIP, indexCount, _GL.UNSIGNED_SHORT, 0);

    // clear
    _GL.bindBuffer(_GL.ARRAY_BUFFER, null);
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, null);
  }
}
