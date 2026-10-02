function dayLabel(day, long = false) {
  return new Intl.DateTimeFormat('pt-BR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(day + 'T12:00:00'));
}
function homeSections() {
  const { overview, day, today } = state.daily, live = day === today;
  const tasks = overview.tasks, reminders = overview.reminders, notes = overview.recentNotes;
  return `<div class="daily-columns"><section class="daily-section"><div class="daily-section-heading"><h2>Tarefas</h2><span>${tasks.filter(task => !task.done).length} pendentes</span></div><div class="daily-items">${tasks.length ? tasks.map(task => `<div class="daily-task ${task.done ? 'done' : ''}"><input type="checkbox" data-home-task="${escape(task.id)}" data-source="${task.source}" title="${escape(temporalDetails(task))}" aria-label="Concluir: ${escape(task.title)}" ${task.done ? 'checked' : ''} ${live ? '' : 'disabled'}><button data-home-note="${escape(task.noteId)}" ${task.source==='source'?`data-source-go="${escape(task.id)}"`:''}><strong>${escape(task.title)}</strong><small>${escape(task.listTitle || 'Sem título')}</small></button></div>`).join('') : '<p class="daily-empty">Nenhuma tarefa pendente.</p>'}</div>${live ? '<button class="daily-link" data-home-view="tasks">Ver todas as listas ↗</button>' : ''}</section><section class="daily-section"><div class="daily-section-heading"><h2>Lembretes</h2><span>${reminders.length} neste dia</span></div><div class="daily-items">${reminders.length ? reminders.map(reminder => `<button class="daily-reminder" data-home-note="${escape(reminder.id)}" ${reminder.sourceActionId?`data-source-go="${escape(reminder.sourceActionId)}"`:''}><time>${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(reminder.due))}</time><span><strong>${escape(reminder.title || 'Sem título')}</strong><small>${reminder.expired?'Horário passou · Reagendar':reminder.fired ? '✓ Alerta disparado' : '◷ Agendado'}</small></span></button>`).join('') : '<p class="daily-empty">Nenhum alerta agendado.</p>'}</div>${live ? '<button class="daily-link" data-home-view="reminders">Ver lembretes ↗</button>' : ''}</section></div><section class="daily-section daily-recent"><div class="daily-section-heading"><h2>Últimas notas</h2>${live ? '<button class="daily-link" data-home-view="notes">Ver todas ↗</button>' : '<span>Resumo daquele dia</span>'}</div>${notes.length ? notes.map(note => `<button class="daily-note" data-home-note="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}<span class="daily-updated">${note.updated ? formatDateTime(note.updated) : ''}</span></strong><small>${escape(note.body || 'Página em branco')}</small></button>`).join('') : '<p class="daily-empty">Suas próximas ideias aparecem aqui.</p>'}</section>`;
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
  $('#daily-summary').textContent = `${data.tasks.filter(task => !task.done).length} tarefas pendentes · ${data.reminders.length} lembretes · ${data.recentNotes.length} notas recentes`;
}
function renderHome() {
  const daily = state.daily, history = daily.day !== daily.today, index = daily.days.indexOf(daily.day);
  $('#page-content').innerHTML = `<div class="view-toolbar daily-toolbar"><label class="daily-picker">Página <select id="daily-select" aria-label="Consultar páginas anteriores">${daily.days.map(day => `<option value="${day}" ${day === daily.day ? 'selected' : ''}>${day === daily.today ? 'Hoje · ' : ''}${dayLabel(day)}</option>`).join('')}</select></label><span class="toolbar-right">${history ? '<button id="daily-today">Voltar a hoje</button>' : ''}<button id="new-note" class="add-note">+ Nova nota</button></span></div><div class="daily-heading"><h1>${history ? 'Página anterior' : 'Página do dia'}</h1><span class="daily-date">${escape(dayLabel(daily.day, true))}</span></div><p id="daily-summary" class="daily-summary"></p><div id="daily-overview" class="daily-overview"><div id="daily-panels"></div><section class="daily-section daily-writing"><div class="daily-section-heading"><h2>Anotações ${history ? 'daquele dia' : 'de hoje'}</h2>${history ? '<span>Guardadas para consulta</span>' : '<span>Salvas automaticamente</span>'}</div><textarea id="daily-body" class="note-body daily-body" aria-label="Anotações da página do dia" placeholder="Um espaço livre para o seu dia…" maxlength="200000" ${history ? 'readonly' : ''}>${escape(daily.body)}</textarea></section></div><div class="daily-bottom"><span>${history ? 'Um retrato do que ficou neste dia.' : 'Pendentes de todas as listas + concluídas hoje.'}</span><div class="note-pager"><button id="daily-prev" aria-label="Dia anterior" ${index >= daily.days.length - 1 ? 'disabled' : ''}>‹</button><button id="daily-next" aria-label="Dia seguinte" ${index === 0 ? 'disabled' : ''}>›</button></div></div>`;
  $('#page-number').textContent = daily.day.slice(8);
  $('#new-note').onclick = createNote;
  const select = async day => { if (await action('day:select', { day })) renderHome(); };
  $('#daily-select').onchange = event => select(event.target.value);
  $('#daily-prev').onclick = () => select(daily.days[index + 1]); $('#daily-next').onclick = () => select(daily.days[index - 1]);
  if ($('#daily-today')) $('#daily-today').onclick = () => select(daily.today);
  $('#daily-body').oninput = event => action('day:update', { day: daily.day, body: event.target.value });
  refreshHomePanels(); updateTemporalLabels();
}
window.notebook.onDayUpdated(next => {
  state = next;
  if (view === 'home') renderHome();
});
