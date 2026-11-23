const test = require('node:test');
const assert = require('node:assert/strict');
const { OFGraphicDevice } = require('../lib/index.js');

// The constructor needs a running framework; resize() only touches these.
function makeDevice(hasCustomCamera) {
  const device = Object.create(OFGraphicDevice.prototype);
  const resizes = [];
  device._canvasObject = { canvasElement: { setAttribute() {} } };
  device._renderCamera = { resize: (...args) => resizes.push(args) };
  device._hasCustomCamera = false;
  device.useCustomRenderCamera(hasCustomCamera);
  return { device, resizes };
}

test('the device camera resizes with the canvas under useCustomRenderCamera(true)', () => {
  const { device, resizes } = makeDevice(true);

  device.resize(1280, 720, 800, 600);

  assert.deepEqual(resizes, [[1280, 720, 800, 600]]);
});

test('the device camera still resizes without a custom camera', () => {
  const { device, resizes } = makeDevice(false);

  device.resize(1024, 768, 800, 600);

  assert.deepEqual(resizes, [[1024, 768, 800, 600]]);
});

test('a zero size (hidden container) leaves the camera projection alone', () => {
  const { device, resizes } = makeDevice(true);

  device.resize(0, 720, 800, 600);
  device.resize(1280, 0, 800, 600);

  assert.deepEqual(resizes, []);
});
