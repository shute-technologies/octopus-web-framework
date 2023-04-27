import { OFFramework } from "../ofFramework"
import { OFBaseScene } from "./ofBaseScene"
import { OFConsole } from "../helpers/ofConsole";
import { OFTranslations } from "../settings/ofTranslations";
import { IOFRenderArgs } from "../interfaces/iofRenderArgs";
import { IConstructor, STUtils } from 'shute-technologies.common-and-utils'

export class OFSceneManager {

  private _currentScene: OFBaseScene;

  get currentScene(): OFBaseScene { return this._currentScene; }

  constructor(public readonly framework: OFFramework) {}

  gotoScene(className: string, params?): void {
    if (this._currentScene) { this._currentScene.destroy(); }

    const instance = STUtils.instanceByClassName(className);

    if (instance) {
      this._currentScene = instance;
      this._currentScene.initialize(this, params);

      OFConsole.log(OFTranslations.Framework.SceneManager.gotoScene, 
        this.framework.frameworkIdentifier.toString(), className);
    } else {
      OFConsole.log(OFTranslations.Framework.SceneManager.sceneDontExists, 
        this.framework.frameworkIdentifier.toString(), className);
    }
  }

  gotoSceneBy<T extends OFBaseScene>(classType: IConstructor<T>, params?): void {
    if (this._currentScene) { this._currentScene.destroy(); }

    const instance = STUtils.instanceByType<T>(classType);

    if (instance) {
      this._currentScene = instance;
      this._currentScene.initialize(this, params);

      OFConsole.log(OFTranslations.Framework.SceneManager.gotoScene, 
        this.framework.frameworkIdentifier.toString(), '');
    } else {
      OFConsole.log(OFTranslations.Framework.SceneManager.sceneDontExists, 
        this.framework.frameworkIdentifier.toString(), '');
    }
  }

  onMouseMove (x: number, y: number): void {
    if (this._currentScene) { this._currentScene.onMouseMove(x, y); }
  }

  onMouseDown (event: MouseEvent) {
    if (this._currentScene) { this._currentScene.onMouseDown(event); }
  }

  onMouseUp (event: MouseEvent) {
    if (this._currentScene) { this._currentScene.onMouseUp(event); }
  }

  onKeyDown (event: KeyboardEvent) {
    if (this._currentScene) { this._currentScene.onKeyDown(event); }
  }

  onKeyUp (event: KeyboardEvent) {
    if (this._currentScene) { this._currentScene.onKeyUp(event); }
  }

  update(args: IOFRenderArgs): void {
    if (this._currentScene) { this._currentScene.update(args); }
  }
}