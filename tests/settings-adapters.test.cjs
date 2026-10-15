const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { systemSoundCatalog } = require('../src/main/settings/infrastructure/system-sound-catalog.cjs');

test('the sound catalog offers the Caderninho alarm first, then only plain .aiff sounds of the system folder', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-sounds-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const name of ['Ping.aiff', 'Glass.aiff', 'readme.txt', 'bad;name.aiff', 'Sub marine.aiff']) fs.writeFileSync(path.join(directory, name), '');
  fs.mkdirSync(path.join(directory, 'Nested.aiff'));
  const catalog = systemSoundCatalog({ bundledFile: '/app/alarm.wav', systemDirectory: directory });
  assert.deepEqual(catalog.list(), [
    { id: 'caderninho', label: 'Alarme do Caderninho' }, { id: 'Glass', label: 'Glass' }, { id: 'Ping', label: 'Ping' }, { id: 'Sub marine', label: 'Sub marine' },
  ]);
  assert.equal(catalog.file('caderninho'), '/app/alarm.wav');
  assert.equal(catalog.file('Glass'), path.join(directory, 'Glass.aiff'));
  for (const id of ['readme', 'bad;name', 'Nested', '../Ping', 'Missing', '', 7]) assert.equal(catalog.file(id), null, String(id));
});

test('a missing system sound folder leaves only the Caderninho alarm', () => {
  const catalog = systemSoundCatalog({ bundledFile: '/app/alarm.wav', systemDirectory: path.join(os.tmpdir(), 'caderninho-no-such-folder') });
  assert.deepEqual(catalog.list(), [{ id: 'caderninho', label: 'Alarme do Caderninho' }]);
});

const { afplaySoundPlayer } = require('../src/main/settings/infrastructure/afplay-sound-player.cjs');
const { electronWindowPlacement } = require('../src/main/settings/infrastructure/electron-window-placement.cjs');
const { macosNotificationSettings } = require('../src/main/settings/infrastructure/macos-notification-settings.cjs');

test('the player runs afplay with the volume factor, bounded, and beeps when it fails', () => {
  const runs = [], beeps = [], logs = [];
  let finish;
  const player = afplaySoundPlayer({ execFile: (file, args, options, done) => { runs.push([file, args, options]); finish = done; }, beep: () => beeps.push(true), log: message => logs.push(message) });
  player.play({ file: '/sounds/Glass.aiff', volume: 0.4 });
  assert.equal(runs[0][0], '/usr/bin/afplay');
  assert.deepEqual(runs[0][1], ['-v', '0.4', '/sounds/Glass.aiff']);
  assert.ok(runs[0][2].timeout > 0 && runs[0][2].maxBuffer > 0);
  finish(null);
  assert.equal(beeps.length, 0);
  finish(new Error('afplay failed'));
  assert.equal(beeps.length, 1);
  assert.match(logs[0], /afplay failed/);
});

test('the window placement floats a live window and ignores a closed one', () => {
  const calls = [];
  let current = { isDestroyed: () => false, setAlwaysOnTop: (...args) => calls.push(args) };
  const placement = electronWindowPlacement(() => current);
  placement.setKeepOnTop(true);
  placement.setKeepOnTop(false);
  current = { isDestroyed: () => true, setAlwaysOnTop: () => calls.push('closed') };
  placement.setKeepOnTop(true);
  current = null;
  placement.setKeepOnTop(true);
  assert.deepEqual(calls, [[true, 'floating'], [false]]);
});

test('the notification settings open the fixed macOS settings address', async () => {
  const opened = [];
  await macosNotificationSettings({ openExternal: async url => { opened.push(url); } }).open();
  assert.deepEqual(opened, ['x-apple.systempreferences:com.apple.Notifications-Settings.extension']);
  await assert.rejects(macosNotificationSettings({ openExternal: async () => { throw new Error('denied'); } }).open(), /Não foi possível abrir os Ajustes do Sistema/);
});
