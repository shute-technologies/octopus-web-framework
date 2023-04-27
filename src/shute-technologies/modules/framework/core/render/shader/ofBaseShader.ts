import { OFShaderFactory } from './ofShaderFactory';
import { OFRenderCamera } from '../camera/ofRenderCamera';
import { IOFDefaultShaderSource } from '../../../default-assets/ofDefaultShaderSources';
import { mat4, vec3 } from 'gl-matrix';
import { IOFRenderArgs } from '../../../interfaces/iofRenderArgs';
import { IOFMoreRenderArgs } from '../../../interfaces/iofMoreRenderArgs';
import { OFGraphicDevice } from '../../device/ofGraphicDevice';
import { OFColor } from '../graphics/ofColor';
import { OFIIsShaderAbstract } from './interfaces/ofIIsShaderAbstract';
import { STUtils } from 'shute-technologies.common-and-utils';

export abstract class OFBaseShader implements OFIIsShaderAbstract {

  protected readonly _renderCamera: OFRenderCamera;

  protected _name: string;

  protected _x: number;
  protected _y: number;
  protected _z: number;
  protected _scaleX: number;
  protected _scaleY: number;
  protected _scaleZ: number;
  protected _rotationX: number;
  protected _rotationY: number;
  protected _rotationZ: number;

  protected _world: mat4;
  private _rotation: mat4;

  protected _shaderProgram: WebGLProgram;
  protected _graphicContext: WebGLRenderingContext;
  protected _graphicDevice: OFGraphicDevice;

  get name(): string { return this._name; }
  set name(val: string) {
    if (STUtils.isNullOrEmpty(this._name)) {
      this._name = val;
    }
  }

  set x (val: number) {
    if (this._x !== val) {
      this._x = val;

      this._world[12] = this._x;
      this._world[13] = this._y;
      this._world[14] = this._z;
    }
  }

  set y (val: number) {
    if (this._y !== val) {
      this._y = val;

      this._world[12] = this._x;
      this._world[13] = this._y;
      this._world[14] = this._z;
    }
  }

  set z (val: number) {
    if (this._z !== val) {
      this._z = val;

      this._world[12] = this._x;
      this._world[13] = this._y;
      this._world[14] = this._z;
    }
  }

  set rotationZ(val: number) {
    if (this._rotationZ !== val) {
      this._rotationZ = val;

      // compute
      mat4.fromScaling(this._world, vec3.fromValues(this._scaleX, this._scaleY, this._scaleZ));
      mat4.fromZRotation(this._rotation, this._rotationZ);
      mat4.multiply(this._world, this._world, this._rotation);
      // now update translations
      this._world[12] = this._x;
      this._world[13] = this._y;
      this._world[14] = this._z;
    }
  }

  protected get graphicContext(): WebGLRenderingContext { return this._shaderFactory.graphicDevice.graphicContext; }

  constructor(
    protected readonly _shaderFactory: OFShaderFactory, 
    sourceTarget: IOFDefaultShaderSource,
    readonly isShaderAbstract = false
  ) {
    this._graphicDevice = _shaderFactory.graphicDevice;
    this._renderCamera = this._graphicDevice.renderCamera;
    this._shaderProgram = _shaderFactory.instanceShader(sourceTarget);
    this._graphicContext = this._shaderFactory.graphicDevice.graphicContext;

    this._world = mat4.create();
    this._rotation = mat4.create();

    this._name = '';
    this._x = this._y = this._z = 0;
    this._scaleX = this._scaleY = this._scaleZ = 1;
    this._rotationX = this._rotationY = this._rotationZ = 0;

    this.getShaderLocations(this._graphicContext);
  }

  abstract getShaderLocations(_GL: WebGLRenderingContext): void;

  setTranslate(x: number, y: number, z: number): void {
    this._x = x;
    this._y = y;
    this._z = z;

    this._world[12] = x;
    this._world[13] = y;
    this._world[14] = z;
  }

