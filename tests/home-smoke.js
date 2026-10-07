(async () => {
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const assert=(condition,label)=>{if(!condition) throw new Error(label);};
  state=await window.notebook.action('view:select',{view:'home'}); view='home'; render();
  assert(document.querySelector('.sidebar [data-view]').textContent==='Caderninho','Caderninho primeiro item');
  assert(!$('#daily-body')&&!$('.daily-writing'),'Home sem anotações diárias');
  assert($('#home-note-preview .writing-line'),'Prévia usa os blocos do editor');
  assert(document.querySelectorAll('.daily-note').length>0,'Últimas notas no overview');
  assert(!document.querySelector('[data-home-task]'),'Sem seção de tarefas soltas na home');
  assert(document.querySelector('#home-kanban .kanban'),'Kanban do último pipeline na home');
  if(!homePipeline().tasks.length){const result=await window.notebook.taskCreate({pipelineId:homePipeline().id,title:'Tarefa da home'});state=result.state;render();}
  const card=document.querySelector('#home-kanban .kanban-card');
  assert(card,'Cards do último pipeline na home');
  const taskId=card.dataset.taskId; card.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await wait(400);
  assert(document.querySelector('.task-modal[open]'),'Card da home abre o modal'); document.querySelector('.task-modal[open]').close(); await wait(100);
  document.querySelector('.daily-note').click(); await wait(100);
  assert(view==='notes' && $('#note-dates').textContent.includes('Atualizada em'),'Abrir última nota e ver sua atualização');
  state=await window.notebook.action('view:select',{view:'home'}); view='home'; render();
  assert(!$('#daily-body')&&$('#home-note-preview'),'Home mantém prévia ao retornar');
  return {errors:window.smokeErrors,day:state.daily.day,taskId};
})()
