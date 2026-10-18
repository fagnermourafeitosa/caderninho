let cutTarget = null,cutPlacement=null;
function mediaWritingPosition() {
  const selected=getSelection(),node=selected.anchorNode?.nodeType===1?selected.anchorNode:selected.anchorNode?.parentElement;
  const line=node?.closest('.writing-line');
  return {kind:'block',anchor:Number(line?.dataset.lineIndex||0),side:'right'};
}
function openCutDialog() {
  cutTarget = currentNote()?.id;
  if (!cutTarget || view !== 'notes') return;
  cutPlacement=mediaWritingPosition();
  $('#cut-url').value = ''; $('#cut-dialog').showModal(); $('#cut-url').focus();
}
function cutCard(cut) {
  const card = document.createElement('aside');
  card.className = `paper-cut cut-${cut.side}`; card.contentEditable = 'false'; card.dataset.cutId = cut.id;
  card.style.width = `${cut.width * 100}%`;
  card.innerHTML = `<div class="cut-controls"><button class="cut-grip" aria-label="Arrastar mídia" title="Arraste para posicionar na página">${icon('grip')}<span>Arraste</span></button><span><button class="cut-action" aria-label="Criar ação ligada à mídia" title="Criar tarefa ou lembrete">${commandIcon('check')}</button><button data-size="-1" aria-label="Diminuir mídia">${icon('minus')}</button><button data-size="1" aria-label="Aumentar mídia">${icon('add')}</button><button class="cut-remove" aria-label="Mover mídia para a lixeira">${icon('trash')}</button></span></div><div class="cut-preview"></div>`;
  fillCutPreview(card, cut);
  card.querySelector('.cut-action').onclick=()=>openSourceComposer({kind:'cut',cutId:cut.id,quote:cut.title||'Imagem'});
  card.querySelector('.cut-remove').onclick = async () => { if (await action('cut:trash', { id: cut.id })) { renderPage(); toast('Mídia guardada na lixeira de notas.'); } };
  card.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>changeMediaLayout('mediaLayoutResize',{noteId:currentNote().id,cutId:cut.id,width:Math.max(.01,Math.min(1,cut.width+Number(button.dataset.size)*.1))}));
  bindMediaDrag(card,cut);
  return card;
}
function fillCutPreview(card, cut) {
  const preview = card.querySelector('.cut-preview');
  preview.innerHTML = `${cut.blobId && cut.kind !== 'pdf' ? `<img src="caderno-media://blob/${cut.blobId}" alt="${escape(cut.title || 'Mídia')}" draggable="false">` : ''}${cut.kind === 'pdf' ? `<button class="cut-open" title="Abrir PDF"><small>PDF · salvo no Caderninho</small><strong>${escape(cut.title)}</strong>${cut.description ? `<p>${escape(cut.description)}</p>` : '<p>Documento PDF</p>'}<span>Abrir PDF ↗</span></button>` : ''}${cut.kind === 'link' ? `<button class="cut-open" title="Abrir no navegador"><small>${escape(new URL(cut.url).hostname)}</small><strong>${escape(cut.title)}</strong>${cut.description ? `<p>${escape(cut.description)}</p>` : ''}<span>${cut.status === 'loading' ? 'Buscando metatags…' : cut.status === 'unavailable' ? 'Sem prévia · Abrir link ↗' : 'Abrir link ↗'}</span></button>` : ''}`;
  const open = preview.querySelector('.cut-open'); if (open) open.onclick = () => window.notebook.openCut(cut.id).catch(error => toast(error.message));
}
function mountCollage(note) {
  finishDiagramSession();
  const old = $('#note-body'), editor = document.createElement('div');
  editor.id = 'note-body'; editor.className = 'note-body collage-editor'; editor.contentEditable = 'true'; editor.setAttribute('aria-label', 'Página com texto e mídia');
  Object.defineProperty(editor, 'value', { get: () => [...editor.querySelectorAll('.writing-line')].map(readWritingLine).join('\n') });
  editor.oninput = old.oninput; editor.onkeydown = handleWritingKey;
  if(note.editorDoc) {renderDocumentBlocks(editor,note);old.replaceWith(editor);mountMediaGroups(editor,note);return;}
  const lines = note.body.split('\n');
  lines.forEach((text, index) => {
    editor.append(makeWritingLine(text, index));
  });
  old.replaceWith(editor);mountMediaGroups(editor,note);
}
function cutUrl(text) { try { const url = new URL(text.trim()); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } }
function importCuts(files,url,noteId=currentNote()?.id,placement=mediaWritingPosition()) {
  if(!noteId)return Promise.resolve();
  const note=state.notes.find(note=>note.id===noteId),history=pageHistories.get(noteId)||ensurePageHistory(note),baseline=history.current;
  return enqueueNoteMutation(()=>performMediaImport(files,url,noteId,placement,history,baseline),noteId);
}
async function performMediaImport(files, url, noteId, placement, history, baseline) {
  if (!noteId) return;
  try {
    for (const file of files) {
      const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!pdf && !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use PDF ou imagens PNG, JPEG ou WebP.');
      if (file.size > (pdf ? 50 : 20) * 1024 * 1024) throw new Error(pdf ? 'Use um PDF de até 50 MB.' : 'Use uma imagem de até 20 MB.');
      state = await window.notebook[pdf ? 'pdf' : 'image']({ noteId, name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), placement });
    }
    if (url) state = await window.notebook.link({ noteId, url, placement });
    saved(); toast('Mídia adicionada. Arraste pela alça para posicionar.');
  } catch (error) { toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); }
  finally {
    const note=state.notes.find(note=>note.id===noteId);
    if(note){history.reconcileMediaLayout(baseline.mediaLayout,noteMediaPlacements(note));
      if(view==='notes'&&currentNote()?.id===noteId){refreshImportedMedia(historyMediaNote(note,history));updateTemporalLabels();}
    }
  }
}
$('#cut-dialog-close').onclick = () => $('#cut-dialog').close();
$('#cut-image-pick').onclick = () => $('#cut-image-file').click();
$('#cut-image-file').onchange = event => { const files = [...event.target.files]; event.target.value = ''; $('#cut-dialog').close(); if (files.length) importCuts(files, null, cutTarget,cutPlacement); };
$('#cut-link-form').onsubmit = event => { event.preventDefault(); const url = cutUrl($('#cut-url').value); if (!url) return toast('Cole um link HTTP ou HTTPS.'); $('#cut-dialog').close(); importCuts([], url, cutTarget,cutPlacement); };
document.addEventListener('paste', event => {
  if (view !== 'notes' || !currentNote() || !event.target.closest('#note-body')) return;
  const files = [...event.clipboardData.files], url = cutUrl(event.clipboardData.getData('text/plain'));
  if (files.length || url) { event.preventDefault(); importCuts(files, files.length ? null : url); }
  else if(event.target.closest('.table-cell-text')) { event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain')); }
  else if (getSelection().anchorNode?.parentElement?.closest('.writing-line')) { event.preventDefault(); pasteWritingText(event.clipboardData.getData('text/plain')); }
});
document.addEventListener('dragover', event => { if(event.dataTransfer.types.includes('application/x-caderninho-action'))return; if (view === 'notes' && currentNote() && event.target.closest('#page-content')) { event.preventDefault(); $('#note-body')?.classList.add('drop-active');showMediaIndicator(mediaDropTarget(event.clientX,event.clientY)); } });
document.addEventListener('dragleave', event => { if (!event.relatedTarget?.closest('#page-content')) {$('#note-body')?.classList.remove('drop-active');showMediaIndicator(null);} });
document.addEventListener('drop', event => {
  if(event.dataTransfer.types.includes('application/x-caderninho-action'))return;
  event.preventDefault(); $('#note-body')?.classList.remove('drop-active');showMediaIndicator(null);
  if (view !== 'notes' || !currentNote() || !event.target.closest('#page-content')) return;
  const files = [...event.dataTransfer.files], text = event.dataTransfer.getData('text/uri-list').split('\n').find(line => line && !line.startsWith('#')) || event.dataTransfer.getData('text/plain');
  const url = cutUrl(text); if (files.length || url) importCuts(files, url,currentNote().id,mediaDropTarget(event.clientX,event.clientY)?.placement||mediaWritingPosition());
});
window.notebook.onCutsUpdated(next => {
  // Metadata completion must not replace text being edited or move its caret.
  for (const note of state.notes) { const fresh = next.notes.find(item => item.id === note.id); if (fresh) for(const cut of note.cuts) {
    const incoming=fresh.cuts.find(item=>item.id===cut.id);
    if(incoming)for(const key of ['title','description','blobId','status'])cut[key]=incoming[key];
  } }

  if (view === 'notes') currentNote()?.cuts.forEach(cut => { const card = document.querySelector(`[data-cut-id="${cut.id}"]`); if (card) fillCutPreview(card, cut); });
});
