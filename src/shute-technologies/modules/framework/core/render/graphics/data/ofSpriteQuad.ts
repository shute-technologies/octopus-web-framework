import { OFImageContent } from "@framework";

export class OFOptSpriteQuadStruct {
  x: number;
  y: number;
  width: number;
  height: number;
  imageContent: OFImageContent;
  uv00_x: number; 
  uv00_y: number;
  uv10_x: number; 
  uv10_y: number;
  uv11_x: number; 
  uv11_y: number;
  uv01_x: number; 
  uv01_y: number;
  sortId: number;
}

export class OFOptSpriteQuadUVStruct {
  uv00_x: number; 
  uv00_y: number;
  uv10_x: number; 
  uv10_y: number;
  uv11_x: number; 
  uv11_y: number;
  uv01_x: number; 
  uv01_y: number;
}
