const test = require('node:test');
const assert = require('node:assert/strict');
const { OFAudioDevice, OFFramework, OFDeltaTimeCorrector } = require('../lib/index.js');
const { reaches, makeAudioDeviceFactory } = require('./fake-web-audio');
const { captureConsole } = require('./helpers');

const silently = (fn) => { let result; captureConsole(() => { result = fn(); }); return result; };
const newDevice = makeAudioDeviceFactory(OFAudioDevice);
const newDeviceWithoutStereoPanner = makeAudioDeviceFactory(OFAudioDevice, { stereoPanner: false });

function requestChain(device) {
  const gain = device.requestGainNode();
  gain.activate();
  const panner = device.requestStereoPannerNode();
  panner.activate();
  return { gain, panner };
}

// --- AUD-2: connectNodes ---------------------------------------------------------------------

test('connectNodes: source -> gain -> panner reaches the speakers through the master gain', () => {
  const device = silently(newDevice);
  const context = device.audioContext;
  const source = context.createBufferSource();
  const { gain, panner } = requestChain(device);

  OFAudioDevice.connectNodes(device, source, gain, panner);

  assert.ok(source.outputs.has(gain.webAudioNode));
  assert.ok(gain.webAudioNode.outputs.has(panner.webAudioNode));
  assert.ok(panner.webAudioNode.outputs.has(device.masterGainNode));
  assert.ok(device.masterGainNode.outputs.has(context.destination));
});

test('connectNodes with one node, and with none, still reaches the speakers', () => {
  const device = silently(newDevice);
  const context = device.audioContext;

  const one = context.createBufferSource();
  const gain = device.requestGainNode();
  gain.activate();
  OFAudioDevice.connectNodes(device, one, gain);
  assert.ok(reaches(one, context.destination));

  const none = context.createBufferSource();
  OFAudioDevice.connectNodes(device, none);
  assert.ok(reaches(none, context.destination));
});

test('connectNodes does not take a pooled gain node per call (no master gain leak)', () => {
  const device = silently(newDevice);
  const context = device.audioContext;
  const { gain, panner } = requestChain(device);
  const extra = device.requestGainNode();
  extra.activate();
  const gainsBefore = context.created.gain;

  // Three nodes: the shape that used to request (and never release) a pooled master gain per call.
  for (let i = 0; i < 50; i++) {
    OFAudioDevice.connectNodes(device, context.createBufferSource(), gain, panner, extra);
  }

  assert.equal(context.created.gain, gainsBefore);
});

test('masterVolume defaults to 0.1 and its setter drives the master gain', () => {
  const device = silently(newDevice);
  assert.equal(device.masterVolume, 0.1);
  assert.equal(device.masterGainNode.gain.value, 0.1);

  device.masterVolume = 0.75;
  assert.equal(device.masterVolume, 0.75);
  assert.equal(device.masterGainNode.gain.value, 0.75);
});

test('connectNodesNoMaster with one node reaches the destination directly', () => {
  const device = silently(newDevice);
  const context = device.audioContext;
  const source = context.createBufferSource();
  const gain = device.requestGainNode();
  gain.activate();

  OFAudioDevice.connectNodesNoMaster(device, source, gain);

  assert.ok(source.outputs.has(gain.webAudioNode));
  assert.ok(gain.webAudioNode.outputs.has(context.destination));
});

// --- AUD-12: the node pool -------------------------------------------------------------------

test('releaseNode and deactivate disconnect the node before it returns to the pool', () => {
  const device = silently(newDevice);
  const context = device.audioContext;
  const { gain, panner } = requestChain(device);
  context.createBufferSource().connect(gain.webAudioNode);
  gain.webAudioNode.connect(panner.webAudioNode);
  panner.webAudioNode.connect(context.destination);

  device.releaseNode(gain);
  panner.deactivate();

  assert.equal(gain.webAudioNode.outputs.size, 0);
  assert.equal(panner.webAudioNode.outputs.size, 0);
  assert.ok(gain.isAvailable);
});

test('a node that aged out and is handed out again is not destroyed while in use', () => {
  const device = silently(newDevice);
  const gain = device.requestGainNode();
  gain.activate();
  device.releaseNode(gain);

  // Idle for longer than a node's lifetime: this pass marks every free node for deletion, and
  // the next pass destroys whatever is still marked.
  device.update({ dt: 11 });
  assert.equal(gain.isWaitingForDelete, true);

  // Reused before the next sweep.
  const reused = device.requestGainNode();
  reused.activate();
  device.update({ dt: 0.016 });

  assert.ok(reused.webAudioNode, 'the node in use must keep its AudioNode');
  assert.equal(reused.isWaitingForDelete, false);
});

test('device.update ages idle nodes out of the pool', () => {
  const device = silently(newDevice);
  const gain = device.requestGainNode();
  gain.activate();
  device.releaseNode(gain);
  const node = gain.webAudioNode;

  device.update({ dt: 11 });  // marks
  device.update({ dt: 0.016 });  // sweeps

  assert.equal(gain.webAudioNode, null);
  assert.ok(node.disconnectCount >= 1);
});

test('device.update is safe when audio is not supported', () => {
  const device = new OFAudioDevice({ frameworkIdentifier: 0 });
  assert.doesNotThrow(() => device.update({ dt: 0.016 }));
});

test('OFFramework.update drives the audio pool', () => {
  const audioUpdates = [];
  const fakeFramework = {
    hasCanvas: true,
    frameworkIdentifier: 0,
    _deltaTimeCorrector: new OFDeltaTimeCorrector(),
    _graphicDeviceManager: { update() {} },
    _sceneManager: { update() {} },
    _audioDevice: { update: (args) => audioUpdates.push(args) }
  };

  silently(() => OFFramework.prototype.update.call(fakeFramework, { dt: 0.016 }));

  assert.equal(audioUpdates.length, 1);
  assert.equal(audioUpdates[0].framework, fakeFramework);
});

test('without createStereoPanner the panner falls back to an equal-power PannerNode with `pan`', () => {
  const device = silently(newDeviceWithoutStereoPanner);
  const context = device.audioContext;

  const panner = device.requestStereoPannerNode();
  panner.activate();
  assert.ok(panner.webAudioNode, 'the pooled node has an AudioNode');
  assert.equal(panner.webAudioNode.panningModel, 'equalpower');

  panner.webAudioNode.pan.value = 1;
  assert.equal(panner.webAudioNode.pan.value, 1);
  assert.deepEqual(panner.webAudioNode.position, [1, 0, 0]);
  panner.webAudioNode.pan.value = -5;
  assert.deepEqual(panner.webAudioNode.position, [-1, 0, 0]);

  const source = context.createBufferSource();
  OFAudioDevice.connectNodes(device, source, panner);
  assert.ok(reaches(source, context.destination));
});
