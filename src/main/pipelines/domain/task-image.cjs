// Task images: accepted formats and the file name inside the pipeline folder ("NN-name.ext").
const IMAGE_ERROR = 'Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.';
const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_BASE64 = Math.ceil(MAX_BYTES / 3) * 4;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_NAME = 80;

function parseImage({ mime, dataURL }) {
  if (!EXTENSIONS[mime] || typeof dataURL !== 'string') throw new Error(IMAGE_ERROR);
  const prefix = `data:${mime};base64,`;
  const payload = dataURL.startsWith(prefix) ? dataURL.slice(prefix.length) : '';
  if (!payload || payload.length > MAX_BASE64 || !BASE64.test(payload)) throw new Error(IMAGE_ERROR);
  const bytes = Buffer.from(payload, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error(IMAGE_ERROR);
  return { mime, bytes };
}

// Keeps letters, digits, "-" and "_" from the original name (without its extension); the
// extension always comes from the validated type, so the name can never escape the folder.
function fileName(number, original, mime) {
  const base = String(original || '').split(/[\\/]/).pop().replace(/\.[^.]*$/, '');
  const safe = base.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, MAX_NAME) || 'imagem';
  return `${String(number).padStart(2, '0')}-${safe}.${EXTENSIONS[mime]}`;
}

function referencedImages(doc) {
  return new Set((Array.isArray(doc) ? doc : []).filter(block => block?.type === 'image').map(block => block.imageId));
}

module.exports = { IMAGE_ERROR, EXTENSIONS, parseImage, fileName, referencedImages };
