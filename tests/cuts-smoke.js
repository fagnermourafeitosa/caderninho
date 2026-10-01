(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  state = await window.notebook.action('note:create', { type: 'notes', title: 'Meu mural de ideias' }); view = 'notes';
  const id = currentNote().id;
  state = await window.notebook.action('note:update', { id, body: 'Um espaço para colecionar inspirações.\nImagens, páginas e boas ideias.\nEscreva ao redor dos recortes.\nTudo fica guardado neste caderninho.' }); render();
  assert($('#add-cut'), 'Botão de recortes');
  const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(window.cutTestBytes)], 'inspiracao.png', { type: 'image/png' }));
  $('#note-body').dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  for (let i = 0; i < 80 && !document.querySelector('.paper-cut img')?.naturalWidth; i++) await wait(50);
  assert(document.querySelector('.paper-cut img')?.naturalWidth > 0, 'PNG servido pelo protocolo local');
  assert($('#note-body').value.includes('Um espaço'), 'Texto preservado na colagem');
  const drop = new DataTransfer(); drop.setData('text/uri-list', 'https://example.com/inspiracao');
  $('#note-body').dispatchEvent(new DragEvent('drop', { dataTransfer: drop, bubbles: true, cancelable: true }));
  for (let i = 0; i < 80 && document.querySelector('.cut-open strong')?.textContent !== 'Uma ideia em papel'; i++) await wait(50);
  assert(document.querySelector('.cut-open strong')?.textContent === 'Uma ideia em papel', 'Metatags mostradas no cartão');
  const imageCut = currentNote().cuts.find(cut => cut.kind === 'image');
  await action('cut:layout', { id: imageCut.id, side: 'left', anchor: 1, width: .42 }); renderPage();
  const line = document.querySelector('.writing-line .line-text'); line.textContent = 'Texto editado ao redor dos recortes.'; line.dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
  assert((await window.notebook.state()).notes.find(note => note.id === id).body.startsWith('Texto editado'), 'Texto da colagem salvo');
  document.querySelector(`[data-cut-id="${imageCut.id}"] .cut-remove`).click(); await wait(100);
  assert((await window.notebook.state()).trashCuts.some(cut => cut.id === imageCut.id), 'Recorte na lixeira');
  view = 'archive'; trashType = 'notes'; render();
  assert(document.querySelector(`[data-restore-id="${imageCut.id}"]`), 'Recorte listado na lixeira de notas');
  view = 'notes';
  await action('cut:restore', { id: imageCut.id }); render();
  assert(document.querySelector(`[data-cut-id="${imageCut.id}"]`).classList.contains('cut-left'), 'Layout preservado na restauração');
  return { errors: window.smokeErrors, noteId: id, cuts: currentNote().cuts.length };
})()
