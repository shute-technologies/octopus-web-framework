
import { GBulletFactory } from "./gBulletFactory";
import { GPlayer } from "./gPlayer";
import { GEnemyFactory } from "./gEnemyFactory";
import { OFSpriteBatcher } from '../../../modules/framework/core/render/graphics/d2d/optimization/ofSpriteBatcher';
import { OFEffect2DManager } from '../../../modules/framework/helpers/render/effects/ofEffect2DManager';
import { OFEnumKeyCode } from "../../../modules/framework/enums/ofEnumKeyCode";
import { IOFRenderArgs } from "../../../modules/framework/interfaces/iofRenderArgs";

export class GraviusGame {

  private readonly _spriteBatch: OFSpriteBatcher;
  private readonly _player: GPlayer;
  private readonly _enemyFactory: GEnemyFactory;
  private readonly _bulletFactory: GBulletFactory;
  private readonly _effectManager: OFEffect2DManager;

  get player(): GPlayer { return this._player; }
  get enemyFactory(): GEnemyFactory { return this._enemyFactory; }
  get bulletFactory(): GBulletFactory { return this._bulletFactory; }
  get effectManager(): OFEffect2DManager { return this._effectManager; }
  get spriteBatch(): OFSpriteBatcher { return this._spriteBatch; }

  constructor() {
    this._spriteBatch = new OFSpriteBatcher('resources/spSpriteSheetGameElements.png');

    this._player = new GPlayer(this);
    this._enemyFactory = new GEnemyFactory(this);
    this._bulletFactory = new GBulletFactory(this);
    this._effectManager = new OFEffect2DManager();

    this._player.sprite.setSpriteBatch(this._spriteBatch);
    this._effectManager.setSpriteBatch(this._spriteBatch);
    this._enemyFactory.setSpriteBatch(this._spriteBatch);
    this._bulletFactory.setSpriteBatch(this._spriteBatch);
  }

  onMouseMove (x: number, y: number): void {
    this._player.onMouseMove(x, y);
  }

  onKeyDown (keyCode: OFEnumKeyCode): void {
    this._player.onKeyDown(keyCode);
  }

  update(args: IOFRenderArgs): void {
    this._spriteBatch.beginDraw();

    this._player.update(args);
    this._enemyFactory.update(args);
    this._bulletFactory.update(args);
    this._effectManager.update(args);

    this._spriteBatch.endDraw();
    this._spriteBatch.update(args);
  }
}
