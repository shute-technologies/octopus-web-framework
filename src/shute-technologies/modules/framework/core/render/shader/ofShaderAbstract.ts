import { OFBaseShader } from "./ofBaseShader";
import { OFShaderFactory } from "./ofShaderFactory";
import { IOFDefaultShaderSource } from "../../../default-assets/ofDefaultShaderSources";
import { mat4 } from "gl-matrix";
import { IOFMoreRenderArgs } from "../../../interfaces/iofMoreRenderArgs";
import { OFIShaderCodeInfo } from '../../../../cross-cutting/shader-analizer/data/ofIShaderCodeInfo';
import { OFEnumShaderDataTypes } from '../../../../cross-cutting/shader-analizer/ofEnumShaderDataTypes';

export class OFShaderAbstract extends OFBaseShader {

  private _shaderCodeInfo: OFIShaderCodeInfo;

  private _attributeInterleavedDataSize: number;
  private _colorPropIndexCount: number;
  private _texturePropIndexCount: number;

  constructor(protected readonly _shaderFactory: OFShaderFactory, sourceTarget: IOFDefaultShaderSource,
    shaderCodeInfo: OFIShaderCodeInfo) {
    super(_shaderFactory, sourceTarget);

    this._attributeInterleavedDataSize = 0;
    this._colorPropIndexCount = 0;
    this._texturePropIndexCount = 0;

    this._shaderCodeInfo = shaderCodeInfo;

    this.updateShader(sourceTarget, shaderCodeInfo);
  }

  getShaderLocations(_GL: WebGLRenderingContext): void {}

  updateShader(sourceTarget: IOFDefaultShaderSource, newShaderCodeInfo: OFIShaderCodeInfo): void {
    const _GL = this.graphicContext;

    // Remove and reset old data and properties
    if (this._shaderCodeInfo) {
      // Clear variables
      this._attributeInterleavedDataSize = 0;
      this._colorPropIndexCount = 0;
      this._texturePropIndexCount = 0;

      // Remove old properties attached from the old ShaderCodeInfo:: Attributes
      for (let i = 0; i < this._shaderCodeInfo.attributeCount; i++) {
        const attributeData = this._shaderCodeInfo.attributes[i];
        delete this[attributeData.inputName];
      }

      // Remove old properties attached from the old ShaderCodeInfo:: Uniforms
      let tempColorPropIndexCount = 0;
      let tempTexturePropIndexCount = 0;

      for (let i = 0; i < this._shaderCodeInfo.uniformCount; i++) {
        const uniformData = this._shaderCodeInfo.uniforms[i];
        const uniformInputName = uniformData.inputName;
        
        // Delete variable for location
        delete this[uniformInputName];

        // If the uniform is not a sampler, then...
        switch(uniformData.inputVariableType) {
          case OFEnumShaderDataTypes.IColor:
            delete this["mColorUniform" + tempColorPropIndexCount];
            tempColorPropIndexCount++;
            break;
          case OFEnumShaderDataTypes.ITexture:
            delete this["mTextureUniform" + tempTexturePropIndexCount];
            tempTexturePropIndexCount++;
            break;
        }
      }
    }

    // Update ShaderProgram and ShaderCodeInfo
    this._shaderCodeInfo = newShaderCodeInfo;
    this._shaderProgram = this._shaderFactory.instanceShader(sourceTarget);

    // Auto-Generate global variables for this context: Attributes
    for (var i = 0; i < this._shaderCodeInfo.attributeCount; i++) {
      const attributeData = this._shaderCodeInfo.attributes[i];

      this[attributeData.inputName] = _GL.getAttribLocation(
        this._shaderProgram, attributeData.inputName);
      
      // count size of interleaved data
      switch(attributeData.inputVariableType) {
        case OFEnumShaderDataTypes.Float:   this._attributeInterleavedDataSize += 4; break;
        case OFEnumShaderDataTypes.Vector2: this._attributeInterleavedDataSize += 8; break;
        case OFEnumShaderDataTypes.Vector3: this._attributeInterleavedDataSize += 12; break;
        case OFEnumShaderDataTypes.Vector4: this._attributeInterleavedDataSize += 16; break;
      }
    }

    // Auto-Generate global variables and functions
    this.precomputeUniformsLocation();
  }

