const test = require('node:test');
const assert = require('node:assert/strict');
const { mat4 } = require('gl-matrix');
const lib = require('../lib/index.js');
const { OFDefaultShaderSources } = require('../lib/src/shute-technologies/modules/framework/default-assets/ofDefaultShaderSources');
const { makeAbstractShader } = require('./fake-webgl');

const { OFFullscreenPass, OFRenderTarget, OFEnumShaderDataTypes, OFEnumBlendMode, OFShaderAnalizer } = lib;

const vec3 = OFEnumShaderDataTypes.Vector3;
const vec2 = OFEnumShaderDataTypes.Vector2;
const attributes = [['aVertexPosition', vec3], ['aTextureCoord', vec2]];
const uniforms = [
  ['uWVPMatrix', OFEnumShaderDataTypes.ICamera],
  ['uSamplerTexture', OFEnumShaderDataTypes.ITexture, OFEnumShaderDataTypes.Sampler2D]
];

function setup(deviceCamera) {
  const { shader, gl, graphicDevice } = makeAbstractShader(lib, uniforms, deviceCamera, { attributes });
  const pass = new OFFullscreenPass(graphicDevice);
  gl.calls.length = 0;
  return { shader, gl, graphicDevice, pass };
}

test('the source texture is bound on unit 0 to the shader\'s first texture input', () => {
  const { shader, gl, pass } = setup();
  const texture = { texture: 'source' };

  pass.draw(shader, texture);

  const names = gl.calls.map((c) => c.name);
  assert.deepEqual(gl.callsTo('activeTexture')[0].args, ['TEXTURE0']);
  assert.deepEqual(gl.callsTo('bindTexture')[0].args, ['TEXTURE_2D', texture]);
  assert.deepEqual(gl.callsTo('uniform1i')[0].args, ['loc:uSamplerTexture', 0]);
  assert.ok(names.indexOf('bindTexture') < names.indexOf('drawArrays'));
});

test('a render target as the source binds its colour texture', () => {
  const { shader, gl, graphicDevice, pass } = setup();
  graphicDevice.setViewport(0, 0, 64, 64);
  const target = new OFRenderTarget(graphicDevice, 64, 64);
  gl.calls.length = 0;

  pass.draw(shader, target);

  assert.deepEqual(gl.callsTo('bindTexture')[0].args, ['TEXTURE_2D', target.texture]);
});

test('without a source the shader\'s textures are left as they are', () => {
  const { shader, gl, pass } = setup();

  pass.draw(shader);

  assert.equal(gl.callsTo('bindTexture').length, 0);
  assert.equal(gl.callsTo('drawArrays').length, 1);
});

test('the draw is 4 vertices of a clip-space quad, interleaved at 20 bytes, as a strip', () => {
  const { shader, gl, pass } = setup();

  pass.draw(shader, {});

  assert.deepEqual(gl.callsTo('drawArrays')[0].args, ['TRIANGLE_STRIP', 0, 4]);
  assert.equal(gl.callsTo('drawElements').length, 0);
  const data = gl.callsTo('bufferData')[0].args[1];
  assert.equal(data.length * 4, 4 * 20);
  assert.deepEqual(data, [-1, -1, 0, 0, 0, 1, -1, 0, 1, 0, -1, 1, 0, 0, 1, 1, 1, 0, 1, 1]);
  const pointers = gl.callsTo('vertexAttribPointer').map((c) => c.args);
  assert.deepEqual(pointers, [[0, 3, 'FLOAT', false, 20, 0], [0, 2, 'FLOAT', false, 20, 12]]);
});

test('the shader\'s blend mode is used', () => {
  const { shader, gl, pass } = setup();
  shader.blendMode = OFEnumBlendMode.Additive;

  pass.draw(shader, {});

  assert.deepEqual(gl.callsTo('blendFuncSeparate')[0].args, ['SRC_ALPHA', 'ONE', 'ONE', 'ONE_MINUS_SRC_ALPHA']);
});

