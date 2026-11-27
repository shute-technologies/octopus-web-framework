// The GL state the device and the shaders skip setting when unchanged (1.7.0): the program, the bound
// buffers, the enabled vertex attribute arrays, and the `: Camera` / `: Time` / `: Viewport` uniforms.
// Each test counts the fake context's calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const { mat4 } = require('gl-matrix');
const lib = require('../lib/index.js');
const { createFakeGL, makeGraphicDevice, makeAbstractShader } = require('./fake-webgl');

const { OFGraphicDevice, OFPolygonBatcher, OFShaderTexture, OFShaderPrimitive, OFEnumShaderDataTypes, OFVBOObject } = lib;
const { ICamera, ITime, IViewport, Vector2, Vector4 } = OFEnumShaderDataTypes;

const count = (gl, name) => gl.callsTo(name).length;
const argsOf = (gl, name) => gl.callsTo(name).map((c) => c.args);
const spineAttributes = [['aVertexPosition', Vector2], ['aVertexColor', Vector4], ['aTextureCoord', Vector2]];

// One device and context, with shaders on it. Locations as a browser assigns them.
function makeScene(uniforms = [['uMVP', ICamera]], deviceCamera) {
  const gl = createFakeGL({ aVertexPosition: 0, aVertexColor: 1, aTextureCoord: 2 });
  const graphicDevice = makeGraphicDevice(lib, gl, deviceCamera);
  const shader = (u = uniforms) => makeAbstractShader(lib, u, null, { graphicDevice, attributes: spineAttributes }).shader;
  return { gl, graphicDevice, shader };
}

const draw = (shader, vbo = 'vbo', ibo = 'ibo', args = { hasCustomCamera: false }) =>
  shader.draw(args, vbo, null, 'TRIANGLES', ibo, 6);

test('two draws with the same shader and buffers: one useProgram, one bind of each buffer, one enable per array, one camera upload', () => {
  const { gl, shader } = makeScene();
  const sprite = shader();
  gl.calls.length = 0;

  draw(sprite);
  draw(sprite);

  assert.equal(count(gl, 'useProgram'), 1);
  assert.deepEqual(argsOf(gl, 'bindBuffer'), [['ARRAY_BUFFER', 'vbo'], ['ELEMENT_ARRAY_BUFFER', 'ibo']]);
  assert.deepEqual(argsOf(gl, 'enableVertexAttribArray'), [[0], [1], [2]]);
  assert.equal(count(gl, 'uniformMatrix4fv'), 1);
  assert.equal(count(gl, 'drawElements'), 2);
  // The attribute pointers are set on every draw: not cached.
  assert.equal(count(gl, 'vertexAttribPointer'), 6);
});

test('after resetStateCache() the next draw sets the program, buffers, arrays, camera and blend again', () => {
  const { gl, graphicDevice, shader } = makeScene();
  const sprite = shader();
  draw(sprite);
  gl.calls.length = 0;

  graphicDevice.resetStateCache();
  draw(sprite);

  assert.equal(count(gl, 'useProgram'), 1);
  assert.deepEqual(argsOf(gl, 'bindBuffer'), [['ARRAY_BUFFER', 'vbo'], ['ELEMENT_ARRAY_BUFFER', 'ibo']]);
  assert.deepEqual(argsOf(gl, 'enableVertexAttribArray'), [[0], [1], [2]]);
  assert.equal(count(gl, 'uniformMatrix4fv'), 1);
  assert.equal(count(gl, 'blendFunc'), 1);
});

test('a program switch and back: useProgram each time, and the camera is not sent again to a program that holds it', () => {
  const { gl, shader } = makeScene();
  const a = shader();
  const b = shader();
  gl.calls.length = 0;

  draw(a);
  draw(b);
  draw(a);

  assert.deepEqual(argsOf(gl, 'useProgram').map(([program]) => program), [a._shaderProgram, b._shaderProgram, a._shaderProgram]);
  // a and b once each: uniforms belong to the program, so a still holds its camera.
  assert.equal(count(gl, 'uniformMatrix4fv'), 2);
});

