// Command: startDailyDraft({ notebookId }) -> { day, noteId }
// Runs on the first typed character. A live daily note is reused; otherwise one note and its mapping
// are created in one transaction, without selecting the note or changing the view.
const { currentNote } = require('../domain/daily-draft.cjs');

function startDailyDraft(repository) {
  return ({ notebookId }) => repository.transaction(() => {
    repository.notebook(notebookId);
    const day = repository.today(), live = currentNote(repository.find(notebookId, day));
    if (live) return { day, noteId: live };
    const noteId = repository.createNote(notebookId);
    repository.save(notebookId, day, noteId);
    return { day, noteId };
  });
}

module.exports = { startDailyDraft };
