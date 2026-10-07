const { test } = require('node:test');
const { createPipelineUseCases } = require('../src/main/pipelines/compose.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/main/store.cjs');
const { SqliteBoardRepository } = require('../src/main/boards/infrastructure/sqlite-board-repository.cjs');
const { openBoard } = require('../src/main/boards/application/open-board.cjs');
const { saveBoard } = require('../src/main/boards/application/save-board.cjs');
const { attachBoardImage } = require('../src/main/boards/application/attach-board-image.cjs');
const { readBoardFile } = require('../src/main/boards/application/read-board-file.cjs');
const { saveBoardThumbnail } = require('../src/main/boards/application/save-board-thumbnail.cjs');
const { exportBoard } = require('../src/main/boards/application/export-board.cjs');
const { readBoardThumbnail } = require('../src/main/boards/application/read-board-thumbnail.cjs');
const { MediaStore } = require('../src/main/media.cjs');
const { mediaBoardFiles } = require('../src/main/boards/infrastructure/media-board-files.cjs');
// nativeImage stand-in: the media store keeps the bytes it is given as the PNG.
const nativeImage = { createFromBuffer: bytes => ({ isEmpty: () => !bytes.length, getSize: () => ({ width: 1, height: 1 }), toPNG: () => bytes }) };

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-boards-test-'));
  let clock = new Date('2026-10-06T12:00:00Z').getTime();
  const opened = [];
  const open = () => { const store = new Store(directory, { now: () => clock }); opened.push(store); return store; };
  const store = open();
  t.after(() => { opened.reverse().forEach(s => { try { s.close(); } catch {} }); fs.rmSync(directory, { recursive: true, force: true }); });
  const boards = (target, events = { boardSaved() {}, boardImageAttached() {} }) => {
    const repository = new SqliteBoardRepository(target), media = new MediaStore(target, nativeImage), files = mediaBoardFiles(media);
    return { repository, media, open: openBoard(repository), save: saveBoard(repository, events), attach: attachBoardImage(repository, files, events), file: readBoardFile(repository, files), thumbnail: saveBoardThumbnail(repository), readThumbnail: readBoardThumbnail(repository) };
  };
  return { directory, store, open, boards, advance: delta => clock += delta };
}
const createBoard = store => store.dispatch('note:create', { type: 'boards' }).selected.boards;

test('creating a board page also creates its empty board at version 0', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store);
  const page = store.snapshot().notes.find(note => note.id === id);
  assert.equal(page.type, 'boards');
  assert.deepEqual(boards(store).open({ noteId: id }), { noteId: id, version: 0, scene: { elements: [], viewport: { scrollX: 0, scrollY: 0, zoom: 1 } }, files: [] });
});

test('when the board row cannot be created, the page is not created either', t => {
  const { store } = fixture(t);
  const before = store.snapshot().notes.length;
  store.db.exec("CREATE TRIGGER fail_board_insert BEFORE INSERT ON boards BEGIN SELECT RAISE(ABORT,'disco cheio'); END");
  assert.throws(() => store.dispatch('note:create', { type: 'boards' }), /disco cheio/);
  assert.equal(store.snapshot().notes.length, before);
});

test('opening a page that is not a board fails with a readable message', t => {
  const { store, boards } = fixture(t);
  const noteId = store.dispatch('note:create', { type: 'notes' }).selected.notes;
  assert.throws(() => boards(store).open({ noteId }), { message: 'Quadro não encontrado.' });
  assert.throws(() => boards(store).open({ noteId: 'missing' }), { message: 'Quadro não encontrado.' });
});

// A database from before boards: the notes CHECK has no 'boards' and the board tables do not exist.
function downgradeToPreBoards(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notes'").get().sql;
  const dependents = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='notes' AND type IN ('index','trigger') AND sql IS NOT NULL").all().map(row => row.sql);
  db.exec('PRAGMA foreign_keys = OFF; DROP TABLE board_files; DROP TABLE boards; BEGIN');
  db.exec(schema.replace(/CREATE TABLE "?notes"?/i, 'CREATE TABLE notes_old').replace("'reminders','boards')", "'reminders')"));
  db.exec('INSERT INTO notes_old SELECT * FROM notes; DROP TABLE notes; ALTER TABLE notes_old RENAME TO notes');
  for (const sql of dependents) db.exec(sql);
  db.exec('COMMIT'); db.close();
}

