// "Nota" menu: page actions reachable from the menu bar, enabled for what the renderer shows.
const COMMANDS = [
  { id: 'new-note', label: 'Nova nota', accelerator: 'CommandOrControl+N' },
  { id: 'add-media', label: 'Adicionar mídia', accelerator: 'CommandOrControl+Shift+M' },
  { id: 'related', label: 'Relacionados', accelerator: 'CommandOrControl+Alt+R' },
  { id: 'export-pdf', label: 'Exportar PDF', accelerator: 'CommandOrControl+Shift+E' },
  // ⌘⌫ stays with the editor, where it deletes to the start of the line.
  { id: 'trash-page', label: 'Mover para a lixeira', accelerator: 'CommandOrControl+Shift+Backspace', separated: true },
];
const IDS = new Set(COMMANDS.map(command => command.id));
const availableCommands = value => Array.isArray(value) ? [...new Set(value.filter(id => IDS.has(id)))] : [];
function noteMenu(available, send) {
  const enabled = new Set(availableCommands(available));
  return { label: 'Nota', submenu: COMMANDS.flatMap(command => [
    ...(command.separated ? [{ type: 'separator' }] : []),
    { label: command.label, accelerator: command.accelerator, enabled: enabled.has(command.id), click: () => send(command.id) },
  ]) };
}
module.exports = { noteMenu, availableCommands };
