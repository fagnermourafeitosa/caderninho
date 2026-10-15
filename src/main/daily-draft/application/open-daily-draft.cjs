// Query: openDailyDraft({ notebookId }) -> { day, noteId | null }
const { currentNote } = require('../domain/daily-draft.cjs');

function openDailyDraft(repository) {
  return ({ notebookId }) => {
    const day = repository.today();
    return { day, noteId: currentNote(repository.find(notebookId, day)) };
  };
}

module.exports = { openDailyDraft };
