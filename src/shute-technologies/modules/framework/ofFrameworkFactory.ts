import { OFFramework } from "./ofFramework";
import { OFConsole } from "./helpers/ofConsole";
import { OFTranslations } from "./settings/ofTranslations";

export class OFFrameworkFactory {

  private static _uniqueIdentifier = 0;
  private static _currentFramework = 0;
  private static _popedFramework = -1;
  private static _frameworks: OFFramework[] = [];

  static get currentFramewok(): OFFramework { return OFFrameworkFactory._frameworks[OFFrameworkFactory._currentFramework]; }

  static create(params: {} = null): OFFramework {
    const instance = OFFramework.create(OFFrameworkFactory._uniqueIdentifier++, params);
    this._frameworks.push(instance);

    // set this new one, the current framework
    OFFrameworkFactory._currentFramework = instance.frameworkIdentifier;

    return instance;
  }

  static popFramework(framework: OFFramework): void {
    if (OFFrameworkFactory._popedFramework == -1) {
      OFFrameworkFactory._popedFramework = OFFrameworkFactory._currentFramework;
      OFFrameworkFactory._currentFramework = framework.frameworkIdentifier;
    }
  }

  static pushFramework() {
    if (OFFrameworkFactory._popedFramework == -1) {
      OFFrameworkFactory._popedFramework = -1;
      OFFrameworkFactory._currentFramework = OFFrameworkFactory._popedFramework;
    }
  }

  static setCurrentFramework(identifier: number): void {
    if (identifier > OFFrameworkFactory._uniqueIdentifier || identifier < 0) {
      OFConsole.warn(OFTranslations.Framework.FrameworkFactory.outOfBounds, identifier.toString());
    } else {
      OFFrameworkFactory._currentFramework = identifier;
    }
  }

  static getById(id: number): OFFramework {
    return OFFrameworkFactory._frameworks.find(x => x.frameworkIdentifier === id);
  }
}
