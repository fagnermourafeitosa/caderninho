// Command: put quantity and sensitivity back to their defaults; the on/off switch stays as it is.
const { DEFAULTS } = require('../domain/preferences.cjs');

const resetRelatedRanking = ({ repository, read }) => () => {
  repository.savePreferences({ limit: DEFAULTS.limit, sensitivity: DEFAULTS.sensitivity });
  return read();
};

module.exports = { resetRelatedRanking };