test('an existing database gains the boards type and tables without losing pages, links or constraints', t => {
  const { store, open, boards } = fixture(t);
  const listId = store.dispatch('note:create', { type: 'tasks', title: 'Compras' }).selected.tasks;
  createPipelineUseCases({ store }).createTask({ pipelineId: listId, title: 'Pão' });
  store.dispatch('category:attach', { noteId: listId, name: 'casa' });
  const pages = state => state.notes.map(({ id, type, title, categories }) => ({ id, type, title, tasks: (state.pipelines.find(pipeline => pipeline.id === id)?.tasks || []).map(task => task.title), categories: categories.map(category => category.name) }));
  const before = pages(store.snapshot());
  store.close();
  downgradeToPreBoards(path.join(store.directory, 'notebook.sqlite'));
  const migrated = open();
  assert.deepEqual(pages(migrated.snapshot()), before);
  const boardId = createBoard(migrated);
  assert.equal(boards(migrated).open({ noteId: boardId }).version, 0);
  assert.throws(() => migrated.db.prepare("UPDATE notes SET notebook_id=NULL WHERE id=?").run(listId), /caderno/);
  assert.equal(migrated.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(migrated.db.prepare('PRAGMA foreign_key_check').all(), []);
});

const text = (id, value, extra = {}) => ({ id, type: 'text', x: 0, y: 0, width: 10, height: 10, text: value, originalText: value, isDeleted: false, ...extra });
const image = (id, fileId) => ({ id, type: 'image', x: 0, y: 0, width: 10, height: 10, fileId, isDeleted: false });
const viewport = { scrollX: 10, scrollY: -4, zoom: 1.25 };
const png = bytes => 'data:image/png;base64,' + Buffer.from(bytes).toString('base64');

test('a save updates the scene, version, page text, page date and board files together', t => {
  const { store, boards, advance } = fixture(t);
  const id = createBoard(store), board = boards(store);
  board.attach({ noteId: id, fileId: 'file-a', mime: 'image/png', dataURL: png('A') });
  board.attach({ noteId: id, fileId: 'file-b', mime: 'image/png', dataURL: png('B') });
  advance(60_000);
  const saved = [];
  const result = boards(store, { boardSaved: event => saved.push(event), boardImageAttached() {} }).save({ noteId: id, baseVersion: 0, scene: { elements: [text('t1', 'Sair cedo'), image('i1', 'file-a')], viewport } });
  assert.deepEqual(result, { version: 1, updated: '2026-10-06T12:01:00.000Z' });
  assert.deepEqual(saved, [{ noteId: id, version: 1 }]);
  const opened = board.open({ noteId: id });
  assert.deepEqual({ version: opened.version, ids: opened.scene.elements.map(element => element.id), viewport: opened.scene.viewport, files: opened.files }, { version: 1, ids: ['t1', 'i1'], viewport, files: [{ fileId: 'file-a', mime: 'image/png' }] });
  const page = store.snapshot().notes.find(note => note.id === id);
  assert.deepEqual({ body: page.body, updated: page.updated }, { body: 'Sair cedo', updated: '2026-10-06T12:01:00.000Z' });
  assert.throws(() => board.file({ noteId: id, fileId: 'file-b' }), { message: 'Imagem não encontrada.' });
});

test('a save that fails part-way leaves scene, text and files untouched', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  board.attach({ noteId: id, fileId: 'file-a', mime: 'image/png', dataURL: png('A') });
  store.db.exec("CREATE TRIGGER fail_board_text BEFORE UPDATE OF body ON notes WHEN NEW.type='boards' BEGIN SELECT RAISE(ABORT,'disco cheio'); END");
  assert.throws(() => board.save({ noteId: id, baseVersion: 0, scene: { elements: [text('t1', 'perdido')], viewport } }), /disco cheio/);
  const opened = board.open({ noteId: id });
  assert.deepEqual({ version: opened.version, elements: opened.scene.elements, files: opened.files.map(file => file.fileId) }, { version: 0, elements: [], files: ['file-a'] });
  assert.equal(store.snapshot().notes.find(note => note.id === id).body, '');
});

test('a stale save is rejected and a save to a trashed board is refused', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  board.save({ noteId: id, baseVersion: 0, scene: { elements: [], viewport } });
  assert.throws(() => board.save({ noteId: id, baseVersion: 0, scene: { elements: [], viewport } }), { message: 'O quadro mudou em outra janela. Recarregue.' });
  store.dispatch('note:trash', { id });
  assert.throws(() => board.save({ noteId: id, baseVersion: 1, scene: { elements: [], viewport } }), { message: 'Quadro não encontrado.' });
  assert.throws(() => board.attach({ noteId: id, fileId: 'f', mime: 'image/png', dataURL: png('A') }), { message: 'Quadro não encontrado.' });
});

test('an attached image is served back as a data URL of the stored blob', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  assert.deepEqual(board.attach({ noteId: id, fileId: 'file-a', mime: 'image/png', dataURL: png('A') }), { fileId: 'file-a' });
  assert.deepEqual(board.file({ noteId: id, fileId: 'file-a' }), { fileId: 'file-a', mime: 'image/png', dataURL: png('A') });
});