  precomputeUniformsLocation (): void {
    const _GL = this._graphicContext;

    // Auto-Generate global variables and functions
    for (let i = 0; i < this._shaderCodeInfo.uniformCount; i++) {
      const uniformData = this._shaderCodeInfo.uniforms[i];
      const uniformInputName = uniformData.inputName;

      // Create variable for location
      this[uniformInputName] = _GL.getUniformLocation(this._shaderProgram, uniformInputName);

      // If the uniform is not a sampler, then...
      switch(uniformData.inputVariableType) {
        case OFEnumShaderDataTypes.IColor:
          this["mColorUniform" + this._colorPropIndexCount] = uniformInputName;
          this._colorPropIndexCount++;
          break;
        case OFEnumShaderDataTypes.ITexture:
          this["mTextureUniform" + this._texturePropIndexCount] = uniformInputName;
          this._texturePropIndexCount++;
          break;
      }
    }
  }

  draw(args: IOFMoreRenderArgs, vertexBuffer: WebGLBuffer, transformation: mat4 = null, renderType: number, 
    indexBuffer: WebGLBuffer, indexCount: number): void {
    
    const _GL = this._graphicContext;

    // Get Transformation Matrix from RenderCamera
    let transformedMatrix = args.hasCustomCamera
      ? args.cameraMVP
      : this._renderCamera.transformedMatrix;

    if (transformedMatrix && this._shaderProgram) { 
      // Enable blending
      _GL.enable(_GL.BLEND);
      _GL.blendFunc(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA);

      //_GL.useProgram(mShaderProgram); // Replaced for optimized function in GraphicDevice
      this._graphicDevice.useShaderProgram(this._shaderProgram);

      // Auto-Generate WebGL calls for Uniforms
      for (let i = 0; i < this._shaderCodeInfo.uniformCount; i++) {
        const uniformData = this._shaderCodeInfo.uniforms[i];
        
        if (uniformData.inputVariableType === OFEnumShaderDataTypes.ICamera) {
          const uniformLocation = this[uniformData.inputName];
          
          // Now multiply the Camera transformed Matrix with the local 
          // transformations Matrix.
          if (!transformation) {
            mat4.multiply(transformedMatrix, transformedMatrix, this._world);
          }
          else {
            mat4.multiply(transformedMatrix, transformedMatrix, transformation);
          }
          
          _GL.uniformMatrix4fv(uniformLocation, false, transformedMatrix);
          
          // no more to iterate
          break;
        }       
      }

      _GL.bindBuffer(_GL.ARRAY_BUFFER, vertexBuffer);

      // Auto-Generate WebGL calls for Attributes
      let interleavedOffset = 0;

      for (let i = 0; i < this._shaderCodeInfo.attributeCount; i++) {
        const attributeData = this._shaderCodeInfo.attributes[i];
        const attributeInputName = attributeData.inputName;
        const attribLocation = this[attributeInputName];
        
        _GL.enableVertexAttribArray(attribLocation);
        
        switch(attributeData.inputVariableType) {
          case OFEnumShaderDataTypes.Float:
            _GL.vertexAttribPointer(attribLocation, 1, _GL.FLOAT, false, 
                this._attributeInterleavedDataSize, interleavedOffset);
            
            interleavedOffset += 4; // 2 floats per 4 bytes
            break;
          case OFEnumShaderDataTypes.Vector2:
            _GL.vertexAttribPointer(attribLocation, 2, _GL.FLOAT, false, 
              this._attributeInterleavedDataSize, interleavedOffset);
            
            interleavedOffset += 8; // 2 floats per 4 bytes
            break;
          case OFEnumShaderDataTypes.Vector3:
            _GL.vertexAttribPointer(attribLocation, 3, _GL.FLOAT, false, 
              this._attributeInterleavedDataSize, interleavedOffset);
            
            interleavedOffset += 12; // 3 floats per 4 bytes
            break;
          case OFEnumShaderDataTypes.Vector4:
            _GL.vertexAttribPointer(attribLocation, 4, _GL.FLOAT, false, 
              this._attributeInterleavedDataSize, interleavedOffset);
            
            interleavedOffset += 16; // 4 floats per 4 bytes
            break;
        }
      }

      // RenderType: TRIANGLE_STRIP as default
      renderType = !renderType ? _GL.TRIANGLE_STRIP : renderType

      // Now draw arrays or draw elements if indexBuffer was passed as parameter
      if (!indexBuffer) {
        _GL.drawArrays(renderType, 0, 4);
      }
      else {
        _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
        _GL.drawElements(renderType, indexCount, _GL.UNSIGNED_SHORT, 0);
      }
    }
  }
}
