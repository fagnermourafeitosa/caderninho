// Task image files under userData/pipelines/<pipelineId>/ (implements PipelineImageStorePort).
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const FILE = /^\d{2,}-[A-Za-z0-9_-]+\.(png|jpg|gif|webp)$/;

function pipelineImageFiles(directory) {
  const root = path.join(directory, 'pipelines');
  // Ids and names are checked again here: nothing outside the pipeline folder is ever touched.
  const folder = pipelineId => { if (!ID.test(pipelineId)) throw new Error('Pipeline inválido.'); return path.join(root, pipelineId); };
  const file = (pipelineId, name) => { if (!FILE.test(name)) throw new Error('Arquivo inválido.'); return path.join(folder(pipelineId), name); };
  return {
    path: file,
    write(pipelineId, name, bytes) {
      fs.mkdirSync(folder(pipelineId), { recursive: true, mode: 0o700 });
      const target = file(pipelineId, name), temporary = `${target}.${randomUUID()}.tmp`;
      try { fs.writeFileSync(temporary, bytes, { mode: 0o600, flag: 'wx' }); fs.renameSync(temporary, target); }
      finally { fs.rmSync(temporary, { force: true }); }
    },
    remove(pipelineId, name) { fs.rmSync(file(pipelineId, name), { force: true }); },
    // Folders and files on disk, for collecting what SQLite no longer refers to.
    list() {
      if (!fs.existsSync(root)) return [];
      return fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() && ID.test(entry.name))
        .map(entry => ({ pipelineId: entry.name, files: fs.readdirSync(path.join(root, entry.name)) }));
    },
    removeStray(pipelineId, name) { fs.rmSync(path.join(folder(pipelineId), path.basename(name)), { force: true }); },
    removeFolder(pipelineId) { fs.rmSync(folder(pipelineId), { recursive: true, force: true }); },
  };
}

module.exports = { pipelineImageFiles };
