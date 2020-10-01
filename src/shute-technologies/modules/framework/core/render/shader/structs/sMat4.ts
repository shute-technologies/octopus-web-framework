export class SMat4 {
  private _array: Array<number>;

  get array(): Array<number> {
    this._array[0] = this.m00;
    this._array[1] = this.m01;
    this._array[2] = this.m02;
    this._array[3] = this.m03;
    this._array[4] = this.m10;
    this._array[5] = this.m11;
    this._array[6] = this.m12;
    this._array[7] = this.m13;
    this._array[8] = this.m20;
    this._array[9] = this.m21;
    this._array[10] = this.m22;
    this._array[11] = this.m23;
    this._array[12] = this.m30;
    this._array[13] = this.m31;
    this._array[14] = this.m32;
    this._array[15] = this.m33;

    return this._array;
  }

  constructor(
    public m00: number,
    public m01: number,
    public m02: number,
    public m03: number,
    public m10: number,
    public m11: number,
    public m12: number,
    public m13: number,
    public m20: number,
    public m21: number,
    public m22: number,
    public m23: number,
    public m30: number,
    public m31: number,
    public m32: number,
    public m33: number
  ) {
    this._array = [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33];
  }
}