test('a board goes to the trash, comes back intact, and purging it removes its scene and files', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  board.attach({ noteId: id, fileId: 'file-a', mime: 'image/png', dataURL: png('A') });
  board.save({ noteId: id, baseVersion: 0, scene: { elements: [text('t1', 'Café na vila'), image('i1', 'file-a')], viewport } });
  store.dispatch('note:trash', { id });
  assert.ok(store.snapshot().notes.find(note => note.id === id).trashed);
  store.dispatch('note:restore', { id });
  const restored = board.open({ noteId: id });
  assert.deepEqual({ version: restored.version, files: restored.files.map(file => file.fileId), trashed: store.snapshot().notes.find(note => note.id === id).trashed }, { version: 1, files: ['file-a'], trashed: false });
  store.dispatch('note:trash', { id });
  store.dispatch('note:purge', { id });
  assert.throws(() => board.open({ noteId: id }), { message: 'Quadro não encontrado.' });
  assert.deepEqual(store.db.prepare('SELECT count(*) AS n FROM board_files WHERE note_id=?').get(id).n, 0);
});

test('media collection keeps blobs a board references and removes them once nothing refers to them', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  const noteId = store.dispatch('note:create', { type: 'notes' }).selected.notes;
  board.attach({ noteId: id, fileId: 'file-a', mime: 'image/png', dataURL: png('same image') });
  const blobId = board.media.image(Buffer.from('same image'));
  store.dispatch('cut:create', { id: 'cut', noteId, kind: 'image', blobId });
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM media_blobs').get().n, 1);
  store.dispatch('cut:trash', { id: 'cut' }); store.dispatch('cut:purge', { id: 'cut' });
  board.save({ noteId: id, baseVersion: 0, scene: { elements: [image('i1', 'file-a')], viewport } });
  board.media.collect();
  assert.equal(board.file({ noteId: id, fileId: 'file-a' }).dataURL, png('same image'));
  board.save({ noteId: id, baseVersion: 1, scene: { elements: [], viewport } });
  board.media.collect();
  assert.equal(board.media.file(blobId), null);
});

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

test('a board thumbnail is stored, read back and flagged in the snapshot', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  assert.equal(board.readThumbnail({ noteId: id }), null);
  assert.equal(store.snapshot().notes.find(note => note.id === id).hasThumbnail, false);
  const thumbnail = png([...PNG_SIGNATURE, 1, 2, 3]);
  assert.equal(board.thumbnail({ noteId: id, png: thumbnail }), null);
  assert.deepEqual(board.readThumbnail({ noteId: id }), { png: thumbnail });
  assert.equal(store.snapshot().notes.find(note => note.id === id).hasThumbnail, true);
  assert.throws(() => board.readThumbnail({ noteId: 'missing' }), { message: 'Quadro não encontrado.' });
});

test('a thumbnail that is not a PNG or is over 256 KB is refused', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  for (const value of [png([1, 2, 3]), 'data:image/jpeg;base64,' + Buffer.from(PNG_SIGNATURE).toString('base64'), png([...PNG_SIGNATURE, ...new Uint8Array(256 * 1024)]), 42])
    assert.throws(() => board.thumbnail({ noteId: id, png: value }), { message: 'Miniatura inválida.' });
});

test('hashtags written on a board never become categories; manual categories still attach', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store), board = boards(store);
  board.save({ noteId: id, baseVersion: 0, scene: { elements: [text('t1', 'levar #protetor e #agua')], viewport } });
  store.dispatch('view:select', { view: 'home' });
  store.dispatch('category:finalize');
  store.dispatch('category:attach', { noteId: id, name: 'viagem' });
  assert.deepEqual(store.snapshot().notes.find(note => note.id === id).categories.map(category => [category.name, category.sources]), [['viagem', ['manual']]]);
});

test('the recent pages of the day include boards with their title', t => {
  const { store } = fixture(t);
  const id = createBoard(store);
  store.dispatch('note:update', { id, title: 'Roteiro da viagem' });
  assert.ok(store.snapshot().daily.overview.recentNotes.some(page => page.id === id && page.title === 'Roteiro da viagem'));
});

test('a board page accepts a new title but never a body written from outside its scene', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store);
  boards(store).save({ noteId: id, baseVersion: 0, scene: { elements: [text('t1', 'Trilha curta')], viewport } });
  store.dispatch('note:update', { id, title: 'Roteiro' });
  assert.throws(() => store.dispatch('note:update', { id, body: 'texto solto' }), { message: 'O texto do quadro vem dos elementos do quadro.' });
  assert.throws(() => store.dispatch('note:update', { id, editorDoc: [] }), { message: 'O texto do quadro vem dos elementos do quadro.' });
  const page = store.snapshot().notes.find(note => note.id === id);
  assert.deepEqual([page.title, page.body], ['Roteiro', 'Trilha curta']);
});

