import { OFImageContent } from '../../../content/ofImageContent';
import { OFQuadTextCoords } from '../data/ofQuadTextCoords';
import { OFDrawable2D } from '../ofDrawable2D';
import { OFColor } from '../ofColor';
import { IOFSRect } from '../../../../interfaces/iofSRect';
import { OFEnumVBOObjectType } from '../../../device/optimization/gpu/ofEnumVBOObjectType';
import { OFPrimitiveQuad } from './ofPrimitiveQuad';
import { IOFRenderArgs } from '../../../../interfaces/iofRenderArgs';
import { OFShaderTexture } from '../../shader/ofShaderTexture';
import { OFSpriteBatcher } from './optimization/ofSpriteBatcher';
import { OFCollisionHelper } from '../../../../helpers/ofCollisionHelper';

export class OFSprite extends OFDrawable2D {

  protected _imageContent: OFImageContent;
  protected _imageHTML: HTMLImageElement;
  protected _imageGLTexture: WebGLTexture;

  protected _imageRect: IOFSRect;
  protected _quadTextCoords: OFQuadTextCoords;
  protected _debugCollisionQuad: OFPrimitiveQuad;
  protected _collisionRect: IOFSRect;

  enabledShaderProps: boolean;

  get quadTextCoords(): OFQuadTextCoords { return this._quadTextCoords; }
  get collisionRect(): IOFSRect { return this._collisionRect; }
  get debugCollisionQuad(): OFPrimitiveQuad { return this._debugCollisionQuad; }

  get color(): OFColor { return this._color; }
  set color(val: OFColor) { this._color = val; }

  get width(): number { return this._imageRect.width; }
  get height(): number { return this._imageRect.height; }

  get imageContent(): OFImageContent { return this._imageContent; }
  set imageContent(val: OFImageContent) {
    this._imageContent = val;
    this._imageHTML = this._imageContent.imageHTML;
    this._imageGLTexture = this._imageContent.imageTexture;

    this.updateGLBufferData();
  }

  set debugMode(val: boolean) {
    this._debugMode = val;

    if (this._debugMode && !this._debugCollisionQuad) {
      this._debugCollisionQuad = new OFPrimitiveQuad(this._collisionRect.x, this._collisionRect.y,
        this._collisionRect.width, this._collisionRect.height, OFColor.white());
    }
  }

  constructor(x = 0, y = 0) {
    super(x, y);

    this.enabledShaderProps = false;
    this._imageRect = { x: 0, y: 0, width: 0, height: 0, offsetX: 0, offsetY: 0 } as IOFSRect;
    this._shader = this._graphicDevice.shaderFactory.retrieveShader<OFShaderTexture>('ShaderTexture');

    this.initialize();
  }

  protected initialize(): void {
    // if there's no sprite batch available then is neccesary to process VBO's
    this.createVBOs();
  }

  protected createVBOs(): void {
    if (!this.hasSpriteBatch && !this._vboObject) {
      // Get a VBO for this object
      this._vboObject = this._graphicDevice.deviceOptimizationManager
        .vboPooler.getAvailableVBO(OFEnumVBOObjectType.VertexBuffer);
      this._vboObject.activate(OFEnumVBOObjectType.VertexBuffer);
    }
  }

  setSpriteBatch(spriteBatch: OFSpriteBatcher): void {
    super.setSpriteBatch(spriteBatch);
    this.createVBOs();
  }

