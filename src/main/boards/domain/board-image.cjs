// A board image as the renderer sends it: a base64 data URL of an allowed raster type.
const IMAGE_ERROR = 'Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.';
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_BYTES = 15 * 1024 * 1024;
// Base64 needs 4 characters for every 3 bytes; longer strings are refused before decoding.
const MAX_BASE64 = Math.ceil(MAX_BYTES / 3) * 4;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function parseBoardImage({ mime, dataURL }) {
  if (!MIME_TYPES.has(mime) || typeof dataURL !== 'string') throw new Error(IMAGE_ERROR);
  const prefix = `data:${mime};base64,`;
  const payload = dataURL.startsWith(prefix) ? dataURL.slice(prefix.length) : '';
  if (!payload || payload.length > MAX_BASE64 || !BASE64.test(payload)) throw new Error(IMAGE_ERROR);
  const bytes = Buffer.from(payload, 'base64');
  if (bytes.length > MAX_BYTES) throw new Error(IMAGE_ERROR);
  return { mime, bytes };
}

const THUMBNAIL_ERROR = 'Miniatura inválida.';
const MAX_THUMBNAIL = 256 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Thumbnails are small PNG previews for the board index.
function parseThumbnail(dataURL) {
  let image;
  try { image = parseBoardImage({ mime: 'image/png', dataURL }); } catch { throw new Error(THUMBNAIL_ERROR); }
  if (image.bytes.length > MAX_THUMBNAIL || !PNG_SIGNATURE.every((byte, index) => image.bytes[index] === byte)) throw new Error(THUMBNAIL_ERROR);
  return image.bytes;
}

module.exports = { parseBoardImage, parseThumbnail, IMAGE_ERROR, THUMBNAIL_ERROR };
