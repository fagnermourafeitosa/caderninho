const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../src/main/store.cjs');
test('purpose-specific layout IPC validates unknown payloads and persists a valid move',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-ipc-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes;
  store.dispatch('cut:create',{id:'a',noteId,kind:'link'});
  const handlers=new Map(),ipc={handle:(channel,handler)=>handlers.set(channel,handler)};
  require('../src/main/media-layout/presentation/ipc.cjs').registerMediaLayout(ipc,require('../src/main/media-layout/compose.cjs').createMediaLayout({store}));
  const move=handlers.get('media-layout:move');
  for(const input of [null,[],{}, {noteId,cutId:'a',target:{kind:'block',anchor:-1,side:'left'}}])assert.throws(()=>move({},input));
  move({},{noteId,cutId:'a',target:{kind:'block',anchor:2,side:'left'}});
  assert.equal(handlers.get('media-layout:read')({},{noteId})[0].anchor,2);
  assert.throws(()=>handlers.get('media-layout:resize')({},{noteId,cutId:'a',width:'1'}));
});

test('import destination validation rejects missing and foreign card targets before file work',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-import-validation-')),store=new Store(directory);
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const noteId=store.snapshot().selected.notes;
 store.dispatch('note:create',{type:'notes'});const other=store.snapshot().selected.notes;
 store.dispatch('cut:create',{id:'foreign',noteId:other,kind:'link'});
 const layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
 const {importPlacement}=require('../src/main/media-layout/presentation/ipc.cjs');
 for(const cutId of ['missing','foreign'])assert.throws(()=>importPlacement({noteId,placement:{kind:'card',cutId,edge:'beside-after'}},layout),/encontrado/);
 store.dispatch('note:trash',{id:noteId});
 assert.throws(()=>importPlacement({noteId},layout),/Restaure/);
});
