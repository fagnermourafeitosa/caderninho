// Search stays outside the page content so changing sections preserves the field.
const searchControl = $('#global-search-control'), searchInput = $('#global-search');
const searchResults = $('#global-search-results'), searchToggle = $('#global-search-toggle');
let searchTimer, searchMatches = [], searchActive = -1;
const searchNormalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
function globalSearchMatches(query) {
 if (!state) return [];
 const tokens = searchNormalize(query).trim().split(/\s+/).filter(Boolean);
 if (!tokens.length) return [];
 const match = (title, text, book) => {
  const normalTitle = searchNormalize(title), body = searchNormalize(text);
  if (!tokens.every(token => `${normalTitle} ${body} ${searchNormalize(book?.name)}`.includes(token))) return null;
  const start = Math.max(0, body.indexOf(tokens[0]) - 35);
  return { snippet: (start ? '…' : '') + text.slice(start, start + 140), score: tokens.reduce((score, token) => score + (normalTitle.includes(token) ? 4 : 0) + (normalTitle.startsWith(token) ? 2 : 0), 0) };
 };
 // Pipeline tasks are found by title, description and comments; opening one opens its pipeline and the task.
 const tasks = state.pipelines.filter(pipeline => !pipeline.trashed).flatMap(pipeline => pipeline.tasks.map(task => {
  const book = state.notebooks.find(item => item.id === pipeline.notebookId), found = match(task.title, task.searchText, book);
  return found && { kind: 'task', task, pipeline, book, title: task.title, type: 'Tarefa · ' + (pipeline.title || 'Sem título'), updated: task.updatedAt, ...found };
 })).filter(Boolean);
 return [...tasks, ...state.notes.filter(note => !note.trashed).map(note => {
  const book = state.notebooks.find(book => book.id === note.notebookId);
  const text = [note.body, ...(state.sourceActions || []).filter(item => item.noteId === note.id).map(item => item.title), ...(note.cuts || []).map(cut => `${cut.title || ''} ${cut.description || ''} ${cut.url || ''}`)].join(' ').replace(/\s+/g, ' ').trim();
  const found = match(note.title, text, book);
  return found && { kind: 'page', note, book, title: note.title, type: ({ notes: 'Nota', tasks: 'Pipeline', reminders: 'Lembrete', boards: 'Quadro' })[note.type], updated: note.updated, ...found };
 })].filter(Boolean).sort((a,b) => b.score-a.score || Date.parse(b.updated)-Date.parse(a.updated));
}
function renderGlobalSearch() {
 clearTimeout(searchTimer); searchTimer = null;
 searchMatches = globalSearchMatches(searchInput.value); searchActive = -1;
 const query = searchInput.value.trim();
 searchResults.hidden = !query || !searchControl.classList.contains('open');
 searchInput.setAttribute('aria-expanded', String(!searchResults.hidden));
 searchInput.removeAttribute('aria-activedescendant');
 searchResults.innerHTML = searchMatches.length ? searchMatches.map(({title,type,book,snippet},index) => `<button type="button" role="option" aria-selected="false" id="global-result-${index}" data-search-index="${index}"><strong>${escape(title || 'Sem título')}</strong><small>${escape(type)} · ${escape(book?.name || 'Caderno')}</small><span>${escape(snippet || 'Página em branco')}</span></button>`).join('') : '<p role="status">Nenhuma página encontrada.</p>';
 searchResults.querySelectorAll('[data-search-index]').forEach(button => button.onclick = () => selectGlobalResult(Number(button.dataset.searchIndex)));
}
function openGlobalSearch() {
 searchControl.classList.add('open'); searchInput.disabled = false;
 searchToggle.setAttribute('aria-expanded','true'); searchToggle.setAttribute('aria-label','Fechar busca');
 searchInput.focus(); renderGlobalSearch();
}
function closeGlobalSearch(focus = false) {
 clearTimeout(searchTimer); searchControl.classList.remove('open');searchResults.hidden = true;
 searchInput.disabled = true;searchInput.setAttribute('aria-expanded','false');searchInput.removeAttribute('aria-activedescendant');
 searchToggle.setAttribute('aria-expanded','false');searchToggle.setAttribute('aria-label','Abrir busca');
 if (focus) searchToggle.focus();
}
async function selectGlobalResult(index) {
 const result = searchMatches[index]; if (!result) return;
 closeGlobalSearch();
 if (result.kind === 'task') { if (await turn('note:select',{id:result.pipeline.id})) openTaskModal(result.task.id); return; }
 if (await turn('note:select',{id:result.note.id})) $('#note-title')?.focus();
}
searchToggle.onclick = () => searchControl.classList.contains('open') ? closeGlobalSearch(true) : openGlobalSearch();
searchInput.oninput = () => {clearTimeout(searchTimer); searchResults.hidden = true; searchInput.setAttribute('aria-expanded','false');searchInput.removeAttribute('aria-activedescendant');searchMatches=[];searchTimer = setTimeout(renderGlobalSearch,160);};
searchInput.onkeydown = event => {
 if (event.key === 'Escape') {event.preventDefault();closeGlobalSearch(true);}
 if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
  event.preventDefault();if (searchTimer) renderGlobalSearch();if (!searchMatches.length) return;
  searchActive = searchActive < 0 ? (event.key === 'ArrowDown' ? 0 : searchMatches.length - 1) : (searchActive + (event.key === 'ArrowDown' ? 1 : -1) + searchMatches.length) % searchMatches.length;
  searchResults.querySelectorAll('[role="option"]').forEach((button,index)=>button.setAttribute('aria-selected',String(index===searchActive)));
  const target=$(`#global-result-${searchActive}`);searchInput.setAttribute('aria-activedescendant',target.id);target.scrollIntoView({block:'nearest'});
 }
 if (event.key === 'Enter') {event.preventDefault();if (searchTimer) renderGlobalSearch();selectGlobalResult(searchActive < 0 ? 0 : searchActive);}
};
document.addEventListener('pointerdown',event=>{if(searchControl.classList.contains('open')&&!searchControl.contains(event.target))closeGlobalSearch();});
