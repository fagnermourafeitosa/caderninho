// Translate note-body keyboard gestures into the existing editor formatting commands.
document.addEventListener('keydown', event => {
  const command = { b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()];
  const editor = $('#note-body');
  if (!command || !(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing || event.defaultPrevented) return;
  if (view !== 'notes' || !currentNote() || !editor?.contains(event.target)) return;
  if (event.target.closest('#note-body textarea, #note-body input')) return;
  if (editor.tagName !== 'TEXTAREA' && !event.target.isContentEditable) return;
  ensureRichEditor();
  const selection = getSelection();
  if (!selection.rangeCount) return;
  if (!$('#note-body').contains(selection.anchorNode) || !$('#note-body').contains(selection.focusNode)) return;
  event.preventDefault();
  if (selection.isCollapsed) {
    hideEditorMenus();
    formatRange = null;
    document.execCommand(command, false);
  } else {
    formatRange = selection.getRangeAt(0).cloneRange();
    formatSelection(command);
  }
});
