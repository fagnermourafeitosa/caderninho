// Search stays outside the page content so changing sections preserves the field.
const searchControl = $('#global-search-control'), searchInput = $('#global-search');
const searchResults = $('#global-search-results'), searchToggle = $('#global-search-toggle');
let searchTimer, searchMatches = [], searchActive = -1;
const searchNormalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
function globalSearchMatches(query) {
 if (!state) return [];
 const tokens = searchNormalize(query).trim().split(/\s+/).filter(Boolean);
 if (!tokens.length) return [];
 return state.notes.filter(note => !note.trashed).map(note => {
  const book = state.notebooks.find(book => book.id === note.notebookId);
  const text = [note.body, ...(note.items || []).map(item => item.title), ...(note.inlineTasks || []).map(item => item.title), ...(state.sourceActions || []).filter(item => item.noteId === note.id).map(item => item.title), ...(note.cuts || []).map(cut => `${cut.title || ''} ${cut.description || ''} ${cut.url || ''}`)].join(' ').replace(/\s+/g, ' ').trim();
  const title = searchNormalize(note.title), body = searchNormalize(text);
  const all = `${title} ${body} ${searchNormalize(book?.name)}`;
  if (!tokens.every(token => all.includes(token))) return null;
  const start = Math.max(0, body.indexOf(tokens[0]) - 35);
  return {note, book, snippet: (start ? '…' : '') + text.slice(start, start + 140), score: tokens.reduce((score, token) => score + (title.includes(token) ? 4 : 0) + (title.startsWith(token) ? 2 : 0), 0)};
 }).filter(Boolean).sort((a,b) => b.score-a.score || Date.parse(b.note.updated)-Date.parse(a.note.updated));
}
function renderGlobalSearch() {
 clearTimeout(searchTimer); searchTimer = null;
 searchMatches = globalSearchMatches(searchInput.value); searchActive = -1;
 const query = searchInput.value.trim();
 searchResults.hidden = !query || !searchControl.classList.contains('open');
 searchInput.setAttribute('aria-expanded', String(!searchResults.hidden));
 searchInput.removeAttribute('aria-activedescendant');
 searchResults.innerHTML = searchMatches.length ? searchMatches.map(({note,book,snippet},index) => `<button type="button" role="option" aria-selected="false" id="global-result-${index}" data-search-index="${index}"><strong>${escape(note.title || 'Sem título')}</strong><small>${escape(({notes:'Nota',tasks:'Lista de tarefas',reminders:'Lembrete',boards:'Quadro'})[note.type])} · ${escape(book?.name || 'Caderno')}</small><span>${escape(snippet || 'Página em branco')}</span></button>`).join('') : '<p role="status">Nenhuma página encontrada.</p>';
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
