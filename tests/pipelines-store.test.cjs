const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Store } = require('../src/main/store.cjs');
const { createPipelineUseCases } = require('../src/main/pipelines/compose.cjs');

const PNG = 'data:image/png;base64,' + Buffer.from('fake png bytes').toString('base64');
const paragraph = text => ({ id: 'p-' + text.length + '-' + Math.random().toString(36).slice(2), type: 'paragraph', runs: [{ text, marks: {} }] });

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-pipelines-'));
  let now = Date.parse('2026-10-07T10:00:00Z');
  const stores = [];
  const open = () => { const store = new Store(directory, { now: () => now }); stores.push(store); return store; };
  const store = open();
  const pipelines = createPipelineUseCases({ store });
  t.after(() => { for (const item of stores) { try { item.close(); } catch {} } fs.rmSync(directory, { recursive: true, force: true }); });
  store.dispatch('note:create', { type: 'tasks', title: 'Reforma da cozinha' });
  const pipelineId = store.snapshot().selected.tasks;
  const advance = ms => { now += ms; };
  const pipeline = (state = store.snapshot()) => state.pipelines.find(item => item.id === pipelineId);
  const columnId = name => pipeline().columns.find(column => column.name === name).id;
  const cards = name => pipeline().tasks.filter(item => item.columnId === columnId(name)).sort((a, b) => a.position - b.position).map(item => item.title);
  const create = title => pipelines.createTask({ pipelineId, title }).taskId;
  return { directory, store, pipelines, pipelineId, advance, open, pipeline, columnId, cards, create };
}

test('a new pipeline page gets the five default columns in the same transaction', t => {
  const { pipeline } = setup(t);
  assert.deepEqual(pipeline().columns.map(column => column.name), ['Backlog', 'Ready to Dev', 'Doing', 'Review', 'Done']);
  assert.deepEqual(pipeline().columns.map(column => column.final), [false, false, false, false, true]);
  assert.deepEqual(pipeline().tasks, []);
});

test('tasks are born on top of the first column with owner, creation date and history', t => {
  const { pipelines, pipelineId, cards, create, advance, pipeline } = setup(t);
  create('Medir a parede');
  advance(1000);
  const { taskId } = pipelines.createTask({ pipelineId, title: '  Pedir orçamento ', owner: ' Ana ', description: [paragraph('Duas marcenarias')] });
  assert.deepEqual(cards('Backlog'), ['Pedir orçamento', 'Medir a parede']);
  const card = pipeline().tasks.find(item => item.id === taskId);
  assert.equal(card.owner, 'Ana');
  assert.equal(card.createdAt, '2026-10-07T10:00:01.000Z');
  assert.equal(card.commentCount, 0);
  const detail = pipelines.openTask({ taskId });
  assert.equal(detail.description[0].runs[0].text, 'Duas marcenarias');
  assert.deepEqual(detail.movements.map(item => [item.kind, item.from, item.to]), [['create', null, 'Backlog']]);
});

test('task fields are validated before anything is stored', t => {
  const { pipelines, pipelineId, pipeline } = setup(t);
  assert.throws(() => pipelines.createTask({ pipelineId, title: '   ' }), /título/);
  assert.throws(() => pipelines.createTask({ pipelineId, title: 'ok', owner: 'x'.repeat(121) }), /owner/);
  assert.throws(() => pipelines.createTask({ pipelineId: 'missing', title: 'ok' }), /Pipeline não encontrado/);
  assert.throws(() => pipelines.createTask({ pipelineId, title: 'ok', description: [{ type: 'script' }] }), /bloco/);
  assert.equal(pipeline().tasks.length, 0);
});

