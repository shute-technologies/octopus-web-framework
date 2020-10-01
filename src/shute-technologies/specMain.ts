import { EnumSpectType } from "./specs/enumSpecType";
import { SpecTestFramework } from "./specs/types/specTestFramework";
import { SpecSpaceGame } from "./specs/types/specSpaceGame";
import { SimpleGCallback } from './modules/framework/common/ofInterfaces';

export class SpecMain {

  private _currentSpec: {
    update: SimpleGCallback<number>
  };

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