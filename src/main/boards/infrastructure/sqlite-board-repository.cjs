// SQLite persistence for boards (implements BoardRepositoryPort) and its schema migration.
const EMPTY_SCENE = JSON.stringify({ elements: [], viewport: { scrollX: 0, scrollY: 0, zoom: 1 } });

// The notes CHECK constraint cannot be altered in place: rebuild the table, keeping its indexes and triggers.
function allowBoardPages(store) {
  const schema = store.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notes'").get().sql;
  if (schema.includes("'boards'")) return;
  const dependents = store.db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='notes' AND type IN ('index','trigger') AND sql IS NOT NULL").all().map(row => row.sql);
  store.db.exec('PRAGMA foreign_keys = OFF');
  try {
    store.transaction(() => {
      store.db.exec(schema.replace(/CREATE TABLE "?notes"?/i, 'CREATE TABLE notes_boards_migration').replace("'reminders')", "'reminders','boards')"));
      store.db.exec('INSERT INTO notes_boards_migration SELECT * FROM notes; DROP TABLE notes; ALTER TABLE notes_boards_migration RENAME TO notes');
      for (const sql of dependents) store.db.exec(sql);
      if (store.db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Migração dos quadros quebrou uma referência.');
    });
  } finally { store.db.exec('PRAGMA foreign_keys = ON'); }
}

function installBoards(store) {
  allowBoardPages(store);
  store.db.exec(`CREATE TABLE IF NOT EXISTS boards(note_id TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE, version INTEGER NOT NULL, scene TEXT NOT NULL, thumbnail BLOB, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS board_files(note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, file_id TEXT NOT NULL, blob_id TEXT NOT NULL REFERENCES media_blobs(id), PRIMARY KEY(note_id, file_id));
    CREATE INDEX IF NOT EXISTS board_files_blob ON board_files(blob_id);`);
}

// Runs inside the note:create transaction, so the page and its board exist together or not at all.
function createEmptyBoard(store, noteId, stamp) {
  store.db.prepare('INSERT INTO boards(note_id,version,scene,updated_at) VALUES(?,0,?,?)').run(noteId, EMPTY_SCENE, stamp);
}

// Board pages whose index row can show a thumbnail; the image itself loads lazily.
const boardsWithThumbnail = store => new Set(store.db.prepare('SELECT note_id FROM boards WHERE thumbnail IS NOT NULL').all().map(row => row.note_id));

class SqliteBoardRepository {
  constructor(store) { this.store = store; this.db = store.db; }
  page(noteId) {
    const row = this.db.prepare("SELECT id,trashed FROM notes WHERE id=? AND type='boards'").get(noteId);
    return row ? { noteId: row.id, trashed: Boolean(row.trashed) } : null;
  }
  load(noteId) {
    const row = this.db.prepare('SELECT b.* FROM boards b JOIN notes n ON n.id=b.note_id WHERE b.note_id=?').get(noteId);
    if (!row) return null;
    const fileIds = this.db.prepare('SELECT file_id FROM board_files WHERE note_id=? ORDER BY file_id').all(noteId).map(file => file.file_id);
    return { noteId, version: row.version, scene: JSON.parse(row.scene), fileIds };
  }
  // Scene, kept files and the page's searchable text commit together or not at all.
  save({ noteId, version, scene, fileIds, text }) {
    const updated = new Date(this.store.now()).toISOString();
    this.store.transaction(() => {
      const changed = this.db.prepare('UPDATE boards SET version=?,scene=?,updated_at=? WHERE note_id=? AND version=?').run(version, JSON.stringify(scene), updated, noteId, version - 1);
      if (changed.changes !== 1) throw new Error('O quadro mudou em outra janela. Recarregue.');
      const kept = new Set(fileIds);
      for (const { file_id: fileId } of this.db.prepare('SELECT file_id FROM board_files WHERE note_id=?').all(noteId)) if (!kept.has(fileId)) this.db.prepare('DELETE FROM board_files WHERE note_id=? AND file_id=?').run(noteId, fileId);
      this.db.prepare('UPDATE notes SET body=?,updated=? WHERE id=?').run(text, updated, noteId);
    });
    return { updated };
  }
  attachFile(noteId, fileId, blobId) {
    this.db.prepare('INSERT INTO board_files(note_id,file_id,blob_id) VALUES(?,?,?) ON CONFLICT(note_id,file_id) DO UPDATE SET blob_id=excluded.blob_id').run(noteId, fileId, blobId);
  }
  saveThumbnail(noteId, png) { this.db.prepare('UPDATE boards SET thumbnail=? WHERE note_id=?').run(png, noteId); }
  thumbnail(noteId) {
    const row = this.db.prepare('SELECT thumbnail FROM boards WHERE note_id=?').get(noteId);
    return row?.thumbnail ? Buffer.from(row.thumbnail) : null;
  }
  files(noteId) {
    return this.db.prepare('SELECT f.file_id,f.blob_id,m.mime FROM board_files f JOIN media_blobs m ON m.id=f.blob_id WHERE f.note_id=? ORDER BY f.file_id').all(noteId).map(row => ({ fileId: row.file_id, blobId: row.blob_id, mime: row.mime }));
  }
}

module.exports = { installBoards, createEmptyBoard, boardsWithThumbnail, SqliteBoardRepository };
