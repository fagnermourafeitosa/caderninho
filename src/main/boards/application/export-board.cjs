// Command: exportBoard({ noteId, format, name, data }) -> { saved }
const { parseExport } = require('../domain/board-export.cjs');
const { NOT_FOUND } = require('./open-board.cjs');

function exportBoard(repository, target) {
  return async ({ noteId, ...input }) => {
    const file = parseExport(input);
    if (!repository.page(noteId)) throw new Error(NOT_FOUND);
    const destination = await target.choose(file.name, file.format);
    if (!destination) return { saved: false };
    await target.write(destination, file.bytes);
    return { saved: true };
  };
}

module.exports = { exportBoard };
