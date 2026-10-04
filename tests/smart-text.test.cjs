const { test } = require('node:test');
const assert = require('node:assert/strict');
const { suggestions, checkbox } = require('../src/shared/smart-text.js');
const now = new Date(2026, 9, 1, 12, 0);
test('Portuguese day and time produces precise local future dates', () => {
  for (const [text, day, hour, minute] of [['amanhã às 14h', 2, 14, 0], ['amanha as 14:30', 2, 14, 30], ['hoje às 13h05', 1, 13, 5], ['depois de amanhã às 9h', 3, 9, 0], ['05/10 às 14h30', 5, 14, 30]]) {
    const found = suggestions(text, now); assert.equal(found.length, 1, text);
    const date = new Date(found[0].due); assert.equal(date.getDate(), day); assert.equal(date.getHours(), hour); assert.equal(date.getMinutes(), minute);
  }
});
test('date parsing rejects missing hours, invalid dates, past times and code', () => {
  for (const text of ['amanhã', '14h', 'hoje às 10h', 'amanhã às 25h', 'amanhã às 14h65', '31/02/2027 às 14h', '```amanhã às 14h```']) assert.deepEqual(suggestions(text, now), [], text);
  assert.equal(suggestions('amanhã às 14h e amanhã às 14h', now).length, 1);
  const end = new Date(2026, 11, 31, 22);
  assert.equal(new Date(suggestions('amanhã às 14h', end)[0].due).getFullYear(), 2027);
});
test('checkbox shorthand recognizes line starts and preserves ordinary prose', () => {
  for (const text of ['[] comprar pão', '[ ] comprar pão', '[x] pronto', '- [ ] item']) assert.ok(checkbox(text));
  for (const text of ['array[]', 'um texto [] no meio', '\\[] literal', '[texto]']) assert.equal(checkbox(text), null);
});
