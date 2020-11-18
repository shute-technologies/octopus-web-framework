import { GraviusGame } from "../graviusGame";
import { OFBitmapFontLoader } from '../../../../modules/cross-cutting/font-loader/ofBitmapFontLoader';
import { OFCBitmapTextfield2D } from '../../../../modules/framework/components/ofCBitmapTextfield2D';
import { OFSceneManager } from "../../../../modules/framework/scene/ofSceneManager";
import { IOFRenderArgs } from "../../../../modules/framework/interfaces/iofRenderArgs";
import { OFBaseScene } from "../../../../modules/framework/scene/ofBaseScene";
import { OFImageContent } from '../../../../modules/framework/core/content/ofImageContent';
import { OFBitmapFontCharset } from '../../../../modules/cross-cutting/font-loader/data/ofBitmapFontCharset';
import { OFDefaultShaderSources } from "../../../../modules/framework/default-assets/ofDefaultShaderSources";
import { OFColor } from "../../../../modules/framework/core/render/graphics/ofColor";
import { mat4, vec3 } from 'gl-matrix';

export class SpaceGameScene extends OFBaseScene {

  private _graviusGame: GraviusGame;
  private _textfield: OFCBitmapTextfield2D;
  private _imageContentFont: OFImageContent;
  private _fontCharset: OFBitmapFontCharset;

  constructor() {
    super();
  }

  initialize(sceneManager: OFSceneManager, params): void {
    super.initialize(sceneManager, params);

    // Load resources for this scene
    this.framework.contentManager.loadImage('resources/spSpriteSheetGameElements.png');
    this._imageContentFont = this.framework.contentManager.loadImage('resources/fnt-arial_0.png');

    this.framework.mainGraphicDevice.shaderFactory.loadAndAddShaderWithCodeInfo('SpineShaderTexture', 
      OFDefaultShaderSources.SourcesSpineShaderTexture, null, 'SpineShaderTexture');

    $('#input').on('change', (e) => {
      const rawFile = e.target['files'][0];

      const reader = new FileReader();
      reader.readAsText(rawFile);
      reader.onload = (event) => this._fontCharset = OFBitmapFontLoader.parse(event.target.result as string);
    });

    this._graviusGame = new GraviusGame();
  }

  onMouseMove(x: number, y:number): void {
    if (this._graviusGame) { this._graviusGame.onMouseMove(x, y); }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this._graviusGame) { this._graviusGame.onKeyDown(event.keyCode); }
  }

  update(args: IOFRenderArgs): void {
    if (this._graviusGame) { this._graviusGame.update(args); }

    if (this._fontCharset && this._imageContentFont?.isLoaded && !this._textfield) {
      this._textfield = new OFCBitmapTextfield2D();
      this._textfield.initialize('', this._fontCharset, this._imageContentFont);
      this._textfield.color = OFColor.white();
    }

    const transformText = mat4.create();
    mat4.fromScaling(transformText, vec3.fromValues(0.25, 0.25, 0.25));

    const fps = 1 / args.dt;
    this._textfield?.setText(`FPS: ${fps.toString().substring(0, 5)}, # of Quads: ${this._graviusGame.spriteBatch.totalQuads}`);
    this._textfield?.setLetterColor(1, OFColor.red());
    this._textfield?.draw(args, transformText);
  }

  destroy(): void {
    
  }
}