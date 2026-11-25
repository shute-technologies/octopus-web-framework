const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');
const { makeAbstractShader } = require('./fake-webgl');

const { OFEnumBlendMode, OFPolygonBatcher, OFEnumShaderDataTypes } = lib;
const cameraUniforms = [['uMVP', OFEnumShaderDataTypes.ICamera]];
const draw = (shader) => shader.draw({}, 'vbo', null, 'TRIANGLES', 'ibo', 6);
const blendCalls = (gl) => gl.calls.filter((c) => c.name === 'blendFunc' || c.name === 'blendFuncSeparate');

test('OFEnumBlendMode keeps its values', () => {
  assert.equal(OFEnumBlendMode.Alpha, 0);
  assert.equal(OFEnumBlendMode.Additive, 1);
  assert.equal(OFEnumBlendMode.Multiply, 2);
  assert.equal(OFEnumBlendMode.Screen, 3);
});

test('a default draw makes the same blend calls as before: enable(BLEND) and blendFunc', () => {
  const { shader, gl } = makeAbstractShader(lib, cameraUniforms);

  draw(shader);

  assert.equal(shader.blendMode, OFEnumBlendMode.Alpha);
  assert.deepEqual(gl.callsTo('enable').map((c) => c.args), [['BLEND']]);
  assert.deepEqual(gl.callsTo('blendFunc').map((c) => c.args), [['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA']]);
  assert.equal(gl.callsTo('blendFuncSeparate').length, 0);
});

const separate = {
  [OFEnumBlendMode.Additive]: ['SRC_ALPHA', 'ONE', 'ONE', 'ONE_MINUS_SRC_ALPHA'],
  [OFEnumBlendMode.Multiply]: ['DST_COLOR', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE_MINUS_SRC_ALPHA'],
  [OFEnumBlendMode.Screen]: ['ONE', 'ONE_MINUS_SRC_COLOR', 'ONE', 'ONE_MINUS_SRC_ALPHA']
};

for (const [mode, args] of Object.entries(separate)) {
  test(`${OFEnumBlendMode[mode]} sets blendFuncSeparate${JSON.stringify(args)}`, () => {
    const { shader, gl } = makeAbstractShader(lib, cameraUniforms);
    shader.blendMode = Number(mode);

    draw(shader);

    assert.deepEqual(gl.callsTo('enable').map((c) => c.args), [['BLEND']]);
    assert.deepEqual(gl.callsTo('blendFuncSeparate').map((c) => c.args), [args]);
    assert.equal(gl.callsTo('blendFunc').length, 0);
  });
}

test('two draws in one mode set it once', () => {
  const { shader, gl } = makeAbstractShader(lib, cameraUniforms);
  shader.blendMode = OFEnumBlendMode.Additive;

  draw(shader);
  draw(shader);

  assert.equal(blendCalls(gl).length, 1);
  assert.equal(gl.callsTo('enable').length, 1);
});

test('resetStateCache makes the next draw set the mode again', () => {
  const { shader, gl, graphicDevice } = makeAbstractShader(lib, cameraUniforms);

  draw(shader);
  graphicDevice.resetStateCache();
  draw(shader);

  assert.equal(gl.callsTo('blendFunc').length, 2);
});

test('changing the mode sets the new one', () => {
  const { shader, gl } = makeAbstractShader(lib, cameraUniforms);

  draw(shader);
  shader.blendMode = OFEnumBlendMode.Screen;
  draw(shader);

  assert.deepEqual(blendCalls(gl).map((c) => c.name), ['blendFunc', 'blendFuncSeparate']);
});

test('batchers sharing one shader draw Additive, then Alpha', () => {
  const { shader, gl } = makeAbstractShader(lib, cameraUniforms);
  const makeBatcher = (blendMode) => {
    const batcher = Object.create(OFPolygonBatcher.prototype);
    batcher._GL = gl;
    batcher._shader = shader;
    batcher._vBOObject = { vbo: 'vbo' };
    batcher._iBOObject = { vbo: 'ibo' };
    batcher._indexCount = 6;
    batcher.blendMode = blendMode;
    return batcher;
  };
  const additive = makeBatcher(OFEnumBlendMode.Additive);
  const alpha = makeBatcher(OFEnumBlendMode.Alpha);

  additive.draw({});
  alpha.draw({});

  assert.deepEqual(blendCalls(gl).map((c) => [c.name, ...c.args]), [
    ['blendFuncSeparate', 'SRC_ALPHA', 'ONE', 'ONE', 'ONE_MINUS_SRC_ALPHA'],
    ['blendFunc', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA']
  ]);
});

test('OFEnumBlendMode: Replace is 4 and Premultiplied is 5, 0 to 3 unchanged', () => {
  assert.equal(OFEnumBlendMode.Alpha, 0);
  assert.equal(OFEnumBlendMode.Additive, 1);
  assert.equal(OFEnumBlendMode.Multiply, 2);
  assert.equal(OFEnumBlendMode.Screen, 3);
  assert.equal(OFEnumBlendMode.Replace, 4);
  assert.equal(OFEnumBlendMode.Premultiplied, 5);
});

test('Alpha: blendFunc on the canvas, the separate form inside a target, blendFunc again back on the canvas', () => {
  const { createFakeGL, makeGraphicDevice } = require('./fake-webgl');
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);
  const fb = { fb: 1 };
  const alpha = () => { device.useBlendMode(OFEnumBlendMode.Alpha); return blendCalls(gl).map((c) => [c.name, ...c.args]); };

  assert.deepEqual(alpha(), [['blendFunc', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA']]);
  gl.calls.length = 0;
  device.useBlendMode(OFEnumBlendMode.Alpha);
  assert.equal(gl.calls.length, 0, 'unchanged on the canvas: no GL calls');

  device.bindRenderTarget(fb, 10, 10);
  gl.calls.length = 0;
  assert.deepEqual(alpha(), [['blendFuncSeparate', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE_MINUS_SRC_ALPHA']]);

  device.unbindRenderTarget(fb);
  gl.calls.length = 0;
  assert.deepEqual(alpha(), [['blendFunc', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA']]);
});

test('Replace disables BLEND, and the next Alpha enables it again', () => {
  const { createFakeGL, makeGraphicDevice } = require('./fake-webgl');
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.useBlendMode(OFEnumBlendMode.Alpha);
  gl.calls.length = 0;
  device.useBlendMode(OFEnumBlendMode.Replace);
  assert.deepEqual(gl.calls.map((c) => [c.name, ...c.args]), [['disable', 'BLEND']]);

  gl.calls.length = 0;
  device.useBlendMode(OFEnumBlendMode.Alpha);
  assert.deepEqual(gl.callsTo('enable').map((c) => c.args), [['BLEND']]);
  assert.equal(gl.callsTo('blendFunc').length, 1);
});

test('Premultiplied is blendFuncSeparate(ONE, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA); neither new mode premultiplies', () => {
  const { createFakeGL, makeGraphicDevice } = require('./fake-webgl');
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.useBlendMode(OFEnumBlendMode.Premultiplied);
  assert.deepEqual(gl.callsTo('enable').map((c) => c.args), [['BLEND']]);
  assert.deepEqual(gl.callsTo('blendFuncSeparate')[0].args, ['ONE', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE_MINUS_SRC_ALPHA']);
  assert.equal(lib.OFGraphicDevice.premultipliesFor(OFEnumBlendMode.Premultiplied), false);
  assert.equal(lib.OFGraphicDevice.premultipliesFor(OFEnumBlendMode.Replace), false);
});
