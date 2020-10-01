import { OFFramework } from "../ofFramework";
import { OFConsole } from "../helpers/ofConsole";
import { OFTranslations } from "../settings/ofTranslations";
import { OFHTMLHelpers } from "../helpers/ofHTMLHelpers";

export interface IOFCanvasElement {
  id: string;
  canvasElement: HTMLCanvasElement;
  context: WebGLRenderingContext;
}

export class OFCanvasContextManager {

  private _canvasContexts: Array<IOFCanvasElement>;

  constructor(private readonly _framework: OFFramework) {
    this._canvasContexts = [];
  }

  findCanvasObject (id: string) {
    return this._canvasContexts[id];
  }

  createCanvasElement (id: string, styleZIndex?: string): IOFCanvasElement {
    const element = OFHTMLHelpers.createCanvas(this._framework.settings.message_CanvasHTML5Warning, 
      this._framework.parentDiv, id);
    
    element.className = "canvas";
    element.style["z-index"] = styleZIndex === null ? "0" : styleZIndex;

    const result = { id: id, canvasElement: element, context: null } as IOFCanvasElement;        
    this._canvasContexts.push(result);
    
    return result;
  }

  createCanvasElementAndContext (id: string, styleZIndex?: number): IOFCanvasElement {
    const element = OFHTMLHelpers.createCanvas(this._framework.settings.message_CanvasHTML5Warning, 
      this._framework.parentDiv, id);
    element.className = "canvas canvas-child";
    element.style["z-index"] = styleZIndex === null ? "0" : styleZIndex;

    const graphicContext = this.construcWebGLCanvas(element);

    var result = { id: id, canvasElement: element, context: graphicContext } as IOFCanvasElement;        
    this._canvasContexts.push(result);

    return result;
  }

  construcWebGLCanvas (canvas: HTMLCanvasElement, useAlpha = false) {
    let graphicContext: WebGLRenderingContext;
    const contextPreferences = {
      alpha: useAlpha,
      preserveDrawingBuffer: true,
      desynchronized: true,
      powerPreference: "default"
    } as WebGLContextAttributes;

    try {
      graphicContext = (canvas.getContext("webgl", contextPreferences) ||
        canvas.getContext("experimental-webgl", contextPreferences)) as WebGLRenderingContext;
    }
    catch (e) { 
      OFConsole.error(OFTranslations.Framework.CanvasContextManager.issueRenderingContext, e);
    }

    return graphicContext;
  }

  constructCanvas (canvas: HTMLCanvasElement) {
    return canvas.getContext(this._framework.settings.canvasContextType);
  }
}