test('moves and reorders persist with their history, using column names of the moment', t => {
  const { pipelines, columnId, cards, create, open, pipelineId, advance } = setup(t);
  const a = create('A'), b = create('B'); create('C');
  advance(1000);
  pipelines.moveTask({ taskId: a, columnId: columnId('Doing'), position: 0 });
  pipelines.renameColumn({ columnId: columnId('Doing'), name: 'Fazendo' });
  pipelines.moveTask({ taskId: b, columnId: columnId('Backlog'), position: 0 });
  pipelines.moveTask({ taskId: b, columnId: columnId('Backlog'), position: 0 });
  assert.deepEqual(cards('Backlog'), ['B', 'C']);
  assert.deepEqual(cards('Fazendo'), ['A']);
  const reopened = createPipelineUseCases({ store: open() });
  assert.deepEqual(reopened.openTask({ taskId: a }).movements.map(item => [item.kind, item.from, item.to]), [['create', null, 'Backlog'], ['column', 'Backlog', 'Doing']]);
  assert.deepEqual(reopened.openTask({ taskId: b }).movements.map(item => item.kind), ['create', 'reorder']);
  assert.ok(open().snapshot().pipelines.find(item => item.id === pipelineId));
});

test('columns can be added before the final one, moved, renamed and removed with their cards relocated', t => {
  const { pipelines, pipeline, columnId, cards, create } = setup(t);
  const a = create('A'); create('B');
  pipelines.moveTask({ taskId: a, columnId: columnId('Review'), position: 0 });
  pipelines.addColumn({ pipelineId: pipeline().id, name: 'QA' });
  pipelines.moveColumn({ columnId: columnId('QA'), toPosition: 0 });
  pipelines.renameColumn({ columnId: columnId('Done'), name: 'Feito' });
  assert.deepEqual(pipeline().columns.map(column => column.name), ['QA', 'Backlog', 'Ready to Dev', 'Doing', 'Review', 'Feito']);
  assert.throws(() => pipelines.moveColumn({ columnId: columnId('Feito'), toPosition: 0 }), /coluna final/);
  assert.throws(() => pipelines.removeColumn({ columnId: columnId('Feito'), targetColumnId: columnId('QA') }), /coluna final/);
  pipelines.removeColumn({ columnId: columnId('Review'), targetColumnId: columnId('Backlog') });
  assert.deepEqual(cards('Backlog'), ['B', 'A']);
  assert.deepEqual(pipelines.openTask({ taskId: a }).movements.map(item => [item.from, item.to]).slice(-1), [['Review', 'Backlog']]);
});

test('the final column defines completion and the pipeline counts finished tasks', t => {
  const { pipelines, pipeline, columnId, create } = setup(t);
  const a = create('A'); create('B');
  pipelines.moveTask({ taskId: a, columnId: columnId('Done'), position: 0 });
  assert.equal(pipeline().tasks.find(item => item.id === a).done, true);
  assert.deepEqual([pipeline().done, pipeline().total], [1, 2]);
});

test('comments are added, edited with an edit date and removed; counts follow', t => {
  const { pipelines, create, pipeline, advance } = setup(t);
  const taskId = create('A');
  pipelines.addComment({ taskId, document: [paragraph('Primeiro')] });
  advance(60_000);
  pipelines.addComment({ taskId, document: [paragraph('Segundo')] });
  assert.throws(() => pipelines.addComment({ taskId, document: [paragraph('   ')] }), /Comentário vazio/);
  let detail = pipelines.openTask({ taskId });
  assert.deepEqual(detail.comments.map(item => item.text), ['Primeiro', 'Segundo']);
  assert.equal(pipeline().tasks[0].commentCount, 2);
  advance(60_000);
  pipelines.editComment({ commentId: detail.comments[0].id, document: [paragraph('Primeiro, revisado')] });
  detail = pipelines.openTask({ taskId });
  assert.equal(detail.comments[0].text, 'Primeiro, revisado');
  assert.equal(detail.comments[0].editedAt, '2026-10-07T10:02:00.000Z');
  assert.equal(detail.comments[1].editedAt, null);
  pipelines.removeComment({ commentId: detail.comments[1].id });
  assert.equal(pipeline().tasks[0].commentCount, 1);
  assert.throws(() => pipelines.removeComment({ commentId: 'missing' }), /Comentário não encontrado/);
});

