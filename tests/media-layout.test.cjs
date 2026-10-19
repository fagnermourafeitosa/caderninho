const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { Store } = require('../src/main/store.cjs');

test('joining cards keeps explicit order and equal widths after reopening', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'media-layout-'));
  let store = new Store(directory);
  t.after(() => { store.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const noteId = store.snapshot().selected.notes;
  for (const id of ['one', 'two']) store.dispatch('cut:create', { id, noteId, kind: 'link', url: 'https://example.com' });
  let layout = require('../src/main/media-layout/compose.cjs').createMediaLayout({ store });
  layout.move({ noteId, cutId: 'two', target: { kind: 'card', cutId: 'one', edge: 'beside-before' } });
  store.close(); store = new Store(directory);
  layout = require('../src/main/media-layout/compose.cjs').createMediaLayout({ store });
  const placements = layout.read({ noteId }).sort((a, b) => a.position - b.position);
  assert.deepEqual(placements.map(p => [p.id, p.groupId, p.position, p.width]), [
    ['two', 'one', 0, 240], ['one', 'one', 1, 240]
  ]);
});

test('resizing uses explicit pixels and invalid changes leave the saved layout intact', t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-resize-')), store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes;
  for(const id of ['a','b'])store.dispatch('cut:create',{id,noteId,kind:'link'});
  const layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  layout.move({noteId,cutId:'b',target:{kind:'card',cutId:'a',edge:'beside-after'}});
  layout.resize({noteId,cutId:'a',width:200});
  assert.equal(layout.read({noteId}).find(p=>p.id==='a').width,200);
  layout.resize({noteId,cutId:'b',width:500});
  assert.equal(layout.read({noteId}).find(p=>p.id==='b').width,500);
  const before=layout.read({noteId});
  for(const width of [NaN,Infinity,0,-1,2,'0.5'])assert.throws(()=>layout.resize({noteId,cutId:'a',width}));
  assert.deepEqual(layout.read({noteId}),before);
  assert.throws(()=>layout.move({noteId,cutId:'a',target:{kind:'card',cutId:'missing',edge:'beside-after'}}));
  assert.deepEqual(layout.read({noteId}),before);
});

test('history restoration ignores removed cards, retains newly imported cards and rejects foreign ownership', t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-history-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes;
  for(const id of ['a','b'])store.dispatch('cut:create',{id,noteId,kind:'link'});
  const layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  const before=layout.read({noteId});
  layout.move({noteId,cutId:'b',target:{kind:'card',cutId:'a',edge:'beside-after'}});
  store.dispatch('cut:trash',{id:'a'});store.dispatch('cut:purge',{id:'a'});
  store.dispatch('cut:create',{id:'new',noteId,kind:'link'});
  layout.restore({noteId,placements:before});
  assert.deepEqual(layout.read({noteId}).map(p=>[p.id,p.groupId,p.position]),[['b','b',0],['new','new',0]]);
  store.dispatch('note:create',{type:'notes'});
  const foreign=store.snapshot().selected.notes;
  store.dispatch('cut:create',{id:'foreign',noteId:foreign,kind:'link'});
  const saved=layout.read({noteId});
  assert.throws(()=>layout.restore({noteId,placements:[{...before[0],id:'foreign'}]}));
  assert.deepEqual(layout.read({noteId}),saved);
  assert.throws(()=>layout.restore({noteId,placements:[{...before[1],width:NaN}]}));
  assert.deepEqual(layout.read({noteId}),saved);
});

test('responsive projection leaves writing space, wraps at card minimums and never mutates saved widths',()=>{
  const domain=require('../src/shared/media-layout/domain/layout.js');
  const saved=[{id:'a',groupId:'a',position:0,anchor:0,side:'left',width:180},{id:'b',groupId:'a',position:1,anchor:0,side:'left',width:180}];
  const before=JSON.stringify(saved);
  const wide=domain.project(saved,1000)[0];
  assert.equal(wide.width,378);assert.equal(wide.float,'left');
  assert.deepEqual(wide.cards.map(card=>card.pixels),[180,180]);
  const narrow=domain.project(saved,350)[0];
  assert.equal(narrow.width,350);assert.equal(narrow.float,'none');
  assert.deepEqual(narrow.cards.map(card=>card.pixels),[180,180]);
  assert.equal(domain.project(saved,1000)[0].width,378);
  assert.equal(JSON.stringify(saved),before);
});

