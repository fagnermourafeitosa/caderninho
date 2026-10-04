(async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  state = await window.notebook.action('note:create', { type:'notes', title:'Referências em PDF' }); view = 'notes';
  const id = currentNote().id;
  state = await window.notebook.action('note:update', { id, body:'Uma referência guardada junto das minhas ideias.\nPosso escrever ao redor do documento e retomá-lo depois.' }); render();
  assert($('#cut-image-file').accept.includes('application/pdf'), 'Seletor aceita PDF');
  const transfer = new DataTransfer();
  transfer.items.add(new File([new Uint8Array(window.pdfTestBytes)], 'referencia.pdf', { type:'application/pdf' }));
  $('#note-body').dispatchEvent(new DragEvent('drop', { dataTransfer:transfer, bubbles:true, cancelable:true }));
  for(let i=0;i<100 && !currentNote().cuts.some(cut=>cut.kind==='pdf');i++) await new Promise(resolve=>setTimeout(resolve,50));
  const cut = currentNote().cuts.find(cut=>cut.kind==='pdf');
  assert(cut, 'PDF importado por arrastar');
  assert(cut.title === 'Meu documento PDF', 'Título nativo extraído');
  assert(cut.description.includes('Trecho inicial'), 'Texto nativo extraído');
  assert(!document.querySelector('.paper-cut img'), 'PDF não é tratado como imagem');
  assert(document.querySelector('.cut-open strong').textContent === cut.title, 'Título no cartão');
  assert(document.querySelector('.cut-open p').textContent.includes('Trecho inicial'), 'Trecho no cartão');
  assert($('#note-body').value.startsWith('Uma referência'), 'Texto da nota preservado');
  await window.notebook.openCut(cut.id);
  await action('cut:layout', { id:cut.id, side:'left', anchor:1, width:.42 }); renderPage();
  await action('cut:trash', { id:cut.id });
  assert(state.trashCuts.some(item=>item.id===cut.id), 'PDF na lixeira');
  await action('cut:restore', { id:cut.id }); renderPage();
  assert(document.querySelector('.paper-cut.cut-left'), 'Posição preservada na restauração');
  const persisted = await window.notebook.state();
  assert(persisted.notes.find(note=>note.id===id).cuts[0].description === cut.description, 'Metadados persistidos');
  return { errors:window.smokeErrors, noteId:id, title:cut.title };
})()