test('task images are numbered per pipeline, stored in the pipeline folder and listed for thumbnails', t => {
  const { pipelines, create, directory, pipelineId } = setup(t);
  const taskId = create('A'), other = create('B');
  const first = pipelines.attachImage({ taskId, name: 'Foto da pia.png', mime: 'image/png', dataURL: PNG });
  const second = pipelines.attachImage({ taskId: other, name: 'planta.png', mime: 'image/png', dataURL: PNG });
  assert.equal(first.url, `caderno-pipeline://${pipelineId}/${first.imageId}`);
  assert.ok(fs.existsSync(path.join(directory, 'pipelines', pipelineId, '01-Foto-da-pia.png')));
  assert.ok(fs.existsSync(path.join(directory, 'pipelines', pipelineId, '02-planta.png')));
  assert.equal((fs.statSync(path.join(directory, 'pipelines', pipelineId, '01-Foto-da-pia.png')).mode & 0o777), 0o600);
  pipelines.updateTask({ taskId, description: [paragraph('Veja'), { id: 'img', type: 'image', imageId: first.imageId }] });
  pipelines.addComment({ taskId: other, document: [{ id: 'img2', type: 'image', imageId: second.imageId }] });
  assert.deepEqual(pipelines.openTask({ taskId }).images.map(item => item.imageId), [first.imageId]);
  assert.equal(pipelines.imageFile({ pipelineId, imageId: first.imageId }), path.join(directory, 'pipelines', pipelineId, '01-Foto-da-pia.png'));
  assert.equal(pipelines.imageFile({ pipelineId: 'other', imageId: first.imageId }), null);
  assert.throws(() => pipelines.attachImage({ taskId, name: 'x.svg', mime: 'image/svg+xml', dataURL: PNG }), /PNG, JPEG/);
});

test('documents cannot refer to images of another task', t => {
  const { pipelines, create } = setup(t);
  const taskId = create('A'), other = create('B');
  const { imageId } = pipelines.attachImage({ taskId: other, name: 'x.png', mime: 'image/png', dataURL: PNG });
  assert.throws(() => pipelines.updateTask({ taskId, description: [{ id: 'i', type: 'image', imageId }] }), /Imagem não encontrada/);
  assert.throws(() => pipelines.addComment({ taskId, document: [{ id: 'i', type: 'image', imageId }] }), /Imagem não encontrada/);
});

test('unreferenced images are collected at startup, never while a draft may still use them', t => {
  const { pipelines, create, directory, pipelineId, open } = setup(t);
  const taskId = create('A');
  const kept = pipelines.attachImage({ taskId, name: 'kept.png', mime: 'image/png', dataURL: PNG });
  pipelines.attachImage({ taskId, name: 'draft.png', mime: 'image/png', dataURL: PNG });
  pipelines.updateTask({ taskId, description: [{ id: 'i', type: 'image', imageId: kept.imageId }] });
  assert.equal(fs.readdirSync(path.join(directory, 'pipelines', pipelineId)).length, 2);
  createPipelineUseCases({ store: open() }).collectImages();
  assert.deepEqual(fs.readdirSync(path.join(directory, 'pipelines', pipelineId)), ['01-kept.png']);
});

