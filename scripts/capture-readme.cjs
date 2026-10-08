// Capture the real renderer with fictional data in an isolated temporary database.
// Flags: --features-only (note actions, collage, related, home, diagram), --pipelines-only (note actions, kanban, task, board, home),
// --lexical-related (rank related pages by categories and words only, for machines that cannot download the model).
const {app,BrowserWindow,ipcMain,nativeImage,protocol,net}=require('electron');
const {pathToFileURL}=require('node:url');
const {MediaStore}=require('../src/main/media.cjs');
const {RelatedService}=require('../src/main/related-service.cjs');
const {documents,rank}=require('../src/main/related-engine.cjs');
const relatedConfig=require('../src/main/related-config.cjs');
const {createPipelineUseCases}=require('../src/main/pipelines/compose.cjs');
const {registerPipelines}=require('../src/main/pipelines/presentation/ipc.cjs');
const {SCHEME:PIPELINE_SCHEME,pipelineProtocolHandler}=require('../src/main/pipelines/presentation/protocol.cjs');
const {createBoardUseCases}=require('../src/main/boards/compose.cjs');
const {registerBoards}=require('../src/main/boards/presentation/ipc.cjs');
const {registerFontProtocol,SCHEME:FONT_SCHEME}=require('../src/main/system-fonts.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'caderno-media',privileges:{standard:true,secure:true,supportFetchAPI:true}},{scheme:PIPELINE_SCHEME,privileges:{standard:true,secure:true,supportFetchAPI:true}},{scheme:FONT_SCHEME,privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const fs=require('node:fs');
const path=require('node:path');
const {Store}=require('../src/main/store.cjs');
const doc=require('../src/shared/editor-document.js');
const root=path.resolve(__dirname,'..');
const {isolateUserData,trackRendererErrors}=require('../tests/smoke/sandbox.cjs');
const directory=isolateUserData('caderninho-readme-');
const installRendererErrors=trackRendererErrors();
const flag=name=>process.argv.includes(name);
let store,win,media,related;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  store=new Store(directory,{now:()=>new Date('2026-10-01T13:00:00-03:00').getTime()});
  store.db.prepare('DELETE FROM notes').run();
  media=new MediaStore(store,nativeImage);
  const pipelines=createPipelineUseCases({store});
  const boards=createBoardUseCases({store,media,events:{boardSaved:()=>{},boardImageAttached:()=>{}},exportTarget:()=>null});
  protocol.handle('caderno-media',request=>{const url=new URL(request.url),file=media.file(url.pathname.slice(1));return file?net.fetch(pathToFileURL(file).href):new Response('',{status:404});});
  protocol.handle(PIPELINE_SCHEME,pipelineProtocolHandler(net,input=>pipelines.imageFile(input)));
  registerFontProtocol(protocol,net);
  const command=(name,input={})=>store.dispatch(name,input);
  const at=time=>{store.now=()=>new Date(time).getTime();};
  command('notebook:update',{id:'default-notebook',name:'Pessoal',description:'Ideias e planos para o dia a dia.',color:'#eacb8f'});
  command('notebook:create',{name:'Trabalho',description:'Projetos, reuniões e próximos passos.',color:'#b9cfd7'});
  command('notebook:create',{name:'Estudos',description:'Aprendizados que merecem uma página.',color:'#c5d3ae'});
  const book='default-notebook';command('notebook:select',{id:book});
  const create=(type,title,body='')=>{const state=command('note:create',{type,title,notebookId:book}),id=state.selected[type];if(body)command('note:update',{id,body});return id;};
  const block=(type,text,marks={})=>({id:doc.id(),type,runs:[{text,marks}]});
  const columnsOf=pipelineId=>store.snapshot().pipelines.find(pipeline=>pipeline.id===pipelineId).columns;
  const column=(pipelineId,name)=>columnsOf(pipelineId).find(item=>item.name===name).id;
  // Tasks are born on top of the first column; moving them records the history shown in the task modal.
  const task=(pipelineId,title,columnName,extra={})=>{const {taskId}=pipelines.createTask({pipelineId,title,...extra});if(columnName&&columnName!=='Backlog')pipelines.moveTask({taskId,columnId:column(pipelineId,columnName),position:0});return taskId;};
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
  for(const [day,hour,title] of [[1,14,'Revisar o planejamento'],[1,18,'Pausa para caminhar'],[3,10,'Café com a Ana'],[7,15,'Consulta de rotina'],[15,9,'Revisar as metas do mês'],[22,16,'Separar os documentos']]){
    const id=create('reminders',title,'Um lembrete para cuidar do que importa.');command('schedule:activate',{id,due:`2026-10-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00-03:00`});
  }
  // The pipeline every task of this notebook goes to; the most recent one is the kanban on the home page.
  at('2026-09-20T09:00:00-03:00');
  const house=create('tasks','Casa e rotina');command('category:attach',{noteId:house,name:'casa'});
  for(const [title,columnName] of [['Organizar a mesa de trabalho','Done'],['Separar os livros para doação','Done'],['Trocar a resistência do chuveiro','Review'],['Agendar a consulta de rotina','Ready to Dev'],['Renovar o seguro do carro','Backlog']])task(house,title,columnName);
  at('2026-10-01T13:00:00-03:00');
  command('view:select',{view:'home'});
  related=new RelatedService(store,media,{onUpdate:()=>{if(win&&!win.isDestroyed())win.webContents.send('related:updated');}});
  related.cacheDir=path.join(root,'artifacts','embedding-cache');
  // Without the model, only categories and words in common count.
  const lexical=flag('--lexical-related');
  const lexicalQuery=id=>{const docs=documents(store.snapshot(),related.ocr()),source=docs.find(d=>d.id==='page:'+id);if(!source)return {status:'ready',results:[]};return {status:'ready',results:rank(source,docs,{},{...relatedConfig,weights:{categories:.6,lexical:.4,semantic:0},threshold:.15})};};
  const indexRelated=async()=>{if(lexical)return;await related.run();if(related.status!=='ready')throw new Error(related.error||'Related indexing failed');};
  ipcMain.handle('related:query',(_event,id)=>lexical?lexicalQuery(id):related.query(id));
  ipcMain.handle('related:retry',()=>indexRelated());
  await indexRelated();
  ipcMain.handle('notebook:state',()=>store.snapshot());
  ipcMain.handle('notebook:action',(_event,name,input)=>command(name,input));
  ipcMain.handle('notebook:window',()=>null);
  registerPipelines(ipcMain,{getWindow:()=>win,state:()=>store.snapshot(),useCases:pipelines});
  registerBoards(ipcMain,{getWindow:()=>win,useCases:boards});
  win=new BrowserWindow({width:1080,height:900,frame:false,transparent:true,backgroundColor:'#00000000',show:false,webPreferences:{preload:path.join(root,'src','main','preload.cjs'),contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  await win.loadFile(path.join(root,'src','renderer','index.html'));await installRendererErrors(win.webContents);await pause(900);
  const capture=async(name,code,outputDirectory=path.join(root,'docs','images'))=>{
    if(code)await win.webContents.executeJavaScript(code);
    await pause(500);
    // A hidden window can keep stale pixels of a region that just stopped changing: repaint everything first.
    win.webContents.invalidate();
    await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const errors=await win.webContents.executeJavaScript('window.smokeErrors');if(errors.length)throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(outputDirectory,name),(await win.webContents.capturePage()).resize({width:1440}).toPNG());
  };
  const open=(id,extra='')=>`(async()=>{document.querySelector('dialog[open]')?.close();const type=${JSON.stringify(store.snapshot().notes.find(note=>note.id===id).type)};await window.notebook.action('view:select',{view:type});state=await window.notebook.action('note:select',{id:${JSON.stringify(id)}});view=type;render();getSelection().removeAllRanges();hideEditorMenus();${extra}})()`;
  const pipelinesOnly=flag('--pipelines-only'),featuresOnly=flag('--features-only');
  if(!featuresOnly&&!pipelinesOnly) {
  win.setSize(1080,900);
  await capture('editor.png',open(note));
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
  const origin=(source,quote)=>({kind:'text',quote,parts:[{blockId:source.id,start:source.runs[0].text.indexOf(quote),end:source.runs[0].text.indexOf(quote)+quote.length}]});
  // The studio pipeline is created after the house one, so it is the kanban the home page shows.
  at('2026-09-24T10:00:00-03:00');
  const studio=create('tasks','Montar o ateliê');command('category:attach',{noteId:studio,name:'projeto'});
  const budget=task(studio,'Pedir dois orçamentos','Doing',{source:{noteId:project,origin:origin(next,'Pedir orçamento da bancada')},owner:'Ana',description:[
    block('paragraph','Duas marcenarias, uma com gaveteiro e outra sem. Levar as medidas da parede.'),
    block('bullet','Bancada de 1,60 m em madeira clara.'),
    block('bullet','Prateleira acima da janela.'),
    {id:doc.id(),type:'table',header:true,rows:[['Marcenaria','Prazo'].map(doc.plainRuns),['Oficina do Bairro','15 dias'].map(doc.plainRuns),['Madeira & Cia','3 semanas'].map(doc.plainRuns)]},
  ]});
  task(studio,'Escolher a luminária','Done',{source:{noteId:project,origin:origin(next,'escolher uma luminária')}});
  for(const [title,columnName] of [['Medir a parede da janela','Done'],['Comprar caixas organizadoras','Review'],['Pintar a parede de verde-claro','Ready to Dev'],['Separar as referências de cor','Backlog'],['Instalar a prateleira','Backlog'],['Escolher a cadeira','Ready to Dev']])task(studio,title,columnName);
  // A sketch of the bench as the task's image, then two comments: one of them edited later.
  const sketch=new BrowserWindow({width:640,height:400,frame:false,show:false,webPreferences:{contextIsolation:true,sandbox:true}});
  await sketch.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<style>html,body{margin:0;width:100%;height:100%;background:#fffaea}svg{width:100%;height:100%;display:block}</style><svg viewBox="0 0 640 400" fill="none" stroke="#303025" stroke-width="3" stroke-linecap="round"><rect x="70" y="150" width="500" height="34" rx="4" fill="#e6d3a8"/><path d="M95 184v150M545 184v150M95 300h450"/><rect x="390" y="196" width="140" height="90" rx="4" fill="#efe0b9"/><path d="M400 226h120M400 256h120"/><circle cx="460" cy="211" r="3" fill="#303025"/><circle cx="460" cy="241" r="3" fill="#303025"/><circle cx="460" cy="271" r="3" fill="#303025"/><path d="M70 110h500" stroke-dasharray="8 8"/><path d="M70 98v24M570 98v24"/><text x="320" y="96" font-family="Georgia,serif" font-size="26" fill="#303025" stroke="none" text-anchor="middle">1,60 m</text></svg>'));await pause(150);
  const sketchPNG=(await sketch.webContents.capturePage()).toPNG();sketch.destroy();
  const image=pipelines.attachImage({taskId:budget,name:'bancada.png',mime:'image/png',dataURL:'data:image/png;base64,'+sketchPNG.toString('base64')});
  at('2026-09-26T18:20:00-03:00');
  pipelines.addComment({taskId:budget,document:[block('paragraph','A Oficina do Bairro pediu uma foto da parede. Segue o esboço com as medidas.'),{id:doc.id(),type:'image',imageId:image.imageId}]});
  at('2026-09-29T09:10:00-03:00');
  const reply=block('paragraph','Madeira & Cia faz sem gaveteiro por um preço menor.');
  pipelines.addComment({taskId:budget,document:[reply]});
  at('2026-09-29T11:45:00-03:00');
  const lastComment=pipelines.openTask({taskId:budget}).comments.at(-1);
  pipelines.editComment({commentId:lastComment.id,document:[block('paragraph','Madeira & Cia faz sem gaveteiro por um preço menor, e entrega em três semanas.')]});
  at('2026-10-01T13:00:00-03:00');
  command('source:create',{noteId:project,title:'Revisar as referências',kind:'reminder',due:'2026-10-01T16:00:00-03:00',origin:origin(last,'Revisar as referências')});
  await capture('acoes-na-nota.png',open(project));
  win.setSize(1400,900);
  await capture('kanban.png',open(studio));
  win.setSize(1080,1000);
  await capture('tarefa.png',open(studio,`openTaskModal(${JSON.stringify(budget)});await new Promise(resolve=>setTimeout(resolve,700));await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));document.activeElement?.blur();`));
  if(!featuresOnly){
  win.setSize(1080,900);
  // A board drawn with post-its, an arrow between them and a hand-written title, all in the app's own palette.
  const board=create('boards','Ideias para o ateliê');command('category:attach',{noteId:board,name:'projeto'});
  const text=(id,x,y,value,size,extra={})=>{const lines=value.split('\n');return {id,type:'text',x,y,width:Math.max(...lines.map(line=>line.length))*size*.56,height:lines.length*size*1.25,text:value,originalText:value,fontSize:size,fontFamily:5,lineHeight:1.25,textAlign:'left',verticalAlign:'top',strokeColor:'#303025',backgroundColor:'transparent',roughness:1,...extra};};
  const postIt=(id,x,y,label,color='#f6d77a')=>[{id,type:'rectangle',x,y,width:200,height:140,backgroundColor:color,fillStyle:'solid',strokeColor:'transparent',strokeWidth:2,strokeStyle:'solid',roughness:0,roundness:null,frameId:'frame',boundElements:[{type:'text',id:id+'-t'}]},text(id+'-t',x+20,y+70-label.split('\n').length*12.5,label,20,{width:160,containerId:id,textAlign:'center',verticalAlign:'middle',frameId:'frame'})];
  const arrow=(id,from,to)=>({id,type:'arrow',x:from[0],y:from[1],width:to[0]-from[0],height:to[1]-from[1],points:[[0,0],[to[0]-from[0],to[1]-from[1]]],strokeColor:'#303025',backgroundColor:'transparent',fillStyle:'solid',roughness:1,strokeWidth:2,strokeStyle:'solid',roundness:{type:2},startBinding:null,endBinding:null,startArrowhead:null,endArrowhead:'arrow',frameId:'frame'});
  const elements=[
    {id:'frame',type:'frame',x:90,y:140,width:960,height:470,name:'Primeira semana',strokeColor:'#bbb',backgroundColor:'transparent',roughness:0},
    text('title',90,50,'Um canto para criar',36),
    ...postIt('p1',130,180,'Luz natural\nde manhã'),
    ...postIt('p2',460,180,'Bancada\nde madeira','#c8d6b0'),
    ...postIt('p3',790,180,'Prateleira acima\nda janela','#bccfd8'),
    ...postIt('p4',460,430,'Cadeira\nconfortável','#f3c6a5'),
    arrow('a1',[342,250],[448,250]),arrow('a2',[672,250],[778,250]),arrow('a3',[560,332],[560,418]),
    {id:'e1',type:'ellipse',x:800,y:440,width:200,height:110,strokeColor:'#c4943a',backgroundColor:'transparent',fillStyle:'solid',roughness:1,strokeWidth:2,strokeStyle:'solid',frameId:'frame',boundElements:[{type:'text',id:'e1-t'}]},text('e1-t',830,482,'Verde-claro?',20,{width:140,containerId:'e1',textAlign:'center',verticalAlign:'middle',frameId:'frame'}),
  ];
  boards.save({noteId:board,baseVersion:boards.open({noteId:board}).version,scene:{elements,viewport:{scrollX:60,scrollY:30,zoom:.68}}});
  await capture('quadro.png',open(board,"await new Promise(resolve=>{const end=Date.now()+8000;(function wait(){if(document.querySelector('.board-canvas .excalidraw__canvas')||Date.now()>end)setTimeout(resolve,1500);else setTimeout(wait,80);})();});"));
  }
  if(!pipelinesOnly){
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
  at('2026-09-10T08:00:00-03:00');
  const itinerary=create('tasks','Preparar a viagem à serra');
  command('category:attach',{noteId:itinerary,name:'viagem'});
  for(const title of ['Escolher a trilha e conferir a previsão do tempo','Separar água, câmera e mochila'])task(itinerary,title,'Backlog',{description:[block('paragraph','Planejar o fim de semana na serra: caminhada, mirantes e uma trilha curta.')]});
  at('2026-10-01T13:00:00-03:00');
  const trails=create('notes','Trilhas e mirantes','Referências para o fim de semana na serra. Uma caminhada curta pela manhã, pausa no mirante e paisagens para fotografar.');
  command('category:attach',{noteId:trails,name:'viagem'});
  const travelReminder=create('reminders','Conferir o tempo na serra','Antes da viagem, conferir a previsão para escolher uma trilha segura e preparar a mochila.');
  command('category:attach',{noteId:travelReminder,name:'viagem'});
  command('schedule:activate',{id:travelReminder,due:'2026-10-02T18:00:00-03:00'});
  await indexRelated();
  const relatedCount=(lexical?lexicalQuery(collage):related.query(collage)).results.length;
  if(relatedCount<3)throw new Error('Expected related fictional travel pages');
  await capture('colagem.png',open(collage,'await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));'));
  win.setSize(1080,900);
  await capture('relacionados.png',"(async()=>{document.querySelector('#related-open').click();await refreshRelated();})()");
  store.now=()=>new Date('2026-10-01T13:05:00-03:00').getTime();
  command('note:update',{id:collage,body:store.snapshot().notes.find(note=>note.id===collage).body});
  }
  win.setSize(1400,1500);
  await capture('pagina-do-dia.png',"(async()=>{document.querySelector('#related-dialog')?.close();document.querySelector('dialog[open]')?.close();state=await window.notebook.action('view:select',{view:'home'});view='home';render();await new Promise(resolve=>setTimeout(resolve,800));})()");
  if(!pipelinesOnly){
  win.setSize(1080,900);
  const flow=create('notes','Como a viagem acontece');
  command('note:update',{id:flow,editorDoc:[block('paragraph','O roteiro em um desenho só, para decidir na hora sem perder o fio.'),{id:doc.id(),type:'diagram',code:'flowchart LR\n  A[Sair cedo] --> B{Tempo bom?}\n  B -- sim --> C[Trilha curta]\n  B -- não --> D[Café na vila]\n  C --> E[Pausa no mirante]\n  D --> E\n  E --> F[Voltar com boas histórias]'},block('paragraph','O código fica salvo na nota; a busca encontra as palavras do desenho.')]});
  command('category:attach',{noteId:flow,name:'viagem'});
  await capture('diagrama.png',open(flow,'await new Promise(resolve=>setTimeout(resolve,1500));'));
  }
  if(flag('--review-sections')){
    const output=path.join(root,'artifacts');fs.mkdirSync(output,{recursive:true});
    await capture('controles-cadernos.png',"document.querySelector('#related-dialog')?.close();view='notebooks';render();",output);
    await capture('controles-lixeira.png',"view='archive';render();",output);
  }
  console.log('README screenshots captured with fictional local data.');
  related.close();store.close();win.destroy();fs.rmSync(directory,{recursive:true,force:true});app.quit();
}).catch(error=>{console.error(error);try{related?.close();store?.close();}catch{}fs.rmSync(directory,{recursive:true,force:true});app.exit(1);});
