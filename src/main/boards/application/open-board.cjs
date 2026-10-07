// Query: openBoard({ noteId }) -> { noteId, version, scene, files: [{ fileId, mime }] }
const NOT_FOUND = 'Quadro não encontrado.';

function openBoard(repository) {
  return ({ noteId }) => {
    const board = repository.page(noteId) && repository.load(noteId);
    if (!board) throw new Error(NOT_FOUND);
    return { noteId, version: board.version, scene: board.scene, files: repository.files(noteId).map(({ fileId, mime }) => ({ fileId, mime })) };
  };
}

module.exports = { openBoard, NOT_FOUND };
