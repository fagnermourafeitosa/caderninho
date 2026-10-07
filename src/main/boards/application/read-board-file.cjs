// Query: readBoardFile({ noteId, fileId }) -> { fileId, mime, dataURL }
const MISSING = 'Imagem não encontrada.';

function readBoardFile(repository, media) {
  return ({ noteId, fileId }) => {
    const file = repository.files(noteId).find(entry => entry.fileId === fileId);
    const blob = file && media.read(file.blobId);
    if (!blob) throw new Error(MISSING);
    return { fileId, mime: blob.mime, dataURL: `data:${blob.mime};base64,${blob.bytes.toString('base64')}` };
  };
}

module.exports = { readBoardFile };
