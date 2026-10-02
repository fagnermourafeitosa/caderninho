(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (value, label) => { if (!value) throw new Error(label); };
  const shortcut = async (key = 'z', shiftKey = false, metaKey = false) => {
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: !metaKey, metaKey, shiftKey, bubbles: true, cancelable: true })); await undoQueue; await wait(50);
  };
  state = await window.notebook.action('note:create', { type: 'notes', title: 'Undo test' }); view = 'notes'; render();
  const firstId = currentNote().id;
  $('#note-body').focus(); document.execCommand('insertText', false, 'Texto original'); await wait(100);
  await shortcut(); assert($('#note-body').value === '', 'Ctrl+Z desfaz texto simples');
  assert((await window.notebook.state()).notes.find(note => note.id === firstId).body === '', 'Undo é salvo no SQLite');
  await shortcut('z', true); assert($('#note-body').value === 'Texto original', 'Ctrl+Shift+Z refaz');
  await shortcut('z', false, true); assert($('#note-body').value === '', 'Cmd+Z também desfaz');
  await shortcut('y'); assert($('#note-body').value === 'Texto original', 'Ctrl+Y também refaz');
  $('#note-title').focus(); $('#note-title').dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: '!' }));
  $('#note-title').value = 'Renamed'; $('#note-title').dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
  await shortcut(); assert($('#note-title').value === 'Undo test', 'Undo do título');
  const target = $('#note-body'); target.focus(); target.value = 'Texto original\n[] Separar documentos'; target.selectionStart = target.value.length; target.selectionEnd = target.value.length; target.dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
  assert(document.querySelector('.inline-check'), 'Conversão do checkbox');
  document.querySelector('.inline-check').click(); await wait(100); await shortcut();
  assert(!document.querySelector('.inline-check').checked, 'Undo desfaz a marcação do checkbox');
  await shortcut('z', true); assert(document.querySelector('.inline-check').checked, 'Redo recupera marcação');
  const line = [...document.querySelectorAll('.line-text')].at(-1); putCaret(line, line.textContent.length);
  line.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await wait(100);
  await shortcut(); assert(document.querySelectorAll('.inline-check').length === 1, 'Undo desfaz Enter e sua estrutura');
  await shortcut('z', true); assert(document.querySelectorAll('.inline-check').length === 2, 'Redo restaura estrutura');
  const span = [...document.querySelectorAll('.line-text')].at(-1); putCaret(span);
  pasteWritingText('[] Comprar papel\n[] Guardar recortes'); await wait(100);
  await shortcut(); assert(!$('#note-body').value.includes('Comprar papel'), 'Undo da colagem de múltiplas linhas');
  // A new edit invalidates the old redo branch.
  const last = [...document.querySelectorAll('.line-text')].at(-1); putCaret(last); document.execCommand('insertText', false, 'Outra ideia'); await wait(100);
  await shortcut('z', true); assert(!$('#note-body').value.includes('Comprar papel'), 'Editar após undo limpa redo');
  const firstBody = $('#note-body').value;
  state = await window.notebook.action('note:create', { type: 'notes', title: 'Independent' }); render();
  $('#note-body').focus(); document.execCommand('insertText', false, 'Segundo texto'); await wait(100); await shortcut();
  assert($('#note-body').value === '', 'Histórico da segunda nota é independente');
  state = await window.notebook.action('note:select', { id: firstId }); render();
  assert($('#note-body').value === firstBody, 'Navegar preserva texto e histórico da outra página');
  await editPageHistory('undo'); assert(!$('#note-body').value.includes('Outra ideia'), 'Histórico recuperado após navegação');
  // Externally appended content must not be erased by an older page history.
  state = await window.notebook.action('note:update', { id: firstId, body: $('#note-body').value + '\nCapturado em outra janela' }); render();
  $('#note-body').focus(); await editPageHistory('undo'); assert($('#note-body').value.includes('Capturado em outra janela'), 'Atualização externa reinicia a base do histórico');
  state = await window.notebook.image({ noteId: firstId, name: 'Undo image', bytes: new Uint8Array(window.cutTestBytes) }); renderPage();
  const withCut = $('#note-body').value; putCaret(document.querySelector('.line-text')); document.execCommand('insertText', false, 'Com recortes '); await wait(100);
  await shortcut(); assert($('#note-body').value === withCut && document.querySelectorAll('.paper-cut').length === 1, 'Undo em uma nota com recortes preserva a imagem');
  putCaret(document.querySelector('.line-text')); document.execCommand('insertText', false, 'Antes de desfazer '); await wait(100);
  const queued = editPageHistory('undo'); await Promise.resolve();
  document.execCommand('insertText', false, 'Depois de desfazer '); await queued; await wait(100);
  assert($('#note-body').value.includes('Depois de desfazer '), 'Digitar durante o salvamento do undo não perde texto');
  openDrawer(); document.execCommand('insertText', false, 'Busca'); await wait(50); await shortcut();
  assert($('#search').value === '', 'Ctrl+Z também funciona no campo de busca');
  closeDrawer(); putCaret(document.querySelector('.line-text'));
  return { errors: window.smokeErrors, noteId: firstId };
})()
