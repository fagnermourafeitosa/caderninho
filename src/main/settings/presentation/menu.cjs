// Settings entries of the native menu: "Ajustes…" in the app menu and "Manter na Frente" in the Window menu.
const settingsMenuItem = send => ({ label: 'Ajustes…', accelerator: 'CommandOrControl+,', click: () => send('open-settings') });

// The standard Window menu plus the keep-on-top check; the check mirrors the stored choice.
const windowMenu = (keepOnTop, setKeepOnTop) => ({
  label: 'Janela',
  role: 'window',
  submenu: [
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { label: 'Manter na Frente', type: 'checkbox', checked: keepOnTop, click: item => setKeepOnTop(item.checked) },
    { type: 'separator' },
    { role: 'front' },
  ],
});

// A menu click already flipped its own check; when saving fails, redraw the menu so the check shows the stored value again.
const menuSettingChange = ({ update, onUpdated, report, rebuild }) => changes => {
  try { onUpdated(update(changes)); }
  catch (error) { report(error); rebuild(); }
};

module.exports = { settingsMenuItem, windowMenu, menuSettingChange };
