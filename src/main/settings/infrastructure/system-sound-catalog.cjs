// Sound catalog: the bundled alarm plus the .aiff sounds directly inside the macOS sound folder.
// Ids are base names checked against the listing, never paths, so the renderer cannot point at other files.
const fs = require('node:fs');
const path = require('node:path');

const BUNDLED = { id: 'caderninho', label: 'Alarme do Caderninho' };
const NAME = /^[A-Za-z0-9 _-]{1,64}$/;

function systemSounds(directory) {
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return entries
    .filter(entry => entry.isFile() && path.extname(entry.name) === '.aiff')
    .map(entry => path.basename(entry.name, '.aiff'))
    .filter(id => NAME.test(id) && id !== BUNDLED.id)
    .sort((a, b) => a.localeCompare(b));
}

function systemSoundCatalog({ bundledFile, systemDirectory }) {
  const sounds = systemSounds(systemDirectory);
  const known = new Set(sounds);
  return {
    list: () => [BUNDLED, ...sounds.map(id => ({ id, label: id }))],
    file: id => (id === BUNDLED.id ? bundledFile : known.has(id) ? path.join(systemDirectory, `${id}.aiff`) : null),
  };
}

module.exports = { systemSoundCatalog };
