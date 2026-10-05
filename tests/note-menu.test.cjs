const { test } = require('node:test');
const assert = require('node:assert/strict');
const { noteMenu, availableCommands } = require('../src/main/note-menu.cjs');

test('the Nota menu lists the five note commands with their shortcuts', () => {
  const menu = noteMenu([], () => {});
  assert.equal(menu.label, 'Nota');
  const items = menu.submenu.filter(item => item.type !== 'separator');
  assert.deepEqual(items.map(item => [item.label, item.accelerator]), [
    ['Nova nota', 'CommandOrControl+N'],
    ['Adicionar mídia', 'CommandOrControl+Shift+M'],
    ['Relacionados', 'CommandOrControl+Alt+R'],
    ['Exportar PDF', 'CommandOrControl+Shift+E'],
    ['Mover para a lixeira', 'CommandOrControl+Shift+Backspace'],
  ]);
});

test('only commands available in the rendered view are enabled', () => {
  const items = noteMenu(['new-note', 'export-pdf'], () => {}).submenu.filter(item => item.type !== 'separator');
  assert.deepEqual(items.map(item => item.enabled), [true, false, false, true, false]);
});

test('clicking an item sends its command', () => {
  const sent = [];
  noteMenu(['add-media'], command => sent.push(command)).submenu.find(item => item.label === 'Adicionar mídia').click();
  assert.deepEqual(sent, ['add-media']);
});

test('renderer availability reports are reduced to known commands', () => {
  assert.deepEqual(availableCommands(['related', 'rm -rf', 7, 'related', 'trash-page']), ['related', 'trash-page']);
  assert.deepEqual(availableCommands('new-note'), []);
});
