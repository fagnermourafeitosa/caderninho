(async () => {
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const assert=(condition,label)=>{if(!condition) throw new Error(label);};
  state=await window.notebook.action('view:select',{view:'home'}); view='home'; render();
  assert(document.querySelector('.sidebar [data-view]').textContent==='Caderninho','Caderninho primeiro item');
  assert(!$('#daily-body')&&!$('.daily-writing'),'Home sem anotações diárias');
  assert($('#home-note-preview .writing-line'),'Prévia usa os blocos do editor');
  assert(document.querySelectorAll('.daily-note').length>0,'Últimas notas no overview');
  assert(document.querySelectorAll('[data-home-task]').length>0,'Tarefas de listas e notas no overview');
  const checkbox=document.querySelector('[data-home-task]:not(:checked)');
  const taskId=checkbox.dataset.homeTask; checkbox.click(); await wait(100);
  assert((await window.notebook.state()).daily.overview.tasks.find(task=>task.id===taskId).done,'Concluir tarefa sem sair da home');
  document.querySelector('.daily-note').click(); await wait(100);
  assert(view==='notes' && $('#note-dates').textContent.includes('Atualizada em'),'Abrir última nota e ver sua atualização');
  state=await window.notebook.action('view:select',{view:'home'}); view='home'; render();
  assert(!$('#daily-body')&&$('#home-note-preview'),'Home mantém prévia ao retornar');
  return {errors:window.smokeErrors,day:state.daily.day,taskId,tasks:state.daily.overview.tasks.length};
})()
