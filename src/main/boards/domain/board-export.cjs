// What an export may carry: a PNG data URL or SVG markup, bounded in size, with a short file name.
const EXPORT_ERROR = 'Exportação inválida.';
const MAX_BYTES = 50 * 1024 * 1024, MAX_NAME = 160;
const PNG_PREFIX = 'data:image/png;base64,';

function parseExport({ format, name, data }) {
  if (typeof name !== 'string' || name.length > MAX_NAME || typeof data !== 'string') throw new Error(EXPORT_ERROR);
  if (format === 'svg') {
    if (!data.startsWith('<svg') || Buffer.byteLength(data) > MAX_BYTES) throw new Error(EXPORT_ERROR);
    return { format, name, bytes: Buffer.from(data, 'utf8') };
  }
  if (format !== 'png' || !data.startsWith(PNG_PREFIX) || data.length - PNG_PREFIX.length > Math.ceil(MAX_BYTES / 3) * 4) throw new Error(EXPORT_ERROR);
  const bytes = Buffer.from(data.slice(PNG_PREFIX.length), 'base64');
  if (!bytes.length) throw new Error(EXPORT_ERROR);
  return { format, name, bytes };
}

module.exports = { parseExport, EXPORT_ERROR };
