(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  state = await window.notebook.action('note:create', { type: 'notes', title: 'Pequenos planos para amanhã' }); view = 'notes'; render();
  const id = currentNote().id, body = 'Buscar as encomendas amanhã às 14h\nSeparar os documentos\nConferir o endereço';
  $('#note-body').value = body; $('#note-body').selectionStart = body.length; $('#note-body').selectionEnd = body.length; $('#note-body').dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
  assert(!document.querySelector('.inline-check'), 'Nenhum checkbox dentro da nota (spec 008)');
  assert($('#margin-schedule'), 'Carimbo aparece com amanhã às 14h');
  assert(!(await window.notebook.state()).notes.find(n => n.id === id).enabled, 'Frase não ativa o alerta sozinha');
  $('#margin-schedule').click(); await wait(100);
  let stored = (await window.notebook.state()).notes.find(n => n.id === id); assert(stored.enabled && stored.type === 'notes', 'Agendamento mantém a nota');
  assert(!$('#margin-schedule') && $('#margin-cancel'), 'Carimbo mostra agendado e cancelar');
  $('#margin-cancel').click(); await wait(100); assert(!(await window.notebook.state()).notes.find(n => n.id === id).enabled, 'Cancelamento na página');
  ensureRichEditor();
  const last = [...document.querySelectorAll('#note-body .line-text')].at(-1); putCaret(last, last.textContent.length);
  const before = document.querySelectorAll('#note-body .writing-line').length;
  last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await wait(100);
  assert(document.querySelectorAll('#note-body .writing-line').length === before + 1, 'Enter cria uma nova linha');
  const finalLine = [...document.querySelectorAll('#note-body .line-text')].at(-1); putCaret(finalLine);
  pasteWritingText('[] Novo item\n[] Outro item'); await wait(100);
  assert(!document.querySelector('.new-task-dialog') && [...document.querySelectorAll('#note-body .line-text')].at(-1).textContent === '[] Outro item', 'Colar [] mantém texto simples, sem abrir tarefa');
  // Use a real future timestamp to verify that inline scheduling reaches the alarm worker.
  await action('schedule:activate', { id, due: new Date(Date.now() + 1200).toISOString() }); await wait(2600);
  stored = (await window.notebook.state()).notes.find(n => n.id === id); assert(stored.fired && !stored.enabled, 'Alerta da nota disparado');
  await action('schedule:activate', { id, due: smartText.suggestions(body)[0].due }); renderPage(); $('#toast').hidden = true;
  return { noteId: id, errors: window.smokeErrors };
})()
