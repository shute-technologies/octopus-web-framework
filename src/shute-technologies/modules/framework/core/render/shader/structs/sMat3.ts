export class SMat3 {
  private _array: Array<number>;

  get array(): Array<number> {
    this._array[0] = this.m00;
    this._array[1] = this.m01;
    this._array[2] = this.m02;
    this._array[3] = this.m10;
    this._array[4] = this.m11;
    this._array[5] = this.m12;
    this._array[6] = this.m20;
    this._array[7] = this.m21;
    this._array[8] = this.m22;

    return this._array;
  }

  constructor(
    public m00: number,
    public m01: number,
    public m02: number,
    public m10: number,
    public m11: number,
    public m12: number,
    public m20: number,
    public m21: number,
    public m22: number
  ) {
    this._array = [m00, m01, m02, m10, m11, m12, m20, m21, m22];
  }
}
