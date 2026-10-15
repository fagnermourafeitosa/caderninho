// Composition of the Settings context: adapters wired into the use cases the IPC layer and main process call.
const { SqlitePreferencesRepository } = require('./infrastructure/sqlite-preferences-repository.cjs');
const { readSettings } = require('./application/read-settings.cjs');
const { updateSettings } = require('./application/update-settings.cjs');
const { applyWindowPlacement } = require('./application/apply-window-placement.cjs');
const { planAlert } = require('./application/plan-alert.cjs');
const { testAlertSound } = require('./application/test-alert-sound.cjs');
const { openNotificationSettings } = require('./application/open-notification-settings.cjs');
const { testNotification } = require('./application/test-notification.cjs');

function createSettingsUseCases({ store, catalog, player, window, notificationSettings, notifications }) {
  const repository = new SqlitePreferencesRepository(store);
  const read = readSettings(repository, catalog);
  return {
    readSettings: read,
    updateSettings: updateSettings(repository, catalog, window, read),
    applyWindowPlacement: applyWindowPlacement(read, window),
    planAlert: planAlert(read, catalog),
    testAlertSound: testAlertSound(read, catalog, player),
    testNotification: testNotification(notifications),
    openNotificationSettings: openNotificationSettings(notificationSettings),
  };
}

module.exports = { createSettingsUseCases };
