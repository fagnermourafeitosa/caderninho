// Query: readBoardThumbnail({ noteId }) -> { png } | null
const { NOT_FOUND } = require('./open-board.cjs');

function readBoardThumbnail(repository) {
  return ({ noteId }) => {
    if (!repository.page(noteId)) throw new Error(NOT_FOUND);
    const png = repository.thumbnail(noteId);
    return png ? { png: 'data:image/png;base64,' + png.toString('base64') } : null;
  };
}

module.exports = { readBoardThumbnail };
