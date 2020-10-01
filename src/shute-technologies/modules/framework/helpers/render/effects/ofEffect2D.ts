import { OFAnimation } from "../../../core/render/graphics/d2d/ofAnimation"
import { OFFrameworkFactory } from "../../../ofFrameworkFactory";
import { OFImageContent } from "../../../core/content/ofImageContent";
import { IOFRenderArgs } from "../../../interfaces/iofRenderArgs";

export class OFEffect2D {

  private _isWaitingForDelete: boolean;
  private readonly _animation: OFAnimation;

  get animation(): OFAnimation { return this._animation; }
  get isWaitingForDelete(): boolean { return this._isWaitingForDelete; }

  constructor(imagePath: string, x: number, y: number, horizontalTiles: number, verticalTiles: number) {
    this._isWaitingForDelete = false;

    this._animation = new OFAnimation(x, y, horizontalTiles, verticalTiles);
    this._animation.imageContent = OFFrameworkFactory.currentFramewok.contentManager
      .getContent<OFImageContent>(imagePath);
  }

  update(args: IOFRenderArgs): void {
    this._animation.update(args);

    if (this._animation.hasAnimationEnded) {
      this._isWaitingForDelete = true;
    }
  }

  destroy(): void {
    this._animation.destroy();
  }
}
