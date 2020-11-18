import { OFGraphicDevice } from '../core/device/ofGraphicDevice';
import { OFFrameworkFactory } from '../ofFrameworkFactory';
import { OFIPolygonBatcherUniformData, OFPolygonBatcher } from '../core/render/graphics/d2d/optimization/ofPolygonBatcher';
import { OFBitmapFontCharset } from '../../cross-cutting/font-loader/data/ofBitmapFontCharset';
import { OFColor } from '../core/render/graphics/ofColor';
import { OFQuadStruct } from '../core/render/graphics/data/ofQuad';
import { OFImageContent } from '../core/content/ofImageContent';
import { OFEnumTextAlign } from '../enums/ofEnumTextAlign';
import { OFVector2 } from '../math/ofVector2';
import { OFEnumShaderDataTypes } from '../core/render/shader/analizer/ofEnumShaderDataTypes';
import { OFEnumKeyCode } from '../enums/ofEnumKeyCode';
import { OFBitmapFontCharDescriptor } from '../../cross-cutting/font-loader/data/ofBitmapFontCharDescriptor';
import { IOFRenderArgs } from '../interfaces/iofRenderArgs';
import { mat4 } from 'gl-matrix';
import { Dictionary } from '../common/ofInterfaces';

export class OFCBitmapTextfield2D {
  private readonly _graphicDevice: OFGraphicDevice;
  private readonly _GL: WebGLRenderingContext;

  private _renderType: number;
  private _polygonBatcher: OFPolygonBatcher;
  private _uniformData: Dictionary<OFIPolygonBatcherUniformData>;

  private _fontCharset: OFBitmapFontCharset;

  private _indices: Array<number>;
  private _vertices: Array<number>;
  private _color: OFColor;
  private _customQuads: Array<OFQuadStruct>;
  private _imageContent: OFImageContent;
  private _width: number;
  private _height: number;
  private _textureWidth: number;
  private _textureHeight: number;
  private _scaleWasModified: boolean;
  private _drawEnable: boolean;
  private _oldNumQuads: number;
  private _indicesCount: number;

  private _textQuadCounter: number;
  private _textPositionRenderX: number;
  private _textPositionRenderY: number;
  private _textInternalOffset: number;

  // tracking
  private _trackingQuantity: number;

  // textfield variables
  private _text: string;
  private _textAlign: OFEnumTextAlign;
  private _textSize: OFVector2;

  get text(): string {
    return this._text;
  }
  get textSize(): OFVector2 {
    return this._textSize;
  }

  get color(): OFColor {
    return this._color;
  }
  set color(val: OFColor) {
    this._color = val;
    this._uniformData['UniformColor0'].value = val;
  }

  get trackingQuantity(): number {
    return this._trackingQuantity;
  }
  set trackingQuantity(val: number) {
    this._trackingQuantity = val;
    this.setText(this._text, true);
  }

  constructor() {
    this._graphicDevice = OFFrameworkFactory.currentFramewok.mainGraphicDevice;
    this._GL = this._graphicDevice.graphicContext;

    this._color = OFColor.white();
    this._customQuads = [];
    this._width = 0;
    this._height = 0;
    this._textureWidth = 0;
    this._textureHeight = 0;
    this._scaleWasModified = false;
    this._drawEnable = false;
    this._oldNumQuads = 0;
    this._indicesCount = 0;
    this._textQuadCounter = 0;
    this._textPositionRenderX = 0;
    this._textPositionRenderY = 0;
    this._textInternalOffset = 0;
    this._trackingQuantity = 0;
    this._text = '';
    this._textAlign = OFEnumTextAlign.Left;
    this._textSize = OFVector2.zero();
    this._renderType = this._GL.TRIANGLE_STRIP;
  }

  initialize(text: string, fontCharset: OFBitmapFontCharset, imageContent: OFImageContent): void {
    this._fontCharset = fontCharset;
    this._imageContent = imageContent;
    this._textureWidth = imageContent.imageWidth;
    this._textureHeight = imageContent.imageHeight;

    this._polygonBatcher = new OFPolygonBatcher();
    this._polygonBatcher.changeShader('TextShaderTexture');

    this._uniformData = {};
    this._uniformData['UniformColor0'] = {
      index: 0,
      type: OFEnumShaderDataTypes.IColor,
      value: OFColor.white(),
    } as OFIPolygonBatcherUniformData;

    this.setText(text);
  }

