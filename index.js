"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const specMain_1 = require("./src/shute-technologies/specMain");
const enumSpecType_1 = require("./src/shute-technologies/specs/enumSpecType");
const ofRenderLoop_1 = require("./src/shute-technologies/modules/common/ofRenderLoop");
(function main() {
    const instance = new specMain_1.SpecMain(enumSpecType_1.EnumSpectType.SimpleFramework);
    const frameRate = 30;
    ofRenderLoop_1.OFRenderLoop.create((deltaTime) => {
        instance.update(deltaTime);
    }, frameRate);
})();
//# sourceMappingURL=index.js.map