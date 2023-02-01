import { SpecMain } from './src/shute-technologies/specMain';
import { EnumSpectType } from './src/shute-technologies/specs/enumSpecType';
import { OFRenderLoop } from './src/shute-technologies/modules/common/ofRenderLoop';

(function main() {
  const instance = new SpecMain(EnumSpectType.SimpleFramework);
  const frameRate = 30;

  OFRenderLoop.create((deltaTime) => {
    instance.update(deltaTime);
  }, frameRate);
})();
