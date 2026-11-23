const test = require('node:test');
const assert = require('node:assert/strict');
const { mat4 } = require('gl-matrix');
const lib = require('../lib/index.js');
const { makeAbstractShader } = require('./fake-webgl');

const { OFPrimitiveQuad, OFPrimitiveCircle, OFPrimitiveGrid, OFEnumShaderDataTypes } = lib;
const translation = (x, y) => mat4.fromTranslation(mat4.create(), [x, y, 0]);

// The constructors need a running framework; build the drawing state directly, with the kind of
// 'ShaderPrimitive' a host registers from source (an OFShaderAbstract).
function makePrimitive(PrimitiveClass, overrides = {}) {
  const { shader, gl } = makeAbstractShader(lib, [
    ['uMVP', OFEnumShaderDataTypes.ICamera],
    ['uColor', OFEnumShaderDataTypes.IColor]
  ]);
  const primitive = Object.create(PrimitiveClass.prototype);
  Object.assign(primitive, {
    _shader: shader,
    _color: { r: 1, g: 0.5, b: 0, a: 1 },
    _vboObject: { vbo: 'vbo' },
    _iboObject: { vbo: 'ibo' },
    _triangleRenderType: 'LINES',
    _drawingCount: 8,
    _transformation: null,
    _otherTransformation: mat4.create(),
    x: 100, y: 50, z: 0, offsetX: 5, offsetY: 7, rotation: 0, scaleX: 1, scaleY: 1
  }, overrides);
  return { primitive, gl };
}

for (const PrimitiveClass of [OFPrimitiveQuad, OFPrimitiveCircle, OFPrimitiveGrid]) {
  const name = PrimitiveClass.name;

  test(`${name}.update draws with an abstract shader: buffers, colour, placement`, () => {
    const { primitive, gl } = makePrimitive(PrimitiveClass);

    primitive.update({ dt: 0.016 });

    assert.deepEqual(gl.callsTo('drawElements').map((c) => c.args), [['LINES', 8, 'UNSIGNED_SHORT', 0]]);
    assert.ok(gl.callsTo('bindBuffer').some((c) => c.args[0] === 'ELEMENT_ARRAY_BUFFER' && c.args[1] === 'ibo'));
    assert.deepEqual(gl.callsTo('uniform4f').map((c) => c.args), [['loc:uColor', 1, 0.5, 0, 1]]);
    assert.deepEqual(gl.callsTo('uniformMatrix4fv')[0].args[2], Array.from(translation(105, 57)));
  });

  test(`${name}.update with a transformation matrix draws under it`, () => {
    const world = translation(300, 200);
    const { primitive, gl } = makePrimitive(PrimitiveClass, { _transformation: world });

    primitive.update({ dt: 0.016 });

    // The grid applies its offset in local space under a transformation; quad and circle do not
    // (unchanged from their OFShaderPrimitive branch).
    const expected = PrimitiveClass === OFPrimitiveGrid
      ? mat4.multiply(mat4.create(), world, translation(5, 7))
      : world;
    assert.equal(gl.callsTo('drawElements').length, 1);
    assert.deepEqual(gl.callsTo('uniformMatrix4fv')[0].args[2], Array.from(expected));
  });

  test(`${name}.update draws nothing when fully transparent`, () => {
    const { primitive, gl } = makePrimitive(PrimitiveClass, { _color: { r: 1, g: 1, b: 1, a: 0 } });

    primitive.update({ dt: 0.016 });

    assert.equal(gl.callsTo('drawElements').length, 0);
  });
}
