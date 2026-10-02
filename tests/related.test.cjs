const {test}=require('node:test');const assert=require('node:assert/strict');
const {documents,rank,cosine}=require('../related-engine.cjs');const config=require('../related-config.cjs');
const page=(id,book,text,type='notes')=>({id,notebookId:book,type,title:text,body:'',categories:[],items:[],cuts:[]});
test('only active content in the same notebook is related, including tasks and linked reminders',()=>{
 const state={notes:[page('a','one','viagem serra'),page('b','one','trilha serra'),page('c','two','viagem serra'),{...page('d','one','viagem serra'),trashed:true}],sourceActions:[{id:'r',noteId:'b',notebookId:'one',kind:'reminder',title:'reservar viagem',origin:{quote:'serra'}}]};
 const docs=documents(state);const vectors=Object.fromEntries(docs.map(d=>[d.id,[1,0]]));const result=rank(docs[0],docs,vectors);
 assert.deepEqual(new Set(result.map(d=>d.id)),new Set(['page:b','source:r']));assert.equal(result.find(d=>d.id==='source:r').type,'reminders');
});
test('weights change ranking independently from rendering, thresholds remove weak relations',()=>{
 const docs=documents({notes:[{...page('a','b','viagem serra'),categories:[{id:'trip'}]},page('semantic','b','mountain holiday'),{...page('category','b','comprar sapatos'),categories:[{id:'trip'}]}]});
 const vectors={'page:a':[1,0],'page:semantic':[1,0],'page:category':[0,1]};
 assert.equal(rank(docs[0],docs,vectors,{...config,weights:{semantic:1},threshold:.5})[0].id,'page:semantic');
 assert.equal(rank(docs[0],docs,vectors,{...config,weights:{categories:1},threshold:.5})[0].id,'page:category');
 assert.deepEqual(rank(docs[0],docs,vectors,{...config,weights:{lexical:1},threshold:.5}),[]);
});
test('OCR and metadata enter the document, content hash changes without changing on category edits',()=>{
 const n={...page('a','b','nota'),cuts:[{kind:'image',blobId:'img'},{kind:'link',title:'Guia da serra',description:'Trilhas e camping'}]};
 const a=documents({notes:[n]},{img:'hotel reserva'})[0];assert.match(a.text,/hotel reserva/);assert.match(a.text,/Trilhas e camping/);
 assert.notEqual(a.hash,documents({notes:[n]},{img:'restaurante'})[0].hash);
 assert.equal(a.hash,documents({notes:[{...n,categories:[{id:'x'}]}]},{img:'hotel reserva'})[0].hash);
 assert.equal(cosine([1,0],[0,1]),0);
});

test('SQLite cache survives reopening, invalidates edits, and immediately excludes trash',async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {Store}=require('../store.cjs');const {RelatedService}=require('../related-service.cjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'related-cache-'));let store,service;
 try {
  store=new Store(dir);store.dispatch('note:trash',{id:'welcome'});
  store.dispatch('note:create',{type:'notes',title:'Ateliê iluminação'});const first=store.snapshot().selected.notes;
  store.dispatch('note:create',{type:'notes',title:'Ateliê móveis'});const second=store.snapshot().selected.notes;
  service=new RelatedService(store,{file:()=>null});let calls=0;service.job=async()=>{calls++;return [1,0];};
  await service.run();assert.equal(calls,2);assert.equal(service.query(first).results[0].noteId,second);
  service.close();store.close();store=new Store(dir);service=new RelatedService(store,{file:()=>null});service.job=async()=>{calls++;return [1,0];};
  await service.run();assert.equal(calls,2,'Reopening reuses both cached vectors');
  store.dispatch('note:update',{id:second,body:'Uma mesa perto da janela'});await service.run();assert.equal(calls,3,'Only edited content is embedded again');
  store.dispatch('note:trash',{id:second});assert.equal(service.query(first).results.length,0,'Trash disappears before indexing');
  await service.run();assert.equal(store.db.prepare('SELECT count(*) AS n FROM related_vectors').get().n,1);
 }finally{service?.close();store?.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('Portuguese election notes remain related with moderate semantic affinity and sparse lexical overlap',()=>{
 const docs=documents({notes:[
  {...page('source','one','eleicões prefeitura'),body:'13\nlula'},
  {...page('tagged','one','voto ou não em lula?'),body:'lula\n#eleições',categories:[{id:'election'}]},
  {...page('mention','one','eleições 2026'),body:'lula 13 vai ganhar'},
  {...page('unrelated','one','Receita de bolo'),body:'cenoura e chocolate'},
  {...page('elsewhere','two','eleições 2026'),body:'lula 13 vai ganhar'},
 ]});
 const vector=cos=>[cos,Math.sqrt(1-cos*cos)];
 const vectors={'page:source':[1,0],'page:tagged':vector(.592),'page:mention':vector(.637),'page:unrelated':vector(.40),'page:elsewhere':[1,0]};
 const results=rank(docs[0],docs,vectors);
 assert.deepEqual(new Set(results.map(d=>d.id)),new Set(['page:tagged','page:mention']));
});
