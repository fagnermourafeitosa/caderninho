// Related preferences: on/off, how many pages and how strict the match is.
const config = require('./model.cjs');

const DEFAULTS = Object.freeze({ enabled: true, limit: config.limit, sensitivity: 'balanced' });
// Thresholds per level; 0.40 was calibrated against PT-BR notes (see model.cjs).
const SENSITIVITY = Object.freeze({ broad: 0.35, balanced: 0.40, strict: 0.48 });

const INVALID = 'Ajuste inválido.';
const MIN_LIMIT = 3, MAX_LIMIT = 12;
const RULES = {
  enabled: value => typeof value === 'boolean',
  limit: value => Number.isInteger(value) && value >= MIN_LIMIT && value <= MAX_LIMIT,
  sensitivity: value => Object.hasOwn(SENSITIVITY, value),
};

const preferences = stored => ({ ...DEFAULTS, ...stored });
// Accepts only known fields with valid values; otherwise nothing is changed.
function validChanges(changes) {
  for (const [field, value] of Object.entries(changes)) if (!RULES[field]?.(value)) throw new Error(INVALID);
  return changes;
}
// The ranking configuration for the chosen preferences.
const rankingConfig = prefs => ({ ...config, limit: prefs.limit, threshold: SENSITIVITY[prefs.sensitivity] });

module.exports = { DEFAULTS, SENSITIVITY, INVALID, MIN_LIMIT, MAX_LIMIT, preferences, rankingConfig, validChanges };
