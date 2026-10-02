const { app, BrowserWindow, WebContentsView, ipcMain, Notification, Menu, nativeImage, dialog, shell, screen, protocol, net } = require('electron');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Store } = require('./store.cjs');
const { RelatedService } = require('./related-service.cjs');
const { MediaStore, webUrl } = require('./media.cjs');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const { movePosition } = require('./window-move.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'caderno-media', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const smoke = process.argv.includes('--smoke-test');
app.disableHardwareAcceleration();
if (smoke) {
  app.setPath('userData', path.join(app.getPath('temp'), 'caderninho-smoke'));
  fs.rmSync(app.getPath('userData'), { recursive: true, force: true });
}
let win, store, reminderInterval, saveFailed = false, alarmCount = 0;
let media, observedDay, related;
let restoreBounds = null, resizeSession = null, moveSession = null;
const MIN_WIDTH = 620, MIN_HEIGHT = 520, MAX_EXPANDED_WIDTH = 1200;
function windowState() {
  const info = { expanded: Boolean(restoreBounds), bounds: win.getBounds(), workArea: screen.getDisplayMatching(win.getBounds()).workArea };
  win.webContents.send('notebook:window-state', info);
  return info;
}
function toggleHeight() {
  if (restoreBounds) { const bounds = restoreBounds; restoreBounds = null; win.setBounds(bounds); }
  else {
    restoreBounds = win.getBounds();
    const area = screen.getDisplayMatching(restoreBounds).workArea;
    const width = Math.min(MAX_EXPANDED_WIDTH, area.width);
    win.setBounds({ x: Math.round(area.x + (area.width - width) / 2), y: area.y, width, height: area.height });
  }
  return windowState();
}
function reportSaveError(error) {
  console.error(error);
  if (/SQLITE/.test(error.code || '')) saveFailed = true;
  win?.webContents.send('notebook:save-error', 'Não foi possível salvar a última alteração. Verifique o espaço e as permissões da pasta de dados.');
}
function flush() {
  if (saveFailed) { win?.webContents.send('notebook:save-error', 'A última alteração não foi salva. Tente salvar novamente antes de fechar.'); return false; }
  try { if(store) { store.dispatch('category:finalize'); store.flush(); } return true; }
  catch (error) { reportSaveError(error); return false; }
}
function playSound() {
  alarmCount++;
  if (smoke) return;
  if (process.platform === 'darwin') {
    // afplay plays independently of renderer autoplay and window visibility.
    execFile('/usr/bin/afplay', [app.isPackaged ? path.join(process.resourcesPath, 'alarm.wav') : path.join(__dirname, 'assets', 'alarm.wav')], error => { if (error) { console.error(error.message); shell.beep(); } });
  } else shell.beep();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win?.isMinimized()) win.restore(); win?.show(); win?.focus(); });
  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')));
    try { store = new Store(app.getPath('userData')); }
    catch (error) { dialog.showErrorBox('Não foi possível abrir o caderno', error.message); app.quit(); return; }
    store.dispatch('view:select', { view: 'home' }); observedDay = store.dayKey();
    media = new MediaStore(store, nativeImage);
    related = new RelatedService(store, media, { ocrPath: app.isPackaged ? path.join(process.resourcesPath,'caderninho-ocr') : path.join(__dirname,'native','caderninho-ocr'), onUpdate:()=>{if(win&&!win.isDestroyed())win.webContents.send('related:updated');} });
    if(!smoke)related.schedule();
  store.db.prepare("UPDATE cuts SET status='unavailable' WHERE status='loading'").run();
  media.collect();
    protocol.handle('caderno-media', request => {
      const url = new URL(request.url), file = url.hostname === 'blob' ? media.file(url.pathname.slice(1)) : null;
      return file ? net.fetch(pathToFileURL(file).href) : new Response('Arquivo não encontrado', { status: 404 });
    });
    createWindow();
  });
  app.on('activate', () => { if (store && !BrowserWindow.getAllWindows().length) createWindow(); });
  app.on('before-quit', event => { if (!flush()) event.preventDefault(); });
  app.on('will-quit', () => { related?.close(); store?.close(); });
  app.on('window-all-closed', () => app.quit());
}
function dispatchHistory(direction, targetWindow) {
  const focused = targetWindow || BrowserWindow.getFocusedWindow();
  if (!focused) return;
  if (focused === win) focused.webContents.send('notebook:history', direction);
  else if (direction === 'undo') focused.webContents.undo();
  else focused.webContents.redo();
}
async function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  restoreBounds = null; resizeSession = null;
  moveSession = null;
  win = new BrowserWindow({ width: Math.min(820, area.width), height: Math.min(820, area.height), minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT, resizable: true, fullscreenable: false, frame: false, transparent: true, hasShadow: false, backgroundColor: '#00000000', title: 'Caderninho', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'Caderninho', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] }] : []),
    { label: 'Editar', submenu: [{ label: 'Desfazer', accelerator: 'CommandOrControl+Z', click: (_item, targetWindow) => dispatchHistory('undo', targetWindow) }, { label: 'Refazer', accelerator: 'CommandOrControl+Shift+Z', click: (_item, targetWindow) => dispatchHistory('redo', targetWindow) }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] }
  ]));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.on('close', event => { if (!flush()) event.preventDefault(); });
  win.on('closed', () => { win = null; clearInterval(reminderInterval); });
  await win.loadFile('index.html');
  windowState();
  clearInterval(reminderInterval);
  reminderInterval = setInterval(checkReminders, 1000);
  if (smoke) runSmoke();
}
function checkReminders() {
  try {
    const today = store.dayKey();
    if (today !== observedDay) {
      if (store.getSetting('selected_day') === observedDay) store.setSetting('selected_day', today);
      observedDay = today; win?.webContents.send('notebook:day-updated', store.snapshot());
    }
  } catch (error) { reportSaveError(error); }
  let due;
  try { due = store.due(); } catch (error) { reportSaveError(error); return; }
  if (!due.length) return;
  playSound();
  win?.webContents.send('notebook:reminder', due);
  if (!smoke && Notification.isSupported()) {
    due.forEach(reminder => {
      const notification = new Notification({ title: reminder.title || 'Caderninho · Lembrete', body: reminder.body.slice(0, 240) || 'Chegou o horário agendado.', silent: true });
      notification.on('click', () => {
        try {
          const note = store.note(reminder.id);
          if (!note.trashed) {win?.webContents.send('notebook:navigate', store.dispatch('note:select', { id: note.id }));if(reminder.sourceActionId)win?.webContents.send('notebook:source-origin',reminder.sourceActionId);}
        } catch (error) { console.error(error.message); }
        if (win?.isMinimized()) win.restore(); win?.show(); win?.focus();
      });
      notification.show();
    });
  }
}
ipcMain.handle('related:query', (_event,id) => related.query(id));
ipcMain.handle('related:retry', () => { if(!smoke)related.schedule(); });
ipcMain.handle('notebook:state', () => ({ ...store.snapshot(), ...(smoke ? { alarmCount } : {}) }));
ipcMain.handle('notebook:export-pdf', async (_event,id) => {
  if(!flush())throw Error('Salve a última alteração antes de exportar.');
  const snapshot=store.snapshot(),note=snapshot.notes.find(note=>note.id===id&&!note.trashed);
  if(!note)throw Error('Página não encontrada.');
  const {buildPDFHTML,createPDF,filename}=require('./pdf-export.cjs');
  const destination=smoke?{filePath:path.join(__dirname,'artifacts','pdf',filename(note.title))}:await dialog.showSaveDialog(win,{title:'Exportar página para PDF',defaultPath:path.join(app.getPath('documents'),filename(note.title)),filters:[{name:'Documento PDF',extensions:['pdf']}],buttonLabel:'Exportar'});
  if(destination.canceled||!destination.filePath)return {canceled:true};
  const filePath=/\.pdf$/i.test(destination.filePath)?destination.filePath:destination.filePath+'.pdf';
  const buffer=await createPDF(WebContentsView,buildPDFHTML(note,snapshot,media));
  if(smoke)fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temporary=filePath+'.'+randomUUID()+'.tmp';
  try{await fs.promises.writeFile(temporary,buffer,{flag:'wx'});await fs.promises.rename(temporary,filePath);}finally{await fs.promises.rm(temporary,{force:true});}
  return {canceled:false,filePath};
});
ipcMain.handle('notebook:action', (_event, action, input) => {
  if (['source:purge','note:purge','item:purge','cut:purge','cut:create','cut:preview'].includes(action)) throw new Error('Use o comando específico para esta operação.');
  try { const state = store.dispatch(action, input); saveFailed = false; if(!smoke)related.schedule(); return state; }
  catch (error) { if (/SQLITE/.test(error.code || '')) reportSaveError(error); throw error; }
});
ipcMain.handle('notebook:purge', async (_event, kind, id) => {
  if (!['note', 'item', 'cut', 'source'].includes(kind)) throw new Error('Tipo inválido.');
  const item = kind === 'source' ? store.db.prepare('SELECT *,deleted_at AS trashed FROM source_actions WHERE id=?').get(id) : kind === 'note' ? store.note(id) : kind === 'cut' ? store.cut(id) : store.item(id);
  if (!item || !item.trashed) throw new Error('Este item não está na lixeira.');
  const result = await dialog.showMessageBox(win, { type: 'warning', title: 'Excluir definitivamente?', message: `Excluir “${item.title || 'Sem título'}”?`, detail: 'Esta ação não pode ser desfeita.', buttons: ['Cancelar', 'Excluir definitivamente'], defaultId: 0, cancelId: 0, noLink: true });
  if (result.response !== 1) return null;
  const state = store.dispatch(kind + ':purge', { id }); media.collect(); saveFailed = false; if(!smoke)related.schedule(); return state;
});
ipcMain.handle('cuts:image', (_event, input) => {
  const note = store.note(input.noteId, 'notes'); if (note.trashed) throw new Error('Restaure a nota primeiro.');
  const blobId = media.image(input.bytes);
  const state=store.dispatch('cut:create', { noteId: note.id, kind: 'image', blobId, title: input.name || 'Imagem' }); if(!smoke)related.schedule(); return state;
});
ipcMain.handle('cuts:link', (_event, input) => {
  const url = webUrl(input.url).href;
  const id = randomUUID();
  const state = store.dispatch('cut:create', { id, noteId: input.noteId, kind: 'link', url, title: new URL(url).hostname, status: 'loading' });
  media.preview(url).then(data => store.dispatch('cut:preview', { id, ...data, status: 'ready' })).catch(() => {
    try { store.dispatch('cut:preview', { id, status: 'unavailable' }); } catch {}
  }).finally(() => { if (store && win && !win.isDestroyed()) { try { win.webContents.send('notebook:cuts-updated', store.snapshot()); if(!smoke)related.schedule(); } catch {} } });
  if(!smoke)related.schedule(); return state;
});
ipcMain.handle('notebook:open-link', (_event,value)=>{const url=require('./editor-document.js').link(value);if(!url)throw new Error('Link inválido.');return shell.openExternal(url);});
ipcMain.handle('cuts:open', (_event, id) => { const cut = store.cut(id); if (cut.kind !== 'link') throw new Error('Este recorte não é um link.'); return shell.openExternal(webUrl(cut.url).href); });
ipcMain.handle('notebook:sound', () => { playSound(); return true; });
ipcMain.handle('notebook:window', (_event, action) => {
  if (action === 'close') win.close();
  else if (action === 'minimize') win.minimize();
  else if (action === 'maximize') return toggleHeight();
  else if (action === 'state') return windowState();
});
ipcMain.on('notebook:resize', (event, phase, input = {}) => {
  if (!win || event.sender !== win.webContents) return;
  if (phase === 'end') { resizeSession = null; return; }
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return;
  if (phase === 'start') {
    if (!['n','s','e','w','ne','nw','se','sw'].includes(input.edge)) return;
    resizeSession = { ...input, bounds: win.getBounds() }; return;
  }
  if (phase !== 'move' || !resizeSession) return;
  const { edge, x, y, bounds } = resizeSession;
  const dx = input.x - x, dy = input.y - y;
  const next = { ...bounds };
  if (edge.includes('e')) next.width = Math.max(MIN_WIDTH, bounds.width + dx);
  if (edge.includes('s')) next.height = Math.max(MIN_HEIGHT, bounds.height + dy);
  if (edge.includes('w')) { next.width = Math.max(MIN_WIDTH, bounds.width - dx); next.x = bounds.x + bounds.width - next.width; }
  if (edge.includes('n')) { next.height = Math.max(MIN_HEIGHT, bounds.height - dy); next.y = bounds.y + bounds.height - next.height; }
  restoreBounds = null;
  win.setBounds(Object.fromEntries(Object.entries(next).map(([key, value]) => [key, Math.round(value)])));
  windowState();
});
ipcMain.on('notebook:move', (event, phase) => {
  if (!win || win.isDestroyed() || event.sender !== win.webContents) return;
  if (phase === 'end') { moveSession = null; return; }
  // Read desktop coordinates directly: renderer screen coordinates can become
  // unreliable while moving the window that contains the captured pointer.
  if (phase === 'start') { moveSession = { origin: screen.getCursorScreenPoint(), bounds: win.getBounds() }; return; }
  if (phase !== 'move' || !moveSession) return;
  const position = movePosition(moveSession.bounds, moveSession.origin, screen.getCursorScreenPoint());
  if (!position) { moveSession = null; return; }
  win.setPosition(position.x, position.y);
});
function smokeScript(file){const source=fs.readFileSync(path.join(__dirname,'tests',file),'utf8').trim().replace(/;$/, '');return `Promise.resolve(${source}).catch(error=>{throw new Error(${JSON.stringify(file)}+': '+(error.stack||error.message||String(error)));})`;}
async function runNativeEditorSmoke(){
  const js=async code=>{try{return await win.webContents.executeJavaScript(code.includes('await ')?'(async()=>{'+code+'})()':code);}catch(error){throw new Error('Native script '+code.slice(0,180)+': '+error.message);}},pause=()=>new Promise(resolve=>setTimeout(resolve,180));
  const key=(keyCode,modifiers=[])=>{keyCode=({ArrowDown:'Down',ArrowUp:'Up',ArrowRight:'Right',ArrowLeft:'Left'})[keyCode]||keyCode;win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});};
  await js("state=await window.notebook.action('note:create',{type:'notes',title:'Barra em nota nova'});view='notes';render();$('#note-body').focus();");
  win.webContents.sendInputEvent({type:'char',keyCode:'/'});await pause();
  if(!await js("!$('#block-menu').hidden&&document.querySelectorAll('[data-insert-block]').length===12"))throw new Error('Native slash in new textarea did not open commands');
  key('Escape');
  await js("state=await window.notebook.action('note:create',{type:'notes',title:'Teclado real'});view='notes';render();ensureRichEditor();const editor=$('#note-body');editor.focus();const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);");
  win.webContents.sendInputEvent({type:'char',keyCode:'/'});await pause();
  if(!await js("!$('#block-menu').hidden&&document.querySelectorAll('[data-insert-block]').length===12"))throw new Error('Native slash at page boundary did not open commands');
  for(const letter of 'tit'){win.webContents.sendInputEvent({type:'char',keyCode:letter});await pause();}
  if(!await js("document.querySelectorAll('[data-insert-block]').length===3"))throw new Error('Native slash search did not filter');
  key('Escape');await pause();
  const setup=async()=>{await js("state=await window.notebook.action('note:update',{id:currentNote().id,editorDoc:pageDocument.fromPlain('Primeira linha\\nSegunda linha\\nTerceira linha')});renderPage();hideEditorMenus();");await pause();};
  for(const method of ['keyboard','mouse'])for(const deletion of ['Backspace','Delete']){
    await setup();
    if(method==='keyboard'){
      await js("putCaret($('#note-body .line-text'),0)");key('ArrowDown',['shift']);key('ArrowDown',['shift']);key('ArrowRight',['shift','meta']);
    }else{
      const coords=await js("(()=>{const spans=[...$('#note-body').querySelectorAll('.line-text')],a=spans[0].getBoundingClientRect(),b=spans.at(-1).getBoundingClientRect();return {x1:Math.round(a.left),y1:Math.round(a.top+a.height/2),x2:Math.round(b.right),y2:Math.round(b.top+b.height/2)}})()");
      win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:coords.x1,y:coords.y1});
      win.webContents.sendInputEvent({type:'mouseMove',modifiers:['leftbuttondown'],x:coords.x2,y:coords.y2});
      win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:coords.x2,y:coords.y2});
    }
    await pause();
    if(!await js("getSelection().toString().includes('Segunda linha')"))throw new Error('Native '+method+' did not select multiple lines: '+await js("JSON.stringify({selection:getSelection().toString(),html:$('#note-body').innerHTML,active:document.activeElement.outerHTML.slice(0,200),errors:window.smokeErrors})"));
    key(deletion);await pause();
    if(!await js("$('#note-body').value===''&&currentNote().body===''") )throw new Error('Native '+method+' '+deletion+' failed: '+await js("JSON.stringify({text:$('#note-body').innerText,body:currentNote().body,html:$('#note-body').innerHTML,errors:window.smokeErrors})"));
    key('z',['meta']);await pause();if(!await js("currentNote().body.includes('Segunda linha')"))throw new Error('Native undo failed');
  }
  // Recover browser-created paragraphs rather than silently saving an empty document.
  await js("$('#note-body').innerHTML='<div>Texto visível</div><div>Outra linha</div>';const editor=$('#note-body');editor.focus();const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);editor.dispatchEvent(new InputEvent('input',{bubbles:true}));");await pause();
  if(!await js("currentNote().body==='Texto visível\\nOutra linha'"))throw new Error('Native unwrapped paragraphs were not recovered');
  console.log('NATIVE_EDITOR_SMOKE_OK');
}
async function runSmoke() {
  try {
    if(process.argv.includes('--source-only')) {fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(__dirname,'assets','icon.png'))])}`);const result=await win.webContents.executeJavaScript(smokeScript('source-actions-smoke.js'));console.log('SOURCE_ACTIONS_SMOKE_OK',JSON.stringify(result));fs.writeFileSync(path.join(__dirname,'artifacts','source-actions.png'),(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript('openSourceComposer(actionsForNote()[0].origin)');await new Promise(resolve=>setTimeout(resolve,250));fs.writeFileSync(path.join(__dirname,'artifacts','source-action-composer.png'),(await win.webContents.capturePage()).toPNG());app.quit();return;}
    if(process.argv.includes('--related-runtime-only')) {
      related.cacheDir=path.join(process.cwd(),'artifacts','embedding-cache');
      store.dispatch('note:update',{id:'welcome',title:'Custos de nuvem',body:'Reduzir os gastos com infraestrutura e serviços de nuvem.'});
      const next=store.dispatch('note:create',{type:'notes',title:'Cloud cost optimization'});const target=next.selected.notes;
      store.dispatch('note:update',{id:target,body:'Optimize cloud infrastructure costs and reduce spending.'});
      await related.run();if(related.status!=='ready')throw Error(related.error);
      if(!related.query('welcome').results.some(d=>d.noteId===target))throw Error('Modelo local não encontrou conexão entre idiomas.');
      if(process.platform==='darwin'){
        const file=path.join(store.directory,'ocr-probe.png');fs.writeFileSync(file,fs.readFileSync(path.join(__dirname,'docs','images','acoes-na-nota.png')));
        const text=await related.job({kind:'ocr',file});if(!text.includes('Próximos passos'))throw Error('OCR do pacote não leu o texto esperado.');
      }
      console.log('RELATED_RUNTIME_OK');app.quit();return;
    }
    if(process.argv.includes('--native-only')){await runNativeEditorSmoke();app.quit();return;}
    if(process.argv.includes('--editor-only')) {
      await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(__dirname,'assets','icon.png'))])}`);
      const result=await win.webContents.executeJavaScript(smokeScript('editor-smoke.js'));
      if(result.errors.length)throw new Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts','editor-tabela.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("openInsertMenu([...document.querySelectorAll('.writing-line')].at(-1));");
      await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      fs.writeFileSync(path.join(__dirname,'artifacts','paleta-blocos.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("const search=document.querySelector('#block-menu input');search.value='tit';search.dispatchEvent(new Event('input',{bubbles:true}));");
      await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      fs.writeFileSync(path.join(__dirname,'artifacts','paleta-busca.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("openInsertMenu([...document.querySelectorAll('.writing-line')].at(-1));document.querySelector('[data-insert-block=table]').click();document.querySelectorAll('.table-picker button')[19].dispatchEvent(new PointerEvent('pointerenter'));");
      fs.writeFileSync(path.join(__dirname,'artifacts','seletor-tabela.png'),(await win.webContents.capturePage()).toPNG());
      await runNativeEditorSmoke();
      const selectionResult=await win.webContents.executeJavaScript(smokeScript('selection-smoke.js'));
      console.log('SELECTION_SMOKE_OK',JSON.stringify(selectionResult));
      console.log('EDITOR_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--related-only')) {
      await win.webContents.executeJavaScript(smokeScript('related-smoke.js'));
      const docs=require('./related-engine.cjs').documents(store.snapshot());
      for(const d of docs)store.db.prepare('INSERT OR REPLACE INTO related_vectors VALUES(?,?,?,?)').run(d.id,d.hash,require('./related-config.cjs').version,JSON.stringify([1,0]));
      related.status='ready';
      const result=await win.webContents.executeJavaScript('verifyRelatedSmoke()');
      if(result.errors.length)throw Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts','relacionados.png'),(await win.webContents.capturePage()).toPNG());
      console.log('RELATED_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--notebooks-only')) {
      const result=await win.webContents.executeJavaScript(smokeScript('notebook-smoke.js'));
      if(result.errors.length) throw new Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true}); fs.writeFileSync(path.join(__dirname,'artifacts','cadernos.png'),(await win.webContents.capturePage()).toPNG());
      console.log('NOTEBOOK_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--pdf-only')) {
      const pixels=Buffer.alloc(1200*900*4);require('node:crypto').randomFillSync(pixels);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
      const largeImage=nativeImage.createFromBitmap(pixels,{width:1200,height:900}).toPNG();
      await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...largeImage])}`);
      media.fetch=async url=>url.endsWith('no-cover')?{bytes:Buffer.from('<meta property="og:title" content="Referência sem capa">'),type:'text/html',url}:url.endsWith('cover.png')?{bytes:largeImage,type:'image/png',url}:{bytes:Buffer.from('<meta property="og:title" content="Referência para o projeto"><meta property="og:description" content="Cartão de link com capa local"><meta property="og:image" content="https://example.test/cover.png">'),type:'text/html',url};
      let exportWindows=0;const countExportWindow=()=>{exportWindows++;};app.on('browser-window-created',countExportWindow);
      const result=await win.webContents.executeJavaScript(smokeScript('pdf-smoke.js'));
      app.off('browser-window-created',countExportWindow);if(exportWindows)throw Error('Exportação abriu uma janela de prévia.');
      if(result.errors.length)throw Error(result.errors.join('\n'));
      console.log('PDF_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--category-autocomplete-only')) {
      const result=await win.webContents.executeJavaScript(smokeScript('category-autocomplete-smoke.js'));
      if(result.errors.length)throw Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts','categorias-autocomplete.png'),(await win.webContents.capturePage()).toPNG());
      console.log('CATEGORY_AUTOCOMPLETE_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--categories-only')) {
      await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(__dirname,'assets','icon.png'))])}`);
      const result=await win.webContents.executeJavaScript(smokeScript('category-smoke.js'));
      if(result.errors.length) throw new Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
      fs.writeFileSync(path.join(__dirname,'artifacts','categorias.png'),(await win.webContents.capturePage()).toPNG());
      console.log('CATEGORY_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    const result = await win.webContents.executeJavaScript(smokeScript('app-smoke.js'));
    if (result.errors.length) throw new Error(result.errors.join('\n'));
    const reopened = new Store(app.getPath('userData'));
    if (!reopened.snapshot().notes.some(n => n.body.includes('Salvamento verificado'))) throw new Error('Nota não persistiu no SQLite');
    reopened.close();
    if (alarmCount !== 2) throw new Error('O alerta sonoro não foi acionado corretamente.');
    fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
    await new Promise(resolve => setTimeout(resolve, 300));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'caderninho-sqlite.png'), (await win.webContents.capturePage()).toPNG());
    for (const [view, file] of [['tasks', 'tarefas-sqlite.png'], ['reminders', 'lembretes-sqlite.png'], ['archive', 'lixeira-sqlite.png']]) {
      await win.webContents.executeJavaScript(`document.querySelector('[data-view="${view}"]').click()`);
      await new Promise(resolve => setTimeout(resolve, 250));
      fs.writeFileSync(path.join(__dirname, 'artifacts', file), (await win.webContents.capturePage()).toPNG());
    }
    await win.webContents.executeJavaScript("toast('Alerta sonoro agendado.');");
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'aviso-sucesso.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript("document.querySelector('#toast').hidden = true; document.querySelector('#sidebar-toggle').click();");
    await new Promise(resolve => setTimeout(resolve, 350));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'menu-recolhido.png'), (await win.webContents.capturePage()).toPNG());
    const bytes = fs.readFileSync(path.join(__dirname, 'assets', 'icon.png'));
    media.fetch = async url => { await new Promise(resolve => setTimeout(resolve, 50)); return url.endsWith('.png') ? { bytes, type: 'image/png', url } : { bytes: Buffer.from('<meta property="og:title" content="Uma ideia em papel"><meta property="og:description" content="Uma prévia guardada pelas metatags, mesmo sem internet."><meta property="og:image" content="/cover.png">'), type: 'text/html', url }; };
    await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(__dirname, 'assets', 'icon.png'))])}`);
    const cuts = await win.webContents.executeJavaScript(smokeScript('cuts-smoke.js'));
    if (cuts.errors.length) throw new Error(cuts.errors.join('\n'));
    const cutStore = new Store(app.getPath('userData'));
    if (cutStore.snapshot().notes.find(note => note.id === cuts.noteId).cuts.length !== 2) throw new Error('Recortes não persistiram');
    if (cutStore.db.prepare('SELECT count(*) AS total FROM media_blobs').get().total !== 1) throw new Error('Imagens idênticas não foram deduplicadas');
    cutStore.close();
    await win.webContents.executeJavaScript("document.querySelector('#toast').hidden = true");
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'recortes.png'), (await win.webContents.capturePage()).toPNG());
    const margin = await win.webContents.executeJavaScript(smokeScript('margin-smoke.js'));
    if (margin.errors.length || alarmCount !== 3) throw new Error('Falha na margem inteligente: ' + margin.errors.join('\n'));
    const marginStore = new Store(app.getPath('userData'));
    const inlineNote = marginStore.snapshot().notes.find(note => note.id === margin.noteId);
    if (!inlineNote.enabled || !inlineNote.body.includes('[x]')) throw new Error('Margem não persistiu no SQLite');
    marginStore.close();
    await new Promise(resolve => setTimeout(resolve, 150));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'margem-inteligente.png'), (await win.webContents.capturePage()).toPNG());
    const undo = await win.webContents.executeJavaScript(smokeScript('undo-smoke.js'));
    if (undo.errors.length) throw new Error(undo.errors.join('\n'));
    win.focus();
    await win.webContents.executeJavaScript("(async () => { window.menuHistoryReceipt=0; window.notebook.onHistory(() => window.menuHistoryReceipt++); putCaret(document.querySelector('.line-text')); document.execCommand('insertText', false, 'Menu undo '); while(pending) await new Promise(resolve=>setTimeout(resolve,20)); if(!document.querySelector('#note-body').value.includes('Menu undo ')) throw new Error('Texto do teste de menu não foi inserido'); })()");
    dispatchHistory('undo', win);
    await win.webContents.executeJavaScript("(async () => { const deadline=Date.now()+3000; while(window.menuHistoryReceipt<1 && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20)); if(window.menuHistoryReceipt<1) throw new Error('Menu Desfazer não foi recebido'); await undoQueue; })()");
    if (await win.webContents.executeJavaScript("document.querySelector('#note-body').value.includes('Menu undo ')") ) throw new Error('Menu Desfazer não funcionou');
    dispatchHistory('redo', win);
    await win.webContents.executeJavaScript("(async () => { const deadline=Date.now()+3000; while(window.menuHistoryReceipt<2 && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20)); if(window.menuHistoryReceipt<2) throw new Error('Menu Refazer não foi recebido'); await undoQueue; })()");
    if (!await win.webContents.executeJavaScript("document.querySelector('#note-body').value.includes('Menu undo ')") ) throw new Error('Menu Refazer não funcionou: '+await win.webContents.executeJavaScript("JSON.stringify({body:$('#note-body').value,active:document.activeElement.outerHTML.slice(0,400),history:pageHistories.get(currentNote().id),errors:window.smokeErrors})"));
    const calendar = await win.webContents.executeJavaScript(smokeScript('calendar-smoke.js'));
    if (calendar.errors.length) throw new Error(calendar.errors.join('\n'));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'calendario-lembretes.png'), (await win.webContents.capturePage()).toPNG());
    const categories = await win.webContents.executeJavaScript(smokeScript('category-smoke.js'));
    if (categories.errors.length) throw new Error(categories.errors.join('\n'));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'categorias.png'), (await win.webContents.capturePage()).toPNG());
    const home = await win.webContents.executeJavaScript(smokeScript('home-smoke.js'));
    if (home.errors.length) throw new Error(home.errors.join('\n'));
    const homeStore = new Store(app.getPath('userData'));
    if (homeStore.snapshot().daily.body !== home.body) throw new Error('Anotações do dia não persistiram');
    homeStore.close();
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'pagina-do-dia.png'), (await win.webContents.capturePage()).toPNG());
    const actualNow=store.now;
    store.now=()=>actualNow()+24*60*60*1000;
    store.dispatch('view:select',{view:'home'}); observedDay=store.dayKey();
    await win.webContents.executeJavaScript("(async () => { state = await window.notebook.state(); view = 'home'; render(); })()");
    await win.webContents.executeJavaScript(`document.querySelector('#daily-select').value=${JSON.stringify(home.day)};document.querySelector('#daily-select').dispatchEvent(new Event('change'));`);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!await win.webContents.executeJavaScript(`document.querySelector('#daily-body').readOnly && document.querySelector('#daily-body').value === ${JSON.stringify(home.body)}`)) throw new Error('Página anterior não foi preservada para consulta');
    fs.writeFileSync(path.join(__dirname, 'artifacts', 'pagina-anterior.png'), (await win.webContents.capturePage()).toPNG());
    store.now=actualNow; observedDay=store.dayKey();
    const notebooks=await win.webContents.executeJavaScript(smokeScript('notebook-smoke.js'));
    if(notebooks.errors.length) throw new Error(notebooks.errors.join('\n'));
    fs.writeFileSync(path.join(__dirname,'artifacts','cadernos.png'),(await win.webContents.capturePage()).toPNG());
    const editorResult=await win.webContents.executeJavaScript(smokeScript('editor-smoke.js'));
    if(editorResult.errors.length)throw new Error(editorResult.errors.join('\n'));
    fs.writeFileSync(path.join(__dirname,'artifacts','editor-tabela.png'),(await win.webContents.capturePage()).toPNG());
    console.log('SOURCE_ACTIONS_SMOKE_OK',JSON.stringify(await win.webContents.executeJavaScript(smokeScript('source-actions-smoke.js'))));
    console.log('EDITOR_SMOKE_OK',JSON.stringify(editorResult));
    await runNativeEditorSmoke();
    console.log('SELECTION_SMOKE_OK',JSON.stringify(await win.webContents.executeJavaScript(smokeScript('selection-smoke.js'))));
    console.log('NOTEBOOK_SMOKE_OK',JSON.stringify(notebooks));
    console.log('HOME_SMOKE_OK', JSON.stringify(home));
    console.log('CALENDAR_SMOKE_OK', JSON.stringify(calendar));
    console.log('CATEGORY_SMOKE_OK', JSON.stringify(categories));
    console.log('UNDO_SMOKE_OK', JSON.stringify(undo));
    console.log('MARGIN_SMOKE_OK', JSON.stringify(margin));
    console.log('CUTS_SMOKE_OK', JSON.stringify(cuts));
    console.log('APP_SMOKE_OK', JSON.stringify({ ...result, alarmCount }));
    app.quit();
  } catch (error) { console.error(error); app.exit(1); }
}
