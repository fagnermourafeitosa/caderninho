// Native macOS popup for the editor context menu (implements ContextMenuPresenterPort).
function nativeContextMenuPresenter(Menu, getWindow) {
  return {
    present(items) {
      const window = getWindow();
      if (!window || window.isDestroyed()) return Promise.reject(new Error('Janela indisponível.'));
      return new Promise(resolve => {
        // An item click runs before the close callback; the first answer wins.
        let settled = false;
        const settle = value => { if (!settled) { settled = true; resolve(value); } };
        const template = items.map(item => item.id ? { label: item.label, enabled: item.enabled, click: () => settle(item.id) } : item.role ? { role: item.role, label: item.label } : { type: 'separator' });
        Menu.buildFromTemplate(template).popup({ window, callback: () => settle(null) });
      });
    },
  };
}

module.exports = { nativeContextMenuPresenter };
