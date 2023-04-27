import { ICallback1 } from "shute-technologies.common-and-utils";

export class OFRenderLoop {

  private readonly _gameLoopInterval: NodeJS.Timeout;
  private readonly _functionLoop: ICallback1<number>;
  private readonly _framerate: number;

  private _lastTime: number;

  private constructor(functionLoop: ICallback1<number>, framerate: number) {
    this._framerate = framerate;
    this._functionLoop = functionLoop;
    this._lastTime = new Date().getTime();
    this._gameLoopInterval = setInterval(() => this.internalLoop(), 1000 / this._framerate);
  }

  private internalLoop(): void {
    const currentTime = new Date().getTime();
    const deltaTime = (currentTime - this._lastTime) / 1000;
    this._lastTime = currentTime;

    this._functionLoop(deltaTime);
  }

  static create(functionLoop: ICallback1<number>, framerate: number): OFRenderLoop {
    return new OFRenderLoop(functionLoop, framerate);
  }
}
