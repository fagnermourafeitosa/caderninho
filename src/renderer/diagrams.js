// Diagram blocks: Mermaid code edited in place and drawn locally in the notebook's hand-drawn style.
const diagramTemplates = [
  ['Fluxograma', 'flowchart TD\n  A[Ideia] --> B{Vale a pena?}\n  B -->|Sim| C[Fazer]\n  B -->|Não| D[Guardar para depois]'],
  ['Sequência', 'sequenceDiagram\n  Ana->>Bia: Pode revisar o texto?\n  Bia-->>Ana: Claro, até amanhã'],
  ['Mapa mental', 'mindmap\n  root((Projeto))\n    Pessoas\n    Prazos\n    Custos'],
  ['Linha do tempo', 'timeline\n  title Semana\n  Segunda : Planejar\n  Quarta : Fazer\n  Sexta : Revisar'],
  ['Em branco', '']
];
const DIAGRAM_REDRAW_DELAY = 300;
let diagramEngineReady = false, diagramQueue = Promise.resolve(), diagramCounter = 0, diagramSession = null;

// Mermaid renders through shared global state, so drawings run one at a time.
function drawDiagramCode(code) {
  const run = diagramQueue.then(async () => {
    if (!code.trim()) return { ok: false, empty: true };
    if (!diagramEngineReady) { mermaid.initialize(diagramStyle.config); diagramEngineReady = true; }
    const id = 'diagram-render-' + (++diagramCounter);
    // Mermaid measures labels while laying out, so the glyphs for this code must be loaded first.
    try { await document.fonts.load('16px Excalifont', code); return { ok: true, svg: (await mermaid.render(id, code)).svg }; }
    catch (error) {
      // A failed render can leave Mermaid's temporary nodes in the document.
      document.getElementById(id)?.remove(); document.getElementById('d' + id)?.remove();
      const line = String(error?.message || '').match(/line (\d+)/i)?.[1];
      return { ok: false, line: line ? Number(line) : null };
    }
  });
  diagramQueue = run.catch(() => {});
  return run;
}
function diagramCode(block) { return block.querySelector('.diagram-code').value; }
async function redrawDiagram(block) {
  const code = diagramCode(block), result = await drawDiagramCode(code);
  if (!block.isConnected || diagramCode(block) !== code) return;
  const drawing = block.querySelector('.diagram-drawing'), notice = block.querySelector('.diagram-notice');
  if (result.ok) { drawing.innerHTML = result.svg; drawing.classList.remove('stale'); notice.hidden = true; return; }
  drawing.classList.toggle('stale', Boolean(drawing.firstChild));
  notice.textContent = result.empty ? 'Escreva o código do diagrama ou escolha um modelo.' : result.line ? `Não consegui desenhar: confira a linha ${result.line}.` : 'Não consegui desenhar este código. Confira a sintaxe do Mermaid.';
  notice.hidden = false;
}
function drawDiagrams(root) { root.querySelectorAll('.diagram-block').forEach(redrawDiagram); }

