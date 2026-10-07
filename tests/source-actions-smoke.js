(async()=>{
 const assert=(value,message)=>{if(!value)throw new Error(message);},wait=(ms=150)=>new Promise(resolve=>setTimeout(resolve,ms));
 const until=async(check,label)=>{for(let i=0;i<60;i++){const value=check();if(value)return value;await wait(50);}throw new Error('Timeout: '+label);};
 const submitNewTask=async(title)=>{const dialog=await until(()=>document.querySelector('.new-task-dialog[open]'),'Nova tarefa aberta');if(title!==undefined)dialog.querySelector('#new-task-title').value=title;dialog.querySelector('form').requestSubmit();await until(()=>!document.querySelector('.new-task-dialog'),'Nova tarefa criada');};
 // Tasks from notes belong to a pipeline of the note's notebook.
 await action('note:create',{type:'tasks',title:'Reforma'});const pipelineId=state.selected.tasks;
 await action('note:create',{type:'notes',title:'Uma cozinha com mais espaço'});view='notes';render();const id=currentNote().id;
 await action('note:update',{id,editorDoc:[{id:'source-one',type:'paragraph',runs:[{text:'Quero uma cozinha onde seja bom reunir os amigos.',marks:{}}]},{id:'source-two',type:'paragraph',runs:[{text:'Pedir orçamento dos armários e escolher os materiais.',marks:{}}]}]});renderPage();
 let span=document.querySelector('[data-block-id="source-two"] .line-text');const a=editorTextPoint(span,0),b=editorTextPoint(span,28);getSelection().setBaseAndExtent(a.node,a.offset,b.node,b.offset);showFormatMenu();assert($('.source-create'),'A seleção oferece Criar tarefa');$('.source-create').click();
 const dialog=await until(()=>document.querySelector('.new-task-dialog[open]'),'Criar tarefa abre Nova tarefa');
 assert(dialog.querySelector('#new-task-title').value==='Pedir orçamento dos armários','Título vem do trecho');assert(dialog.querySelector('#new-task-pipeline').value===pipelineId,'Pipeline do caderno');
 await submitNewTask();
 const task=await until(()=>linkedTasksFor(id)[0],'tarefa ligada à nota');
 await until(()=>document.querySelector(`#source-margin [data-task-open="${task.id}"]`),'Cartão da tarefa na margem');
 assert(document.querySelector('#source-margin .task-margin-card .pipeline-pill').textContent==='Backlog','Margem mostra a coluna');
 assert(document.querySelector(`[data-source-anchor="${task.id}"]`),'Trecho de origem destacado');
 document.querySelector(`[data-task-open="${task.id}"]`).click();await until(()=>document.querySelector('.task-modal[open]'),'Lápis abre a tarefa');document.querySelector('.task-modal[open]').close();await wait();
 // Reminders keep the margin composer.
 await openSourceComposer(task.origin,'reminder');$('#source-title').value='Revisar os materiais com a arquiteta';$('#source-due').value=localDate(Date.now()+7200000);$('#source-form').requestSubmit();await wait();
 const reminder=state.sourceActions.at(-1);assert(reminder.kind==='reminder'&&reminder.title==='Revisar os materiais com a arquiteta','Lembrete ligado ao trecho');
 await action('view:select',{view:'reminders'});view='reminders';reminderEditor=false;render();assert(calendarReminders().some(x=>x.sourceActionId===reminder.id),'Calendário inclui lembrete ligado ao trecho');await openSourceOrigin(reminder.id);assert(currentNote().id===id,'Origem volta para a nota');
 await action('source:remove',{id:reminder.id});view='archive';trashType='reminders';render();assert(document.querySelector(`[data-restore-id="${reminder.id}"][data-kind=source]`),'Lembretes removidos ficam na lixeira por tipo');await action('source:restore',{id:reminder.id});view='notes';render();assert(actionsForNote().some(x=>x.id===reminder.id),'Lembrete restaurado');
 await action('note:update',{id,editorDoc:[{id:'source-one',type:'paragraph',runs:[{text:'Uma ideia amadurece quando encontra seu próximo passo.',marks:{}}]}]});renderPage();assert($('.source-missing'),'Origem removida preserva cópia e avisa');
 assert(document.querySelector(`#source-margin [data-task-open="${task.id}"]`),'A tarefa continua na margem sem o trecho');
 // Dragging the action button to the margin opens Nova tarefa; cancelling creates nothing.
 span=document.querySelector('[data-block-id="source-one"] .line-text');const x=editorTextPoint(span,0),y=editorTextPoint(span,15);getSelection().setBaseAndExtent(x.node,x.offset,y.node,y.offset);showFormatMenu();const transfer=new DataTransfer();$('.source-create').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));const rail=$('#source-margin');rail.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 const dropped=await until(()=>document.querySelector('.new-task-dialog[open]'),'Soltar na margem abre Nova tarefa');dropped.querySelector('[data-cancel]').click();await wait();
 assert(linkedTasksFor(id).length===1,'Cancelar não cria tarefa');
 // Media has the same flow: the image title becomes the task title.
 state=await window.notebook.image({noteId:id,name:'Referência para os armários',bytes:new Uint8Array(window.cutTestBytes)});renderPage();$('.cut-action').click();
 const media=await until(()=>document.querySelector('.new-task-dialog[open]'),'Mídia abre Nova tarefa');assert(media.querySelector('#new-task-title').value==='Referência para os armários','Título vem da mídia');await submitNewTask();
 await until(()=>linkedTasksFor(id).some(item=>item.origin.kind==='cut'),'Tarefa ligada à mídia');await until(()=>$('.source-media-linked'),'Mídia marcada como ligada');
 $('#source-fold').click();assert($('.margin-collapsed'),'Margem pode ser recolhida para escrever');$('#source-fold').click();assert(!$('.margin-collapsed'),'Margem reabre com ações preservadas');
 document.querySelector(`[data-source-edit="${reminder.id}"]`).click();await wait();$('#source-title').value='Revisar com a arquiteta na sexta';$('#source-due').value=localDate(Date.now()+9200000);$('#source-form').requestSubmit();await wait();assert(state.sourceActions.find(item=>item.id===reminder.id).title==='Revisar com a arquiteta na sexta','Editar lembrete mantém sua identidade');
 assert(currentNote().editorDoc.every(block=>!JSON.stringify(block).includes('source-anchor')),'Marcações são derivadas dos vínculos, sem poluir o texto salvo');
 // Restore demo content for the visual inspection, keeping the linked actions.
 await action('note:update',{id,editorDoc:[{id:'source-one',type:'paragraph',runs:[{text:'Quero uma cozinha onde seja bom reunir os amigos.',marks:{}}]},{id:'source-two',type:'paragraph',runs:[{text:'Pedir orçamento dos armários e escolher os materiais.',marks:{}}]}]});renderPage();getSelection().removeAllRanges();await wait();
 assert(!window.smokeErrors.length,window.smokeErrors.join('\n'));return {noteId:id,actions:actionsForNote().length,errors:window.smokeErrors};
})()
