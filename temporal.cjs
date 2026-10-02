const { randomUUID } = require('node:crypto');
const { checkbox } = require('./smart-text.js');
function installTemporal(store) {
  const columns = (table, definitions) => {
    const present = new Set(store.db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
    for (const name of definitions) if (!present.has(name)) store.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} TEXT`);
  };
  columns('notes', ['deleted_at','fired_at']); columns('task_items', ['created_at','updated_at','checked_at','unchecked_at','deleted_at']);
  columns('settings',['created_at','updated_at']);
  columns('cuts', ['updated_at','deleted_at']); columns('media_blobs', ['created_at','updated_at']);
  store.db.exec(`CREATE TABLE IF NOT EXISTS activity_events(id INTEGER PRIMARY KEY AUTOINCREMENT,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,at TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS inline_tasks(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,line_index INTEGER NOT NULL,title TEXT NOT NULL,done INTEGER NOT NULL,created_at TEXT,updated_at TEXT,checked_at TEXT,unchecked_at TEXT,deleted_at TEXT);
    CREATE INDEX IF NOT EXISTS inline_note ON inline_tasks(note_id);
    CREATE INDEX IF NOT EXISTS activity_entity ON activity_events(entity_type,entity_id,id);`);
  store.db.prepare('UPDATE task_items SET checked_at=completed_at WHERE checked_at IS NULL AND completed_at IS NOT NULL').run();
}
function event(store, type, id, action, stamp, details = {}) { store.db.prepare('INSERT INTO activity_events(entity_type,entity_id,action,at,details) VALUES(?,?,?,?,?)').run(type, id, action, stamp, JSON.stringify(details)); }
function syncInline(store, note, stamp, legacy = false) {
  const existing = store.db.prepare('SELECT * FROM inline_tasks WHERE note_id=? ORDER BY deleted_at IS NOT NULL,line_index').all(note.id);
  let code=false;
  const entries = note.body.split('\n').flatMap((line,index) => { if(/^```/.test(line)){code=!code;return [];} if(code)return []; const match = checkbox(line); return match ? [{ index, title: line.slice(match[0].length), done: match[1].toLowerCase() === 'x' }] : []; });
  const used = new Set();
  for (const entry of entries) {
    let item = existing.find(item => !used.has(item.id) && item.title === entry.title && item.line_index === entry.index && !item.deleted_at)
      || existing.find(item => !used.has(item.id) && item.title === entry.title && !item.deleted_at)
      || existing.find(item => !used.has(item.id) && item.line_index === entry.index && !item.deleted_at && !entries.some(other => other.title === item.title))
      || existing.find(item => !used.has(item.id) && item.title === entry.title && item.deleted_at);
    if (!item) {
      const id = randomUUID(), at = legacy ? null : stamp;
      store.db.prepare('INSERT INTO inline_tasks(id,note_id,line_index,title,done,created_at,updated_at,checked_at) VALUES(?,?,?,?,?,?,?,?)').run(id,note.id,entry.index,entry.title,Number(entry.done),at,at,entry.done ? at : null);
      if (!legacy) { event(store,'inline-task',id,'create',stamp,{noteId:note.id}); if (entry.done) event(store,'inline-task',id,'check',stamp); }
      continue;
    }
    used.add(item.id);
    if (item.deleted_at || item.line_index !== entry.index || item.title !== entry.title || Boolean(item.done) !== entry.done) {
      const changed = Boolean(item.done) !== entry.done;
      store.db.prepare('UPDATE inline_tasks SET line_index=?,title=?,done=?,updated_at=?,checked_at=?,unchecked_at=?,deleted_at=NULL WHERE id=?').run(entry.index,entry.title,Number(entry.done),stamp,changed && entry.done ? stamp : item.checked_at,changed && !entry.done ? stamp : item.unchecked_at,item.id);
      if (item.deleted_at) event(store,'inline-task',item.id,'restore',stamp);
      if (changed) event(store,'inline-task',item.id,entry.done ? 'check' : 'uncheck',stamp);
    }
  }
  for (const item of existing) if (!used.has(item.id) && !item.deleted_at) {
    store.db.prepare('UPDATE inline_tasks SET deleted_at=?,updated_at=? WHERE id=?').run(stamp,stamp,item.id); event(store,'inline-task',item.id,'trash',stamp);
  }
}
function taskDTO(item) { return { id:item.id,title:item.title,done:Boolean(item.done),created:item.created_at,updated:item.updated_at,checkedAt:item.checked_at,uncheckedAt:item.unchecked_at,deletedAt:item.deleted_at,lineIndex:item.line_index }; }
module.exports = { installTemporal, event, syncInline, taskDTO };
