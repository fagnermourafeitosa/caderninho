// Isolated environment for driving the real app: the app itself has no test mode.
const { app, ipcMain } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Must run before the app requests its single-instance lock and opens SQLite.
// Chromium writes profile files after the process exits, so each run removes the previous runs' sandboxes;
// smoke runs are sequential (see AGENTS.md).
function isolateUserData(prefix) {
  for (const entry of fs.readdirSync(os.tmpdir())) if (entry.startsWith(prefix)) fs.rmSync(path.join(os.tmpdir(), entry), { recursive: true, force: true });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  app.setPath('userData', directory);
  return directory;
}

// Uncaught renderer errors, including those thrown while the page loads, exposed to scenarios as window.smokeErrors.
function trackRendererErrors() {
  const early = new WeakMap();
  app.on('web-contents-created', (_event, contents) => {
    const errors = [];
    early.set(contents, errors);
    contents.on('console-message', event => { if (event.level === 'error' && event.message.startsWith('Uncaught')) errors.push(event.message); });
  });
  return contents => {
    const errors = early.get(contents) || [];
    contents.removeAllListeners('console-message');
    return contents.executeJavaScript(`window.smokeErrors = ${JSON.stringify(errors)};
      window.addEventListener('error', event => window.smokeErrors.push(event.message));
      window.addEventListener('unhandledrejection', event => window.smokeErrors.push(String(event.reason)));`);
  };
}

// The app reads the desktop cursor; resize scenarios send the pointer they simulate over IPC.
// Move scenarios send no coordinates, so the window sees a still pointer, as with an idle mouse.
function scriptedCursor() {
  let point = { x: 0, y: 0 };
  ipcMain.prependListener('notebook:resize', (_event, _phase, input) => {
    if (Number.isFinite(input?.x) && Number.isFinite(input?.y)) point = { x: input.x, y: input.y };
  });
  return () => point;
}

module.exports = { isolateUserData, trackRendererErrors, scriptedCursor };
