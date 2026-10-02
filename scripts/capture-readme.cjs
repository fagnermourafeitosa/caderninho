// Capture the real renderer with fictional data in an isolated temporary database.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../store.cjs');
const doc=require('../editor-document.js');
const root=path.resolve(__dirname,'..');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'caderninho-readme-'));
app.setPath('userData',directory);
let store,win;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  store=new Store(directory,{now:()=>new Date('2026-10-01T13:00:00-03:00').getTime()});
  store.db.prepare('DELETE FROM notes').run();
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
  for(const [title,done] of [['Organizar a mesa de trabalho',true],['Separar os livros para doação',true],['Agendar a consulta de rotina',false],['Planejar as refeições da semana',false],['Reservar uma noite para descansar',false]]){
    const snapshot=command('item:create',{noteId:tasks,title}),item=snapshot.notes.find(n=>n.id===tasks).items.at(-1);if(done)command('item:toggle',{id:item.id});
  }
  for(const [day,hour,title] of [[1,14,'Revisar o planejamento'],[1,18,'Pausa para caminhar'],[3,10,'Café com a Ana'],[7,15,'Consulta de rotina'],[15,9,'Revisar as metas do mês'],[22,16,'Separar os documentos']]){
    const id=create('reminders',title,'Um lembrete para cuidar do que importa.');command('schedule:activate',{id,due:`2026-10-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00-03:00`});
  }
  command('day:update',{day:'2026-10-01',body:'Hoje, quero terminar o essencial e deixar espaço para uma boa ideia.\n\nUma coisa de cada vez também é progresso.'});
  command('view:select',{view:'home'});
  ipcMain.handle('notebook:state',()=>store.snapshot());
  ipcMain.handle('notebook:action',(_event,name,input)=>command(name,input));
  ipcMain.handle('notebook:window',()=>null);
  win=new BrowserWindow({width:1080,height:900,frame:false,transparent:true,backgroundColor:'#00000000',show:false,webPreferences:{preload:path.join(root,'preload.cjs'),contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  await win.loadFile(path.join(root,'index.html'));await pause(900);
  const capture=async(name,code)=>{
    if(code)await win.webContents.executeJavaScript(code);
    await pause(250);
    await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const errors=await win.webContents.executeJavaScript('window.smokeErrors');if(errors.length)throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(root,'docs','images',name),(await win.webContents.capturePage()).resize({width:1440}).toPNG());
  };
  await capture('pagina-do-dia.png',"(async()=>{state=await window.notebook.state();view='home';render();})()");
  await capture('editor.png',`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(note)}});view='notes';render();})()`);
  await capture('tarefas.png',`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(tasks)}});view='tasks';render();})()`);
  await capture('calendario.png',"(async()=>{state=await window.notebook.action('view:select',{view:'reminders'});view='reminders';reminderEditor=false;render();})()");
  console.log('README screenshots captured with fictional local data.');
  store.close();win.destroy();fs.rmSync(directory,{recursive:true,force:true});app.quit();
}).catch(error=>{console.error(error);try{store?.close();}catch{}fs.rmSync(directory,{recursive:true,force:true});app.exit(1);});
