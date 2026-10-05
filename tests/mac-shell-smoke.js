(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const width = (text, family) => { const span = document.createElement('span'); span.style.cssText = `font:400 40px ${family};position:absolute;white-space:nowrap`; span.textContent = text; document.body.append(span); const value = span.getBoundingClientRect().width; span.remove(); return value; };
  await document.fonts.ready;
  // Window chrome: the native traffic lights replace the drawn ones; resizing stays on the book border.
  assert(!document.querySelector('.spiral') && document.querySelector('.book-binding'), 'Lombada no lugar das espirais');
  assert(!document.querySelector('.traffic-lights, #close, #minimize, #maximize'), 'Semáforos desenhados removidos');
  assert(!document.querySelector('.resize-handle'), 'Puxadores de resize removidos');
  assert(document.querySelectorAll('.book-edges [data-resize]').length === 8, 'Resize pela borda do livro continua');
  for (const action of ['close', 'minimize']) {
    let rejected = false;
    try { await window.notebook.window(action); } catch { rejected = true; }
    assert(rejected, `notebook:window recusa ${action}`);
  }
  // Typography: New York from the system font protocol, the hand only in two accents.
  const sample = 'Pequenos planos para amanhã';
  assert(Math.abs(width(sample, 'var(--body-font)') - width(sample, 'serif')) > 1, 'Fonte do corpo resolve para o New York');
  assert(getComputedStyle(document.querySelector('.nav-item')).fontFamily.includes('New York'), 'Sidebar usa a serifa');
  // Sidebar as a source list.
  const row = document.querySelector('.nav-item').getBoundingClientRect();
  assert(Math.round(row.height) === 32 && Math.round(document.querySelector('.nav-item svg').getBoundingClientRect().width) === 16, 'Linhas de 32px com ícones de 16px');
  // Note toolbar: one primary action, the rest in "Mais".
  state = await window.notebook.action('view:select', { view: 'notes' }); view = 'notes'; render();
  if (!currentNote()) { await createNote(); await wait(900); }
  const primary = document.querySelectorAll('.view-toolbar .toolbar-primary');
  assert(primary.length === 1 && primary[0].id === 'new-note', 'Nova nota é a única ação principal');
  assert(document.querySelector('#page-more') && document.querySelector('#page-more-menu').hidden, 'Menu Mais fechado por padrão');
  document.querySelector('#page-more').click(); await wait(50);
  const menu = document.querySelector('#page-more-menu');
  assert(!menu.hidden && ['#add-cut', '#related-open', '#export-pdf', '#trash-note'].every(selector => menu.querySelector(selector)), 'Mais reúne as ações secundárias');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(50);
  assert(menu.hidden, 'Escape fecha o Mais');
  const order = [...document.querySelector('.view-toolbar > .toolbar-right:last-child').children].map(element => element.id || element.className);
  const searchControl = document.querySelector('#global-search-control');
  assert(searchControl.previousElementSibling?.id === 'new-note' && searchControl.nextElementSibling?.classList.contains('page-more'), 'Ordem Nova nota, busca, Mais: ' + order.join());
  // Notices center on the notebook, whatever the sidebar state.
  toast('Aviso de teste');
  const toastBox = document.querySelector('#toast').getBoundingClientRect(), book = document.querySelector('.notebook').getBoundingClientRect();
  assert(Math.abs((toastBox.left + toastBox.right) / 2 - (book.left + book.right) / 2) < 2, 'Aviso centralizado no caderno');
  document.querySelector('#toast').hidden = true;
  assert(document.querySelector('#sidebar-toggle').getBoundingClientRect().width <= 18, 'Aba de recolher pequena');
  // Native traffic lights take x+38..x+90 on the sheet; toolbar content starts after them.
  const sheetLeft = document.querySelector('#sheet').getBoundingClientRect().left;
  assert(document.querySelector('.view-toolbar').firstElementChild.getBoundingClientRect().left >= sheetLeft + 100, 'Toolbar livre dos semáforos');
  const notesCommands = window.availableNoteCommands;
  // Home: correct casing and plurals.
  state = await window.notebook.action('view:select', { view: 'home' }); view = 'home'; render(); await wait(50);
  const date = document.querySelector('.daily-date');
  assert(getComputedStyle(date).textTransform === 'none' && !/ De /.test(date.textContent), 'Data em caixa portuguesa');
  assert(!/\b1 (tarefas|lembretes|notas)\b/.test(document.querySelector('#daily-summary').textContent), 'Resumo sem plural errado');
  assert(getComputedStyle(date).fontFamily.includes('Excalifont'), 'Data do dia na manuscrita');
  return { errors: window.smokeErrors, notesCommands, homeCommands: window.availableNoteCommands };
})()
