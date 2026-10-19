const {test}=require('node:test');
const assert=require('node:assert/strict');
const domain=require('../src/shared/media-layout/domain/layout.js');
const card=(id,width=240)=>({id,groupId:'a',position:id==='a'?0:1,anchor:0,side:'right',width});
test('window reflow keeps fixed card pixels and caps only an individually oversized card',()=>{
 const cards=[card('a'),card('b')],before=JSON.stringify(cards);
 for(const width of [800,1100,350])assert.deepEqual(domain.project(cards,width)[0].cards.map(card=>card.pixels),[240,240]);
 assert.equal(domain.project(cards,800)[0].width,498);
 assert.equal(domain.project(cards,800)[0].float,'right');
 assert.equal(domain.project(cards,350)[0].float,'none');
 assert.equal(domain.project([card('a')],150)[0].cards[0].pixels,150);
 assert.equal(JSON.stringify(cards),before);
});

test('moving, explicit resizing and history restore preserve independent integer pixel widths',()=>{
 const original=[card('a',200),{...card('b',280),groupId:'b'}];
 const joined=domain.move(original,'b',{kind:'card',cutId:'a',edge:'beside-after'});
 assert.deepEqual(joined.map(item=>item.width),[200,280]);
 const resized=domain.resize(joined,'a',360);
 assert.deepEqual(resized.map(item=>item.width),[360,280]);
 const restored=domain.restore(resized,[original[0]]);
 assert.deepEqual(restored.map(item=>item.width),[200,280]);
 for(const width of [0,1,.5,179,601,240.5,'240',NaN,Infinity]){
  assert.throws(()=>domain.resize(joined,'a',width));
  assert.throws(()=>domain.validateSaved([{...original[0],width}]));
 }
});

test('legacy fractions migrate once to 240px while layout and media references survive reopening',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {Store}=require('../src/main/store.cjs');
 const {createMediaLayout}=require('../src/main/media-layout/compose.cjs');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'fixed-media-migration-'));let store=new Store(directory);
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const noteId=store.snapshot().selected.notes;
 store.db.exec('ALTER TABLE cuts ADD COLUMN old_fraction REAL NOT NULL DEFAULT 0.5; ALTER TABLE cuts DROP COLUMN width; ALTER TABLE cuts RENAME COLUMN old_fraction TO width;');
 store.db.prepare("INSERT INTO cuts(id,note_id,kind,url,title,side,anchor,layout_group,layout_order,width,created) VALUES(?,?,'link',?,'Retained title','left',2,'retained-group',0,0.4,'2026-10-18')").run('old',noteId,'https://example.com/retained');
 store.close();store=new Store(directory);
 const cut=store.snapshot().notes.find(note=>note.id===noteId).cuts[0];
 assert.deepEqual([cut.width,cut.groupId,cut.anchor,cut.side,cut.title,cut.url],[240,'retained-group',2,'left','Retained title','https://example.com/retained']);
 createMediaLayout({store}).resize({noteId,cutId:'old',width:320});
 store.dispatch('cut:create',{id:'new',noteId,kind:'link'});
 assert.equal(createMediaLayout({store}).read({noteId}).find(cut=>cut.id==='new').width,240);
 store.close();store=new Store(directory);
 assert.equal(createMediaLayout({store}).read({noteId}).find(cut=>cut.id==='old').width,320);
});
