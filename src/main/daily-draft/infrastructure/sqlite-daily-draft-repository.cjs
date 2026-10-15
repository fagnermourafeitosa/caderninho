// SQLite adapter of the Daily draft context: the (notebook, day) -> note mapping.
// The note itself is an ordinary note inserted through the notes store.
const { randomUUID } = require('node:crypto');
const { getNotebook } = require('../../notebooks.cjs');
const { currentNote } = require('../domain/daily-draft.cjs');
const NOTE_LIMIT = 3000;
function installDailyDrafts(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS daily_drafts(notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, day TEXT NOT NULL, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, created_at TEXT NOT NULL, PRIMARY KEY(notebook_id, day));
    CREATE INDEX IF NOT EXISTS daily_drafts_note ON daily_drafts(note_id);`);
  // The latest-note home strip was replaced by the daily note (spec 012).
  store.db.prepare("DELETE FROM settings WHERE key='home_fold_latest'").run();
}

class SqliteDailyDraftRepository {
  constructor(store) { this.store = store; }
  today() { return this.store.dayKey(); }
  stamp() { return new Date(this.store.now()).toISOString(); }
  transaction(work) { return this.store.transaction(work); }
  notebook(notebookId) {
    try { return getNotebook(this.store, notebookId); } catch { throw new Error('Caderno inválido.'); }
  }
  createNote(notebookId) {
    if (this.store.db.prepare('SELECT count(*) AS total FROM notes').get().total >= NOTE_LIMIT) throw new Error('Limite de 3.000 páginas atingido.');
    const id = randomUUID(), stamp = this.stamp();
    this.store.insert({ id, type: 'notes', title: 'Nova nota', body: '', notebookId, created: stamp, updated: stamp });
    return id;
  }
  save(notebookId, day, noteId) {
    this.store.db.prepare('INSERT INTO daily_drafts(notebook_id,day,note_id,created_at) VALUES(?,?,?,?) ON CONFLICT(notebook_id,day) DO UPDATE SET note_id=excluded.note_id,created_at=excluded.created_at').run(notebookId, day, noteId, this.stamp());
  }
  find(notebookId, day) {
    const row = this.store.db.prepare('SELECT d.note_id, n.trashed FROM daily_drafts d JOIN notes n ON n.id = d.note_id WHERE d.notebook_id = ? AND d.day = ?').get(notebookId, day);
    return row ? { noteId: row.note_id, trashed: Boolean(row.trashed) } : null;
  }
}

// Read model for the snapshot: today's daily note of a notebook.
function dailyDraftState(store, notebookId, day) {
  return { day, noteId: currentNote(new SqliteDailyDraftRepository(store).find(notebookId, day)) };
}

module.exports = { installDailyDrafts, dailyDraftState, SqliteDailyDraftRepository };
