// Command: play the saved sound at the saved volume so the user hears what a reminder will play.
const { alertSound } = require('../domain/alert-plan.cjs');

const testAlertSound = (read, catalog, player) => () => {
  player.play(alertSound(read().preferences, id => catalog.file(id)));
  return true;
};

module.exports = { testAlertSound };
