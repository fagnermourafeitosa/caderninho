(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const toolbarText = () => document.querySelector('.view-toolbar').textContent;
  const gap = () => { const primary = document.querySelector('.view-toolbar .toolbar-primary').getBoundingClientRect(), search = document.querySelector('#global-search-control').getBoundingClientRect(); return search.left - primary.right; };
  const go = async name => { document.querySelector(`[data-view=${name}]`).click(); await wait(150); };
  // The top row carries actions only: no page title beside the traffic lights.
  for (const [name, title] of [['notebooks', 'Seus cadernos'], ['reminders', 'Seus lembretes'], ['notes', 'Suas notas'], ['tasks', 'Suas listas'], ['home', 'Página']]) {
    await go(name);
    assert(!toolbarText().includes(title), `Sem título na toolbar: ${name}`);
    assert(Math.abs(gap() - 6) <= 1, `Busca colada à ação principal em ${name}: ${gap()}`);
  }
  assert(!document.querySelector('#notes-drawer, #notes-open'), 'Gaveta de notas removida');
  // Notes and lists open on their index; a row opens the page; back returns.
  for (const [name, back] of [['notes', 'Todas as notas'], ['tasks', 'Todas as listas']]) {
    await go(name);
    if (!visibleNotes().length) { state = await window.notebook.action('note:create', { type: name, title: 'Exemplo' }); openIndex(); }
    const rows = document.querySelectorAll('#notes-index .note-index-row');
    assert(rows.length === visibleNotes().length && !document.querySelector('#note-title'), `Índice primeiro: ${name}`);
    rows[0].click(); await wait(1000);
    assert(document.querySelector('#note-title') && document.querySelector('#back-to-index').getAttribute('aria-label') === back, `Linha abre a página: ${name}`);
    assert(!document.querySelector('#back-to-index').textContent.trim(), 'Voltar só com ícone');
    document.querySelector('#back-to-index').click(); await wait(150);
    assert(document.querySelector('#notes-index'), `Voltar mostra o índice: ${name}`);
  }
  const search = document.querySelector('#index-search');
  search.value = 'zzz-nada'; search.dispatchEvent(new Event('input', { bubbles: true }));
  assert(!document.querySelector('.note-index-row'), 'Busca filtra o índice');
  search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true }));
  // Note header: title, then categories, then where and when.
  await go('notes'); document.querySelector('.note-index-row').click(); await wait(1000);
  const order = [...document.querySelectorAll('#note-title, .note-categories, .note-provenance')].map(element => element.id || element.className);
  assert(order.join() === 'note-title,note-categories,note-provenance', 'Hierarquia do topo: ' + order.join());
  assert(document.querySelector('.note-provenance #note-notebook') && document.querySelector('.note-provenance #note-dates'), 'Caderno e datas juntos');
  assert(!document.querySelector('.note-provenance').textContent.includes('Caderno '), 'Sem rótulo Caderno');
  // Home: the latest note never scrolls by itself; no related section without connections.
  await go('home'); await wait(400);
  const preview = document.querySelector('#home-note-preview');
  assert(preview && !['auto', 'scroll'].includes(getComputedStyle(preview).overflowY), 'Prévia sem barra de rolagem');
  assert(!document.querySelector('#page-content').textContent.includes('Ideias por perto'), 'Ideias por perto só com conexões');
  return { errors: window.smokeErrors };
})()
