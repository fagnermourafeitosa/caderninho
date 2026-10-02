const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../store.cjs');const document=require('../editor-document.js');
const paragraph=(value,marks={})=>({id:document.id(),type:'paragraph',runs:[{text:value,marks}]});
function fixture(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'caderninho-editor-'));const stores=[];const open=()=>{const store=new Store(directory);stores.push(store);return store;};t.after(()=>{stores.forEach(store=>store.close());fs.rmSync(directory,{recursive:true,force:true});});return {store:open(),open};}
test('structured text and tables persist, derive searchable text and survive trash',t=>{
 const {store,open}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;
 const doc=[paragraph('Um plano',{bold:true,highlight:document.COLORS[0]}),{id:document.id(),type:'table',header:true,rows:[[document.plainRuns('Pessoa'),document.plainRuns('Tarefa')],[document.plainRuns('Ana'),document.plainRuns('#projeto')]]}];
 store.dispatch('note:update',{id,editorDoc:doc});const note=open().snapshot().notes.find(note=>note.id===id);assert.equal(note.editorDoc[1].rows[1][0][0].text,'Ana');assert.equal(note.editorDoc[0].runs[0].marks.bold,true);assert.ok(note.body.includes('| Ana | #projeto |'));assert.ok(note.categories.some(category=>category.key==='projeto'));
 store.dispatch('note:trash',{id});store.dispatch('note:restore',{id});assert.deepEqual(store.snapshot().notes.find(note=>note.id===id).editorDoc,note.editorDoc);
});
test('daily checkbox edits preserve formatted blocks',t=>{
 const {store}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;
 const doc=[paragraph('Título',{italic:true}),{id:document.id(),type:'check',checked:false,runs:[{text:'Comprar papel',marks:{bold:true}}]}];store.dispatch('note:update',{id,editorDoc:doc});const item=store.snapshot().notes.find(note=>note.id===id).inlineTasks[0];store.dispatch('inline:toggle',{id:item.id});assert.equal(JSON.parse(store.note(id).editor_document)[1].checked,true);assert.equal(JSON.parse(store.note(id).editor_document)[1].runs[0].marks.bold,true);
});
test('schema rejects malformed or oversized tables and removes unsafe attributes',()=>{
 assert.throws(()=>document.normalize([{type:'table',rows:[[],[]]}]));assert.throws(()=>document.normalize([{type:'table',rows:[[document.plainRuns('a')],[]]}]));assert.throws(()=>document.normalize([{type:'script',runs:[]}])) ;
 const doc=document.normalize([paragraph('<script>literal</script>',{link:'javascript:alert(1)',highlight:'#000000',bold:true,onclick:'bad'})]);assert.deepEqual(doc[0].runs[0].marks,{bold:true});assert.equal(document.text(doc),'<script>literal</script>');
});
test('inline code and fenced code do not register categories or tasks',t=>{
 const {store}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;store.dispatch('note:update',{id,editorDoc:[paragraph('#codigo',{code:true}),{id:document.id(),type:'code',runs:document.plainRuns('[] literal\n#outro')}]});const note=store.snapshot().notes.find(note=>note.id===id);assert.equal(note.categories.length,0);assert.equal(note.inlineTasks.length,0);
});
