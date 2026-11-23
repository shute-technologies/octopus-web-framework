const test = require('node:test');
const assert = require('node:assert/strict');
const { OFPolygonBatcher } = require('../lib/index.js');
const { createFakeGL } = require('./fake-webgl');

// The constructor needs a running framework; the batching state is all these tests touch.
function makeBatcher() {
  const batcher = Object.create(OFPolygonBatcher.prototype);
  batcher._GL = createFakeGL();
  batcher._vBOObject = { vbo: 'vbo' };
  batcher._iBOObject = { vbo: 'ibo' };
  batcher.beginDraw();
  return batcher;
}

// 4 vertices x 8 floats (position 2, colour 4, uv 2).
const quadVertices = () => new Array(32).fill(0).map((_, i) => i);
const quadIndices = [0, 1, 2, 2, 1, 3];

test('pushPolygon rebases the incoming indices onto the batch', () => {
  const batcher = makeBatcher();

  batcher.pushPolygon(quadVertices(), quadIndices);
  batcher.pushPolygon(quadVertices(), quadIndices);

  assert.deepEqual(batcher._indices, [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
  assert.equal(batcher._indexCount, 12);
  assert.equal(batcher._vertexCount, 64);
});

test('endDraw uploads as many indices as draw() will ask for', () => {
  const batcher = makeBatcher();
  batcher.pushPolygon(quadVertices(), quadIndices);
  batcher.pushPolygon(quadVertices(), quadIndices);

  batcher.endDraw();

  const indexUpload = batcher._GL.callsTo('bufferData').find((c) => c.args[0] === 'ELEMENT_ARRAY_BUFFER');
  assert.ok(indexUpload, 'an index buffer is uploaded');
  assert.equal(indexUpload.args[1].length, batcher._indexCount);
  assert.deepEqual(indexUpload.args[1], [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
});

test('pushPolygon ignores missing input', () => {
  const batcher = makeBatcher();
  batcher.pushPolygon(null, quadIndices);
  batcher.pushPolygon(quadVertices(), null);
  assert.equal(batcher._indexCount, 0);
  assert.equal(batcher._vertexCount, 0);
});
