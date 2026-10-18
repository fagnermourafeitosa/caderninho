const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rendererHistory,deferred}=require('./helpers/renderer-history.cjs');
test('Undo reserves its place before typing that follows a pending text save',async()=>{
  const pending=deferred(),started=deferred();let first=true;
  const editor=rendererHistory({save:async()=>{if(first){first=false;started.resolve();await pending.promise;}}});
  const initial=editor.type(' first');await started.promise;
  const undo=editor.undo();await Promise.resolve();
  const subsequent=editor.type(' after');
  pending.resolve();await Promise.all([initial,undo,subsequent]);await editor.flush();
  assert.equal(editor.saved().body,'base after');
  assert.equal(editor.editor.value,'base after');
  assert.deepEqual(editor.writes,['base first','base','base after']);
  assert.deepEqual(editor.errors,[]);
});

test('Undo of a pending card resize restores its width before subsequent typing is saved',async()=>{
  const pending=deferred(),started=deferred();
  const card={id:'card',groupId:'card',position:0,anchor:0,side:'left',width:.5};
  const editor=rendererHistory({cuts:[card],layout:async()=>{started.resolve();await pending.promise;}});
  const resize=editor.resize(.3);await started.promise;
  const undo=editor.undo();
  const subsequent=editor.type(' after');
  pending.resolve();await Promise.all([resize,undo,subsequent]);await editor.flush();
  assert.equal(editor.saved().cuts[0].width,.5);
  assert.equal(editor.saved().body,'base after');
  assert.equal(editor.editor.value,'base after');
  assert.deepEqual(editor.errors,[]);
});

test('Rejected card resize leaves only the subsequent text edit in history',async()=>{
  const pending=deferred(),started=deferred();
  const card={id:'card',groupId:'card',position:0,anchor:0,side:'left',width:.5};
  const editor=rendererHistory({cuts:[card],layout:async()=>{started.resolve();await pending.promise;throw new Error('Resize rejected');}});
  const resize=editor.resize(.3);await started.promise;
  const subsequent=editor.type(' after');pending.resolve();
  await Promise.all([resize,subsequent]);await editor.flush();
  await editor.undo();await editor.flush();
  assert.equal(editor.saved().body,'base');
  assert.equal(editor.saved().cuts[0].width,.5);
  const count=editor.writes.length;await editor.undo();await editor.flush();
  assert.equal(editor.writes.length,count);
  await editor.redo();await editor.flush();
  assert.equal(editor.saved().body,'base after');
  assert.equal(editor.saved().cuts[0].width,.5);
  assert.deepEqual(editor.errors,['Resize rejected']);
});

test('Rendering a pending local edit keeps rapid undo and redo intent',async()=>{
  const pending=deferred(),started=deferred();let first=true;
  const editor=rendererHistory({save:async()=>{if(first){first=false;started.resolve();await pending.promise;}}});
  const initial=editor.type(' first');await started.promise;
  editor.render();
  const undo=editor.undo(),redo=editor.redo(),again=editor.undo();
  const subsequent=editor.type(' after');pending.resolve();
  await Promise.all([initial,undo,redo,again,subsequent]);await editor.flush();
  assert.equal(editor.saved().body,'base after');
  assert.equal(editor.editor.value,'base after');
  assert.deepEqual(editor.writes,['base first','base','base first','base','base after']);
  assert.deepEqual(editor.errors,[]);
});

test('Import acknowledgement preserves a later card resize in undo and redo',async()=>{
  const pending=deferred(),started=deferred();
  const card={id:'card',groupId:'card',position:0,anchor:0,side:'left',width:.5};
  const editor=rendererHistory({cuts:[card],importMedia:async()=>{started.resolve();await pending.promise;}});
  const imported=editor.import();await started.promise;
  const resize=editor.resize(.3);pending.resolve();
  await Promise.all([imported,resize]);await editor.flush();
  assert.equal(editor.saved().cuts[0].width,.3);
  await editor.undo();await editor.flush();
  assert.equal(editor.saved().cuts[0].width,.5);
  assert.equal(editor.saved().cuts.length,2);
  await editor.redo();await editor.flush();
  assert.equal(editor.saved().cuts[0].width,.3);
  assert.equal(editor.saved().cuts.length,2);
});

test('Import queued after an unacknowledged resize leaves the imported card editable',async()=>{
  const pending=deferred(),started=deferred();let first=true;
  const card={id:'card',groupId:'card',position:0,anchor:0,side:'left',width:.5};
  const editor=rendererHistory({cuts:[card],layout:async()=>{if(first){first=false;started.resolve();await pending.promise;}}});
  const resize=editor.resize(.3);await started.promise;
  const imported=editor.import();pending.resolve();
  await Promise.all([resize,imported]);await editor.flush();
  assert.equal(await editor.resize(.2,'imported'),true);await editor.flush();
  assert.equal(editor.saved().cuts.find(card=>card.id==='imported').width,.2);
  await editor.undo();await editor.flush();
  assert.equal(editor.saved().cuts.find(card=>card.id==='imported').width,.5);
  assert.deepEqual(editor.errors,['Mídia adicionada. Arraste pela alça para posicionar.']);
});

test('Undo reconciles clamped saved widths into the displayed layout and subsequent history',async()=>{
  const card={id:'card',groupId:'card',position:0,anchor:0,side:'left',width:.8};
  const editor=rendererHistory({cuts:[card]});
  await editor.resize(.6);await editor.flush();
  await editor.import({kind:'card',cutId:'card',edge:'beside-after'});await editor.flush();
  await editor.undo();await editor.flush();
  assert.equal(editor.saved().cuts[0].width,.5);
  assert.equal(editor.displayed()[0].width,.5);
  await editor.type(' after');await editor.flush();
  await editor.undo();await editor.flush();
  assert.equal(editor.saved().body,'base');
  assert.equal(editor.saved().cuts[0].width,.5);
  assert.equal(editor.displayed()[0].width,.5);
});

test('Clamped Undo projects live cards immediately so another resize can queue before acknowledgement',async()=>{
  const pending=deferred(),started=deferred();
  const card={id:'card',groupId:'card',position:0,anchor:0,side:'left',width:.8};
  const editor=rendererHistory({cuts:[card],restore:async()=>{started.resolve();await pending.promise;}});
  await editor.resize(.6);await editor.flush();
  await editor.import({kind:'card',cutId:'card',edge:'beside-after'});await editor.flush();
  const undo=editor.undo();await started.promise;
  const projected=editor.displayed()[0].width;
  const resize=editor.resize(.2,'imported');pending.resolve();
  const [,success]=await Promise.all([undo,resize]);await editor.flush();
  assert.equal(projected,.5);
  assert.equal(success,true);
  assert.equal(editor.saved().cuts.find(card=>card.id==='imported').width,.2);
  assert.equal(editor.displayed().find(card=>card.id==='imported').width,.2);
});
