import { OFGraphicDevice } from '../../device/ofGraphicDevice';
import { OFFramework } from '../../../ofFramework';
import { OFBaseShader } from './ofBaseShader';
import { OFShaderTexture } from './ofShaderTexture';
import { OFShaderPrimitive } from './ofShaderPrimitive';
import { OFShaderAbstract } from './ofShaderAbstract';
import { OFTranslations } from '../../../settings/ofTranslations';
import { OFConsole } from '../../../helpers/ofConsole';
import { OFGLHelper } from '../../../helpers/ofGLHelper';
import { OFDefaultShaderSources, IOFDefaultShaderSource } from '../../../default-assets/ofDefaultShaderSources';
import { Dictionary } from '../../../common/ofInterfaces';
import { OFIShaderCodeInfo } from '../../../../cross-cutting/shader-analizer/data/ofIShaderCodeInfo';
import { OFShaderAnalizer } from '../../../../cross-cutting/shader-analizer/ofShaderAnalizer';

interface OFDictionary<T> { [Key: string]: T; }

export class OFShaderFactory {

  private readonly _framework: OFFramework;
  private readonly _shaderRepository: Dictionary<OFBaseShader>;

  get framework(): OFFramework { return this._framework; }

  constructor(readonly graphicDevice: OFGraphicDevice) {
    this._framework = graphicDevice.framework;
    this._shaderRepository = {};
  }

  retrieveShader<T extends OFBaseShader> (name: string): T {
    let shaderResult: OFBaseShader;

    // Search as UID
    if (this._shaderRepository.hasOwnProperty(name)) {
      shaderResult = this._shaderRepository[name];
    } else {
      // Search all Shaders by the Name
      for (const shaderName of Object.keys(this._shaderRepository)) {
        if (this._shaderRepository[shaderName].name === name) {
          shaderResult = this._shaderRepository[shaderName];
          break;
        }
      }
    }

    return shaderResult as T;
  }

  loadDefault(): void {
    this.addShader('ShaderPrimitive', new OFShaderPrimitive(this, OFDefaultShaderSources.SourcesShaderPrimitive));
    this.addShader('ShaderTexture', new OFShaderTexture(this, OFDefaultShaderSources.SourcesShaderTexture));
  }

  loadAndAddShaderWithCodeInfo (shaderName: string, shaderObject: IOFDefaultShaderSource,
    shaderCodeInfo: OFIShaderCodeInfo = null, uid: string): OFShaderAbstract {

    if (!shaderCodeInfo) {
      shaderCodeInfo = OFShaderAnalizer.analize(shaderObject.vertex);
      shaderCodeInfo = OFShaderAnalizer.analize(shaderObject.fragment, shaderCodeInfo);
    }

    this._shaderRepository[uid] = new OFShaderAbstract(this, shaderObject, shaderCodeInfo);
    this._shaderRepository[uid].name = shaderName;

    OFConsole.log(OFTranslations.Framework.ShaderFactory.loadAndAddShaderWithCodeInfo,
      this._framework.frameworkIdentifier.toString(), shaderName);

    return this._shaderRepository[uid] as OFShaderAbstract;
  }

  addShader (shaderName: string, shader: OFBaseShader): void {
    this._shaderRepository[shaderName] = shader;
    this._shaderRepository[shaderName].name = shaderName;

    OFConsole.log(OFTranslations.Framework.ShaderFactory.addShader,
      this._framework.frameworkIdentifier.toString(), shaderName);
  }

  instanceShader (sourceTarget: IOFDefaultShaderSource): WebGLProgram {
    const _GL = this.graphicDevice.graphicContext;
    const sanitizedVertexSource = OFShaderAnalizer.sanitize(sourceTarget.vertex);
    const sanitizedFragmentSource = OFShaderAnalizer.sanitize(sourceTarget.fragment);

    const vertex = OFGLHelper.compileShader(_GL, sanitizedVertexSource, _GL.VERTEX_SHADER);
    const fragment = OFGLHelper.compileShader(_GL, sanitizedFragmentSource, _GL.FRAGMENT_SHADER);

    return OFGLHelper.createProgram(_GL, vertex, fragment);
  }
}