  setRotation(x: number, y: number, z: number): void {
    this._rotationX = x;
    this._rotationY = y;
    this._rotationZ = z;

    const matRx = mat4.fromXRotation(mat4.create(), this._rotationX);
    const matRy = mat4.fromYRotation(mat4.create(), this._rotationY);
    const matRz = mat4.fromZRotation(mat4.create(), this._rotationZ);

    mat4.multiply(this._rotation, this._rotation, matRx);
    mat4.multiply(this._rotation, this._rotation, matRy);
    mat4.multiply(this._rotation, this._rotation, matRz);

    // compute
    mat4.fromScaling(this._world, vec3.fromValues(this._scaleX, this._scaleY, this._scaleZ));
    mat4.fromZRotation(this._rotation, this._rotationZ);
    mat4.multiply(this._world, this._world, this._rotation);
    // now update translations
    this._world[12] = this._x;
    this._world[13] = this._y;
    this._world[14] = this._z;
  }

  setScale(x: number, y: number, z: number): void {
    this._scaleX = x;
    this._scaleY = y;
    this._scaleZ = z;

    // compute
    mat4.fromScaling(this._world, vec3.fromValues(this._scaleX, this._scaleY, this._scaleZ));
    mat4.fromZRotation(this._rotation, this._rotationZ);
    mat4.multiply(this._world, this._world, this._rotation);
    // now update translations
    this._world[12] = this._x;
    this._world[13] = this._y;
    this._world[14] = this._z;
  }

  setTexture (uniformName: string, texture: WebGLTexture, textureIndex: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];

    _GL.activeTexture(_GL[`TEXTURE${textureIndex}`]);
    _GL.bindTexture(_GL.TEXTURE_2D, texture);
    _GL.uniform1i(uniformLocation, 0);
  }

  setColor (uniformName: string, colorObject: OFColor): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this.getOrCreateUniformLocation(uniformName);
    _GL.uniform4f(uniformLocation, colorObject.r, colorObject.g, colorObject.b, colorObject.a);
  }

  private getOrCreateUniformLocation(uniformName: string): WebGLUniformLocation {
    if (!this[uniformName]) {
      const _GL = this._graphicContext;
      this[uniformName] = _GL.getUniformLocation(this._shaderProgram, uniformName)
    }

    return this[uniformName];
  }

  setVector4Float (uniformName: string, x: number, y: number, z: number, w: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform4f(uniformLocation, x, y, z, w);
  }

  setVector3Float (uniformName: string, x: number, y: number, z: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform3f(uniformLocation, x, y, z);
  }

  setVector2Float (uniformName: string, x: number, y: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform2f(uniformLocation, x, y);
  }

  setVector1Float (uniformName: string, x: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform1f(uniformLocation, x);
  }

  setVector1Int (uniformName: string, x: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform1i(uniformLocation, x);
  }

  setVector2Int (uniformName: string, x: number, y: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform2i(uniformLocation, x, y);
  }

  setVector3Int (uniformName: string, x: number, y: number, z: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform3i(uniformLocation, x, y, z);
  }

  setVector4Int (uniformName: string, x: number, y: number, z: number, w: number): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformLocation = this[uniformName];
    _GL.uniform4i(uniformLocation, x, y, z, w);
  }

  // custom
  setTextureByIndex (index: number, texture: WebGLTexture): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformName = this[`mTextureUniform${index}`];
    const uniformLocation = this[uniformName];

    _GL.activeTexture(_GL[`TEXTURE${index}`]);
    _GL.bindTexture(_GL.TEXTURE_2D, texture);
    _GL.uniform1i(uniformLocation, index);
  }

  setColorByIndex (index: number, colorObject: OFColor): void {
    const _GL = this._graphicContext;
    // Use ShaderProgram for setting the uniforms
    this._graphicDevice.useShaderProgram(this._shaderProgram);

    const uniformName = this[`mColorUniform${index}`];
    const uniformLocation = this[uniformName];

    _GL.uniform4f(uniformLocation, colorObject.r, colorObject.g, colorObject.b, colorObject.a);
  }

  abstract draw(args: IOFRenderArgs | IOFMoreRenderArgs, ...others): void;
}
