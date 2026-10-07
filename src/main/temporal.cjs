function installTemporal(store) {
  const columns = (table, definitions) => {
    const present = new Set(store.db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
    for (const name of definitions) if (!present.has(name)) store.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} TEXT`);
  };
  columns('notes', ['deleted_at','fired_at']);
  columns('settings',['created_at','updated_at']);
  columns('cuts', ['updated_at','deleted_at']); columns('media_blobs', ['created_at','updated_at']);
  store.db.exec(`CREATE TABLE IF NOT EXISTS activity_events(id INTEGER PRIMARY KEY AUTOINCREMENT,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,at TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}');
    CREATE INDEX IF NOT EXISTS activity_entity ON activity_events(entity_type,entity_id,id);`);
}
function event(store, type, id, action, stamp, details = {}) { store.db.prepare('INSERT INTO activity_events(entity_type,entity_id,action,at,details) VALUES(?,?,?,?,?)').run(type, id, action, stamp, JSON.stringify(details)); }
module.exports = { installTemporal, event };
