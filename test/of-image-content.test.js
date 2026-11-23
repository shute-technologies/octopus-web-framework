const test = require('node:test');
const assert = require('node:assert/strict');
const { OFImageContent } = require('../lib/index.js');
const { createFakeGL } = require('./fake-webgl');

test('loadFromImageHTML records the path without fetching it or allocating a spare texture', () => {
  const created = [];
  global.Image = class { constructor() { created.push(this); } };
  try {
    const gl = createFakeGL();
    const content = new OFImageContent({ framework: { mainGraphicDevice: { graphicContext: gl } } });
    const image = { width: 16, height: 8 };

    content.loadFromImageHTML(image, 'resources/hero.png');

    assert.equal(content.path, 'resources/hero.png');
    assert.equal(content.imageHTML, image);
    assert.equal(content.isLoaded, true);
    assert.equal(created.length, 0, 'no throwaway Image (and so no request for the path)');
    assert.equal(gl.callsTo('createTexture').length, 1, 'one texture, for the given image');
    assert.equal(gl.callsTo('texImage2D')[0].args[5], image);
  } finally {
    delete global.Image;
  }
});
