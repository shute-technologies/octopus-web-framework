import { OFVertexPositionColorTexture } from "./ofVertexPositionColorTexture"

export class OFQuadStruct {
  created: boolean;
  initX: number;
  initY: number;
  VPTTopLeft: OFVertexPositionColorTexture;
  VPTTopRight: OFVertexPositionColorTexture;
  VPTBottomLeft: OFVertexPositionColorTexture;
  VPTBottomRight: OFVertexPositionColorTexture;
  
  static createAsVertexPositionColorTexture () {
    const result = new OFQuadStruct();
    result.created = false;
    result.initX = 0;
    result.initY = 0;
    result.VPTTopLeft = new OFVertexPositionColorTexture();
    result.VPTTopRight = new OFVertexPositionColorTexture();
    result.VPTBottomLeft = new OFVertexPositionColorTexture();
    result.VPTBottomRight = new OFVertexPositionColorTexture();

    return result;
  }
}