import { GBulletFactory } from "./gBulletFactory";
import { GEnemyFactory } from "./gEnemyFactory";
import { OFFramework, OFFrameworkFactory, IOFRenderArgs } from "@framework";

export abstract class GBaseBullet {

  protected _isWaitingForDelete: boolean;
  protected _x: number;
  protected _y: number;
  protected readonly _framework: OFFramework;
  protected readonly _enemyFactory: GEnemyFactory;

  get isWaitingForDelete(): boolean { return this._isWaitingForDelete; }

  constructor(x: number, y: number, protected readonly _bulletFactory: GBulletFactory) {
    this._x = x;
    this._y = y;
    this._isWaitingForDelete = false;
    this._framework = OFFrameworkFactory.currentFramewok;
    this._enemyFactory = this._bulletFactory.game.enemyFactory;
  }

  abstract update(args: IOFRenderArgs);
  abstract destroy(): void;
}
