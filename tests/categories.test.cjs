const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../store.cjs');
const {tokens,normalize}=require('../category-text.js');
function fixture(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'caderninho-categories-'));
  const stores=[]; const open=()=>{const store=new Store(directory);stores.push(store);return store;};
  t.after(()=>{stores.reverse().forEach(store=>store.close());fs.rmSync(directory,{recursive:true,force:true});});
  return {store:open(),open};
}
const page=(store,id)=>store.snapshot().notes.find(note=>note.id===id);
test('hashtags support accents and ignore escaped text, URL fragments, code and headings',()=>{
  assert.deepEqual(tokens('Ideia #ação #Trabalho https://site.test/#fragmento \\#literal `#codigo`\n```\n#codigo\n```\n# Título').map(token=>token.key),['ação','trabalho']);
  assert.equal(normalize(' #Projetos pessoais ').key,'projetos-pessoais');
  assert.throws(()=>normalize('<script>')); assert.throws(()=>normalize('a'.repeat(49)));
});
test('manual and inline categories reuse IDs and survive reopening, trash and undo',t=>{
  const {store,open}=fixture(t); store.dispatch('note:create',{type:'notes'}); const id=store.snapshot().selected.notes;
  store.dispatch('category:attach',{noteId:id,name:'Trabalho'});
  const categoryId=page(store,id).categories[0].id;
  store.dispatch('note:update',{id,body:'Preparar #trabalho e #ação.'});
  assert.equal(page(store,id).categories.length,2);
  assert.deepEqual(page(store,id).categories.find(category=>category.id===categoryId).sources.sort(),['inline','manual']);
  store.dispatch('category:detach',{noteId:id,categoryId});
  assert.deepEqual(page(store,id).categories.find(category=>category.id===categoryId).sources,['inline']);
  store.dispatch('note:update',{id,body:'Preparar a apresentação.'}); assert.equal(page(store,id).categories.length,0);
  store.dispatch('note:update',{id,body:'Preparar #trabalho.'}); assert.equal(page(store,id).categories[0].id,categoryId);
  store.dispatch('note:trash',{id});store.dispatch('note:restore',{id});
  assert.equal(page(open(),id).categories[0].id,categoryId);
  const events=store.db.prepare("SELECT action FROM activity_events WHERE entity_id=? AND action LIKE 'category-%'").all(id);
  assert(events.some(event=>event.action==='category-detach'));
});
test('a hashtag still being typed does not create partial categories',t=>{
  const {store}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;
  for(const body of ['#t','#tr','#trabalho']) store.dispatch('note:update',{id,body,categoryCursor:body.length});
  assert.equal(store.snapshot().categories.length,0);
  store.dispatch('note:update',{id,body:'#trabalho '});
  assert.equal(store.snapshot().categories.length,1);
  store.dispatch('note:update',{id,body:'#pessoal',categoryCursor:8});
  assert.equal(page(store,id).categories.length,0);
  store.dispatch('view:select',{view:'home'});
  assert.equal(page(store,id).categories[0].key,'pessoal');
});
test('task lists and quick capture share registered categories',t=>{
  const {store}=fixture(t);store.dispatch('note:create',{type:'tasks'}); const id=store.snapshot().selected.tasks;
  store.dispatch('item:create',{noteId:id,title:'Preparar #trabalho'});
  const categoryId=page(store,id).categories[0].id;
  const itemId=page(store,id).items[0].id;
  store.dispatch('item:update',{id:itemId,title:'Preparar #pe',categoryCursor:12});
  assert.equal(store.snapshot().categories.length,1,'Não cadastra hashtag parcial do item');
  store.dispatch('item:update',{id:itemId,title:'Preparar #trabalho'});
  store.dispatch('item:trash',{id:itemId});assert.equal(page(store,id).categories.length,0);
  store.dispatch('item:restore',{id:itemId});assert.equal(page(store,id).categories[0].id,categoryId);
  store.dispatch('draft:update',{body:'Ideia #TRABALHO',title:'Captura'});store.dispatch('draft:commit');
  assert.equal(page(store,store.getSetting('quick_saved_note')).categories[0].id,categoryId);
  store.dispatch('note:create',{type:'tasks'}); const other=store.snapshot().selected.tasks;
  store.dispatch('category:attach',{noteId:other,categoryId});
  assert.equal(page(store,other).categories[0].id,categoryId);
});
