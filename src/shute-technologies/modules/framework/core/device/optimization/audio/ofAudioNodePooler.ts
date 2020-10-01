import { OFAudioDeviceOptimizationManager } from "./ofAudioDeviceOptimizationManager";
import { OFAudioNodeObject } from "./ofAudioNodeObject";
import { OFEnumAudioNodeType } from "./ofEnumAudioNodeType";
import { IOFRenderArgs } from "../../../../interfaces/iofRenderArgs";

export class OFAudioNodePooler {

  static readonly OFEnumsInternal = {
    initialAudioNodeCount: 16,
    resizeAddAudioNodeCount: 8
  };

  private _idObjectCounter: number;
  private _audioNodeRepository: OFAudioNodeObject<AudioNode>[];

  constructor(readonly audioDeviceOptManagment: OFAudioDeviceOptimizationManager) {
    this._idObjectCounter = 0;
    this._audioNodeRepository = [];
  }

  initialize(): void {
    this.createAudioNodes(OFAudioNodePooler.OFEnumsInternal.initialAudioNodeCount);
  }

  createAudioNodes(count: number): void {
    for (let i = 0; i < count; i++) {
      const audioNodeObject = new OFAudioNodeObject(this);
      audioNodeObject.initialize(this._idObjectCounter++);
          
      this._audioNodeRepository.push(audioNodeObject);
    }
  }

  getAvailableAudioNode<T extends AudioNode> (desiredNodeType: OFEnumAudioNodeType): OFAudioNodeObject<T> {
    let resultObject = undefined;
    const count = this._audioNodeRepository.length;

    for (let i = 0; i < count; i++) {
      const audioNodeObject = this._audioNodeRepository[i];

      if (audioNodeObject.isAvailable) {
        const audioNodeType = audioNodeObject.bufferType;
        
        if (audioNodeType === OFEnumAudioNodeType.Unsigned || !audioNodeType) {
          resultObject = audioNodeObject;
        }
        else if (audioNodeType === desiredNodeType) {
          resultObject = audioNodeObject;
        }
        
        if (resultObject) {
          break;
        }
      }
    }

    // If no AudioNode available is found then create more...
    if (!resultObject) {
      this.createAudioNodes(OFAudioNodePooler.OFEnumsInternal.resizeAddAudioNodeCount);
      // Now call recursively the function until found an available AudioNode
      resultObject = this.getAvailableAudioNode(desiredNodeType);
    }
    
    return resultObject;
  }

  update (args: IOFRenderArgs) {
    let count = this._audioNodeRepository.length;

    for (let i = 0; i < count; i++) {
      const audioNodeObject = this._audioNodeRepository[i];

      if (audioNodeObject.isWaitingForDelete) {
        audioNodeObject.destroy();
        // remove it from the array
        this._audioNodeRepository.splice(i, 1);
        i--;
        count--;
      }
      else {
        audioNodeObject.update(args);
      }
    }
  }

  destroy (): void {

  }
}
