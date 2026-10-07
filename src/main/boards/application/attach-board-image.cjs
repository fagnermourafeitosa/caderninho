// Command: attachBoardImage({ noteId, fileId, mime, dataURL }) -> { fileId }
const { parseBoardImage } = require('../domain/board-image.cjs');
const { NOT_FOUND } = require('./open-board.cjs');

function attachBoardImage(repository, media, events) {
  return ({ noteId, fileId, mime, dataURL }) => {
    const page = repository.page(noteId);
    if (!page || page.trashed) throw new Error(NOT_FOUND);
    const image = parseBoardImage({ mime, dataURL });
    const { blobId } = media.put(image.bytes, image.mime);
    repository.attachFile(noteId, fileId, blobId);
    events.boardImageAttached({ noteId, fileId, blobId });
    return { fileId };
  };
}

module.exports = { attachBoardImage };