  private preValidationText(phrase): boolean {
    return phrase && this._text !== phrase;
  }

  setText(phrase: string, override?: boolean): void {
    phrase = !phrase ? '' : phrase;

    if (this.preValidationText(phrase) || override) {
      // reset
      this._text = phrase;
      this._textQuadCounter = 0;
      this._textPositionRenderX = 0;
      this._textPositionRenderY = 0;
      this._textSize = OFVector2.zero();
      this._textSize.y = this._fontCharset.base;

      const currentCharCount = phrase.length;
      const ctor_array = !this._customQuads || (this._customQuads && currentCharCount > this._customQuads.length);

      if (ctor_array) {
        this._customQuads = [];
      }

      let oldUnicodeChar = -1;
      let phraseLength = this._text.length;
      let oldIndexAfterJumpLine = 0;
      let oldWidthAfterJumpLine = 0;
      let jumpLineFound = false;
      let charDescriptor: OFBitmapFontCharDescriptor;

      for (let i = 0; i < phraseLength; i++) {
        let kerningAmount = 0;
        const unicodeCharFirst = this._text.charCodeAt(i);

        if (unicodeCharFirst === OFEnumKeyCode.JumpLine) {
          jumpLineFound = true;

          const newText = this._text.substring(oldIndexAfterJumpLine, i - oldIndexAfterJumpLine);
          const newTextLength = this._fontCharset.measureString(newText).x;

          oldIndexAfterJumpLine = i + 1;

          if (newTextLength > oldWidthAfterJumpLine) {
            oldWidthAfterJumpLine = newTextLength;
            this._textSize.x = oldWidthAfterJumpLine;
          }

          this._textSize.y += this._fontCharset.base;
        } else {
          // RETRIEVE KERNING
          if (oldUnicodeChar !== -1) {
            kerningAmount = this._fontCharset.getKerning(oldUnicodeChar, unicodeCharFirst);
          }

          if (this._fontCharset.existsChar(unicodeCharFirst)) {
            // RETRIEVE CHAR DESCRIPTOR
            charDescriptor = this._fontCharset.getCharDescriptor(unicodeCharFirst);
            // ADD CHAR QUAD TO RENDER
            this.addTextQuad(charDescriptor, kerningAmount, jumpLineFound);
            // STORING OLD VARIABLES
            oldUnicodeChar = unicodeCharFirst;

            jumpLineFound = false;
          }
        }
      }

      // IF NO JUMP LINE IS MADE, SET TEXT SIZE BY DEFAULT
      if (this._textSize.x === 0) {
        var sizeText = this._fontCharset.measureString(this._text);
        sizeText.x += this._text.length * this._trackingQuantity;

        this._textSize.x = sizeText.x;
        this._height = sizeText.x;
      } else {
        this._width = this._textSize.x;
      }

      if (this._textSize.y === 0) {
        this._textSize.y = this._fontCharset.base;
        this._height = this._fontCharset.base;
      } else {
        this._height = this._textSize.y;
      }

      this.alignText(this._textAlign);
      // TRANSFORM QUAD DATA TO RENDER ENABLE DATA
      this.transformToRender();

      // now do the scale thing
      //if (mScaleWasModified) { this.scale = mScale; }
    }
  }

  alignText(align: OFEnumTextAlign): void {
    this._textAlign = align;

    const textSizeTempX = -this._textSize.x; // should multiply by scaleX
    const textSizeTempY = -this._textSize.y; // should multiply by scaleY

    switch (align) {
      case OFEnumTextAlign.Left:
        this._textInternalOffset = 0;
        break;
      case OFEnumTextAlign.Right:
        this._textInternalOffset = textSizeTempX;
        break;
      case OFEnumTextAlign.Center:
        this._textInternalOffset = textSizeTempX / 2;
        break;
    }

    // mIsTransformed = true;
  }

