import { GBaseBullet } from "./gBaseBullet";
import { GBulletFactory } from "./gBulletFactory";
import { GPlayer } from "./gPlayer";
import { OFAnimation, OFHoming2, OFFrameworkFactory, OFImageContent, IOFRenderArgs } from "@framework";

export class GEnemyHomingMissile extends GBaseBullet {

  private readonly _player: GPlayer;
  private readonly _animation: OFAnimation;
  private readonly _homingInterpolator: OFHoming2;

  get animation(): OFAnimation { return this._animation; }

  constructor(x: number, y: number, turnFactor: number, speed: number, player: GPlayer, 
    bulletFactory: GBulletFactory) {
    
    super(x, y, bulletFactory)

    this._player = player;
    
    this._animation = new OFAnimation(x, y, 4, 2);
    this._animation.imageContent = OFFrameworkFactory.currentFramewok.contentManager
      .getContent<OFImageContent>('resources/spSpriteSheetGameElements.png');
    this._animation.setAdvanceAnimationTileConfig(1024, 190, 80, 15);

    const collWidth = this._animation.width * this._animation.scaleX;
    const collHeight = this._animation.height * this._animation.scaleY;
    
    this._animation.createCollision(0, 0, collWidth, collHeight, 
      -collWidth / 2, -collHeight / 2);

    this._homingInterpolator = new OFHoming2(x, y, turnFactor, speed);
  }

  update(args: IOFRenderArgs): void {
    this._homingInterpolator.update(args.dt);

    this._animation.x = this._homingInterpolator.x;
    this._animation.y = this._homingInterpolator.y;
    this._animation.rotation = this._homingInterpolator.rotation;
    this._animation.update(args);

    this._homingInterpolator.setTarget(this._player.x, this._player.y);

    if (this._player && this._player.hitTest(this._animation)) {
      // If there's collision of the player bullet then show an animation
      const bulletEffect2D = this._bulletFactory.game.effectManager.createEffect(
        'resources/spSpriteSheetGameElements.png', this._animation.x, this._animation.y, 4, 4);
      bulletEffect2D.animation.setAdvanceAnimationTileConfig(1024, 0, 190, 190);
      bulletEffect2D.animation.scaleX = 0.35;
      bulletEffect2D.animation.scaleY = 0.35;

      this._isWaitingForDelete = true;

      this._player.onHit(1);
    }
  }

  destroy(): void {
    this._homingInterpolator.destroy();
    this._animation.destroy();
  }
}