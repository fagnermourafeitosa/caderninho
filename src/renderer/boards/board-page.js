/* Board pages: the note header, then the canvas from the board bundle; Mais actions, full screen and leaving safely. */
let boardBundle = null, boardFullScreen = false;
const BOARD_BUNDLE = 'vendor/excalidraw/';

// The bundle is large: it loads once, the first time a board opens.
function loadBoardBundle() {
  if (window.CaderninhoBoard) return Promise.resolve();
  boardBundle ||= new Promise((resolve, reject) => {
    const style = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: BOARD_BUNDLE + 'excalidraw.css' });
    const script = Object.assign(document.createElement('script'), { src: BOARD_BUNDLE + 'board.js' });
    script.onload = resolve;
    script.onerror = () => { boardBundle = null; reject(new Error('Não foi possível carregar o quadro.')); };
    document.head.append(style, script);
  });
  return boardBundle;
}
function reportBoardError(message) { $('#save-state').textContent = 'Falha ao salvar'; $('#save-state').classList.add('failed'); toast(message.replace(/^Error invoking remote method '[^']+': Error: /, ''), 8000); }
// Leaving a board (another page, the index, a re-render) saves what is pending first.
function leaveBoard() {
  setBoardFullScreen(false);
  return window.CaderninhoBoard ? window.CaderninhoBoard.unmount().catch(error => reportBoardError(error.message)) : Promise.resolve();
}
function setBoardFullScreen(on) {
  boardFullScreen = Boolean(on) && view === 'boards' && Boolean($('#board-host'));
  document.body.classList.toggle('board-full-screen', boardFullScreen);
  if ($('#board-exit-fullscreen')) $('#board-exit-fullscreen').hidden = !boardFullScreen;
}
async function exportCurrentBoard(format) {
  try { const result = await window.CaderninhoBoard.exportImage(format); if (result.saved) toast(`${format.toUpperCase()} exportado.`); }
  catch (error) { toast('Não foi possível exportar o quadro. ' + error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); }
}
function boardToolbar() {
  const items = [moreItem('board-export-png', 'export', 'Exportar PNG', ''), moreItem('board-export-svg', 'export', 'Exportar SVG', ''), moreItem('board-fullscreen', 'fullscreen', 'Tela cheia do quadro', '⇧⌘F'), moreItem('related-open', 'related', 'Relacionados', '⌥⌘R'), '<hr>', moreItem('trash-note', 'trash', 'Mover para a lixeira', '⇧⌘⌫', true)];
  return `<div class="view-toolbar"><span class="toolbar-left"><button id="back-to-index" class="toolbar-back" aria-label="${indexLabels.boards.back}" title="${indexLabels.boards.back}">${icon('chevron')}</button></span><span class="toolbar-right"><button id="new-note" class="add-note toolbar-action toolbar-primary" aria-label="Novo quadro" title="Novo quadro">${icon('add')}<span class="toolbar-action-label">Novo quadro</span></button>${moreMenu(items)}</span></div>`;
}
function renderBoardPage() {
  const note = currentNote();
  if (!note) { openIndex(); return; }
  const header = `<input id="note-title" class="note-title" type="text" maxlength="160" aria-label="Título do quadro" placeholder="Sem título" value="${escape(note.title)}"><div class="note-categories"><div id="category-badges" class="category-badges" aria-label="Categorias da página"></div></div><p class="note-provenance">${notebookAssociation(note)}<span class="provenance-dot" aria-hidden="true">·</span><span id="note-dates" class="list-date">${noteDates(note)}</span></p>`;
  const canvas = `<div class="board-frame"><div id="board-host" class="board-host"></div><button id="board-exit-fullscreen" class="board-exit-fullscreen" type="button" hidden><svg class="small-icon" aria-hidden="true"><use href="#icon-collapse"/></svg><span>Sair da tela cheia</span><kbd>esc</kbd></button></div>`;
  $('#page-content').innerHTML = boardToolbar() + header + canvas;
  bindMoreMenu();
  $('#back-to-index').onclick = async () => { await leaveBoard(); state = await window.notebook.state(); openIndex(); };
  $('#new-note').onclick = createNote;
  $('#note-title').oninput = () => action('note:update', { id: note.id, title: $('#note-title').value });
  $('#board-export-png').onclick = () => exportCurrentBoard('png');
  $('#board-export-svg').onclick = () => exportCurrentBoard('svg');
  $('#board-fullscreen').onclick = () => setBoardFullScreen(!boardFullScreen);
  $('#board-exit-fullscreen').onclick = () => setBoardFullScreen(false);
  $('#related-open').onclick = openRelated;
  $('#trash-note').onclick = async () => { await leaveBoard(); if (await turn('note:trash', { id: note.id })) toast('Página movida para a lixeira. Você pode restaurá-la.'); };
  updateTemporalLabels(); renderCategoryBadges(); wireNotebookAssociation(note); ensurePageHistory(note); syncNoteCommands();
  const host = $('#board-host');
  loadBoardBundle().then(() => host.isConnected && window.CaderninhoBoard.mount(host, {
    noteId: note.id, api: window.notebook, title: () => $('#note-title')?.value.trim() || 'Sem título',
    onSaved: () => saved(), onError: reportBoardError, onSearch: openGlobalSearch,
    onIdleEscape: () => { if (boardFullScreen) setBoardFullScreen(false); },
  })).catch(error => reportBoardError(error.message));
}
// Closing the window or quitting waits for the board's pending save; the close resumes once it is stored.
window.addEventListener('beforeunload', event => {
  if (!window.CaderninhoBoard?.pending()) return;
  event.preventDefault(); event.returnValue = false;
  window.CaderninhoBoard.flush().then(() => { if (!window.CaderninhoBoard.pending()) window.close(); });
});
