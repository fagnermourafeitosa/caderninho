// Translate keyboard gestures in the note or a task editor into the existing editor formatting commands.
document.addEventListener('keydown', event => {
  const command = { b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()];
  const editor = event.target.closest?.('.task-editor') || $('#note-body');
  if (!command || !(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing || event.defaultPrevented) return;
  if ((!editor?.classList.contains('task-editor') && (view !== 'notes' || !currentNote())) || !editor?.contains(event.target)) return;
  if (event.target.closest(RICH_EDITOR_FIELDS)) return;
  if (editor.tagName !== 'TEXTAREA' && !event.target.isContentEditable) return;
  ensureRichEditor();
  const selection = getSelection();
  if (!selection.rangeCount) return;
  if (!editorHost().contains(selection.anchorNode) || !editorHost().contains(selection.focusNode)) return;
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
