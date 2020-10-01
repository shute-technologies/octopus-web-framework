import { OFColor } from '../core/render/graphics/ofColor'
import { OFEnumCanvasContextType } from '../enums/ofEnumCanvasContextType'
import { OFTranslations } from './ofTranslations';

export class OFSettings {

  targetFramerate: number;
  animationFramerate: number;
  loadDefault: boolean;
  disableInputDetection: boolean;

  // Configuration: Canvas
  forceUseCanvasContextInsteadOfWebGL: boolean;
  canvasContextType: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasBackgroundColor: OFColor;
  canvasBorderWidth: string;
  canvasBorderColor: OFColor;

  // Configuration: Debug Console
  debugConsoleTextColor: OFColor;
  debugConsoleTextWeight: string;
  debugConsoleTextSize: number;
  debugConsoleTextOffsetX: number;
  debugConsoleTextOffsetY: number;

  // Configuration: Render
  renderClearColor: OFColor;

  // Id's
  identifier_RenderCanvas: string;
  identifier_RenderTextCanvas: string;

  //Message
  message_CanvasHTML5Warning: string;
  
  // Disable 
  enabledVBOInstancesLife: boolean;

  private constructor() {
    this.targetFramerate = 60;
    this.animationFramerate = 60;
    this.loadDefault = true;
    this.disableInputDetection = true;

    this.forceUseCanvasContextInsteadOfWebGL = false;
    this.canvasContextType = OFEnumCanvasContextType.D2D;
    this.canvasWidth = 1024;
    this.canvasHeight = 768;
    this.canvasBackgroundColor = OFColor.black();
    this.canvasBorderWidth = '0px';
    this.canvasBorderColor = OFColor.black();

    this.debugConsoleTextColor = OFColor.green();
    this.debugConsoleTextWeight = 'bold';
    this.debugConsoleTextSize = 8;
    this.debugConsoleTextOffsetX = -90;
    this.debugConsoleTextOffsetY = 3;

    this.renderClearColor = OFColor.black();
    
    this.identifier_RenderCanvas = 'renderCanvas';
    this.identifier_RenderTextCanvas = 'renderTextCanvas';

    this.message_CanvasHTML5Warning = OFTranslations.Framework.Canvas.html5Warning;

    this.enabledVBOInstancesLife = true;
  }

  static create(): OFSettings {
    return new OFSettings();
  }
}