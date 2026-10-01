let cutTarget = null;
function openCutDialog() {
  cutTarget = currentNote()?.id;
  if (!cutTarget || view !== 'notes') return;
  $('#cut-url').value = ''; $('#cut-dialog').showModal(); $('#cut-url').focus();
}
function cutCard(cut) {
  const card = document.createElement('aside');
  card.className = `paper-cut cut-${cut.side}${cut.width > .65 ? ' cut-wide' : ''}`; card.contentEditable = 'false'; card.dataset.cutId = cut.id;
  card.style.width = `${cut.width * 100}%`;
  card.innerHTML = `<div class="cut-controls"><button class="cut-grip" aria-label="Arrastar recorte" title="Arraste para posicionar na página">⠿ <span>Arraste</span></button><span><button data-size="-1" aria-label="Diminuir recorte">−</button><button data-size="1" aria-label="Aumentar recorte">+</button><button class="cut-remove" aria-label="Mover recorte para a lixeira">×</button></span></div><div class="cut-preview"></div>`;
  fillCutPreview(card, cut);
  card.querySelector('.cut-remove').onclick = async () => { if (await action('cut:trash', { id: cut.id })) { renderPage(); toast('Recorte guardado na lixeira de notas.'); } };
  card.querySelectorAll('[data-size]').forEach(button => button.onclick = async () => {
    if (await action('cut:layout', { id: cut.id, side: cut.side, anchor: cut.anchor, width: Math.max(.25, Math.min(.85, cut.width + Number(button.dataset.size) * .1)) })) renderPage();
  });
  const grip = card.querySelector('.cut-grip'); let start;
  grip.onpointerdown = event => { if (event.button) return; event.preventDefault(); start = { x: event.clientX, y: event.clientY }; grip.setPointerCapture(event.pointerId); card.classList.add('cut-dragging'); };
  grip.onpointermove = event => { if (start) card.style.transform = `translate(${event.clientX - start.x}px,${event.clientY - start.y}px)`; };
  grip.onpointerup = async event => {
    if (!start) return; start = null; card.style.transform = ''; card.classList.remove('cut-dragging');
    const editor = $('#note-body'), box = editor.getBoundingClientRect();
    const lines = [...editor.querySelectorAll('.writing-line')];
    const anchor = Math.max(0, lines.findIndex(line => event.clientY < line.getBoundingClientRect().bottom));
    if (await action('cut:layout', { id: cut.id, side: event.clientX < box.left + box.width / 2 ? 'left' : 'right', anchor: lines.every(line => event.clientY >= line.getBoundingClientRect().bottom) ? lines.length - 1 : anchor, width: cut.width })) renderPage();
  };
  grip.onpointercancel = () => { start = null; card.style.transform = ''; card.classList.remove('cut-dragging'); };
  return card;
}
function fillCutPreview(card, cut) {
  const preview = card.querySelector('.cut-preview');
  preview.innerHTML = `${cut.blobId ? `<img src="caderno-media://blob/${cut.blobId}" alt="${escape(cut.title || 'Recorte')}" draggable="false">` : ''}${cut.kind === 'link' ? `<button class="cut-open" title="Abrir no navegador"><small>${escape(new URL(cut.url).hostname)}</small><strong>${escape(cut.title)}</strong>${cut.description ? `<p>${escape(cut.description)}</p>` : ''}<span>${cut.status === 'loading' ? 'Buscando metatags…' : cut.status === 'unavailable' ? 'Sem prévia · Abrir link ↗' : 'Abrir link ↗'}</span></button>` : ''}`;
  const open = preview.querySelector('.cut-open'); if (open) open.onclick = () => window.notebook.openCut(cut.id).catch(error => toast(error.message));
}
function mountCollage(note) {
  const old = $('#note-body'), editor = document.createElement('div');
  editor.id = 'note-body'; editor.className = 'note-body collage-editor'; editor.contentEditable = 'false'; editor.setAttribute('aria-label', 'Página com texto e recortes');
  Object.defineProperty(editor, 'value', { get: () => [...editor.querySelectorAll('.writing-line')].map(line => line.innerText.replace(/\n$/, '')).join('\n') });
  editor.oninput = old.oninput;
  const lines = note.body.split('\n');
  lines.forEach((text, index) => {
    note.cuts.filter(cut => Math.min(cut.anchor, lines.length - 1) === index).forEach(cut => editor.append(cutCard(cut)));
    const line = document.createElement('div'); line.className = 'writing-line'; line.contentEditable = 'true'; line.spellcheck = true; line.lang = 'pt-BR'; line.dataset.lineIndex = index; line.setAttribute('role', 'textbox'); line.setAttribute('aria-label', `Texto da nota, parágrafo ${index + 1}`); line.textContent = text; if (!text) line.append(document.createElement('br')); editor.append(line);
  });
  old.replaceWith(editor);
}
function cutUrl(text) { try { const url = new URL(text.trim()); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } }
async function importCuts(files, url, noteId = currentNote()?.id) {
  if (!noteId) return;
  try {
    for (const file of files) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use imagens PNG, JPEG ou WebP.');
      if (file.size > 20 * 1024 * 1024) throw new Error('Use uma imagem de até 20 MB.');
      state = await window.notebook.image({ noteId, name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    }
    if (url) state = await window.notebook.link({ noteId, url });
    if (view === 'notes' && currentNote()?.id === noteId) renderPage();
    saved(); toast('Recorte colado. Arraste pela alça para posicionar.');
  } catch (error) { if (view === 'notes' && currentNote()?.id === noteId) renderPage(); toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); }
}
$('#cut-dialog-close').onclick = () => $('#cut-dialog').close();
$('#cut-image-pick').onclick = () => $('#cut-image-file').click();
$('#cut-image-file').onchange = event => { const files = [...event.target.files]; event.target.value = ''; $('#cut-dialog').close(); if (files.length) importCuts(files, null, cutTarget); };
$('#cut-link-form').onsubmit = event => { event.preventDefault(); const url = cutUrl($('#cut-url').value); if (!url) return toast('Cole um link HTTP ou HTTPS.'); $('#cut-dialog').close(); importCuts([], url, cutTarget); };
document.addEventListener('paste', event => {
  if (view !== 'notes' || !currentNote() || !event.target.closest('#note-body')) return;
  const files = [...event.clipboardData.files], url = cutUrl(event.clipboardData.getData('text/plain'));
  if (files.length || url) { event.preventDefault(); importCuts(files, files.length ? null : url); }
  else if (event.target.closest('.writing-line')) { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); }
});
document.addEventListener('dragover', event => { if (view === 'notes' && currentNote() && event.target.closest('#page-content')) { event.preventDefault(); $('#note-body')?.classList.add('drop-active'); } });
document.addEventListener('dragleave', event => { if (!event.relatedTarget?.closest('#page-content')) $('#note-body')?.classList.remove('drop-active'); });
document.addEventListener('drop', event => {
  event.preventDefault(); $('#note-body')?.classList.remove('drop-active');
  if (view !== 'notes' || !currentNote() || !event.target.closest('#page-content')) return;
  const files = [...event.dataTransfer.files], text = event.dataTransfer.getData('text/uri-list').split('\n').find(line => line && !line.startsWith('#')) || event.dataTransfer.getData('text/plain');
  const url = cutUrl(text); if (files.length || url) importCuts(files, url);
});
window.notebook.onCutsUpdated(next => {
  // Metadata completion must not replace text being edited or move its caret.
  for (const note of state.notes) { const fresh = next.notes.find(item => item.id === note.id); if (fresh) note.cuts = fresh.cuts; }
  state.trashCuts = next.trashCuts;
  if (view === 'notes') currentNote()?.cuts.forEach(cut => { const card = document.querySelector(`[data-cut-id="${cut.id}"]`); if (card) fillCutPreview(card, cut); });
});
