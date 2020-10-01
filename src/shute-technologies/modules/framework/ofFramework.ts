import { OFSettings } from "./settings/ofSettings";
import { OFDeltaTimeCorrector } from "./common/ofDeltaTimeCorrector";
import { OFTranslations } from "./settings/ofTranslations";
import { OFConsole } from "./helpers/ofConsole";
import { OFGraphicDevice } from "./core/device/ofGraphicDevice";
import { OFAudioDevice } from "./core/device/ofAudioDevice";
import { OFGraphicDeviceManager } from "./core/device/ofGraphicDeviceManager";
import { OFCanvasContextManager, IOFCanvasElement } from "./core/ofCanvasContextManager";
import { OFContentManager } from "./core/content/ofContentManager";
import { OFFrameworkFactory } from "./ofFrameworkFactory";
import { IOFRenderArgs } from "./interfaces/iofRenderArgs";
import { OFHTMLHelpers } from "./helpers/ofHTMLHelpers";
import { OFVector2 } from "./math/ofVector2";
import { OFDeviceCapabilities } from "./core/device/ofDeviceCapabilities";
import { OFColor } from "./core/render/graphics/ofColor";
import { OFSceneManager } from "./scene/ofSceneManager";
import { OFHelpers } from "./helpers/ofHelpers";

export class OFFramework {

  private _params: {};
  private _parentDivNode: HTMLBaseElement;
  private _mainCanvasObject: IOFCanvasElement;

  private _settings: OFSettings;
  private _mainGraphicDevice: OFGraphicDevice;
  private _audioDevice: OFAudioDevice;

  private _deltaTimeCorrector: OFDeltaTimeCorrector;
  private _deviceCapabilities: OFDeviceCapabilities;

  // managers
  private _graphicDeviceManager: OFGraphicDeviceManager;
  private _canvasContextManager: OFCanvasContextManager;
  private _contentManager: OFContentManager;
  private _sceneManager: OFSceneManager;

  private _appWidth: number;
  private _appHeight: number;
  private _mousePositionOffset: OFVector2;
  
  readonly frameworkIdentifier: number;

  get appWidth(): number { return this._appWidth; }
  get appHeight(): number { return this._appHeight; }
  get settings(): OFSettings { return this._settings; }
  get hasCanvas(): boolean { return !!this._parentDivNode; }
  get mousePositionOffset(): OFVector2 { return this._mousePositionOffset; }

  get getDocument (): Document { return document; }
  get parentDiv (): HTMLBaseElement { return this._parentDivNode; }
  get canvasElement (): HTMLCanvasElement { return this._mainCanvasObject.canvasElement; }

  get mainGraphicDevice (): OFGraphicDevice { return this._mainGraphicDevice; }
  get audioDevice (): OFAudioDevice { return this._audioDevice; }
  get graphicDeviceManager (): OFGraphicDeviceManager { return this._graphicDeviceManager; }    
  get canvasContextManager (): OFCanvasContextManager { return this._canvasContextManager; }    
  get contentManager (): OFContentManager { return this._contentManager; }    
  get sceneManager (): OFSceneManager { return this._sceneManager; }    
  get params (): {} { return this._params; }    

  private constructor(identifier: number, params:{} = null) {
    this.frameworkIdentifier = identifier;
    this._params = params;
    this._settings = OFSettings.create();
    this._deltaTimeCorrector = new OFDeltaTimeCorrector();

    OFConsole.log(OFTranslations.Framework.initialized, this.frameworkIdentifier.toString());
  }

  startOctopusFramework2D (divIdentifier: string, appWidth?: number, appHeight?: number) {
    this._canvasContextManager = new OFCanvasContextManager(this);

    // Get by Id the Canvas Element.
    this._parentDivNode = document.getElementById(divIdentifier) as HTMLBaseElement;

    if (this.hasCanvas) {
      this._parentDivNode.className = "canvasContainer";

      // Get mouse position offset
      this._mousePositionOffset = OFHTMLHelpers.getPositionOffset(this._parentDivNode.parentNode as HTMLBaseElement);

      this._appWidth = appWidth ? appWidth : this._settings.canvasWidth;        
      this._appHeight = appHeight ? appHeight : this._settings.canvasHeight;

      // Create main canvas element
      const canvasElementID = this.settings.identifier_RenderCanvas + this.frameworkIdentifier;
      this._mainCanvasObject = this._canvasContextManager.createCanvasElement(canvasElementID, "absolute");

      // First get the device capabilities.
      this._deviceCapabilities = OFDeviceCapabilities.create(this, this._settings.forceUseCanvasContextInsteadOfWebGL);

      // Now that we know which canvas/webgl has been created, now set it to the mMainCanvasObject 
      // version 2: Use is WebGLRenderingContext
      this._mainCanvasObject.context = this._deviceCapabilities.graphiContext as WebGLRenderingContext;
      // Set proprerties to the Canvas Element
      this._mainCanvasObject.canvasElement.style.backgroundColor = OFColor.convertToStringFromNormalized(this.settings.canvasBackgroundColor);
      this._mainCanvasObject.canvasElement.style.borderWidth = this.settings.canvasBorderWidth;
      this._mainCanvasObject.canvasElement.style.borderColor = OFColor.convertToStringFromNormalized(this.settings.canvasBorderColor);

      // Create the GraphicDevice depending on the capabilities.
      this._graphicDeviceManager = new OFGraphicDeviceManager(this);
      // Create Audio Device
      this._audioDevice = new OFAudioDevice(this);
      // Create Content Pipeline 
      this._contentManager = new OFContentManager(this);

      // Now initialize all
      this._graphicDeviceManager.initialize();
      this._audioDevice.initialize();
      this._contentManager.initialize();

      // Create the Main Graphic Device
      this._mainGraphicDevice = this._graphicDeviceManager.createGraphicDevice("main", this._mainCanvasObject);

      // After all load default objects
      if (this._settings.loadDefault) {
        this._graphicDeviceManager.loadDefault();
        this._contentManager.loadDefault();
      }

      if (this._settings.disableInputDetection) {
        this.doInputDetections();
      }

      // Now initialize the Application
      this.initializeApplication();
    } else {
      OFConsole.error(OFTranslations.Framework.canvasNotFound, 
        this.frameworkIdentifier.toString(), divIdentifier);
    }
  }

