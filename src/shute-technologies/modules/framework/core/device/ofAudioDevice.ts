import { OFFramework } from '../../ofFramework';
import { IOFRenderArgs } from '../../interfaces/iofRenderArgs';
import { OFAudioDeviceOptimizationManager } from './optimization/audio/ofAudioDeviceOptimizationManager';
import { OFAudioNodePooler } from './optimization/audio/ofAudioNodePooler';
import { OFConsole } from '../../helpers/ofConsole';
import { OFTranslations } from '../../settings/ofTranslations';
import { OFAudioNodeObject } from './optimization/audio/ofAudioNodeObject';
import { OFEnumAudioNodeType } from './optimization/audio/ofEnumAudioNodeType';

export class OFAudioDevice {
  private _audioContext: AudioContext;
  private _initialTime: number;
  private _masterVolume: number;

  private _isAudioSupported: boolean;
  private _audioDeviceOptimizationManager: OFAudioDeviceOptimizationManager;
  private _audioNodePooler: OFAudioNodePooler;

  get initialTime(): number {
    return this._initialTime;
  }
  get masterVolume(): number {
    return this._masterVolume;
  }
  get isAudioSupported(): boolean {
    return this._isAudioSupported;
  }
  get audioContext(): AudioContext {
    return this._audioContext;
  }
  get audioDeviceOptimizationManager(): OFAudioDeviceOptimizationManager {
    return this._audioDeviceOptimizationManager;
  }

  constructor(private readonly _framework: OFFramework) {
    this._isAudioSupported = false;
    this._masterVolume = 0.1;
  }

  initialize(): void {
    try {
      // Fix up for prefixing
      window.AudioContext = window.AudioContext || window['webAudioContext'] || window['webkitAudioContext'];
      this._audioContext = new AudioContext();
      this._initialTime = this._audioContext.currentTime;

      // Create device optimization managment
      this._audioDeviceOptimizationManager = new OFAudioDeviceOptimizationManager(this);
      this._audioNodePooler = this._audioDeviceOptimizationManager.audioNodePooler;

      this._isAudioSupported = true;

      OFConsole.log(OFTranslations.Framework.AudioDevice.initialize, this._framework.frameworkIdentifier.toString());
    } catch (e) {
      this._isAudioSupported = false;
      OFConsole.error(OFTranslations.Framework.AudioDevice.notSupported, this._framework.frameworkIdentifier.toString());
    }
  }

  requestGainNode(): OFAudioNodeObject<GainNode> {
    const audioNodeObj = this._audioNodePooler.getAvailableAudioNode(OFEnumAudioNodeType.GainNode);

    if (audioNodeObj.bufferType === OFEnumAudioNodeType.Unsigned) {
      const gainNode = this._audioContext.createGain();
      audioNodeObj.setWebAudioNode(gainNode, OFEnumAudioNodeType.GainNode);
    }

    return audioNodeObj as OFAudioNodeObject<GainNode>;
  }

  requestStereoPannerNode(): OFAudioNodeObject<StereoPannerNode> {
    const audioNodeObj = this._audioNodePooler.getAvailableAudioNode(OFEnumAudioNodeType.StereoPannerNode);

    if (audioNodeObj.bufferType === OFEnumAudioNodeType.Unsigned) {
      if (this._audioContext.createStereoPanner) {
        const stereoPannerNode = this._audioContext.createStereoPanner();
        audioNodeObj.setWebAudioNode(stereoPannerNode, OFEnumAudioNodeType.StereoPannerNode);
      }
    }

    return audioNodeObj as OFAudioNodeObject<StereoPannerNode>;
  }

  releaseNode(node: OFAudioNodeObject<AudioNode>): void {
    if (node) {
      node.webAudioNode.disconnect();
      node.deactivate();
    }
  }

  update(args: IOFRenderArgs): void {
    this._audioDeviceOptimizationManager.update(args);
  }

  static connectNodes(audioDevice: OFAudioDevice, source: AudioNode, ...args: Array<OFAudioNodeObject<AudioNode>>): void {
    const argCount = args.length;

    // Connect Source with the first Node.
    if (argCount > 1) {
      source.connect(args[0].webAudioNode);
    }

    // Connect the Nodes
    for (let i = 0; i + 1 < argCount; i++) {
      args[i].webAudioNode.connect(args[i + 1].webAudioNode);
    }

    // Connect last node with the AudioContext Destination
    if (argCount > 2) {
      const gainNode = audioDevice.requestGainNode();
      gainNode.activate();
      gainNode.webAudioNode.gain.value = audioDevice.masterVolume;

      args[argCount - 1].webAudioNode.connect(gainNode.webAudioNode);
      gainNode.webAudioNode.connect(audioDevice.audioContext.destination);
    }
  }

  static connectNodesNoMaster(audioDevice: OFAudioDevice, source: AudioNode, ...args: Array<OFAudioNodeObject<AudioNode>>): void {
    const argCount = args.length;

    // Connect Source with the first Node.
    if (argCount > 1) {
      source.connect(args[0].webAudioNode);
    }

    // Connect the Nodes
    for (let i = 0; i + 1 < argCount; i++) {
      args[i].webAudioNode.connect(args[i + 1].webAudioNode);
    }

    // Connect last node with the AudioContext Destination
    if (argCount > 1) {
      args[argCount - 1].webAudioNode.connect(audioDevice.audioContext.destination);
    }
  }
}
