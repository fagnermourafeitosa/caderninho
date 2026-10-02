const {randomUUID}=require('node:crypto');
const {event}=require('./temporal.cjs');
const COLORS=['#eacb8f','#c5d3ae','#deb9a7','#b9cfd7','#d0bed9','#e3c1c8'];
const DEFAULT_ID='default-notebook';
function installNotebooks(store) {
  store.transaction(()=>{
    store.db.exec(`CREATE TABLE IF NOT EXISTS notebooks(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',color TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);`);
    const stamp=new Date(store.now()).toISOString();
    store.db.prepare('INSERT OR IGNORE INTO notebooks(id,name,color,created_at,updated_at) VALUES(?,?,?,?,?)').run(DEFAULT_ID,'Meu caderno',COLORS[0],stamp,stamp);
    // SQLite cannot add a REFERENCES column with a non-null default to populated
    // tables. Backfill inside this transaction, then enforce mandatory membership.
    if(!store.db.prepare('PRAGMA table_info(notes)').all().some(column=>column.name==='notebook_id')) {
      store.db.exec('ALTER TABLE notes ADD COLUMN notebook_id TEXT REFERENCES notebooks(id)');
      store.db.prepare('UPDATE notes SET notebook_id=?').run(DEFAULT_ID);
    }
    store.db.exec(`CREATE INDEX IF NOT EXISTS notes_notebook ON notes(notebook_id);
      CREATE TRIGGER IF NOT EXISTS notes_notebook_required_insert BEFORE INSERT ON notes WHEN NEW.notebook_id IS NULL BEGIN SELECT RAISE(ABORT,'Uma página precisa de um caderno'); END;
      CREATE TRIGGER IF NOT EXISTS notes_notebook_required_update BEFORE UPDATE OF notebook_id ON notes WHEN NEW.notebook_id IS NULL BEGIN SELECT RAISE(ABORT,'Uma página precisa de um caderno'); END;`);
    if(!store.getSetting('active_notebook')) store.setSetting('active_notebook',DEFAULT_ID);
  });
}
function getNotebook(store,id) {
  const row=store.db.prepare('SELECT * FROM notebooks WHERE id=? AND deleted_at IS NULL').get(id);
  if(!row) throw new Error('Caderno não encontrado.'); return row;
}
function activeNotebook(store) {
  const id=store.getSetting('active_notebook');
  return store.db.prepare('SELECT id FROM notebooks WHERE id=? AND deleted_at IS NULL').get(id)?.id || store.db.prepare('SELECT id FROM notebooks WHERE deleted_at IS NULL ORDER BY created_at,rowid').get().id;
}
function notebookFields(input) {
  const name=String(input.name??'').trim(),description=String(input.description??'').trim();
  if(!name || name.length>80 || description.length>500 || !COLORS.includes(input.color)) throw new Error('Informe um nome de até 80 caracteres e escolha uma cor da paleta.');
  return {name,description,color:input.color};
}
function notebookCommand(store,action,input,stamp) {
  switch(action) {
    case 'notebook:create': {
      const fields=notebookFields(input),id=randomUUID();
      store.db.prepare('INSERT INTO notebooks(id,name,description,color,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id,fields.name,fields.description,fields.color,stamp,stamp);
      event(store,'notebook',id,'create',stamp); store.setSetting('active_notebook',id); break;
    }
    case 'notebook:update': {
      getNotebook(store,input.id); const fields=notebookFields(input);
      store.db.prepare('UPDATE notebooks SET name=?,description=?,color=?,updated_at=? WHERE id=?').run(fields.name,fields.description,fields.color,stamp,input.id);
      event(store,'notebook',input.id,'update',stamp); break;
    }
    case 'notebook:select': getNotebook(store,input.id); store.setSetting('active_notebook',input.id); break;
    case 'notebook:remove': {
      getNotebook(store,input.id);
      if(input.id===input.targetId) throw new Error('Escolha outro caderno para receber as páginas.');
      getNotebook(store,input.targetId);
      // Transfer all pages, including recoverable trash, so no record is orphaned.
      const notes=store.db.prepare('SELECT id FROM notes WHERE notebook_id=?').all(input.id);
      store.db.prepare('UPDATE notes SET notebook_id=?,updated=? WHERE notebook_id=?').run(input.targetId,stamp,input.id);
      for(const note of notes) event(store,'note',note.id,'move-notebook',stamp,{from:input.id,to:input.targetId});
      const draft=store.draft(); if(draft.notebookId===input.id) store.setSetting('quick_draft',JSON.stringify({...draft,notebookId:input.targetId,updated:stamp}));
      store.db.prepare('UPDATE notebooks SET deleted_at=?,updated_at=? WHERE id=?').run(stamp,stamp,input.id);
      event(store,'notebook',input.id,'remove',stamp,{targetId:input.targetId});
      if(activeNotebook(store)===input.id || store.getSetting('active_notebook')===input.id) store.setSetting('active_notebook',input.targetId);
      break;
    }
    case 'note:move': {
      const note=store.note(input.id);getNotebook(store,input.notebookId);
      store.db.prepare('UPDATE notes SET notebook_id=?,updated=? WHERE id=?').run(input.notebookId,stamp,note.id);
      event(store,'note',note.id,'move-notebook',stamp,{from:note.notebook_id,to:input.notebookId}); store.setSetting('active_notebook',input.notebookId);break;
    }
    default:return false;
  }
  return true;
}
function notebookState(store) {
  return store.db.prepare('SELECT * FROM notebooks WHERE deleted_at IS NULL ORDER BY created_at,rowid').all().map(row=>({id:row.id,name:row.name,description:row.description,color:row.color,created:row.created_at,updated:row.updated_at,count:store.db.prepare('SELECT count(*) AS count FROM notes WHERE notebook_id=? AND trashed=0').get(row.id).count}));
}
module.exports={COLORS,installNotebooks,getNotebook,activeNotebook,notebookCommand,notebookState};
