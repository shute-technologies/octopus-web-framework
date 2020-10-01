import { OFConsole } from '../helpers/ofConsole'

export class OFVector3 {

  constructor(
    public x: number, 
    public y: number, 
    public z: number) {}

  length(): number {
    return Math.sqrt((this.x * this.x) + (this.y * this.y) + (this.z * this.z));
  }

  dot (v: OFVector3): number {
    return ((this.x * v.x) + (this.y * v.y) + (this.z * v.z));
  }

  add(v: OFVector3): void {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }

  multiply (v: OFVector3): void {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
  }

  scale (factor: number): void {
    this.x *= factor;
    this.y *= factor;
    this.z *= factor;
  }

  subtract (v: OFVector3): void {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
  }
    
  divide (v: OFVector3): void {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
  }
    
  normalize(): void {
    const vectorLength = this.length();

    if (vectorLength > 0) {
        this.x /= vectorLength;
        this.y /= vectorLength;
        this.z /= vectorLength;
    }
    else {
      OFConsole.warn("[WARN]: OFVector3.normalize: called on a zero-length vector.");
    }
  }

  projectionOn (v: OFVector3) {
    const squareLength = v.dot(v);

    if (squareLength === 0) {
      OFConsole.log("[WARN] OFVector3.projectionOn: zero-length projection vector.");
      return this.clone();
    }

    const result = v.clone();
    result.scale(this.dot(v) / squareLength);

    return result;
  }

  clone (): OFVector3 {
    return new OFVector3(this.x, this.y, this.z);
  }

  static zero ()  { return new OFVector3(0, 0, 0); }
  static one ()   { return new OFVector3(1, 1, 1); }
  static left ()  { return new OFVector3(-1, 0, 0); }
  static right () { return new OFVector3(1, 0, 0); }
  static up ()    { return new OFVector3(0, 1, 0); }
  static down ()  { return new OFVector3(0, -1, 0); }
  static front () { return new OFVector3(0, -1, 1); }
  static back ()  { return new OFVector3(0, -1, -1); }
}
