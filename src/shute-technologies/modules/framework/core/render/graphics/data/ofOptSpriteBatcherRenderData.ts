import { OFVBOObject } from "../../../device/optimization/gpu/ofVBOObject";

export interface OFOptSpriteBatcherRenderData {
  vboObject: OFVBOObject;
  iboObject: OFVBOObject;
  vertexCount: number;
  indicesCount: number;
  imageTexture: WebGLTexture;
}
