// Command: post one notification, so the user sees it arrive and macOS lists Caderninho in its notification settings.
const UNAVAILABLE = 'Notificações não estão disponíveis neste Mac.';
const TEST = Object.freeze({ title: 'Caderninho', body: 'As notificações do Caderninho estão funcionando.' });

const testNotification = notifications => () => {
  if (!notifications.supported()) throw new Error(UNAVAILABLE);
  notifications.show({ ...TEST });
  return true;
};

module.exports = { testNotification };