test('a camera that moved is sent again, to each program on its next draw', () => {
  const { gl, shader } = makeScene();
  const a = shader();
  const b = shader();
  const first = { hasCustomCamera: true, cameraMVP: mat4.create() };
  const moved = { hasCustomCamera: true, cameraMVP: mat4.fromTranslation(mat4.create(), [0.5, 0, 0]) };
  gl.calls.length = 0;

  draw(a, 'vbo', 'ibo', first);
  draw(b, 'vbo', 'ibo', first);
  draw(a, 'vbo', 'ibo', moved);
  draw(a, 'vbo', 'ibo', moved);
  draw(b, 'vbo', 'ibo', moved);

  const sent = gl.callsTo('uniformMatrix4fv').map((c) => c.args[2][12]);
  assert.deepEqual(sent, [0, 0, 0.5, 0.5]);
});

test('a shader whose world changes sends the camera on every draw, as before', () => {
  const { gl, shader } = makeScene();
  const sprite = shader();
  gl.calls.length = 0;

  sprite.setTranslate(1, 0, 0);
  draw(sprite);
  sprite.setTranslate(2, 0, 0);
  draw(sprite);

  assert.deepEqual(gl.callsTo('uniformMatrix4fv').map((c) => c.args[2][12]), [1, 2]);
});

test('Time and Viewport are sent when they change, not on every draw', () => {
  const { gl, graphicDevice, shader } = makeScene([['uMVP', ICamera], ['uTime', ITime], ['uView', IViewport]]);
  const sprite = shader();
  graphicDevice.elapsedSeconds = 0.1;
  graphicDevice.setViewport(0, 0, 640, 480);
  gl.calls.length = 0;

  draw(sprite);
  draw(sprite);
  graphicDevice.elapsedSeconds = 0.2;
  draw(sprite);
  graphicDevice.setViewport(10, 0, 320, 480);
  draw(sprite);
  draw(sprite);

  assert.deepEqual(argsOf(gl, 'uniform1f'), [['loc:uTime', 0.1], ['loc:uTime', 0.2]]);
  assert.deepEqual(argsOf(gl, 'uniform4f'), [['loc:uView', 0, 0, 640, 480], ['loc:uView', 10, 0, 320, 480]]);
});

test('a setter that writes a cached uniform by name makes the next draw send it again', () => {
  const { gl, graphicDevice, shader } = makeScene([['uMVP', ICamera], ['uTime', ITime]]);
  const sprite = shader();
  graphicDevice.elapsedSeconds = 3;
  draw(sprite);
  gl.calls.length = 0;

  sprite.setVector1Float('uTime', 99);
  draw(sprite);

  assert.deepEqual(argsOf(gl, 'uniform1f'), [['loc:uTime', 99], ['loc:uTime', 3]]);
});

test('updateShader makes a new program: the next draw switches to it and sends the camera again', () => {
  const { gl, shader } = makeScene();
  const sprite = shader();
  draw(sprite);
  const before = sprite._shaderProgram;
  gl.calls.length = 0;

  sprite.updateShader({}, sprite.shaderCodeInfo);
  draw(sprite);

  assert.notEqual(sprite._shaderProgram, before);
  assert.deepEqual(argsOf(gl, 'useProgram'), [[sprite._shaderProgram]]);
  assert.equal(count(gl, 'uniformMatrix4fv'), 1);
});

test('setters on the current program do not call useProgram again', () => {
  const { gl, shader } = makeScene([['uMVP', ICamera], ['uTint', OFEnumShaderDataTypes.IColor]]);
  const sprite = shader();
  draw(sprite);
  gl.calls.length = 0;

  sprite.setColorByIndex(0, lib.OFColor.white());
  sprite.setVector4Float('uTint', 1, 1, 1, 1);
  draw(sprite);

  assert.equal(count(gl, 'useProgram'), 0);
});

