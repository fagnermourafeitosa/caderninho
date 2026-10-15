// SQLite storage of the related-pages caches (vectors by content hash and model, text read from images) and preferences.
const PREFERENCE_KEYS = { enabled: 'related_enabled', limit: 'related_limit', sensitivity: 'related_sensitivity' };
const decode = { enabled: value => value === '1', limit: Number, sensitivity: String };
const encode = { enabled: value => (value ? '1' : '0'), limit: String, sensitivity: String };

class SqliteRelatedRepository {
  constructor(store) {
    this.store = store;
    store.db.exec('CREATE TABLE IF NOT EXISTS related_vectors(id TEXT PRIMARY KEY,hash TEXT NOT NULL,model TEXT NOT NULL,vector TEXT NOT NULL); CREATE TABLE IF NOT EXISTS related_ocr(blob_id TEXT PRIMARY KEY,text TEXT NOT NULL,updated_at TEXT NOT NULL);');
  }
  vector(id) { return this.store.db.prepare('SELECT hash,model FROM related_vectors WHERE id=?').get(id); }
  vectors(model) { return this.store.db.prepare('SELECT id,hash,vector FROM related_vectors WHERE model=?').all(model).map(row => ({ id: row.id, hash: row.hash, vector: JSON.parse(row.vector) })); }
  saveVector(id, hash, model, vector) { this.store.db.prepare('INSERT OR REPLACE INTO related_vectors VALUES(?,?,?,?)').run(id, hash, model, JSON.stringify(vector)); }
  pruneVectors(activeIds) {
    for (const { id } of this.store.db.prepare('SELECT id FROM related_vectors').all()) if (!activeIds.has(id)) this.store.db.prepare('DELETE FROM related_vectors WHERE id=?').run(id);
  }
  clearVectors() { this.store.db.prepare('DELETE FROM related_vectors').run(); }
  ocrText() { return Object.fromEntries(this.store.db.prepare('SELECT blob_id,text FROM related_ocr').all().map(row => [row.blob_id, row.text])); }
  imagesWithoutText() {
    return this.store.db.prepare("SELECT DISTINCT c.blob_id FROM cuts c JOIN notes n ON n.id=c.note_id LEFT JOIN related_ocr o ON o.blob_id=c.blob_id WHERE c.kind='image' AND c.trashed=0 AND n.trashed=0 AND o.blob_id IS NULL").all().map(row => row.blob_id);
  }
  preferences() {
    const stored = {};
    for (const [field, key] of Object.entries(PREFERENCE_KEYS)) { const value = this.store.getSetting(key); if (value !== undefined) stored[field] = decode[field](value); }
    return stored;
  }
  savePreferences(changes) {
    this.store.transaction(() => { for (const [field, value] of Object.entries(changes)) this.store.setSetting(PREFERENCE_KEYS[field], encode[field](value)); });
  }
  saveOcr(blobId, text) { this.store.db.prepare('INSERT OR REPLACE INTO related_ocr VALUES(?,?,?)').run(blobId, text, new Date().toISOString()); }
}

module.exports = { SqliteRelatedRepository };
