// Query: the current preferences and the sounds the user can choose from.
const { preferences } = require('../domain/preferences.cjs');

const readSettings = (repository, catalog) => () => ({
  preferences: preferences(repository.read(), id => Boolean(catalog.file(id))),
  sounds: catalog.list(),
});

module.exports = { readSettings };
