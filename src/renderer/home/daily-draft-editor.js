// Home daily note (spec 012): one note per notebook per day, created on the first typed character and
// saved as the user types. It uses the shared editor instance (blocks, slash menu, formatting, tables).
const DRAFT_SAVE_MS = 400;
let homeDraft = null;
function homeDraftSection() {
  return homeStrip('draft', { icon: 'edit', label: 'Nota do dia' }, '', '<div id="home-draft-editor"></div>', 'daily-section home-card home-draft');
}
function renderHomeDraft() {
  const host = $('#home-draft-strip'); if (!host) return;
  if (homeDraft) { homeDraft.session.destroy(); saveHomeDraft(homeDraft); }
  host.innerHTML = homeDraftSection(); bindHomeStrips(host);
  const { day, noteId } = state.dailyDraft, note = noteId ? state.notes.find(item => item.id === noteId && !item.trashed) : null;
  const doc = note ? note.editorDoc || pageDocument.fromPlain(note.body || '') : [];
  const draft = { noteId: note?.id || null, notebookId: state.activeNotebook, day, doc: null, timer: null, starting: null, saving: Promise.resolve() };
  draft.session = createTaskEditor($('#home-draft-editor'), {
    doc, label: 'Nota do dia', placeholder: 'O que você quer registrar hoje?',
    onChange: next => { draft.doc = next; quietHomeGraph(); clearTimeout(draft.timer); draft.timer = setTimeout(() => saveHomeDraft(draft), DRAFT_SAVE_MS); },
    attachImages: async () => { throw new Error('Para adicionar imagens, abra a nota.'); },
  });
  homeDraft = draft;
}
// The first non-empty save starts the daily note; later saves update it. Saves run one after another.
function saveHomeDraft(draft) {
  clearTimeout(draft.timer); draft.timer = null;
  const doc = draft.doc; if (!doc) return draft.saving;
  draft.doc = null;
  draft.saving = draft.saving.then(async () => {
    if (!draft.noteId) {
      if (!pageDocument.text(doc).trim()) return;
      try { const started = await window.notebook.dailyDraftStart(draft.notebookId); draft.noteId = started.noteId; state = started.state; }
      catch (error) { draft.doc = draft.doc || doc; toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); return; }
    }
    await action('note:update', { id: draft.noteId, body: pageDocument.text(doc), editorDoc: doc }, { history: false });
  });
  return draft.saving;
}
const homeDraftPending = () => Boolean(homeDraft && (homeDraft.timer || homeDraft.doc));
function flushHomeDraft() { return homeDraft ? saveHomeDraft(homeDraft) : Promise.resolve(); }
// Closing the window or quitting waits for the daily note's pending save, then closes again.
window.addEventListener('beforeunload', event => {
  if (!homeDraftPending()) return;
  event.preventDefault(); event.returnValue = false;
  flushHomeDraft().then(() => { if (!homeDraftPending()) window.close(); });
});
