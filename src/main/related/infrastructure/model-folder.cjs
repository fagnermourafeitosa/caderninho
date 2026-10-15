// The model folder under userData: its size, whether every model file is there, and its removal.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../domain/model.cjs');

function folderBytes(directory) {
  let total = 0;
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) total += folderBytes(target);
    else if (entry.isFile()) total += fs.statSync(target).size;
  }
  return total;
}

function modelFolder(cacheDir) {
  return {
    info: () => ({ bytes: folderBytes(cacheDir), complete: config.modelFiles.every(file => fs.existsSync(path.join(cacheDir, config.model, file))) }),
    remove: () => fs.rmSync(cacheDir, { recursive: true, force: true }),
  };
}

module.exports = { modelFolder };
