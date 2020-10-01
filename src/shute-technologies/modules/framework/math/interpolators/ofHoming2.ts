import { OFVector2 } from '../ofVector2'

export class OFHoming2 {

  private _targetX: number;
  private _targetY: number;
  private _currentX: number;
  private _currentY: number;
  private _rotation: number;
  private _turnFactor: number;
  private _speed: number;
  private _rotationCorrection: number;
  private _directionVector: OFVector2;
  private _velocityVector: OFVector2;

  get x(): number { return this._currentX; }
  get y(): number { return this._currentY; }
  get rotation(): number { return this._rotation; }

  constructor(x: number, y: number, turnFactor: number, speed: number) {
    this._targetX = 0;
    this._targetY = 0;
    this._rotation = 0;
    this._rotationCorrection = 0;
    this._currentX = x;
    this._currentY = y;
    this._speed = speed;
    this._turnFactor = turnFactor;

    this._velocityVector = OFVector2.zero();
    this._directionVector = new OFVector2(this._targetX - this._currentX, this._targetY - this._currentY);
    this._directionVector.normalize();
  }

  setTarget(x: number, y: number): void {
    this._targetX = x;
    this._targetY = y;
  }

  update(dt: number): void {
    this._directionVector.x = this._targetX - this._currentX;
    this._directionVector.y = this._targetY - this._currentY;
    this._directionVector.normalize();
    this._directionVector.multiplyBy(this._turnFactor);

    this._velocityVector.add(this._directionVector);
    this._velocityVector.normalize();
    this._velocityVector.multiplyBy(this._speed * dt);

    this._currentX += this._velocityVector.x;
    this._currentY += this._velocityVector.y;

    this._rotation = Math.atan2(this._velocityVector.y, this._velocityVector.x) + this._rotationCorrection;
  }

  destroy(): void {
    this._directionVector = null;
    this._velocityVector = null;
  }
}