test('import placement is committed with card creation and a bad target rolls creation back', t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-import-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes;
  store.dispatch('cut:create',{id:'a',noteId,kind:'link',placement:{kind:'block',anchor:3,side:'left'}});
  assert.equal(store.snapshot().notes.find(n=>n.id===noteId).cuts[0].anchor,3);
  store.dispatch('cut:create',{id:'b',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-after'}});
  const layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  assert.deepEqual(layout.read({noteId}).map(p=>[p.groupId,p.width,p.anchor]),[['a',240,3],['a',240,3]]);
  assert.throws(()=>store.dispatch('cut:create',{id:'bad',noteId,kind:'link',placement:{kind:'card',cutId:'missing',edge:'beside-after'}}));
  assert.equal(layout.read({noteId}).length,2);
});

test('moving the original group card to a paragraph detaches it without moving its siblings',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-detach-')),store=new Store(directory);
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const noteId=store.snapshot().selected.notes;
 for(const id of ['root','sibling'])store.dispatch('cut:create',{id,noteId,kind:'link'});
 const layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
 layout.move({noteId,cutId:'sibling',target:{kind:'card',cutId:'root',edge:'beside-after'}});
 layout.move({noteId,cutId:'root',target:{kind:'block',anchor:2,side:'left'}});
 const [root,sibling]=layout.read({noteId});
 assert.notEqual(root.groupId,sibling.groupId);
 assert.deepEqual([root.anchor,sibling.anchor],[2,0]);
 assert.deepEqual([root.position,sibling.position],[0,0]);
});

test('migration preserves existing singleton layout and same-anchor creation order',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-migration-'));let store=new Store(directory);
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const noteId=store.snapshot().selected.notes;
 for(const id of ['z-first','a-second'])store.dispatch('cut:create',{id,noteId,kind:'link'});
 store.db.exec("UPDATE cuts SET side='left',anchor=3,width=240; ALTER TABLE cuts DROP COLUMN layout_group; ALTER TABLE cuts DROP COLUMN layout_order;");
 store.close();store=new Store(directory);
 const placements=require('../src/main/media-layout/compose.cjs').createMediaLayout({store}).read({noteId});
 assert.deepEqual(placements.map(p=>[p.groupId,p.anchor,p.side,p.width]),[['z-first',3,'left',240],['a-second',3,'left',240]]);
 assert.deepEqual(require('../src/shared/media-layout/domain/layout.js').groups(placements).map(g=>g[0].id),['z-first','a-second']);
});

test('the superseded generic layout command is no longer accepted',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-contract-')),store=new Store(directory);
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const noteId=store.snapshot().selected.notes;store.dispatch('cut:create',{id:'card',noteId,kind:'link'});
 assert.throws(()=>store.dispatch('cut:layout',{id:'card',side:'left',anchor:1,width:220}),/inválida/);
});

test('card-relative moves cannot overflow the accepted anchor range',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-anchor-')),store=new Store(directory);
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const noteId=store.snapshot().selected.notes;
 for(const id of ['a','b'])store.dispatch('cut:create',{id,noteId,kind:'link'});
 const layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
 layout.move({noteId,cutId:'a',target:{kind:'block',anchor:10000,side:'left'}});
 const before=layout.read({noteId});
 assert.throws(()=>layout.move({noteId,cutId:'b',target:{kind:'card',cutId:'a',edge:'after'}}),/inválida/);
 assert.deepEqual(layout.read({noteId}),before);
});

