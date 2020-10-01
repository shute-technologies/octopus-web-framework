export class SMat2 {
  private _array: Array<number>;

  get array(): Array<number> {
    this._array[0] = this.m00;
    this._array[1] = this.m01;
    this._array[2] = this.m10;
    this._array[3] = this.m11;

    return this._array;
  }

  constructor(public m00: number, public m01: number, public m10: number, public m11: number) {
    this._array = [m00, m01, m10, m11];
  }
}
