import { OFBaseShader } from './ofBaseShader';
import { OFShaderFactory } from './ofShaderFactory';
import { IOFDefaultShaderSource } from '../../../default-assets/ofDefaultShaderSources';
import { mat4 } from 'gl-matrix';
import { IOFMoreRenderArgs } from '../../../interfaces/iofMoreRenderArgs';
import type { OFIShaderCodeInfoInputData } from '../../../../cross-cutting/shader-analizer/data/ofIShaderCodeInfoInputData';
import { OFIShaderCodeInfo } from '../../../../cross-cutting/shader-analizer/data/ofIShaderCodeInfo';
import { OFEnumShaderDataTypes } from '../../../../cross-cutting/shader-analizer/ofEnumShaderDataTypes';

export class OFShaderAbstract extends OFBaseShader {

  private _shaderCodeInfo: OFIShaderCodeInfo;
  // camera x model for the current draw. Never multiply into the camera matrix itself: with a
  // custom camera that is `args.cameraMVP`, shared by every draw the caller makes with those args.
  private readonly _modelViewProjection: mat4 = mat4.create();

  private _attributeInterleavedDataSize: number;
  // Locations of the attributes this program declares, in declaration order (-1 if inactive).
  private _attributeLocations: number[];
  private _colorPropIndexCount: number;
  private _texturePropIndexCount: number;

  /** The inputs the shader's source declares. */
  get shaderCodeInfo(): OFIShaderCodeInfo { return this._shaderCodeInfo; }

  constructor(protected readonly _shaderFactory: OFShaderFactory, sourceTarget: IOFDefaultShaderSource,
    shaderCodeInfo: OFIShaderCodeInfo) {
    super(_shaderFactory, sourceTarget, true);

    this._attributeInterleavedDataSize = 0;
    this._colorPropIndexCount = 0;
    this._texturePropIndexCount = 0;
    this._shaderCodeInfo = shaderCodeInfo;

    this.updateShader(sourceTarget, shaderCodeInfo);
  }

  /** Floats per vertex for an attribute type; 0 for a type that is not a float vector. */
  private static floatCountOf(type: OFEnumShaderDataTypes): number {
    switch (type) {
      case OFEnumShaderDataTypes.Float: return 1;
      case OFEnumShaderDataTypes.Vector2: return 2;
      case OFEnumShaderDataTypes.Vector3: return 3;
      case OFEnumShaderDataTypes.Vector4: return 4;
      default: return 0;
    }
  }

  getShaderLocations(_GL: WebGLRenderingContext): void { /*NO IMPLEMENTATION HERE*/ }

