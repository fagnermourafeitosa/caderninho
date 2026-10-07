// Validates where a task created from a note came from (implements NoteSourcePort).
const { safeOrigin } = require('../../source-actions.cjs');
const SOURCE_ERROR = 'Selecione o trecho novamente.';

function noteSources(store) {
  return {
    // A selection or media keeps the margin origin shape; "line" is a task line typed with [].
    origin(source) {
      if (!source || typeof source !== 'object' || typeof source.noteId !== 'string') throw new Error(SOURCE_ERROR);
      const note = store.note(source.noteId, 'notes');
      if (note.trashed) throw new Error('Restaure a nota primeiro.');
      if (source.origin?.kind === 'line') return { noteId: note.id, origin: { kind: 'line' } };
      return { noteId: note.id, origin: safeOrigin(store, note, source.origin) };
    },
  };
}

module.exports = { noteSources };
