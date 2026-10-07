const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { dialogExportTarget } = require('../src/main/boards/infrastructure/dialog-export-target.cjs');
const { registerBoards } = require('../src/main/boards/presentation/ipc.cjs');

// ipcMain stand-in: records handlers so tests can invoke them like the renderer would.
function harness() {
  const handlers = new Map(), calls = [], main = { webContents: {} };
  const record = name => input => { calls.push([name, input]); return { ok: name }; };
  const useCases = Object.fromEntries(['open', 'save', 'file', 'attachImage', 'thumbnail', 'readThumbnail', 'export'].map(name => [name, record(name)]));
  registerBoards({ handle: (channel, handler) => handlers.set(channel, handler) }, { getWindow: () => main, useCases });
  const invoke = (channel, payload, sender = main.webContents) => handlers.get(channel)({ sender }, payload);
  return { handlers, calls, invoke };
}
const png = 'data:image/png;base64,AAAA';

test('the export target asks the save dialog with the board name and writes the file with its extension', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'board-export-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const asked = [];
  const dialog = { showSaveDialog: async (_window, options) => { asked.push(options); return { canceled: false, filePath: path.join(directory, 'Roteiro') }; } };
  const target = dialogExportTarget(dialog, () => ({}), directory);
  const file = await target.choose('Roteiro', 'svg');
  assert.equal(file, path.join(directory, 'Roteiro.svg'));
  assert.equal(asked[0].defaultPath, path.join(directory, 'Roteiro.svg'));
  assert.deepEqual(asked[0].filters, [{ name: 'Imagem SVG', extensions: ['svg'] }]);
  await target.write(file, Buffer.from('<svg/>'));
  assert.deepEqual(fs.readdirSync(directory), ['Roteiro.svg']);
  assert.equal(fs.readFileSync(file, 'utf8'), '<svg/>');
});

test('a cancelled save dialog chooses no file', async () => {
  const target = dialogExportTarget({ showSaveDialog: async () => ({ canceled: true }) }, () => ({}), os.tmpdir());
  assert.equal(await target.choose('x', 'png'), null);
});

test('board channels are registered once each', () => {
  assert.deepEqual([...harness().handlers.keys()].sort(), ['board:attach-image', 'board:export', 'board:file', 'board:open', 'board:save', 'board:thumbnail', 'board:thumbnail-read']);
});

test('valid payloads reach exactly one use case with only the validated fields', async () => {
  const { invoke, calls } = harness();
  const scene = { elements: [], viewport: { scrollX: 0, scrollY: 0, zoom: 1 } };
  await invoke('board:open', 'note-1');
  await invoke('board:save', { noteId: 'note-1', baseVersion: 3, scene, extra: 'x' });
  await invoke('board:file', { noteId: 'note-1', fileId: 'abc123' });
  await invoke('board:attach-image', { noteId: 'note-1', fileId: 'abc123', mime: 'image/png', dataURL: png });
  await invoke('board:thumbnail', { noteId: 'note-1', png });
  await invoke('board:thumbnail-read', 'note-1');
  await invoke('board:export', { noteId: 'note-1', format: 'svg', name: 'Roteiro', data: '<svg/>' });
  assert.deepEqual(calls, [
    ['open', { noteId: 'note-1' }],
    ['save', { noteId: 'note-1', baseVersion: 3, scene }],
    ['file', { noteId: 'note-1', fileId: 'abc123' }],
    ['attachImage', { noteId: 'note-1', fileId: 'abc123', mime: 'image/png', dataURL: png }],
    ['thumbnail', { noteId: 'note-1', png }],
    ['readThumbnail', { noteId: 'note-1' }],
    ['export', { noteId: 'note-1', format: 'svg', name: 'Roteiro', data: '<svg/>' }],
  ]);
});

const invalid = [
  ['board:open', 42, 'Quadro não encontrado.'],
  ['board:open', '../etc', 'Quadro não encontrado.'],
  ['board:save', { noteId: 'n', baseVersion: -1, scene: {} }, 'Quadro inválido.'],
  ['board:save', { noteId: 'n', baseVersion: 1.5, scene: {} }, 'Quadro inválido.'],
  ['board:save', { noteId: 'n', baseVersion: 0, scene: [] }, 'Quadro inválido.'],
  ['board:save', null, 'Quadro inválido.'],
  ['board:file', { noteId: 'n', fileId: 'a b' }, 'Imagem não encontrada.'],
  ['board:attach-image', { noteId: 'n', fileId: 'f', mime: 'image/png', dataURL: 7 }, 'Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.'],
  ['board:attach-image', { noteId: 'n', fileId: 'x'.repeat(129), mime: 'image/png', dataURL: png }, 'Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.'],
  ['board:thumbnail', { noteId: 'n', png: null }, 'Miniatura inválida.'],
  ['board:thumbnail-read', {}, 'Quadro não encontrado.'],
  ['board:export', { noteId: 'n', format: 'pdf', name: 'x', data: '' }, 'Exportação inválida.'],
  ['board:export', { noteId: 'n', format: 'svg', name: 5, data: '<svg/>' }, 'Exportação inválida.'],
];
for (const [channel, payload, message] of invalid) {
  test(`${channel} rejects ${JSON.stringify(payload)?.slice(0, 60)} without reaching a use case`, async () => {
    const { invoke, calls } = harness();
    await assert.rejects(async () => invoke(channel, payload), { message });
    assert.deepEqual(calls, []);
  });
}

test('board channels refuse requests that do not come from the main window', async () => {
  const { invoke, calls } = harness();
  await assert.rejects(async () => invoke('board:open', 'note-1', {}), { message: 'Quadro não encontrado.' });
  assert.deepEqual(calls, []);
});
