import { GraviusGame } from "./graviusGame";
import { EnumProyectileType } from "./enums/enumProyectileType"
import { OFSprite, OFFrameworkFactory, OFImageContent, OFDrawable2D, OFEnumKeyCode, OFVector2, IOFRenderArgs } from "@framework";
import { GPlayerBullet } from './gPlayerBullet';

export class GPlayer {

  private _sprite: OFSprite;

  get x(): number { return this._sprite.x; }
  get y(): number { return this._sprite.y; }
  get sprite(): OFSprite { return this._sprite; }

  constructor(private readonly _game: GraviusGame) {

    const imageContent = OFFrameworkFactory.currentFramewok.contentManager
      .getContent<OFImageContent>('resources/spSpriteSheetGameElements.png');

    this._sprite = new OFSprite();
    this._sprite.imageContent = imageContent;
    this._sprite.rotation = -Math.PI / 2.0;
    this._sprite.scaleX = this._sprite.scaleY = 0.3;
    this._sprite.setAdvanceAnimationTileConfig(1024, 205, 75, 128);

    // create collision
    const offsetCollWidth = -8;
    const offsetCollHeight = -14;
    const collWidth = (this._sprite.width * this._sprite.scaleX) + offsetCollWidth;
    const collHeight = (this._sprite.height * this._sprite.scaleY) + offsetCollHeight;

    this._sprite.createCollision(0, 0, collHeight, collWidth, 
      -collHeight / 2, -collWidth / 2);
  }

  hitTest(other: OFDrawable2D): boolean {
    return this._sprite.hitTest(other);
  }

  onHit (damage: number): void {

  }

  onMouseMove (x: number, y: number): void {
    this._sprite.x = x;
    this._sprite.y = y;
  }

  onKeyDown (keyCode: OFEnumKeyCode): void {
    switch (keyCode) {
      case OFEnumKeyCode.Space:
        const speed = 300;     
        const bullets = 10;
        const shootAngle = Math.PI * 0.25;
        const angleOffset = shootAngle * 0.5;
        const shootAnglePart = shootAngle / bullets;

        for (let i = 0; i < bullets; i++) {
          const index = -(bullets / 2) + i;
          const direction = new OFVector2(1, 0);
          const directionAngle = (shootAnglePart * i) - angleOffset;
          direction.x = Math.cos(directionAngle);
          direction.y = Math.sin(directionAngle);

          const bullet = this._game.bulletFactory.createBullet(EnumProyectileType.Player,
            this._sprite.x, this._sprite.y + (index * 2), direction, speed) as GPlayerBullet;
          bullet.sprite.rotation = directionAngle;
        }
        break;
    }
  }

  update (args: IOFRenderArgs): void {
    this._sprite.update(args);
  }
}