// The save dialog is a system boundary: a scripted target records what would be written.
const scriptedTarget = answer => { const target = { written: [], chosen: [] }; target.choose = async (name, format) => { target.chosen.push([name, format]); return answer; }; target.write = async (file, bytes) => { target.written.push([file, bytes]); }; return target; };

test('exporting writes PNG bytes or SVG text to the chosen file, and a cancelled dialog writes nothing', async t => {
  const { store } = fixture(t);
  const id = createBoard(store), repository = new SqliteBoardRepository(store);
  const target = scriptedTarget('/tmp/quadro.png');
  assert.deepEqual(await exportBoard(repository, target)({ noteId: id, format: 'png', name: 'Roteiro', data: png([1, 2]) }), { saved: true });
  assert.deepEqual(target.chosen, [['Roteiro', 'png']]);
  assert.deepEqual([...target.written[0][1]], [1, 2]);
  const svg = scriptedTarget('/tmp/quadro.svg');
  await exportBoard(repository, svg)({ noteId: id, format: 'svg', name: 'Roteiro', data: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' });
  assert.equal(svg.written[0][1].toString(), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const cancelled = scriptedTarget(null);
  assert.deepEqual(await exportBoard(repository, cancelled)({ noteId: id, format: 'svg', name: 'x', data: '<svg/>' }), { saved: false });
  assert.deepEqual(cancelled.written, []);
});

test('an export with a bad format, name or payload is refused before the dialog opens', async t => {
  const { store } = fixture(t);
  const id = createBoard(store), repository = new SqliteBoardRepository(store), target = scriptedTarget('/tmp/x');
  for (const input of [{ format: 'pdf', name: 'x', data: png([1]) }, { format: 'svg', name: 'x'.repeat(161), data: '<svg/>' }, { format: 'svg', name: 'x', data: '<html><script>' }, { format: 'png', name: 'x', data: '<svg/>' }, { format: 'svg', name: 'x', data: '<svg>' + 'x'.repeat(50 * 1024 * 1024) }])
    await assert.rejects(exportBoard(repository, target)({ noteId: id, ...input }), { message: 'Exportação inválida.' });
  await assert.rejects(exportBoard(repository, target)({ noteId: 'missing', format: 'svg', name: 'x', data: '<svg/>' }), { message: 'Quadro não encontrado.' });
  assert.deepEqual(target.chosen, []);
});

test('related pages index a board by its title and extracted text', t => {
  const { store, boards } = fixture(t);
  const id = createBoard(store);
  store.dispatch('note:update', { id, title: 'Roteiro da viagem' });
  boards(store).save({ noteId: id, baseVersion: 0, scene: { elements: [text('t1', 'Trilha curta até o mirante')], viewport } });
  const { documents } = require('../src/main/related-engine.cjs');
  const page = documents(store.snapshot()).find(document => document.id === 'page:' + id);
  assert.equal(page.type, 'boards');
  assert.equal(page.text, 'Roteiro da viagem\nTrilha curta até o mirante');
});

// A database from another build can carry a different type list (here an extra 'murals').
test('the migration adds boards whatever type list the existing notes CHECK has', t => {
  const { store, open, boards } = fixture(t);
  const noteId = store.dispatch('note:create', { type: 'notes', title: 'Nota antiga' }).selected.notes;
  store.close();
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(store.directory, 'notebook.sqlite'));
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notes'").get().sql;
  const dependents = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='notes' AND type IN ('index','trigger') AND sql IS NOT NULL").all().map(row => row.sql);
  db.exec('PRAGMA foreign_keys = OFF; DROP TABLE board_files; DROP TABLE boards; BEGIN');
  db.exec(schema.replace(/CREATE TABLE "?notes"?/i, 'CREATE TABLE notes_old').replace(/CHECK\(type IN \([^)]*\)\)/, "CHECK(type IN ('notes','tasks','reminders','murals'))"));
  db.exec('INSERT INTO notes_old SELECT * FROM notes; DROP TABLE notes; ALTER TABLE notes_old RENAME TO notes');
  for (const sql of dependents) db.exec(sql);
  db.exec('COMMIT'); db.close();
  const migrated = open();
  const boardId = createBoard(migrated);
  assert.equal(boards(migrated).open({ noteId: boardId }).version, 0);
  assert.ok(migrated.snapshot().notes.some(note => note.id === noteId && note.title === 'Nota antiga'));
});
