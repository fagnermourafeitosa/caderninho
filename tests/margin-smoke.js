(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  state = await window.notebook.action('note:create', { type: 'notes', title: 'Pequenos planos para amanhã' }); view = 'notes'; render();
  const id = currentNote().id, body = 'Buscar as encomendas amanhã às 14h\n[] Separar os documentos\n[] Conferir o endereço';
  $('#note-body').value = body; $('#note-body').selectionStart = body.length; $('#note-body').selectionEnd = body.length; $('#note-body').dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
  assert(document.querySelectorAll('.inline-check').length === 2, '[] vira checkbox na própria página');
  assert($('#margin-schedule'), 'Carimbo aparece com amanhã às 14h');
  assert(!(await window.notebook.state()).notes.find(n => n.id === id).enabled, 'Frase não ativa o alerta sozinha');
  document.querySelector('.inline-check').click(); await wait(100);
  let stored = (await window.notebook.state()).notes.find(n => n.id === id); assert(stored.body.includes('[x] Separar os documentos'), 'Checkbox marcado salvo');
  renderPage(); assert(document.querySelector('.inline-check').checked, 'Checkbox recuperado ao renderizar');
  $('#margin-schedule').click(); await wait(100);
  stored = (await window.notebook.state()).notes.find(n => n.id === id); assert(stored.enabled && stored.type === 'notes', 'Agendamento mantém a nota');
  assert(!$('#margin-schedule') && $('#margin-cancel'), 'Carimbo mostra agendado e cancelar');
  $('#margin-cancel').click(); await wait(100); assert(!(await window.notebook.state()).notes.find(n => n.id === id).enabled, 'Cancelamento na página');
  const last = [...document.querySelectorAll('.line-text')].at(-1); putCaret(last, last.textContent.length);
  last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await wait(100);
  assert(document.querySelectorAll('.inline-check').length === 3, 'Enter continua a lista');
  getSelection().anchorNode.parentElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await wait(100);
  assert(document.querySelectorAll('.inline-check').length === 2, 'Enter no checkbox vazio volta ao texto');
  const finalLine = [...document.querySelectorAll('.line-text')].at(-1); putCaret(finalLine);
  pasteWritingText('[] Novo item\n[] Outro item'); await wait(100);
  assert(document.querySelectorAll('.inline-check').length === 4, 'Colagem de várias linhas cria vários checkboxes');
  // Use a real future timestamp to verify that inline scheduling reaches the alarm worker.
  await action('schedule:activate', { id, due: new Date(Date.now() + 1200).toISOString() }); await wait(2600);
  stored = (await window.notebook.state()).notes.find(n => n.id === id); assert(stored.fired && !stored.enabled, 'Alerta da nota disparado');
  await action('schedule:activate', { id, due: smartText.suggestions(body)[0].due }); renderPage(); $('#toast').hidden = true;
  return { noteId: id, errors: window.smokeErrors, inlineChecks: document.querySelectorAll('.inline-check').length };
})()
