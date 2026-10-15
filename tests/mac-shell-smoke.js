(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const width = (text, family) => { const span = document.createElement('span'); span.style.cssText = `font:400 40px ${family};position:absolute;white-space:nowrap`; span.textContent = text; document.body.append(span); const value = span.getBoundingClientRect().width; span.remove(); return value; };
  await document.fonts.ready;
  // Window chrome: the native traffic lights replace the drawn ones; resizing stays on the book border.
  assert(!document.querySelector('.spiral') && document.querySelector('.book-binding'), 'Lombada tracejada entre o menu e a página');
  // The sidebar is attached to the page: no gap, the collapse arrow on its right edge.
  const sideBox = document.querySelector('#sidebar').getBoundingClientRect(), sheetBox = document.querySelector('#sheet').getBoundingClientRect();
  if (!state.sidebarCollapsed) {
    assert(Math.abs(sideBox.right - sheetBox.left) <= 2, `Menu lateral grudado na página: ${sideBox.right} x ${sheetBox.left}`);
    const arrow = document.querySelector('#sidebar-toggle').getBoundingClientRect();
    assert(Math.abs((arrow.left + arrow.right) / 2 - sideBox.right) <= 12, 'Seta de recolher na borda direita do menu');
  }
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
  assert(document.querySelector('#sidebar-toggle').getBoundingClientRect().width <= 24, 'Aba de recolher pequena');
  // With the sidebar open the traffic lights sit on it, so the toolbar is free.
  // Toolbar controls share one height in every section.
  const heights = selector => [...document.querySelectorAll(selector)].filter(element => element.offsetParent).map(element => Math.round(element.getBoundingClientRect().height));
  const notesHeights = heights('.view-toolbar .toolbar-primary, .view-toolbar .toolbar-back, #page-more, #global-search-toggle');
  assert(notesHeights.length >= 3 && notesHeights.every(value => value === 34), 'Botões do topo das notas com 34px: ' + notesHeights.join());
  const notesCommands = window.availableNoteCommands;
  // Home: correct casing and plurals.
  state = await window.notebook.action('view:select', { view: 'home' }); view = 'home'; render(); await wait(50);
  const homeHeights = heights('.view-toolbar .toolbar-primary, #daily-select, #global-search-toggle');
  assert(homeHeights.length >= 2 && homeHeights.every(value => value === 34), 'Botões do topo da home com 34px: ' + homeHeights.join());
  const date = document.querySelector('.daily-date');
  assert(getComputedStyle(date).textTransform === 'none' && !/ De /.test(date.textContent), 'Data em caixa portuguesa');
  assert(!document.querySelector('#daily-summary'), 'Home sem linha de resumo');
  assert(getComputedStyle(date).fontFamily.includes('Excalifont'), 'Data do dia na manuscrita');
  return { errors: window.smokeErrors, notesCommands, homeCommands: window.availableNoteCommands };
})()