test('the built-in texture and primitive shaders switch programs through the device', () => {
  const gl = createFakeGL({ aVertexPosition: 0, aTextureCoord: 1 });
  const graphicDevice = makeGraphicDevice(lib, gl);
  let next = 0;
  const shaderFactory = { graphicDevice, instanceShader: () => ({ program: next++ }) };
  const texture = new OFShaderTexture(shaderFactory, {});
  const primitive = new OFShaderPrimitive(shaderFactory, {});
  gl.calls.length = 0;

  texture.draw({}, 'texture', 'vbo');
  texture.draw({}, 'texture', 'vbo');
  texture.drawElements({}, 'texture', 'ibo', 'vbo', 6);
  primitive.draw({}, 'vbo2', 'ibo2', 'LINES', 8);
  primitive.draw({}, 'vbo2', 'ibo2', 'LINES', 8);

  assert.deepEqual(argsOf(gl, 'useProgram'), [[texture._shaderProgram], [primitive._shaderProgram]]);
  assert.equal(graphicDevice.currentShaderProgram, primitive._shaderProgram);
  // drawElements no longer unbinds the buffers.
  assert.ok(!gl.callsTo('bindBuffer').some((c) => c.args[1] === null));
});

test('bindBuffer skips a buffer already bound to its target, and deleteBuffer forgets it', () => {
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.bindBuffer('ARRAY_BUFFER', 'a');
  device.bindBuffer('ARRAY_BUFFER', 'a');
  device.bindBuffer('ELEMENT_ARRAY_BUFFER', 'a2');
  device.bindBuffer('ELEMENT_ARRAY_BUFFER', 'a2');
  device.deleteBuffer('a');
  device.bindBuffer('ARRAY_BUFFER', 'a');

  assert.deepEqual(argsOf(gl, 'bindBuffer'), [['ARRAY_BUFFER', 'a'], ['ELEMENT_ARRAY_BUFFER', 'a2'], ['ARRAY_BUFFER', 'a']]);
  assert.deepEqual(argsOf(gl, 'deleteBuffer'), [['a']]);
});

test('a pooled VBO is deleted through the device, so its buffer is not taken for bound', () => {
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);
  const pooler = { graphicDeviceOptManager: { graphicDevice: device } };
  const vbo = new OFVBOObject(pooler);
  vbo.initialize(0);

  device.bindBuffer('ARRAY_BUFFER', vbo.vbo);
  vbo.destroy();
  device.bindBuffer('ARRAY_BUFFER', vbo.vbo);

  assert.equal(count(gl, 'deleteBuffer'), 1);
  assert.equal(count(gl, 'bindBuffer'), 2);
});

test('after resetStateCache() useVertexAttributes enables every location again, and still disables what is no longer read', () => {
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.useVertexAttributes([0, 1, 2]);
  device.useVertexAttributes([0, 1, 2]);
  device.resetStateCache();
  gl.calls.length = 0;
  device.useVertexAttributes([0]);

  assert.deepEqual(argsOf(gl, 'disableVertexAttribArray'), [[1], [2]]);
  assert.deepEqual(argsOf(gl, 'enableVertexAttribArray'), [[0]]);
});

test('useShaderProgram after resetStateCache() calls useProgram even for the same program', () => {
  const gl = createFakeGL();
  const device = makeGraphicDevice(lib, gl);

  device.useShaderProgram('p');
  device.useShaderProgram('p');
  device.resetStateCache();
  device.useShaderProgram('p');

  assert.equal(count(gl, 'useProgram'), 2);
  assert.equal(device.currentShaderProgram, 'p');
});

// ---- OFPolygonBatcher (O4) ----

// The constructor needs a running framework; the batching and drawing state is set directly.
function makeBatcher(scene, vbo = 'vbo', ibo = 'ibo') {
  const batcher = Object.create(OFPolygonBatcher.prototype);
  Object.assign(batcher, {
    _GL: scene.gl,
    _graphicDevice: scene.graphicDevice,
    _shader: scene.sprite,
    _vBOObject: { vbo },
    _iBOObject: { vbo: ibo },
    blendMode: lib.OFEnumBlendMode.Alpha
  });
  batcher.beginDraw();
  return batcher;
}

