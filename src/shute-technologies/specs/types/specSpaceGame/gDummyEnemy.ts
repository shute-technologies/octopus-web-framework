import { GEnemyBase } from "./gEnemyBase";
import { GEnemyFactory } from "./gEnemyFactory";
import { EnumProyectileType } from "./enums/enumProyectileType";
import { OFInterval } from '../../../modules/framework/helpers/ofInterval';
import { OFVector2 } from "../../../modules/framework/math/ofVector2";
import { OFSprite } from "../../../modules/framework/core/render/graphics/d2d/ofSprite";
import { OFImageContent } from "../../../modules/framework/core/content/ofImageContent";
import { OFMath } from "../../../modules/framework/math/ofMath";
import { IOFRenderArgs } from "../../../modules/framework/interfaces/iofRenderArgs";

export class GDummyEnemy extends GEnemyBase {

  private _speed: number;
  private _health: number;
  private _direction: OFVector2;
  private _iCreationMissile: OFInterval; 

  constructor (x: number, y: number, enemyFactory: GEnemyFactory) {
    super(enemyFactory);

    this._direction = new OFVector2(-1, 0);
    this._speed = 100;
    this._health = 3;

    this._sprite = new OFSprite(x, y);
    this._sprite.imageContent = this._framework.contentManager
      .getContent<OFImageContent>('resources/spSpriteSheetGameElements.png');
    this._sprite.rotation = -Math.PI / 2;
    this._sprite.scaleX = this._sprite.scaleY = 1;
    this._sprite.setAdvanceAnimationTileConfig(1123, 190, 32, 32);

    const collWidth = this._sprite.width * this._sprite.scaleX;
    const collHeight = this._sprite.height * this._sprite.scaleY;

    this._sprite.createCollision(0, 0, collWidth, collHeight, 
      -collWidth / 2, -collHeight / 2);

    this._iCreationMissile = new OFInterval(0.025, 200);
    this._iCreationMissile.finishedLoopCallback = () => this.onFinishedLoop_CreationMissile();
  }

  onFinishedLoop_CreationMissile () {
    const rnd = OFMath.random(0, 100);
    
    if (rnd > 70) {
      const turnFactor = 0.7;
      const speed = 200;
      
      this._enemyFactory.game.bulletFactory.createMissile(EnumProyectileType.MissileEnemy, 
        this._sprite.x, this._sprite.y, turnFactor, speed);
    }
  }

  onHit(damage: number): void {
    this._health -= damage; 

    if (this._health <= 0) {
      this._isWaitingForDelete = true;

      const enemyEffect2D = this._enemyFactory.game.effectManager.createEffect(
        'resources/spSpriteSheetGameElements.png', this._sprite.x, this._sprite.y, 8, 3);
      enemyEffect2D.animation.setAdvanceAnimationTileConfig(0, 0, 1024, 384);
      enemyEffect2D.animation.scaleX = 0.5;
      enemyEffect2D.animation.scaleY = 0.5;
    }
  }

  update(args: IOFRenderArgs): void {
    if (this._iCreationMissile) {
      this._iCreationMissile.update(args);
    }
    
    this._sprite.x += this._direction.x * this._speed * args.dt;
    this._sprite.y += this._direction.y * this._speed * args.dt;
    this._sprite.update(args);

    if (this._sprite.x < -this._sprite.width) {
      this._isWaitingForDelete = true;
    }
  }

  destroy(): void {
    this._direction = null;

    super.destroy();
  }
}
