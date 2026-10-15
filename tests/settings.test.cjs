const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/main/store.cjs');
const { createSettingsUseCases } = require('../src/main/settings/compose.cjs');

const SOUNDS = [{ id: 'caderninho', label: 'Alarme do Caderninho' }, { id: 'Glass', label: 'Glass' }, { id: 'Ping', label: 'Ping' }];
// Port stand-ins: record what the use cases ask of the outside world.
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-settings-test-'));
  const opened = [], effects = [];
  const ports = {
    catalog: { list: () => SOUNDS, file: id => (SOUNDS.some(sound => sound.id === id) ? `/sounds/${id}` : null) },
    player: { play: input => effects.push(['play', input]) },
    window: { setKeepOnTop: on => effects.push(['keepOnTop', on]) },
    notificationSettings: { open: async () => { effects.push(['openNotifications']); } },
    notifications: { supported: () => effects.notificationsSupported !== false, show: input => effects.push(['notify', input]) },
  };
  const open = () => { const store = new Store(directory); opened.push(store); return { store, settings: createSettingsUseCases({ store, ...ports }) }; };
  t.after(() => { opened.reverse().forEach(store => store.close()); fs.rmSync(directory, { recursive: true, force: true }); });
  return { ...open(), open, effects };
}

test('a fresh notebook reads the default settings and the sound catalog', t => {
  const { settings } = fixture(t);
  assert.deepEqual(settings.readSettings(), {
    preferences: { alertMode: 'sound-and-notification', alertSound: 'caderninho', alertVolume: 100, keepOnTop: false },
    sounds: SOUNDS,
  });
});

test('changed settings are answered back and survive reopening the notebook', t => {
  const { settings, open } = fixture(t);
  const view = settings.updateSettings({ alertMode: 'sound', alertSound: 'Glass', alertVolume: 40 });
  const expected = { alertMode: 'sound', alertSound: 'Glass', alertVolume: 40, keepOnTop: false };
  assert.deepEqual(view, { preferences: expected, sounds: SOUNDS });
  assert.deepEqual(open().settings.readSettings().preferences, expected);
});

test('invalid settings are refused and leave every stored value unchanged', t => {
  const { settings } = fixture(t);
  settings.updateSettings({ alertMode: 'sound', alertVolume: 60 });
  const before = settings.readSettings().preferences;
  for (const changes of [
    { alertMode: 'none' }, { alertMode: 'sound', alertVolume: 9 }, { alertVolume: 101 }, { alertVolume: 20.5 }, { alertVolume: '50' },
    { alertSound: 'Missing' }, { alertSound: '../alarm' }, { keepOnTop: 'yes' }, { alertMode: 'notification', alertSound: 'Nope' },
  ]) assert.throws(() => settings.updateSettings(changes), /Ajuste inválido/, JSON.stringify(changes));
  assert.deepEqual(settings.readSettings().preferences, before);
});

test('a stored sound that macOS no longer has reads as the Caderninho alarm', t => {
  const { store, settings } = fixture(t);
  store.setSetting('alert_sound', 'Removed');
  assert.equal(settings.readSettings().preferences.alertSound, 'caderninho');
});

test('keep on top reaches the window only after the choice is stored', t => {
  const { store, settings, effects } = fixture(t);
  const seen = [];
  const window = { setKeepOnTop: on => seen.push([on, store.getSetting('keep_on_top')]) };
  const withWindow = createSettingsUseCases({ store, catalog: { list: () => SOUNDS, file: () => '/x' }, player: {}, window, notificationSettings: {} });
  withWindow.updateSettings({ keepOnTop: true });
  withWindow.updateSettings({ alertVolume: 50 });
  withWindow.updateSettings({ keepOnTop: false });
  assert.deepEqual(seen, [[true, '1'], [false, '0']]);
  assert.throws(() => withWindow.updateSettings({ keepOnTop: true, alertVolume: 0 }));
  assert.deepEqual(seen.length, 2);
  assert.equal(settings.readSettings().preferences.keepOnTop, false);
  assert.deepEqual(effects, []);
});

test('the window level follows the stored choice when the app starts', t => {
  const { settings, open, effects } = fixture(t);
  settings.updateSettings({ keepOnTop: true });
  effects.length = 0;
  open().settings.applyWindowPlacement();
  assert.deepEqual(effects, [['keepOnTop', true]]);
});

test('a due reminder plays the chosen sound, shows the notification, or both, by alert mode', t => {
  const { settings } = fixture(t);
  assert.deepEqual(settings.planAlert(), { sound: { file: '/sounds/caderninho', volume: 1 }, notification: true });
  settings.updateSettings({ alertMode: 'sound', alertSound: 'Ping', alertVolume: 30 });
  assert.deepEqual(settings.planAlert(), { sound: { file: '/sounds/Ping', volume: 0.3 }, notification: false });
  settings.updateSettings({ alertMode: 'notification' });
  assert.deepEqual(settings.planAlert(), { sound: null, notification: true });
});

test('testing the sound plays the saved sound at the saved volume, whatever the alert mode', t => {
  const { settings, effects } = fixture(t);
  settings.updateSettings({ alertMode: 'notification', alertSound: 'Glass', alertVolume: 70 });
  assert.equal(settings.testAlertSound(), true);
  assert.deepEqual(effects, [['play', { file: '/sounds/Glass', volume: 0.7 }]]);
});

test('the macOS notification settings open on request', async t => {
  const { settings, effects } = fixture(t);
  assert.equal(await settings.openNotificationSettings(), true);
  assert.deepEqual(effects, [['openNotifications']]);
});

test('a due reminder still sounds and notifies with the defaults when the settings cannot be read', t => {
  const { store, settings } = fixture(t);
  settings.updateSettings({ alertMode: 'notification' });
  const logs = [], realGet = store.getSetting;
  t.mock.method(console, 'error', message => logs.push(String(message)));
  store.getSetting = () => { throw Object.assign(new Error('disk I/O error'), { code: 'SQLITE_IOERR' }); };
  try { assert.deepEqual(settings.planAlert(), { sound: { file: '/sounds/caderninho', volume: 1 }, notification: true }); }
  finally { store.getSetting = realGet; }
  assert.match(logs.join('\n'), /disk I\/O error/);
});

test('a test notification shows a Caderninho notification, and says so when macOS offers none', t => {
  const { settings, effects } = fixture(t);
  assert.equal(settings.testNotification(), true);
  assert.deepEqual(effects, [['notify', { title: 'Caderninho', body: 'As notificações do Caderninho estão funcionando.' }]]);
  effects.notificationsSupported = false;
  assert.throws(() => settings.testNotification(), /Notificações não estão disponíveis neste Mac\./);
  assert.equal(effects.length, 1);
});
