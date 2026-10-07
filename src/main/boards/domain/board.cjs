// Board aggregate: a scene versioned for optimistic concurrency, plus the image files it references.
const { normalizeScene, INVALID } = require('./scene.cjs');
const { sceneText } = require('./scene-text.cjs');
const STALE = 'O quadro mudou em outra janela. Recarregue.';

/** @typedef {{ noteId: string, version: number, scene: { elements: object[], viewport: object }, fileIds: string[] }} Board */

// Returns the next board state with its extracted text, or throws when the save cannot be accepted.
function acceptSave(board, { baseVersion, scene }) {
  if (baseVersion !== board.version) throw new Error(STALE);
  const next = normalizeScene(scene);
  const attached = new Set(board.fileIds);
  const referenced = [...new Set(next.elements.filter(element => element.type === 'image').map(element => element.fileId))];
  if (referenced.some(fileId => !attached.has(fileId))) throw new Error(INVALID);
  return { noteId: board.noteId, version: board.version + 1, scene: next, fileIds: referenced, text: sceneText(next.elements) };
}

module.exports = { acceptSave, STALE };
