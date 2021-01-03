export class OFTranslations {

  static Framework = class {
    static readonly initialized = 'OF(id:{0})> Initializing Octopus framework.';
    static readonly ready = 'OF(id:{0})> Octopus framework Ready.';
    static readonly canvasNotFound = 'OF(id:{0})::constructor> Canvas element not found in: {1}, framework not initialized.';

    static FrameworkFactory = class {
      static readonly outOfBounds = `FrameworkFactory::setCurrentFramework index: {0} out of bounds.`;
    };

    static GraphicsOptimization = class {
      static PolygonBatcher = class {
        static readonly changeShader = 'OFPolygonBatcher::changeShader> New shader: {0} applied.';
        static readonly setShader = 'OFPolygonBatcher::setShader> New shader: {0} applied.';
      };
    };

    static AudioDevice = class {
      static readonly initialize = 'OF(id:{0}):OFAudioDevice::Initialize> Initialized.';
      static readonly notSupported = 'OF(id:{0}):OFAudioDevice::Initialize> Web Audio API is not supported in this browser.';
    };

    static ContentManagement = class {
      static readonly changePropertiesInContentNotFound = 'OF(id:{0})::ContentManagement::changePropertiesImageContent> Content not found in: {1}';
      static readonly loadMaterial = 'OF(id:{0}):ContentManager::loadMaterial> {1}';
      static readonly loadImage = 'OF(id:{0}):ContentManager::loadImage> {1}';
      static readonly loadMaterialFromJSON = 'OF(id:{0}):ContentManager::loadMaterialFromJSON> {1}';
      static readonly loadSoundFromArrayABuffer = 'OF(id:{0}):ContentManager::asyncLoadSoundFromArrayBuffer> {1}';
      static readonly loadImageFromHTMLImage = 'OF(id:{0}):ContentManager::loadImageFromHTMLImage> {1}';
      static readonly notImplementedException = 'OF(id:{0}):ContentManager> Not implemented exception: {1}';
      
      static MaterialContent = class {
        static readonly notImplementedException = 'OF(id:{0}):MaterialContent> Not implemented exception';
      };

      static SoundContent = class {
        static readonly internal_OnErrorDecodeAudioData = 'OF(id:{0}):SoundContent::internal_OnErrorDecodeAudioData> {1}';
      };
    };

    static SceneManager = class {
      static readonly gotoScene = 'OF(id:{0}):OFSceneManager::gotoScene> Created Scene: {1} and Initialized.';
      static readonly sceneDontExists = `OF(id:{0}):OFSceneManager::gotoScene> The: {1} doesn't exists.`;
    };

    static Canvas = class {
      static readonly html5Warning = `Your browser don't support HTML5 Canvas Element.`;
    };

    static GLHelper = class {
      static readonly compileShader = `GL::CompileShader> An error occurred compiling the shaders: {0}`;
      static readonly createProgram = `GL::CreateProgram> Unable to initialize the shader program:  {0}`;
    };

    static CanvasContextManager = class {
      static readonly issueRenderingContext = `Can't start the WebGL Rendering Context: {0}`;
    };

    static GraphicDeviceManager = class {
      static readonly createGraphicDevice = `OF(id:{0}):GraphicDeviceManager::createGraphicDevice> The graphic device: '{1}' was created.`;
    };

    static ShaderFactory = class {
      static readonly addShader = `OF(id:{0}):ShaderFactory::addShader> Loaded shader: {1}`;
      static readonly loadAndAddShaderWithCodeInfo = `OF(id:{0}):ShaderFactory::LoadAndAddShaderWithCodeInfo> Loaded shader: {1}`;
    };
  };  
}
