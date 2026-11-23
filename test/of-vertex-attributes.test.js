const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');
const { createFakeGL, makeGraphicDevice, makeAbstractShader } = require('./fake-webgl');

const { OFShaderTexture, OFShaderPrimitive, OFEnumShaderDataTypes } = lib;
const { Vector2, Vector3, Vector4, ICamera } = OFEnumShaderDataTypes;

// Built-in shaders on one device and context, with the locations a browser typically assigns.
function makeScene() {
  const gl = createFakeGL({ aVertexPosition: 0, aTextureCoord: 1 });
  const graphicDevice = makeGraphicDevice(lib, gl);
  const shaderFactory = { graphicDevice, instanceShader: () => ({ program: 'p' }) };
  return { gl, graphicDevice, shaderFactory };
}

const indexOfCall = (gl, name, from = 0) => gl.calls.findIndex((c, i) => i >= from && c.name === name);
const argsOf = (gl, name) => gl.callsTo(name).map((c) => c.args);

test('useVertexAttributes enables the locations it is given and skips inactive ones (-1)', () => {
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.useVertexAttributes([0, -1, 2]);

  assert.deepEqual(argsOf(gl, 'enableVertexAttribArray'), [[0], [2]]);
  assert.deepEqual(argsOf(gl, 'disableVertexAttribArray'), []);
});

test('useVertexAttributes disables what an earlier draw enabled and this one does not read', () => {
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.useVertexAttributes([0, 1]);
  device.useVertexAttributes([0]);
  device.useVertexAttributes([0]);

  // Disabled once: the second [0] has nothing left to disable.
  assert.deepEqual(argsOf(gl, 'disableVertexAttribArray'), [[1]]);
});

test('a position-only primitive draw after a textured draw disables the texture coordinates first', () => {
  const { gl, shaderFactory } = makeScene();
  const texture = new OFShaderTexture(shaderFactory, {});
  const primitive = new OFShaderPrimitive(shaderFactory, {});

  texture.draw({}, 'texture', 'texturedVbo');
  const primitiveStart = gl.calls.length;
  primitive.draw({}, 'vbo', 'ibo', 'LINES', 8);

  const disabled = indexOfCall(gl, 'disableVertexAttribArray', primitiveStart);
  assert.deepEqual(gl.calls[disabled].args, [1]);
  assert.ok(disabled < indexOfCall(gl, 'drawElements', primitiveStart), 'disabled before the draw');
});

test('an abstract shader that reads only positions disables what a textured draw left enabled', () => {
  // The collider outlines: the host registers its primitive shader from source (OFShaderAbstract).
  const { gl, graphicDevice, shaderFactory } = makeScene();
  const texture = new OFShaderTexture(shaderFactory, {});
  const { shader: outline } = makeAbstractShader(lib, [['uMVP', ICamera]], null, { graphicDevice });

  texture.drawElements({}, 'texture', 'ibo', 'texturedVbo', 6);
  const outlineStart = gl.calls.length;
  outline.draw({ hasCustomCamera: false }, 'vbo', null, 'LINES', 'ibo', 8);

  const disabled = indexOfCall(gl, 'disableVertexAttribArray', outlineStart);
  assert.deepEqual(gl.calls[disabled].args, [1]);
  assert.ok(disabled < indexOfCall(gl, 'drawElements', outlineStart), 'disabled before the draw');
});

test('a textured draw after a position-only draw enables the texture coordinates again', () => {
  const { gl, shaderFactory } = makeScene();
  const texture = new OFShaderTexture(shaderFactory, {});
  const primitive = new OFShaderPrimitive(shaderFactory, {});

  texture.draw({}, 'texture', 'vboA');
  primitive.draw({}, 'vbo', 'ibo', 'LINES', 8);
  const secondTextureStart = gl.calls.length;
  texture.draw({}, 'texture', 'vboB');

  const enabledAgain = gl.calls.slice(secondTextureStart).filter((c) => c.name === 'enableVertexAttribArray');
  assert.deepEqual(enabledAgain.map((c) => c.args), [[0], [1]]);
});

test('an abstract shader never points an inactive attribute, and keeps the interleaved offsets', () => {
  const gl = createFakeGL({ aVertexPosition: 0, aUnused: -1, aColor: 2 });
  const graphicDevice = makeGraphicDevice(lib, gl);
  const { shader } = makeAbstractShader(lib, [['uMVP', ICamera]], null, {
    graphicDevice,
    attributes: [['aVertexPosition', Vector3], ['aUnused', Vector2], ['aColor', Vector4]]
  });

  shader.draw({ hasCustomCamera: false }, 'vbo', null, 'TRIANGLES', 'ibo', 6);

  assert.deepEqual(argsOf(gl, 'enableVertexAttribArray'), [[0], [2]]);
  // stride 12 + 8 + 16 = 36; aColor starts after position and the inactive vec2 (12 + 8)
  assert.deepEqual(argsOf(gl, 'vertexAttribPointer'), [
    [0, 3, 'FLOAT', false, 36, 0],
    [2, 4, 'FLOAT', false, 36, 20]
  ]);
});