  // tslint:disable-next-line: cyclomatic-complexity
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
        switch (uniformData.inputVariableType) {
          case OFEnumShaderDataTypes.IColor:
            delete this[`mColorUniform${tempColorPropIndexCount}`];
            tempColorPropIndexCount++;
            break;
          case OFEnumShaderDataTypes.ITexture:
            delete this[`mTextureUniform${tempTexturePropIndexCount}`];
            tempTexturePropIndexCount++;
            break;
        }
      }
    }

    // Update ShaderProgram and ShaderCodeInfo
    this._shaderCodeInfo = newShaderCodeInfo;
    this._shaderProgram = this._shaderFactory.instanceShader(sourceTarget);

    // Auto-Generate global variables for this context: Attributes
    this._attributeLocations = [];

    for (let i = 0; i < this._shaderCodeInfo.attributeCount; i++) {
      const attributeData = this._shaderCodeInfo.attributes[i];

      this[attributeData.inputName] = _GL.getAttribLocation(
        this._shaderProgram, attributeData.inputName);
      this._attributeLocations.push(this[attributeData.inputName]);

      // count size of interleaved data
      switch (attributeData.inputVariableType) {
        case OFEnumShaderDataTypes.Float: this._attributeInterleavedDataSize += 4; break;
        case OFEnumShaderDataTypes.Vector2: this._attributeInterleavedDataSize += 8; break;
        case OFEnumShaderDataTypes.Vector3: this._attributeInterleavedDataSize += 12; break;
        case OFEnumShaderDataTypes.Vector4: this._attributeInterleavedDataSize += 16; break;
      }
    }

    // Auto-Generate global variables and functions
    this.precomputeUniformsLocation();
  }

  precomputeUniformsLocation(): void {
    const _GL = this._graphicContext;

    // Auto-Generate global variables and functions
    for (let i = 0; i < this._shaderCodeInfo.uniformCount; i++) {
      const uniformData = this._shaderCodeInfo.uniforms[i];
      const uniformInputName = uniformData.inputName;

      // Create variable for location
      this[uniformInputName] = _GL.getUniformLocation(this._shaderProgram, uniformInputName);

      // If the uniform is not a sampler, then...
      switch (uniformData.inputVariableType) {
        case OFEnumShaderDataTypes.IColor:
          this[`mColorUniform${this._colorPropIndexCount}`] = uniformInputName;
          this._colorPropIndexCount++;
          break;
        case OFEnumShaderDataTypes.ITexture:
          this[`mTextureUniform${this._texturePropIndexCount}`] = uniformInputName;
          this._texturePropIndexCount++;
          break;
      }
    }
  }

  /** Sends the value stored under the input's name in sharedUniforms; false when there is none. */
  private sendSharedUniform(uniformData: OFIShaderCodeInfoInputData, textureUnit: number): boolean {
    const _GL = this._graphicContext;
    const value = this._graphicDevice.sharedUniforms.get(uniformData.inputName);

    if (value === undefined) { return false; }

    const location = this[uniformData.inputName];

    switch (uniformData.inputGLSLType) {
      case OFEnumShaderDataTypes.Sampler2D:
        _GL.activeTexture(_GL[`TEXTURE${textureUnit}`]);
        _GL.bindTexture(_GL.TEXTURE_2D, value as WebGLTexture);
        _GL.uniform1i(location, textureUnit);
        return true;
      case OFEnumShaderDataTypes.Float: _GL.uniform1f(location, value as number); break;
      case OFEnumShaderDataTypes.Vector2: _GL.uniform2fv(location, value as ArrayLike<number> as Float32List); break;
      case OFEnumShaderDataTypes.Vector3: _GL.uniform3fv(location, value as ArrayLike<number> as Float32List); break;
      case OFEnumShaderDataTypes.Vector4: _GL.uniform4fv(location, value as ArrayLike<number> as Float32List); break;
    }

    return false;
  }

  // tslint:disable-next-line: cyclomatic-complexity
  draw(args: IOFMoreRenderArgs, vertexBuffer: WebGLBuffer, transformation: mat4 = null, renderType: number,
    indexBuffer: WebGLBuffer, indexCount: number): void {

    const _GL = this._graphicContext;

    // Get Transformation Matrix from RenderCamera
    const transformedMatrix = !!args.hasCustomCamera
      ? args.cameraMVP
      : this._renderCamera.transformedMatrix;

    if (transformedMatrix && this._shaderProgram) {
      // Enable blending
      this._graphicDevice.useBlendMode(this.blendMode);

      // _GL.useProgram(mShaderProgram); // Replaced for optimized function in GraphicDevice
      this._graphicDevice.useShaderProgram(this._shaderProgram);

      // Shared textures take the units after the shader's own `: Texture` inputs.
      let nextTextureUnit = this._texturePropIndexCount;

      // Auto-Generate WebGL calls for Uniforms
      for (let i = 0; i < this._shaderCodeInfo.uniformCount; i++) {
        const uniformData = this._shaderCodeInfo.uniforms[i];

        switch (uniformData.inputVariableType) {
          case OFEnumShaderDataTypes.ICamera:
            const uniformLocation = this[uniformData.inputName];

            // camera x (transformation or this shader's world), into a scratch matrix. This used to
            // multiply into `transformedMatrix` in place, i.e. into args.cameraMVP, so the second and
            // later draws sharing those args got camera x M1 x M2 x ... and drifted.
            mat4.multiply(this._modelViewProjection, transformedMatrix, transformation ? transformation : this._world);

            _GL.uniformMatrix4fv(uniformLocation, false, this._modelViewProjection);
            break;
          case OFEnumShaderDataTypes.ITime:
            _GL.uniform1f(this[uniformData.inputName], this._graphicDevice.elapsedSeconds);
            break;
          case OFEnumShaderDataTypes.IViewport:
            const viewport = this._graphicDevice.currentViewport;

            _GL.uniform4f(this[uniformData.inputName], viewport.x, viewport.y, viewport.width, viewport.height);
            break;
          case OFEnumShaderDataTypes.IShared:
            if (this.sendSharedUniform(uniformData, nextTextureUnit)) {
              if (uniformData.inputGLSLType === OFEnumShaderDataTypes.Sampler2D) { nextTextureUnit++; }
            }
            break;
        }
      }

      _GL.bindBuffer(_GL.ARRAY_BUFFER, vertexBuffer);

      // Auto-Generate WebGL calls for Attributes. Enabling goes through the device, which also
      // disables what an earlier draw enabled and this program does not read.
      this._graphicDevice.useVertexAttributes(this._attributeLocations);

      let interleavedOffset = 0;

      for (let i = 0; i < this._shaderCodeInfo.attributeCount; i++) {
        const attributeData = this._shaderCodeInfo.attributes[i];
        const attribLocation = this._attributeLocations[i];
        const floatCount = OFShaderAbstract.floatCountOf(attributeData.inputVariableType);

        // -1: declared but never read, so the compiler removed it. It still takes its place in the
        // interleaved data; it just has no location to point at.
        if (floatCount > 0 && attribLocation >= 0) {
          _GL.vertexAttribPointer(attribLocation, floatCount, _GL.FLOAT, false,
            this._attributeInterleavedDataSize, interleavedOffset);
        }

        interleavedOffset += floatCount * 4; // 4 bytes per float
      }

      // RenderType: TRIANGLE_STRIP as default
      renderType = !renderType ? _GL.TRIANGLE_STRIP : renderType;

      // Now draw arrays or draw elements if indexBuffer was passed as parameter
      if (!indexBuffer) {
        _GL.drawArrays(renderType, 0, 4);
      } else {
        _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
        _GL.drawElements(renderType, indexCount, _GL.UNSIGNED_SHORT, 0);
      }
    }
  }
}