test('trash, restore and purge of a task; restore uses the first column when its column was removed', t => {
  const { store, pipelines, columnId, cards, create, directory, pipelineId } = setup(t);
  const a = create('A'); create('B');
  pipelines.attachImage({ taskId: a, name: 'a.png', mime: 'image/png', dataURL: PNG });
  pipelines.moveTask({ taskId: a, columnId: columnId('Review'), position: 0 });
  pipelines.trashTask({ taskId: a });
  assert.deepEqual(cards('Review'), []);
  assert.equal(store.snapshot().trashTasks[0].id, a);
  assert.throws(() => pipelines.updateTask({ taskId: a, title: 'x' }), /Restaure a tarefa/);
  pipelines.removeColumn({ columnId: columnId('Review'), targetColumnId: columnId('Doing') });
  pipelines.restoreTask({ taskId: a });
  assert.deepEqual(cards('Backlog'), ['A', 'B']);
  assert.equal(pipelines.openTask({ taskId: a }).movements.at(-1).kind, 'restore');
  assert.throws(() => pipelines.purgeTask({ taskId: a }), /lixeira primeiro/);
  pipelines.trashTask({ taskId: a });
  pipelines.purgeTask({ taskId: a });
  assert.equal(store.snapshot().trashTasks.length, 0);
  assert.deepEqual(fs.readdirSync(path.join(directory, 'pipelines', pipelineId)), []);
});

test('a trashed pipeline cannot be changed and purging it removes its folder', t => {
  const { store, pipelines, pipelineId, create, directory } = setup(t);
  const a = create('A');
  pipelines.attachImage({ taskId: a, name: 'a.png', mime: 'image/png', dataURL: PNG });
  store.dispatch('note:trash', { id: pipelineId });
  assert.throws(() => pipelines.createTask({ pipelineId, title: 'x' }), /Restaure o pipeline/);
  assert.throws(() => pipelines.moveTask({ taskId: a, columnId: 'x', position: 0 }), /Restaure o pipeline/);
  store.dispatch('note:purge', { id: pipelineId });
  pipelines.collectImages();
  assert.equal(fs.existsSync(path.join(directory, 'pipelines', pipelineId)), false);
});

test('a task can be created from a note selection or a [] line and the note shows it', t => {
  const { store, pipelines, pipelineId } = setup(t);
  store.dispatch('note:create', { type: 'notes', title: 'Visita' });
  const noteId = store.snapshot().selected.notes;
  store.dispatch('note:update', { id: noteId, editorDoc: [{ id: 'b1', type: 'paragraph', runs: [{ text: 'precisamos de dois orçamentos', marks: {} }] }] });
  const origin = { kind: 'text', quote: 'dois orçamentos', parts: [{ blockId: 'b1', start: 14, end: 29 }] };
  const margin = pipelines.createTask({ pipelineId, title: 'dois orçamentos', source: { noteId, origin } }).taskId;
  const line = pipelines.createTask({ pipelineId, title: 'Trocar a fiação', source: { noteId, origin: { kind: 'line' } } }).taskId;
  const tasks = store.snapshot().pipelines[0].tasks;
  assert.deepEqual(tasks.find(item => item.id === margin).source, { noteId, origin: { kind: 'text', quote: 'dois orçamentos', parts: [{ blockId: 'b1', start: 14, end: 29, text: 'dois orçamentos', row: null, column: null }] } });
  assert.deepEqual(tasks.find(item => item.id === line).source, { noteId, origin: { kind: 'line' } });
  assert.throws(() => pipelines.createTask({ pipelineId, title: 'x', source: { noteId, origin: { kind: 'text', quote: 'x', parts: [{ blockId: 'nope', start: 0, end: 1 }] } } }), /trecho/);
  store.dispatch('note:update', { id: noteId, editorDoc: [{ id: 'b1', type: 'paragraph', runs: [{ text: 'antes', marks: {} }] }, { id: 'b2', type: 'task', taskId: line, title: 'Trocar a fiação' }] });
  const note = store.snapshot().notes.find(item => item.id === noteId);
  assert.equal(note.editorDoc[1].taskId, line);
  assert.equal(note.body, 'antes\nTrocar a fiação');
  store.dispatch('note:trash', { id: noteId });
  store.dispatch('note:purge', { id: noteId });
  assert.deepEqual(store.snapshot().pipelines[0].tasks.map(item => [item.title, item.source]).sort(), [['Trocar a fiação', null], ['dois orçamentos', null]]);
});