function makeBatchScene() {
  const scene = makeScene();
  scene.sprite = scene.shader();
  scene.gl.calls.length = 0;
  return scene;
}

const quad = (n = 1) => new Array(32 * n).fill(0).map((_, i) => i);
const quadIndices = [0, 1, 2, 2, 1, 3];
const uploads = (gl, name, target) => gl.callsTo(name).filter((c) => c.args[0] === target);

test('a batch within capacity reuses its typed arrays and updates the GPU buffers with bufferSubData', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);

  batcher.pushPolygon(quad(), quadIndices);
  batcher.pushPolygon(quad(), quadIndices);
  batcher.endDraw();
  const vertexArray = batcher._arrayBufferGPUVertex;
  const indexArray = batcher._arrayBufferGPUIndex;

  batcher.beginDraw();
  batcher.pushPolygon(quad(), quadIndices);
  batcher.endDraw();

  const { gl } = scene;
  assert.equal(batcher._arrayBufferGPUVertex, vertexArray, 'no new Float32Array');
  assert.equal(batcher._arrayBufferGPUIndex, indexArray, 'no new Uint16Array');
  assert.equal(uploads(gl, 'bufferData', 'ARRAY_BUFFER').length, 1);
  assert.equal(uploads(gl, 'bufferData', 'ELEMENT_ARRAY_BUFFER').length, 1);
  assert.deepEqual(uploads(gl, 'bufferData', 'ELEMENT_ARRAY_BUFFER')[0].args[2], 'DYNAMIC_DRAW');
  const vertexUpdate = uploads(gl, 'bufferSubData', 'ARRAY_BUFFER');
  const indexUpdate = uploads(gl, 'bufferSubData', 'ELEMENT_ARRAY_BUFFER');
  assert.equal(vertexUpdate.length, 1);
  assert.equal(vertexUpdate[0].args[2].length, 32);
  assert.deepEqual(Array.from(indexUpdate[0].args[2]), quadIndices);
  // One bind each: the second batch found its buffers still bound.
  assert.deepEqual(argsOf(gl, 'bindBuffer'), [['ARRAY_BUFFER', 'vbo'], ['ELEMENT_ARRAY_BUFFER', 'ibo']]);
});

test('a batch beyond capacity grows the arrays and re-allocates the GPU buffers', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);

  batcher.pushPolygon(quad(), quadIndices);
  batcher.endDraw();
  batcher.beginDraw();
  for (let i = 0; i < 3; i++) { batcher.pushPolygon(quad(), quadIndices); }
  batcher.endDraw();

  const vertexData = uploads(scene.gl, 'bufferData', 'ARRAY_BUFFER');
  assert.equal(vertexData.length, 2);
  assert.ok(batcher._arrayBufferGPUVertex.length >= 96);
  assert.equal(vertexData[1].args[1].length, batcher._arrayBufferGPUVertex.length);
  assert.deepEqual(Array.from(batcher._arrayBufferGPUIndex.subarray(0, 18)),
    [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7, 8, 9, 10, 10, 9, 11]);
});

test('drawing a batch leaves its buffers bound, and the next draw binds nothing', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);
  batcher.pushPolygon(quad(), quadIndices);
  batcher.endDraw();

  batcher.draw({ hasCustomCamera: false });
  batcher.draw({ hasCustomCamera: false });

  const { gl } = scene;
  assert.ok(!gl.callsTo('bindBuffer').some((c) => c.args[1] === null), 'never unbound');
  assert.equal(count(gl, 'bindBuffer'), 2);
  assert.equal(count(gl, 'useProgram'), 1);
  assert.equal(count(gl, 'uniformMatrix4fv'), 1);
  assert.deepEqual(argsOf(gl, 'drawElements'), [['TRIANGLES', 6, 'UNSIGNED_SHORT', 0], ['TRIANGLES', 6, 'UNSIGNED_SHORT', 0]]);
});

