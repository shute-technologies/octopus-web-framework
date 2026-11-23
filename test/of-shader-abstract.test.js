const test = require('node:test');
const assert = require('node:assert/strict');
const { mat4 } = require('gl-matrix');
const lib = require('../lib/index.js');
const { makeAbstractShader } = require('./fake-webgl');

const { OFEnumShaderDataTypes } = lib;
const cameraUniforms = [['uMVP', OFEnumShaderDataTypes.ICamera]];
const translation = (x, y) => mat4.fromTranslation(mat4.create(), [x, y, 0]);
const uploadedMatrices = (gl) => gl.callsTo('uniformMatrix4fv').map((c) => c.args[2]);

test('draw leaves args.cameraMVP untouched', () => {
  const { shader } = makeAbstractShader(lib, cameraUniforms);
  const cameraMVP = mat4.fromScaling(mat4.create(), [2, 3, 1]);
  const before = Array.from(cameraMVP);
  const args = { hasCustomCamera: true, cameraMVP };

  shader.draw(args, 'vbo', translation(10, 0), 'TRIANGLES', 'ibo', 6);
  shader.draw(args, 'vbo', translation(0, 20), 'TRIANGLES', 'ibo', 6);

  assert.deepEqual(Array.from(cameraMVP), before);
});

test('every draw sharing one args object gets camera x its own transformation, not the previous ones', () => {
  const { shader, gl } = makeAbstractShader(lib, cameraUniforms);
  const cameraMVP = mat4.fromScaling(mat4.create(), [2, 3, 1]);
  const args = { hasCustomCamera: true, cameraMVP };
  const m1 = translation(10, 0);
  const m2 = translation(0, 20);

  shader.draw(args, 'vbo', m1, 'TRIANGLES', 'ibo', 6);
  shader.draw(args, 'vbo', m2, 'TRIANGLES', 'ibo', 6);

  const [first, second] = uploadedMatrices(gl);
  assert.deepEqual(first, Array.from(mat4.multiply(mat4.create(), cameraMVP, m1)));
  assert.deepEqual(second, Array.from(mat4.multiply(mat4.create(), cameraMVP, m2)));
});

test('without a transformation the shader world is used, against the device camera', () => {
  const deviceCamera = mat4.fromScaling(mat4.create(), [0.5, 0.5, 1]);
  const { shader, gl } = makeAbstractShader(lib, cameraUniforms, deviceCamera);

  shader.setTranslate(4, 5, 0);
  shader.draw({ hasCustomCamera: false }, 'vbo', null, 'TRIANGLES', 'ibo', 6);

  assert.deepEqual(uploadedMatrices(gl)[0], Array.from(mat4.multiply(mat4.create(), deviceCamera, translation(4, 5))));
});
