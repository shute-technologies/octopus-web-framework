import { OFEnumShaderDataTypes } from "./ofEnumShaderDataTypes";
import { OFEnumShaderLiterals } from "./ofEnumShaderLiterals";
import { OFIShaderCodeInfo } from "./data/ofIShaderCodeInfo";
import { OFIShaderCodeInfoInput } from "./data/ofIShaderCodeInfoInput";
import { OFIShaderCodeInfoInputData } from "./data/ofIShaderCodeInfoInputData";
import { Dictionary } from '../../framework/common/ofInterfaces';

export class OFShaderAnalizer {

  private static readonly enumAttribute = 1;
  private static readonly enumUniform = 2;
 
  private static readonly attributeStringLenght = 9; // 9-letters compose "attribute"
  private static readonly uniformStringLenght = 7; // 7-letters compose "uniform"
  private static readonly indexLimit = 999999; // 7-letters compose "uniform"

  private constructor() {}

  static analize (shaderSource: string, outputObject?: OFIShaderCodeInfo): OFIShaderCodeInfo {
    const result = outputObject ? outputObject : {
        attributeCount: 0,        
        uniformCount: 0,
        attributes: [],        
        uniforms: []
    } as OFIShaderCodeInfo;
    
    let index = 0;
    const dictDTIndexAccum: Dictionary<number> = {};
    
    while(true) {
      // first get the input data info
      const inputDataInfo = OFShaderAnalizer.getInputDataInfo(shaderSource, index);
      // now find the input and add it
      const output = OFShaderAnalizer.getNextInputData(shaderSource, inputDataInfo);
      
      if (inputDataInfo.inputIndex !== OFShaderAnalizer.indexLimit) {
        if (output.inputName) {
          // set the current index
          index = output.lastIndex;

          // now remove that prop
          delete output.lastIndex;

          // add it to the array
          switch (inputDataInfo.inputType) {
            case OFShaderAnalizer.enumAttribute:
              result.attributeCount++;
              result.attributes.push(output);
              break;
            case OFShaderAnalizer.enumUniform:
              // Compute the index of a declarative type
              if (!dictDTIndexAccum.hasOwnProperty("pp_" + output.inputVariableType)) {
                  dictDTIndexAccum["pp_" + output.inputVariableType] = 0;
              }
              else { dictDTIndexAccum["pp_" + output.inputVariableType]++; }
              // now set the index of a declarative type
              output.inputDeclarativeVariableIndex = dictDTIndexAccum["pp_" + output.inputVariableType];

              result.uniformCount++;
              result.uniforms.push(output);
              break;
          }
        }
      }
      else {
        break;
      }
    }

    return result;
  }

  private static getInputDataInfo (shaderSource: string, startIndex: number): OFIShaderCodeInfoInput {
    const resultInfo = {
        inputName: "",
        inputType: 0,
        inputIndex: -1,
        inputNameLength: 0
    } as OFIShaderCodeInfoInput;

    let inputIndex_attribute = shaderSource.indexOf("attribute", startIndex);    
    let inputIndex_uniform = shaderSource.indexOf("uniform", startIndex);
    
    inputIndex_attribute = inputIndex_attribute === -1 ? OFShaderAnalizer.indexLimit : inputIndex_attribute;
    inputIndex_uniform = inputIndex_uniform === -1 ? OFShaderAnalizer.indexLimit : inputIndex_uniform;
    
    const inputDataType = inputIndex_attribute < inputIndex_uniform ? OFShaderAnalizer.enumAttribute : 
      OFShaderAnalizer.enumUniform;
    
    switch (inputDataType) {
      case OFShaderAnalizer.enumAttribute:
        resultInfo.inputName = "attribute";
        resultInfo.inputType = inputDataType;
        resultInfo.inputIndex = inputIndex_attribute;
        resultInfo.inputNameLength = OFShaderAnalizer.attributeStringLenght;
        break;
      case OFShaderAnalizer.enumUniform:
        resultInfo.inputName = "uniform";
        resultInfo.inputType = inputDataType;
        resultInfo.inputIndex = inputIndex_uniform;
        resultInfo.inputNameLength = OFShaderAnalizer.uniformStringLenght;
        break;
    }

    return resultInfo;
  }

