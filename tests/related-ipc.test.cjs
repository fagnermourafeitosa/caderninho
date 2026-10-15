const test = require('node:test');
const assert = require('node:assert/strict');
const { registerRelated, CHANNELS } = require('../src/main/related/presentation/ipc.cjs');

// ipcMain stand-in: records handlers so tests can invoke them like the renderer would.
function harness() {
  const handlers = new Map(), calls = [], main = { webContents: {} };
  const view = { preferences: {}, model: {} };
  const record = name => input => { calls.push(input === undefined ? [name] : [name, input]); return name === 'queryRelated' ? { status: 'ready', results: [] } : view; };
  const useCases = Object.fromEntries(['queryRelated', 'readRelatedSettings', 'updateRelatedSettings', 'resetRelatedRanking', 'clearRelatedCache'].map(name => [name, record(name)]));
  registerRelated({ handle: (channel, handler) => handlers.set(channel, handler) }, { getWindow: () => main, useCases, retry: () => calls.push(['retry']), notify: () => calls.push(['notify']) });
  const invoke = (channel, payload, sender = main.webContents) => handlers.get(channel)({ sender }, payload);
  return { handlers, calls, invoke, view };
}

test('every related channel is registered once', () => {
  const { handlers } = harness();
  assert.deepEqual([...handlers.keys()].sort(), [...CHANNELS].sort());
  assert.deepEqual([...CHANNELS].sort(), ['related:query', 'related:retry', 'settings:related-clear', 'settings:related-read', 'settings:related-reset', 'settings:related-update']);
});

test('requests from anything but the app window are refused before any use case runs', async () => {
  const { invoke, calls } = harness();
  for (const channel of CHANNELS) await assert.rejects(async () => invoke(channel, { limit: 5 }, { other: true }));
  assert.equal(calls.length, 0);
});

test('queries need a note id; settings changes pass only known fields and tell the pages to refresh', async () => {
  const { invoke, calls, view } = harness();
  await assert.rejects(async () => invoke('related:query', '../x'));
  assert.deepEqual(await invoke('related:query', 'note-1'), { status: 'ready', results: [] });
  assert.equal(await invoke('settings:related-update', { limit: 5, sensitivity: 'strict' }), view);
  assert.equal(await invoke('settings:related-reset'), view);
  assert.equal(await invoke('settings:related-clear'), view);
  assert.equal(await invoke('settings:related-read'), view);
  await invoke('related:retry');
  assert.deepEqual(calls, [['queryRelated', 'note-1'], ['updateRelatedSettings', { limit: 5, sensitivity: 'strict' }], ['notify'], ['resetRelatedRanking'], ['notify'], ['clearRelatedCache'], ['notify'], ['readRelatedSettings'], ['retry']]);
});

test('malformed related settings are refused before any use case runs', async () => {
  const { invoke, calls } = harness();
  for (const payload of [undefined, null, 'x', [], {}, { limit: 5, extra: true }, { __proto__: { limit: 5 } }]) {
    await assert.rejects(async () => invoke('settings:related-update', payload), /Ajuste inválido/, JSON.stringify(payload));
  }
  assert.equal(calls.length, 0);
});
