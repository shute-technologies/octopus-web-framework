import { EnumSpectType } from "./specs/enumSpecType";
import { SpecTestFramework } from "./specs/types/specTestFramework";
import { SpecSpaceGame } from "./specs/types/specSpaceGame";

interface SpecInstance {
  update: (dt: number) => void;
};

export class SpecMain {

  private _currentSpec: SpecInstance;

  constructor (specType: EnumSpectType) {
    switch (specType) {
      case EnumSpectType.SimpleFramework:
        this._currentSpec = new SpecTestFramework();
        break;
      case EnumSpectType.SpaceGame:
        this._currentSpec = new SpecSpaceGame();
        break;
    }
  }

  update (dt: number): void {
    this._currentSpec.update(dt);
  }
}