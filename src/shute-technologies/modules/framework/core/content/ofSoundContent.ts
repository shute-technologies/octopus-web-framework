import { OFBaseContent } from "./ofBaseContent";
import { OFContentManager } from "./ofContentManager";
import { OFConsole } from "../../helpers/ofConsole";
import { OFTranslations } from "../../settings/ofTranslations";

export interface OFSCExternalSource {
  setInternal_SoundContent(val: OFSoundContent);
}

export class OFSoundContent extends OFBaseContent {

  private _audioBuffer: AudioBuffer;
  private _audioBuffer_Error;
  private _params: OFSCExternalSource;

  get audioBuffer (): AudioBuffer { return this._audioBuffer; }
  get audioBuffer_Error () { return this._audioBuffer_Error; }

  constructor(contentManager: OFContentManager) {
    super(contentManager);
  }

  initialize(): void {
    super.initialize();
  }

  load (path: string): void {
    super.load(path);
  }

  loadFromArrayBuffer<T extends OFSCExternalSource> (audio_arrayBuffer, path: string, params: T) {
    if (path) { super.load(path); }
    
    this._params = params;
    
    const audioDevice = this.framework.audioDevice;
    const audioContext = audioDevice.audioContext;
    
    audioContext.decodeAudioData(audio_arrayBuffer, this.internal_OnDecodeAudioData,
      this.internal_OnErrorDecodeAudioData);
  }

  internal_OnDecodeAudioData (buffer: AudioBuffer) {
    this._isLoaded = true;
    this._audioBuffer = buffer;
    
    if (this._params) {
      // Now set the recently added sound content to the external resource
      this._params.setInternal_SoundContent(this);
    }
  }

  internal_OnErrorDecodeAudioData (error) {
    this._audioBuffer_Error = error;

    OFConsole.log(OFTranslations.Framework.ContentManagement.SoundContent.internal_OnErrorDecodeAudioData,
      this._framework.frameworkIdentifier.toString(), error);
  }
}
