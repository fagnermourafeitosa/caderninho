function latestHomeNote() {
  return state.notes.map((note,index)=>({note,index})).filter(({note})=>note.type==='notes'&&!note.trashed&&note.notebookId===state.activeNotebook).sort((a,b)=>new Date(b.note.updated||b.note.created||0)-new Date(a.note.updated||a.note.created||0)||b.index-a.index)[0]?.note;
}
function homeRelatedSection() {
  if(state.daily.day!==state.daily.today)return '';
  const note=latestHomeNote();
  if(!note)return '';
  return `<section class="daily-section home-connections" aria-label="Última nota e suas conexões"><div class="daily-section-heading"><h2>${relatedGraphIcon}<span>Ideias por perto</span></h2><span>Seu caderno em conexão</span></div><div class="home-connections-layout"><div class="home-latest"><small>Última nota</small><h3>${escape(note.title||'Sem título')}</h3><div id="home-note-preview" class="note-body collage-editor home-note-preview" aria-label="Prévia da última nota"></div><button type="button" data-home-note="${escape(note.id)}" class="daily-link">${actionLabel('open','Continuar nesta nota')}</button></div><div id="home-related-content" data-note-id="${escape(note.id)}"><p class="daily-empty" role="status">À procura de conexões…</p></div></div></section>`;
}
function renderHomeNotePreview(){
  const host=$('#home-note-preview'),note=latestHomeNote();if(!host||!note)return;
  const scroll=host.scrollTop;
  // Use the editor's block and media renderers, then discard editing handlers.
  const page=document.createElement('div');
  renderDocumentBlocks(page,{...note,editorDoc:note.editorDoc||pageDocument.fromPlain(note.body||''),cuts:note.cuts||[]});
  const preview=page.cloneNode(true);
  preview.querySelectorAll('.cut-controls,.table-tools').forEach(element=>element.remove());
  preview.querySelectorAll('[contenteditable]').forEach(element=>element.removeAttribute('contenteditable'));
  preview.querySelectorAll('[role="textbox"],[tabindex]').forEach(element=>{element.removeAttribute('role');element.removeAttribute('tabindex');});
  preview.querySelectorAll('input').forEach(input=>{input.disabled=true;});
  host.replaceChildren(...preview.childNodes);
  host.scrollTop=scroll;
  host.dataset.noteId=note.id;
  renderSourceAnchors(host,(state.sourceActions||[]).filter(item=>item.noteId===note.id));
  host.querySelectorAll('.cut-open').forEach(button=>button.onclick=()=>window.notebook.openCut(button.closest('[data-cut-id]').dataset.cutId).catch(error=>toast(error.message)));
  host.querySelectorAll('a').forEach(anchor=>anchor.onclick=event=>{event.preventDefault();window.notebook.openLink(anchor.href).catch(error=>toast(error.message));});
}
function dayLabel(day, long = false) {
  return new Intl.DateTimeFormat('pt-BR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(day + 'T12:00:00'));
}
function homeSections() {
  const { overview, day, today } = state.daily, live = day === today;
  const tasks = overview.tasks, reminders = overview.reminders, notes = overview.recentNotes;
  return `<div class="daily-columns"><section class="daily-section"><div class="daily-section-heading"><h2>${icon('tasks')}<span>Tarefas</span></h2><span>${tasks.filter(task => !task.done).length} pendentes</span></div><div class="daily-items">${tasks.length ? tasks.map(task => `<div class="daily-task ${task.done ? 'done' : ''}"><input type="checkbox" data-home-task="${escape(task.id)}" data-source="${task.source}" title="${escape(temporalDetails(task))}" aria-label="Concluir: ${escape(task.title)}" ${task.done ? 'checked' : ''} ${live ? '' : 'disabled'}><button data-home-note="${escape(task.noteId)}" ${task.source==='source'?`data-source-go="${escape(task.id)}"`:''}><strong>${escape(task.title)}</strong><small>${escape(task.listTitle || 'Sem título')}</small></button></div>`).join('') : '<p class="daily-empty">Nenhuma tarefa pendente.</p>'}</div>${live ? `<button class="daily-link" data-home-view="tasks">${icon('list')}<span>Ver todas as listas</span>${icon('open')}</button>` : ''}</section><section class="daily-section"><div class="daily-section-heading"><h2>${icon('reminders')}<span>Lembretes</span></h2><span>${reminders.length} neste dia</span></div><div class="daily-items">${reminders.length ? reminders.map(reminder => `<button class="daily-reminder" data-home-note="${escape(reminder.id)}" ${reminder.sourceActionId?`data-source-go="${escape(reminder.sourceActionId)}"`:''}><time>${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(reminder.due))}</time><span><strong>${escape(reminder.title || 'Sem título')}</strong><small>${reminder.expired?'Horário passou · Reagendar':reminder.fired ? '✓ Alerta disparado' : '◷ Agendado'}</small></span></button>`).join('') : '<p class="daily-empty">Nenhum alerta agendado.</p>'}</div>${live ? `<button class="daily-link" data-home-view="reminders">${icon('reminders')}<span>Ver lembretes</span>${icon('open')}</button>` : ''}</section></div><section class="daily-section daily-recent"><div class="daily-section-heading"><h2>${icon('notes')}<span>Últimas notas</span></h2>${live ? `<button class="daily-link" data-home-view="notes">${icon('list')}<span>Ver todas</span>${icon('open')}</button>` : '<span>Resumo daquele dia</span>'}</div>${notes.length ? notes.map(note => `<button class="daily-note" data-home-note="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}<span class="daily-updated">${note.updated ? formatDateTime(note.updated) : ''}</span></strong><small>${escape(note.body || 'Página em branco')}</small></button>`).join('') : '<p class="daily-empty">Suas próximas ideias aparecem aqui.</p>'}</section>`;
}
function bindHomePanels() {
  document.querySelectorAll('[data-home-task]').forEach(input => input.onchange = async () => { if (await action(input.dataset.source === 'source' ? 'source:toggle' : input.dataset.source === 'inline' ? 'inline:toggle' : 'item:toggle', { id: input.dataset.homeTask })) refreshHomePanels(); else input.checked = !input.checked; });
  document.querySelectorAll('[data-home-note]').forEach(button => button.onclick = async () => {
    if(button.dataset.sourceGo){await openSourceOrigin(button.dataset.sourceGo);return;}
    const note = state.notes.find(note => note.id === button.dataset.homeNote && !note.trashed);
    if (!note) { toast('Esta página foi removida. O resumo do dia continua guardado aqui.'); return; }
    if (await action('note:select', { id: note.id })) { view = state.activeView; render(); }
  });
  document.querySelectorAll('[data-home-view]').forEach(button => button.onclick = async () => { if (await action('view:select', { view: button.dataset.homeView })) { view = state.activeView; render(); } });
}
function refreshHomePanels() {
  if (view !== 'home' || !$('#daily-panels')) return;
  $('#daily-panels').innerHTML = homeSections(); bindHomePanels();
  const data = state.daily.overview;
  renderHomeNotePreview();
  $('#daily-summary').textContent = `${data.tasks.filter(task => !task.done).length} tarefas pendentes · ${data.reminders.length} lembretes · ${data.recentNotes.length} notas recentes`;
}
function renderHome() {
  const daily = state.daily, history = daily.day !== daily.today, index = daily.days.indexOf(daily.day);
  $('#page-content').innerHTML = `<div class="view-toolbar daily-toolbar"><label class="daily-picker">${icon('home')}<span>Página</span> <select id="daily-select" aria-label="Consultar páginas anteriores">${daily.days.map(day => `<option value="${day}" ${day === daily.day ? 'selected' : ''}>${day === daily.today ? 'Hoje · ' : ''}${dayLabel(day)}</option>`).join('')}</select></label><span class="toolbar-right">${history ? `<button id="daily-today">${icon('home')}<span>Voltar a hoje</span></button>` : ''}<button id="new-note" class="add-note toolbar-action" title="Nova nota" aria-label="Nova nota">${icon('notes')}<span>Nova nota</span></button></span></div><div class="daily-heading"><h1>${history ? 'Página anterior' : 'Página do dia'}</h1><span class="daily-date">${escape(dayLabel(daily.day, true))}</span></div><p id="daily-summary" class="daily-summary"></p><div id="daily-overview" class="daily-overview">${homeRelatedSection()}<div id="daily-panels"></div></div><div class="daily-bottom"><span>${history ? 'Um retrato do que ficou neste dia.' : 'Pendentes de todas as listas + concluídas hoje.'}</span><div class="note-pager"><button id="daily-prev" aria-label="Dia anterior" ${index >= daily.days.length - 1 ? 'disabled' : ''}>${icon('chevron')}</button><button id="daily-next" aria-label="Dia seguinte" ${index === 0 ? 'disabled' : ''}>${icon('chevron')}</button></div></div>`;
  $('#page-number').textContent = daily.day.slice(8);
  $('#new-note').onclick = createNote;
  const select = async day => { if (await action('day:select', { day })) renderHome(); };
  $('#daily-select').onchange = event => select(event.target.value);
  $('#daily-prev').onclick = () => select(daily.days[index + 1]); $('#daily-next').onclick = () => select(daily.days[index - 1]);
  if ($('#daily-today')) $('#daily-today').onclick = () => select(daily.today);
  refreshHomePanels(); updateTemporalLabels(); refreshHomeRelated();
}
window.notebook.onDayUpdated(next => {
  state = next;
  if (view === 'home') renderHome();
});
