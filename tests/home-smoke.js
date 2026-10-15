(async () => {
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const assert=(condition,label)=>{if(!condition) throw new Error(label);};
  if(!homePipeline()) state=await window.notebook.action('note:create',{type:'tasks',title:'Pipeline da home'});
  state=await window.notebook.action('view:select',{view:'home'}); view='home'; render();
  assert(document.querySelector('.sidebar [data-view]').textContent==='Caderninho','Caderninho primeiro item');
  // Rows (spec 012): daily note, graph beside today's reminders, recent notes, kanban.
  const strips=[...document.querySelectorAll('#daily-overview .home-strip')].map(section=>section.dataset.strip);
  assert(JSON.stringify(strips)===JSON.stringify(['draft','graph','reminders','notes','pipeline']),'Ordem das seções: '+strips.join());
  const pair=document.querySelector('#daily-overview .home-pair');
  assert(pair&&pair.querySelector('[data-strip="graph"]')&&pair.querySelector('[data-strip="reminders"]'),'Grafo e lembretes lado a lado');
  assert(!$('#home-note-preview')&&!$('[data-strip="latest"]'),'Sem prévia da última nota');
  assert(!$('#daily-summary'),'Sem linha de resumo');
  assert(!document.querySelector('.daily-bottom').textContent.includes('Lembretes e notas de todos os cadernos'),'Sem frase no rodapé');
  // Daily note: an editor on the home page; the first character creates one note, saved as you type.
  const typeDraft=async text=>{const line=document.querySelector('.home-draft .task-editor .line-text');assert(line,'Área de digitação da nota do dia');line.focus();putCaret(line,line.textContent.length);document.execCommand('insertText',false,text);await wait(900);while(pending)await wait(20);};
  const before=state.notes.length;
  assert(!state.dailyDraft.noteId,'Sem nota do dia antes de digitar');
  await typeDraft('Ideia da manhã');
  const draftId=state.dailyDraft.noteId,draft=state.notes.find(note=>note.id===draftId);
  assert(draftId&&state.notes.length===before+1&&draft.body.includes('Ideia da manhã'),'Primeira letra cria uma nota e salva');
  await typeDraft(' e mais');
  assert(state.notes.length===before+1&&state.notes.find(note=>note.id===draftId).body.includes('Ideia da manhã e mais'),'Continua editando a mesma nota');
  const home=state.activeNotebook;
  state=await window.notebook.action('notebook:create',{name:'Trabalho da home',description:'',color:state.notebookColors[2]});render();
  assert(!state.dailyDraft.noteId&&document.querySelector('.home-draft .task-editor').textContent.trim()==='','Outro caderno mostra a nota do dia em branco');
  state=await window.notebook.action('notebook:select',{id:home});render();
  assert(document.querySelector('.home-draft .task-editor').textContent.includes('Ideia da manhã e mais'),'Voltar ao caderno mostra a nota do dia');
  // Graph card: always present on today's page, with a refresh button and an empty state.
  await refreshHomeRelated();
  const graph=document.querySelector('[data-strip="graph"]');
  assert(graph.querySelector('[data-home-graph-refresh]'),'Botão de recalcular o grafo');
  assert(graph.querySelector('.related-graph')||graph.textContent.includes('Sem conexões ainda'),'Grafo ou estado vazio');
  // Recent notes: at most three cards.
  const cards=document.querySelectorAll('.home-note-card');
  assert(cards.length>0&&cards.length<=3,'Até três cards de notas: '+cards.length);
  assert(!document.querySelector('[data-home-task]'),'Sem seção de tarefas soltas na home');
  assert(document.querySelector('#home-kanban .kanban'),'Kanban do último pipeline na home');
  if(!homePipeline().tasks.length){const result=await window.notebook.taskCreate({pipelineId:homePipeline().id,title:'Tarefa da home'});state=result.state;render();}
  const card=document.querySelector('#home-kanban .kanban-card');
  assert(card,'Cards do último pipeline na home');
  const taskId=card.dataset.taskId; card.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await wait(400);
  assert(document.querySelector('.task-modal[open]'),'Card da home abre o modal'); document.querySelector('.task-modal[open]').close(); await wait(100);
  // Folding a section is remembered.
  document.querySelector('[data-fold="graph"]').click(); await wait(200);
  assert(state.homeFolded.graph===true&&document.querySelector('[data-strip="graph"] .home-strip-body').hidden,'Grafo recolhido e lembrado');
  document.querySelector('[data-fold="graph"]').click(); await wait(200);
  document.querySelector('.home-note-card').click(); await wait(100);
  assert(view==='notes' && $('#note-dates').textContent.includes('Atualizada em'),'Abrir última nota e ver sua atualização');
  state=await window.notebook.action('view:select',{view:'home'}); view='home'; render();
  return {errors:window.smokeErrors,day:state.daily.day,taskId};
})()