test('pushQuads: a batch of quads uploads no indices and draws 6 per quad from the device\'s shared quad index buffer', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);

  batcher.pushQuads(quad(2), 2);
  batcher.pushQuads(quad(1), 1);
  batcher.endDraw();
  batcher.draw({ hasCustomCamera: false });

  const { gl, graphicDevice } = scene;
  const shared = graphicDevice.quadIndexBuffer();
  const indexData = uploads(gl, 'bufferData', 'ELEMENT_ARRAY_BUFFER');
  assert.equal(indexData.length, 1, 'only the shared buffer, once');
  assert.equal(indexData[0].args[1].length, OFGraphicDevice.maxQuadsPerDraw * 6);
  assert.deepEqual(indexData[0].args[1].slice(0, 12), [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
  assert.equal(indexData[0].args[2], 'STATIC_DRAW');
  assert.deepEqual(argsOf(gl, 'drawElements'), [['TRIANGLES', 18, 'UNSIGNED_SHORT', 0]]);
  assert.ok(gl.callsTo('bindBuffer').some((c) => c.args[0] === 'ELEMENT_ARRAY_BUFFER' && c.args[1] === shared));
  assert.ok(!gl.callsTo('bindBuffer').some((c) => c.args[1] === 'ibo'), 'the batcher\'s own index buffer is not used');
  assert.equal(uploads(gl, 'bufferData', 'ARRAY_BUFFER')[0].args[1].length, 96);
});

test('pushQuads: batchers on one device share one quad index buffer, built once', () => {
  const scene = makeBatchScene();
  const first = makeBatcher(scene, 'vboA', 'iboA');
  const second = makeBatcher(scene, 'vboB', 'iboB');

  for (const batcher of [first, second]) {
    batcher.pushQuads(quad(), 1);
    batcher.endDraw();
    batcher.draw({ hasCustomCamera: false });
  }

  assert.equal(count(scene.gl, 'createBuffer'), 1);
  assert.equal(uploads(scene.gl, 'bufferData', 'ELEMENT_ARRAY_BUFFER').length, 1);
});

test('pushQuads mixed with pushPolygon draws everything in the order pushed', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);

  batcher.pushPolygon(quad(), [0, 1, 2]);
  batcher.pushQuads(quad(), 1);
  batcher.pushPolygon(quad(), [3, 2, 1]);
  batcher.endDraw();
  batcher.draw({ hasCustomCamera: false });

  assert.equal(batcher._indexCount, 12);
  assert.deepEqual(uploads(scene.gl, 'bufferData', 'ELEMENT_ARRAY_BUFFER')[0].args[1],
    [0, 1, 2, 4, 5, 6, 6, 5, 7, 11, 10, 9]);
  assert.deepEqual(argsOf(scene.gl, 'drawElements'), [['TRIANGLES', 12, 'UNSIGNED_SHORT', 0]]);
});

test('pushQuads takes no more quads than the vertices hold, and ignores missing input', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);

  batcher.pushQuads(null, 3);
  batcher.pushQuads(quad(), 0);
  batcher.pushQuads(quad(1), 5);

  assert.equal(batcher._indexCount, 6);
  assert.equal(batcher._vertexCount, 32);
});

test('a quad batch takes Float32Array vertices, copying only the quads asked for', () => {
  const scene = makeBatchScene();
  const batcher = makeBatcher(scene);
  const vertices = new Float32Array(quad(3));

  batcher.pushQuads(vertices, 2);
  batcher.endDraw();

  const uploaded = uploads(scene.gl, 'bufferData', 'ARRAY_BUFFER')[0].args[1];
  assert.equal(uploaded.length, 64);
  assert.deepEqual(uploaded, Array.from(vertices.subarray(0, 64)));
});
