// Daily draft: the note the home page edits for one notebook on one day.
// A mapping to a trashed or missing note leaves the day blank; the next character starts another note.
const currentNote = entry => (entry && !entry.trashed ? entry.noteId : null);

module.exports = { currentNote };
