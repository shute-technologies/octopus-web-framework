import { OFFramework } from "../../../ofFramework";
import { OFGraphicDevice } from "../../device/ofGraphicDevice";
import { OFViewport } from "../viewport/ofViewport";
import { OFEnumCanvasContextType } from "../../../enums/ofEnumCanvasContextType";
import { IOFRenderArgs } from "../../../interfaces/iofRenderArgs";
import { mat4, vec3 } from "gl-matrix";

export class OFRenderCamera {

  static readonly defaultDepth = 10;
  static readonly defaultZNear = 0.01;
  static readonly defaultZFar = 100;
  static readonly defaultFov = 45;

  private _graphicDevice: OFGraphicDevice;
  private _graphicContext: WebGLRenderingContext;

  private _width: number;
  private _height: number;
  private _zNear: number;
  private _zFar: number;
  private _depth: number;
  
  private _world: mat4;
  private _view: mat4;
  private _projection: mat4;
  private _transformed: mat4;

  private _viewport: OFViewport;

  isFreeAspect: boolean;

  get transformed(): mat4 { return mat4.clone(this._transformed); }

  constructor(
    private readonly _framework: OFFramework, 
    private readonly _isChildCamera = false) {

    this._viewport = OFViewport.empty();
    this._depth = OFRenderCamera.defaultDepth;
    this.isFreeAspect = true;

    this._transformed = mat4.create();
    this._projection =  mat4.create();
    this._view =  mat4.create();
    this._world = mat4.create();

    mat4.lookAt(this._view, vec3.fromValues(0.0, 0.0, this._depth), vec3.create(), vec3.fromValues(0.0, 1.0, 0.0));
  }

  initialize(graphicDevice: OFGraphicDevice): void {
    this._graphicDevice = graphicDevice;
    this._graphicContext = graphicDevice.graphicContext;

    // set viewport
    const appWidth = this._framework.appWidth;
    const appHeight = this._framework.appHeight;

    this.setViewport(0, 0, appWidth, appHeight);

    switch (this._framework.settings.canvasContextType) {
      case OFEnumCanvasContextType.D2D:
        this.createOrthographic(appWidth, appHeight, OFRenderCamera.defaultZNear, OFRenderCamera.defaultZFar);
        break;
      case OFEnumCanvasContextType.D3D:
        this.createPerspective(OFRenderCamera.defaultFov, appWidth, appHeight, OFRenderCamera.defaultZNear, 
          OFRenderCamera.defaultZFar);
        break;
    }
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    if (!this._isChildCamera) {
      this._graphicDevice.canvasElement.width = width;
      this._graphicDevice.canvasElement.height = height;
    }

    this._viewport.x = x;
    this._viewport.y = y;
    this._viewport.width = width;
    this._viewport.height = height;

    this._graphicContext.viewport(x, y, width, height);
  }

  createPerspective (fov: number, width: number, height: number, zNear: number, zFar: number): void {
    this._width = width;
    this._height = height;
    this._zNear = zNear;
    this._zFar = zFar;
    
    const aspectRatio = width / height;
    
    mat4.perspective(this._projection, fov, aspectRatio, zNear, zFar);
  }

  createOrthographic (width: number, height: number, zNear: number, zFar: number): void {
    this._width = width;
    this._height = height;
    this._zNear = zNear;
    this._zFar = zFar;
    
    mat4.ortho(this._projection, 0, width, height, 0, zNear, zFar);
  }

  resize(width: number, height: number, oldWidth: number, oldHeight: number): void {
    if (this.isFreeAspect) {
      switch (this._framework.settings.canvasContextType) {
        case OFEnumCanvasContextType.D2D:
          this.createOrthographic(width, height, OFRenderCamera.defaultZNear, OFRenderCamera.defaultZFar);
          break;
        case OFEnumCanvasContextType.D3D:
          this.createPerspective(OFRenderCamera.defaultFov, width, height, OFRenderCamera.defaultZNear, 
            OFRenderCamera.defaultZFar);
          break;
      }

      // Change Viewport
      this._viewport.width = width;
      this._viewport.height = height;
      
      this._graphicContext.viewport(this._viewport.x, this._viewport.y, this._viewport.width, this._viewport.height);
    }
  }

  invalidateConfiguration(): void {
    const _GL = this._graphicContext;
        
    // Viewport
    this._graphicContext.viewport(this._viewport.x, this._viewport.y, this._viewport.width, this._viewport.height);
        
    // Set the scissor rectangle.
    _GL.scissor(
        this._viewport.x, 
        this._viewport.y, 
        this._viewport.width * this._width,
        this._viewport.height * this._height);
  }

  update(args: IOFRenderArgs): void {
    mat4.multiply(this._transformed, this._view, this._world);
    mat4.multiply(this._transformed, this._projection, this._transformed);
  }
}
