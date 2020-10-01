import { OFSprite } from "../core/render/graphics/d2d/ofSprite";
import { OFPrimitiveQuad } from "../core/render/graphics/d2d/ofPrimitiveQuad";

export class OFCollisionHelper {

  static hitTestSprite(a: OFSprite, b: OFSprite): boolean {
    const thisX = a.x + a.collisionRect.offsetX;
    const thisY = a.y + a.collisionRect.offsetY;
    const otherX = b.x + b.collisionRect.offsetX;
    const otherY = b.y + b.collisionRect.offsetY;

    return thisX < otherX + b.collisionRect.width && thisX + a.collisionRect.width > otherX &&
      thisY < otherY + b.collisionRect.height && a.collisionRect.height + thisY > otherY;
  }

  static hitTestQuad(a: OFPrimitiveQuad, b: OFPrimitiveQuad): boolean {
    const thisX = a.x + a.offsetX;
    const thisY = a.y + a.offsetY;
    const otherX = b.x + b.offsetX;
    const otherY = b.y + b.offsetY;

    return thisX < otherX + b.width && thisX + a.width > otherX &&
      thisY < otherY + b.height && a.height + thisY > otherY;
  }

  static hitTestByPointQuad(a: OFPrimitiveQuad, x: number, y: number): boolean {
    const hWidth = a.width * 0.5;        
    const hHeight = a.height * 0.5;
    const thisX = a.x + a.offsetX;
    const thisY = a.y + a.offsetY;
    
    return (thisX - hWidth) < x && (thisX + hWidth) > x && 
      (thisY - hHeight) < y && (thisY + hHeight) > y;
  }

  static hitTestByPointSprite(a: OFSprite, x: number, y: number): boolean {
    const hWidth = a.width * 0.5;        
    const hHeight = a.height * 0.5;
    const thisX = a.x;
    const thisY = a.y;
    
    return (thisX - hWidth) < x && (thisX + hWidth) > x && 
      (thisY - hHeight) < y && (thisY + hHeight) > y;
  }
}