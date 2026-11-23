// Shared helpers for the node:test suites. They run against the compiled lib (npm test builds first).

/** Runs fn and returns everything written to console.log/info/warn/error meanwhile. */
function captureConsole(fn) {
  const lines = [];
  const methods = ['log', 'info', 'warn', 'error'];
  const originals = methods.map((m) => console[m]);
  methods.forEach((m) => { console[m] = (...args) => lines.push({ level: m, text: args.join(' ') }); });
  try {
    fn();
  } finally {
    methods.forEach((m, i) => { console[m] = originals[i]; });
  }
  return lines;
}

module.exports = { captureConsole };
