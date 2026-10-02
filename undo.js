const pageHistories = new Map();
let undoQueue = Promise.resolve();
function ensurePageHistory(note) {
  let history = pageHistories.get(note.id);
  // External edits (such as quick capture) become a fresh baseline instead of
  // allowing an old snapshot to erase content appended from another window.
  if (!history || history.current.title !== note.title || history.current.body !== note.body || JSON.stringify(history.current.editorDoc??null)!==JSON.stringify(note.editorDoc??null)) {
    history = new EditHistory({ title: note.title, body: note.body,editorDoc:note.editorDoc }); pageHistories.set(note.id, history);
  }
  return history;
}
function editorSelection() {
  const active = document.activeElement;
  if (active?.id === 'note-title') return { field: 'title', start: active.selectionStart, end: active.selectionEnd };
  const editor = $('#note-body'); if (!editor) return null;
  if (editor.tagName === 'TEXTAREA') return { field: 'body', start: editor.selectionStart, end: editor.selectionEnd };
  const selected = getSelection(),cell=selected.anchorNode?.parentElement?.closest('.table-cell-text'), line = selected.anchorNode?.parentElement?.closest('.writing-line');
  if (!line) return { field: 'body', line: 0, start: 0, end: 0 };
  if(cell)return {field:'body',line:[...editor.querySelectorAll('.writing-line')].indexOf(line),cell:[...line.querySelectorAll('.table-cell-text')].indexOf(cell),start:caretOffset(cell),end:caretOffset(cell,true)};
  return { field: 'body', line: [...editor.querySelectorAll('.writing-line')].indexOf(line), start: caretOffset(editableText(line)), end: caretOffset(editableText(line), true) };
}
function rememberNoteEdit(input,options={}) {
  const note = state?.notes.find(item => item.id === input.id); if (!note) return;
  const history = pageHistories.get(note.id) || ensurePageHistory(note), previous = history.current;
  const next = { title: input.title ?? previous.title, body: input.body ?? previous.body,editorDoc:Object.hasOwn(input,'editorDoc')?input.editorDoc:previous.editorDoc, selection: editorSelection() };
  let group = Object.hasOwn(input, 'title') ? 'title' : 'body';
  if (group === 'body') {
    const structure = text => text.split('\n').map(line => smartText.checkbox(line)?.[1]?.toLowerCase() ?? '-').join('|');
    if (structure(previous.body) !== structure(next.body)) group = null;
  }
  if(options.group===false || (next.body===previous.body && JSON.stringify(next.editorDoc)!==JSON.stringify(previous.editorDoc))) group=null;
  history.record(next, group);
}
function restoreEditorSelection(selection) {
  if (!selection) return;
  const field = selection.field === 'title' ? $('#note-title') : $('#note-body'); if (!field) return;
  if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
    field.focus(); field.setSelectionRange(selection.start || 0, selection.end ?? selection.start ?? 0); return;
  }
  const lines = field.querySelectorAll('.writing-line'), line = lines[Math.max(0, Math.min(selection.line || 0, lines.length - 1))];
  if (line) putCaret(selection.cell!==undefined?line.querySelectorAll('.table-cell-text')[selection.cell]||editableText(line):editableText(line), selection.start || 0);
}
function isPageHistoryTarget(target = document.activeElement) {
  if (!currentNote() || view === 'archive' || !$('#note-title')) return false;
  if (target?.closest('#note-body, #note-title')) return true;
  return ['notes', 'reminders'].includes(view) && !target?.closest('input, textarea, select, [contenteditable="true"], dialog');
}
function editPageHistory(direction) {
  const noteId = currentNote()?.id; if (!noteId) return;
  undoQueue = undoQueue.then(async () => {
    const history = pageHistories.get(noteId); if (!history) return;
    const selection = editorSelection();
    const restored = history.step(direction); if (!restored) return;
    unfinishedCategoryNote=null;
    // Restore the page immediately so typing after the shortcut cannot be
    // overwritten when the asynchronous SQLite acknowledgement arrives.
    if (currentNote()?.id === noteId && view !== 'archive') {
      const note = { ...currentNote(), title: restored.title, body: restored.body,editorDoc:restored.editorDoc }, editor = $('#note-body'), scroll = editor?.scrollTop || 0;
      $('#note-title').value = note.title;
      if (editor) {
        if (view === 'notes' && (note.editorDoc || editor.classList.contains('collage-editor') || note.cuts.length || categoryText.tokens(note.body).length || note.body.split('\n').some(line => smartText.checkbox(line)))) mountCollage(note);
        else editor.value = note.body;
        $('#note-body').scrollTop = scroll;
      }
      updateDetail(); if (view === 'notes') renderSmartMargin(); restoreEditorSelection(restored.selection || selection);
    }
    if (!await action('note:update', { id: noteId, title: restored.title, body: restored.body,editorDoc:restored.editorDoc }, { history: false })) {
      // Do not remove an edit made while the save was in flight.
      if (history.current.title === restored.title && history.current.body === restored.body) history.step(direction === 'undo' ? 'redo' : 'undo');
    }
  }).catch(error => toast(error.message));
  return undoQueue;
}
function capturePageSelection() { const history = pageHistories.get(currentNote()?.id); if (history) history.current.selection = editorSelection(); }
document.addEventListener('beforeinput', event => {
  if (!isPageHistoryTarget(event.target)) return;
  if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
    event.preventDefault(); editPageHistory(event.inputType === 'historyUndo' ? 'undo' : 'redo'); return;
  }
  capturePageSelection();
}, true);
document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (!(event.ctrlKey || event.metaKey) || event.altKey || !['z', 'y'].includes(key)) return;
  const direction = key === 'y' || event.shiftKey ? 'redo' : 'undo';
  if (isPageHistoryTarget(event.target)) {
    event.preventDefault(); event.stopImmediatePropagation(); editPageHistory(direction);
  } else if (event.ctrlKey && event.target.closest('input:not([type=checkbox]):not([type=file]), textarea, [contenteditable="true"]')) {
    event.preventDefault(); event.stopImmediatePropagation(); document.execCommand(direction);
  }
}, true);
window.notebook.onHistory(direction => {
  if (isPageHistoryTarget()) editPageHistory(direction);
  else document.execCommand(direction);
});
