import { OFEnumShaderDataTypes } from "../ofEnumShaderDataTypes";

export interface OFIShaderCodeInfoInputData {
  lastIndex: number;
  inputPrecision: string;
  inputVariableType: OFEnumShaderDataTypes;
  inputName: string;
  inputDeclarativeVariableIndex: number;
  /** The GLSL type of a declarative input (`: Shared` is sent by it); unset for a plain input. */
  inputGLSLType?: OFEnumShaderDataTypes;
}
