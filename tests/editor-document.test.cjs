const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../src/main/store.cjs');const document=require('../src/shared/editor-document.js');
const paragraph=(value,marks={})=>({id:document.id(),type:'paragraph',runs:[{text:value,marks}]});
function fixture(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'caderninho-editor-'));const stores=[];const open=()=>{const store=new Store(directory);stores.push(store);return store;};t.after(()=>{stores.forEach(store=>store.close());fs.rmSync(directory,{recursive:true,force:true});});return {store:open(),open};}
test('structured text and tables persist, derive searchable text and survive trash',t=>{
 const {store,open}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;
 const doc=[paragraph('Um plano',{bold:true,highlight:document.COLORS[0]}),{id:document.id(),type:'table',header:true,rows:[[document.plainRuns('Pessoa'),document.plainRuns('Tarefa')],[document.plainRuns('Ana'),document.plainRuns('#projeto')]]}];
 store.dispatch('note:update',{id,editorDoc:doc});const note=open().snapshot().notes.find(note=>note.id===id);assert.equal(note.editorDoc[1].rows[1][0][0].text,'Ana');assert.equal(note.editorDoc[0].runs[0].marks.bold,true);assert.ok(note.body.includes('| Ana | #projeto |'));assert.ok(note.categories.some(category=>category.key==='projeto'));
 store.dispatch('note:trash',{id});store.dispatch('note:restore',{id});assert.deepEqual(store.snapshot().notes.find(note=>note.id===id).editorDoc,note.editorDoc);
});
test('schema rejects malformed or oversized tables and removes unsafe attributes',()=>{
 assert.throws(()=>document.normalize([{type:'table',rows:[[],[]]}]));assert.throws(()=>document.normalize([{type:'table',rows:[[document.plainRuns('a')],[]]}]));assert.throws(()=>document.normalize([{type:'script',runs:[]}])) ;
 const doc=document.normalize([paragraph('<script>literal</script>',{link:'javascript:alert(1)',highlight:'#000000',bold:true,onclick:'bad'})]);assert.deepEqual(doc[0].runs[0].marks,{bold:true});assert.equal(document.text(doc),'<script>literal</script>');
});
test('inline code and fenced code do not register categories',t=>{
 const {store}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;store.dispatch('note:update',{id,editorDoc:[paragraph('#codigo',{code:true}),{id:document.id(),type:'code',runs:document.plainRuns('[] literal\n#outro')}]});const note=store.snapshot().notes.find(note=>note.id===id);assert.equal(note.categories.length,0);
});
test('diagram blocks keep their Mermaid code as typed, mirror it as a fenced block and persist',t=>{
 const {store,open}=fixture(t);store.dispatch('note:create',{type:'notes'});const id=store.snapshot().selected.notes;
 const code='flowchart TD\n  A[Ideia] --> B{Aprovação}\n  style A fill:#f8d985';
 const doc=[paragraph('Fluxo'),{id:document.id(),type:'diagram',code,extra:'drop me'},{id:document.id(),type:'diagram',code:'flowchart TD\n  A -->'}];
 store.dispatch('note:update',{id,editorDoc:doc});const note=open().snapshot().notes.find(note=>note.id===id);
 assert.deepEqual(Object.keys(note.editorDoc[1]).sort(),['code','id','type']);assert.equal(note.editorDoc[1].code,code);assert.equal(note.editorDoc[2].code,'flowchart TD\n  A -->','Código inválido também é salvo');
 assert.equal(note.body,'Fluxo\n```mermaid\n'+code+'\n```\n```mermaid\nflowchart TD\n  A -->\n```');
 assert.ok(!note.categories.some(category=>category.key==='f8d985'),'Cores do diagrama não viram categorias');
});
test('diagram code must be text of at most 20,000 characters',()=>{
 assert.throws(()=>document.normalize([{type:'diagram',code:42}]));assert.throws(()=>document.normalize([{type:'diagram'}]));
 assert.throws(()=>document.normalize([{type:'diagram',code:'x'.repeat(20001)}]),/20\.000/);
 assert.equal(document.normalize([{type:'diagram',code:'x'.repeat(20000)}])[0].code.length,20000);
});
test('editing text around a diagram keeps the diagram block',()=>{
 const doc=document.normalize([paragraph('Antes'),{type:'diagram',code:'flowchart LR\n A-->B'}]);
 const next=document.reconcile(doc,document.text(doc)+'\nDepois');assert.equal(next[1].type,'diagram');assert.equal(next[1].code,'flowchart LR\n A-->B');assert.equal(document.runText(next[2].runs),'Depois');
});
test('checkbox blocks no longer exist; task lines and task images are allowed only in their context',()=>{
 assert.throws(()=>document.normalize([{type:'check',checked:true,runs:[]}]),/Tipo de bloco/);
 assert.deepEqual(document.normalize([{id:'t',type:'task',taskId:'abc-1',title:'Trocar a fiação',extra:1}]),[{id:'t',type:'task',taskId:'abc-1',title:'Trocar a fiação'}]);
 assert.throws(()=>document.normalize([{type:'task',taskId:'../x',title:'x'}]),/Tarefa inválida/);
 assert.throws(()=>document.normalize([{type:'image',imageId:'i1'}]),/Tipo de bloco/);
 assert.deepEqual(document.normalize([{id:'i',type:'image',imageId:'i1'}],{context:'task'}),[{id:'i',type:'image',imageId:'i1'}]);
 assert.throws(()=>document.normalize([{type:'task',taskId:'a',title:'x'}],{context:'task'}),/Tipo de bloco/);
 assert.throws(()=>document.normalize([{type:'image',imageId:'a b'}],{context:'task'}),/Imagem inválida/);
 assert.equal(document.text([{type:'task',taskId:'a',title:'Ligar'},{type:'image',imageId:'i'}]),'Ligar\n');
 assert.deepEqual(document.fromPlain('[ ] texto').map(block=>[block.type,block.runs[0].text]),[['paragraph','[ ] texto']]);
});
