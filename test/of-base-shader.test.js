const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');
const { makeAbstractShader } = require('./fake-webgl');

const { OFEnumShaderDataTypes } = lib;

test('setTexture points the sampler at the texture unit it bound', () => {
  const { shader, gl } = makeAbstractShader(lib, [['uSecondTexture', OFEnumShaderDataTypes.Sampler2D]]);
  const texture = { id: 'secondary' };

  shader.setTexture('uSecondTexture', texture, 3);

  assert.deepEqual(gl.callsTo('activeTexture').map((c) => c.args[0]), ['TEXTURE3']);
  assert.deepEqual(gl.callsTo('bindTexture').map((c) => c.args[1]), [texture]);
  assert.deepEqual(gl.callsTo('uniform1i').map((c) => c.args), [['loc:uSecondTexture', 3]]);
});

test('setTexture on unit 0 still sets sampler 0', () => {
  const { shader, gl } = makeAbstractShader(lib, [['uMainTexture', OFEnumShaderDataTypes.Sampler2D]]);

  shader.setTexture('uMainTexture', { id: 'main' }, 0);

  assert.deepEqual(gl.callsTo('uniform1i').map((c) => c.args), [['loc:uMainTexture', 0]]);
});
