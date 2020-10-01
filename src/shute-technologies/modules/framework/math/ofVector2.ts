import { OFConsole } from '../helpers/ofConsole'

export class OFVector2 {

  constructor(
    public x: number, 
    public y: number) {}

  length(): number {
    return Math.sqrt((this.x * this.x) + (this.y * this.y));
  }

  dot (v: OFVector2): number {
    return (this.x * v.x) + (this.y * v.y);
  }

  add(v: OFVector2): void {
    this.x += v.x;
    this.y += v.y;
  }

  multiplyBy (factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }

  multiply (v: OFVector2): void {
    this.x *= v.x;
    this.y *= v.y;
  }

  scale (factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }

  subtract (v: OFVector2): void {
    this.x -= v.x;
    this.y -= v.y;
  }
    
  divide (v: OFVector2): void {
    this.x /= v.x;
    this.y /= v.y;
  }

  angle (): number {
    return Math.atan2(this.y, this.x);
  }
    
  normalize(): void {
    const vectorLength = this.length();

    if (vectorLength > 0) {
        this.x /= vectorLength;
        this.y /= vectorLength;
    }
    else {
      OFConsole.warn("[WARN]: OFVector2.normalize: called on a zero-length vector.");
    }
  }

  projectionOn (v: OFVector2) {
    const squareLength = v.dot(v);

    if (squareLength === 0) {
      OFConsole.log("[WARN] OFVector2.projectionOn: zero-length projection vector.");
      return this.clone();
    }

    const result = v.clone();
    result.scale(this.dot(v) / squareLength);

    return result;
  }

  clone (): OFVector2 {
    return new OFVector2(this.x, this.y);
  }

  static zero ()  { return new OFVector2(0, 0); }
  static one ()   { return new OFVector2(1, 1); }
  static left ()  { return new OFVector2(1, 0); }
  static right () { return new OFVector2(0, 1); }
}
