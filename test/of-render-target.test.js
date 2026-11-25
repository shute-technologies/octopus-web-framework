const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');
const { createFakeGL, makeGraphicDevice } = require('./fake-webgl');

const { OFRenderTarget, OFRenderTargetPool, OFDeviceCapabilities } = lib;

function setup(options = {}) {
  const gl = createFakeGL();
  Object.assign(gl.extensions, options.extensions || {});
  if (options.framebufferStatus) { gl.framebufferStatus = options.framebufferStatus; }
  const device = makeGraphicDevice(lib, gl);
  device.setViewport(0, 0, 800, 600);
  gl.calls.length = 0;
  return { gl, device };
}

const halfFloatExtensions = {
  OES_texture_half_float: { HALF_FLOAT_OES: 'HALF_FLOAT_OES' },
  OES_texture_half_float_linear: {},
  EXT_color_buffer_half_float: {}
};

const viewportOf = (device) => ({ ...device.currentViewport });
const lastCall = (gl, name) => gl.callsTo(name).slice(-1)[0];

test('a new target is an RGBA8 texture, LINEAR and CLAMP_TO_EDGE, attached to its framebuffer, and leaves the canvas bound', () => {
  const { gl, device } = setup();
  const target = new OFRenderTarget(device, 320, 200);

  assert.equal(target.width, 320);
  assert.equal(target.height, 200);
  assert.equal(target.format, 'rgba8');
  assert.deepEqual(lastCall(gl, 'texImage2D').args, ['TEXTURE_2D', 0, 'RGBA', 320, 200, 0, 'RGBA', 'UNSIGNED_BYTE', null]);
  const params = gl.callsTo('texParameteri').map((c) => [c.args[1], c.args[2]]);
  assert.deepEqual(params, [['TEXTURE_MAG_FILTER', 'LINEAR'], ['TEXTURE_MIN_FILTER', 'LINEAR'],
    ['TEXTURE_WRAP_S', 'CLAMP_TO_EDGE'], ['TEXTURE_WRAP_T', 'CLAMP_TO_EDGE']]);
  assert.deepEqual(lastCall(gl, 'framebufferTexture2D').args, ['FRAMEBUFFER', 'COLOR_ATTACHMENT0', 'TEXTURE_2D', target.texture, 0]);
  assert.deepEqual(lastCall(gl, 'bindFramebuffer').args, ['FRAMEBUFFER', null]);
  assert.equal(device.currentFramebuffer, null);
});

test('bind sets its framebuffer and viewport; unbind restores the canvas and its viewport', () => {
  const { gl, device } = setup();
  const target = new OFRenderTarget(device, 320, 200);

  target.bind();
  assert.equal(device.currentFramebuffer, target.framebuffer);
  assert.deepEqual(lastCall(gl, 'bindFramebuffer').args, ['FRAMEBUFFER', target.framebuffer]);
  assert.deepEqual(viewportOf(device), { x: 0, y: 0, width: 320, height: 200 });
  assert.deepEqual(lastCall(gl, 'viewport').args, [0, 0, 320, 200]);

  target.unbind();
  assert.equal(device.currentFramebuffer, null);
  assert.deepEqual(lastCall(gl, 'bindFramebuffer').args, ['FRAMEBUFFER', null]);
  assert.deepEqual(viewportOf(device), { x: 0, y: 0, width: 800, height: 600 });
  assert.deepEqual(lastCall(gl, 'viewport').args, [0, 0, 800, 600]);
  assert.equal(device.renderTargetDepth, 0);
});

test('binds nest two deep, each unbind restoring the one before', () => {
  const { device } = setup();
  device.setViewport(10, 20, 400, 300);
  const outer = new OFRenderTarget(device, 256, 128);
  const inner = new OFRenderTarget(device, 64, 32);

  outer.bind();
  inner.bind();
  assert.equal(device.renderTargetDepth, 2);
  assert.equal(device.currentFramebuffer, inner.framebuffer);
  assert.deepEqual(viewportOf(device), { x: 0, y: 0, width: 64, height: 32 });

  inner.unbind();
  assert.equal(device.currentFramebuffer, outer.framebuffer);
  assert.deepEqual(viewportOf(device), { x: 0, y: 0, width: 256, height: 128 });

  outer.unbind();
  assert.equal(device.currentFramebuffer, null);
  assert.deepEqual(viewportOf(device), { x: 10, y: 20, width: 400, height: 300 });
});

test('bind turns the scissor test off and unbind turns it back on only if it was on', () => {
  const { gl, device } = setup();
  const target = new OFRenderTarget(device, 32, 32);

  gl.enable('SCISSOR_TEST');
  target.bind();
  assert.equal(gl.isEnabled('SCISSOR_TEST'), false);
  target.unbind();
  assert.equal(gl.isEnabled('SCISSOR_TEST'), true);

  gl.disable('SCISSOR_TEST');
  target.bind();
  target.unbind();
  assert.equal(gl.isEnabled('SCISSOR_TEST'), false);
});

test('a target made while another is bound leaves that one bound', () => {
  const { device } = setup();
  const outer = new OFRenderTarget(device, 32, 32);

  outer.bind();
  const made = new OFRenderTarget(device, 16, 16);
  assert.equal(device.currentFramebuffer, outer.framebuffer);
  made.destroy();
  outer.unbind();
});

test('resize to the same size makes no GL call; a new size reallocates, and a bound target gets the new viewport', () => {
  const { gl, device } = setup();
  const target = new OFRenderTarget(device, 100, 50);

  gl.calls.length = 0;
  target.resize(100, 50);
  assert.equal(gl.calls.length, 0);

  target.bind();
  target.resize(200, 80);
  assert.deepEqual(lastCall(gl, 'texImage2D').args, ['TEXTURE_2D', 0, 'RGBA', 200, 80, 0, 'RGBA', 'UNSIGNED_BYTE', null]);
  assert.deepEqual(viewportOf(device), { x: 0, y: 0, width: 200, height: 80 });
  target.unbind();
});

