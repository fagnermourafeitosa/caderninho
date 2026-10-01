function editableText(line) { return line.querySelector('.line-text') || line; }
function readWritingLine(line) {
  const text = editableText(line).innerText.replace(/\n$/, '');
  return line.dataset.checkbox ? `[${line.dataset.checked === 'true' ? 'x' : ' '}] ${text}` : text;
}
function makeWritingLine(text, index) {
  const line = document.createElement('div'); line.className = 'writing-line'; line.contentEditable = 'false'; line.dataset.lineIndex = index;
  const span = document.createElement('span'); span.className = 'line-text'; span.contentEditable = 'true'; span.spellcheck = true; span.lang = 'pt-BR'; span.setAttribute('role', 'textbox'); span.setAttribute('aria-label', `Texto da nota, parágrafo ${index + 1}`); span.textContent = text; if (!text) span.append(document.createElement('br')); line.append(span);
  convertInlineCheckbox(line);
  return line;
}
function caretOffset(element, end = false) {
  const selection = getSelection(); if (!selection.rangeCount || !element.contains(selection.anchorNode)) return 0;
  const selected = selection.getRangeAt(0), range = document.createRange(); range.selectNodeContents(element); range.setEnd(end ? selected.endContainer : selected.startContainer, end ? selected.endOffset : selected.startOffset); return range.toString().length;
}
function putCaret(element, offset = 0) {
  element.focus(); const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let node;
  while ((node = walker.nextNode())) { if (offset <= node.length) { const range = document.createRange(); range.setStart(node, offset); range.collapse(true); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); return; } offset -= node.length; }
  const range = document.createRange(); range.selectNodeContents(element); range.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(range);
}
function convertInlineCheckbox(line) {
  const span = editableText(line), match = smartText.checkbox(span.innerText);
  if (line.dataset.checkbox || !match) return;
  const focused = span.contains(getSelection().anchorNode), offset = caretOffset(span);
  const text = span.innerText.replace(/\n$/, '').slice(match[0].length);
  span.textContent = text; if (!text) span.append(document.createElement('br'));
  line.dataset.checkbox = 'true'; line.dataset.checked = String(match[1].toLowerCase() === 'x'); line.classList.add('inline-task');
  const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'inline-check'; input.checked = line.dataset.checked === 'true'; input.setAttribute('aria-label', 'Concluir item da nota');
  input.onchange = () => { line.dataset.checked = String(input.checked); line.classList.toggle('is-checked', input.checked); const note = currentNote(); if (note) { action('note:update', { id: note.id, body: $('#note-body').value }); renderSmartMargin(); } };
  line.classList.toggle('is-checked', input.checked); line.prepend(input);
  if (focused) putCaret(span, Math.max(0, offset - match[0].length));
}
function smartNoteInput(noteId, event) {
  let editor = $('#note-body');
  if (editor.tagName === 'TEXTAREA' && editor.value.split('\n').some(line => smartText.checkbox(line))) {
    const body = editor.value, before = body.slice(0, editor.selectionStart), lineIndex = before.split('\n').length - 1;
    const offset = before.split('\n').at(-1).length, prefix = smartText.checkbox(body.split('\n')[lineIndex]);
    mountCollage({ ...currentNote(), body }); editor = $('#note-body');
    const line = editor.querySelectorAll('.writing-line')[lineIndex]; putCaret(editableText(line), Math.max(0, offset - (prefix?.[0].length || 0)));
  } else if (editor.classList.contains('collage-editor')) {
    const line = event?.target.closest('.writing-line'); if (line) convertInlineCheckbox(line);
  }
  updateDetail(); renderSmartMargin(); action('note:update', { id: noteId, body: editor.value });
}
function handleWritingKey(event) {
  const line = event.target.closest('.writing-line'); if (!line || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
  const span = editableText(line); if (!span.contains(getSelection().anchorNode)) return;
  capturePageSelection();
  const start = caretOffset(span), end = caretOffset(span, true), text = span.innerText.replace(/\n$/, '');
  if (event.key === 'Enter') {
    event.preventDefault();
    if (line.dataset.checkbox && !text) {
      line.replaceWith(makeWritingLine('', Number(line.dataset.lineIndex))); const replacement = $('#note-body').querySelector(`[data-line-index="${line.dataset.lineIndex}"]`); putCaret(editableText(replacement));
    } else {
      const prefix = line.dataset.checkbox ? '[ ] ' : '';
      span.textContent = text.slice(0, start); if (!span.textContent) span.append(document.createElement('br'));
      const next = makeWritingLine(prefix + text.slice(end), Number(line.dataset.lineIndex) + 1); line.after(next); putCaret(editableText(next));
    }
  } else if (event.key === 'Backspace' && start === 0 && end === 0 && line.dataset.checkbox) {
    event.preventDefault(); line.querySelector('.inline-check').remove(); delete line.dataset.checkbox; delete line.dataset.checked; line.classList.remove('inline-task', 'is-checked'); putCaret(span);
  } else if ((event.key === 'Backspace' && start === 0 && end === 0) || (event.key === 'Delete' && start === text.length && end === start)) {
    const lines = [...$('#note-body').querySelectorAll('.writing-line')], index = lines.indexOf(line);
    const previous = event.key === 'Backspace', neighbor = lines[index + (previous ? -1 : 1)];
    if (!neighbor) return; event.preventDefault();
    const keep = previous ? neighbor : line, remove = previous ? line : neighbor;
    const keepSpan = editableText(keep), offset = keepSpan.innerText.replace(/\n$/, '').length;
    keepSpan.textContent = keepSpan.innerText.replace(/\n$/, '') + editableText(remove).innerText.replace(/\n$/, ''); remove.remove(); putCaret(keepSpan, offset);
  } else return;
  $('#note-body').querySelectorAll('.writing-line').forEach((item, index) => item.dataset.lineIndex = index);
  $('#note-body').dispatchEvent(new Event('input', { bubbles: true }));
}
function formatStamp(due) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(due)); }
function renderSmartMargin() {
  const margin = $('#smart-margin'), note = currentNote(); if (!margin || view !== 'notes' || !note) return;
  const proposals = smartText.suggestions($('#note-body')?.value || note.body);
  const candidate = proposals.find(item => !note.enabled || item.due !== note.scheduledAt);
  const signature = JSON.stringify([candidate?.due, note.scheduledAt, note.enabled, note.fired]);
  if (margin.dataset.signature === signature) return; margin.dataset.signature = signature;
  margin.hidden = !candidate && !note.scheduledAt;
  margin.innerHTML = `${note.scheduledAt ? `<div class="margin-existing"><span>${note.enabled ? '◷ Agendado' : note.fired ? '✓ Alerta disparado' : 'Alerta cancelado'} · ${escape(formatStamp(note.scheduledAt))}</span>${note.enabled ? '<button id="margin-cancel" aria-label="Cancelar alerta da nota">×</button>' : ''}</div>` : ''}${candidate ? `<button id="margin-schedule" class="margin-stamp" title="${escape(candidate.phrase)} · Clique para ativar o alerta sonoro">◷ ${note.enabled ? 'Reagendar' : 'Agendar'}<strong>${escape(formatStamp(candidate.due))}</strong></button>` : ''}`;
  if ($('#margin-schedule')) $('#margin-schedule').onclick = async () => {
    if (await action('schedule:activate', { id: note.id, due: candidate.due })) { renderSmartMargin(); toast(`Alerta sonoro agendado para ${formatStamp(candidate.due)}. O app precisa estar aberto.`); }
  };
  if ($('#margin-cancel')) $('#margin-cancel').onclick = async () => { if (await action('schedule:cancel', { id: note.id })) { renderSmartMargin(); toast('Alerta cancelado.'); } };
}
setInterval(() => { if (state && view === 'notes') renderSmartMargin(); }, 30000);

function pasteWritingText(text) {
  const selection = getSelection(), line = selection.anchorNode?.parentElement?.closest('.writing-line');
  if (!line) return;
  capturePageSelection();
  if (!text.includes('\n')) { document.execCommand('insertText', false, text); return; }
  const span = editableText(line), original = span.innerText.replace(/\n$/, ''), start = caretOffset(span), end = caretOffset(span, true), parts = text.replace(/\r\n?/g, '\n').split('\n');
  span.textContent = original.slice(0, start) + parts[0]; convertInlineCheckbox(line);
  let last = line;
  parts.slice(1).forEach((part, index) => { const next = makeWritingLine(part + (index === parts.length - 2 ? original.slice(end) : ''), index + 1); last.after(next); last = next; });
  $('#note-body').querySelectorAll('.writing-line').forEach((item, index) => item.dataset.lineIndex = index);
  const marker = smartText.checkbox(parts.at(-1)); putCaret(editableText(last), Math.max(0, parts.at(-1).length - (marker?.[0].length || 0)));
  $('#note-body').dispatchEvent(new Event('input', { bubbles: true }));
}
