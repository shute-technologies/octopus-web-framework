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

// The texture parameters the last upload set, by name ({ TEXTURE_MAG_FILTER: 'NEAREST', ... }).
function uploadedParams(gl) {
  const result = {};
  gl.callsTo('texParameteri').forEach((c) => { result[c.args[1]] = c.args[2]; });
  result.mipmaps = gl.callsTo('generateMipmap').length;
  return result;
}

function loadWith(params, image = { width: 16, height: 8 }) {
  const gl = createFakeGL();
  const content = new OFImageContent({ framework: { mainGraphicDevice: { graphicContext: gl } } });
  content.loadFromImageHTML(image, 'resources/hero.png', params);
  return { gl, content };
}

test('a host\'s camelCase settings apply, mag as mag and min as min (pixel art can be NEAREST)', () => {
  // The IDE passes its image resource, whose fields are camelCase.
  const { gl } = loadWith({ webGL_MagFilter: 'NEAREST', webGL_MinFilter: 'LINEAR', webGL_WrapS: 'REPEAT', webGL_WrapT: 'MIRRORED_REPEAT' });

  assert.deepEqual(uploadedParams(gl), {
    TEXTURE_MAG_FILTER: 'NEAREST', TEXTURE_MIN_FILTER: 'LINEAR', TEXTURE_WRAP_S: 'REPEAT', TEXTURE_WRAP_T: 'MIRRORED_REPEAT', mipmaps: 0
  });
});

test('the original PascalCase keys still work, no longer swapped', () => {
  const { gl } = loadWith({ WebGL_MagFilter: 'NEAREST', WebGL_MinFilter: 'LINEAR' });

  assert.equal(uploadedParams(gl).TEXTURE_MAG_FILTER, 'NEAREST');
  assert.equal(uploadedParams(gl).TEXTURE_MIN_FILTER, 'LINEAR');
});

test('without settings a texture is LINEAR, clamped and not mipmapped, as before', () => {
  const { gl } = loadWith(undefined);

  assert.deepEqual(uploadedParams(gl), {
    TEXTURE_MAG_FILTER: 'LINEAR', TEXTURE_MIN_FILTER: 'LINEAR', TEXTURE_WRAP_S: 'CLAMP_TO_EDGE', TEXTURE_WRAP_T: 'CLAMP_TO_EDGE', mipmaps: 0
  });
});

test('a non-power-of-two image is clamped and never mipmapped (WebGL 1 would draw it black)', () => {
  const { gl } = loadWith(
    { webGL_MinFilter: 'NEAREST_MIPMAP_LINEAR', webGL_WrapS: 'REPEAT', webGL_WrapT: 'REPEAT', generateMipMap: true },
    { width: 100, height: 64 });

  assert.deepEqual(uploadedParams(gl), {
    TEXTURE_MAG_FILTER: 'LINEAR', TEXTURE_MIN_FILTER: 'NEAREST', TEXTURE_WRAP_S: 'CLAMP_TO_EDGE', TEXTURE_WRAP_T: 'CLAMP_TO_EDGE', mipmaps: 0
  });
});

test('a mipmap min filter on a power-of-two image generates the mipmaps it needs', () => {
  const { gl } = loadWith({ webGL_MinFilter: 'LINEAR_MIPMAP_LINEAR' }, { width: 64, height: 32 });

  assert.equal(uploadedParams(gl).TEXTURE_MIN_FILTER, 'LINEAR_MIPMAP_LINEAR');
  assert.equal(uploadedParams(gl).mipmaps, 1);
});

test('asking for mipmaps with a plain min filter samples them with that filter\'s mipmap form', () => {
  assert.equal(uploadedParams(loadWith({ generateMipMap: true, webGL_MinFilter: 'NEAREST' }).gl).TEXTURE_MIN_FILTER, 'NEAREST_MIPMAP_NEAREST');
  assert.equal(uploadedParams(loadWith({ GenerateMipMap: true }).gl).TEXTURE_MIN_FILTER, 'LINEAR_MIPMAP_NEAREST');
});

test('changeProperties re-uploads with the new settings, read the same way', () => {
  const { gl, content } = loadWith(undefined);

  content.changeProperties({ webGL_MagFilter: 'NEAREST', webGL_MinFilter: 'NEAREST' });

  assert.equal(uploadedParams(gl).TEXTURE_MAG_FILTER, 'NEAREST');
  assert.equal(uploadedParams(gl).TEXTURE_MIN_FILTER, 'NEAREST');
});
