import { OFEnumShaderDataTypes } from "../ofEnumShaderDataTypes";

export interface OFIShaderCodeInfoInputData {
  lastIndex: number;
  inputPrecision: string;
  inputVariableType: OFEnumShaderDataTypes;
  inputName: string;
  inputDeclarativeVariableIndex: number;
}
