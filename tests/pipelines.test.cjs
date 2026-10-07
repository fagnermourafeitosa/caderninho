const test = require('node:test');
const assert = require('node:assert/strict');
const columns = require('../src/main/pipelines/domain/columns.cjs');
const board = require('../src/main/pipelines/domain/board.cjs');
const task = require('../src/main/pipelines/domain/task.cjs');
const image = require('../src/main/pipelines/domain/task-image.cjs');
const comment = require('../src/main/pipelines/domain/comment.cjs');

let counter = 0;
const id = () => 'c' + (++counter);
const names = list => list.map(column => column.name);
const fresh = () => columns.createDefaultColumns(id);
const card = (cardId, columnId, position) => ({ id: cardId, columnId, position });
const order = (cards, columnId) => cards.filter(item => item.columnId === columnId).sort((a, b) => a.position - b.position).map(item => item.id);

test('a new pipeline has Backlog, Ready to Dev, Doing, Review and Done, Done being final', () => {
  const list = fresh();
  assert.deepEqual(names(list), ['Backlog', 'Ready to Dev', 'Doing', 'Review', 'Done']);
  assert.equal(columns.finalColumn(list).name, 'Done');
  assert.equal(columns.isFinal(list, list[4].id), true);
  assert.equal(columns.isFinal(list, list[0].id), false);
});

test('a new column goes right before the final column', () => {
  const list = columns.addColumn(fresh(), '  QA  ', 'qa');
  assert.deepEqual(names(list), ['Backlog', 'Ready to Dev', 'Doing', 'Review', 'QA', 'Done']);
});

test('column names are trimmed and must have 1 to 60 characters', () => {
  assert.throws(() => columns.addColumn(fresh(), '   ', 'x'), { message: columns.NAME_ERROR });
  assert.throws(() => columns.addColumn(fresh(), 'x'.repeat(61), 'x'), { message: columns.NAME_ERROR });
  assert.throws(() => columns.addColumn(fresh(), 42, 'x'), { message: columns.NAME_ERROR });
  assert.equal(columns.addColumn(fresh(), 'x'.repeat(60), 'x')[4].name.length, 60);
});

test('any column, including the final one, can be renamed', () => {
  const list = fresh();
  const renamed = columns.renameColumn(columns.renameColumn(list, list[4].id, 'Feito'), list[0].id, 'Ideias');
  assert.deepEqual(names(renamed), ['Ideias', 'Ready to Dev', 'Doing', 'Review', 'Feito']);
  assert.equal(columns.finalColumn(renamed).name, 'Feito');
  assert.throws(() => columns.renameColumn(list, 'missing', 'x'), { message: columns.COLUMN_ERROR });
});

test('columns reorder only before the final column', () => {
  const list = fresh();
  assert.deepEqual(names(columns.moveColumn(list, list[0].id, 3)), ['Ready to Dev', 'Doing', 'Review', 'Backlog', 'Done']);
  assert.deepEqual(names(columns.moveColumn(list, list[3].id, 0)), ['Review', 'Backlog', 'Ready to Dev', 'Doing', 'Done']);
  assert.throws(() => columns.moveColumn(list, list[0].id, 4), { message: columns.FINAL_ERROR });
  assert.throws(() => columns.moveColumn(list, list[4].id, 0), { message: columns.FINAL_ERROR });
  assert.throws(() => columns.moveColumn(list, list[0].id, -1), { message: columns.COLUMN_ERROR });
  assert.throws(() => columns.moveColumn(list, list[0].id, 1.5), { message: columns.COLUMN_ERROR });
});

test('the final column cannot be removed and a pipeline keeps at least two columns', () => {
  let list = fresh();
  assert.throws(() => columns.removeColumn(list, list[4].id, list[0].id), { message: columns.FINAL_ERROR });
  list = columns.removeColumn(list, list[1].id, list[0].id);
  list = columns.removeColumn(list, list[1].id, list[0].id);
  list = columns.removeColumn(list, list[1].id, list[0].id);
  assert.deepEqual(names(list), ['Backlog', 'Done']);
  assert.throws(() => columns.removeColumn(list, list[0].id, list[1].id), { message: columns.MINIMUM_ERROR });
});

