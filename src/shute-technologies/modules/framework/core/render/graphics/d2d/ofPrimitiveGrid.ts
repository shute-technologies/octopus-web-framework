import { OFDrawable2D } from '../ofDrawable2D';
import { OFColor } from '../ofColor';
import { IOFRenderArgs } from '../../../../interfaces/iofRenderArgs';
import { OFEnumVBOObjectType } from '../../../device/optimization/gpu/ofEnumVBOObjectType';
import { OFShaderPrimitive } from '../../shader/ofShaderPrimitive';
import { mat4, vec3 } from 'gl-matrix';

export class OFPrimitiveGrid extends OFDrawable2D {

  static readonly defaultTileSize = 32;
  static readonly defaultWidth = 1;
  static readonly defaultHeight = 2;

  protected _width: number;
  protected _height: number;
  protected _tileSizeX: number;
  protected _tileSizeY: number;

  offsetX: number;
  offsetY: number;

  protected _triangleRenderType: number;
  protected _drawingCount: number;
  protected _otherTransformation: mat4;

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get tileSizeX(): number { return this._tileSizeX; }
  get tileSizeY(): number { return this._tileSizeY; }

  get color(): OFColor { return this._color; }
  set color(val: OFColor) { this._color = val; }

  constructor(x: number, y: number, color: OFColor) {
    super(x, y);

    this.offsetX = 0;
    this.offsetY = 0;
    this._width = OFPrimitiveGrid.defaultWidth;
    this._height = OFPrimitiveGrid.defaultHeight;
    this._tileSizeX = OFPrimitiveGrid.defaultTileSize;
    this._tileSizeY = OFPrimitiveGrid.defaultTileSize;
    this._color = color;
    this._otherTransformation = mat4.create();

    this.initialize();
  }

  protected initialize(): void {
    const _GL = this._graphicContext;

    this._triangleRenderType = _GL.LINES;
    this._drawingCount = 8;
    this._indices = [0, 1, 1, 3, 3, 2, 2, 0];

    // Get Shader
    this._shader = this._graphicDevice.shaderFactory.retrieveShader<OFShaderPrimitive>('ShaderPrimitive');
    // create VBO's
    this.createVBOs();

    const hw = this._width / 2.0;
    const hh = this._height / 2.0;

    this._vertices = [
      hw, hh, 0.0,
      -hw, hh, 0.0,
      hw, -hh, 0.0,
      -hw, -hh, 0.0
    ];

    // Now we set the vertices array to the VertexBuffer
    _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
    _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);

    // Now we set the indices array to the IndexBuffer
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iboObject.vbo);
    _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), _GL.STATIC_DRAW);
  
    // Get uniform color
    this._shader.setColor('uColor', this._color);
  }

  protected createVBOs(): void {
    // Get a VBO for this object
    this._vboObject = this._graphicDevice.deviceOptimizationManager
      .vboPooler.getAvailableVBO(OFEnumVBOObjectType.VertexBuffer);
    this._vboObject.activate(OFEnumVBOObjectType.VertexBuffer);

    // Get a IBO for this object
    this._iboObject = this._graphicDevice.deviceOptimizationManager
      .vboPooler.getAvailableVBO(OFEnumVBOObjectType.IndexBuffer);
    this._iboObject.activate(OFEnumVBOObjectType.IndexBuffer);
  }

  hitTest(other: OFDrawable2D): boolean {
    return false;
  }

  hitTestByPoint (x: number, y: number): boolean {
    const hWidth = this._width * 0.5;
    const hHeight = this._height * 0.5;
    const thisX = this.x + this.offsetX;
    const thisY = this.y + this.offsetY;

    return (thisX - hWidth) < x && (thisX + hWidth) > x && (thisY - hHeight) < y && (thisY + hHeight) > y;
  }

  changeGrid (width: number, height: number, tileSizeX: number, tileSizeY: number): void {
    const _GL = this._graphicContext;

    this._width = width;
    this._height = height;
    this._tileSizeX = tileSizeX;
    this._tileSizeY = tileSizeY;

    this._vertices = [];
    this._indices = [];

    let indicesCount = 0;
    const limitX = this._tileSizeX * this._width;
    const limitY = this._tileSizeY * this._height;

    for (let ix = 0; ix <= this._width; ix++) {
      const posX = ix * this._tileSizeX;

      this._vertices.push(posX, 0, 0);
      this._vertices.push(posX, limitY, 0);

      this._indices.push(indicesCount, indicesCount + 1);
      indicesCount += 2;
    }

    for (let iy = 0; iy <= this._height; iy++) {
      const posY = iy * this._tileSizeY;

      this._vertices.push(0, posY, 0);
      this._vertices.push(limitX, posY, 0);

      this._indices.push(indicesCount, indicesCount + 1);
      indicesCount += 2;
    }

    this._drawingCount = this._indices.length;

    // Now we set the vertices array to the VertexBuffer
    _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
    _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);

    // Now we set the indices array to the IndexBuffer
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iboObject.vbo);
    _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), _GL.STATIC_DRAW);
  }

  update(args: IOFRenderArgs): void {
    if (!this._shader.isShaderAbstract && this._color.a !== 0) {
      if (!this._transformation) {
        this._shader.setTranslate(this.x + this.offsetX, this.y + this.offsetY, this.z);
        this._shader.rotationZ = this.rotation;
        this._shader.setScale(this.scaleX, this.scaleY, 1.0);
        (this._shader as OFShaderPrimitive).color = this._color;

        this._shader.draw(args, this._vboObject.vbo, this._iboObject.vbo, this._triangleRenderType,
          this._drawingCount);
      } else {
        mat4.fromTranslation(this._otherTransformation, vec3.fromValues(this.offsetX, this.offsetY, 0));
        mat4.multiply(this._otherTransformation, this._transformation, this._otherTransformation);

        this._shader.draw(args, this._vboObject.vbo, this._iboObject.vbo, this._triangleRenderType, 
          this._drawingCount, this._otherTransformation);
      }
    }
  }

  destroy(): void {
    this._otherTransformation = null;

    super.destroy();
  }
}
