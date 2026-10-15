// Preferences: the user's alert and window choices, with their defaults.
const DEFAULTS = Object.freeze({ alertMode: 'sound-and-notification', alertSound: 'caderninho', alertVolume: 100, keepOnTop: false });

const INVALID = 'Ajuste inválido.';
const ALERT_MODES = Object.freeze(['sound-and-notification', 'sound', 'notification']);
// The volume floor keeps "sound only" from ever being silent.
const MIN_VOLUME = 10, MAX_VOLUME = 100;

const RULES = {
  alertMode: value => ALERT_MODES.includes(value),
  alertSound: (value, knownSound) => typeof value === 'string' && knownSound(value),
  alertVolume: value => Number.isInteger(value) && value >= MIN_VOLUME && value <= MAX_VOLUME,
  keepOnTop: value => typeof value === 'boolean',
};

// Accepts only known fields with valid values; otherwise nothing is changed.
function validChanges(changes, knownSound) {
  for (const [field, value] of Object.entries(changes)) if (!RULES[field]?.(value, knownSound)) throw new Error(INVALID);
  return changes;
}

// Stored values fill the defaults; a sound the catalog no longer has reads as the bundled alarm.
function preferences(stored, knownSound) {
  const merged = { ...DEFAULTS, ...stored };
  if (!knownSound(merged.alertSound)) merged.alertSound = DEFAULTS.alertSound;
  return merged;
}

module.exports = { DEFAULTS, ALERT_MODES, INVALID, MIN_VOLUME, MAX_VOLUME, preferences, validChanges };
