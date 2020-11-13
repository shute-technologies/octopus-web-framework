import { OFGraphicDevice } from '../core/device/ofGraphicDevice';
import { OFFrameworkFactory } from '../ofFrameworkFactory';
import { OFIPolygonBatcherUniformData, OFPolygonBatcher } from '../core/render/graphics/d2d/optimization/ofPolygonBatcher';
import { OFBitmapFontCharset } from '../../cross-cutting/font-loader/data/ofBitmapFontCharset';
import { OFColor } from '../core/render/graphics/ofColor';
import { OFQuadStruct } from '../core/render/graphics/data/ofQuad';
import { OFImageContent } from '../core/content/ofImageContent';
import { OFEnumTextAlign } from '../enums/ofEnumTextAlign';
import { OFVector2 } from '../math/ofVector2';

export class OFCBitmapTextfield2D {

  private readonly _graphicDevice: OFGraphicDevice;
  private readonly _GL: WebGLRenderingContext;

  private _renderType: number;
  private _polygonBatcher: OFPolygonBatcher;
  private _uniformData: OFIPolygonBatcherUniformData;

  private _fontCharset: OFBitmapFontCharset;

  private _indices: Array<number>;
  private _vertices: Array<number>;
  private _color: OFColor;
  private _customQuads: Array<OFQuadStruct>;
  private _imageContent: OFImageContent;
  private _textureWidth: number;
  private _textureHeight: number;
  private _scaleWasModified: boolean;
  private _drawEnable: boolean;
  private _oldNumQuads: number;

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

  get text(): string { return this._text; }
  get textSize(): OFVector2 { return this._textSize; }

  get color(): OFColor { return this._color; }
  set color(val: OFColor) { 
    this._color = val;
    this._uniformData.value = val;
  }

  get trackingQuantity(): number { return this._trackingQuantity; }
  set trackingQuantity(val: number) {
    this._trackingQuantity = val;
    this.setText(this._text, true);
  }

  constructor() {
    this._graphicDevice = new OFGraphicDevice(OFFrameworkFactory.currentFramewok);
    this._GL = this._graphicDevice.graphicContext;

    this._color = OFColor.white();
  }

  initialize(text: string, fontCharset: OFBitmapFontCharset, imageContent: OFImageContent): void {
    
  }

  setText(phrase: string, override?: boolean): void {

  }
}
