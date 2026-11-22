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
  assert.equal(note.title, '', 'the daily note has no title until the user writes one');
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

// Spec 017: empty daily notes of past days go to the trash.
const DAY = 24 * 60 * 60 * 1000;
const noteOf = (store, id) => store.snapshot().notes.find(note => note.id === id);

test('an erased daily note goes to the trash once its day is over', t => {
  const { store, drafts, notebookId, advance } = setup(t);
  const { noteId } = drafts.startDailyDraft({ notebookId });
  store.dispatch('note:update', { id: noteId, body: 'a' });
  store.dispatch('note:update', { id: noteId, body: ' \n ' });
  advance(DAY);
  assert.deepEqual(drafts.closePastDailyDrafts(), { trashed: [noteId] });
  const note = noteOf(store, noteId);
  assert.equal(note.trashed, true);
  assert.equal(note.deletedAt, new Date(Date.parse('2026-10-16T10:00:00')).toISOString());
});

test('past daily notes with text, a title or an active media card are kept; a trashed card does not count', t => {
  const { store, drafts, notebookId, advance } = setup(t);
  const notebook = name => { store.dispatch('notebook:create', { name, color: store.snapshot().notebookColors[1] }); return store.snapshot().activeNotebook; };
  const withText = drafts.startDailyDraft({ notebookId }).noteId;
  store.dispatch('note:update', { id: withText, body: 'reunião às 10' });
  const withTitle = drafts.startDailyDraft({ notebookId: notebook('Título') }).noteId;
  store.dispatch('note:update', { id: withTitle, title: 'Ideias', body: '' });
  const withMedia = drafts.startDailyDraft({ notebookId: notebook('Mídia') }).noteId;
  store.dispatch('cut:create', { id: 'kept-card', noteId: withMedia, kind: 'link' });
  const trashedCard = drafts.startDailyDraft({ notebookId: notebook('Card na lixeira') }).noteId;
  store.dispatch('cut:create', { id: 'gone-card', noteId: trashedCard, kind: 'link' });
  store.dispatch('cut:trash', { id: 'gone-card' });
  advance(DAY);
  assert.deepEqual(drafts.closePastDailyDrafts(), { trashed: [trashedCard] });
  for (const id of [withText, withTitle, withMedia]) assert.equal(noteOf(store, id).trashed, false, id);
});

test("today's daily note is never swept, even when empty", t => {
  const { store, drafts, notebookId } = setup(t);
  const { noteId } = drafts.startDailyDraft({ notebookId });
  assert.deepEqual(drafts.closePastDailyDrafts(), { trashed: [] });
  assert.equal(noteOf(store, noteId).trashed, false);
  assert.deepEqual(drafts.openDailyDraft({ notebookId }), { day: '2026-10-15', noteId });
});

test('empty daily notes of every notebook and every past day are swept once', t => {
  const { store, drafts, notebookId, advance } = setup(t);
  const first = drafts.startDailyDraft({ notebookId }).noteId;
  store.dispatch('notebook:create', { name: 'Trabalho', color: store.snapshot().notebookColors[1] });
  const work = store.snapshot().activeNotebook;
  const second = drafts.startDailyDraft({ notebookId: work }).noteId;
  advance(DAY);
  const third = drafts.startDailyDraft({ notebookId }).noteId;
  advance(3 * DAY);
  assert.deepEqual(new Set(drafts.closePastDailyDrafts().trashed), new Set([first, second, third]));
  assert.deepEqual(drafts.closePastDailyDrafts(), { trashed: [] });
});

test('a swept daily note the user restores stays restored', t => {
  const { store, drafts, notebookId, advance } = setup(t);
  const { noteId } = drafts.startDailyDraft({ notebookId });
  advance(DAY);
  drafts.closePastDailyDrafts();
  store.dispatch('note:restore', { id: noteId });
  advance(DAY);
  assert.deepEqual(drafts.closePastDailyDrafts(), { trashed: [] });
  assert.equal(noteOf(store, noteId).trashed, false);
});

test('a swept daily note leaves the same trace as trashing a note by hand', t => {
  const { store, drafts, notebookId, advance } = setup(t);
  const swept = drafts.startDailyDraft({ notebookId }).noteId;
  store.dispatch('note:create', {});
  const manual = store.snapshot().selected.notes;
  advance(DAY);
  drafts.closePastDailyDrafts();
  store.dispatch('note:trash', { id: manual });
  const trace = id => { const note = noteOf(store, id); return { trashed: note.trashed, deletedAt: note.deletedAt, updated: note.updated, events: store.db.prepare("SELECT action, at FROM activity_events WHERE entity_type='note' AND entity_id=? AND action='trash'").all(id).map(row => ({ ...row })) }; };
  assert.deepEqual(trace(swept), trace(manual));
});
