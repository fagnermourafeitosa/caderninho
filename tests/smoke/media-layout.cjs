const {ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {createMediaLayout}=require('../../src/main/media-layout/compose.cjs');
async function verifyMediaLayoutClose({win,store,result}) {
  if(!fs.readFileSync(result.pdf).subarray(0,4).equals(Buffer.from('%PDF')))throw new Error('Export did not create a PDF');
  const reader=path.join(__dirname,'pdf-full-text.swift');
  const text=execFileSync('swift',[reader,result.pdf],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
  if(!text.replace(/\s+/g,' ').includes('Segundo parágrafo.'))throw new Error('Export lost trailing note text: '+JSON.stringify(text.slice(-400)));
  const layout=createMediaLayout({store}),cutId=layout.read({noteId:result.noteId})[0].id;
  ipcMain.removeHandler('media-layout:resize');
  ipcMain.handle('media-layout:resize',async(_event,input)=>{
    await new Promise(resolve=>setTimeout(resolve,250));return layout.resize(input);
  });
  await win.webContents.executeJavaScript(`(async()=>{
    state=await window.notebook.action('note:select',{id:${JSON.stringify(result.noteId)}});view='notes';indexFor=null;render();
    const resize=changeMediaLayout('mediaLayoutResize',{noteId:${JSON.stringify(result.noteId)},cutId:${JSON.stringify(cutId)},width:.12});
    await new Promise(resolve=>setTimeout(resolve,30));
    const line=document.querySelector('#note-body .line-text');putCaret(line,0);document.execCommand('insertText',false,'Typing during layout ');
    await resize;await noteMutationQueue;
    if(!document.querySelector('#note-body').value.includes('Typing during layout '))throw new Error('Layout acknowledgement erased active writing');
  })()`);
  await win.webContents.executeJavaScript(`(async()=>{
    const resize=changeMediaLayout('mediaLayoutResize',{noteId:${JSON.stringify(result.noteId)},cutId:${JSON.stringify(cutId)},width:.14});
    await new Promise(resolve=>setTimeout(resolve,30));
    const undo=editPageHistory('undo');await Promise.resolve();
    putCaret(document.querySelector('#note-body .line-text'),0);document.execCommand('insertText',false,'Typing while layout undo waits ');
    await resize;await undo;await noteMutationQueue;
    if(!document.querySelector('#note-body').value.includes('Typing while layout undo waits '))throw new Error('Queued layout undo erased subsequent writing');
  })()`);
  // Delay a committed text response at IPC, then exercise real editor input and history.
  let delayText=true;
  ipcMain.removeHandler('notebook:action');
  ipcMain.handle('notebook:action',async(_event,command,input)=>{
    const next=store.dispatch(command,input);
    if(command==='note:update'&&delayText){delayText=false;await new Promise(resolve=>setTimeout(resolve,250));}
    return next;
  });
  const body=await win.webContents.executeJavaScript(`(async()=>{
    await noteMutationQueue;
    await new Promise(resolve=>setTimeout(resolve,750));
    const baseline=document.querySelector('#note-body').value;
    putCaret(document.querySelector('#note-body .line-text'),0);document.execCommand('insertText',false,'Before undo ');
    await new Promise(resolve=>setTimeout(resolve,30));
    const undo=editPageHistory('undo');
    putCaret(document.querySelector('#note-body .line-text'),0);document.execCommand('insertText',false,'After undo ');
    await undo;await noteMutationQueue;
    const expected='After undo '+baseline;
    if(document.querySelector('#note-body').value!==expected)throw new Error('Pending text undo erased later input: '+JSON.stringify({expected:expected.slice(0,180),actual:document.querySelector('#note-body').value.slice(0,180)}));
    const saved=await window.notebook.state();
    if(saved.notes.find(note=>note.id===currentNote().id).body!==expected)throw new Error('Pending text undo persisted stale input');
    return expected;
  })()`);
  if(store.note(result.noteId).body!==body)throw new Error('History response disagrees with isolated SQLite');
  console.log('MEDIA_LAYOUT_PENDING_TEXT_UNDO_OK');
  const image=fs.readFileSync(path.join(__dirname,'../../assets/icon.png')).toString('base64');
  await win.webContents.executeJavaScript(`(async()=>{
    const bytes=Uint8Array.from(atob(${JSON.stringify(image)}),character=>character.charCodeAt(0));
    const file={name:'during-import.png',type:'image/png',size:bytes.length,arrayBuffer:async()=>{await new Promise(resolve=>setTimeout(resolve,150));return bytes.buffer;}};
    const imported=importCuts([file],null,${JSON.stringify(result.noteId)},{kind:'block',anchor:0,side:'left'});
    await new Promise(resolve=>setTimeout(resolve,30));
    const line=document.querySelector('#note-body .line-text');putCaret(line,0);document.execCommand('insertText',false,'Typing during import ');
    await imported;await noteMutationQueue;
    if(!document.querySelector('#note-body').value.includes('Typing during import '))throw new Error('Import acknowledgement erased active writing');
  })()`);
  await win.webContents.executeJavaScript(`(async()=>{
    const file={name:'invalid.png',type:'image/png',size:3,arrayBuffer:async()=>{await new Promise(resolve=>setTimeout(resolve,150));return new Uint8Array([1,2,3]).buffer;}};
    const imported=importCuts([file],null,${JSON.stringify(result.noteId)},{kind:'block',anchor:0,side:'left'});
    await new Promise(resolve=>setTimeout(resolve,30));
    putCaret(document.querySelector('#note-body .line-text'),0);document.execCommand('insertText',false,'Typing during failed import ');
    await imported;await noteMutationQueue;
    if(!document.querySelector('#note-body').value.includes('Typing during failed import '))throw new Error('Failed import erased active writing');
  })()`);
  const stale=store.snapshot();
  await win.webContents.executeJavaScript(`changeMediaLayout('mediaLayoutResize',{noteId:${JSON.stringify(result.noteId)},cutId:${JSON.stringify(cutId)},width:.13})`);
  win.webContents.send('notebook:cuts-updated',stale);
  const retained=await win.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>resolve(currentNote().cuts.find(c=>c.id===${JSON.stringify(cutId)}).width),30))`);
  if(retained!==.13)throw new Error('Stale metadata notification overwrote the saved placement');
  let timer;
  const closed=new Promise((resolve,reject)=>{win.once('closed',resolve);timer=setTimeout(()=>reject(new Error('Layout save did not finish before close')),5000);});
  try {
    await win.webContents.executeJavaScript(`(async()=>{
      state=await window.notebook.action('note:select',{id:${JSON.stringify(result.noteId)}});view='notes';indexFor=null;render();
      changeMediaLayout('mediaLayoutResize',{noteId:${JSON.stringify(result.noteId)},cutId:${JSON.stringify(cutId)},width:.11});
    })()`);
    win.close();
    await closed;
    if(layout.read({noteId:result.noteId}).find(card=>card.id===cutId).width!==.11)throw new Error('Close lost the pending layout save: '+JSON.stringify(layout.read({noteId:result.noteId})));
  } finally {clearTimeout(timer);}
  console.log('MEDIA_LAYOUT_CLOSE_FLUSH_OK');
}
module.exports={verifyMediaLayoutClose};
