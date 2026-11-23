const test = require('node:test');
const assert = require('node:assert/strict');
const { OFConsole, OFFrameworkFactory, OFVector2, OFVector3 } = require('../lib/index.js');
const { captureConsole } = require('./helpers');

class SomeEngineClass {}

test('an instance caller prefixes its class name and fills the template', () => {
  const lines = captureConsole(() => OFConsole.log(new SomeEngineClass(), 'OF(id:{0})> loaded {1}', '0', 'a.png'));
  assert.deepEqual(lines, [{ level: 'log', text: 'SomeEngineClass-> OF(id:0)> loaded a.png' }]);
});

test('a class passed from static code prints its own name, not "Function"', () => {
  const lines = captureConsole(() => OFConsole.warn(SomeEngineClass, 'static {0}', 'x'));
  assert.deepEqual(lines, [{ level: 'warn', text: 'SomeEngineClass-> static x' }]);
});

test('a missing message does not throw', () => {
  assert.doesNotThrow(() => captureConsole(() => OFConsole.info(new SomeEngineClass())));
});

test('engine diagnostics are no longer "String-> 0": static call site', () => {
  const lines = captureConsole(() => OFFrameworkFactory.setCurrentFramework(-5));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, 'OFFrameworkFactory-> FrameworkFactory::setCurrentFramework index: -5 out of bounds.');
});

test('engine diagnostics are no longer "String-> 0": instance call sites', () => {
  const lines = captureConsole(() => {
    new OFVector2(0, 0).normalize();
    new OFVector3(0, 0, 0).normalize();
  });
  assert.deepEqual(lines.map((l) => l.text), [
    'OFVector2-> normalize> called on a zero-length vector.',
    'OFVector3-> normalize> called on a zero-length vector.'
  ]);
});
