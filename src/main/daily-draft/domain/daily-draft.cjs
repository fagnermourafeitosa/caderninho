// Daily draft: the note the home page edits for one notebook on one day.
// A mapping to a trashed or missing note leaves the day blank; the next character starts another note.
const currentNote = entry => (entry && !entry.trashed ? entry.noteId : null);
// Spec 017: a past daily note with no title, a blank body and no active media card is empty.
const isEmptyDailyNote = ({ title, body, media }) => !title.trim() && !body.trim() && media === 0;

module.exports = { currentNote, isEmptyDailyNote };
