const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');
const { OFDefaultShaderSources } = require('../lib/src/shute-technologies/modules/framework/default-assets/ofDefaultShaderSources.js');
const { makeAbstractShader, makeGraphicDevice, createFakeGL } = require('./fake-webgl');

const { OFEnumBlendMode, OFEnumShaderDataTypes, OFGraphicDevice, OFShaderAnalizer, OFShaderTexture,
  OFShaderPrimitive, OFOptSpriteBatcher } = lib;
const premultiply = [['uPremultiplyAlpha', OFEnumShaderDataTypes.IShared, OFEnumShaderDataTypes.Float]];
const draw = (shader) => shader.draw({}, 'vbo', null, 'TRIANGLES', 'ibo', 6);
const shared = (device) => device.sharedUniforms.get('uPremultiplyAlpha');
const mixLine = 'gl_FragColor.rgb *= mix(1.0, gl_FragColor.a, uPremultiplyAlpha);';

test('premultipliesFor is true for Multiply and Screen only', () => {
  assert.equal(OFGraphicDevice.premultiplyUniformName, 'uPremultiplyAlpha');
  assert.equal(OFGraphicDevice.premultipliesFor(OFEnumBlendMode.Alpha), false);
  assert.equal(OFGraphicDevice.premultipliesFor(OFEnumBlendMode.Additive), false);
  assert.equal(OFGraphicDevice.premultipliesFor(OFEnumBlendMode.Multiply), true);
  assert.equal(OFGraphicDevice.premultipliesFor(OFEnumBlendMode.Screen), true);
});

test('useBlendMode sets the shared premultiply value, also when the mode is unchanged', () => {
  const device = makeGraphicDevice(lib, createFakeGL());
  const expectations = [
    [OFEnumBlendMode.Multiply, 1], [OFEnumBlendMode.Multiply, 1], [OFEnumBlendMode.Alpha, 0],
    [OFEnumBlendMode.Alpha, 0], [OFEnumBlendMode.Screen, 1], [OFEnumBlendMode.Additive, 0]
  ];

  for (const [mode, value] of expectations) {
    device.useBlendMode(mode);
    assert.equal(shared(device), value, OFEnumBlendMode[mode]);
  }
});

test('the shared value is restored after resetStateCache and a changed mode', () => {
  const device = makeGraphicDevice(lib, createFakeGL());

  device.useBlendMode(OFEnumBlendMode.Multiply);
  device.sharedUniforms.set('uPremultiplyAlpha', 7);
  device.useBlendMode(OFEnumBlendMode.Multiply);

  assert.equal(shared(device), 1);
});

test('an OFShaderAbstract sends uPremultiplyAlpha 1 in Multiply and 0 in Alpha', () => {
  const { shader, gl } = makeAbstractShader(lib, premultiply);
  const sent = () => gl.callsTo('uniform1f').map((c) => c.args);

  shader.blendMode = OFEnumBlendMode.Multiply;
  draw(shader);
  shader.blendMode = OFEnumBlendMode.Alpha;
  draw(shader);

  assert.deepEqual(sent().map((a) => a[1]), [1, 0]);
});

test('the four default shaders declare uPremultiplyAlpha : Shared and apply it; the copy shader does not', () => {
  const names = ['SourcesShaderPrimitive', 'SourcesShaderTexture', 'SourcesSpineShaderTexture', 'SourcesTextShaderTexture'];

  for (const name of names) {
    const info = OFShaderAnalizer.analize(OFDefaultShaderSources[name].fragment);
    const input = info.uniforms.find((u) => u.inputName === 'uPremultiplyAlpha');

    assert.ok(input, name);
    assert.equal(input.inputVariableType, OFEnumShaderDataTypes.IShared, name);
    assert.equal(input.inputGLSLType, OFEnumShaderDataTypes.Float, name);
    assert.ok(OFDefaultShaderSources[name].fragment.includes(mixLine), name);
    assert.ok(!OFShaderAnalizer.sanitize(OFDefaultShaderSources[name].fragment).includes(': Shared'), name);
  }

  const copy = OFDefaultShaderSources.SourcesFullscreenCopy.fragment;
  assert.ok(!copy.includes('uPremultiplyAlpha'));
  assert.ok(!copy.includes('mix('));
});

for (const [name, Shader, drawIt] of [
  ['OFShaderTexture', OFShaderTexture, (s) => s.draw({}, 'tex', 'vbo')],
  ['OFShaderPrimitive', OFShaderPrimitive, (s) => s.draw({}, 'vbo', null, 'TRIANGLES', 3)]
]) {
  test(`${name} sends uPremultiplyAlpha per draw: 1 in Multiply, 0 in Alpha`, () => {
    const gl = createFakeGL();
    const graphicDevice = makeGraphicDevice(lib, gl);
    const shader = new Shader({ graphicDevice, instanceShader: () => ({ program: 'p' }) },
      OFDefaultShaderSources.SourcesShaderTexture);
    const sent = () => gl.callsTo('uniform1f').filter((c) => c.args[0] === 'loc:uPremultiplyAlpha').map((c) => c.args[1]);

    shader.blendMode = OFEnumBlendMode.Multiply;
    drawIt(shader);
    shader.blendMode = OFEnumBlendMode.Alpha;
    drawIt(shader);

    assert.deepEqual(sent(), [1, 0]);
  });
}

test('OFOptSpriteBatcher draws Alpha even when its shared shader was left Additive', () => {
  const { shader, gl } = makeAbstractShader(lib, [['uMVP', OFEnumShaderDataTypes.ICamera]]);
  const batcher = Object.create(OFOptSpriteBatcher.prototype);
  batcher._graphicContext = gl;
  batcher._shader = shader;
  batcher.color = lib.OFColor.white();
  batcher._spriteBatchRenderData = [{ vboObject: { vbo: 'vbo' }, iboObject: { vbo: 'ibo' }, indicesCount: 6, imageTexture: 'tex' }];
  shader.setColorByIndex = () => {};
  shader.setTextureByIndex = () => {};
  shader.blendMode = OFEnumBlendMode.Additive;

  assert.equal(OFOptSpriteBatcher.prototype.blendMode, undefined);
  batcher.blendMode = OFEnumBlendMode.Alpha;
  batcher.draw({}, null);

  assert.equal(shader.blendMode, OFEnumBlendMode.Alpha);
  assert.deepEqual(gl.callsTo('blendFunc').map((c) => c.args), [['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA']]);
  assert.equal(gl.callsTo('blendFuncSeparate').length, 0);
});
