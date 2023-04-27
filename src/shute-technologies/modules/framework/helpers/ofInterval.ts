import { ICallback0 } from "shute-technologies.common-and-utils";
import { IOFRenderArgs } from "../interfaces/iofRenderArgs";

export class OFInterval {

  private _currentTime: number;
  private _intervalTimeSeconds: number;
  private _loops: number;
  private _currentLoop: number;

  private _onFinishedLoopCallback: ICallback0;
  private _onFinishedIntervalCallback: ICallback0;

  set finishedLoopCallback(val: ICallback0) { this._onFinishedLoopCallback = val; }
  set finishedIntervalCallback(val: ICallback0) { this._onFinishedIntervalCallback = val; }

  constructor(intervalTimeSeconds: number, loops: number) {
    this._currentTime = 0;
    this._currentLoop = 0;
    this._intervalTimeSeconds = intervalTimeSeconds;
    this._loops = loops;
  }

  update( args: IOFRenderArgs): void {
    if (this._currentLoop < this._loops) {
      this._currentTime += args.dt;

      if (this._currentTime >= this._intervalTimeSeconds) {
        this._currentTime = 0;
        this._currentLoop++;

        if (this._currentLoop === this._loops) {
          if (this._onFinishedIntervalCallback) {
            this._onFinishedIntervalCallback();
          }
        } 
        else {
          if (this._onFinishedLoopCallback) {
            this._onFinishedLoopCallback();
          }
        }
      }
    }
  }

  destroy (): void {
    this._onFinishedLoopCallback = null;
    this._onFinishedIntervalCallback = null;
  }
}