// Composition of the Boards context: adapters wired into the use cases the IPC layer calls.
const { SqliteBoardRepository } = require('./infrastructure/sqlite-board-repository.cjs');
const { mediaBoardFiles } = require('./infrastructure/media-board-files.cjs');
const { openBoard } = require('./application/open-board.cjs');
const { saveBoard } = require('./application/save-board.cjs');
const { readBoardFile } = require('./application/read-board-file.cjs');
const { attachBoardImage } = require('./application/attach-board-image.cjs');
const { saveBoardThumbnail } = require('./application/save-board-thumbnail.cjs');
const { readBoardThumbnail } = require('./application/read-board-thumbnail.cjs');
const { exportBoard } = require('./application/export-board.cjs');

// exportTarget is read on every export so an external harness can replace it.
function createBoardUseCases({ store, media, events, exportTarget }) {
  const repository = new SqliteBoardRepository(store), files = mediaBoardFiles(media);
  return {
    open: openBoard(repository),
    save: saveBoard(repository, events),
    file: readBoardFile(repository, files),
    attachImage: attachBoardImage(repository, files, events),
    thumbnail: saveBoardThumbnail(repository),
    readThumbnail: readBoardThumbnail(repository),
    export: input => exportBoard(repository, exportTarget())(input),
  };
}

module.exports = { createBoardUseCases };
