const {randomUUID}=require('node:crypto');
const {event}=require('./temporal.cjs');
function installSourceActions(store){store.db.exec(`CREATE TABLE IF NOT EXISTS source_actions(
 id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('task','reminder')),title TEXT NOT NULL,origin TEXT NOT NULL,
 due TEXT,done INTEGER NOT NULL DEFAULT 0,fired_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 checked_at TEXT,unchecked_at TEXT,deleted_at TEXT,cancelled_at TEXT);
 CREATE INDEX IF NOT EXISTS source_actions_note ON source_actions(note_id);`);if(!store.db.prepare('PRAGMA table_info(source_actions)').all().some(column=>column.name==='cancelled_at'))store.db.exec('ALTER TABLE source_actions ADD COLUMN cancelled_at TEXT');}
function sourceActions(store,trashed=false){return store.db.prepare(`SELECT a.*,n.title AS note_title,n.notebook_id FROM source_actions a JOIN notes n ON n.id=a.note_id WHERE n.trashed=0 AND a.deleted_at ${trashed?'IS NOT NULL':'IS NULL'} ORDER BY a.created_at,a.rowid`).all().map(row=>({id:row.id,noteId:row.note_id,notebookId:row.notebook_id,noteTitle:row.note_title,kind:row.kind,title:row.title,origin:JSON.parse(row.origin),due:row.due,done:Boolean(row.done),fired:Boolean(row.fired_at),firedAt:row.fired_at,expired:Boolean(row.cancelled_at),cancelledAt:row.cancelled_at,created:row.created_at,updated:row.updated_at,checkedAt:row.checked_at,uncheckedAt:row.unchecked_at,deletedAt:row.deleted_at}));}
function sourceCommand(store,name,input,stamp){
 if(!name.startsWith('source:'))return false;
 if(name==='source:create'){
  const note=store.note(input.noteId,'notes');if(note.trashed)throw new Error('Restaure a nota primeiro.');
  const title=String(input.title||'').trim();if(!title||title.length>500)throw new Error('Escreva uma ação com até 500 caracteres.');
  if(!['task','reminder'].includes(input.kind))throw new Error('Tipo de ação inválido.');
  let due=null;if(input.kind==='reminder'){if(!input.due||!Number.isFinite(Date.parse(input.due))||Date.parse(input.due)<=store.now())throw new Error('Escolha uma data e hora futuras.');due=new Date(input.due).toISOString();}
  const origin=input.origin;if(!origin||!['text','cut'].includes(origin.kind))throw new Error('Selecione um trecho ou uma mídia.');
  let safe;
  if(origin.kind==='cut'){const cut=store.cut(origin.cutId);if(cut.note_id!==note.id||cut.trashed)throw new Error('Esta mídia não está disponível.');safe={kind:'cut',cutId:cut.id,quote:cut.title||'Imagem'};}
  else{
   const quote=String(origin.quote||'').slice(0,4000),parts=origin.parts;
   if(!quote.trim()||!Array.isArray(parts)||!parts.length||parts.length>100)throw new Error('Selecione um trecho menor.');
   const doc=note.editor_document?JSON.parse(note.editor_document):[];
   safe={kind:'text',quote,parts:parts.map(part=>{const block=doc.find(block=>block.id===part.blockId);if(!block||!Number.isInteger(part.start)||!Number.isInteger(part.end)||part.start<0||part.end<=part.start)throw new Error('Selecione o trecho novamente.');const text=block.type==='table'?require('../shared/editor-document.js').runText(block.rows[part.row]?.[part.column]||[]):require('../shared/editor-document.js').runText(block.runs||[]);if(part.end>text.length)throw new Error('O trecho mudou. Selecione novamente.');return {blockId:block.id,start:part.start,end:part.end,text:text.slice(part.start,part.end),row:part.row??null,column:part.column??null};})};
  }
  if(safe.kind==='text'){safe.quote=safe.parts.map(part=>part.text).join('\n');if(safe.quote.length>4000)throw new Error('Selecione um trecho de até 4.000 caracteres.');}
  const id=randomUUID();store.db.prepare('INSERT INTO source_actions(id,note_id,kind,title,origin,due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,note.id,input.kind,title,JSON.stringify(safe),due,stamp,stamp);event(store,'source-action',id,'create',stamp,{noteId:note.id});
 }else{
  const row=store.db.prepare('SELECT * FROM source_actions WHERE id=?').get(input.id);if(!row)throw new Error('Ação não encontrada.');const note=store.note(row.note_id);if(note.trashed)throw new Error('Restaure a nota primeiro.');
  if(row.deleted_at&&!['source:restore','source:purge'].includes(name))throw new Error('Restaure a ação primeiro.');
  if(name==='source:update'){const title=String(input.title||'').trim();if(!title||title.length>500)throw new Error('Escreva uma ação com até 500 caracteres.');let due=row.due;if(row.kind==='reminder'){if(!input.due||!Number.isFinite(Date.parse(input.due))||Date.parse(input.due)<=store.now())throw new Error('Escolha uma data e hora futuras.');due=new Date(input.due).toISOString();}store.db.prepare('UPDATE source_actions SET title=?,due=?,fired_at=?,cancelled_at=NULL,updated_at=? WHERE id=?').run(title,due,due===row.due?row.fired_at:null,stamp,row.id);event(store,'source-action',row.id,'update',stamp);}
  else if(name==='source:toggle'){if(row.kind!=='task')throw new Error('Este item é um lembrete.');store.db.prepare('UPDATE source_actions SET done=?,checked_at=?,unchecked_at=?,updated_at=? WHERE id=?').run(Number(!row.done),row.done?row.checked_at:stamp,row.done?stamp:row.unchecked_at,stamp,row.id);event(store,'source-action',row.id,row.done?'uncheck':'check',stamp);}
  else if(name==='source:remove'){store.db.prepare('UPDATE source_actions SET deleted_at=?,updated_at=? WHERE id=?').run(stamp,stamp,row.id);event(store,'source-action',row.id,'trash',stamp);}
  else if(name==='source:restore'){if(!row.deleted_at)throw new Error('A ação já está na página.');store.db.prepare('UPDATE source_actions SET deleted_at=NULL,updated_at=?,cancelled_at=? WHERE id=?').run(stamp,row.kind==='reminder'&&!row.fired_at&&Date.parse(row.due)<=store.now()?stamp:row.cancelled_at,row.id);event(store,'source-action',row.id,'restore',stamp);store.select(note);}
  else if(name==='source:purge'){if(!row.deleted_at)throw new Error('Mova para a lixeira primeiro.');store.db.prepare('DELETE FROM source_actions WHERE id=?').run(row.id);event(store,'source-action',row.id,'purge',stamp);}
  else throw new Error('Ação inválida.');
 }
 return true;
}
function dueSourceActions(store,stamp){const rows=store.db.prepare("SELECT a.* FROM source_actions a JOIN notes n ON n.id=a.note_id WHERE n.trashed=0 AND a.deleted_at IS NULL AND a.kind='reminder' AND a.fired_at IS NULL AND a.cancelled_at IS NULL AND a.due<=?").all(stamp);for(const row of rows){store.db.prepare('UPDATE source_actions SET fired_at=?,updated_at=? WHERE id=?').run(stamp,stamp,row.id);event(store,'source-action',row.id,'fire',stamp);}return rows.map(row=>({id:row.note_id,sourceActionId:row.id,title:row.title,body:JSON.parse(row.origin).quote}));}
module.exports={installSourceActions,sourceActions,sourceCommand,dueSourceActions};
