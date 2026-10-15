// Command: open the macOS notification settings, where the user allows Caderninho notifications.
const openNotificationSettings = notificationSettings => async () => {
  await notificationSettings.open();
  return true;
};

module.exports = { openNotificationSettings };
