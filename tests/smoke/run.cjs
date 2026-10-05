// Smoke-test entry: electron tests/smoke/run.cjs [scoped flag]
const { app, shell, nativeImage, clipboard } = require('electron');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { isolateUserData, trackRendererErrors, scriptedCursor, scriptedContextMenu, runInBackground } = require('./sandbox.cjs');
isolateUserData('caderninho-smoke-');
runInBackground();
const installRendererErrors = trackRendererErrors();
const { testHook } = require('../../src/main/main.cjs');
const { Store } = require('../../src/main/store.cjs');
const { runNativeEditorSmoke } = require('./native-editor.cjs');
const ROOT = path.join(__dirname, '..', '..');
let alarmCount = 0;
const contextMenu = scriptedContextMenu();
testHook.configure({
  playSound: () => { alarmCount++; },
  scheduleRelated: () => {},
  notifications: () => false,
  pdfDestination: title => { const directory = path.join(ROOT, 'artifacts', 'pdf'); fs.mkdirSync(directory, { recursive: true }); return { filePath: path.join(directory, title) }; },
  cursor: scriptedCursor(),
  contextMenu,
});
function smokeScript(file){const source=fs.readFileSync(path.join(ROOT,'tests',file),'utf8').trim().replace(/;$/, '');return `Promise.resolve(${source}).catch(error=>{throw new Error(${JSON.stringify(file)}+': '+(error.stack||error.message||String(error)));})`;}
// Diagram blocks end to end: editor, clipboard, SQLite and the text printed in the PDF.
async function runDiagramSmoke(win) {
  const result = await win.webContents.executeJavaScript(smokeScript('diagram-smoke.js'));
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  // Copying uses the real system clipboard: keep the user's content and restore it afterwards.
  const previousClipboard = await clipboard.readText();
  try {
    await clipboard.writeText('');
    const toast = await win.webContents.executeJavaScript("document.querySelector('#note-body .diagram-block [data-diagram-action=copy]').click();document.querySelector('#toast').textContent", true);
    let copied = '';
    for (let attempt = 0; attempt < 20 && !copied.includes('Guardar nota fiscal'); attempt++) { copied = await clipboard.readText(); if (!copied.includes('Guardar nota fiscal')) await new Promise(resolve => setTimeout(resolve, 50)); }
    if (toast !== 'Código do diagrama copiado.' || !copied.includes('Guardar nota fiscal')) throw new Error('Copiar código não levou o diagrama para a área de transferência: ' + toast);
  } finally { await clipboard.writeText(previousClipboard); }
  const reopened = new Store(app.getPath('userData'));
  const saved = reopened.snapshot().notes.find(note => note.id === result.noteId).editorDoc.filter(block => block.type === 'diagram');
  reopened.close();
  if (saved.length !== 2 || !saved[0].code.includes('Guardar nota fiscal')) throw new Error('Diagramas não persistiram no SQLite');
  const reader = path.join(ROOT, 'native', 'caderninho-ocr');
  if (process.platform === 'darwin' && fs.existsSync(reader)) {
    const text = JSON.parse(execFileSync(reader, [result.pdf], { encoding: 'utf8' })).text.replace(/\s+/g, ' ');
    if (!text.replace(/ /g, '').includes('Guardarnotafiscal')) throw new Error('PDF não contém o diagrama desenhado');
    if (!text.includes('Não foi possível desenhar este diagrama')) throw new Error('PDF não explica o diagrama inválido');
    if (!fs.readFileSync(result.pdf).includes('Excalifont')) throw new Error('PDF não embutiu a Excalifont nos diagramas');
  }
  // A drawing that never finishes must not hang the export: it prints as code within the time limit.
  const { buildPDFHTML, createPDF } = require('../../src/main/pdf-export.cjs');
  const stuck = path.join(app.getPath('userData'), 'mermaid-stuck.js');
  fs.writeFileSync(stuck, 'window.mermaid={initialize(){},render(){return new Promise(()=>{});}};');
  const note = { id: 'stuck', type: 'notes', title: 'Diagrama lento', body: '', categories: [], cuts: [], items: [], editorDoc: [{ id: 'd', type: 'diagram', code: 'flowchart TD\n  A[Muito lento] --> B' }] };
  const started = Date.now();
  const buffer = await createPDF(require('electron').WebContentsView, buildPDFHTML(note, { notebooks: [], sourceActions: [] }, { file: () => null }), { mermaidPath: stuck, diagramTimeout: 1500 });
  if (Date.now() - started > 8000) throw new Error('Exportação esperou demais por um diagrama travado');
  if (process.platform === 'darwin' && fs.existsSync(reader)) {
    const file = path.join(app.getPath('userData'), 'stuck.pdf'); fs.writeFileSync(file, buffer);
    const text = JSON.parse(execFileSync(reader, [file], { encoding: 'utf8' })).text;
    if (!text.includes('Não foi possível desenhar este diagrama') || !text.includes('Muito lento')) throw new Error('Diagrama travado não saiu como código no PDF');
  }
  fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts', 'diagrama.png'), (await win.webContents.capturePage()).toPNG());
  console.log('DIAGRAM_SMOKE_OK', JSON.stringify({ noteId: result.noteId, errors: result.errors }));
}
// Right-click in the note body: native menu answers are scripted, the renderer flow is real.
async function runEditorContextMenuSmoke(win) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  contextMenu.calls.length = 0;
  contextMenu.answers = ['task', 'reminder', null, null, 'task', new Error('Janela indisponível.'), 'task'];
  const result = await win.webContents.executeJavaScript(smokeScript('editor-context-menu-smoke.js'));
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  const enabled = contextMenu.calls.map(items => items.filter(item => item.id).map(item => item.enabled).join());
  if (JSON.stringify(enabled) !== JSON.stringify(['true,true', 'true,true', 'true,true', 'false,false', 'true,true', 'true,true', 'true,true'])) throw new Error('Menu de contexto: chamadas inesperadas ' + JSON.stringify(enabled));
  // A real right-click from the input pipeline reaches the same menu.
  contextMenu.answers = ['task'];
  const point = await win.webContents.executeJavaScript("(()=>{const span=document.querySelector('[data-block-id=\"menu-one\"] .line-text'),a=editorTextPoint(span,26),b=editorTextPoint(span,47);getSelection().setBaseAndExtent(a.node,a.offset,b.node,b.offset);const rect=getSelection().getRangeAt(0).getBoundingClientRect();return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};})()");
  win.webContents.sendInputEvent({ type: 'mouseDown', x: point.x, y: point.y, button: 'right', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: point.x, y: point.y, button: 'right', clickCount: 1 });
  await wait(300);
  const native = await win.webContents.executeJavaScript("({form:Boolean(document.querySelector('#source-form')),quote:document.querySelector('#source-form blockquote')?.textContent})");
  if (contextMenu.calls.length !== 8 || !native.form || native.quote !== 'pedir dois orçamentos') throw new Error('Clique direito nativo não abriu o formulário: ' + JSON.stringify({ calls: contextMenu.calls.length, native }));
  await win.webContents.executeJavaScript("closeSourceComposer()");
  console.log('EDITOR_CONTEXT_MENU_SMOKE_OK', JSON.stringify(result));
}
async function runPagesSmoke(win) {
  const result = await win.webContents.executeJavaScript(smokeScript('pages-smoke.js'));
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  console.log('PAGES_SMOKE_OK');
}
// Native Mac shell: menu commands, enablement per view and traffic lights that follow the book.
async function runMacShellSmoke(win) {
  const { Menu } = require('electron');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const noteItems = () => Menu.getApplicationMenu().items.find(item => item.label === 'Nota').submenu.items.filter(item => item.type !== 'separator');
  const enabled = () => Object.fromEntries(noteItems().map(item => [item.label, item.enabled]));
  const run = script => win.webContents.executeJavaScript(script);
  const result = await run(smokeScript('mac-shell-smoke.js'));
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  if (JSON.stringify(enabled()) !== JSON.stringify({ 'Nova nota': true, 'Adicionar mídia': false, 'Relacionados': false, 'Exportar PDF': false, 'Mover para a lixeira': false })) throw new Error('Menu Nota na home: ' + JSON.stringify(enabled()));
  await run("(async()=>{state=await window.notebook.action('view:select',{view:'notes'});view='notes';render();})()"); await wait(50);
  if (Object.values(enabled()).some(value => !value)) throw new Error('Menu Nota nas notas: ' + JSON.stringify(enabled()));
  noteItems().find(item => item.label === 'Adicionar mídia').click(); await wait(100);
  if (!await run("document.querySelector('#cut-dialog').open")) throw new Error('Nota > Adicionar mídia não abriu o diálogo');
  await run("document.querySelector('#cut-dialog').close()");
  const startedCollapsed = await run('Boolean(state.sidebarCollapsed)');
  if (startedCollapsed) { await run("document.querySelector('#sidebar-toggle').click()"); await wait(400); }
  const expanded = win.getWindowButtonPosition();
  await run("document.querySelector('#sidebar-toggle').click()"); await wait(400);
  const collapsed = win.getWindowButtonPosition();
  await run("document.querySelector('#sidebar-toggle').click()"); await wait(400);
  if (startedCollapsed) { await run("document.querySelector('#sidebar-toggle').click()"); await wait(400); }
  if (!expanded || !collapsed || collapsed.x >= expanded.x || (startedCollapsed ? win.getWindowButtonPosition().x !== collapsed.x : win.getWindowButtonPosition().x !== expanded.x)) throw new Error('Semáforos não acompanham o livro: ' + JSON.stringify({ expanded, collapsed }));
  fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts', 'mac-shell.png'), (await win.webContents.capturePage()).toPNG());
  console.log('MAC_SHELL_SMOKE_OK', JSON.stringify({ expanded, collapsed }));
}
async function runSmoke() {
  const { win, store, media, related } = testHook.context();
  try {
    await installRendererErrors(win.webContents);
    if(process.argv.includes('--source-only')) {fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(ROOT,'assets','icon.png'))])}`);const result=await win.webContents.executeJavaScript(smokeScript('source-actions-smoke.js'));console.log('SOURCE_ACTIONS_SMOKE_OK',JSON.stringify(result));fs.writeFileSync(path.join(ROOT,'artifacts','source-actions.png'),(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript('openSourceComposer(actionsForNote()[0].origin)');await new Promise(resolve=>setTimeout(resolve,250));fs.writeFileSync(path.join(ROOT,'artifacts','source-action-composer.png'),(await win.webContents.capturePage()).toPNG());await runEditorContextMenuSmoke(win);app.quit();return;}
    if(process.argv.includes('--related-runtime-only')) {
      related.cacheDir=path.join(process.cwd(),'artifacts','embedding-cache');
      store.dispatch('note:update',{id:'welcome',title:'Custos de nuvem',body:'Reduzir os gastos com infraestrutura e serviços de nuvem.'});
      const next=store.dispatch('note:create',{type:'notes',title:'Cloud cost optimization'});const target=next.selected.notes;
      store.dispatch('note:update',{id:target,body:'Optimize cloud infrastructure costs and reduce spending.'});
      await related.run();if(related.status!=='ready')throw Error(related.error);
      if(!related.query('welcome').results.some(d=>d.noteId===target))throw Error('Modelo local não encontrou conexão entre idiomas.');
      if(process.platform==='darwin'){
        const file=path.join(store.directory,'ocr-probe.png');fs.writeFileSync(file,fs.readFileSync(path.join(ROOT,'docs','images','acoes-na-nota.png')));
        const text=await related.job({kind:'ocr',file});if(!text.includes('Próximos passos'))throw Error('OCR do pacote não leu o texto esperado.');
      }
      console.log('RELATED_RUNTIME_OK');app.quit();return;
    }
    if(process.argv.includes('--pages-only')){await runPagesSmoke(win);app.quit();return;}
    if(process.argv.includes('--mac-shell-only')){await runMacShellSmoke(win);app.quit();return;}
    if(process.argv.includes('--diagram-only')){await runDiagramSmoke(win);app.quit();return;}
    if(process.argv.includes('--native-only')){await runNativeEditorSmoke(win);app.quit();return;}
    if(process.argv.includes('--editor-only')) {
      await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(ROOT,'assets','icon.png'))])}`);
      const result=await win.webContents.executeJavaScript(smokeScript('editor-smoke.js'));
      if(result.errors.length)throw new Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});fs.writeFileSync(path.join(ROOT,'artifacts','editor-tabela.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("openInsertMenu([...document.querySelectorAll('.writing-line')].at(-1));");
      await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      fs.writeFileSync(path.join(ROOT,'artifacts','paleta-blocos.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("const search=document.querySelector('#block-menu input');search.value='tit';search.dispatchEvent(new Event('input',{bubbles:true}));");
      await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      fs.writeFileSync(path.join(ROOT,'artifacts','paleta-busca.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("openInsertMenu([...document.querySelectorAll('.writing-line')].at(-1));document.querySelector('[data-insert-block=table]').click();document.querySelectorAll('.table-picker button')[19].dispatchEvent(new PointerEvent('pointerenter'));");
      fs.writeFileSync(path.join(ROOT,'artifacts','seletor-tabela.png'),(await win.webContents.capturePage()).toPNG());
      await runNativeEditorSmoke(win);
      const selectionResult=await win.webContents.executeJavaScript(smokeScript('selection-smoke.js'));
      console.log('SELECTION_SMOKE_OK',JSON.stringify(selectionResult));
      console.log('EDITOR_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--search-only')) {
      const result=await win.webContents.executeJavaScript(smokeScript('search-smoke.js'));
      console.log('SEARCH_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--home-preview-only')) {
      media.fetch=async url=>({bytes:Buffer.from('<meta property="og:title" content="Referência">'),type:'text/html',url});
      await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(ROOT,'assets','icon.png'))])}`);
      const result=await win.webContents.executeJavaScript(smokeScript('home-preview-smoke.js'));
      if(result.errors.length)throw Error(result.errors.join('\n'));
      console.log('HOME_PREVIEW_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--related-only')) {
      await win.webContents.executeJavaScript(smokeScript('related-smoke.js'));
      const docs=require('../../src/main/related-engine.cjs').documents(store.snapshot());
      for(const d of docs)store.db.prepare('INSERT OR REPLACE INTO related_vectors VALUES(?,?,?,?)').run(d.id,d.hash,require('../../src/main/related-config.cjs').version,JSON.stringify([1,0]));
      related.status='ready';
      const result=await win.webContents.executeJavaScript('verifyRelatedSmoke()');
      if(result.errors.length)throw Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});fs.writeFileSync(path.join(ROOT,'artifacts','relacionados.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript("$('#related-dialog').close();state.activeView='home';view='home';render();");
      for(const [width,height] of [[1080,900],[1080,560],[800,560],[640,560]]){
        win.setSize(width,height);await new Promise(resolve=>setTimeout(resolve,160));
        const geometry=await win.webContents.executeJavaScript(`(async()=>{await refreshHomeRelated();const host=$('#home-related-content');const fixture=[.95,.8,.65,.5].map((score,i)=>({id:'size-'+i,score,title:'Nota relacionada '+i,type:'notes'}));renderRelatedGraph(latestHomeNote(),{results:fixture,status:'ready'},host,{openCenter:true});const r=host.querySelector('.related-graph').getBoundingClientRect(),svg=host.querySelector('.related-edges').getBoundingClientRect(),nodes=[...host.querySelectorAll('.related-node .small-icon,.related-node span,.related-node strong')].map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});const note=$('.home-latest').getBoundingClientRect();return {width:innerWidth,height:innerHeight,graph:[r.width,r.height],svg:[svg.width,svg.height],nodes,sideBySide:r.left>=note.right&&r.top<=note.top+20}})()`);
        console.log('HOME_GRAPH_SIZE',JSON.stringify({window:[geometry.width,geometry.height],graph:geometry.graph}));
        if(Math.abs(geometry.graph[0]-geometry.graph[1])>1||geometry.graph[0]<100)throw Error('Grafo da home foi comprimido');
        if(!geometry.sideBySide)throw Error('Grafo deixou de ficar ao lado da nota');
        for(let i=0;i<geometry.nodes.length;i++)for(let j=i+1;j<geometry.nodes.length;j++){const a=geometry.nodes[i],b=geometry.nodes[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)throw Error('Nós do grafo da home se sobrepõem');}
      }
      console.log('RELATED_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--notebooks-only')) {
      const result=await win.webContents.executeJavaScript(smokeScript('notebook-smoke.js'));
      if(result.errors.length) throw new Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true}); fs.writeFileSync(path.join(ROOT,'artifacts','cadernos.png'),(await win.webContents.capturePage()).toPNG());
      console.log('NOTEBOOK_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--pdf-cuts-only')) {
      const bytes = require('../pdf-fixture.cjs')();
      await win.webContents.executeJavaScript(`window.pdfTestBytes = ${JSON.stringify([...bytes])}`);
      let opened;
      const originalOpen = shell.openPath;
      shell.openPath = async file => { opened = file; return ''; };
      try {
        const result = await win.webContents.executeJavaScript(smokeScript('pdf-cuts-smoke.js'));
        if (!opened || !fs.readFileSync(opened).equals(bytes)) throw new Error('PDF local não abriu corretamente');
        if (result.errors.length) throw new Error(result.errors.join('\n'));
        fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});
        await new Promise(resolve => setTimeout(resolve, 500));
        fs.writeFileSync(path.join(ROOT,'artifacts','pdf-colagem.png'),(await win.webContents.capturePage()).toPNG());
        console.log('PDF_CUTS_SMOKE_OK',JSON.stringify(result));
      } finally { shell.openPath = originalOpen; }
      app.quit(); return;
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
      fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});fs.writeFileSync(path.join(ROOT,'artifacts','categorias-autocomplete.png'),(await win.webContents.capturePage()).toPNG());
      console.log('CATEGORY_AUTOCOMPLETE_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    if(process.argv.includes('--categories-only')) {
      await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(ROOT,'assets','icon.png'))])}`);
      const result=await win.webContents.executeJavaScript(smokeScript('category-smoke.js'));
      if(result.errors.length) throw new Error(result.errors.join('\n'));
      fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});
      fs.writeFileSync(path.join(ROOT,'artifacts','categorias.png'),(await win.webContents.capturePage()).toPNG());
      console.log('CATEGORY_SMOKE_OK',JSON.stringify(result));app.quit();return;
    }
    const result = await win.webContents.executeJavaScript(smokeScript('app-smoke.js'));
    if (result.errors.length) throw new Error(result.errors.join('\n'));
    const reopened = new Store(app.getPath('userData'));
    if (!reopened.snapshot().notes.some(n => n.body.includes('Salvamento verificado'))) throw new Error('Nota não persistiu no SQLite');
    reopened.close();
    if (alarmCount !== 2) throw new Error('O alerta sonoro não foi acionado corretamente.');
    fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
    await new Promise(resolve => setTimeout(resolve, 300));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'caderninho-sqlite.png'), (await win.webContents.capturePage()).toPNG());
    for (const [view, file] of [['tasks', 'tarefas-sqlite.png'], ['reminders', 'lembretes-sqlite.png'], ['archive', 'lixeira-sqlite.png']]) {
      await win.webContents.executeJavaScript(`document.querySelector('[data-view="${view}"]').click()`);
      await new Promise(resolve => setTimeout(resolve, 250));
      fs.writeFileSync(path.join(ROOT, 'artifacts', file), (await win.webContents.capturePage()).toPNG());
    }
    await win.webContents.executeJavaScript("toast('Alerta sonoro agendado.');");
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'aviso-sucesso.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript("document.querySelector('#toast').hidden = true; document.querySelector('#sidebar-toggle').click();");
    await new Promise(resolve => setTimeout(resolve, 350));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'menu-recolhido.png'), (await win.webContents.capturePage()).toPNG());
    const bytes = fs.readFileSync(path.join(ROOT, 'assets', 'icon.png'));
    media.fetch = async url => { await new Promise(resolve => setTimeout(resolve, 50)); return url.endsWith('.png') ? { bytes, type: 'image/png', url } : { bytes: Buffer.from('<meta property="og:title" content="Uma ideia em papel"><meta property="og:description" content="Uma prévia guardada pelas metatags, mesmo sem internet."><meta property="og:image" content="/cover.png">'), type: 'text/html', url }; };
    await win.webContents.executeJavaScript(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(ROOT, 'assets', 'icon.png'))])}`);
    const cuts = await win.webContents.executeJavaScript(smokeScript('cuts-smoke.js'));
    if (cuts.errors.length) throw new Error(cuts.errors.join('\n'));
    const cutStore = new Store(app.getPath('userData'));
    if (cutStore.snapshot().notes.find(note => note.id === cuts.noteId).cuts.length !== 2) throw new Error('Recortes não persistiram');
    if (cutStore.db.prepare('SELECT count(*) AS total FROM media_blobs').get().total !== 1) throw new Error('Imagens idênticas não foram deduplicadas');
    cutStore.close();
    await win.webContents.executeJavaScript("document.querySelector('#toast').hidden = true");
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'recortes.png'), (await win.webContents.capturePage()).toPNG());
    const margin = await win.webContents.executeJavaScript(smokeScript('margin-smoke.js'));
    if (margin.errors.length || alarmCount !== 3) throw new Error('Falha na margem inteligente: ' + margin.errors.join('\n'));
    const marginStore = new Store(app.getPath('userData'));
    const inlineNote = marginStore.snapshot().notes.find(note => note.id === margin.noteId);
    if (!inlineNote.enabled || !inlineNote.body.includes('[x]')) throw new Error('Margem não persistiu no SQLite');
    marginStore.close();
    await new Promise(resolve => setTimeout(resolve, 150));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'margem-inteligente.png'), (await win.webContents.capturePage()).toPNG());
    const undo = await win.webContents.executeJavaScript(smokeScript('undo-smoke.js'));
    if (undo.errors.length) throw new Error(undo.errors.join('\n'));
    await win.webContents.executeJavaScript("(async () => { window.menuHistoryReceipt=0; window.notebook.onHistory(() => window.menuHistoryReceipt++); putCaret(document.querySelector('.line-text')); document.execCommand('insertText', false, 'Menu undo '); while(pending) await new Promise(resolve=>setTimeout(resolve,20)); if(!document.querySelector('#note-body').value.includes('Menu undo ')) throw new Error('Texto do teste de menu não foi inserido'); })()");
    testHook.dispatchHistory('undo', win);
    await win.webContents.executeJavaScript("(async () => { const deadline=Date.now()+3000; while(window.menuHistoryReceipt<1 && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20)); if(window.menuHistoryReceipt<1) throw new Error('Menu Desfazer não foi recebido'); await undoQueue; })()");
    if (await win.webContents.executeJavaScript("document.querySelector('#note-body').value.includes('Menu undo ')") ) throw new Error('Menu Desfazer não funcionou');
    testHook.dispatchHistory('redo', win);
    await win.webContents.executeJavaScript("(async () => { const deadline=Date.now()+3000; while(window.menuHistoryReceipt<2 && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20)); if(window.menuHistoryReceipt<2) throw new Error('Menu Refazer não foi recebido'); await undoQueue; })()");
    if (!await win.webContents.executeJavaScript("document.querySelector('#note-body').value.includes('Menu undo ')") ) throw new Error('Menu Refazer não funcionou: '+await win.webContents.executeJavaScript("JSON.stringify({body:$('#note-body').value,active:document.activeElement.outerHTML.slice(0,400),history:pageHistories.get(currentNote().id),errors:window.smokeErrors})"));
    const calendar = await win.webContents.executeJavaScript(smokeScript('calendar-smoke.js'));
    if (calendar.errors.length) throw new Error(calendar.errors.join('\n'));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'calendario-lembretes.png'), (await win.webContents.capturePage()).toPNG());
    const categories = await win.webContents.executeJavaScript(smokeScript('category-smoke.js'));
    if (categories.errors.length) throw new Error(categories.errors.join('\n'));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'categorias.png'), (await win.webContents.capturePage()).toPNG());
    const home = await win.webContents.executeJavaScript(smokeScript('home-smoke.js'));
    if (home.errors.length) throw new Error(home.errors.join('\n'));
    const homeStore = new Store(app.getPath('userData'));
    if (!homeStore.snapshot().daily.overview.tasks.find(task=>task.id===home.taskId)?.done) throw new Error('Conclusão na home não persistiu');
    homeStore.close();
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'pagina-do-dia.png'), (await win.webContents.capturePage()).toPNG());
    const actualNow=store.now;
    store.now=()=>actualNow()+24*60*60*1000;
    store.dispatch('view:select',{view:'home'}); testHook.setObservedDay(store.dayKey());
    await win.webContents.executeJavaScript("(async () => { state = await window.notebook.state(); view = 'home'; render(); })()");
    await win.webContents.executeJavaScript(`document.querySelector('#daily-select').value=${JSON.stringify(home.day)};document.querySelector('#daily-select').dispatchEvent(new Event('change'));`);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!await win.webContents.executeJavaScript(`state.daily.day===${JSON.stringify(home.day)}&&!document.querySelector('#daily-body')&&!document.querySelector('.home-connections')&&[...document.querySelectorAll('[data-home-task]')].every(input=>input.disabled)`)) throw new Error('Página anterior não foi preservada para consulta');
    fs.writeFileSync(path.join(ROOT, 'artifacts', 'pagina-anterior.png'), (await win.webContents.capturePage()).toPNG());
    store.now=actualNow; testHook.setObservedDay(store.dayKey());
    const notebooks=await win.webContents.executeJavaScript(smokeScript('notebook-smoke.js'));
    if(notebooks.errors.length) throw new Error(notebooks.errors.join('\n'));
    fs.writeFileSync(path.join(ROOT,'artifacts','cadernos.png'),(await win.webContents.capturePage()).toPNG());
    const editorResult=await win.webContents.executeJavaScript(smokeScript('editor-smoke.js'));
    if(editorResult.errors.length)throw new Error(editorResult.errors.join('\n'));
    fs.writeFileSync(path.join(ROOT,'artifacts','editor-tabela.png'),(await win.webContents.capturePage()).toPNG());
    await runDiagramSmoke(win);
    await runMacShellSmoke(win);
    await runPagesSmoke(win);
    console.log('SOURCE_ACTIONS_SMOKE_OK',JSON.stringify(await win.webContents.executeJavaScript(smokeScript('source-actions-smoke.js'))));
    await runEditorContextMenuSmoke(win);
    console.log('EDITOR_SMOKE_OK',JSON.stringify(editorResult));
    await runNativeEditorSmoke(win);
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
testHook.ready.then(runSmoke);
