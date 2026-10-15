// Settings IPC: check the sender and the payload shape, run one use case; value rules live in the domain.
const { INVALID } = require('../domain/preferences.cjs');
const FIELDS = new Set(['alertMode', 'alertSound', 'alertVolume', 'keepOnTop']);

const fail = () => { throw new Error(INVALID); };
// A plain object with one to four known fields; anything else never reaches the use case.
function changes(payload) {
  if (!payload || typeof payload !== 'object' || Object.getPrototypeOf(payload) !== Object.prototype) fail();
  const keys = Object.keys(payload);
  if (!keys.length || keys.some(key => !FIELDS.has(key))) fail();
  return Object.fromEntries(keys.map(key => [key, payload[key]]));
}

function registerSettings(ipcMain, { getWindow, useCases, onUpdated }) {
  const routes = {
    'settings:read': () => useCases.readSettings(),
    'settings:update': payload => { const view = useCases.updateSettings(changes(payload)); onUpdated(view); return view; },
    'settings:test-sound': () => useCases.testAlertSound(),
    'settings:test-notification': () => useCases.testNotification(),
    'settings:open-notifications': () => useCases.openNotificationSettings(),
  };
  for (const [channel, route] of Object.entries(routes)) {
    ipcMain.handle(channel, async (event, payload) => {
      if (event.sender !== getWindow()?.webContents) throw new Error(INVALID);
      return route(payload);
    });
  }
}

const CHANNELS = ['settings:read', 'settings:update', 'settings:test-sound', 'settings:test-notification', 'settings:open-notifications'];

module.exports = { registerSettings, CHANNELS };
