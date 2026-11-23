// A WebGL stand-in for the render tests. Every method call is recorded in `calls`. Constants
// (upper-case names such as TEXTURE3 or ELEMENT_ARRAY_BUFFER) read as their own name.

function createFakeGL() {
  const calls = [];
  const target = {
    calls,
    callsTo(name) { return calls.filter((c) => c.name === name); },
    getUniformLocation(program, name) { calls.push({ name: 'getUniformLocation', args: [program, name] }); return `loc:${name}`; },
    getAttribLocation(program, name) { calls.push({ name: 'getAttribLocation', args: [program, name] }); return 0; },
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
