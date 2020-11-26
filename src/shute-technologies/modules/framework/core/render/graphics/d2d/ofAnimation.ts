import { OFColor } from '../ofColor';
import { IOFRenderArgs } from '../../../../interfaces/iofRenderArgs';
import { OFQuadTextCoords } from '../data/ofQuadTextCoords';
import { OFImageContent } from '../../../content/ofImageContent';
import { OFShaderTexture } from '../../shader/ofShaderTexture';
import { OFSprite } from './ofSprite';

export class OFAnimation extends OFSprite {

  private _currentFrameHorizontal: number;
  private _currentFrameVertical: number;
  private _totalFrames: number;
  private _hasAnimationEnded: boolean;

  get hasAnimationEnded(): boolean { return this._hasAnimationEnded; }

  get width(): number { return this._quadTextCoords.width / this._horizontalTiles; }
  get height(): number { return this._quadTextCoords.height / this._verticalTiles; }

  get color(): OFColor { return this._color; }
  set color(val: OFColor) { this._color = val; }

  set imageContent(val: OFImageContent) {
    const _GL = this._graphicContext;

    this._imageContent = val;
    this._imageHTML = this._imageContent.imageHTML;
    this._imageGLTexture = this._imageContent.imageTexture;

    if (!this._quadTextCoords) {
      this._imageRect.width = this._imageHTML.width;
      this._imageRect.height = this._imageHTML.height;

      this._quadTextCoords = new OFQuadTextCoords(0, 0, 0, 0,
        (this._imageRect.width / this._horizontalTiles) * 0.5,
        (this._imageRect.height / this._verticalTiles) * 0.5);

      // verify that the VBO object exists because could be erase if using the sprite batch
      if (this._vboObject) {
        // After finished loading created the vertices
        const hw = this._quadTextCoords.width;
        const hh = this._quadTextCoords.height;

        this._vertices = new Float32Array(20);
        this._vertices[0] = hw; this._vertices[1] = hh; this._vertices[2] = 0; this._vertices[3] = 1; this._vertices[4] = 1;
        this._vertices[5] = -hw; this._vertices[6] = hh; this._vertices[7] = 0; this._vertices[8] = 0; this._vertices[9] = 1;
        this._vertices[10] = hw; this._vertices[11] = -hh; this._vertices[12] = 0; this._vertices[13] = 1; this._vertices[14] = 0;
        this._vertices[15] = -hw; this._vertices[16] = -hh; this._vertices[17] = 0; this._vertices[18] = 0; this._vertices[19] = 0;

        // Now we set the vertices interleaved array to the VertexBuffer
        _GL.bindBuffer(_GL.ARRAY_BUFFER, this._vboObject.vbo);
        // This time the BufferData is set as DYNAMIC_DRAW, this is
        // because our vertex array will change often.
        _GL.bufferData(_GL.ARRAY_BUFFER, this._vertices, _GL.DYNAMIC_DRAW);
      }
    }
  }

  constructor(x = 0, y = 0,
    private readonly _horizontalTiles: number,
    private readonly _verticalTiles: number) {

    super(x, y);

    this._currentFrameHorizontal = 0;
    this._currentFrameVertical = 0;
    this._hasAnimationEnded = false;
    this._totalFrames = this._horizontalTiles * this._verticalTiles;

    this.initialize();
  }

  setAdvanceAnimationTileConfig (imageRectX: number, imageRectY: number, imageRectWidth: number, imageRectHeight: number): void {
    this._imageRect.x = imageRectX;
    this._imageRect.y = imageRectY;
    this._imageRect.width = imageRectWidth;
    this._imageRect.height = imageRectHeight;

    this._currentFrameHorizontal = 0;
    this._currentFrameVertical = 0;
    this._totalFrames = this._horizontalTiles * this._verticalTiles;

    // After finished loading created the vertices
    const hw = (this._imageRect.width / this._horizontalTiles) * 0.5;
    const hh = (this._imageRect.height / this._verticalTiles) * 0.5;

    // Update quad data
    this._quadTextCoords.width = (this._imageRect.width / this._horizontalTiles);
    this._quadTextCoords.height = (this._imageRect.height / this._verticalTiles);

    // verify that the VBO object exists because could be erase if using the sprite batch
    if (this._vboObject) {
      // Update current vertex array text coords
      this._vertices[0] = hw; this._vertices[1] = hh;
      this._vertices[5] = -hw; this._vertices[6] = hh;
      this._vertices[10] = hw; this._vertices[11] = -hh;
      this._vertices[15] = -hw; this._vertices[16] = -hh;
    }
  }

  update(args: IOFRenderArgs): void {
    this._hasAnimationEnded = false;

    if (this._imageContent && this._imageContent.isLoaded) {
      const _GL = this._graphicContext;

      const clipWidth = (this._imageRect.width / this._horizontalTiles) / this._imageHTML.width;
      const clipHeight = (this._imageRect.height / this._verticalTiles) / this._imageHTML.height;
      const clipX = (this._imageRect.x / this._imageHTML.width) + (Math.floor(this._currentFrameHorizontal) * clipWidth);
      const clipY = (this._imageRect.y / this._imageHTML.height) + (Math.floor(this._currentFrameVertical) * clipHeight);

      this._quadTextCoords.left = clipX;
      this._quadTextCoords.right = clipX + clipWidth;
      this._quadTextCoords.up = clipY;
      this._quadTextCoords.down = clipY + clipHeight;

      if (this._spriteBatchInstance) {
        this._spriteBatchInstance.drawGraphic(this);
      } else {
        // Update current vertex array text coords
        this._vertices[3] = this._quadTextCoords.right; this._vertices[4] = this._quadTextCoords.down;
        this._vertices[8] = this._quadTextCoords.left; this._vertices[9] = this._quadTextCoords.down;
        this._vertices[13] = this._quadTextCoords.right; this._vertices[14] = this._quadTextCoords.up;
        this._vertices[18] = this._quadTextCoords.left; this._vertices[19] = this._quadTextCoords.up;

        // Now we set the vertices interleaved array to the VertexBuffer
        _GL.bindBuffer(_GL.ARRAY_BUFFER, this.vboObject.vbo);
        _GL.bufferSubData(_GL.ARRAY_BUFFER, 0, this._vertices as BufferSource);

        (this._shader as OFShaderTexture).color = this._color;
        this._shader.setTranslate(this.x, this.y, this.z);
        this._shader.rotationZ = this.rotation;
        this._shader.setScale(this.scaleX, this.scaleY, 1.0);
        this._shader.draw(args, this._imageGLTexture, this._vboObject.vbo);
      }
    }

    if (this._debugCollisionQuad) {
      this._debugCollisionQuad.x = this.x;
      this._debugCollisionQuad.y = this.y;
      this._debugCollisionQuad.update(args);
    }

    // counting frames per update and by the framerate of the app and the animation
    const animationFramerate = this._framework.settings.animationFramerate;
    const targetFramerate = this._framework.settings.targetFramerate;
    // Now add the division of the framerates to the currentFrameHorizontal
    this._currentFrameHorizontal += animationFramerate / targetFramerate;

    if (this._currentFrameHorizontal >= this._horizontalTiles) {
      this._currentFrameHorizontal = 0;
      this._currentFrameVertical++;

      if (this._currentFrameVertical >= this._verticalTiles) {
        this._currentFrameVertical = 0;
        this._hasAnimationEnded = true;
      }
    }
  }
}
