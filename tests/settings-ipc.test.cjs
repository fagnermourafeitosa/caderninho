const test = require('node:test');
const assert = require('node:assert/strict');
const { registerSettings, CHANNELS } = require('../src/main/settings/presentation/ipc.cjs');

// ipcMain stand-in: records handlers so tests can invoke them like the renderer would.
function harness() {
  const handlers = new Map(), calls = [], updates = [], main = { webContents: {} };
  const view = { preferences: { keepOnTop: true }, sounds: [] };
  const useCases = {
    readSettings: () => { calls.push(['readSettings']); return view; },
    updateSettings: changes => { calls.push(['updateSettings', changes]); return view; },
    testAlertSound: () => { calls.push(['testAlertSound']); return true; },
    testNotification: () => { calls.push(['testNotification']); return true; },
    openNotificationSettings: async () => { calls.push(['openNotificationSettings']); return true; },
  };
  registerSettings({ handle: (channel, handler) => handlers.set(channel, handler) }, { getWindow: () => main, useCases, onUpdated: next => updates.push(next) });
  const invoke = (channel, payload, sender = main.webContents) => handlers.get(channel)({ sender }, payload);
  return { handlers, calls, updates, invoke, view };
}

test('every settings channel is registered once', () => {
  const { handlers } = harness();
  assert.deepEqual([...handlers.keys()].sort(), [...CHANNELS].sort());
  assert.deepEqual([...CHANNELS].sort(), ['settings:open-notifications', 'settings:read', 'settings:test-notification', 'settings:test-sound', 'settings:update']);
});

test('requests from anything but the app window are refused before any use case runs', async () => {
  const { invoke, calls } = harness();
  for (const channel of CHANNELS) await assert.rejects(async () => invoke(channel, { alertVolume: 50 }, { other: true }));
  assert.equal(calls.length, 0);
});

test('an update passes only the known fields to the use case and announces the new settings', async () => {
  const { invoke, calls, updates, view } = harness();
  assert.equal(await invoke('settings:update', { alertMode: 'sound', keepOnTop: true }), view);
  assert.deepEqual(calls, [['updateSettings', { alertMode: 'sound', keepOnTop: true }]]);
  assert.deepEqual(updates, [view]);
});

test('malformed updates are refused before any use case runs', async () => {
  const { invoke, calls, updates } = harness();
  for (const payload of [undefined, null, 'sound', [], {}, { volume: 50 }, { alertVolume: 50, extra: 1 }, { __proto__: { alertMode: 'sound' } }]) {
    await assert.rejects(async () => invoke('settings:update', payload), /Ajuste inválido/, JSON.stringify(payload));
  }
  assert.equal(calls.length, 0);
  assert.equal(updates.length, 0);
});

test('read, sound test and notification settings run their use cases', async () => {
  const { invoke, calls, view } = harness();
  assert.equal(await invoke('settings:read'), view);
  assert.equal(await invoke('settings:test-sound'), true);
  assert.equal(await invoke('settings:test-notification'), true);
  assert.equal(await invoke('settings:open-notifications'), true);
  assert.deepEqual(calls, [['readSettings'], ['testAlertSound'], ['testNotification'], ['openNotificationSettings']]);
});
