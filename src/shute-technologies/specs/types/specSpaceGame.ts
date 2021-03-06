import { OFFramework } from "../../modules/framework/ofFramework";
import { OFFrameworkFactory } from "../../modules/framework/ofFrameworkFactory";
import { SpaceGameScene } from "./specSpaceGame/scenes/spaceGameScene";

export class SpecSpaceGame {

  private readonly _framework: OFFramework;

  constructor() {
    this._framework = OFFrameworkFactory.create();
    this._framework.startOctopusFramework2D("canvas-scene");
    this._framework.sceneManager.gotoSceneBy<SpaceGameScene>(SpaceGameScene);
  }

  update(dt: number): void {
    this._framework.update({ dt });
  }
}
