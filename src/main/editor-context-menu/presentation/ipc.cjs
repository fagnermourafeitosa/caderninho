const INVALID = 'Pedido de menu inválido.';

function parseContextMenuRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof payload.hasSelection !== 'boolean') throw new Error(INVALID);
  return { hasSelection: payload.hasSelection };
}

// editor:context-menu — { hasSelection: boolean } -> 'task' | 'reminder' | null, only from the main window.
function registerEditorContextMenu(ipcMain, { getWindow, open }) {
  ipcMain.handle('editor:context-menu', async (event, payload) => {
    if (event.sender !== getWindow()?.webContents) throw new Error(INVALID);
    return open(parseContextMenuRequest(payload));
  });
}

module.exports = { parseContextMenuRequest, registerEditorContextMenu };
