// Window placement: "floating" stays above normal windows but not above full-screen apps.
function electronWindowPlacement(getWindow) {
  return {
    setKeepOnTop(on) {
      const win = getWindow();
      if (!win || win.isDestroyed()) return;
      if (on) win.setAlwaysOnTop(true, 'floating'); else win.setAlwaysOnTop(false);
    },
  };
}

module.exports = { electronWindowPlacement };
