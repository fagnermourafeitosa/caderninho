function latestHomeNote() {
  return state.notes.map((note,index)=>({note,index})).filter(({note})=>note.type==='notes'&&!note.trashed&&note.notebookId===state.activeNotebook).sort((a,b)=>new Date(b.note.updated||b.note.created||0)-new Date(a.note.updated||a.note.created||0)||b.index-a.index)[0]?.note;
}
// Home strips: each one folds from its chevron and remembers it (settings in SQLite).
function homeStrip(strip, heading, meta, body, extra = '') {
  const folded = Boolean(state.homeFolded?.[strip]);
  return `<section class="home-strip ${extra}" data-strip="${strip}"><div class="daily-section-heading home-strip-heading"><button type="button" class="strip-fold" data-fold="${strip}" aria-expanded="${!folded}" aria-label="${folded ? 'Abrir' : 'Recolher'} ${escape(heading.label)}" title="${folded ? 'Abrir' : 'Recolher'}"><svg class="small-icon ${folded ? '' : 'chevron-open'}" aria-hidden="true"><use href="#icon-chevron"/></svg></button><h2>${icon(heading.icon)}<span>${escape(heading.label)}</span></h2><span class="strip-meta">${meta}</span></div><div class="home-strip-body" ${folded ? 'hidden' : ''}>${body}</div></section>`;
}
function homeRelatedSection() {
  if(state.daily.day!==state.daily.today)return '';
  const note=latestHomeNote();
  if(!note)return '';
  return homeStrip('latest', { icon: 'notes', label: 'Última nota' }, 'com conexões', `<div class="home-connections-layout"><div class="home-latest"><h3>${escape(note.title||'Sem título')}</h3><div id="home-note-preview" class="note-body collage-editor home-note-preview" aria-label="Prévia da última nota"></div><button type="button" data-home-note="${escape(note.id)}" class="daily-link">${actionLabel('open','Continuar nesta nota')}</button></div><div id="home-related-content" data-note-id="${escape(note.id)}"></div></div>`, 'daily-section home-connections');
}
const homePipeline = () => notebookPipelines(state.activeNotebook)[0];
function homePipelineSection() {
  if (state.daily.day !== state.daily.today) return '';
  const pipeline = homePipeline();
  if (!pipeline) return homeStrip('pipeline', { icon: 'kanban', label: 'Kanban' }, '', `<div class="home-pipeline-empty"><p>Nenhum pipeline ainda.</p><button type="button" class="primary" data-home-new-pipeline>${actionLabel('add', 'Novo pipeline')}</button></div>`, 'home-pipeline');
  return homeStrip('pipeline', { icon: 'kanban', label: pipeline.title || 'Sem título' }, `último pipeline · ${escape(pipelineProgress(pipeline))} <button type="button" class="daily-link" data-home-pipeline="${escape(pipeline.id)}">${actionLabel('open', 'Abrir pipeline')}</button>`, '<div id="home-kanban"></div>', 'home-pipeline');
}
function renderHomePipeline() {
  const host = $('#home-pipeline-strip'); if (!host) return;
  host.innerHTML = homePipelineSection(); bindHomeStrips(host);
  const pipeline = homePipeline(); if (pipeline && $('#home-kanban')) renderKanban($('#home-kanban'), pipeline, { compact: true, limit: 3 });
  host.querySelector('[data-home-new-pipeline]')?.addEventListener('click', async () => { if (await action('view:select', { view: 'tasks' })) { view = state.activeView; createNote(); } });
  host.querySelector('[data-home-pipeline]')?.addEventListener('click', async () => { if (await action('note:select', { id: host.querySelector('[data-home-pipeline]').dataset.homePipeline })) { view = state.activeView; render(); } });
}
onPipelinesChanged(() => { if (view === 'home') renderHomePipeline(); });
function bindHomeStrips(root = document) {
  root.querySelectorAll('[data-fold]').forEach(button => button.onclick = async () => {
    const strip = button.dataset.fold, folded = !state.homeFolded?.[strip];
    if (!await action('home:fold', { strip, folded })) return;
    const section = button.closest('.home-strip');
    section.querySelector('.home-strip-body').hidden = folded;
    button.setAttribute('aria-expanded', String(!folded)); button.title = folded ? 'Abrir' : 'Recolher';
    button.querySelector('svg').classList.toggle('chevron-open', !folded);
    if (!folded && strip === 'latest') renderHomeNotePreview();
  });
}
function renderHomeNotePreview(){
  const host=$('#home-note-preview'),note=latestHomeNote();if(!host||!note)return;
  const scroll=host.scrollTop;
  // Use the editor's block and media renderers, then discard editing handlers.
  const page=document.createElement('div');
  renderDocumentBlocks(page,{...note,editorDoc:note.editorDoc||pageDocument.fromPlain(note.body||''),cuts:note.cuts||[]});
  const preview=page.cloneNode(true);
  preview.querySelectorAll('.cut-controls,.table-tools,.diagram-tools').forEach(element=>element.remove());
  preview.querySelectorAll('[contenteditable]').forEach(element=>element.removeAttribute('contenteditable'));
  preview.querySelectorAll('[role="textbox"],[tabindex]').forEach(element=>{element.removeAttribute('role');element.removeAttribute('tabindex');});
  preview.querySelectorAll('input').forEach(input=>{input.disabled=true;});
  host.replaceChildren(...preview.childNodes);
  requestAnimationFrame(() => host.classList.toggle('clipped', host.scrollHeight > host.clientHeight + 1));
  drawDiagrams(host);
  host.scrollTop=scroll;
  host.dataset.noteId=note.id;
  renderSourceAnchors(host,marginItemsFor(note.id));
  host.querySelectorAll('.cut-open').forEach(button=>button.onclick=()=>window.notebook.openCut(button.closest('[data-cut-id]').dataset.cutId).catch(error=>toast(error.message)));
  host.querySelectorAll('a').forEach(anchor=>anchor.onclick=event=>{event.preventDefault();window.notebook.openLink(anchor.href).catch(error=>toast(error.message));});
}
function dayLabel(day, long = false) {
  return new Intl.DateTimeFormat('pt-BR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(day + 'T12:00:00'));
}
function homeSections() {
  const { overview, day, today } = state.daily, live = day === today;
  const reminders = overview.reminders, notes = overview.recentNotes;
  const reminderBody = `<div class="daily-items home-reminders">${reminders.length ? reminders.map(reminder => `<button class="daily-reminder" data-home-note="${escape(reminder.id)}" ${reminder.sourceActionId?`data-source-go="${escape(reminder.sourceActionId)}"`:''}><time>${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(reminder.due))}</time><span><strong>${escape(reminder.title || 'Sem título')}</strong><small>${reminder.expired?'Horário passou · Reagendar':reminder.fired ? '✓ Alerta disparado' : '◷ Agendado'}</small></span></button>`).join('') : '<p class="daily-empty">Nenhum alerta agendado.</p>'}</div>`;
  const notesBody = notes.length ? notes.map(note => `<button class="daily-note" data-home-note="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}<span class="daily-updated">${note.updated ? formatDateTime(note.updated) : ''}</span></strong><small>${escape(note.body || 'Página em branco')}</small></button>`).join('') : '<p class="daily-empty">Suas próximas ideias aparecem aqui.</p>';
  return homeStrip('reminders', { icon: 'reminders', label: 'Lembretes' }, `${reminders.length} neste dia${live ? ` <button class="daily-link" data-home-view="reminders">${actionLabel('open', 'Ver lembretes')}</button>` : ''}`, reminderBody, 'daily-section')
    + homeStrip('notes', { icon: 'notes', label: 'Últimas notas' }, live ? `<button class="daily-link" data-home-view="notes">${actionLabel('list', 'Ver todas')}</button>` : 'Resumo daquele dia', notesBody, 'daily-section daily-recent');
}
function bindHomePanels() {
  bindHomeStrips($('#daily-overview') || document);
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
  $('#daily-summary').textContent = [textFormat.plural(data.reminders.length, 'lembrete', 'lembretes'), textFormat.plural(data.recentNotes.length, 'nota recente', 'notas recentes')].join(' · ');
}
function renderHome() {
  const daily = state.daily, history = daily.day !== daily.today, index = daily.days.indexOf(daily.day);
  $('#page-content').innerHTML = `<div class="view-toolbar daily-toolbar"><span class="toolbar-left"><label class="daily-picker"><select id="daily-select" aria-label="Consultar páginas anteriores">${daily.days.map(day => `<option value="${day}" ${day === daily.day ? 'selected' : ''}>${day === daily.today ? 'Hoje · ' : ''}${dayLabel(day)}</option>`).join('')}</select></label>${history ? `<button id="daily-today">${icon('home')}<span>Voltar a hoje</span></button>` : ''}</span><span class="toolbar-right"><button id="new-note" class="add-note toolbar-action toolbar-primary" title="Nova nota" aria-label="Nova nota">${icon('add')}<span>Nova nota</span></button></span></div><div class="daily-heading"><h1>${history ? 'Página anterior' : 'Página do dia'}</h1><span class="daily-date">${escape(textFormat.sentenceCase(dayLabel(daily.day, true)))}</span></div><p id="daily-summary" class="daily-summary"></p><div id="daily-overview" class="daily-overview">${homeRelatedSection()}<div id="home-pipeline-strip"></div><div id="daily-panels"></div></div><div class="daily-bottom"><span>${history ? 'Um retrato do que ficou neste dia.' : 'Lembretes e notas de todos os cadernos.'}</span><div class="note-pager"><button id="daily-prev" aria-label="Dia anterior" ${index >= daily.days.length - 1 ? 'disabled' : ''}>${icon('chevron')}</button><button id="daily-next" aria-label="Dia seguinte" ${index === 0 ? 'disabled' : ''}>${icon('chevron')}</button></div></div>`;
  $('#page-number').textContent = daily.day.slice(8);
  $('#new-note').onclick = createNote;
  const select = async day => { if (await action('day:select', { day })) renderHome(); };
  $('#daily-select').onchange = event => select(event.target.value);
  $('#daily-prev').onclick = () => select(daily.days[index + 1]); $('#daily-next').onclick = () => select(daily.days[index - 1]);
  if ($('#daily-today')) $('#daily-today').onclick = () => select(daily.today);
  bindHomeStrips($('#daily-overview')); renderHomePipeline(); refreshHomePanels(); updateTemporalLabels(); refreshHomeRelated();
}
window.notebook.onDayUpdated(next => {
  state = next;
  if (view === 'home') renderHome();
});
