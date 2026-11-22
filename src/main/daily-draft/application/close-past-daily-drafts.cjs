// Command: closePastDailyDrafts() -> { trashed: noteId[] }
// Spec 017: every empty daily note of a past day, in every notebook, goes to the trash in one transaction.
// Today's daily note is never touched.
const { isEmptyDailyNote } = require('../domain/daily-draft.cjs');

function closePastDailyDrafts(repository) {
  return () => repository.transaction(() => {
    const empty = repository.pastDrafts(repository.today()).filter(isEmptyDailyNote);
    empty.forEach(draft => repository.trash(draft));
    return { trashed: empty.map(draft => draft.noteId) };
  });
}

module.exports = { closePastDailyDrafts };
