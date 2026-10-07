// The shared media store as the boards' MediaStorePort: same SHA-256 dedup as note media.
const fs = require('node:fs');

function mediaBoardFiles(media) {
  return {
    // The media store normalises every raster to PNG, so a board image and the same image in a note share one blob.
    put: bytes => ({ blobId: media.image(bytes) }),
    read(blobId) {
      const file = media.file(blobId);
      if (!file || !fs.existsSync(file)) return null;
      const row = media.store.db.prepare('SELECT mime FROM media_blobs WHERE id=?').get(blobId);
      return { bytes: fs.readFileSync(file), mime: row.mime };
    },
  };
}

module.exports = { mediaBoardFiles };
