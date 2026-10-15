// Related pages IPC: queries and retry from the app window, and the settings section; value rules live in the domain.
const { INVALID } = require('../domain/preferences.cjs');
const QUERY_ERROR = 'Página inválida.';
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const FIELDS = new Set(['enabled', 'limit', 'sensitivity']);

const fail = () => { throw new Error(INVALID); };
// A plain object with one to three known fields; anything else never reaches the use case.
function changes(payload) {
  if (!payload || typeof payload !== 'object' || Object.getPrototypeOf(payload) !== Object.prototype) fail();
  const keys = Object.keys(payload);
  if (!keys.length || keys.some(key => !FIELDS.has(key))) fail();
  return Object.fromEntries(keys.map(key => [key, payload[key]]));
}

function registerRelated(ipcMain, { getWindow, useCases, retry, notify }) {
  // Ranking changes alter what the footer and the home graph show: tell the page to ask again.
  const andNotify = result => { notify(); return result; };
  const routes = {
    'related:query': noteId => {
      if (typeof noteId !== 'string' || !ID.test(noteId)) throw new Error(QUERY_ERROR);
      return useCases.queryRelated(noteId);
    },
    'related:retry': () => { retry(); },
    'settings:related-read': () => useCases.readRelatedSettings(),
    'settings:related-update': payload => andNotify(useCases.updateRelatedSettings(changes(payload))),
    'settings:related-reset': () => andNotify(useCases.resetRelatedRanking()),
    'settings:related-clear': async () => andNotify(await useCases.clearRelatedCache()),
  };
  for (const [channel, route] of Object.entries(routes)) {
    ipcMain.handle(channel, async (event, payload) => {
      if (event.sender !== getWindow()?.webContents) throw new Error(channel.startsWith('related:') ? QUERY_ERROR : INVALID);
      return route(payload);
    });
  }
}

const CHANNELS = ['related:query', 'related:retry', 'settings:related-read', 'settings:related-update', 'settings:related-reset', 'settings:related-clear'];

module.exports = { registerRelated, CHANNELS };
