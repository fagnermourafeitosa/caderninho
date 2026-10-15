// Opens the Notifications pane of macOS System Settings; the address is fixed, nothing comes from the renderer.
const NOTIFICATIONS_PANE = 'x-apple.systempreferences:com.apple.Notifications-Settings.extension';
const OPEN_FAILED = 'Não foi possível abrir os Ajustes do Sistema.';

function macosNotificationSettings({ openExternal, log = console.error }) {
  return {
    async open() {
      try { await openExternal(NOTIFICATIONS_PANE); }
      catch (error) { log(`Ajustes de notificação: ${error.message}`); throw new Error(OPEN_FAILED); }
    },
  };
}

module.exports = { macosNotificationSettings };
