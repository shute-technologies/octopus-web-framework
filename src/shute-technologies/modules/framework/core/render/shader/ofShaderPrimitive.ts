import { OFBaseShader } from "./ofBaseShader";
import { OFShaderFactory } from "./ofShaderFactory";
import { IOFDefaultShaderSource } from "../../../default-assets/ofDefaultShaderSources";
import { IOFRenderArgs } from "../../../interfaces/iofRenderArgs";
import { OFColor } from "../graphics/ofColor";
import { mat4 } from "gl-matrix";

export class OFShaderPrimitive extends OFBaseShader {

  private _vertexPositionAttr: number;
  private _uniformWVPMatrix: WebGLUniformLocation;
  private _uniformColor: WebGLUniformLocation;

  color: OFColor;

  constructor(protected readonly _shaderFactory: OFShaderFactory, sourceTarget: IOFDefaultShaderSource) {
    super(_shaderFactory, sourceTarget);

    this.color = OFColor.white();
  }

  getShaderLocations(_GL: WebGLRenderingContext): void {
    this._vertexPositionAttr = _GL.getAttribLocation(this._shaderProgram, 'aVertexPosition'); 
    this._uniformWVPMatrix = _GL.getUniformLocation(this._shaderProgram, "uWVPMatrix");
    this._uniformColor = _GL.getUniformLocation(this._shaderProgram, "uColor");
  }

  draw(args: IOFRenderArgs, vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer, 
    renderType: number, count: number): void {

    const _GL = this._graphicContext;

    // Enable blending
    _GL.enable(_GL.BLEND);
    _GL.blendFunc(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA);

    _GL.useProgram(this._shaderProgram);

    _GL.bindBuffer(_GL.ARRAY_BUFFER, vertexBuffer);
    
    _GL.enableVertexAttribArray(this._vertexPositionAttr);
    _GL.vertexAttribPointer(this._vertexPositionAttr, 3, _GL.FLOAT, false, 0, 0)
    
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
    renderType = !renderType ? _GL.TRIANGLE_STRIP : renderType
    
    if (indexBuffer) {
      _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
      _GL.drawElements(renderType, count, _GL.UNSIGNED_SHORT, 0);
    }
    else {
      _GL.drawArrays(renderType, 0, count);
    }
  }
}
