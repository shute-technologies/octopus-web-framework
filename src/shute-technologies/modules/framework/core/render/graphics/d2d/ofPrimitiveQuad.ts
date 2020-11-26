import { OFDrawable2D } from '../ofDrawable2D';
import { OFColor } from '../ofColor';
import { IOFRenderArgs } from '../../../../interfaces/iofRenderArgs';
import { OFEnumVBOObjectType } from '../../../device/optimization/gpu/ofEnumVBOObjectType';
import { OFShaderPrimitive } from '../../shader/ofShaderPrimitive';
import { OFCollisionHelper } from '../../../../helpers/ofCollisionHelper';

export class OFPrimitiveQuad extends OFDrawable2D {

  private _width: number;
  private _height: number;

  offsetX: number;
  offsetY: number;

  private _triangleRenderType: number;
  private _drawingCount: number;

  get width(): number { return this._width; }
  set width(val: number) {
    this._width = val;

    const hw = this._width / 2;
    const hh = this._height / 2;

    this._vertices = [
      hw, hh, 0.0,
      -hw, hh, 0.0,
      hw, -hh, 0.0,
      -hw, -hh, 0.0
    ];

    // Now we set the vertices array to the VertexBuffer
    const _GL = this._graphicContext;
    _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
    _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);
  }

  get height(): number { return this._height; }
  set height(val: number) {
    this._height = val;

    const hw = this._width / 2;
    const hh = this._height / 2;

    this._vertices = [
      hw, hh, 0.0,
      -hw, hh, 0.0,
      hw, -hh, 0.0,
      -hw, -hh, 0.0
    ];

    // Now we set the vertices array to the VertexBuffer
    const _GL = this._graphicContext;
    _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
    _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);
  }

  get color(): OFColor { return this._color; }
  set color(val: OFColor) { this._color = val; }

  constructor(x: number, y: number, width: number, height: number, color: OFColor) {
    super(x, y);

    this.offsetX = 0;
    this.offsetY = 0;
    this._width = width;
    this._height = height;
    this._color = color;

    this.initialize();
  }

  protected initialize(): void {
    const _GL = this._graphicContext;

    this._triangleRenderType = _GL.TRIANGLE_STRIP;
    this._drawingCount = 4;
    this._indices = [0, 1, 2, 3];

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

  setWireframeVisibility (isVisible: boolean): void {
    const _GL = this._graphicContext;

    if (isVisible) {
      this._drawingCount = 8;
      this._triangleRenderType = _GL.LINES;
      this._indices = [0, 1, 1, 3, 3, 2, 2, 0];
    } else {
      this._drawingCount = 4;
      this._triangleRenderType = _GL.TRIANGLE_STRIP;
      this._indices = [0, 1, 2, 3];
    }

    // Now we set the indices array to the IndexBuffer
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iboObject.vbo);
    _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), _GL.STATIC_DRAW);
  }

  hitTest(other: OFDrawable2D): boolean {
    return OFCollisionHelper.hitTestQuad(this, other as OFPrimitiveQuad);
  }

  hitTestByPoint(x: number, y: number): boolean {
    return OFCollisionHelper.hitTestByPointQuad(this, x, y);
  }

  update(args: IOFRenderArgs): void {
    if (this._color.a !== 0) {
      (this._shader as OFShaderPrimitive).color = this._color;

      if (!this._transformation) {
        this._shader.setTranslate(this.x + this.offsetX, this.y + this.offsetY, this.z);
        this._shader.rotationZ = this.rotation;
        this._shader.setScale(this.scaleX, this.scaleY, 1.0);

        this._shader.draw(args, this._vboObject.vbo, this._iboObject.vbo, this._triangleRenderType,
          this._drawingCount);
      } else {
        this._shader.draw(args, this._vboObject.vbo, this._transformation,
          this._triangleRenderType, this._iboObject.vbo, this._drawingCount);
      }
    }
  }
}