function renderDiagramBlock(block, index) {
  const outer = document.createElement('div');
  outer.className = 'writing-line diagram-block'; outer.contentEditable = 'false';
  Object.assign(outer.dataset, { blockType: 'diagram', blockId: block.id, lineIndex: index });
  outer.innerHTML = '<figure class="diagram-drawing" role="img" aria-label="Diagrama"></figure><p class="diagram-notice" role="status" hidden></p>'
    + '<div class="diagram-editor" hidden><div class="diagram-templates" role="group" aria-label="Modelos de diagrama"></div><textarea class="diagram-code" spellcheck="false" aria-label="Código do diagrama (Mermaid)"></textarea><button type="button" class="diagram-done">Concluir</button></div>'
    + '<div class="diagram-tools"><button type="button" data-diagram-action="edit">Editar</button><button type="button" data-diagram-action="copy">Copiar código</button><button type="button" data-diagram-action="remove">Remover diagrama</button></div>';
  const code = outer.querySelector('.diagram-code');
  // The default value travels with clones, such as the read-only home preview.
  code.value = code.textContent = block.code;
  const templates = outer.querySelector('.diagram-templates');
  for (const [label, template] of diagramTemplates) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.onclick = () => { code.value = template; diagramCodeChanged(outer, true); code.focus(); };
    templates.append(button);
  }
  let timer;
  code.oninput = () => diagramCodeChanged(outer);
  outer.redrawSoon = () => { clearTimeout(timer); timer = setTimeout(() => redrawDiagram(outer), DIAGRAM_REDRAW_DELAY); };
  code.onkeydown = event => { if (event.key === 'Escape') { event.preventDefault(); closeDiagramEditor(outer); } };
  // The code field is plain text: page editor handlers (saving with history, slash menu, paste, lists) must not see it.
  for (const name of ['input', 'beforeinput', 'paste', 'cut', 'drop', 'keyup']) code.addEventListener(name, event => event.stopPropagation());
  code.addEventListener('keydown', event => { if (!event.metaKey && !event.ctrlKey) event.stopPropagation(); });
  outer.querySelector('.diagram-done').onclick = () => closeDiagramEditor(outer);
  outer.querySelector('.diagram-drawing').ondblclick = () => openDiagramEditor(outer);
  outer.querySelectorAll('[data-diagram-action]').forEach(button => button.onclick = () => diagramAction(outer, button.dataset.diagramAction));
  // Leaving the block for elsewhere in the app closes the editor; switching to another app (window blur) does not.
  outer.addEventListener('focusout', () => setTimeout(() => { if (document.hasFocus() && !outer.contains(document.activeElement)) closeDiagramEditor(outer); }));
  redrawDiagram(outer);
  return outer;
}
function diagramCodeChanged(block, now = false) {
  // Every change is saved at once; the edit session becomes a single undo step when it closes.
  saveDocument(false, false);
  if (now) redrawDiagram(block); else block.redrawSoon();
}
function openDiagramEditor(block, fresh = false) {
  if (diagramSession?.block === block) return;
  finishDiagramSession();
  diagramSession = { block, noteId: currentNote().id };
  block.classList.add('editing'); block.querySelector('.diagram-editor').hidden = false;
  block.querySelector('.diagram-templates').hidden = !fresh;
  const code = block.querySelector('.diagram-code'); code.focus(); code.setSelectionRange(code.value.length, code.value.length);
}
function closeDiagramEditor(block) {
  if (diagramSession?.block !== block) return;
  const { noteId } = diagramSession; diagramSession = null;
  block.classList.remove('editing'); block.querySelector('.diagram-editor').hidden = true;
  redrawDiagram(block);
  const doc = block.isConnected ? readEditorDocument() : state.notes.find(item => item.id === noteId)?.editorDoc;
  if (doc) rememberNoteEdit({ id: noteId, body: pageDocument.text(doc), editorDoc: doc }, { group: false });
}
// Re-rendering the page resets its undo baseline, so an open edit session is recorded first.
function finishDiagramSession() { if (diagramSession) closeDiagramEditor(diagramSession.block); }
function diagramAction(block, name) {
  if (name === 'edit') return openDiagramEditor(block);
  if (name === 'copy') {
    // The app denies the async clipboard permission; a copy event carries the code instead.
    const code = diagramCode(block), fill = event => { event.preventDefault(); event.clipboardData.setData('text/plain', code); };
    document.addEventListener('copy', fill); const copied = document.execCommand('copy'); document.removeEventListener('copy', fill);
    return toast(copied ? 'Código do diagrama copiado.' : 'Não foi possível copiar o código.');
  }
  if (name === 'remove') {
    if (diagramSession?.block === block) diagramSession = null;
    const lines = [...$('#note-body').querySelectorAll('.writing-line')], index = lines.indexOf(block), doc = readEditorDocument();
    doc.splice(index, 1); if (!doc.length) doc.push({ id: pageDocument.id(), type: 'paragraph', runs: pageDocument.plainRuns('') });
    replaceDocument(doc, Math.max(0, Math.min(index, doc.length - 1)));
  }
}
function showDiagramTemplates() {
  const menu = $('#block-menu'); menu.classList.remove('command-palette'); menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Escolher modelo de diagrama');
  menu.innerHTML = '<small>Diagrama</small><strong>Comece por um modelo</strong><div class="diagram-template-menu" role="group"></div>';
  const list = menu.querySelector('.diagram-template-menu');
  for (const [label, template] of diagramTemplates) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.dataset.diagramTemplate = label;
    button.onclick = () => insertDiagram(template); list.append(button);
  }
  menu.onkeydown = event => { const buttons = [...list.children], at = buttons.indexOf(document.activeElement); if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return; event.preventDefault(); buttons[(at + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length].focus(); };
  popupPosition(menu, insertionContext.line.getBoundingClientRect()); list.firstChild.focus({ preventScroll: true });
}
function insertDiagram(code) {
  const id = insertEditorBlock('diagram', 0, 0, code);
  const block = id && $('#note-body').querySelector(`.diagram-block[data-block-id="${CSS.escape(id)}"]`);
  if (block) openDiagramEditor(block, !code);
}
