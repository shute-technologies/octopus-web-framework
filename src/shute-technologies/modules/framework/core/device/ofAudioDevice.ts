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
  private _masterGainNode: GainNode;

  private _isAudioSupported: boolean;
  private _audioDeviceOptimizationManager: OFAudioDeviceOptimizationManager;
  private _audioNodePooler: OFAudioNodePooler;

  get initialTime(): number {
    return this._initialTime;
  }
  get masterVolume(): number {
    return this._masterVolume;
  }
  /** Gain applied to everything connectNodes() routes to the speakers. Defaults to 0.1. */
  set masterVolume(value: number) {
    this._masterVolume = value;

    if (this._masterGainNode) {
      this._masterGainNode.gain.value = value;
    }
  }
  /** The single master gain every connectNodes() chain ends in; connected to the destination once. */
  get masterGainNode(): GainNode {
    return this._masterGainNode;
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

      // One master gain for the whole device. connectNodes() used to request a new pooled gain
      // node per call and never release it, so every sound played leaked a node.
      this._masterGainNode = this._audioContext.createGain();
      this._masterGainNode.gain.value = this._masterVolume;
      this._masterGainNode.connect(this._audioContext.destination);

      // Create device optimization managment
      this._audioDeviceOptimizationManager = new OFAudioDeviceOptimizationManager(this);
      this._audioNodePooler = this._audioDeviceOptimizationManager.audioNodePooler;

      this._isAudioSupported = true;

      OFConsole.log(this, OFTranslations.Framework.AudioDevice.initialize, this._framework.frameworkIdentifier.toString());
    } catch (e) {
      this._isAudioSupported = false;
      OFConsole.error(this, OFTranslations.Framework.AudioDevice.notSupported, this._framework.frameworkIdentifier.toString());
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
      // Without createStereoPanner the node used to stay undefined and the first
      // `node.webAudioNode.pan` / connect threw.
      const stereoPannerNode = this._audioContext.createStereoPanner
        ? this._audioContext.createStereoPanner()
        : OFAudioDevice.createStereoPannerFallback(this._audioContext);

      audioNodeObj.setWebAudioNode(stereoPannerNode, OFEnumAudioNodeType.StereoPannerNode);
    }

    return audioNodeObj as OFAudioNodeObject<StereoPannerNode>;
  }

  /** Returns a node to the pool. It is disconnected first (OFAudioNodeObject.deactivate). */
  releaseNode(node: OFAudioNodeObject<AudioNode>): void {
    if (node) {
      node.deactivate();
    }
  }

  /** Ages idle pooled nodes out. OFFramework.update calls it every frame. */
  update(args: IOFRenderArgs): void {
    if (this._audioDeviceOptimizationManager) {
      this._audioDeviceOptimizationManager.update(args);
    }
  }

  /** source -> args[0] -> ... -> args[n - 1] -> master gain -> destination. */
  static connectNodes(audioDevice: OFAudioDevice, source: AudioNode, ...args: Array<OFAudioNodeObject<AudioNode>>): void {
    // The guards used to be `> 1` (source -> first node) and `> 2` (last node -> master), so a chain
    // of one or two nodes - the usual gain + panner - never reached the speakers.
    const lastNode = OFAudioDevice.connectChain(source, args);
    lastNode.connect(audioDevice.masterGainNode || audioDevice.audioContext.destination);
  }

  /** source -> args[0] -> ... -> args[n - 1] -> destination, bypassing the master gain. */
  static connectNodesNoMaster(audioDevice: OFAudioDevice, source: AudioNode, ...args: Array<OFAudioNodeObject<AudioNode>>): void {
    const lastNode = OFAudioDevice.connectChain(source, args);
    lastNode.connect(audioDevice.audioContext.destination);
  }

  /**
   * Stand-in for StereoPannerNode where createStereoPanner is missing (Safari before 14.1): an
   * equal-power PannerNode, with a `pan` whose `value` moves the source the way a stereo panner
   * would. Callers can keep writing `node.pan.value = x`.
   */
  static createStereoPannerFallback(audioContext: AudioContext): StereoPannerNode {
    const panner = audioContext.createPanner();
    let pan = 0;
    const applyPan = () => panner.setPosition(pan, 0, 1 - Math.abs(pan));

    panner.panningModel = 'equalpower';
    applyPan();

    Object.defineProperty(panner, 'pan', {
      value: {
        defaultValue: 0,
        minValue: -1,
        maxValue: 1,
        get value(): number { return pan; },
        set value(val: number) {
          pan = Math.max(-1, Math.min(1, Number(val) || 0));
          applyPan();
        }
      }
    });

    return panner as unknown as StereoPannerNode;
  }

  /** Connects source through every node in order and returns the last AudioNode of the chain. */
  private static connectChain(source: AudioNode, nodes: Array<OFAudioNodeObject<AudioNode>>): AudioNode {
    let previous = source;

    for (const node of nodes) {
      previous.connect(node.webAudioNode);
      previous = node.webAudioNode;
    }

    return previous;
  }
}
