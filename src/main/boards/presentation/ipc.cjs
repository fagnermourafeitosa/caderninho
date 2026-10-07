// Board IPC: validate the untrusted payload, run one use case, return its result.
const { INVALID } = require('../domain/scene.cjs');
const { IMAGE_ERROR, THUMBNAIL_ERROR } = require('../domain/board-image.cjs');
const { EXPORT_ERROR } = require('../domain/board-export.cjs');
const { NOT_FOUND } = require('../application/open-board.cjs');
const FILE_MISSING = 'Imagem não encontrada.';
const ID = /^[A-Za-z0-9_-]{1,128}$/;

const plainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const id = (value, message) => { if (typeof value !== 'string' || !ID.test(value)) throw new Error(message); return value; };
const object = (value, message) => { if (!plainObject(value)) throw new Error(message); return value; };
const string = (value, message) => { if (typeof value !== 'string') throw new Error(message); return value; };

const PARSERS = {
  'board:open': payload => ({ noteId: id(payload, NOT_FOUND) }),
  'board:save': payload => {
    const { noteId, baseVersion, scene } = object(payload, INVALID);
    if (!Number.isSafeInteger(baseVersion) || baseVersion < 0) throw new Error(INVALID);
    return { noteId: id(noteId, INVALID), baseVersion, scene: object(scene, INVALID) };
  },
  'board:file': payload => { const { noteId, fileId } = object(payload, FILE_MISSING); return { noteId: id(noteId, FILE_MISSING), fileId: id(fileId, FILE_MISSING) }; },
  'board:attach-image': payload => {
    const { noteId, fileId, mime, dataURL } = object(payload, IMAGE_ERROR);
    return { noteId: id(noteId, IMAGE_ERROR), fileId: id(fileId, IMAGE_ERROR), mime: string(mime, IMAGE_ERROR), dataURL: string(dataURL, IMAGE_ERROR) };
  },
  'board:thumbnail': payload => { const { noteId, png } = object(payload, THUMBNAIL_ERROR); return { noteId: id(noteId, THUMBNAIL_ERROR), png: string(png, THUMBNAIL_ERROR) }; },
  'board:thumbnail-read': payload => ({ noteId: id(payload, NOT_FOUND) }),
  'board:export': payload => {
    const { noteId, format, name, data } = object(payload, EXPORT_ERROR);
    if (!['png', 'svg'].includes(format)) throw new Error(EXPORT_ERROR);
    return { noteId: id(noteId, EXPORT_ERROR), format, name: string(name, EXPORT_ERROR), data: string(data, EXPORT_ERROR) };
  },
};
const USE_CASES = { 'board:open': 'open', 'board:save': 'save', 'board:file': 'file', 'board:attach-image': 'attachImage', 'board:thumbnail': 'thumbnail', 'board:thumbnail-read': 'readThumbnail', 'board:export': 'export' };
// The error a channel answers with when the request does not come from the app window.
const REFUSED = { 'board:open': NOT_FOUND, 'board:save': INVALID, 'board:file': FILE_MISSING, 'board:attach-image': IMAGE_ERROR, 'board:thumbnail': THUMBNAIL_ERROR, 'board:thumbnail-read': NOT_FOUND, 'board:export': EXPORT_ERROR };

function registerBoards(ipcMain, { getWindow, useCases }) {
  for (const [channel, parse] of Object.entries(PARSERS)) {
    ipcMain.handle(channel, async (event, payload) => {
      if (event.sender !== getWindow()?.webContents) throw new Error(REFUSED[channel]);
      return useCases[USE_CASES[channel]](parse(payload));
    });
  }
}

module.exports = { registerBoards };
