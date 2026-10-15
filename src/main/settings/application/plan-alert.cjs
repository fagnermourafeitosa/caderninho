// Query: what a due reminder does with the saved alert settings.
// The reminder is already marked as fired, so a failed read falls back to the defaults instead of losing the alert.
const { alertPlan } = require('../domain/alert-plan.cjs');
const { DEFAULTS } = require('../domain/preferences.cjs');

const planAlert = (read, catalog, log = message => console.error(message)) => () => {
  let preferences;
  try { preferences = read().preferences; }
  catch (error) { log(`Ajustes de alerta: ${error.message}`); preferences = DEFAULTS; }
  return alertPlan(preferences, id => catalog.file(id));
};

module.exports = { planAlert };
