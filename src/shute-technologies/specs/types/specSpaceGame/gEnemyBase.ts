import { GEnemyFactory } from "./gEnemyFactory";
import { OFSprite, OFFramework, OFFrameworkFactory, IOFRenderArgs } from "@framework";

export abstract class GEnemyBase {

  protected _isWaitingForDelete: boolean;
  protected _sprite: OFSprite;
  protected readonly _framework: OFFramework;

  get sprite(): OFSprite { return this._sprite; }
  get isWaitingForDelete(): boolean { return this._isWaitingForDelete; }

  constructor(protected readonly _enemyFactory: GEnemyFactory) {
    this._isWaitingForDelete = false;
    this._framework = OFFrameworkFactory.currentFramewok;
  }

  abstract onHit(damage: number);
  abstract update(args: IOFRenderArgs);

  destroy(): void {
    this._sprite.destroy();
    this._sprite = null;
  }
}
