// Editor context menu: the two page-linked actions, then the native editing items.

/** @typedef {'task'|'reminder'} ContextMenuAction */
/** @typedef {{ id: ContextMenuAction, label: string, enabled: boolean } | { role: 'cut'|'copy'|'paste'|'selectAll', label: string } | { type: 'separator' }} ContextMenuItem */
/** @typedef {{ present(items: ContextMenuItem[]): Promise<ContextMenuAction|null> }} ContextMenuPresenterPort */

const ACTIONS = [{ id: 'task', label: 'Tarefa' }, { id: 'reminder', label: 'Lembrete' }];
const EDITING = [{ role: 'cut', label: 'Recortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Colar' }, { role: 'selectAll', label: 'Selecionar tudo' }];

// Actions start from a passage, so they are enabled only when one is selected.
function contextMenuItems({ hasSelection }) {
  return [...ACTIONS.map(action => ({ ...action, enabled: hasSelection === true })), { type: 'separator' }, ...EDITING.map(item => ({ ...item }))];
}
const isContextMenuAction = value => ACTIONS.some(action => action.id === value);

module.exports = { contextMenuItems, isContextMenuAction };
