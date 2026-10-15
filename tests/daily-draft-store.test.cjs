const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/main/store.cjs');
const { createDailyDraftUseCases } = require('../src/main/daily-draft/compose.cjs');

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-daily-draft-'));
  let now = Date.parse('2026-10-15T10:00:00');
  const store = new Store(directory, { now: () => now });
  const drafts = createDailyDraftUseCases({ store });
  t.after(() => { try { store.close(); } catch {} fs.rmSync(directory, { recursive: true, force: true }); });
  const notebookId = store.snapshot().activeNotebook;
  const noteCount = () => store.snapshot().notes.length;
  const advance = ms => { now += ms; };
  return { store, drafts, notebookId, noteCount, advance };
}

test('a notebook without typing has no daily note and opening it creates nothing', t => {
  const { drafts, notebookId, noteCount } = setup(t);
  const before = noteCount();
  assert.deepEqual(drafts.openDailyDraft({ notebookId }), { day: '2026-10-15', noteId: null });
  assert.equal(noteCount(), before);
});

test('the first character creates one ordinary note without moving the selection, and starting again reuses it', t => {
  const { store, drafts, notebookId, noteCount } = setup(t);
  const before = store.snapshot(), count = noteCount();
  const { day, noteId } = drafts.startDailyDraft({ notebookId });
  assert.equal(day, '2026-10-15');
  const after = store.snapshot(), note = after.notes.find(item => item.id === noteId);
  assert.equal(noteCount(), count + 1);
  assert.equal(note.type, 'notes');
  assert.equal(note.notebookId, notebookId);
  assert.equal(note.trashed, false);
  assert.deepEqual([after.activeView, after.activeNotebook, after.selected.notes], [before.activeView, before.activeNotebook, before.selected.notes]);
  assert.deepEqual(drafts.openDailyDraft({ notebookId }), { day: '2026-10-15', noteId });
  assert.equal(drafts.startDailyDraft({ notebookId }).noteId, noteId);
  assert.equal(noteCount(), count + 1);
});

test('each notebook has its own daily note and a new day starts blank', t => {
  const { store, drafts, notebookId, advance } = setup(t);
  const first = drafts.startDailyDraft({ notebookId }).noteId;
  store.dispatch('notebook:create', { name: 'Trabalho', color: store.snapshot().notebookColors[1] });
  const other = store.snapshot().activeNotebook;
  assert.deepEqual(drafts.openDailyDraft({ notebookId: other }), { day: '2026-10-15', noteId: null });
  const second = drafts.startDailyDraft({ notebookId: other }).noteId;
  assert.notEqual(second, first);
  assert.equal(store.snapshot().notes.find(note => note.id === second).notebookId, other);
  assert.equal(drafts.openDailyDraft({ notebookId }).noteId, first);
  advance(24 * 60 * 60 * 1000);
  assert.deepEqual(drafts.openDailyDraft({ notebookId }), { day: '2026-10-16', noteId: null });
  assert.notEqual(drafts.startDailyDraft({ notebookId }).noteId, first);
});

test('a trashed daily note leaves the day blank and the next character starts another one', t => {
  const { store, drafts, notebookId } = setup(t);
  const first = drafts.startDailyDraft({ notebookId }).noteId;
  store.dispatch('note:trash', { id: first });
  assert.equal(drafts.openDailyDraft({ notebookId }).noteId, null);
  const second = drafts.startDailyDraft({ notebookId }).noteId;
  assert.notEqual(second, first);
  store.dispatch('note:restore', { id: first });
  assert.equal(drafts.openDailyDraft({ notebookId }).noteId, second);
  store.dispatch('note:trash', { id: second }); store.dispatch('note:purge', { id: second });
  assert.equal(drafts.openDailyDraft({ notebookId }).noteId, null);
});

test('an unknown notebook is refused and nothing is written', t => {
  const { drafts, noteCount } = setup(t);
  const before = noteCount();
  assert.throws(() => drafts.startDailyDraft({ notebookId: 'missing' }), /Caderno inválido/);
  assert.equal(noteCount(), before);
});

test('the snapshot carries the active notebook daily note so the home page renders from one state', t => {
  const { store, drafts, notebookId } = setup(t);
  assert.deepEqual(store.snapshot().dailyDraft, { day: '2026-10-15', noteId: null });
  const { noteId } = drafts.startDailyDraft({ notebookId });
  assert.deepEqual(store.snapshot().dailyDraft, { day: '2026-10-15', noteId });
  store.dispatch('notebook:create', { name: 'Trabalho', color: store.snapshot().notebookColors[1] });
  assert.deepEqual(store.snapshot().dailyDraft, { day: '2026-10-15', noteId: null });
});

test('home sections fold under the new keys and the latest-note strip is gone', t => {
  const { store } = setup(t);
  store.setSetting('home_fold_latest', '1');
  for (const strip of ['draft', 'graph', 'reminders', 'notes', 'pipeline']) store.dispatch('home:fold', { strip, folded: true });
  assert.deepEqual(store.snapshot().homeFolded, { draft: true, graph: true, reminders: true, notes: true, pipeline: true });
  assert.throws(() => store.dispatch('home:fold', { strip: 'latest', folded: true }), /Faixa inválida/);
  const reopened = new Store(store.directory, { now: store.now });
  t.after(() => reopened.close());
  assert.equal(reopened.getSetting('home_fold_latest'), undefined);
});
