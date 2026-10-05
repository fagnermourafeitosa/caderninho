/* Page actions shared by the "Mais" overflow and the native "Nota" menu, plus native window buttons. */
const NOTE_COMMAND_TARGETS = { 'add-media': '#add-cut', related: '#related-open', 'export-pdf': '#export-pdf', 'trash-page': '#trash-note' };
const moreItem = (id, name, label, shortcut, danger = false) => `<button id="${id}" type="button" role="menuitem" class="${danger ? 'page-more-danger' : ''}">${icon(name)}<span>${escape(label)}</span><kbd>${shortcut}</kbd></button>`;
// items: HTML from moreItem; a leading '<hr>' separates destructive actions.
function moreMenu(items) {
  if (!items.length) return '';
  return `<span class="page-more"><button id="page-more" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="page-more-menu" aria-label="Mais ações" title="Mais ações">${icon('more')}</button><div id="page-more-menu" class="page-more-menu" role="menu" hidden>${items.join('')}</div></span>`;
}
function setMoreMenu(open) {
  const button = $('#page-more'), menu = $('#page-more-menu');
  if (!button || !menu) return;
  menu.hidden = !open; button.setAttribute('aria-expanded', String(open));
  if (open) menu.querySelector('button:not(:disabled)')?.focus();
}
function bindMoreMenu() {
  const button = $('#page-more'), menu = $('#page-more-menu');
  if (!button) return;
  button.onclick = () => setMoreMenu(menu.hidden);
  menu.addEventListener('click', event => { if (event.target.closest('button')) setMoreMenu(false); });
}
document.addEventListener('pointerdown', event => { if (!event.target.closest('.page-more')) setMoreMenu(false); });
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || $('#page-more-menu')?.hidden !== false) return;
  setMoreMenu(false); $('#page-more')?.focus();
});
// The menu bar mirrors what the page offers: an action is enabled when its control is rendered.
function syncNoteCommands() {
  const commands = ['new-note', ...Object.keys(NOTE_COMMAND_TARGETS).filter(command => $('#page-content ' + NOTE_COMMAND_TARGETS[command]))];
  window.availableNoteCommands = commands;
  window.notebook.noteCommands(commands);
}
window.notebook.onCommand(command => {
  if (command === 'new-note') { createNote(); return; }
  const target = NOTE_COMMAND_TARGETS[command] && $('#page-content ' + NOTE_COMMAND_TARGETS[command]);
  if (target && !target.disabled) target.click();
});
// One search control for every page: it follows the primary action of the current toolbar.
const globalSearchNode = $('#global-search-control'), globalSearchHome = $('.book-header');
function placeGlobalSearch() {
  const toolbar = $('#page-content .view-toolbar');
  if (!toolbar) { if (globalSearchNode.parentElement !== globalSearchHome) globalSearchHome.append(globalSearchNode); return; }
  const primary = toolbar.querySelector('.toolbar-primary');
  if (primary) { if (primary.nextElementSibling !== globalSearchNode) primary.after(globalSearchNode); }
  else { const group = toolbar.querySelector('.toolbar-right') || toolbar; if (group.lastElementChild !== globalSearchNode) group.append(globalSearchNode); }
}
new MutationObserver(placeGlobalSearch).observe($('#page-content'), { childList: true });
// Native traffic lights sit on the paper, right after the binding.
let windowButtonsAt = '';
function placeWindowButtons() {
  const sheet = $('#sheet').getBoundingClientRect();
  const position = { x: Math.round(sheet.left + 38), y: Math.round(sheet.top + 12) };
  const key = position.x + ',' + position.y;
  if (key === windowButtonsAt) return;
  windowButtonsAt = key; window.notebook.windowButtons(position);
}
new ResizeObserver(placeWindowButtons).observe($('#sheet'));
$('.app').addEventListener('transitionend', placeWindowButtons);
window.addEventListener('resize', placeWindowButtons);
