// Home daily note (spec 012): one note per notebook per day, created on the first typed character and
// saved as the user types. It uses the shared editor instance (blocks, slash menu, formatting, tables).
const DRAFT_SAVE_MS = 400;
let homeDraft = null;
// The header link opens the daily note page; it stays visible, disabled until the first character creates the note.
function homeDraftSection(noteId) {
  const open = `<button type="button" class="daily-link" data-home-draft-open ${noteId ? '' : 'disabled'}>Ir para nota →</button>`;
  return homeStrip('draft', { icon: 'edit', label: 'Nota do dia' }, open, '<div id="home-draft-editor"></div>', 'daily-section home-card home-draft');
}
async function openHomeDraft() {
  await flushHomeDraft();
  if (homeDraft?.noteId && await action('note:select', { id: homeDraft.noteId })) { view = state.activeView; render(); }
}
function renderHomeDraft() {
  const host = $('#home-draft-strip'); if (!host) return;
  if (homeDraft) { homeDraft.session.destroy(); saveHomeDraft(homeDraft); }
  const { day, noteId } = state.dailyDraft, note = noteId ? state.notes.find(item => item.id === noteId && !item.trashed) : null;
  host.innerHTML = homeDraftSection(note?.id); bindHomeStrips(host);
  host.querySelector('[data-home-draft-open]').onclick = openHomeDraft;
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
      try { const started = await window.notebook.dailyDraftStart(draft.notebookId); draft.noteId = started.noteId; state = started.state; enableHomeDraftLink(); }
      catch (error) { draft.doc = draft.doc || doc; toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); return; }
    }
    await action('note:update', { id: draft.noteId, body: pageDocument.text(doc), editorDoc: doc }, { history: false });
  });
  return draft.saving;
}
function enableHomeDraftLink() { const link = $('#home-draft-strip [data-home-draft-open]'); if (link) link.disabled = false; }
const homeDraftPending = () => Boolean(homeDraft && (homeDraft.timer || homeDraft.doc));
function flushHomeDraft() { return homeDraft ? saveHomeDraft(homeDraft) : Promise.resolve(); }
// Closing the window or quitting waits for the daily note's pending save, then closes again.
window.addEventListener('beforeunload', event => {
  if (!homeDraftPending()) return;
  event.preventDefault(); event.returnValue = false;
  flushHomeDraft().then(() => { if (!homeDraftPending()) window.close(); });
});
