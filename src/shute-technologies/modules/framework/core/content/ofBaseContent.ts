import { OFContentManager } from './ofContentManager';
import { OFFramework } from '../../ofFramework';

export class OFBaseContent {

  protected _framework: OFFramework;
  protected _graphicContext: WebGLRenderingContext;
  protected _path: string;
  protected _isLoaded: boolean;

  get path(): string { return this._path; }
  get isLoaded(): boolean { return this._isLoaded; }

  get framework(): OFFramework { return this._framework; }
  get graphicContext() { return this._graphicContext; }

  constructor (readonly contentManager: OFContentManager) {
    this._isLoaded = false;
    this._framework = contentManager.framework;
    this._graphicContext = this._framework.mainGraphicDevice.graphicContext;
  }

  initialize (): void { /* NOTHING */ }

  changeProperties(params: {}): void { /* NOTHING */ }

  load(path: string): void {
    this._path = path;
  }

  unload(): void { /* NOTHING */ }
}
