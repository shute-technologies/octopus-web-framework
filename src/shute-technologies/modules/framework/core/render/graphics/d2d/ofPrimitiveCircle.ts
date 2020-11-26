import { OFDrawable2D } from '../ofDrawable2D';
import { OFColor } from '../ofColor';
import { IOFRenderArgs } from '../../../../interfaces/iofRenderArgs';
import { OFEnumVBOObjectType } from '../../../device/optimization/gpu/ofEnumVBOObjectType';
import { OFShaderPrimitive } from '../../shader/ofShaderPrimitive';

export class OFPrimitiveCircle extends OFDrawable2D {

  static readonly vertexQuality = 64;

  private _radius: number;
  private _vertexQuality: number;
  private _triangleRenderType: number;
  private _drawingCount: number;

  offsetX: number;
  offsetY: number;

  get radius(): number { return this._radius; }
  set radius(val: number) {
    this._radius = val;

    const vertexPart = (2.0 * Math.PI) / OFPrimitiveCircle.vertexQuality;

    this._vertices = [];
    // center: only if case if is wireframe TRIANGLE_STRIP
    this._vertices.push(0, 0, 0);

    for (let i = 0; i < this._vertexQuality; i++) {
      const vx = Math.cos(vertexPart * i) * this._radius * 0.5;
      const vy = Math.sin(vertexPart * i) * this._radius * 0.5;

      this._vertices.push(vx, vy, 0);

      const _GL = this._graphicContext;

      // Now we set the vertices array to the VertexBuffer
      _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
      _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);

      // Now we set the indices array to the IndexBuffer
      _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iboObject.vbo);
      _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), _GL.STATIC_DRAW);
    }
  }

  get color(): OFColor { return this._color; }
  set color(val: OFColor) { this._color = val; }

  constructor(x: number, y: number, radius: number, color: OFColor) {
    super(x, y);

    this._radius = radius;
    this._color = color;
    this._vertexQuality = OFPrimitiveCircle.vertexQuality;

    this.initialize();
  }

  protected initialize(): void {
    const _GL = this._graphicContext;

    this.offsetX = 0;
    this.offsetY = 0;
    this._indices = [];
    this._drawingCount = 0;
    this._triangleRenderType = _GL.TRIANGLE_STRIP;

    // Get Shader
    this._shader = this._graphicDevice.shaderFactory.retrieveShader<OFShaderPrimitive>('ShaderPrimitive');
    // create VBO's
    this.createVBOs();

    // trigger the radius logic
    this.radius = this._radius;

    this.setWireframeVisibility(false);
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
      this._drawingCount = this._vertexQuality * 2;
      this._triangleRenderType = _GL.LINES;
      this._indices = [];

      for (let i = 1; i < this._vertexQuality; i++) {
        this._indices.push(i, i + 1);
      }

      this._indices.push(this._vertexQuality, 1);
    } else {
        this._drawingCount = this._vertexQuality * 2;
        this._triangleRenderType = _GL.TRIANGLE_STRIP;
        this._indices = [];
        this._indices.push(0, 1, 2);

        for (let i = 2; i < this._vertexQuality; i++) {
          this._indices.push(i + 1, 0);
        }

        this._indices.push(1, 0);
    }

    // Now we set the indices array to the IndexBuffer
    _GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, this._iboObject.vbo);
    _GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), _GL.STATIC_DRAW);
  }

  hitTest (other: OFDrawable2D): boolean {
    const thisX = this.x + this.offsetX;
    const thisY = this.y + this.offsetY;
    const otherX = other.x + (other as OFPrimitiveCircle).offsetX;
    const otherY = other.y + (other as OFPrimitiveCircle).offsetY;

    return thisX < otherX + (other as OFPrimitiveCircle).radius && thisX + this.radius > otherX &&
        thisY < otherY + (other as OFPrimitiveCircle).radius && this.radius + thisY > otherY;
  }

  hitTestByPoint (x: number, y: number): boolean {
    const hWidth = this.radius * 0.5;
    const hHeight = this.radius * 0.5;
    const thisX = this.x + this.offsetX;
    const thisY = this.y + this.offsetY;

    return (thisX - hWidth) < x && (thisX + hWidth) > x && (thisY - hHeight) < y && (thisY + hHeight) > y;
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
