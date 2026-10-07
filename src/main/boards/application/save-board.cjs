// Command: saveBoard({ noteId, baseVersion, scene }) -> { version, updated }
const { acceptSave } = require('../domain/board.cjs');
const { NOT_FOUND } = require('./open-board.cjs');

function saveBoard(repository, events) {
  return ({ noteId, baseVersion, scene }) => {
    const page = repository.page(noteId), board = page && !page.trashed && repository.load(noteId);
    if (!board) throw new Error(NOT_FOUND);
    const next = acceptSave(board, { baseVersion, scene });
    const { updated } = repository.save(next);
    events.boardSaved({ noteId, version: next.version });
    return { version: next.version, updated };
  };
}

module.exports = { saveBoard };
