// Which effects a due reminder triggers for the chosen alert mode.
const WITH_SOUND = new Set(['sound-and-notification', 'sound']);
const WITH_NOTIFICATION = new Set(['sound-and-notification', 'notification']);

// The player takes a linear factor where 1 is the file's normal level.
const alertSound = (preferences, soundFile) => ({ file: soundFile(preferences.alertSound), volume: preferences.alertVolume / 100 });

const alertPlan = (preferences, soundFile) => ({
  sound: WITH_SOUND.has(preferences.alertMode) ? alertSound(preferences, soundFile) : null,
  notification: WITH_NOTIFICATION.has(preferences.alertMode),
});

module.exports = { alertPlan, alertSound };