  private addTextQuad(charDesc: OFBitmapFontCharDescriptor, kerningAmount: number, canJumpLine: boolean): void {
    const tileX = charDesc.x;
    const tileY = charDesc.y;
    const tileWidth = charDesc.textureU;
    const tileHeight = charDesc.textureV;

    const quadData = OFQuadStruct.createAsVertexPositionColorTexture();
    quadData.created = true;
    this._customQuads.push(quadData);

    if (canJumpLine) {
      this._textPositionRenderX = 0;
      this._textPositionRenderY += this._fontCharset.base;
    }

    const px = this._textPositionRenderX + charDesc.xOffset + kerningAmount + (this._trackingQuantity * this._textQuadCounter);
    const py = this._textPositionRenderY + charDesc.yOffset;

    this._textPositionRenderX += charDesc.xAdvance + kerningAmount;

    // VERTEX
    quadData.VPTTopLeft.x = px;
    quadData.VPTTopLeft.y = py;

    quadData.VPTTopRight.x = px + charDesc.width;
    quadData.VPTTopRight.y = py;

    quadData.VPTBottomLeft.x = px;
    quadData.VPTBottomLeft.y = py + charDesc.height;

    quadData.VPTBottomRight.x = px + charDesc.width;
    quadData.VPTBottomRight.y = py + charDesc.height;

    // NORMAL
    const defaultColor = OFColor.white();

    quadData.VPTTopLeft.color = defaultColor;
    quadData.VPTTopRight.color = defaultColor;
    quadData.VPTBottomLeft.color = defaultColor;
    quadData.VPTBottomRight.color = defaultColor;

    // TEXTURE COORDINATES
    quadData.VPTTopLeft.u = tileX / this._textureWidth;
    quadData.VPTTopLeft.v = tileY / this._textureHeight;
    quadData.VPTTopRight.u = (tileX + tileWidth) / this._textureWidth;
    quadData.VPTTopRight.v = tileY / this._textureHeight;
    quadData.VPTBottomLeft.u = tileX / this._textureWidth;
    quadData.VPTBottomLeft.v = (tileY + tileHeight) / this._textureHeight;
    quadData.VPTBottomRight.u = (tileX + tileWidth) / this._textureWidth;
    quadData.VPTBottomRight.v = (tileY + tileHeight) / this._textureHeight;

    // adding to buffer
    this._customQuads[this._textQuadCounter] = quadData;
    this._textQuadCounter++;
  }

  private preCalculateIndices(numQuads: number): void {
    if (this._oldNumQuads !== numQuads) {
      let indicesCount = 0;

      // let ctor_array = false;
      // let offsetSizePlus = 0;
      // const currentIndicesCount = numQuads * 6;

      // if (mIndices) {
      //     if (currentIndicesCount > mIndices.length) {
      //         ctor_array = true;
      //     }
      // }
      // else { ctor_array = true; }

      // if (ctor_array) {
      // 	mIndices = []; // length: currentIndicesCount + offsetSizePlus
      // }
      this._indices = [];

      switch (this._renderType) {
        case this._GL.TRIANGLE_STRIP:
          // USING TRIANGLE DEGENERATION
          for (let i = 0; i < numQuads; ++i) {
            this._indices.push(indicesCount + 3);
            this._indices.push(indicesCount + 2);
            this._indices.push(indicesCount + 1);
            this._indices.push(indicesCount);
            this._indices.push(indicesCount);
            this._indices.push(indicesCount + 7);

            indicesCount += 4;
          }
      }
      this._indices[this._indices.length - 1] = 0;
      this._oldNumQuads = numQuads;
      this._indicesCount = numQuads * 6;
    }
  }

