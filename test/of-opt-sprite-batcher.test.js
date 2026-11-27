const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/index.js');

const { OFOptSpriteBatcher } = lib;

// The constructor needs a running framework; end() only groups quads and hands each group to flush().
function makeBatcher() {
  const batcher = Object.create(OFOptSpriteBatcher.prototype);
  batcher.flushes = [];
  batcher.flush = (imageContent, vertices, indices, vertexCount, indicesCount) => {
    batcher.flushes.push({ imageContent, vertices, indices, vertexCount, indicesCount });
  };
  batcher._spriteQuadData = [];
  batcher._spriteBatchRenderData = [];
  batcher._alreadyTransformedForRender = false;
  return batcher;
}

function push(batcher, count, texture) {
  for (let i = 0; i < count; i++) {
    batcher.pushSprite(i, 0, 1, 1, null, { name: texture }, texture);
  }
}

test('end() makes one draw per texture, however many textures', () => {
  const batcher = makeBatcher();
  push(batcher, 3, 'a');
  push(batcher, 4, 'b');
  push(batcher, 2, 'c');

  batcher.end();

  assert.deepEqual(batcher.flushes.map((f) => [f.imageContent.name, f.vertexCount / 4]), [['a', 3], ['b', 4], ['c', 2]]);
});

test('end() groups interleaved textures and keeps push order inside a group', () => {
  const batcher = makeBatcher();
  batcher.pushSprite(1, 0, 1, 1, null, { name: 'b' }, 'b');
  batcher.pushSprite(2, 0, 1, 1, null, { name: 'a' }, 'a');
  batcher.pushSprite(3, 0, 1, 1, null, { name: 'b' }, 'b');

  batcher.end();

  assert.equal(batcher.flushes.length, 2);
  const b = batcher.flushes.find((f) => f.imageContent.name === 'b');
  // Each quad is 4 vertices of 5 floats; x is the first float of each quad.
  assert.deepEqual([b.vertices[0], b.vertices[20]], [1, 3]);
});

test('end() never puts more vertices in one draw than 16-bit indices address', () => {
  const batcher = makeBatcher();
  const max = OFOptSpriteBatcher.MaxVerticesPerDraw / 4;
  push(batcher, max + 10, 'a');

  batcher.end();

  assert.deepEqual(batcher.flushes.map((f) => f.vertexCount / 4), [max, 10]);
  for (const flush of batcher.flushes) {
    assert.ok(Math.max(...flush.indices) < 65536);
  }
});

test('end() with no quads draws nothing', () => {
  const batcher = makeBatcher();
  batcher.end();
  assert.equal(batcher.flushes.length, 0);
});
