// Capture the real renderer with fictional data in an isolated temporary database.
const {app,BrowserWindow,ipcMain,nativeImage,protocol,net}=require('electron');
const {pathToFileURL}=require('node:url');
const {MediaStore}=require('../media.cjs');
const {RelatedService}=require('../related-service.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'caderno-media',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../store.cjs');
const doc=require('../editor-document.js');
const root=path.resolve(__dirname,'..');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'caderninho-readme-'));
app.setPath('userData',directory);
let store,win,media,related;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  store=new Store(directory,{now:()=>new Date('2026-10-01T13:00:00-03:00').getTime()});
  store.db.prepare('DELETE FROM notes').run();
  media=new MediaStore(store,nativeImage);
  protocol.handle('caderno-media',request=>{const url=new URL(request.url),file=media.file(url.pathname.slice(1));return file?net.fetch(pathToFileURL(file).href):new Response('',{status:404});});
  const command=(name,input={})=>store.dispatch(name,input);
  command('notebook:update',{id:'default-notebook',name:'Pessoal',description:'Ideias e planos para o dia a dia.',color:'#eacb8f'});
  command('notebook:create',{name:'Trabalho',description:'Projetos, reuniões e próximos passos.',color:'#b9cfd7'});
  command('notebook:create',{name:'Estudos',description:'Aprendizados que merecem uma página.',color:'#c5d3ae'});
  const book='default-notebook';command('notebook:select',{id:book});
  const create=(type,title,body='')=>{const state=command('note:create',{type,title,notebookId:book}),id=state.selected[type];if(body)command('note:update',{id,body});return id;};
  const block=(type,text,marks={})=>({id:doc.id(),type,runs:[{text,marks}]});
  const note=create('notes','Ideias para uma semana mais leve');
  command('note:update',{id:note,editorDoc:[
    block('paragraph','Menos coisas ao mesmo tempo. Mais espaço para o que importa.'),
    block('h2','O que quero fazer diferente'),
    block('bullet','Começar a manhã sem olhar as notificações.'),
    block('bullet','Reservar um tempo para ler, caminhar e criar.'),
    block('quote','Uma boa ideia merece um lugar para ficar.'),
    block('h2','Pequenos planos'),
    {id:doc.id(),type:'table',header:true,rows:[['Quando','Plano'].map(doc.plainRuns),['Manhã','Escrever por 15 minutos'].map(doc.plainRuns),['Fim do dia','Caminhar sem pressa'].map(doc.plainRuns)]}
  ]});
  command('category:attach',{noteId:note,name:'ideias'});command('category:attach',{noteId:note,name:'pessoal'});
  create('notes','Livros para a próxima leitura','Guardar aqui os títulos que surgirem nas conversas.');
  create('notes','Uma ideia para o fim de semana','Visitar a feira, comprar flores e preparar um almoço com calma.');
  const tasks=create('tasks','Uma semana mais leve');command('category:attach',{noteId:tasks,name:'rotina'});
  for(const [title,done] of [['Organizar a mesa de trabalho',true],['Separar os livros para doação',true],['Agendar a consulta de rotina',false]]){
    const snapshot=command('item:create',{noteId:tasks,title}),item=snapshot.notes.find(n=>n.id===tasks).items.at(-1);if(done)command('item:toggle',{id:item.id});
  }
  for(const [day,hour,title] of [[1,14,'Revisar o planejamento'],[1,18,'Pausa para caminhar'],[3,10,'Café com a Ana'],[7,15,'Consulta de rotina'],[15,9,'Revisar as metas do mês'],[22,16,'Separar os documentos']]){
    const id=create('reminders',title,'Um lembrete para cuidar do que importa.');command('schedule:activate',{id,due:`2026-10-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00-03:00`});
  }
  command('day:update',{day:'2026-10-01',body:'Hoje, quero terminar o essencial e deixar espaço para uma boa ideia.\n\nUma coisa de cada vez também é progresso.'});
  command('view:select',{view:'home'});
  related=new RelatedService(store,media,{onUpdate:()=>{if(win&&!win.isDestroyed())win.webContents.send('related:updated');}});
  related.cacheDir=path.join(root,'artifacts','embedding-cache');
  ipcMain.handle('related:query',(_event,id)=>related.query(id));
  ipcMain.handle('related:retry',()=>related.run());
  await related.run();
  if(related.status!=='ready')throw new Error(related.error||'Related indexing failed');
  ipcMain.handle('notebook:state',()=>store.snapshot());
  ipcMain.handle('notebook:action',(_event,name,input)=>command(name,input));
  ipcMain.handle('notebook:window',()=>null);
  win=new BrowserWindow({width:1080,height:900,frame:false,transparent:true,backgroundColor:'#00000000',show:false,webPreferences:{preload:path.join(root,'preload.cjs'),contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  await win.loadFile(path.join(root,'index.html'));await pause(900);
  const capture=async(name,code,outputDirectory=path.join(root,'docs','images'))=>{
    if(code)await win.webContents.executeJavaScript(code);
    await pause(500);
    await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const errors=await win.webContents.executeJavaScript('window.smokeErrors');if(errors.length)throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(outputDirectory,name),(await win.webContents.capturePage()).resize({width:1440}).toPNG());
  };
  if(!process.argv.includes('--features-only')&&!process.argv.includes('--readme-focus')) {
  win.setSize(1080,1100);
  await capture('pagina-do-dia.png',"(async()=>{state=await window.notebook.state();view='home';render();})()");
  win.setSize(1080,900);
  await capture('editor.png',`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(note)}});view='notes';render();})()`);
  await capture('tarefas.png',`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(tasks)}});view='tasks';render();})()`);
  win.setSize(1080,1100);
  await capture('calendario.png',"(async()=>{state=await window.notebook.action('view:select',{view:'reminders'});view='reminders';reminderEditor=false;calendarMonth=new Date('2026-10-01T12:00:00');calendarDay='2026-10-01';render();})()");
  }
  win.setSize(1080,1000);
  const project=create('notes','Um espaço para criar');
  const first=block('paragraph','Quero um canto para desenhar, ler e começar os projetos que ficam esperando.');
  const next=block('paragraph','Pedir orçamento da bancada e escolher uma luminária.');
  const last=block('paragraph','Revisar as referências hoje, com calma.');
  command('note:update',{id:project,editorDoc:[first,block('h2','Tirar a ideia do papel'),next,last,block('paragraph','A luminária já está escolhida. Falta comparar os orçamentos e decidir onde a bancada vai ficar.')]});
  command('category:attach',{noteId:project,name:'projeto'});
  const linkAction=(source,quote,title,kind,due)=>command('source:create',{noteId:project,title,kind,due,origin:{kind:'text',quote,parts:[{blockId:source.id,start:source.runs[0].text.indexOf(quote),end:source.runs[0].text.indexOf(quote)+quote.length}]}});
  linkAction(next,'Pedir orçamento da bancada','Pedir dois orçamentos','task');
  const completed=linkAction(next,'escolher uma luminária','Escolher a luminária','task').sourceActions.at(-1);command('source:toggle',{id:completed.id});
  linkAction(last,'Revisar as referências','Revisar as referências','reminder','2026-10-01T16:00:00-03:00');
  await capture('acoes-na-nota.png',`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(project)}});view='notes';render();getSelection().removeAllRanges();hideEditorMenus();})()`);
  win.setSize(1080,950);
  // A locally authored SVG illustration supplies reproducible image media.
  const art=new BrowserWindow({width:720,height:460,frame:false,show:false,webPreferences:{contextIsolation:true,sandbox:true}});
  const svg=fs.readFileSync(path.join(root,'docs','demo','serra.svg'),'utf8');
  await art.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<style>html,body{margin:0;width:100%;height:100%}svg{width:100%;height:100%;display:block}</style>'+svg));await pause(150);
  const blobId=media.image((await art.webContents.capturePage()).toPNG());art.destroy();
  const collage=create('notes','Um fim de semana na serra');
  command('note:update',{id:collage,editorDoc:[block('paragraph','Um lugar para respirar, caminhar e voltar com boas histórias.'),block('paragraph','Guardar as paisagens que quero conhecer. A viagem começa pelas referências.'),block('paragraph',''),block('h2','Levar na mochila'),block('bullet','Água, uma câmera e um caderno.'),block('bullet','Uma manhã livre para explorar.'),block('paragraph','Escolher uma trilha curta, sair cedo e fazer uma pausa no mirante.'),block('paragraph','Deixar o roteiro por perto. O resto pode ser descoberta.')]});
  command('category:attach',{noteId:collage,name:'viagem'});
  let shot=command('cut:create',{noteId:collage,kind:'image',blobId,title:'Paisagens para o fim de semana'});let cut=shot.notes.find(n=>n.id===collage).cuts.at(-1);command('cut:layout',{id:cut.id,side:'right',anchor:1,width:.36});
  shot=command('cut:create',{noteId:collage,kind:'link',url:'https://example.org/trilhas',title:'Caminhos na serra'});cut=shot.notes.find(n=>n.id===collage).cuts.at(-1);command('cut:preview',{id:cut.id,title:'Caminhos na serra',description:'Trilhas curtas, mirantes e boas pausas pelo caminho. Uma referência para o nosso roteiro.',status:'ready'});command('cut:layout',{id:cut.id,side:'left',anchor:6,width:.40});
  const itinerary=create('tasks','Preparar a viagem à serra','Planejar o fim de semana na serra: caminhada, mirantes e uma trilha curta.');
  command('category:attach',{noteId:itinerary,name:'viagem'});
  for(const title of ['Escolher a trilha e conferir a previsão do tempo','Separar água, câmera e mochila'])command('item:create',{noteId:itinerary,title});
  const trails=create('notes','Trilhas e mirantes','Referências para o fim de semana na serra. Uma caminhada curta pela manhã, pausa no mirante e paisagens para fotografar.');
  command('category:attach',{noteId:trails,name:'viagem'});
  const travelReminder=create('reminders','Conferir o tempo na serra','Antes da viagem, conferir a previsão para escolher uma trilha segura e preparar a mochila.');
  command('category:attach',{noteId:travelReminder,name:'viagem'});
  command('schedule:activate',{id:travelReminder,due:'2026-10-02T18:00:00-03:00'});
  await related.run();
  if(related.query(collage).results.length<3)throw new Error('Expected related fictional travel pages');
  await capture('colagem.png',`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(collage)}});view='notes';render();getSelection().removeAllRanges();hideEditorMenus();await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));})()`);
  win.setSize(1080,900);
  await capture('relacionados.png',"(async()=>{document.querySelector('#related-open').click();await refreshRelated();})()");
  win.setSize(1080,1100);
  command('day:update',{day:'2026-10-01',body:'Hoje escolhi a luminária do meu canto de trabalho.\n\nQuero comparar os orçamentos sem pressa e guardar as referências da viagem. Um projeto de cada vez.'});
  await capture('pagina-do-dia.png',"(async()=>{document.querySelector('#related-dialog').close();state=await window.notebook.action('view:select',{view:'home'});view='home';render();})()");
  if(process.argv.includes('--review-sections')){
    const output=path.join(root,'artifacts');fs.mkdirSync(output,{recursive:true});
    await capture('controles-cadernos.png',"document.querySelector('#related-dialog').close();view='notebooks';render();",output);
    await capture('controles-lixeira.png',"view='archive';render();",output);
  }
  console.log('README screenshots captured with fictional local data.');
  related.close();store.close();win.destroy();fs.rmSync(directory,{recursive:true,force:true});app.quit();
}).catch(error=>{console.error(error);try{related?.close();store?.close();}catch{}fs.rmSync(directory,{recursive:true,force:true});app.exit(1);});