  private static getNextInputData (shaderSource: string, inputDataInfo): OFIShaderCodeInfoInputData {
    const inputStringLength = inputDataInfo.inputNameLength;
    const startIndex = inputDataInfo.inputIndex;
 
    const inputIndex = shaderSource.indexOf(inputDataInfo.inputName, startIndex);
    let out_lastIndex = startIndex;
    let out_inputVariableType: string;
    let out_inputName: string;
    let out_inputDeclarativeVariableTypeName: string;
    let out_inputPrecision: string;
    
    if (inputIndex !== -1) {
      const index_initToType = (inputIndex + inputStringLength) + 1;
      const index_endToType = shaderSource.indexOf(" ", index_initToType);
      const index_initToName = index_endToType + 1;
      let index_endToName = shaderSource.indexOf(";", index_initToName);
        
      out_inputVariableType = shaderSource.substr(index_initToType, (index_endToType - index_initToType)).trim();
      out_inputName = shaderSource.substr(index_initToName, (index_endToName - index_initToName));

      if (out_inputName.indexOf(":") !== -1) {
        // Have declarative internal webEngine types helpers.
        index_endToName = shaderSource.indexOf(":", index_initToName);
        // update uniform name
        out_inputName = shaderSource.substr(index_initToName, (index_endToName - index_initToName)).trim();
        
        const index_initDVT = shaderSource.indexOf(":", index_endToName) + 1;
        const index_endDVT = shaderSource.indexOf(";", index_initDVT);
        
        out_inputDeclarativeVariableTypeName = shaderSource.substr(index_initDVT, 
            (index_endDVT - index_initDVT)).trim();
        
        // set last startIndex
        out_lastIndex = index_endDVT;
      }
      else {
        // set last startIndex
        out_lastIndex = index_endToName;
      }
    }
    
    // Validate if have precision
    if (out_inputName) {
      const index_precision = out_inputName.indexOf(" ");
      
      if (index_precision !== -1) {
        // if have precision then fix the 'out_inputVariableType' with the correct data
        out_inputPrecision = out_inputVariableType;
        out_inputVariableType = out_inputName.substring(0, index_precision);
        out_inputName = out_inputName.substring(index_precision + 1, out_inputName.length);
      }
    }
    
    return {
      lastIndex: out_lastIndex,
      inputPrecision: out_inputPrecision,
      inputVariableType: OFShaderAnalizer.changeVariableTypeToEnum(out_inputVariableType, 
        out_inputDeclarativeVariableTypeName),        
      inputName: out_inputName ? out_inputName.trim() : out_inputName,
      inputDeclarativeVariableIndex: 0
    } as OFIShaderCodeInfoInputData;
  }

  static sanitize (shaderSource: string) {
    let startIndex = 0;
    let outputResult = shaderSource;
    
    while (true) {
        var declarativeStart = outputResult.indexOf("uniform", startIndex);
        
        if (declarativeStart !== -1) {
            var declarativeEnd = outputResult.indexOf(";", declarativeStart);
            var codeLine = outputResult.substr(declarativeStart, (declarativeEnd - declarativeStart) + 1);
            
            if (codeLine.indexOf(":") !== -1) {
                var newCodeLine = codeLine.substr(0, codeLine.indexOf(":")).trim() + ";";

                var part1 = outputResult.substr(0, declarativeStart);
                var part2 = outputResult.substr(declarativeEnd + 1, (shaderSource.length - declarativeEnd));

                outputResult = "";
                outputResult += part1;            
                outputResult += newCodeLine;
                outputResult += part2;
            }
            
            startIndex = declarativeStart + 1;
        }
        else {
            break;
        }
    }
    
    return outputResult;
  }

  private static changeVariableTypeToEnum (variableType: string, declarativeType: string): OFEnumShaderDataTypes {
    let result = OFEnumShaderDataTypes.Unkown;
    
    if (declarativeType) {
      switch (declarativeType.toUpperCase()) {
        case OFEnumShaderLiterals.DT_Texture: result = OFEnumShaderDataTypes.ITexture; break;
        case OFEnumShaderLiterals.DT_Color:   result = OFEnumShaderDataTypes.IColor; break;
        case OFEnumShaderLiterals.DT_Camera:  result = OFEnumShaderDataTypes.ICamera; break;
      }
    }
    
    if (variableType && result === OFEnumShaderDataTypes.Unkown) {
      switch (variableType.toUpperCase()) {
        case OFEnumShaderLiterals.IN_Matrix2:         result = OFEnumShaderDataTypes.Matrix2; break;  
        case OFEnumShaderLiterals.IN_Matrix3:         result = OFEnumShaderDataTypes.Matrix3; break;  
        case OFEnumShaderLiterals.IN_Matrix4:         result = OFEnumShaderDataTypes.Matrix4; break;  
        case OFEnumShaderLiterals.IN_Vector2:         result = OFEnumShaderDataTypes.Vector2; break;  
        case OFEnumShaderLiterals.IN_Vector3:         result = OFEnumShaderDataTypes.Vector3; break;  
        case OFEnumShaderLiterals.IN_Vector4:         result = OFEnumShaderDataTypes.Vector4; break;  
        case OFEnumShaderLiterals.IN_IntVector2:      result = OFEnumShaderDataTypes.IntVector2; break;  
        case OFEnumShaderLiterals.IN_IntVector3:      result = OFEnumShaderDataTypes.IntVector3; break;  
        case OFEnumShaderLiterals.IN_IntVector4:      result = OFEnumShaderDataTypes.IntVector4; break;  
        case OFEnumShaderLiterals.IN_BooleanVector2:  result = OFEnumShaderDataTypes.BooleanVector2; break;  
        case OFEnumShaderLiterals.IN_BooleanVector3:  result = OFEnumShaderDataTypes.BooleanVector3; break;  
        case OFEnumShaderLiterals.IN_BooleanVector4:  result = OFEnumShaderDataTypes.BooleanVector4; break;  
        case OFEnumShaderLiterals.IN_Sampler2D:       result = OFEnumShaderDataTypes.Sampler2D; break;  
        case OFEnumShaderLiterals.IN_SamplerCube:     result = OFEnumShaderDataTypes.SamplerCube; break;  
        case OFEnumShaderLiterals.IN_Float:           result = OFEnumShaderDataTypes.Float; break;  
        case OFEnumShaderLiterals.IN_Int:             result = OFEnumShaderDataTypes.Int; break;  
        case OFEnumShaderLiterals.IN_Bool:            result = OFEnumShaderDataTypes.Bool; break;  
        default:                                      result = OFEnumShaderDataTypes.Unkown; break;  
      }
    }
    
    return result;
  }
}