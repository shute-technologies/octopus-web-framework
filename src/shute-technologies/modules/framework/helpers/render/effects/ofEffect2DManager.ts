import { OFEffect2D } from "./ofEffect2D";
import { OFEffect2DFactory } from "./ofEffect2DFactory";
import { OFSpriteBatcher } from "../../../core/render/graphics/d2d/optimization/ofSpriteBatcher";
import { IOFRenderArgs } from "../../../interfaces/iofRenderArgs";

export class OFEffect2DManager {

  private _effects: OFEffect2D[];
  private _spriteBatcher: OFSpriteBatcher;

  constructor () {
    this._effects = [];
  }

  createEffect(imagePath: string, x: number, y: number, horizontalTiles: number, 
    verticalTiles: number, spriteBatcher?: OFSpriteBatcher): OFEffect2D {

    const effect = OFEffect2DFactory.createEffect(imagePath, x, y, horizontalTiles, verticalTiles, 
      spriteBatcher ? spriteBatcher : this._spriteBatcher);

    this._effects.push(effect);

    return effect;
  }

  setSpriteBatch(spriteBatch: OFSpriteBatcher): void {
    this._spriteBatcher = spriteBatch;
  }

  update (args: IOFRenderArgs): void {
    for (let i = 0; i < this._effects.length; i++) {
      const effect = this._effects[i];

      if (effect) {
        if (!effect.isWaitingForDelete) {
          effect.update(args);
        }
        else {
          effect.destroy();

          this._effects.splice(i, 1);
          i--;
        }
      }
    }
  }
}
