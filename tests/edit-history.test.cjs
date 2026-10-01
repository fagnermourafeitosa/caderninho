const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EditHistory } = require('../edit-history.js');
const value = body => ({ title: 'Note', body });
test('typing groups undo while checkbox changes remain separate', () => {
  let clock = 0; const history = new EditHistory(value(''), { now: () => clock });
  history.record(value('h'), 'body'); clock += 100; history.record(value('hello'), 'body');
  history.record(value('[ ] hello')); history.record(value('[x] hello'));
  assert.equal(history.step('undo').body, '[ ] hello'); assert.equal(history.step('undo').body, 'hello'); assert.equal(history.step('undo').body, '');
  assert.equal(history.step('redo').body, 'hello'); assert.equal(history.step('redo').body, '[ ] hello');
});
test('a new edit after undo clears redo and title edits do not group with body', () => {
  const history = new EditHistory(value('original'));
  history.record(value('new'), 'body'); history.record({ title: 'Renamed', body: 'new' }, 'title');
  assert.equal(history.step('undo').title, 'Note'); assert.equal(history.step('undo').body, 'original');
  history.record(value('different'), 'body'); assert.equal(history.step('redo'), null);
});
test('typing pauses and history limits keep bounded independent snapshots', () => {
  let clock = 0; const history = new EditHistory(value('0'), { now: () => clock, limit: 2 });
  for (let i = 1; i <= 3; i++) { clock += 1000; history.record(value(String(i)), 'body'); }
  assert.equal(history.step('undo').body, '2'); assert.equal(history.step('undo').body, '1'); assert.equal(history.step('undo'), null);
});
