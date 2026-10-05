const { contextMenuItems, isContextMenuAction } = require('../domain/context-menu.cjs');

// Shows the menu for a right-click in the note body and returns the chosen action, or null.
function openEditorContextMenu(presenter) {
  return async ({ hasSelection }) => {
    const chosen = await presenter.present(contextMenuItems({ hasSelection }));
    return isContextMenuAction(chosen) ? chosen : null;
  };
}

module.exports = { openEditorContextMenu };