test('removing a column needs another existing column to receive its cards', () => {
  const list = fresh();
  assert.throws(() => columns.removeColumn(list, list[1].id, list[1].id), { message: columns.TARGET_ERROR });
  assert.throws(() => columns.removeColumn(list, list[1].id, 'missing'), { message: columns.TARGET_ERROR });
  assert.deepEqual(names(columns.removeColumn(list, list[1].id, list[4].id)), ['Backlog', 'Doing', 'Review', 'Done']);
});

test('a new task is inserted at the top of the first column', () => {
  const cards = [card('a', 'backlog', 0), card('b', 'backlog', 1), card('z', 'doing', 0)];
  const result = board.insertTask(cards, 'new', 'backlog');
  assert.deepEqual(order(result.cards, 'backlog'), ['new', 'a', 'b']);
  assert.deepEqual(order(result.cards, 'doing'), ['z']);
  assert.deepEqual(result.movement, { kind: 'create', fromColumnId: null, toColumnId: 'backlog', fromPosition: null, toPosition: 0 });
});

test('moving a card to another column records a column movement and compacts both columns', () => {
  const cards = [card('a', 'backlog', 0), card('b', 'backlog', 1), card('c', 'backlog', 2), card('x', 'doing', 0), card('y', 'doing', 1)];
  const result = board.moveTask(cards, 'b', 'doing', 1);
  assert.deepEqual(order(result.cards, 'backlog'), ['a', 'c']);
  assert.deepEqual(order(result.cards, 'doing'), ['x', 'b', 'y']);
  assert.deepEqual(result.cards.filter(item => item.columnId === 'backlog').map(item => item.position).sort(), [0, 1]);
  assert.deepEqual(result.movement, { kind: 'column', fromColumnId: 'backlog', toColumnId: 'doing', fromPosition: 1, toPosition: 1 });
});

test('reordering inside a column records a reorder movement', () => {
  const cards = [card('a', 'backlog', 0), card('b', 'backlog', 1), card('c', 'backlog', 2)];
  const result = board.moveTask(cards, 'c', 'backlog', 0);
  assert.deepEqual(order(result.cards, 'backlog'), ['c', 'a', 'b']);
  assert.deepEqual(result.movement, { kind: 'reorder', fromColumnId: 'backlog', toColumnId: 'backlog', fromPosition: 2, toPosition: 0 });
});

test('a move to the same place changes nothing and records nothing', () => {
  const cards = [card('a', 'backlog', 0), card('b', 'backlog', 1)];
  const result = board.moveTask(cards, 'b', 'backlog', 1);
  assert.equal(result.movement, null);
  assert.deepEqual(order(result.cards, 'backlog'), ['a', 'b']);
});

test('positions past the end of a column clamp to the end', () => {
  const cards = [card('a', 'backlog', 0), card('x', 'doing', 0)];
  const result = board.moveTask(cards, 'a', 'doing', 99);
  assert.deepEqual(order(result.cards, 'doing'), ['x', 'a']);
  assert.equal(result.movement.toPosition, 1);
  assert.throws(() => board.moveTask(cards, 'a', 'doing', -1), { message: board.POSITION_ERROR });
  assert.throws(() => board.moveTask(cards, 'missing', 'doing', 0), { message: board.TASK_ERROR });
});

test('relocating a removed column appends its cards to the target in order, one movement each', () => {
  const cards = [card('a', 'doing', 0), card('b', 'doing', 1), card('x', 'backlog', 0)];
  const result = board.relocateColumn(cards, 'doing', 'backlog');
  assert.deepEqual(order(result.cards, 'backlog'), ['x', 'a', 'b']);
  assert.deepEqual(result.movements, [
    { taskId: 'a', kind: 'column', fromColumnId: 'doing', toColumnId: 'backlog', fromPosition: 0, toPosition: 1 },
    { taskId: 'b', kind: 'column', fromColumnId: 'doing', toColumnId: 'backlog', fromPosition: 1, toPosition: 2 },
  ]);
});

