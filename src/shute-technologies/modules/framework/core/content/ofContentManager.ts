import { OFFramework } from '../../ofFramework';
import { OFBaseContent } from './ofBaseContent';
import { OFImageContent } from './ofImageContent';
import { OFSoundContent, OFSCExternalSource } from './ofSoundContent';
import { OFMaterialContent } from './ofMaterialContent';
import { OFConsole } from '../../helpers/ofConsole';
import { OFTranslations } from '../../settings/ofTranslations';

export class OFContentManager {

  private _contentRepository: OFBaseContent[];

  constructor(readonly framework: OFFramework) {
    this._contentRepository = [];
  }

  initialize(): void { /* NOTHING */ }

  loadDefault(): void {
    // Load material related to the Shaders
    // this.loadMaterialFromJSON(DefaultMaterialSources.DefaultMaterial_Primitive);
    // this.loadMaterialFromJSON(DefaultMaterialSources.DefaultMaterial_Sprite);
  }

  changePropertiesInContent (path: string, otherParams) {
    const imageContent = this.getContent(path);

    if (imageContent) {
      imageContent.changeProperties(otherParams);
    } else {
      OFConsole.warn(OFTranslations.Framework.ContentManagement.changePropertiesInContentNotFound,
        this.framework.frameworkIdentifier.toString(), path);
    }
  }

  getContent<T extends OFBaseContent>(path: string): T {
    let resultObject: T;
    const contentCount = this._contentRepository.length;

    for (let i = 0; i < contentCount; i++) {
      const content = this._contentRepository[i];

      if (content && content.path === path) {
        resultObject = content as T;
        break;
      }
    }

    return resultObject;
  }

  loadMaterialFromJSON (json: string, path: string): OFMaterialContent {
    // const imageContent = this.getContent(path);
      // console.log("NContentManagment::LoadImageFromJSONObject> still needs work.", json);
      // if (imageContent == undefined) {
        const materialContent = new OFMaterialContent(this);
        materialContent.initialize();
        materialContent.loadFromJSON(json, path);

        this._contentRepository.push(materialContent);

        OFConsole.log(OFTranslations.Framework.ContentManagement.loadMaterialFromJSON,
          this.framework.frameworkIdentifier.toString(), path);

        // console.log("NContentManagment(Frk-id:" + CurrentFramework + ")::LoadImageFromJSONObject> " + path);
    // }

    return materialContent;
  }

  loadMaterial (path: string): OFMaterialContent {
    const materialContent = new OFMaterialContent(this);
    materialContent.initialize();
    materialContent.load(path);

    this._contentRepository.push(materialContent);

    OFConsole.log(OFTranslations.Framework.ContentManagement.loadMaterial,
      this.framework.frameworkIdentifier.toString(), path);

    return materialContent;
  }

  loadImage (path: string): OFImageContent {
    const imageContent = new OFImageContent(this);
    imageContent.initialize();
    imageContent.load(path);

    this._contentRepository.push(imageContent);

    OFConsole.log(OFTranslations.Framework.ContentManagement.loadImage,
      this.framework.frameworkIdentifier.toString(), path);

    return imageContent;
  }

  async asyncLoadSoundFromArrayBuffer<T extends OFSCExternalSource> (arrayBuffer: ArrayBuffer, path: string, params: T): Promise<OFSoundContent> {
    const soundContent = new OFSoundContent(this);
    soundContent.initialize();
    await soundContent.loadFromArrayBuffer<T>(arrayBuffer, path, params);

    this._contentRepository.push(soundContent);

    OFConsole.log(OFTranslations.Framework.ContentManagement.loadSoundFromArrayABuffer,
      this.framework.frameworkIdentifier.toString(), path);

    return soundContent;
  }

  loadImageFromHTMLImage (image: HTMLImageElement, path: string, params: {}): OFImageContent {
    let imageContent = this.getContent<OFImageContent>(path);

    if (!imageContent) {
      imageContent = new OFImageContent(this);
      imageContent.initialize();
      imageContent.loadFromImageHTML(image, path, params);

      this._contentRepository.push(imageContent);

      OFConsole.log(OFTranslations.Framework.ContentManagement.loadImageFromHTMLImage,
        this.framework.frameworkIdentifier.toString(), path);
    }

    return imageContent;
  }

  unloadImage (path: string) {
    OFConsole.error(OFTranslations.Framework.ContentManagement.notImplementedException,
      this.framework.frameworkIdentifier.toString(), path);
  }
}