test('clear binds the target, clears it to the colour and puts back what was bound', () => {
  const { gl, device } = setup();
  const target = new OFRenderTarget(device, 32, 32);

  gl.calls.length = 0;
  target.clear(0.1, 0.2, 0.3, 1);
  const names = gl.calls.map((c) => c.name).filter((n) => ['bindFramebuffer', 'clearColor', 'clear'].includes(n));
  assert.deepEqual(names, ['bindFramebuffer', 'clearColor', 'clear', 'bindFramebuffer']);
  assert.deepEqual(gl.callsTo('clearColor')[0].args, [0.1, 0.2, 0.3, 1]);
  assert.equal(device.currentFramebuffer, null);
});

test('destroy unbinds and deletes the framebuffer and texture', () => {
  const { gl, device } = setup();
  const target = new OFRenderTarget(device, 32, 32);
  const { framebuffer, texture } = target;

  target.bind();
  target.destroy();
  assert.equal(device.currentFramebuffer, null);
  assert.deepEqual(gl.callsTo('deleteFramebuffer').map((c) => c.args[0]), [framebuffer]);
  assert.deepEqual(gl.callsTo('deleteTexture').map((c) => c.args[0]), [texture]);
  assert.equal(target.isDestroyed, true);
});

test('half-float is used when the probe framebuffer is complete and the linear extension exists', () => {
  const { gl, device } = setup({ extensions: halfFloatExtensions });
  const target = new OFRenderTarget(device, 64, 64, 'half-float');

  assert.equal(target.format, 'half-float');
  assert.equal(lastCall(gl, 'texImage2D').args[7], 'HALF_FLOAT_OES');
  assert.equal(device.currentFramebuffer, null);
});

test('half-float falls back to RGBA8: no extension, no linear filtering, or an incomplete framebuffer', () => {
  const cases = [
    {},
    { extensions: { OES_texture_half_float: { HALF_FLOAT_OES: 'HALF_FLOAT_OES' } } },
    { extensions: halfFloatExtensions, framebufferStatus: 'FRAMEBUFFER_UNSUPPORTED' }
  ];

  for (const options of cases) {
    const { gl, device } = setup(options);
    const target = new OFRenderTarget(device, 64, 64, 'half-float');
    assert.equal(target.format, 'rgba8');
    assert.equal(lastCall(gl, 'texImage2D').args[7], 'UNSIGNED_BYTE');
  }
});

test('the half-float probe runs once per context', () => {
  const { gl } = setup({ extensions: halfFloatExtensions });

  assert.equal(OFDeviceCapabilities.supportsHalfFloatTarget(gl), true);
  const framebuffersMade = gl.callsTo('createFramebuffer').length;
  assert.equal(OFDeviceCapabilities.supportsHalfFloatTarget(gl), true);
  assert.equal(gl.callsTo('createFramebuffer').length, framebuffersMade);
});

test('the pool reuses a released target of the same size and format', () => {
  const { device } = setup();
  const pool = new OFRenderTargetPool(device);

  const a = pool.acquire(128, 64);
  pool.release(a);
  const b = pool.acquire(128, 64);
  assert.equal(b, a);
  assert.equal(pool.count, 1);

  const c = pool.acquire(128, 64);
  assert.notEqual(c, a);
  const d = pool.acquire(64, 64);
  assert.notEqual(d, a);
  assert.equal(pool.count, 3);
  assert.equal(pool.inUseCount, 3);
});

test('a half-float request that fell back is found again by the same request, not by an RGBA8 one', () => {
  const { device } = setup();
  const pool = new OFRenderTargetPool(device);

  const half = pool.acquire(32, 32, 'half-float');
  assert.equal(half.format, 'rgba8');
  pool.release(half);
  assert.equal(pool.acquire(32, 32, 'half-float'), half);
  assert.notEqual(pool.acquire(32, 32, 'rgba8'), half);
});

test('trim deletes free targets idle for more than the limit, and keeps those in use', () => {
  const { gl, device } = setup();
  const pool = new OFRenderTargetPool(device);

  const kept = pool.acquire(16, 16);
  const freed = pool.acquire(32, 32);
  pool.release(freed);

  for (let i = 0; i < 60; i++) { pool.endFrame(); }
  pool.trim(60);
  assert.equal(pool.count, 2);

  pool.endFrame();
  pool.trim(60);
  assert.equal(pool.count, 1);
  assert.equal(freed.isDestroyed, true);
  assert.equal(kept.isDestroyed, false);
  assert.equal(gl.callsTo('deleteFramebuffer').length, 1);
});

test('the same sizes acquired and released every frame keep the pool count stable', () => {
  const { device } = setup();
  const pool = new OFRenderTargetPool(device);

  for (let frame = 0; frame < 100; frame++) {
    const targets = [pool.acquire(400, 300), pool.acquire(200, 150), pool.acquire(100, 75)];
    targets.forEach((target) => pool.release(target));
    pool.endFrame();
    pool.trim();
  }
  assert.equal(pool.count, 3);
  assert.equal(pool.inUseCount, 0);
});

test('releasing unbinds a target left bound', () => {
  const { device } = setup();
  const pool = new OFRenderTargetPool(device);
  const target = pool.acquire(16, 16);

  target.bind();
  pool.release(target);
  assert.equal(device.currentFramebuffer, null);
  assert.equal(device.renderTargetDepth, 0);
});
