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
const { registerFontProtocol, SCHEME: FONT_SCHEME } = require('./system-fonts.cjs');
const { noteMenu, availableCommands } = require('./note-menu.cjs');
const ROOT = path.join(__dirname, '..', '..');
protocol.registerSchemesAsPrivileged([{ scheme: 'caderno-media', privileges: { standard: true, secure: true, supportFetchAPI: true } }, { scheme: FONT_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
app.disableHardwareAcceleration();
let win, store, reminderInterval, saveFailed = false;
let media, observedDay, related;
let resolveReady;
const ready = new Promise(resolve => { resolveReady = resolve; });
let restoreBounds = null, resizeSession = null, moveSession = null, noteCommands = [];
const MIN_WIDTH = 620, MIN_HEIGHT = 520, MAX_EXPANDED_WIDTH = 1200;
// Effects that leave the app; an external harness may replace them before the app is ready.
const services = {
  playSound,
  scheduleRelated: () => related.schedule(),
  notifications: () => Notification.isSupported(),
  pdfDestination: title => dialog.showSaveDialog(win, { title: 'Exportar página para PDF', defaultPath: path.join(app.getPath('documents'), title), filters: [{ name: 'Documento PDF', extensions: ['pdf'] }], buttonLabel: 'Exportar' }),
  cursor: () => screen.getCursorScreenPoint(),
};
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
  if (process.platform === 'darwin') {
    // afplay plays independently of renderer autoplay and window visibility.
    execFile('/usr/bin/afplay', [app.isPackaged ? path.join(process.resourcesPath, 'alarm.wav') : path.join(ROOT, 'assets', 'alarm.wav')], error => { if (error) { console.error(error.message); shell.beep(); } });
  } else shell.beep();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win?.isMinimized()) win.restore(); win?.show(); win?.focus(); });
  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock.setIcon(nativeImage.createFromPath(path.join(ROOT, 'assets', 'icon.png')));
    try { store = new Store(app.getPath('userData')); }
    catch (error) { dialog.showErrorBox('Não foi possível abrir o caderno', error.message); app.quit(); return; }
    store.dispatch('view:select', { view: 'home' }); observedDay = store.dayKey();
    media = new MediaStore(store, nativeImage);
    related = new RelatedService(store, media, { ocrPath: app.isPackaged ? path.join(process.resourcesPath,'caderninho-ocr') : path.join(ROOT,'native','caderninho-ocr'), onUpdate:()=>{if(win&&!win.isDestroyed())win.webContents.send('related:updated');} });
    services.scheduleRelated();
  store.db.prepare("UPDATE cuts SET status='unavailable' WHERE status='loading'").run();
  media.collect();
    protocol.handle('caderno-media', request => {
      const url = new URL(request.url), file = url.hostname === 'blob' ? media.file(url.pathname.slice(1)) : null;
      return file ? net.fetch(pathToFileURL(file).href) : new Response('Arquivo não encontrado', { status: 404 });
    });
    registerFontProtocol(protocol, net);
    createWindow();
  });
  app.on('activate', () => { if (store && !BrowserWindow.getAllWindows().length) createWindow(); });
  app.on('before-quit', event => { if (!flush()) event.preventDefault(); });
  app.on('will-quit', () => { related?.close(); store?.close(); });
  app.on('window-all-closed', () => app.quit());
}
function buildMenu() {
  const send = command => { if (win && !win.isDestroyed()) win.webContents.send('notebook:command', command); };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'Caderninho', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] }] : []),
    noteMenu(noteCommands, send),
    { label: 'Editar', submenu: [{ label: 'Desfazer', accelerator: 'CommandOrControl+Z', click: (_item, targetWindow) => dispatchHistory('undo', targetWindow) }, { label: 'Refazer', accelerator: 'CommandOrControl+Shift+Z', click: (_item, targetWindow) => dispatchHistory('redo', targetWindow) }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { role: 'windowMenu' }
  ]));
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
  win = new BrowserWindow({ width: Math.min(820, area.width), height: Math.min(820, area.height), minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT, resizable: true, fullscreenable: false, titleBarStyle: 'hidden', trafficLightPosition: { x: 24, y: 24 }, transparent: true, hasShadow: false, backgroundColor: '#00000000', title: 'Caderninho', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
    buildMenu();
  win.on('maximize', () => { win.unmaximize(); toggleHeight(); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.on('close', event => { if (!flush()) event.preventDefault(); });
  win.on('closed', () => { win = null; clearInterval(reminderInterval); });
  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  windowState();
  clearInterval(reminderInterval);
  reminderInterval = setInterval(checkReminders, 1000);
  resolveReady();
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
  services.playSound();
  win?.webContents.send('notebook:reminder', due);
  if (services.notifications()) {
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
ipcMain.handle('related:retry', () => { services.scheduleRelated(); });
ipcMain.handle('notebook:state', () => store.snapshot());
ipcMain.handle('notebook:export-pdf', async (_event,id) => {
  if(!flush())throw Error('Salve a última alteração antes de exportar.');
  const snapshot=store.snapshot(),note=snapshot.notes.find(note=>note.id===id&&!note.trashed);
  if(!note)throw Error('Página não encontrada.');
  const {buildPDFHTML,createPDF,filename}=require('./pdf-export.cjs');
  const destination=await services.pdfDestination(filename(note.title));
  if(destination.canceled||!destination.filePath)return {canceled:true};
  const filePath=/\.pdf$/i.test(destination.filePath)?destination.filePath:destination.filePath+'.pdf';
  const buffer=await createPDF(WebContentsView,buildPDFHTML(note,snapshot,media),{mermaidPath:path.join(__dirname,'..','renderer','vendor','mermaid.min.js')});
  const temporary=filePath+'.'+randomUUID()+'.tmp';
  try{await fs.promises.writeFile(temporary,buffer,{flag:'wx'});await fs.promises.rename(temporary,filePath);}finally{await fs.promises.rm(temporary,{force:true});}
  return {canceled:false,filePath};
});
ipcMain.handle('notebook:action', (_event, action, input) => {
  if (['source:purge','note:purge','item:purge','cut:purge','cut:create','cut:preview'].includes(action)) throw new Error('Use o comando específico para esta operação.');
  try { const state = store.dispatch(action, input); saveFailed = false; services.scheduleRelated(); return state; }
  catch (error) { if (/SQLITE/.test(error.code || '')) reportSaveError(error); throw error; }
});
ipcMain.handle('notebook:purge', async (_event, kind, id) => {
  if (!['note', 'item', 'cut', 'source'].includes(kind)) throw new Error('Tipo inválido.');
  const item = kind === 'source' ? store.db.prepare('SELECT *,deleted_at AS trashed FROM source_actions WHERE id=?').get(id) : kind === 'note' ? store.note(id) : kind === 'cut' ? store.cut(id) : store.item(id);
  if (!item || !item.trashed) throw new Error('Este item não está na lixeira.');
  const result = await dialog.showMessageBox(win, { type: 'warning', title: 'Excluir definitivamente?', message: `Excluir “${item.title || 'Sem título'}”?`, detail: 'Esta ação não pode ser desfeita.', buttons: ['Cancelar', 'Excluir definitivamente'], defaultId: 0, cancelId: 0, noLink: true });
  if (result.response !== 1) return null;
  const state = store.dispatch(kind + ':purge', { id }); media.collect(); saveFailed = false; services.scheduleRelated(); return state;
});
ipcMain.handle('cuts:image', (_event, input) => {
  const note = store.note(input.noteId, 'notes'); if (note.trashed) throw new Error('Restaure a nota primeiro.');
  const blobId = media.image(input.bytes);
  const state=store.dispatch('cut:create', { noteId: note.id, kind: 'image', blobId, title: input.name || 'Imagem' }); services.scheduleRelated(); return state;
});
ipcMain.handle('cuts:pdf', async (_event, input) => {
  const note = store.note(input.noteId, 'notes'); if (note.trashed) throw new Error('Restaure a nota primeiro.');
  const readerPath = app.isPackaged ? path.join(process.resourcesPath,'caderninho-ocr') : path.join(ROOT,'native','caderninho-ocr');
  const data = await media.pdf(input.bytes, input.name, readerPath);
  const state = store.dispatch('cut:create', { noteId: note.id, kind: 'pdf', ...data });
  services.scheduleRelated(); return state;
});
ipcMain.handle('cuts:link', (_event, input) => {
  const url = webUrl(input.url).href;
  const id = randomUUID();
  const state = store.dispatch('cut:create', { id, noteId: input.noteId, kind: 'link', url, title: new URL(url).hostname, status: 'loading' });
  media.preview(url).then(data => store.dispatch('cut:preview', { id, ...data, status: 'ready' })).catch(() => {
    try { store.dispatch('cut:preview', { id, status: 'unavailable' }); } catch {}
  }).finally(() => { if (store && win && !win.isDestroyed()) { try { win.webContents.send('notebook:cuts-updated', store.snapshot()); services.scheduleRelated(); } catch {} } });
  services.scheduleRelated(); return state;
});
ipcMain.handle('notebook:open-link', (_event,value)=>{const url=require('../shared/editor-document.js').link(value);if(!url)throw new Error('Link inválido.');return shell.openExternal(url);});
ipcMain.handle('cuts:open', async (_event, id) => { const cut = store.cut(id);
  if (cut.kind === 'pdf') {
    const file = media.file(cut.blob_id);
    if (!file || !fs.existsSync(file)) throw new Error('PDF não encontrado.');
    const error = await shell.openPath(file); if (error) throw new Error('Não foi possível abrir o PDF: ' + error);
    return;
  }
 if (cut.kind !== 'link') throw new Error('Este recorte não é um link.'); return shell.openExternal(webUrl(cut.url).href); });
ipcMain.handle('notebook:sound', () => { services.playSound(); return true; });
ipcMain.handle('notebook:window', (_event, action) => {
  if (action === 'maximize') return toggleHeight();
  if (action === 'state') return windowState();
  throw new Error('Ação de janela inválida.');
});
ipcMain.on('notebook:note-commands', (event, commands) => {
  if (!win || event.sender !== win.webContents) return;
  const next = availableCommands(commands);
  if (next.join() === noteCommands.join()) return;
  noteCommands = next; buildMenu();
});
// The renderer knows where the paper starts; native traffic lights sit on it.
ipcMain.on('notebook:window-buttons', (event, position) => {
  if (!win || win.isDestroyed() || event.sender !== win.webContents || process.platform !== 'darwin') return;
  const { x, y } = position || {};
  if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 400)) return;
  win.setWindowButtonPosition({ x, y });
});
ipcMain.on('notebook:resize', (event, phase, input = {}) => {
  if (!win || event.sender !== win.webContents) return;
  if (phase === 'end') { resizeSession = null; return; }
  // Same as moving: renderer screen coordinates drift when the n/w edges move the window.
  const cursor = services.cursor();
  if (phase === 'start') {
    if (!['n','s','e','w','ne','nw','se','sw'].includes(input.edge)) return;
    resizeSession = { edge: input.edge, x: cursor.x, y: cursor.y, bounds: win.getBounds() }; return;
  }
  if (phase !== 'move' || !resizeSession) return;
  const { edge, x, y, bounds } = resizeSession;
  const dx = cursor.x - x, dy = cursor.y - y;
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
  if (phase === 'start') { moveSession = { origin: services.cursor(), bounds: win.getBounds() }; return; }
  if (phase !== 'move' || !moveSession) return;
  const position = movePosition(moveSession.bounds, moveSession.origin, services.cursor());
  if (!position) { moveSession = null; return; }
  win.setPosition(position.x, position.y);
});
// Surface for external harnesses (test runner, screenshot scripts); production never loads them.
module.exports = { testHook: {
  ready,
  configure: overrides => Object.assign(services, overrides),
  context: () => ({ win, store, media, related }),
  dispatchHistory,
  setObservedDay: day => { observedDay = day; },
} };
