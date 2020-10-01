import { OFSceneManager } from "./ofSceneManager";
import { IOFRenderArgs } from "../interfaces/iofRenderArgs";
import { OFFramework } from "../ofFramework";
import { OFContentManager } from "../core/content/ofContentManager";

export abstract class OFBaseScene {

  framework: OFFramework;
  contentManager: OFContentManager;

  initialize(sceneManager: OFSceneManager, params?): void {
    this.framework = sceneManager.framework;
    this.contentManager = this.framework.contentManager;
  }

  onMouseMove(x: number, y:number): void {}

  onMouseDown(event: MouseEvent): void {}

  onMouseUp(event: MouseEvent): void {}

  onKeyDown(event: KeyboardEvent): void {}

  onKeyUp(event: KeyboardEvent): void {}

  abstract update(args: IOFRenderArgs): void;

  abstract destroy(): void;
}
