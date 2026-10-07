function editableText(line) { return line.querySelector('.line-text') || line; }
function readWritingLine(line) {
  if(line.dataset.blockType) return pageDocument.blockText(readEditorBlock(line));
  return editableText(line).innerText.replace(/\n$/, '');
}
function makeWritingLine(text, index) {
  const line = document.createElement('div'); line.className = 'writing-line'; line.contentEditable = 'true'; line.dataset.lineIndex = index;
  const span = document.createElement('span'); span.className = 'line-text'; span.contentEditable = 'true'; span.tabIndex=0; span.spellcheck = true; span.lang = 'pt-BR'; span.setAttribute('role', 'textbox'); span.setAttribute('aria-label', `Texto da nota, parágrafo ${index + 1}`); span.textContent = text; if (!text) span.append(document.createElement('br')); line.append(span);
  if (!renderingTaskEditor && !taskEditorActive()) highlightCategoryTokens(span);
  return line;
}
function caretOffset(element, end = false) {
  const selection=getSelection();if(!selection.rangeCount)return 0;
  const selected=selection.getRangeAt(0),node=end?selected.endContainer:selected.startContainer,offset=end?selected.endOffset:selected.startOffset;
  if(element.getRootNode()!==node.getRootNode())return 0;
  const range=document.createRange();range.selectNodeContents(element);
  if(!element.contains(node))return range.comparePoint(node,offset)>0?range.toString().length:0;
  range.setEnd(node,offset);return range.toString().length;
}
function putCaret(element, offset = 0) {
  element.focus(); const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let node;
  while ((node = walker.nextNode())) { if (offset <= node.length) { const range = document.createRange(); range.setStart(node, offset); range.collapse(true); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); return; } offset -= node.length; }
  const range = document.createRange(); range.selectNodeContents(element); range.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(range);
}
function smartNoteInput(noteId, event) {
  if (detectTaskLine(noteId, event)) return;
  let editor = $('#note-body');
  const categoryCursor=categoryCursorFor(event,editor);
  unfinishedCategoryNote=categoryCursor!==null&&categoryText.tokens(editor.value).some(token=>categoryCursor>token.start&&categoryCursor<=token.end)?noteId:null;
  if (!event?.isComposing && editor.tagName === 'TEXTAREA' && categoryText.tokens(editor.value).length) {
    const body = editor.value, before = body.slice(0, editor.selectionStart), lineIndex = before.split('\n').length - 1;
    const offset = before.split('\n').at(-1).length;
    transformingCategoryEditor=true;
    try {
      mountCollage({ ...currentNote(), body }); editor = $('#note-body');
      const line = editor.querySelectorAll('.writing-line')[lineIndex]; putCaret(editableText(line), offset);
    } finally { transformingCategoryEditor=false; }
  } else if (editor.classList.contains('collage-editor')) {
    const line = event?.target.closest('.writing-line');
    const lines=line?[line]:[...editor.querySelectorAll('.writing-line')];
    for(const item of lines) { if(item.classList.contains('table-block')) {if(!event?.isComposing) item.querySelectorAll('.table-cell-text').forEach(highlightCategoryTokens);} else if(!['code','divider','diagram','image','task'].includes(item.dataset.blockType)&&!event?.isComposing)highlightCategoryTokens(editableText(item)); }
  }
  updateDetail(); renderSmartMargin(); action('note:update', { id: noteId, body: editor.value, categoryCursor,...(editor.dataset.structured==='true'?{editorDoc:readEditorDocument()}:{}) });
}
function handleWritingKey(event) {
  // Form fields inside blocks (diagram code) keep their native shortcuts, such as select-all.
  if(event.target.closest(RICH_EDITOR_FIELDS)) return;
  if(handleDocumentKey(event)) return;
  if(tableKey(event)) return;
  if(getSelection().focusNode?.parentElement?.closest('[data-block-type=code]') && event.key==='Enter'&&!event.isComposing){event.preventDefault();document.execCommand('insertLineBreak');return;}
  const line = getSelection().focusNode?.parentElement?.closest('.writing-line')||event.target.closest('.writing-line'); if (!line || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
  const span = editableText(line); if (!span.contains(getSelection().anchorNode)) return;
  capturePageSelection();
  const start = caretOffset(span), end = caretOffset(span, true), text = span.innerText.replace(/\n$/, '');
  if (event.key === 'Enter') {
    event.preventDefault();
    {
      const splitRuns=readInlineRuns(span);renderInlineRuns(span,sliceInlineRuns(splitRuns,0,start));
      const next = makeWritingLine(text.slice(end), Number(line.dataset.lineIndex) + 1); if(['bullet','number','quote'].includes(line.dataset.blockType)) {next.dataset.blockType=line.dataset.blockType;next.classList.add('block-'+line.dataset.blockType);}
      renderInlineRuns(editableText(next),sliceInlineRuns(splitRuns,end,text.length));line.after(next); putCaret(editableText(next));
    }
  } else if ((event.key === 'Backspace' && start === 0 && end === 0) || (event.key === 'Delete' && start === text.length && end === start)) {
    const lines = [...editorHost().querySelectorAll('.writing-line')], index = lines.indexOf(line);
    const previous = event.key === 'Backspace', neighbor = lines[index + (previous ? -1 : 1)];
    if (!neighbor) return; event.preventDefault();
    if(['table','divider','diagram','image','task'].includes(neighbor.dataset.blockType)) {neighbor.remove();putCaret(span,start);saveDocument();return;}
    const keep = previous ? neighbor : line, remove = previous ? line : neighbor;
    const keepSpan = editableText(keep), offset = keepSpan.innerText.replace(/\n$/, '').length;
    renderInlineRuns(keepSpan,[...readInlineRuns(keepSpan),...readInlineRuns(editableText(remove))]); remove.remove(); putCaret(keepSpan, offset);
  } else return;
  editorHost().querySelectorAll('.writing-line').forEach((item, index) => item.dataset.lineIndex = index);
  editorHost().dispatchEvent(new Event('input', { bubbles: true }));
}
function formatStamp(due) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(due)); }
function renderSmartMargin() {
  const margin = $('#smart-margin'), note = currentNote(); if (!margin || view !== 'notes' || !note) return;
  const proposals = smartText.suggestions($('#note-body')?.value || note.body);
  const candidate = proposals.find(item => !note.enabled || item.due !== note.scheduledAt);
  const signature = JSON.stringify([candidate?.due, note.scheduledAt, note.enabled, note.fired]);
  if (margin.dataset.signature === signature) return; margin.dataset.signature = signature;
  margin.hidden = !candidate && !note.scheduledAt;
  margin.innerHTML = `${note.scheduledAt ? `<div class="margin-existing"><span>${note.enabled ? '◷ Agendado' : note.fired ? '✓ Alerta disparado' : 'Alerta cancelado'} · ${escape(formatStamp(note.scheduledAt))}</span>${note.enabled ? `<button id="margin-cancel" aria-label="Cancelar alerta da nota">${icon('close')}</button>` : ''}</div>` : ''}${candidate ? `<button id="margin-schedule" class="margin-stamp" title="${escape(candidate.phrase)} · Clique para ativar o alerta sonoro">◷ ${note.enabled ? 'Reagendar' : 'Agendar'}<strong>${escape(formatStamp(candidate.due))}</strong></button>` : ''}`;
  if ($('#margin-schedule')) $('#margin-schedule').onclick = async () => {
    if (await action('schedule:activate', { id: note.id, due: candidate.due })) { renderSmartMargin(); toast(`Alerta sonoro agendado para ${formatStamp(candidate.due)}. O app precisa estar aberto.`); }
  };
  if ($('#margin-cancel')) $('#margin-cancel').onclick = async () => { if (await action('schedule:cancel', { id: note.id })) { renderSmartMargin(); toast('Alerta cancelado.'); } };
}
setInterval(() => { if (state && view === 'notes') renderSmartMargin(); }, 30000);