  private doInputDetections(): void {
    $(document.body).on('mousedown', (e) => {    
      const targetId = (this.parentDiv.firstChild as Element).id;
      const frameworkId = parseInt(targetId.charAt(targetId.length - 1));
      const foundFramework = OFFrameworkFactory.getById(frameworkId);
      
      if (foundFramework) {
        foundFramework.onMouseDown(e.originalEvent);
      }
    });

    $(document.body).on('mouseup', (e) => {
      const targetId = (this.parentDiv.firstChild as Element).id;
      const frameworkId = parseInt(targetId.charAt(targetId.length - 1));
      const foundFramework = OFFrameworkFactory.getById(frameworkId);
      
      if (foundFramework) {
        foundFramework.onMouseUp(e.originalEvent);
      }
    });

    $(document.body).on('mousemove', (e) => {
      const targetId = (this.parentDiv.firstChild as Element).id;
      const frameworkId = parseInt(targetId.charAt(targetId.length - 1));
      const foundFramework = OFFrameworkFactory.getById(frameworkId);

      if (foundFramework) {
        const mousePos = OFHelpers.getMousePosition(foundFramework, e);
        foundFramework.onMouseMove(mousePos.x, mousePos.y);
      }
    });

    $(document.body).on('keydown', (e) => {
      // Get target in W3C browsers & IE
      const targetId = (this.parentDiv.firstChild as Element).id;
      const frameworkId = parseInt(targetId.charAt(targetId.length - 1));

      OFFrameworkFactory.getById(frameworkId).onKeyDown(e.originalEvent);
    });

    $(document.body).on('keyup', (e) => {
      // Get target in W3C browsers & IE
      const targetId = (this.parentDiv.firstChild as Element).id;
      const frameworkId = parseInt(targetId.charAt(targetId.length - 1));

      OFFrameworkFactory.getById(frameworkId).onKeyUp(e.originalEvent);
    });
  }

  private initializeApplication(): void {
    this._sceneManager = new OFSceneManager(this);
    
    OFConsole.log(OFTranslations.Framework.ready, this.frameworkIdentifier.toString());
  }

  onKeyDown (event: KeyboardEvent) {
    this._sceneManager.onKeyDown(event);
  }

  onKeyUp (event: KeyboardEvent) {
    this._sceneManager.onKeyUp(event);
  }

  onMouseDown (event: MouseEvent) {
    this._sceneManager.onMouseDown(event);
  }

  onMouseUp (event: MouseEvent) {
    this._sceneManager.onMouseUp(event);
  }

  onMouseMove (x: number, y: number) {
    this._sceneManager.onMouseMove(x, y);
  }

  resize (width: number, height: number) {
    const oldWidth = this._appWidth;        
    const oldHeight = this._appHeight;

    this._appWidth = width;
    this._appHeight = height;
    
    // Get mouse position offset
    this._mousePositionOffset = OFHTMLHelpers.getPositionOffset(this._parentDivNode.parentNode as HTMLBaseElement);
    
    this._graphicDeviceManager.resize(width, height, oldWidth, oldHeight);
  }

  update(args: { dt: number }): void {
    if (this.hasCanvas) {
      OFFrameworkFactory.setCurrentFramework(this.frameworkIdentifier);

      const renderArgs = {
        dt: this._deltaTimeCorrector.recomputeDeltaTime(args.dt),
        framework: this
      } as IOFRenderArgs;

      this._graphicDeviceManager.update(renderArgs);
      this._sceneManager.update(renderArgs);
    }
  }

  destroy (): void {}

  static create(identifier: number, params:{} = null): OFFramework {
    return new OFFramework(identifier, params);
  }
}