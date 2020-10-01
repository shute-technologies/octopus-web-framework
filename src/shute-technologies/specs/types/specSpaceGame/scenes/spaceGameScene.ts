import { GraviusGame } from "../graviusGame";
import { OFBaseScene, OFSceneManager, IOFRenderArgs } from "@framework";

export class SpaceGameScene extends OFBaseScene {

  private _graviusGame: GraviusGame;

  constructor() {
    super();
  }

  initialize(sceneManager: OFSceneManager, params): void {
    super.initialize(sceneManager, params);

    // Load resources for this scene
    this.framework.contentManager.loadImage('resources/spSpriteSheetGameElements.png');

    this._graviusGame = new GraviusGame();
  }

  onMouseMove(x: number, y:number): void {
    if (this._graviusGame) { this._graviusGame.onMouseMove(x, y); }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this._graviusGame) { this._graviusGame.onKeyDown(event.keyCode); }
  }

  update(args: IOFRenderArgs): void {
    if (this._graviusGame) { this._graviusGame.update(args); }
  }

  destroy(): void {
    
  }
}