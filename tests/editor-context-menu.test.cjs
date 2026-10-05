const { test } = require('node:test');
const assert = require('node:assert/strict');
const { contextMenuItems, isContextMenuAction } = require('../src/main/editor-context-menu/domain/context-menu.cjs');
const { openEditorContextMenu } = require('../src/main/editor-context-menu/application/open-editor-context-menu.cjs');
const { nativeContextMenuPresenter } = require('../src/main/editor-context-menu/infrastructure/native-context-menu.cjs');
const { parseContextMenuRequest, registerEditorContextMenu } = require('../src/main/editor-context-menu/presentation/ipc.cjs');

const labels = items => items.map(item => item.type === 'separator' ? '—' : item.label);

test('the editor context menu lists the two actions, then the editing items', () => {
  assert.deepEqual(labels(contextMenuItems({ hasSelection: true })), ['Tarefa', 'Lembrete', '—', 'Recortar', 'Copiar', 'Colar', 'Selecionar tudo']);
  assert.deepEqual(contextMenuItems({ hasSelection: true }).filter(item => item.role).map(item => item.role), ['cut', 'copy', 'paste', 'selectAll']);
});

test('actions are enabled only with a selection', () => {
  const enabled = hasSelection => contextMenuItems({ hasSelection }).filter(item => item.id).map(item => [item.id, item.enabled]);
  assert.deepEqual(enabled(true), [['task', true], ['reminder', true]]);
  assert.deepEqual(enabled(false), [['task', false], ['reminder', false]]);
});

test('only task and reminder are context menu actions', () => {
  assert.equal(isContextMenuAction('task'), true);
  assert.equal(isContextMenuAction('reminder'), true);
  for (const value of [null, undefined, 'cut', 'Task', 7, {}]) assert.equal(isContextMenuAction(value), false);
});

test('the use case presents the items and returns the chosen action', async () => {
  const presented = [];
  const open = answer => openEditorContextMenu({ present: async items => { presented.push(items); return answer; } });
  assert.equal(await open('task')({ hasSelection: true }), 'task');
  assert.equal(await open('reminder')({ hasSelection: true }), 'reminder');
  assert.equal(await open(null)({ hasSelection: false }), null);
  assert.equal(await open('selectAll')({ hasSelection: true }), null);
  assert.deepEqual(presented[2], contextMenuItems({ hasSelection: false }));
});

test('the payload must be an object with a boolean hasSelection', () => {
  assert.deepEqual(parseContextMenuRequest({ hasSelection: true, extra: 1 }), { hasSelection: true });
  assert.deepEqual(parseContextMenuRequest({ hasSelection: false }), { hasSelection: false });
  for (const payload of [null, undefined, [], 'true', {}, { hasSelection: 'true' }, { hasSelection: 1 }]) {
    assert.throws(() => parseContextMenuRequest(payload), { message: 'Pedido de menu inválido.' });
  }
});

function fakeMenu() {
  const built = {};
  return { built, Menu: { buildFromTemplate: template => { built.template = template; return { popup: options => { built.popup = options; } }; } } };
}

test('the native presenter resolves the clicked action, ignoring the close that follows', async () => {
  const { built, Menu } = fakeMenu(), window = { isDestroyed: () => false };
  const pending = nativeContextMenuPresenter(Menu, () => window).present(contextMenuItems({ hasSelection: true }));
  assert.equal(built.popup.window, window);
  assert.deepEqual(built.template.slice(2).map(item => item.role || item.type), ['separator', 'cut', 'copy', 'paste', 'selectAll']);
  assert.equal(built.template[3].label, 'Recortar');
  built.template[1].click();
  built.popup.callback();
  assert.equal(await pending, 'reminder');
});

test('the native presenter resolves null when the menu closes without an action', async () => {
  const { built, Menu } = fakeMenu();
  const pending = nativeContextMenuPresenter(Menu, () => ({ isDestroyed: () => false })).present(contextMenuItems({ hasSelection: false }));
  assert.equal(built.template[0].enabled, false);
  built.popup.callback();
  assert.equal(await pending, null);
});

test('the native presenter rejects without a live window', async () => {
  const { Menu } = fakeMenu();
  await assert.rejects(nativeContextMenuPresenter(Menu, () => null).present([]), { message: 'Janela indisponível.' });
  await assert.rejects(nativeContextMenuPresenter(Menu, () => ({ isDestroyed: () => true })).present([]), { message: 'Janela indisponível.' });
});

test('the IPC handler validates, accepts only the main window and calls the use case', async () => {
  const handlers = {}, contents = {}, calls = [];
  registerEditorContextMenu({ handle: (channel, handler) => { handlers[channel] = handler; } }, { getWindow: () => ({ webContents: contents }), open: async request => { calls.push(request); return 'task'; } });
  const handler = handlers['editor:context-menu'];
  assert.equal(await handler({ sender: contents }, { hasSelection: true }), 'task');
  assert.deepEqual(calls, [{ hasSelection: true }]);
  await assert.rejects(handler({ sender: contents }, { hasSelection: 'yes' }), { message: 'Pedido de menu inválido.' });
  await assert.rejects(handler({ sender: {} }, { hasSelection: true }), { message: 'Pedido de menu inválido.' });
  assert.equal(calls.length, 1);
});
