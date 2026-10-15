// Command: validate and store the changed preferences, apply the window level once stored, answer with the current settings.
const { validChanges } = require('../domain/preferences.cjs');

const updateSettings = (repository, catalog, window, read) => changes => {
  repository.write(validChanges(changes, id => Boolean(catalog.file(id))));
  if (Object.hasOwn(changes, 'keepOnTop')) window.setKeepOnTop(changes.keepOnTop);
  return read();
};

module.exports = { updateSettings };