  setAdvanceAnimationTileConfig (imageRectX: number, imageRectY: number, imageRectWidth: number, imageRectHeight: number): void {
    this._imageRect.x = imageRectX;
    this._imageRect.y = imageRectY;
    this._imageRect.width = imageRectWidth;
    this._imageRect.height = imageRectHeight;

    if (this._quadTextCoords) {
      // After finished loading created the vertices
      const hw = this._imageRect.width * 0.5;
      const hh = this._imageRect.height * 0.5;
      const clipWidth = this._imageRect.width / this._imageHTML.width;
      const clipHeight = this._imageRect.height / this._imageHTML.height;
      const clipX = this._imageRect.x / this._imageHTML.width;
      const clipY = this._imageRect.y / this._imageHTML.height;

      this._quadTextCoords.width = this._imageRect.width;
      this._quadTextCoords.height = this._imageRect.height;
      this._quadTextCoords.left = clipX;
      this._quadTextCoords.right = clipX + clipWidth;
      this._quadTextCoords.up = clipY;
      this._quadTextCoords.down = clipY + clipHeight;

      // if there's no sprite batch available then is neccesary to process VBO's
      if (!this.hasSpriteBatch) {
        // Update current vertex array vertex
        this._vertices[0] = hw; this._vertices[1] = hh;
        this._vertices[5] = -hw; this._vertices[6] = hh;
        this._vertices[10] = hw; this._vertices[11] = -hh;
        this._vertices[15] = -hw; this._vertices[16] = -hh;
        // Update current vertex array text coords
        this._vertices[3] = this._quadTextCoords.right; this._vertices[4] = this._quadTextCoords.down;
        this._vertices[8] = this._quadTextCoords.left; this._vertices[9] = this._quadTextCoords.down;
        this._vertices[13] = this._quadTextCoords.right; this._vertices[14] = this._quadTextCoords.up;
        this._vertices[18] = this._quadTextCoords.left; this._vertices[19] = this._quadTextCoords.up;

        // Now we set the vertices interleaved array to the VertexBuffer
        const _GL = this._graphicContext;
        _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
        _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);
      }
    }
  }

  createCollision (x: number, y: number, width: number, height: number, offsetX = 0, offsetY = 0): IOFSRect {
    this._collisionRect = {
      x,
      y,
      width,
      height,
      offsetX,
      offsetY
    } as IOFSRect;

    return this._collisionRect;
  }

  hitTest (other: OFDrawable2D): boolean {
    const otherSprite = other as OFSprite;

    if (!otherSprite.collisionRect || !this.collisionRect) {
      return false;
    }

    return OFCollisionHelper.hitTestSprite(this, otherSprite);
  }

  hitTestByPoint (x: number, y: number) {
    return OFCollisionHelper.hitTestByPointSprite(this, x, y);
  }

  protected updateGLBufferData(): void {
    if (this._imageContent.isLoaded) {
      this._quadTextCoords = new OFQuadTextCoords(0, 1, 0, 1,
        this._imageHTML.width * 0.5, this._imageHTML.height * 0.5);

      // if there's no sprite batch available then is neccesary to process VBO's
      if (!this.hasSpriteBatch) {
        this._vertices = [
          this._quadTextCoords.width, this._quadTextCoords.height, 0.0, this._quadTextCoords.right, this._quadTextCoords.down,
          -this._quadTextCoords.width, this._quadTextCoords.height, 0.0, this._quadTextCoords.left, this._quadTextCoords.down,
          this._quadTextCoords.width, -this._quadTextCoords.height, 0.0, this._quadTextCoords.right, this._quadTextCoords.up,
          -this._quadTextCoords.width, -this._quadTextCoords.height, 0.0, this._quadTextCoords.left, this._quadTextCoords.up
        ];

        // Now we set the vertices interleaved array to the VertexBuffer
        const _GL = this._graphicContext;
        _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
        _GL.bufferData(_GL.ARRAY_BUFFER, new Float32Array(this._vertices), _GL.STATIC_DRAW);
      }
    }
  }

  update(args: IOFRenderArgs): void {
    if (this._imageContent && this._imageContent.isLoaded) {
      // update the buffer data if the quad text coords are still null
      if (!this._quadTextCoords) {
        this.updateGLBufferData();
        this.setAdvanceAnimationTileConfig(this._imageRect.x, this._imageRect.y,
          this._imageRect.width, this._imageRect.height);
      }

      if (this.hasSpriteBatch) {
        this._spriteBatchInstance.drawGraphic(this);
      } else {
        if (this.enabledShaderProps) {
          this._shader.setColorByIndex(0, this._color);
          this._shader.setTextureByIndex(0, this._imageGLTexture);
        } else {
          (this._shader as OFShaderTexture).color = this._color;
        }

        if (!this._transformation) {
          this._shader.setTranslate(this.x, this.y, this.z);
          this._shader.rotationZ = this.rotation;
          this._shader.setScale(this.scaleX, this.scaleY, 1.0);
          this._shader.draw(args, this._imageGLTexture, this._vboObject.vbo);
        } else {
          if (this.enabledShaderProps) {
            this._shader.draw(args, this._vboObject.vbo, this._transformation);
          }
          this._shader.draw(args, this._imageGLTexture, this._vboObject.vbo, this._transformation);
        }
      }
    }

    if (this._debugCollisionQuad) {
      this._debugCollisionQuad.x = this.x;
      this._debugCollisionQuad.y = this.y;
      this._debugCollisionQuad.update(args);
    }
  }

  destroy(): void {
    this._spriteBatchInstance = null;
    this._quadTextCoords = null;
    this._imageContent = null;
    this._imageHTML = null;
    this._imageGLTexture = null;
    this._imageRect = null;

    if (this._debugCollisionQuad) {
      this._debugCollisionQuad.destroy();
      this._debugCollisionQuad = null;
    }

    super.destroy();
  }
}