test('undoing resize after a beside-card import keeps the new card and restores the historical width',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-restore-width-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const {EditHistory}=require('../src/renderer/edit-history.js');
  const noteId=store.snapshot().selected.notes,layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  store.dispatch('cut:create',{id:'a',noteId,kind:'link'});
  layout.resize({noteId,cutId:'a',width:400});
  const history=new EditHistory({title:'Note',body:'Writing',mediaLayout:layout.read({noteId})});
  layout.resize({noteId,cutId:'a',width:320});
  history.record({...history.current,mediaLayout:layout.read({noteId})});
  const baseline=history.current;
  store.dispatch('cut:create',{id:'b',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-after'}});
  history.reconcileMediaLayout(baseline.mediaLayout,layout.read({noteId}));
  const imported=layout.read({noteId}).find(card=>card.id==='b');
  layout.restore({noteId,placements:history.step('undo').mediaLayout});
  assert.equal(layout.read({noteId}).find(card=>card.id==='a').width,400);
  assert.deepEqual(layout.read({noteId}).find(card=>card.id==='b'),imported);
  layout.restore({noteId,placements:history.step('redo').mediaLayout});
  assert.deepEqual(layout.read({noteId}).map(card=>[card.id,card.width]),[['a',320],['b',240]]);
});

test('restore preserves multiple historical card widths and keeps invalid history atomic',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-restore-ratio-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes,layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  store.dispatch('cut:create',{id:'a',noteId,kind:'link'});
  store.dispatch('cut:create',{id:'b',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-after'}});
  layout.resize({noteId,cutId:'b',width:200});layout.resize({noteId,cutId:'a',width:320});
  const historical=layout.read({noteId}),original=JSON.stringify(historical);
  store.dispatch('cut:create',{id:'c',noteId,kind:'link',placement:{kind:'card',cutId:'b',edge:'beside-after'}});
  for(const [cutId,width] of [['a',180],['b',180],['c',220]])layout.resize({noteId,cutId,width});
  const retained=layout.read({noteId}).find(card=>card.id==='c');
  layout.restore({noteId,placements:historical});
  const actual=layout.read({noteId});
  assert.ok(Math.abs(actual[0].width-320)<1e-12);
  assert.ok(Math.abs(actual[1].width-200)<1e-12);
  assert.deepEqual(actual[2],retained);
  assert.equal(JSON.stringify(historical),original);
  assert.throws(()=>layout.restore({noteId,placements:historical.map(card=>({...card,width:601}))}),/inválida/);
  assert.deepEqual(layout.read({noteId}),actual);
});

test('restoring an earlier anchor preserves a newer card at its imported anchor',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-restore-anchor-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes,layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  store.dispatch('cut:create',{id:'a',noteId,kind:'link',placement:{kind:'block',anchor:1,side:'left'}});
  const historical=layout.read({noteId});
  layout.move({noteId,cutId:'a',target:{kind:'block',anchor:3,side:'right'}});
  store.dispatch('cut:create',{id:'b',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-after'}});
  const retained=layout.read({noteId}).find(card=>card.id==='b');
  layout.restore({noteId,placements:historical});
  const actual=layout.read({noteId});
  assert.deepEqual(actual.find(card=>card.id==='b'),{...retained,position:0});
  assert.equal(actual.find(card=>card.id==='a').anchor,1);
  assert.equal(actual.find(card=>card.id==='a').side,'left');
  assert.notEqual(actual[0].groupId,actual[1].groupId);
});

test('restore keeps a newer card inserted before historical cards in its current position',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'layout-restore-order-')),store=new Store(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
  const noteId=store.snapshot().selected.notes,layout=require('../src/main/media-layout/compose.cjs').createMediaLayout({store});
  store.dispatch('cut:create',{id:'a',noteId,kind:'link'});
  store.dispatch('cut:create',{id:'b',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-after'}});
  const historical=layout.read({noteId});
  store.dispatch('cut:create',{id:'c',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-before'}});
  store.dispatch('cut:create',{id:'d',noteId,kind:'link',placement:{kind:'card',cutId:'a',edge:'beside-before'}});
  const retained=layout.read({noteId}).filter(card=>!['a','b'].includes(card.id));
  layout.restore({noteId,placements:historical});
  const actual=layout.read({noteId});
  assert.deepEqual(actual.filter(card=>!['a','b'].includes(card.id)),retained);
  assert.deepEqual(actual.sort((a,b)=>a.position-b.position).map(card=>card.id),['c','d','a','b']);
});