  private transformToRender(): void {
    let numTilesToDraw = 0;
    let tempDSTQ: OFQuadStruct = null;
    const textLenght = this._textQuadCounter;

    for (let w = 0; w < textLenght; w++) {
      if (this._customQuads[w].created) {
        numTilesToDraw++;
      }
    }

    this.preCalculateIndices(this._textQuadCounter);

    // create o re-create the mVertices array
    this._vertices = [];
    // if (mVertices) {
    //     if ((mVertexCount * 8) > mVertices.length) {
    //         mVertices = []/*mVertexCount * 8*/;
    //     }
    // }
    // else { mVertices = []/*mVertexCount * 8*/; }

    for (let w = 0; w < textLenght; w++) {
      tempDSTQ = this._customQuads[w];

      if (tempDSTQ.created) {
        this._vertices.push(tempDSTQ.VPTTopRight.x);
        this._vertices.push(tempDSTQ.VPTTopRight.y);
        this._vertices.push(tempDSTQ.VPTTopRight.color.r);
        this._vertices.push(tempDSTQ.VPTTopRight.color.g);
        this._vertices.push(tempDSTQ.VPTTopRight.color.b);
        this._vertices.push(tempDSTQ.VPTTopRight.color.a);
        this._vertices.push(tempDSTQ.VPTTopRight.u);
        this._vertices.push(tempDSTQ.VPTTopRight.v);

        this._vertices.push(tempDSTQ.VPTTopLeft.x);
        this._vertices.push(tempDSTQ.VPTTopLeft.y);
        this._vertices.push(tempDSTQ.VPTTopRight.color.r);
        this._vertices.push(tempDSTQ.VPTTopRight.color.g);
        this._vertices.push(tempDSTQ.VPTTopRight.color.b);
        this._vertices.push(tempDSTQ.VPTTopRight.color.a);
        this._vertices.push(tempDSTQ.VPTTopLeft.u);
        this._vertices.push(tempDSTQ.VPTTopLeft.v);

        this._vertices.push(tempDSTQ.VPTBottomRight.x);
        this._vertices.push(tempDSTQ.VPTBottomRight.y);
        this._vertices.push(tempDSTQ.VPTBottomRight.color.r);
        this._vertices.push(tempDSTQ.VPTBottomRight.color.g);
        this._vertices.push(tempDSTQ.VPTBottomRight.color.b);
        this._vertices.push(tempDSTQ.VPTBottomRight.color.a);
        this._vertices.push(tempDSTQ.VPTBottomRight.u);
        this._vertices.push(tempDSTQ.VPTBottomRight.v);

        this._vertices.push(tempDSTQ.VPTBottomLeft.x);
        this._vertices.push(tempDSTQ.VPTBottomLeft.y);
        this._vertices.push(tempDSTQ.VPTBottomLeft.color.r);
        this._vertices.push(tempDSTQ.VPTBottomLeft.color.g);
        this._vertices.push(tempDSTQ.VPTBottomLeft.color.b);
        this._vertices.push(tempDSTQ.VPTBottomLeft.color.a);
        this._vertices.push(tempDSTQ.VPTBottomLeft.u);
        this._vertices.push(tempDSTQ.VPTBottomLeft.v);
      }
    }

    if (numTilesToDraw > 0) {
      this._drawEnable = true;
    } else {
      this._drawEnable = false;
    }

    this._polygonBatcher.imageContent = this._imageContent;
    this._polygonBatcher.beginDraw();
    this._polygonBatcher.pushPolygon(this._vertices, this._indices);
    this._polygonBatcher.endDraw();
  }

  setLetterColor(charIndex: number, color: OFColor): void {
    const indexArray = charIndex * 32;

    this._vertices[indexArray + 2] = color.r;
    this._vertices[indexArray + 3] = color.g;
    this._vertices[indexArray + 4] = color.b;
    this._vertices[indexArray + 5] = color.a;

    this._vertices[indexArray + 8 + 2] = color.r;
    this._vertices[indexArray + 8 + 3] = color.g;
    this._vertices[indexArray + 8 + 4] = color.b;
    this._vertices[indexArray + 8 + 5] = color.a;

    this._vertices[indexArray + 16 + 2] = color.r;
    this._vertices[indexArray + 16 + 3] = color.g;
    this._vertices[indexArray + 16 + 4] = color.b;
    this._vertices[indexArray + 16 + 5] = color.a;

    this._vertices[indexArray + 24 + 2] = color.r;
    this._vertices[indexArray + 24 + 3] = color.b;
    this._vertices[indexArray + 24 + 4] = color.b;
    this._vertices[indexArray + 24 + 5] = color.a;

    this._polygonBatcher.imageContent = this._imageContent;
    this._polygonBatcher.beginDraw();
    this._polygonBatcher.pushPolygon(this._vertices, this._indices);
    this._polygonBatcher.endDraw();
  }

  draw(args: IOFRenderArgs, transformationMatrix?: mat4): void {
    if (this._drawEnable) {
      this._polygonBatcher.draw(args, transformationMatrix, this._GL.TRIANGLE_STRIP, this._uniformData);
    }
  }

  destroy(): void {
    (this as any)['_graphicDevice'] = null;
    (this as any)['_GL'] = null;

    this._polygonBatcher?.destroy();
    this._polygonBatcher = null;

    this._uniformData = null;
    this._fontCharset = null;
    this._indices = null;
    this._vertices = null;
    this._color = null;
    this._customQuads = null;
    this._imageContent = null;
    this._text = null;
    this._textAlign = null;
    this._textSize = null;
  }
}
