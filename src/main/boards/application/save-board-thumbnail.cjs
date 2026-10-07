// Command: saveBoardThumbnail({ noteId, png }) -> null
const { parseThumbnail } = require('../domain/board-image.cjs');
const { NOT_FOUND } = require('./open-board.cjs');

function saveBoardThumbnail(repository) {
  return ({ noteId, png }) => {
    const page = repository.page(noteId);
    if (!page || page.trashed) throw new Error(NOT_FOUND);
    repository.saveThumbnail(noteId, parseThumbnail(png));
    return null;
  };
}

module.exports = { saveBoardThumbnail };
