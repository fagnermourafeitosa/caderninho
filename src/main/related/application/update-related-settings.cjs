// Command: validate and store the changed related preferences, apply the on/off switch, answer with the current settings.
const { validChanges } = require('../domain/preferences.cjs');

const updateRelatedSettings = ({ repository, scheduler, engine, read }) => changes => {
  repository.savePreferences(validChanges(changes));
  if (Object.hasOwn(changes, 'enabled') && changes.enabled !== scheduler.enabled) {
    scheduler.setEnabled(changes.enabled);
    // Turning off ends the worker: no model download, no inference.
    if (!changes.enabled) engine.stop();
  }
  return read();
};

module.exports = { updateRelatedSettings };