test('the identity matrix is sent for the Camera input, whatever the device camera and shader world are; once, as the program keeps it', () => {
  const { shader, gl, pass } = setup(mat4.fromScaling(mat4.create(), [0.25, 0.5, 1]));
  shader.setTranslate(30, 40, 0);

  pass.draw(shader, {});
  pass.draw(shader, {});

  const sent = gl.callsTo('uniformMatrix4fv').map((c) => c.args[2]);
  assert.equal(sent.length, 1);
  for (const matrix of sent) { assert.deepEqual(matrix, Array.from(mat4.create())); }
});

test('the quad buffer is created once across draws, and the buffer bindings are cleared after each', () => {
  const { shader, gl, pass } = setup();

  pass.draw(shader, {});
  pass.draw(shader, {});

  assert.equal(gl.callsTo('createBuffer').length, 1);
  assert.equal(gl.callsTo('bufferData').length, 1);
  assert.equal(gl.callsTo('drawArrays').length, 2);
  assert.deepEqual(gl.callsTo('bindBuffer').slice(-1)[0].args, ['ARRAY_BUFFER', null]);
});

test('destroy frees the quad buffer, and a later draw makes a new one', () => {
  const { shader, gl, pass } = setup();

  pass.draw(shader, {});
  pass.destroy();
  pass.destroy();
  assert.equal(gl.callsTo('deleteBuffer').length, 1);

  pass.draw(shader, {});
  assert.equal(gl.callsTo('createBuffer').length, 2);
});

test('the copy shader source analyses to one Camera and one Texture input', () => {
  const source = OFDefaultShaderSources.SourcesFullscreenCopy;
  let info = OFShaderAnalizer.analize(source.vertex);
  info = OFShaderAnalizer.analize(source.fragment, info);

  const typesOf = (type) => info.uniforms.filter((u) => u.inputVariableType === type);
  assert.equal(info.uniformCount, 2);
  assert.equal(typesOf(OFEnumShaderDataTypes.ICamera).length, 1);
  assert.equal(typesOf(OFEnumShaderDataTypes.ITexture).length, 1);
  assert.deepEqual(info.attributes.map((a) => [a.inputName, a.inputVariableType]), [['aVertexPosition', vec3], ['aTextureCoord', vec2]]);
});

test('copyShader is built once from the copy source through the shader factory', () => {
  const { graphicDevice, pass } = setup();
  const calls = [];
  const shader = { name: 'copy' };
  graphicDevice._shaderFactory = {
    retrieveShader: () => undefined,
    loadAndAddShaderWithCodeInfo: (...args) => { calls.push(args); return shader; }
  };

  assert.equal(pass.copyShader, shader);
  assert.equal(pass.copyShader, shader);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'OFFullscreenCopy');
  assert.equal(calls[0][1], OFDefaultShaderSources.SourcesFullscreenCopy);
});

test('a source that is the render target being drawn to throws (feedback loop)', () => {
  const { shader, graphicDevice, pass } = setup();
  const target = new OFRenderTarget(graphicDevice, 64, 64);

  target.bind();
  assert.throws(() => pass.draw(shader, target), /feedback loop/);
  target.unbind();
  assert.doesNotThrow(() => pass.draw(shader, target));
});

test('a shader whose attributes are not a vec3 aVertexPosition and a vec2 aTextureCoord throws', () => {
  const wrong = [
    [['aVertexPosition', vec3]],
    [['aVertexPosition', vec3], ['aTextureCoord', vec2], ['aColor', OFEnumShaderDataTypes.Vector4]],
    [['aTextureCoord', vec2], ['aVertexPosition', vec3]],
    [['aVertexPosition', vec3], ['aTextureCoord', vec3]]
  ];

  for (const attrs of wrong) {
    const { shader, graphicDevice } = makeAbstractShader(lib, uniforms, undefined, { attributes: attrs });
    assert.throws(() => new OFFullscreenPass(graphicDevice).draw(shader, {}), /attributes/, JSON.stringify(attrs));
  }
});
