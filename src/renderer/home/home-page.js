// Home page (spec 012): header, day navigation and the rows, top to bottom: daily note, graph beside
// today's reminders, recent notes, kanban. Past days are read-only: reminders and recent notes only.
function latestHomeNote() {
  return state.notes.map((note,index)=>({note,index})).filter(({note})=>note.type==='notes'&&!note.trashed&&note.notebookId===state.activeNotebook).sort((a,b)=>new Date(b.note.updated||b.note.created||0)-new Date(a.note.updated||a.note.created||0)||b.index-a.index)[0]?.note;
}
// Home sections fold from their chevron and remember it (settings in SQLite).
function homeStrip(strip, heading, meta, body, extra = '') {
  const folded = Boolean(state.homeFolded?.[strip]);
  return `<section class="home-strip ${extra}" data-strip="${strip}"><div class="daily-section-heading home-strip-heading"><button type="button" class="strip-fold" data-fold="${strip}" aria-expanded="${!folded}" aria-label="${folded ? 'Abrir' : 'Recolher'} ${escape(heading.label)}" title="${folded ? 'Abrir' : 'Recolher'}"><svg class="small-icon ${folded ? '' : 'chevron-open'}" aria-hidden="true"><use href="#icon-chevron"/></svg></button><h2>${icon(heading.icon)}<span>${escape(heading.label)}</span></h2><span class="strip-meta">${meta}</span></div><div class="home-strip-body" ${folded ? 'hidden' : ''}>${body}</div></section>`;
}
const homeIsLive = () => state.daily.day === state.daily.today;
function bindHomeStrips(root = document) {
  root.querySelectorAll('[data-fold]').forEach(button => button.onclick = async () => {
    const strip = button.dataset.fold, folded = !state.homeFolded?.[strip];
    if (!await action('home:fold', { strip, folded })) return;
    const section = button.closest('.home-strip');
    section.querySelector('.home-strip-body').hidden = folded;
    button.setAttribute('aria-expanded', String(!folded)); button.title = folded ? 'Abrir' : 'Recolher';
    button.querySelector('svg').classList.toggle('chevron-open', !folded);
    if (!folded && strip === 'graph') refreshHomeRelated();
  });
}
function bindHomePanels(root = document) {
  bindHomeStrips(root);
  root.querySelectorAll('[data-home-note]').forEach(button => button.onclick = async () => {
    if(button.dataset.sourceGo){await openSourceOrigin(button.dataset.sourceGo);return;}
    const note = state.notes.find(note => note.id === button.dataset.homeNote && !note.trashed);
    if (!note) { toast('Esta página foi removida. O resumo do dia continua guardado aqui.'); return; }
    if (await action('note:select', { id: note.id })) { view = state.activeView; render(); }
  });
  root.querySelectorAll('[data-home-view]').forEach(button => button.onclick = async () => { if (await action('view:select', { view: button.dataset.homeView })) { view = state.activeView; render(); } });
}
// Reminders and recent notes follow every save; the daily note and the graph keep their own refresh.
function refreshHomePanels() {
  if (view !== 'home' || !$('#home-reminders-strip')) return;
  $('#home-reminders-strip').innerHTML = homeRemindersSection(); bindHomePanels($('#home-reminders-strip'));
  $('#home-notes-strip').innerHTML = homeRecentNotesSection(); bindHomePanels($('#home-notes-strip'));
}
function dayLabel(day, long = false) {
  return new Intl.DateTimeFormat('pt-BR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(day + 'T12:00:00'));
}
function renderHome() {
  const daily = state.daily, history = !homeIsLive(), index = daily.days.indexOf(daily.day);
  const today = history ? '' : `<div id="home-draft-strip"></div>`;
  const pair = `<div class="home-pair">${history ? '' : homeGraphSection()}<div id="home-reminders-strip"></div></div>`;
  $('#page-content').innerHTML = `<div class="view-toolbar daily-toolbar"><span class="toolbar-left"><label class="daily-picker"><select id="daily-select" aria-label="Consultar páginas anteriores">${daily.days.map(day => `<option value="${day}" ${day === daily.day ? 'selected' : ''}>${day === daily.today ? 'Hoje · ' : ''}${dayLabel(day)}</option>`).join('')}</select></label>${history ? `<button id="daily-today">${icon('home')}<span>Voltar a hoje</span></button>` : ''}</span><span class="toolbar-right"><button id="new-note" class="add-note toolbar-action toolbar-primary" title="Nova nota" aria-label="Nova nota">${icon('add')}<span>Nova nota</span></button></span></div><div class="daily-heading"><span class="daily-date">${escape(textFormat.sentenceCase(dayLabel(daily.day, true)))}</span></div><div id="daily-overview" class="daily-overview">${today}${pair}<div id="home-notes-strip"></div>${history ? '' : '<div id="home-pipeline-strip"></div>'}</div><div class="daily-bottom"><span></span><div class="note-pager"><button id="daily-prev" aria-label="Dia anterior" ${index >= daily.days.length - 1 ? 'disabled' : ''}>${icon('chevron')}</button><button id="daily-next" aria-label="Dia seguinte" ${index === 0 ? 'disabled' : ''}>${icon('chevron')}</button></div></div>`;
  $('#page-number').textContent = daily.day.slice(8);
  $('#new-note').onclick = createNote;
  const select = async day => { if (await action('day:select', { day })) renderHome(); };
  $('#daily-select').onchange = event => select(event.target.value);
  $('#daily-prev').onclick = () => select(daily.days[index + 1]); $('#daily-next').onclick = () => select(daily.days[index - 1]);
  if ($('#daily-today')) $('#daily-today').onclick = () => select(daily.today);
  bindHomePanels($('#daily-overview')); renderHomeDraft(); renderHomePipeline(); refreshHomePanels(); updateTemporalLabels(); refreshHomeRelated();
}
window.notebook.onDayUpdated(async next => {
  await flushHomeDraft();
  state = next;
  if (view === 'home') renderHome();
});
