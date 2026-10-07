// Native save dialog plus atomic file write (implements ExportTargetPort).
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const FILTERS = { png: { name: 'Imagem PNG', extensions: ['png'] }, svg: { name: 'Imagem SVG', extensions: ['svg'] } };

function dialogExportTarget(dialog, getWindow, directory) {
  return {
    async choose(name, format) {
      const base = String(name).replace(/[/\\:]/g, '-').trim() || 'Quadro';
      const result = await dialog.showSaveDialog(getWindow(), { title: 'Exportar quadro', defaultPath: path.join(directory, `${base}.${format}`), filters: [FILTERS[format]], buttonLabel: 'Exportar' });
      if (result.canceled || !result.filePath) return null;
      return result.filePath.toLowerCase().endsWith('.' + format) ? result.filePath : `${result.filePath}.${format}`;
    },
    async write(target, bytes) {
      const temporary = `${target}.${randomUUID()}.tmp`;
      try { await fs.promises.writeFile(temporary, bytes, { flag: 'wx' }); await fs.promises.rename(temporary, target); }
      finally { await fs.promises.rm(temporary, { force: true }); }
    },
  };
}

module.exports = { dialogExportTarget };
