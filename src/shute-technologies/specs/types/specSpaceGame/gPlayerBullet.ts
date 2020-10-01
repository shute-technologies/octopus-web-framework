import { GBaseBullet } from "./gBaseBullet";
import { GBulletFactory } from "./gBulletFactory";
import { OFSprite, OFVector2, OFImageContent, IOFRenderArgs } from "@framework";

export class GPlayerBullet extends GBaseBullet {

  private _sprite: OFSprite;

  private _speed: number;
  private _direction: OFVector2; 

  get sprite(): OFSprite { return this._sprite; }

  constructor(x: number, y: number, direction: OFVector2, speed: number, bulletFactory: GBulletFactory) {
    super(x, y, bulletFactory);

    this._direction = direction;
    this._speed = speed;

    this._sprite = new OFSprite(x, y);
    this._sprite.imageContent = this._framework.contentManager
      .getContent<OFImageContent>('resources/spSpriteSheetGameElements.png');
    this._sprite.setAdvanceAnimationTileConfig(1104, 190, 19, 4);

    const collWidth = this._sprite.width * this._sprite.scaleX;
    const collHeight = this._sprite.height * this._sprite.scaleY;
    
    this._sprite.createCollision(0, 0, collWidth, collHeight, 
      -collWidth / 2, -collHeight / 2);
  }

  update(args: IOFRenderArgs): void {
    this._sprite.x += this._direction.x * this._speed * args.dt;
    this._sprite.y += this._direction.y * this._speed * args.dt;
    
    this._sprite.update(args);

    if ((this._sprite.x + this._sprite.width) > this._framework.appWidth) {
      this._isWaitingForDelete = true;
    }

    for (let i = 0; i < this._enemyFactory.enemies.length; i++) {
      const enemy = this._enemyFactory.enemies[i];

      if (enemy && this._sprite.hitTest(enemy.sprite)) {
        // If there's collision of the player bullet then show an animation
        const bulletEffect2D = this._bulletFactory.game.effectManager.createEffect(
          'resources/spSpriteSheetGameElements.png', this.sprite.x, this.sprite.y, 4, 4);
        bulletEffect2D.animation.setAdvanceAnimationTileConfig(1024, 0, 190, 190);
        bulletEffect2D.animation.scaleX = 0.35;
        bulletEffect2D.animation.scaleY = 0.35;
        
        this._isWaitingForDelete = true;
        enemy.onHit(1);
        break;
      }
    }
  }

  destroy(): void {
    this._sprite.destroy();
    this._sprite = null;
    this._direction = null;
  }
}
