const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fontFile } = require('../src/main/system-fonts.cjs');

test('the font protocol serves only the declared New York files', () => {
  assert.equal(fontFile('caderno-font://new-york'), '/System/Library/Fonts/NewYork.ttf');
  assert.equal(fontFile('caderno-font://new-york/'), '/System/Library/Fonts/NewYork.ttf');
  assert.equal(fontFile('caderno-font://new-york-italic'), '/System/Library/Fonts/NewYorkItalic.ttf');
});

test('unknown hosts, paths and traversal resolve to nothing', () => {
  for (const url of ['caderno-font://sf-pro', 'caderno-font://new-york/../../etc/passwd', 'caderno-font://new-york/NewYork.ttf', 'caderno-media://new-york', 'not a url']) assert.equal(fontFile(url), null, url);
});