test('the snapshot carries searchable task text and the notebook of each pipeline', t => {
  const { store, pipelines, create } = setup(t);
  const taskId = create('Pedir orçamento');
  pipelines.updateTask({ taskId, description: [paragraph('marcenaria')] });
  pipelines.addComment({ taskId, document: [paragraph('Oficina Silva respondeu')] });
  const card = store.snapshot().pipelines[0].tasks[0];
  assert.match(card.searchText, /marcenaria/);
  assert.match(card.searchText, /Oficina Silva/);
  assert.equal(store.snapshot().pipelines[0].notebookId, store.snapshot().activeNotebook);
});

test('home strip folding is stored per strip', t => {
  const { store } = setup(t);
  store.dispatch('home:fold', { strip: 'notes', folded: true });
  assert.deepEqual(store.snapshot().homeFolded, { latest: false, pipeline: false, reminders: false, notes: true });
  assert.throws(() => store.dispatch('home:fold', { strip: 'tasks', folded: true }), /Faixa inválida/);
  assert.throws(() => store.dispatch('home:fold', { strip: 'notes', folded: 'yes' }), /Faixa inválida/);
});

test('the daily overview no longer lists tasks', t => {
  const { store, create } = setup(t);
  create('A');
  assert.deepEqual(Object.keys(store.snapshot().daily.overview).sort(), ['recentNotes', 'reminders']);
});

