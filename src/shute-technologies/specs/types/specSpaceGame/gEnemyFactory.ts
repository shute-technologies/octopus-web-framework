import { GraviusGame } from "./graviusGame";
import { GEnemyBase } from "./gEnemyBase";
import { EnumEnemyType } from "./enums/enumEnemyType";
import { GDummyEnemy } from "./gDummyEnemy";
import { OFSpriteBatcher, OFFramework, OFInterval, OFFrameworkFactory, OFMath, IOFRenderArgs } from "@framework";

export class GEnemyFactory {

  private _spriteBatcher: OFSpriteBatcher;

  private readonly _enemies: GEnemyBase[];
  private readonly _framework: OFFramework;
  private readonly _icreationEnemy: OFInterval;

  get enemies(): GEnemyBase[] { return this._enemies; }

  constructor(public readonly game: GraviusGame) {
    this._enemies = [];
    this._framework = OFFrameworkFactory.currentFramewok;

    this._icreationEnemy = new OFInterval(0.001, 100000000);
    this._icreationEnemy.finishedLoopCallback = () => {
      this.onFinishedLoop_CreationEnemy()
    };
  }

  onFinishedLoop_CreationEnemy  () {
    const x = this._framework.appWidth + 40;
    const y = OFMath.random(0, this._framework.appHeight);

    this.createEnemy(EnumEnemyType.Dummy, x, y);
  }

  setSpriteBatch (spriteBatch: OFSpriteBatcher): void {
    this._spriteBatcher = spriteBatch;
  }

  createEnemy(type: EnumEnemyType, x: number, y: number) : void {
    let enemy: GEnemyBase = null;
        
    switch (type) {
      case EnumEnemyType.Dummy:
        enemy = new GDummyEnemy(x, y, this);
        enemy.sprite.setSpriteBatch(this._spriteBatcher);
        break;
    }

    if (enemy) {
      this._enemies.push(enemy);
    }
  }

  update (args: IOFRenderArgs): void {
    if (this._icreationEnemy) {
      this._icreationEnemy.update(args);
    }

    for (let i = 0; i < this._enemies.length; i++) {
      const enemy = this._enemies[i];

      if (enemy) {
        if (!enemy.isWaitingForDelete) {
          enemy.update(args);
        }
        else {
          enemy.destroy();

          this._enemies.splice(i, 1);
          i--;
        }
      }
    }
  }
}
