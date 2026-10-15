// Query: the related preferences and what is known about the local model.
const { preferences } = require('../domain/preferences.cjs');
const { modelInfo } = require('../domain/model-info.cjs');

const readRelatedSettings = ({ repository, folder, status }) => () => ({
  preferences: preferences(repository.preferences()),
  model: modelInfo(folder.info(), status()),
});

module.exports = { readRelatedSettings };
