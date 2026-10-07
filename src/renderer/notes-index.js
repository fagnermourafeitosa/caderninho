/* Notes and lists open on their index; a row opens the page, the back chevron returns. */
let indexFor = null;
const indexLabels = { notes: { title: 'Notas', back: 'Todas as notas', one: 'nota', many: 'notas' }, tasks: { title: 'Listas', back: 'Todas as listas', one: 'lista', many: 'listas' }, boards: { title: 'Quadros', back: 'Todos os quadros', one: 'quadro', many: 'quadros', none: 'Nenhum quadro neste caderno' } };
// The index stays until another page is selected or created, whoever triggered it.
const showingIndex = () => Boolean(indexFor && indexFor.view === view && indexFor.selected === (state.selected[view] ?? null));
function openIndex() { indexFor = { view, selected: state.selected[view] ?? null }; render(); }
function indexRows(query) {
  const needle = query.toLocaleLowerCase('pt-BR');
  return visibleNotes().filter(note => `${note.title} ${note.body} ${note.items.map(item => item.title).join(' ')}`.toLocaleLowerCase('pt-BR').includes(needle));
}
function renderIndexRows() {
  const notes = indexRows($('#index-search').value);
  $('#notes-index').innerHTML = notes.length ? notes.map(note => note.type === 'boards' ? boardIndexRow(note) : `<button class="note-index-row" data-note-id="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}</strong><small>${note.type === 'tasks' ? `${listDate(note.created)} · ${note.items.filter(item => item.done).length} / ${note.items.length} concluídas` : `${prettyDate(note.updated)} · ${escape(note.body.replace(/\s+/g, ' ').slice(0, 120) || 'Página em branco')}`}</small></button>`).join('') : '<p class="index-empty">Nenhuma página encontrada.</p>';
  $('#notes-index').querySelectorAll('[data-note-id]').forEach(button => button.onclick = () => {
    if (button.dataset.noteId === state.selected[view]) { indexFor = null; render(); } else turn('note:select', { id: button.dataset.noteId });
  });
  if (view === 'boards') loadBoardThumbnails($('#notes-index'));
}
function renderIndex() {
  const label = labels[view], names = indexLabels[view], count = visibleNotes().length;
  const toolbar = `<div class="view-toolbar"><span class="toolbar-left"></span><span class="toolbar-right"><button id="new-note" class="add-note toolbar-action toolbar-primary" aria-label="${label.create}" title="${label.create}">${icon('add')}<span class="toolbar-action-label">${label.create}</span></button></span></div>`;
  const body = count ? `<input id="index-search" class="index-search" type="search" placeholder="Procurar em ${names.many}…" aria-label="Procurar em ${names.many}" autocomplete="off"><div id="notes-index" class="notes-index scroll-list"></div>` : empty({ notes: 'Uma página nova?', tasks: 'Sua primeira lista?', boards: 'Um quadro em branco?' }[view], { notes: 'Escreva e deixe o caderninho guardar.', tasks: 'Crie uma lista com quantos checkboxes precisar.', boards: 'Post-its, setas e imagens num papel sem fim.' }[view], view, `<button id="empty-create" class="primary">${actionLabel('add', label.create)}</button>`);
  $('#page-content').innerHTML = `${toolbar}<h1>${names.title}</h1><p class="view-description">${!count && names.none ? names.none : `${textFormat.plural(count, names.one, names.many)} neste caderno`}</p>${body}`;
  $('#new-note').onclick = createNote;
  if ($('#empty-create')) $('#empty-create').onclick = createNote;
  if ($('#index-search')) { $('#index-search').oninput = renderIndexRows; renderIndexRows(); }
}
