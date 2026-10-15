// Command: put the window at the stored level (used when a window is created).
const applyWindowPlacement = (read, window) => () => { window.setKeepOnTop(read().preferences.keepOnTop); };

module.exports = { applyWindowPlacement };
