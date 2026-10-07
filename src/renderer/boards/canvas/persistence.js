// One board save: attach new image files, send the scene with its base version, then maybe a thumbnail.
const THUMBNAIL_INTERVAL = 5000;

function createBoardPersistence({ api, noteId, version, attached, getState, thumbnail, now = Date.now, onSaved = () => {}, onRejectedFile = () => {}, onThumbnailError = error => console.error('Miniatura do quadro:', error) }) {
  const known = new Set(attached);
  let baseVersion = version, lastThumbnail = -Infinity;
  async function attachNew(elements, files) {
    const wanted = new Set(elements.filter(element => element.type === 'image' && element.fileId && !known.has(element.fileId)).map(element => element.fileId));
    for (const fileId of wanted) {
      const file = files[fileId];
      if (!file?.dataURL) continue;
      try { await api.boardAttachImage({ noteId, fileId, mime: file.mimeType, dataURL: file.dataURL }); known.add(fileId); }
      catch (error) { onRejectedFile(fileId, error); }
    }
  }
  async function sendThumbnail() {
    if (now() - lastThumbnail < THUMBNAIL_INTERVAL) return;
    lastThumbnail = now();
    try { const png = await thumbnail(); if (png) await api.boardThumbnail({ noteId, png }); }
    catch (error) { onThumbnailError(error); }
  }
  return {
    version: () => baseVersion,
    async persist() {
      const { elements, viewport, files } = getState();
      await attachNew(elements, files);
      // An image whose bytes are not attached yet waits for a later save instead of failing this one.
      const saveable = elements.filter(element => element.type !== 'image' || known.has(element.fileId));
      const result = await api.boardSave({ noteId, baseVersion, scene: { elements: saveable, viewport } });
      baseVersion = result.version;
      onSaved(result);
      await sendThumbnail();
    },
  };
}

module.exports = { createBoardPersistence, THUMBNAIL_INTERVAL };
