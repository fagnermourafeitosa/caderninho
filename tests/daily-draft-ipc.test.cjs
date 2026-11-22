const test = require('node:test');
const assert = require('node:assert/strict');
const { registerDailyDraft, CHANNELS } = require('../src/main/daily-draft/presentation/ipc.cjs');

// ipcMain stand-in: records handlers so tests can invoke them like the renderer would.
function harness() {
  const handlers = new Map(), calls = [], main = { webContents: {} };
  const useCases = {
    startDailyDraft: input => { calls.push(input); return { day: '2026-10-15', noteId: 'n1' }; },
    closePastDailyDrafts: () => { calls.push('close'); return { trashed: ['n0'] }; },
  };
  registerDailyDraft({ handle: (channel, handler) => handlers.set(channel, handler) }, { getWindow: () => main, useCases, state: () => ({ snapshot: true }) });
  const invoke = (channel, payload, sender = main.webContents) => handlers.get(channel)({ sender }, payload);
  return { handlers, calls, invoke };
}

test('the daily draft channels are registered once', () => {
  const { handlers } = harness();
  assert.deepEqual([...handlers.keys()], ['daily-draft:start', 'daily-draft:close-past-days']);
  assert.deepEqual(CHANNELS, ['daily-draft:start', 'daily-draft:close-past-days']);
});

test('starting the daily note answers with the note and the new snapshot', async () => {
  const { invoke, calls } = harness();
  assert.deepEqual(await invoke('daily-draft:start', 'notebook-1'), { day: '2026-10-15', noteId: 'n1', state: { snapshot: true } });
  assert.deepEqual(calls, [{ notebookId: 'notebook-1' }]);
});

test('other senders and malformed notebook ids are refused before the use case runs', async () => {
  const { invoke, calls } = harness();
  await assert.rejects(async () => invoke('daily-draft:start', 'notebook-1', { other: true }), /Caderno inválido/);
  for (const payload of [undefined, null, 5, '', '../x', { notebookId: 'a' }, 'a'.repeat(129)]) {
    await assert.rejects(async () => invoke('daily-draft:start', payload), /Caderno inválido/, JSON.stringify(payload));
  }
  assert.equal(calls.length, 0);
});

test('closing past days answers with the trashed notes and the new snapshot', async () => {
  const { invoke, calls } = harness();
  assert.deepEqual(await invoke('daily-draft:close-past-days'), { trashed: ['n0'], state: { snapshot: true } });
  assert.deepEqual(calls, ['close']);
});

test('closing past days refuses other senders and any payload before the use case runs', async () => {
  const { invoke, calls } = harness();
  await assert.rejects(async () => invoke('daily-draft:close-past-days', undefined, { other: true }), /Requisição inválida/);
  for (const payload of [null, 0, '', 'notebook-1', {}, []]) {
    await assert.rejects(async () => invoke('daily-draft:close-past-days', payload), /Requisição inválida/, JSON.stringify(payload));
  }
  assert.equal(calls.length, 0);
});