test('taking a card out of the board compacts its column and restoring puts it on top', () => {
  const cards = [card('a', 'backlog', 0), card('b', 'backlog', 1), card('c', 'backlog', 2)];
  const removed = board.removeTask(cards, 'b');
  assert.deepEqual(order(removed, 'backlog'), ['a', 'c']);
  assert.deepEqual(removed.map(item => item.position).sort(), [0, 1]);
  const restored = board.restoreTask(removed, 'b', 'backlog');
  assert.deepEqual(order(restored.cards, 'backlog'), ['b', 'a', 'c']);
  assert.deepEqual(restored.movement, { kind: 'restore', fromColumnId: null, toColumnId: 'backlog', fromPosition: null, toPosition: 0 });
});

test('task titles have 1 to 500 characters and owners up to 120', () => {
  assert.equal(task.title('  Pedir orçamento  '), 'Pedir orçamento');
  assert.throws(() => task.title('   '), { message: task.TITLE_ERROR });
  assert.throws(() => task.title('x'.repeat(501)), { message: task.TITLE_ERROR });
  assert.throws(() => task.title(null), { message: task.TITLE_ERROR });
  assert.equal(task.owner('  Ana '), 'Ana');
  assert.equal(task.owner(''), '');
  assert.equal(task.owner(undefined), '');
  assert.throws(() => task.owner('x'.repeat(121)), { message: task.OWNER_ERROR });
  assert.throws(() => task.owner(3), { message: task.OWNER_ERROR });
});

test('image file names use the pipeline sequence and a sanitised original name', () => {
  assert.equal(image.fileName(1, 'Foto da cozinha.PNG', 'image/png'), '01-Foto-da-cozinha.png');
  assert.equal(image.fileName(12, '../../etc/passwd', 'image/jpeg'), '12-passwd.jpg');
  assert.equal(image.fileName(100, 'café.webp', 'image/webp'), '100-caf.webp');
  assert.equal(image.fileName(3, '', 'image/gif'), '03-imagem.gif');
  assert.equal(image.fileName(4, 'a'.repeat(200) + '.png', 'image/png').length, 3 + 80 + 4);
  assert.match(image.fileName(5, 'x.svg', 'image/png'), /^05-x\.png$/);
});

test('task images must be PNG, JPEG, GIF or WebP data URLs of at most 15 MB', () => {
  const png = 'data:image/png;base64,' + Buffer.from('png').toString('base64');
  assert.deepEqual(image.parseImage({ mime: 'image/png', dataURL: png }).bytes, Buffer.from('png'));
  assert.throws(() => image.parseImage({ mime: 'image/svg+xml', dataURL: png }), { message: image.IMAGE_ERROR });
  assert.throws(() => image.parseImage({ mime: 'image/jpeg', dataURL: png }), { message: image.IMAGE_ERROR });
  assert.throws(() => image.parseImage({ mime: 'image/png', dataURL: 'data:image/png;base64,%%%' }), { message: image.IMAGE_ERROR });
});

test('the image ids a document refers to are collected from image blocks', () => {
  const doc = [{ type: 'paragraph', runs: [] }, { type: 'image', imageId: 'i1' }, { type: 'image', imageId: 'i2' }, { type: 'image', imageId: 'i1' }];
  assert.deepEqual([...image.referencedImages(doc)], ['i1', 'i2']);
});

test('a comment needs text or an image', () => {
  assert.equal(comment.isEmpty([{ type: 'paragraph', runs: [{ text: '  ', marks: {} }] }]), true);
  assert.equal(comment.isEmpty([]), true);
  assert.equal(comment.isEmpty([{ type: 'paragraph', runs: [{ text: 'ok', marks: {} }] }]), false);
  assert.equal(comment.isEmpty([{ type: 'image', imageId: 'i1' }]), false);
});
