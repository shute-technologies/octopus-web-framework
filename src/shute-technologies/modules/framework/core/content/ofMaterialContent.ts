import { OFBaseContent } from './ofBaseContent';
import { OFContentManager } from './ofContentManager';
import { OFTranslations } from '../../settings/ofTranslations';
import { OFConsole } from '../../helpers/ofConsole';

export class OFMaterialContent extends OFBaseContent {

  private _materialName: string;
  private _materialTechVersion: string;
  private _shaderName: string;

  private _uniforms = [];

  constructor(contentManager: OFContentManager) {
    super(contentManager);
  }

  initialize(): void {
    super.initialize();
  }

  load (path: string): void {
    super.load(path);
  }

  loadFromJSON (json: string, path: string) {
    if (path) { this.load(path); }

    const jsonObj = JSON.parse(json);

    this._materialName = jsonObj.materialName;
    this._materialTechVersion = jsonObj.materialTechVersion;
    this._shaderName = jsonObj.shaderName;

    for (const prop of jsonObj.publicProperties) {
      const unifomName = prop.shaderUniform;
      const unifomType = prop.type;

      this._uniforms.push({ name: unifomName, dataType: unifomType });
    }
  }

  changeProperties (params: {}) {
    OFConsole.error(OFTranslations.Framework.ContentManagement.MaterialContent.notImplementedException,
      this.framework.frameworkIdentifier.toString(), params.toString());
  }
}
