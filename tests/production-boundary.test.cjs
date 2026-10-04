const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = path.join(__dirname, '..', 'src');
// Vendored third-party builds (copied from node_modules, git-ignored) are not app code.
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? (entry.name === 'vendor' ? [] : files(path.join(dir, entry.name))) : [path.join(dir, entry.name)]);

test('the app has no smoke-test mode: the runner builds its own sandbox from outside', () => {
  const offenders = files(SOURCE).filter(file => /smoke/i.test(fs.readFileSync(file, 'utf8'))).map(file => path.relative(SOURCE, file));
  assert.deepEqual(offenders, []);
});
