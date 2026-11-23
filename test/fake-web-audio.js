// A minimal Web Audio stand-in that records the graph, for the audio tests.

class FakeAudioNode {
  constructor(context, kind) {
    this.context = context;
    this.kind = kind;
    this.outputs = new Set();
    this.disconnectCount = 0;
  }
  connect(target) { this.outputs.add(target); return target; }
  disconnect() { this.outputs.clear(); this.disconnectCount++; }
}

class FakeGainNode extends FakeAudioNode {
  constructor(context) { super(context, 'gain'); this.gain = { value: 1 }; }
}

class FakeStereoPannerNode extends FakeAudioNode {
  constructor(context) { super(context, 'stereoPanner'); this.pan = { value: 0 }; }
}

class FakePannerNode extends FakeAudioNode {
  constructor(context) { super(context, 'panner'); this.panningModel = 'HRTF'; this.position = null; }
  setPosition(x, y, z) { this.position = [x, y, z]; }
}

class FakeAudioContext {
  constructor({ stereoPanner = true } = {}) {
    this.currentTime = 0;
    this.destination = new FakeAudioNode(this, 'destination');
    this.created = { gain: 0, stereoPanner: 0, panner: 0 };
    if (!stereoPanner) { this.createStereoPanner = undefined; }
  }
  createGain() { this.created.gain++; return new FakeGainNode(this); }
  createStereoPanner() { this.created.stereoPanner++; return new FakeStereoPannerNode(this); }
  createPanner() { this.created.panner++; return new FakePannerNode(this); }
  createBufferSource() { return new FakeAudioNode(this, 'source'); }
}

/** True when `to` is reachable from `from` by following connections. */
function reaches(from, to, seen = new Set()) {
  if (from === to) { return true; }
  if (seen.has(from)) { return false; }
  seen.add(from);
  for (const next of from.outputs) {
    if (reaches(next, to, seen)) { return true; }
  }
  return false;
}

/**
 * Installs a fake `window.AudioContext` and returns a factory for initialised OFAudioDevice
 * instances, each with its own context.
 */
function makeAudioDeviceFactory(OFAudioDevice, contextOptions) {
  global.window = global.window || {};
  return () => {
    global.window.AudioContext = function () { return new FakeAudioContext(contextOptions); };
    global.AudioContext = global.window.AudioContext;
    const device = new OFAudioDevice({ frameworkIdentifier: 0 });
    device.initialize();
    return device;
  };
}

module.exports = { FakeAudioContext, reaches, makeAudioDeviceFactory };
