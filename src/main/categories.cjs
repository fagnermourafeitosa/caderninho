const {randomUUID}=require('node:crypto');
const {normalize,tokens}=require('../shared/category-text.js');
const {event}=require('./temporal.cjs');
function installCategories(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS note_categories(note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,category_id TEXT NOT NULL REFERENCES categories(id),source TEXT NOT NULL CHECK(source IN ('manual','inline')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,PRIMARY KEY(note_id,category_id,source));
    CREATE INDEX IF NOT EXISTS category_pages ON note_categories(category_id,deleted_at);`);
}
function category(store,name,stamp) {
  const normalized=normalize(name);
  let row=store.db.prepare('SELECT * FROM categories WHERE key=?').get(normalized.key);
  if(!row) {
    row={id:randomUUID(),...normalized};
    store.db.prepare('INSERT INTO categories(id,name,key,created_at,updated_at) VALUES(?,?,?,?,?)').run(row.id,row.name,row.key,stamp,stamp);
    event(store,'category',row.id,'create',stamp);
  }
  return row;
}
function associate(store,noteId,categoryId,source,stamp) {
  const previous=store.db.prepare('SELECT * FROM note_categories WHERE note_id=? AND category_id=? AND source=?').get(noteId,categoryId,source);
  if(previous&&!previous.deleted_at) return;
  store.db.prepare('INSERT INTO note_categories(note_id,category_id,source,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(note_id,category_id,source) DO UPDATE SET deleted_at=NULL,updated_at=excluded.updated_at').run(noteId,categoryId,source,stamp,stamp);
  event(store,'note',noteId,'category-attach',stamp,{categoryId,source});
}
function detach(store,noteId,categoryId,source,stamp) {
  const changed=store.db.prepare('UPDATE note_categories SET deleted_at=?,updated_at=? WHERE note_id=? AND category_id=? AND source=? AND deleted_at IS NULL').run(stamp,stamp,noteId,categoryId,source);
  if(changed.changes) event(store,'note',noteId,'category-detach',stamp,{categoryId,source});
}
function syncCategories(store,noteId,stamp,pendingOffset=null) {
  const note=store.note(noteId);
  // Board text is extracted from drawings: its hashtags are not inline categories (spec 007).
  if(note.type==='boards') return;
  const source=note.editor_document?require('../shared/editor-document.js').text(JSON.parse(note.editor_document).map(block=>({...block,runs:block.runs?.map(run=>run.marks.code?{...run,text:' '.repeat(run.text.length)}:run),rows:block.rows?.map(row=>row.map(cell=>cell.map(run=>run.marks.code?{...run,text:' '.repeat(run.text.length)}:run)))}))):note.body;
  const text=source;
  const keys=new Set(), ids=new Set();
  for(const token of tokens(text,pendingOffset)) if(!keys.has(token.key)) { keys.add(token.key); const row=category(store,token.name,stamp); ids.add(row.id); associate(store,noteId,row.id,'inline',stamp); }
  for(const link of store.db.prepare("SELECT category_id FROM note_categories WHERE note_id=? AND source='inline' AND deleted_at IS NULL").all(noteId)) if(!ids.has(link.category_id)) detach(store,noteId,link.category_id,'inline',stamp);
}
function categoryState(store,notes) {
  const categories=store.db.prepare('SELECT * FROM categories ORDER BY key').all().map(row=>({id:row.id,name:row.name,key:row.key,created:row.created_at,updated:row.updated_at}));
  const links=store.db.prepare('SELECT * FROM note_categories WHERE deleted_at IS NULL').all();
  for(const note of notes) note.categories=categories.filter(category=>links.some(link=>link.note_id===note.id&&link.category_id===category.id)).map(category=>({...category,sources:links.filter(link=>link.note_id===note.id&&link.category_id===category.id).map(link=>link.source)}));
  return categories;
}
module.exports={installCategories,category,associate,detach,syncCategories,categoryState};
