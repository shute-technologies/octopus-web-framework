export class OFDeltaTimeCorrector {

  private _deltaTimeBufferIndex: number;
  private _deltaTimeBufferCount: number;
  private _deltaTimeBuffer: number[];

  constructor() {
    this._deltaTimeBufferIndex = 0;
    this._deltaTimeBufferCount = 15;
    this._deltaTimeBuffer = [];
  }

  recomputeDeltaTime(dt: number): number {
    this._deltaTimeBuffer[this._deltaTimeBufferIndex++] = dt;
    this._deltaTimeBufferIndex = this._deltaTimeBufferIndex >= this._deltaTimeBufferCount ? 0 : this._deltaTimeBufferIndex;

    let newDeltaTime = 0;

    for (const dtBuffer of this._deltaTimeBuffer) {
      newDeltaTime += dtBuffer;
    }

    return newDeltaTime / this._deltaTimeBufferCount;
  }
}
