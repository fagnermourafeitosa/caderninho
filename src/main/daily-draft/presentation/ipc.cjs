// Daily draft IPC: start today's daily note, and close past days (spec 017). Each answers with the new snapshot.
const NOTEBOOK_ERROR = 'Caderno inválido.';
const REQUEST_ERROR = 'Requisição inválida.';
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const CHANNELS = ['daily-draft:start', 'daily-draft:close-past-days'];

function registerDailyDraft(ipcMain, { getWindow, useCases, state }) {
  ipcMain.handle('daily-draft:start', async (event, notebookId) => {
    if (event.sender !== getWindow()?.webContents) throw new Error(NOTEBOOK_ERROR);
    if (typeof notebookId !== 'string' || !ID.test(notebookId)) throw new Error(NOTEBOOK_ERROR);
    return { ...useCases.startDailyDraft({ notebookId }), state: state() };
  });
  // No payload: the main process decides which days are past and which notes are empty.
  ipcMain.handle('daily-draft:close-past-days', async (event, payload) => {
    if (event.sender !== getWindow()?.webContents || payload !== undefined) throw new Error(REQUEST_ERROR);
    return { ...useCases.closePastDailyDrafts(), state: state() };
  });
}

module.exports = { registerDailyDraft, CHANNELS };
