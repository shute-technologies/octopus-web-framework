// A WebGL stand-in for the render tests. Every method call is recorded in `calls`. Constants
// (upper-case names such as TEXTURE3 or ELEMENT_ARRAY_BUFFER) read as their own name.
// `attribLocations` maps attribute names to the location getAttribLocation returns (default 0).

function createFakeGL(attribLocations = {}) {
  const calls = [];
  const target = {
    calls,
    attribLocations,
    callsTo(name) { return calls.filter((c) => c.name === name); },
    getUniformLocation(program, name) { calls.push({ name: 'getUniformLocation', args: [program, name] }); return `loc:${name}`; },
    getAttribLocation(program, name) {
      calls.push({ name: 'getAttribLocation', args: [program, name] });
      return name in target.attribLocations ? target.attribLocations[name] : 0;
    },
    createTexture() { calls.push({ name: 'createTexture', args: [] }); return { texture: calls.length }; },
    uniformMatrix4fv(location, transpose, matrix) {
      // Copy: callers may legitimately reuse the array after the call, as WebGL itself copies it.
      calls.push({ name: 'uniformMatrix4fv', args: [location, transpose, Array.from(matrix)] });
    },
    bufferData(target, data, usage) { calls.push({ name: 'bufferData', args: [target, Array.from(data), usage] }); }
  };

  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) { return obj[prop]; }
      if (typeof prop === 'string' && /^[A-Z0-9_]+$/.test(prop)) { return prop; }
      return (...args) => { calls.push({ name: prop, args }); };
    }
  });
}

module.exports = { createFakeGL };

/**
 * A real OFGraphicDevice over `gl`. Its constructor needs a running framework, so the state the
 * render path reads is set directly. `deviceCamera` is what its render camera returns (as a fresh
 * copy, like OFRenderCamera).
 */
function makeGraphicDevice(lib, gl, deviceCamera) {
  const { mat4 } = require('gl-matrix');
  const cameraMatrix = deviceCamera || mat4.create();

  return Object.assign(Object.create(lib.OFGraphicDevice.prototype), {
    _graphicContext: gl,
    _renderCamera: { get transformedMatrix() { return mat4.clone(cameraMatrix); } },
    _enabledVertexAttributes: new Set(),
    // Field initializers do not run on a device made with Object.create.
    elapsedSeconds: 0,
    currentViewport: { x: 0, y: 0, width: 0, height: 0 },
    sharedUniforms: new Map()
  });
}

module.exports.makeGraphicDevice = makeGraphicDevice;

/**
 * A real OFShaderAbstract on top of the fake GL. `uniforms` is a list of [inputName, OFEnumShaderDataTypes, inputGLSLType?].
 * `deviceCamera` is what the device's render camera returns (as a fresh copy, like OFRenderCamera).
 * `options.attributes`: [inputName, OFEnumShaderDataTypes] pairs (default: one Vector3 aVertexPosition).
 * `options.graphicDevice`: a device shared with other shaders; its gl is used.
 */
function makeAbstractShader(lib, uniforms, deviceCamera, options = {}) {
  const { OFShaderAbstract, OFEnumShaderDataTypes } = lib;
  const graphicDevice = options.graphicDevice || makeGraphicDevice(lib, createFakeGL(), deviceCamera);
  const gl = graphicDevice.graphicContext;
  const attributes = options.attributes || [['aVertexPosition', OFEnumShaderDataTypes.Vector3]];
  const shaderFactory = { graphicDevice, instanceShader: () => ({ program: 'p' }) };
  const shaderCodeInfo = {
    attributeCount: attributes.length,
    attributes: attributes.map(([inputName, inputVariableType]) => ({ inputName, inputVariableType })),
    uniformCount: uniforms.length,
    uniforms: uniforms.map(([inputName, inputVariableType, inputGLSLType]) => ({ inputName, inputVariableType, inputGLSLType }))
  };

  return { shader: new OFShaderAbstract(shaderFactory, {}, shaderCodeInfo), gl, graphicDevice };
}

module.exports.makeAbstractShader = makeAbstractShader;
