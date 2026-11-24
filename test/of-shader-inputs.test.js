const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');
const { makeAbstractShader } = require('./fake-webgl');

const { OFEnumShaderDataTypes: T, OFEnumShaderLiterals, OFShaderAnalizer, OFGraphicDevice, OFRenderCamera } = lib;
const draw = (shader) => shader.draw({}, 'vbo', null, 'TRIANGLES', 'ibo', 6);
const camera = ['uMVP', T.ICamera];

test('the new enum values are appended and nothing before them moved', () => {
  assert.equal(T.ITexture, 20);
  assert.equal(T.ITime, 21);
  assert.equal(T.IViewport, 22);
  assert.equal(T.IShared, 23);
  assert.equal(OFEnumShaderLiterals.DT_Time, 'TIME');
  assert.equal(OFEnumShaderLiterals.DT_Viewport, 'VIEWPORT');
  assert.equal(OFEnumShaderLiterals.DT_Shared, 'SHARED');
});

test('the analyzer reads : Time, : Viewport and : Shared and keeps their GLSL type', () => {
  const info = OFShaderAnalizer.analize([
    'uniform mat4 uMVP : Camera;',
    'uniform float uTime : Time;',
    'uniform vec4 uView : viewport;',
    'uniform sampler2D uLightMap : Shared;',
    'uniform vec3 uTint : Shared;',
    'uniform float uPlain;'
  ].join('\n'));
  const byName = Object.fromEntries(info.uniforms.map((u) => [u.inputName, u]));

  assert.equal(byName.uMVP.inputVariableType, T.ICamera);
  assert.equal(byName.uMVP.inputGLSLType, T.Matrix4);
  assert.equal(byName.uTime.inputVariableType, T.ITime);
  assert.equal(byName.uTime.inputGLSLType, T.Float);
  assert.equal(byName.uView.inputVariableType, T.IViewport);
  assert.equal(byName.uView.inputGLSLType, T.Vector4);
  assert.equal(byName.uLightMap.inputVariableType, T.IShared);
  assert.equal(byName.uLightMap.inputGLSLType, T.Sampler2D);
  assert.equal(byName.uTint.inputGLSLType, T.Vector3);
  assert.equal(byName.uPlain.inputGLSLType, undefined);
});

test('OFGraphicDevice.update accumulates args.dt into elapsedSeconds', () => {
  const device = Object.create(OFGraphicDevice.prototype);

  device.elapsedSeconds = 0;
  device.clear = () => {};
  device._renderCamera = { update() {} };
  device._deviceOptimizationManager = { update() {} };
  device.update({ dt: 0.25 });
  device.update({ dt: 0.5 });

  assert.equal(device.elapsedSeconds, 0.75);
});

test('a draw sends Time as uniform1f of elapsedSeconds', () => {
  const { shader, gl, graphicDevice } = makeAbstractShader(lib, [camera, ['uTime', T.ITime]]);

  graphicDevice.elapsedSeconds = 0.75;
  draw(shader);

  assert.deepEqual(gl.callsTo('uniform1f').map((c) => c.args), [['loc:uTime', 0.75]]);
});

test('a draw sends Viewport as uniform4f of currentViewport', () => {
  const { shader, gl, graphicDevice } = makeAbstractShader(lib, [camera, ['uView', T.IViewport]]);

  graphicDevice.setViewport(10, 20, 640, 480);
  draw(shader);

  assert.deepEqual(gl.callsTo('uniform4f').map((c) => c.args), [['loc:uView', 10, 20, 640, 480]]);
});

test('setViewport records currentViewport and calls gl.viewport', () => {
  const { gl, graphicDevice } = makeAbstractShader(lib, [camera]);

  graphicDevice.setViewport(1, 2, 3, 4);

  assert.deepEqual({ ...graphicDevice.currentViewport }, { x: 1, y: 2, width: 3, height: 4 });
  assert.deepEqual(gl.callsTo('viewport').map((c) => c.args), [[1, 2, 3, 4]]);
});

test('OFRenderCamera.setViewport goes through the device', () => {
  const { gl, graphicDevice } = makeAbstractShader(lib, [camera]);
  const renderCamera = Object.create(OFRenderCamera.prototype);

  renderCamera._graphicDevice = graphicDevice;
  renderCamera._isChildCamera = true;
  renderCamera._viewport = lib.OFViewport.empty();
  renderCamera.setViewport(0, 0, 800, 600);

  assert.deepEqual({ ...graphicDevice.currentViewport }, { x: 0, y: 0, width: 800, height: 600 });
  assert.deepEqual(gl.callsTo('viewport').map((c) => c.args), [[0, 0, 800, 600]]);
});

test('a shared texture binds to the unit after the shader own : Texture inputs', () => {
  const texture = { tex: 1 };
  const { shader, gl, graphicDevice } = makeAbstractShader(lib, [
    camera, ['uMain', T.ITexture, T.Sampler2D], ['uLightMap', T.IShared, T.Sampler2D]]);

  graphicDevice.sharedUniforms.set('uLightMap', texture);
  draw(shader);

  assert.deepEqual(gl.callsTo('activeTexture').map((c) => c.args), [['TEXTURE1']]);
  assert.deepEqual(gl.callsTo('bindTexture').map((c) => c.args), [['TEXTURE_2D', texture]]);
  assert.deepEqual(gl.callsTo('uniform1i').map((c) => c.args), [['loc:uLightMap', 1]]);
});

test('an absent shared value sends nothing', () => {
  const { shader, gl } = makeAbstractShader(lib, [
    camera, ['uLightMap', T.IShared, T.Sampler2D], ['uK', T.IShared, T.Float], ['uTint', T.IShared, T.Vector3]]);

  draw(shader);

  for (const name of ['activeTexture', 'bindTexture', 'uniform1i', 'uniform1f', 'uniform3fv']) {
    assert.equal(gl.callsTo(name).length, 0, name);
  }
});

test('shared Float and Vector values are sent by their GLSL type', () => {
  const { shader, gl, graphicDevice } = makeAbstractShader(lib, [
    camera, ['uK', T.IShared, T.Float], ['uV2', T.IShared, T.Vector2], ['uV3', T.IShared, T.Vector3],
    ['uV4', T.IShared, T.Vector4]]);

  graphicDevice.sharedUniforms.set('uK', 0.5);
  graphicDevice.sharedUniforms.set('uV2', [1, 2]);
  graphicDevice.sharedUniforms.set('uV3', [1, 2, 3]);
  graphicDevice.sharedUniforms.set('uV4', [1, 2, 3, 4]);
  draw(shader);

  assert.deepEqual(gl.callsTo('uniform1f').map((c) => c.args), [['loc:uK', 0.5]]);
  assert.deepEqual(gl.callsTo('uniform2fv').map((c) => c.args), [['loc:uV2', [1, 2]]]);
  assert.deepEqual(gl.callsTo('uniform3fv').map((c) => c.args), [['loc:uV3', [1, 2, 3]]]);
  assert.deepEqual(gl.callsTo('uniform4fv').map((c) => c.args), [['loc:uV4', [1, 2, 3, 4]]]);
});

test('a shader with none of the new inputs makes no extra GL calls', () => {
  const { shader, gl } = makeAbstractShader(lib, [camera]);

  draw(shader);

  for (const name of ['uniform1f', 'uniform4f', 'uniform1i', 'activeTexture', 'bindTexture', 'viewport']) {
    assert.equal(gl.callsTo(name).length, 0, name);
  }
});
