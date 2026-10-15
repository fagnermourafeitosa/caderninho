// Daily draft IPC: validate the notebook id, start today's daily note, answer with it and the new snapshot.
const NOTEBOOK_ERROR = 'Caderno inválido.';
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const CHANNELS = ['daily-draft:start'];

function registerDailyDraft(ipcMain, { getWindow, useCases, state }) {
  ipcMain.handle('daily-draft:start', async (event, notebookId) => {
    if (event.sender !== getWindow()?.webContents) throw new Error(NOTEBOOK_ERROR);
    if (typeof notebookId !== 'string' || !ID.test(notebookId)) throw new Error(NOTEBOOK_ERROR);
    return { ...useCases.startDailyDraft({ notebookId }), state: state() };
  });
}

module.exports = { registerDailyDraft, CHANNELS };