function pasteWritingText(text) {
  const selection = getSelection();if(!selection.isCollapsed&&editorRangeParts(selection.getRangeAt(0)).length>1)deleteEditorSelection(false);
  const line = selection.anchorNode?.parentElement?.closest('.writing-line');
  if (!line) return;
  capturePageSelection();
  if (!text.includes('\n')) { document.execCommand('insertText', false, text); return; }
  const span = editableText(line), original = span.innerText.replace(/\n$/, ''), start = caretOffset(span), end = caretOffset(span, true), parts = text.replace(/\r\n?/g, '\n').split('\n'),runs=readInlineRuns(span);
  renderInlineRuns(span,[...sliceInlineRuns(runs,0,start),...pageDocument.plainRuns(parts[0])]);
  let last = line;
  parts.slice(1).forEach((part, index) => { const suffix=index===parts.length-2?sliceInlineRuns(runs,end,original.length):[],next = makeWritingLine(part+pageDocument.runText(suffix), index + 1);renderInlineRuns(editableText(next),[...pageDocument.plainRuns(part),...suffix]); last.after(next); last = next; });
  editorHost().querySelectorAll('.writing-line').forEach((item, index) => item.dataset.lineIndex = index);
  putCaret(editableText(last), parts.at(-1).length);
  editorHost().dispatchEvent(new Event('input', { bubbles: true }));
}
