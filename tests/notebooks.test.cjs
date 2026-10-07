const {createPipelineUseCases}=require('../src/main/pipelines/compose.cjs');
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../src/main/store.cjs');const {COLORS}=require('../src/main/notebooks.cjs');
function fixture(t) {const directory=fs.mkdtempSync(path.join(os.tmpdir(),'caderninho-notebooks-'));const stores=[];const open=()=>{const store=new Store(directory);stores.push(store);return store;};t.after(()=>{stores.reverse().forEach(store=>store.close());fs.rmSync(directory,{recursive:true,force:true});});return {store:open(),open};}
function createBook(store,name) {return store.dispatch('notebook:create',{name,description:'Um projeto',color:COLORS[1]}).activeNotebook;}
test('every page has a notebook and changing notebooks scopes selected pages',t=>{
  const {store,open}=fixture(t),initial=store.snapshot();assert.equal(initial.notebooks.length,1);const first=initial.activeNotebook;
  assert.equal(initial.notes[0].notebookId,first);
  const second=createBook(store,'Trabalho');
  assert.equal(store.snapshot().selected.notes,null);
  for(const type of ['notes','tasks','reminders']) {const state=store.dispatch('note:create',{type});assert.equal(state.notes.find(note=>note.id===state.selected[type]).notebookId,second);assert.equal(state.activeNotebook,second);}
  const state=store.dispatch('notebook:select',{id:first});assert.equal(state.selected.notes,'welcome');assert.equal(state.selected.tasks,null);
  store.dispatch('notebook:update',{id:second,name:'Pesquisa',description:'Outro nome',color:COLORS[3]});
  const reopened=open().snapshot();assert.equal(reopened.activeNotebook,first);assert.equal(reopened.notebooks.find(book=>book.id===second).name,'Pesquisa');assert.equal(reopened.notebooks.find(book=>book.id===second).color,COLORS[3]);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
});
test('removing a notebook transfers active pages and trash without losing reminders',t=>{
  const {store}=fixture(t),first=store.snapshot().activeNotebook,second=createBook(store,'Segundo');
  store.dispatch('note:create',{type:'tasks'});const tasks=store.snapshot().selected.tasks;createPipelineUseCases({store}).createTask({pipelineId:tasks,title:'Preservar'});store.dispatch('note:trash',{id:tasks});
  store.dispatch('note:create',{type:'reminders'});const reminder=store.snapshot().selected.reminders;const due=new Date(Date.now()+60000).toISOString();store.dispatch('schedule:activate',{id:reminder,due});
  store.dispatch('notebook:remove',{id:second,targetId:first});
  const state=store.snapshot();assert.equal(state.notebooks.length,1);assert.equal(state.activeNotebook,first);assert.equal(state.notes.find(note=>note.id===tasks).notebookId,first);assert.equal(state.notes.find(note=>note.id===tasks).trashed,true);assert.deepEqual(state.pipelines.find(pipeline=>pipeline.id===tasks).tasks.map(task=>task.title),['Preservar']);assert.equal(state.notes.find(note=>note.id===reminder).scheduledAt,due);
  assert.ok(store.db.prepare('SELECT deleted_at FROM notebooks WHERE id=?').get(second).deleted_at);
  assert.throws(()=>store.dispatch('notebook:remove',{id:first,targetId:first}));assert.equal(store.snapshot().notebooks.length,1);
});
test('page moves and reminder alerts preserve their notebook context',t=>{
  const {store}=fixture(t),first=store.snapshot().activeNotebook;
  const second=createBook(store,'Outro');
  store.dispatch('note:move',{id:'welcome',notebookId:second});assert.equal(store.note('welcome').notebook_id,second);
  store.dispatch('notebook:select',{id:first});assert.equal(store.snapshot().activeNotebook,first);
  store.dispatch('note:create',{type:'reminders'});const id=store.snapshot().selected.reminders;store.dispatch('schedule:activate',{id,due:new Date(store.now()+1000).toISOString()});store.dispatch('notebook:select',{id:second});store.now=()=>Date.now()+2000;assert.equal(store.due()[0].id,id);
  assert.throws(()=>store.dispatch('notebook:create',{name:'',color:COLORS[0]}));assert.throws(()=>store.dispatch('notebook:create',{name:'Inválido',color:'#000000'}));
});
test('upgrading a database without notebooks preserves existing pages and dates',t=>{
  const {store,open}=fixture(t);store.dispatch('note:update',{id:'welcome',body:'Texto existente #memória'});const previous=store.note('welcome');
  // Reproduce the previous schema in this isolated database, never in userData.
  store.db.exec('DROP TRIGGER notes_notebook_required_insert; DROP TRIGGER notes_notebook_required_update; DROP INDEX notes_notebook; ALTER TABLE notes DROP COLUMN notebook_id; DROP TABLE notebooks;');store.db.prepare("DELETE FROM settings WHERE key='active_notebook'").run();
  const upgraded=open().snapshot();assert.equal(upgraded.notes[0].body,previous.body);assert.equal(upgraded.notes[0].created,previous.created);assert.equal(upgraded.notes[0].updated,previous.updated);assert.equal(upgraded.notes[0].notebookId,upgraded.activeNotebook);assert.equal(upgraded.notebooks[0].name,'Meu caderno');assert.equal(upgraded.notes[0].categories[0].key,'memória');
});
