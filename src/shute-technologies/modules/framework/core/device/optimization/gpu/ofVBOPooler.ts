import { OFDeviceOptimizationManager } from "./ofDeviceOptimizationManager";
import { IOFRenderArgs } from "../../../../interfaces/iofRenderArgs";
import { OFVBOObject } from "./ofVBOObject"
import { OFEnumVBOObjectType } from "./ofEnumVBOObjectType";
import { OFFramework } from "../../../../ofFramework";
import { OFInterval } from "../../../../helpers/ofInterval";

export class OFVBOPooler {

  static readonly OFEnumsInternal = {
    initialVBOCount: 16,
    resizeAddVBOCount: 8
  };

  private _idObjectCounter: number;
  private _vboRepository: OFVBOObject[];
  private _framework: OFFramework;

  get graphicDeviceOptManager (): OFDeviceOptimizationManager { return this._deviceOptimizationManager; }    

  constructor(private readonly _deviceOptimizationManager: OFDeviceOptimizationManager) {
    this._framework = _deviceOptimizationManager.graphicDevice.framework;
    this._idObjectCounter = 0;
    this._vboRepository = [];
  }

  initialize(): void {
    this.createVBOs(OFVBOPooler.OFEnumsInternal.initialVBOCount);
  }

  createVBOs (count: number): void {
    for (let i = 0; i < count; i++) {
      const vboObject = new OFVBOObject(this);
      vboObject.initialize(this._idObjectCounter++);
          
      this._vboRepository.push(vboObject);
    }
  }

  getAvailableVBO (desiredBufferType: OFEnumVBOObjectType): OFVBOObject {
    let resultObject: OFVBOObject;
    const count = this._vboRepository.length;

    for (let i = 0; i < count; i++) {
      const vboObject = this._vboRepository[i];

      if (vboObject.isAvailable) {
        const vboType = vboObject.bufferType;
        
        if (vboType === OFEnumVBOObjectType.Unsigned || !vboType) {
          resultObject = vboObject;
        }
        else {
          if (vboType === OFEnumVBOObjectType.VertexBuffer && 
            desiredBufferType === OFEnumVBOObjectType.VertexBuffer) {
            
            resultObject = vboObject;
          }
          else if (vboType === OFEnumVBOObjectType.IndexBuffer && 
            desiredBufferType === OFEnumVBOObjectType.IndexBuffer) {
            
            resultObject = vboObject;
          }
        }
        
        if (resultObject) break;
      }
    }
      
    // If no VBO available is found then create more...
    if (!resultObject) {
      this.createVBOs(OFVBOPooler.OFEnumsInternal.resizeAddVBOCount);
      // Now call recursively the function until found an available VBO
      resultObject = this.getAvailableVBO(desiredBufferType);
    }
   
    return resultObject;
  }

  update(args: IOFRenderArgs): void {
    if (this._framework.settings.enabledVBOInstancesLife) {
      for (let i = 0; i < this._vboRepository.length; i++) {
        const vboObject = this._vboRepository[i];

        if (vboObject.isWaitingForDelete) {
          vboObject.destroy();
          // remove it from the array
          this._vboRepository.splice(i, 1);
          i--;
        }
        else {
          vboObject.update(args);
        }
      }
    }
  }

  destroy(): void {

  }
}
