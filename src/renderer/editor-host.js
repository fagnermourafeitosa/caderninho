// The shared block editor acts on one host at a time: the note page (#note-body) or the task
// editor (description or comment) that has focus. Task editors keep their own history and images.
const RICH_EDITORS = '#note-body, .task-editor';
const RICH_EDITOR_FIELDS = '#note-body textarea, #note-body input, .task-editor textarea, .task-editor input';
const taskEditors = new WeakMap();
const taskImageUrls = new Map();
let focusedTaskEditor = null, renderingTaskEditor = false;
const activeTaskEditor = () => (focusedTaskEditor?.host.isConnected ? focusedTaskEditor : null);
const taskEditorActive = () => Boolean(activeTaskEditor());
const editorHost = () => activeTaskEditor()?.host || $('#note-body');
// Task editors embed task images; notes keep their media cards and diagrams.
const editorCommandAllowed = type => (taskEditorActive() ? !['media', 'diagram'].includes(type) : type !== 'image');

document.addEventListener('focusin', event => {
  const host = event.target.closest?.('.task-editor');
  if (host) focusedTaskEditor = taskEditors.get(host) || null;
  else if (event.target.closest?.('#note-body, #note-title, .page-content > input, .note-title')) focusedTaskEditor = null;
}, true);

function renderImageBlock(block, index) {
  const line = document.createElement('div');
  line.className = 'writing-line image-block'; line.contentEditable = 'false';
  line.dataset.blockType = 'image'; line.dataset.blockId = block.id; line.dataset.imageId = block.imageId; line.dataset.lineIndex = index;
  const url = taskImageUrls.get(block.imageId);
  line.innerHTML = `${url ? `<img src="${escape(url)}" alt="Imagem anexada">` : '<span class="image-missing">Imagem indisponível</span>'}<button type="button" class="image-remove" aria-label="Remover imagem" title="Remover imagem">${icon('close')}</button>`;
  line.querySelector('.image-remove').onclick = () => { const host = line.closest('.task-editor'); line.remove(); taskEditors.get(host)?.changed(); };
  return line;
}

const emptyParagraph = () => ({ id: pageDocument.id(), type: 'paragraph', runs: pageDocument.plainRuns('') });

function createTaskEditor(host, { doc = [], label, placeholder = '', onChange = () => {}, attachImages }) {
  host.className = 'note-body collage-editor task-editor'; host.contentEditable = 'true'; host.dataset.structured = 'true';
  host.setAttribute('aria-label', label); host.dataset.placeholder = placeholder;
  const history = new EditHistory({ title: '', body: pageDocument.text(doc), editorDoc: doc });
  const read = () => [...host.querySelectorAll('.writing-line')].map(readEditorBlock);
  const session = {
    host,
    read,
    render(next) {
      renderingTaskEditor = true;
      try { host.replaceChildren(...(next.length ? next : [emptyParagraph()]).map((block, index) => renderDocumentBlock(block, index))); }
      finally { renderingTaskEditor = false; }
      host.classList.toggle('is-empty', pageDocument.text(read()).trim() === '' && !host.querySelector('.image-block,.table-block'));
    },
    changed() {
      const next = read();
      host.classList.toggle('is-empty', pageDocument.text(next).trim() === '' && !host.querySelector('.image-block,.table-block'));
      history.record({ title: '', body: pageDocument.text(next), editorDoc: next }, 'typing');
      onChange(next);
      return Promise.resolve(true);
    },
    step(direction) {
      const restored = history.step(direction); if (!restored) return;
      session.render(restored.editorDoc); onChange(restored.editorDoc);
      const last = [...host.querySelectorAll('.line-text')].at(-1); if (last) putCaret(last, last.textContent.length);
    },
    undo() { session.step('undo'); },
    redo() { session.step('redo'); },
    // Images go right after the given line (or at the end) and the editor saves like any edit.
    async insertImages(files, afterLine = null) {
      const images = [...files].filter(file => /^image\/(png|jpeg|gif|webp)$/.test(file.type));
      if (!images.length) { if (files.length) toast('Use imagens PNG, JPEG, GIF ou WebP.'); return; }
      try {
        const attached = await attachImages(images);
        const doc = read(), lines = [...host.querySelectorAll('.writing-line')], at = afterLine ? lines.indexOf(afterLine) + 1 : doc.length;
        const blocks = attached.map(({ imageId, url }) => { taskImageUrls.set(imageId, url); return { id: pageDocument.id(), type: 'image', imageId }; });
        doc.splice(at, 0, ...blocks, ...(at >= doc.length ? [emptyParagraph()] : []));
        session.render(doc); session.changed();
      } catch (error) { toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); }
    },
    pickImage(afterLine = null) {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/gif,image/webp'; input.multiple = true;
      input.onchange = () => session.insertImages(input.files, afterLine);
      input.click();
    },
    focus() { const first = host.querySelector('.line-text'); if (first) putCaret(first, first.textContent.length); },
    destroy() { if (focusedTaskEditor === session) focusedTaskEditor = null; taskEditors.delete(host); },
  };
  taskEditors.set(host, session);
  Object.defineProperty(host, 'value', { configurable: true, get: () => pageDocument.text(read()) });
  host.onkeydown = handleWritingKey;
  host.oninput = () => session.changed();
  // Files dropped or pasted here belong to the task; they never reach the note behind the modal.
  host.ondragover = event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.stopPropagation(); host.classList.add('drop-active'); } };
  host.ondragleave = () => host.classList.remove('drop-active');
  host.ondrop = event => {
    host.classList.remove('drop-active');
    if (!event.dataTransfer.files.length) return;
    event.preventDefault(); event.stopPropagation();
    session.insertImages(event.dataTransfer.files, event.target.closest?.('.writing-line'));
  };
  host.onpaste = event => {
    event.stopPropagation();
    if (event.clipboardData.files.length) { event.preventDefault(); session.insertImages(event.clipboardData.files, getSelection().anchorNode?.parentElement?.closest('.writing-line')); return; }
    if (event.target.closest('.table-cell-text')) { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); return; }
    if (getSelection().anchorNode?.parentElement?.closest('.writing-line')) { event.preventDefault(); focusedTaskEditor = session; pasteWritingText(event.clipboardData.getData('text/plain')); }
  };
  session.render(doc);
  return session;
}
