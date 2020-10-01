import { GraviusGame } from "./graviusGame";
import { GBaseBullet } from "./gBaseBullet";
import { EnumProyectileType } from "./enums/enumProyectileType";
import { GPlayerBullet } from "./gPlayerBullet";
import { GEnemyHomingMissile } from "./eEnemyHomingMissile";
import { OFSpriteBatcher, OFVector2, IOFRenderArgs } from "@framework";

export class GBulletFactory {

  private _bullets: GBaseBullet[];
  private _spriteBatch: OFSpriteBatcher;

  constructor(public readonly game: GraviusGame) {
    this._bullets = [];
  } 

  createBullet(type: EnumProyectileType, x: number, y: number, direction: OFVector2, speed: number): GBaseBullet {
    let bullet: GBaseBullet = null;

    switch(type) {
      case EnumProyectileType.Player:
        bullet = new GPlayerBullet(x, y, direction, speed, this);
        (bullet as GPlayerBullet).sprite.setSpriteBatch(this._spriteBatch);
        break;
    }

    if (bullet) {
      this._bullets.push(bullet);
    }

    return bullet;
  }

  createMissile (type: EnumProyectileType, x: number, y: number, turnFactor: number, speed: number): GBaseBullet {
    let bullet: GBaseBullet = null;

    switch(type) {
      case EnumProyectileType.MissileEnemy:
        bullet = new GEnemyHomingMissile(x, y, turnFactor, speed, this.game.player, this);
        (bullet as GEnemyHomingMissile).animation.setSpriteBatch(this._spriteBatch);
        break;
    }

    if (bullet) {
      this._bullets.push(bullet);
    }

    return bullet;
  }

  setSpriteBatch(spriteBatch: OFSpriteBatcher): void {
    this._spriteBatch = spriteBatch;
  }

  update(args: IOFRenderArgs): void {
    for (let i = 0; i < this._bullets.length; i++) {
      const bullet = this._bullets[i];

      if (!bullet.isWaitingForDelete) {
        bullet.update(args);
      }
      else {
        bullet.destroy();
        this._bullets.splice(i, 1);
        i--;
      }
    }
  }
}
