import { OFIShaderCodeInfoInputData } from "./ofIShaderCodeInfoInputData";

export interface OFIShaderCodeInfo {
  attributeCount: number;
  uniformCount: number;
  attributes: OFIShaderCodeInfoInputData[];
  uniforms: OFIShaderCodeInfoInputData[];
} 
