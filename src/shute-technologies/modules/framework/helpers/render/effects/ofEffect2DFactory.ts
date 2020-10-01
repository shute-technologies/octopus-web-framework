import { OFEffect2D } from "./ofEffect2D";
import { OFSpriteBatcher } from "../../../core/render/graphics/d2d/optimization/ofSpriteBatcher";

export class OFEffect2DFactory {

  static createEffect(imagePath: string, x: number, y: number, horizontalTiles: number, 
    verticalTiles: number, spriteBatcher?: OFSpriteBatcher): OFEffect2D {
    
    const effect = new OFEffect2D(imagePath, x, y, horizontalTiles, verticalTiles);
    effect.animation.setSpriteBatch(spriteBatcher);

    return effect;
  }
}
