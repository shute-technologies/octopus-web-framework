import { OFFramework, OFSprite, OFPrimitiveQuad, OFPrimitiveCircle, OFPrimitiveGrid, OFAnimation, OFFrameworkFactory, OFColor } from "@framework";


export class SpecTestFramework {

  private readonly _framework: OFFramework;
  
  private _sprite: OFSprite;
  private _quad: OFPrimitiveQuad;
  private _quad2: OFPrimitiveQuad;
  private _circle: OFPrimitiveCircle;
  private _grid: OFPrimitiveGrid;
  private _explosionAnimation: OFAnimation;
  private _explosion2Animation: OFAnimation;

  private _countTime: number;

  constructor() {
    this._countTime = 0;

    this._framework = OFFrameworkFactory.create();
    this._framework.startOctopusFramework2D("canvas-scene");
    const imageContent = this._framework.contentManager.loadImage('resources/spSpriteSheetGameElements.png');

    this._sprite = new OFSprite(0, 0);
    this._sprite.imageContent = imageContent;
    this._sprite.setAdvanceAnimationTileConfig(1024, 205, 75, 128);

    this._explosionAnimation = new OFAnimation(320, 200, 4, 4);
    this._explosionAnimation.imageContent = imageContent;
    this._explosionAnimation.setAdvanceAnimationTileConfig(1024, 0, 190, 190);
    this._explosionAnimation.scaleX = 0.5;
    this._explosionAnimation.scaleY = 0.5;

    this._explosion2Animation = new OFAnimation(500, 200, 8, 3);
    this._explosion2Animation.imageContent = imageContent;
    this._explosion2Animation.setAdvanceAnimationTileConfig(0, 0, 1024, 384);

    this._quad = new OFPrimitiveQuad(300, 20, 40, 40, OFColor.red());
    this._quad2 = new OFPrimitiveQuad(300, 200, 40, 40, OFColor.green());
    this._circle = new OFPrimitiveCircle(300, 200, 160, OFColor.blue());

    this._grid = new OFPrimitiveGrid(40, 40, OFColor.white());
    this._grid.changeGrid(14, 8, 32, 32);
  }

  update(dt: number): void {
    this._countTime += dt;

    this._framework.update({ dt });

    const val = Math.cos(this._countTime);

    if (this._grid) {
      this._grid.update({ dt } as any);
    }

    if (this._sprite) {
      this._sprite.x = val * 250;
      this._sprite.y = val * 250;
      this._sprite.rotation += 0.1;
      this._sprite.alpha = Math.abs(val);
      this._sprite.update({ dt } as any);
    }

    if (this._quad) {
      this._quad.rotation += 1;
      this._quad.x = 200 + val * 200;
      this._quad.update({ dt } as any);
    }

    if (this._circle) {
      this._circle.update({ dt } as any);
    }

    if (this._quad2) {
      this._quad2.scaleX = val;
      this._quad2.scaleY = val;
      this._quad2.y = 200 + val * 100;
      this._quad2.update({ dt } as any);
    }

    if (this._explosionAnimation) {
      this._explosionAnimation.update({ dt } as any);
    }

    if (this._explosion2Animation) {
      this._explosion2Animation.update({ dt } as any);
    }
  }
} 