test('migration deletes lists, items, margin and inline tasks, keeps reminders and turns checkbox lines into text', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-pipelines-migration-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const stamp = '2026-10-01T10:00:00.000Z';
  const db = new DatabaseSync(path.join(directory, 'notebook.sqlite'));
  db.exec(`CREATE TABLE notes(id TEXT PRIMARY KEY,type TEXT NOT NULL CHECK(type IN ('notes','tasks','reminders','boards')),title TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',created TEXT NOT NULL,updated TEXT NOT NULL,trashed INTEGER NOT NULL DEFAULT 0,scheduled_at TEXT,reminder_enabled INTEGER NOT NULL DEFAULT 0,fired INTEGER NOT NULL DEFAULT 0,editor_document TEXT);
    CREATE TABLE task_items(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,title TEXT NOT NULL DEFAULT '',done INTEGER NOT NULL DEFAULT 0,position INTEGER NOT NULL,trashed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  db.prepare('INSERT INTO notes(id,type,title,body,created,updated) VALUES(?,?,?,?,?,?)').run('list', 'tasks', 'Compras', '', stamp, stamp);
  db.prepare('INSERT INTO task_items(id,note_id,title,done,position) VALUES(?,?,?,?,?)').run('item', 'list', 'Pão', 0, 0);
  const doc = [{ id: 'c1', type: 'check', checked: true, runs: [{ text: 'Feito', marks: { bold: true } }] }, { id: 'c2', type: 'paragraph', runs: [{ text: 'Texto', marks: {} }] }];
  db.prepare('INSERT INTO notes(id,type,title,body,created,updated,editor_document) VALUES(?,?,?,?,?,?,?)').run('rich', 'notes', 'Rica', '[x] Feito\nTexto', stamp, stamp, JSON.stringify(doc));
  db.prepare('INSERT INTO notes(id,type,title,body,created,updated) VALUES(?,?,?,?,?,?)').run('plain', 'notes', 'Simples', '[ ] Ligar\n- [x] Comprar\nfim', stamp, stamp);
  db.prepare("INSERT INTO settings(key,value) VALUES('initialized','2')").run();
  db.close();
  const first = new Store(directory, { now: () => Date.parse('2026-10-07T10:00:00Z') });
  first.dispatch('source:create', { noteId: 'rich', kind: 'reminder', title: 'Alarme', due: '2026-10-08T10:00:00.000Z', origin: { kind: 'text', quote: 'Texto', parts: [{ blockId: 'c2', start: 0, end: 5 }] } });
  first.close();
  // A database that still holds margin tasks from before the migration.
  const legacy = new DatabaseSync(path.join(directory, 'notebook.sqlite'));
  legacy.exec("DELETE FROM settings WHERE key='pipelines_migrated'");
  legacy.exec(`CREATE TABLE IF NOT EXISTS task_items(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,title TEXT NOT NULL DEFAULT '',done INTEGER NOT NULL DEFAULT 0,position INTEGER NOT NULL,trashed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS inline_tasks(id TEXT PRIMARY KEY,note_id TEXT NOT NULL,line_index INTEGER NOT NULL,title TEXT NOT NULL,done INTEGER NOT NULL);`);
  legacy.prepare("INSERT INTO source_actions(id,note_id,kind,title,origin,created_at,updated_at) VALUES('old','rich','task','Velha','{\"kind\":\"text\",\"quote\":\"x\",\"parts\":[]}',?,?)").run(stamp, stamp);
  legacy.prepare('INSERT INTO task_items(id,note_id,title,done,position) VALUES(?,?,?,?,?)').run('item2', 'list', 'Leite', 0, 0);
  legacy.close();
  const store = new Store(directory, { now: () => Date.parse('2026-10-07T10:00:00Z') });
  t.after(() => store.close());
  const tables = store.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
  assert.ok(!tables.includes('task_items'));
  assert.ok(!tables.includes('inline_tasks'));
  const state = store.snapshot();
  assert.deepEqual(state.sourceActions.map(item => [item.kind, item.title]), [['reminder', 'Alarme']]);
  const list = state.pipelines.find(item => item.id === 'list');
  assert.deepEqual(list.columns.map(column => column.name), ['Backlog', 'Ready to Dev', 'Doing', 'Review', 'Done']);
  assert.deepEqual(list.tasks, []);
  const rich = state.notes.find(item => item.id === 'rich');
  assert.deepEqual(rich.editorDoc.map(block => block.type), ['paragraph', 'paragraph']);
  assert.deepEqual(rich.editorDoc[0].runs, [{ text: 'Feito', marks: { bold: true } }]);
  assert.equal(rich.body, 'Feito\nTexto');
  assert.equal(state.notes.find(item => item.id === 'plain').body, 'Ligar\nComprar\nfim');
  assert.throws(() => store.dispatch('source:create', { noteId: 'rich', kind: 'task', title: 'x', origin: { kind: 'text', quote: 'Texto', parts: [{ blockId: 'c2', start: 0, end: 5 }] } }), /Tipo de ação inválido/);
  assert.throws(() => store.dispatch('item:create', { noteId: 'list', title: 'x' }), /Ação inválida/);
  assert.equal(store.db.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('task images resolve when the URL host lowercases a pipeline id with capitals', t => {
  const { store } = setup(t);
  const stamp = new Date().toISOString();
  store.insert({ id: 'Pipe-UPPER', type: 'tasks', title: 'Legado', body: '', created: stamp, updated: stamp });
  require('../src/main/pipelines/infrastructure/sqlite-pipeline-schema.cjs').createPipelineColumns(store, 'Pipe-UPPER', stamp);
  const pipelines = createPipelineUseCases({ store });
  const taskId = pipelines.createTask({ pipelineId: 'Pipe-UPPER', title: 'A' }).taskId;
  const { imageId, url } = pipelines.attachImage({ taskId, name: 'a.png', mime: 'image/png', dataURL: PNG });
  const host = new URL(url.replace('caderno-pipeline:', 'http:')).hostname;
  assert.equal(host, 'pipe-upper');
  assert.match(pipelines.imageFile({ pipelineId: host, imageId }), /Pipe-UPPER/);
});
