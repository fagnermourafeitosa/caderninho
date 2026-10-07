// Board scenario, renderer side: steps the main-side driver (tests/smoke/boards.cjs) calls between native inputs.
(() => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const text = selector => document.querySelector(selector)?.textContent.trim();
  const until = async (check, label, timeout = 4000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await check()) return; await wait(40); } throw new Error('Tempo esgotado: ' + label); };
  const center = element => { const rect = element.getBoundingClientRect(); return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }; };
  window.boardSteps = {
    // Sidebar row sits between Lembretes and Lixeira; an empty notebook shows the empty state.
    async emptyIndex() {
      const rows = [...document.querySelectorAll('#sidebar [data-view]')].map(button => button.dataset.view);
      assert(rows.indexOf('boards') === rows.indexOf('reminders') + 1 && rows.indexOf('archive') === rows.indexOf('boards') + 1, 'Quadros entre Lembretes e Lixeira: ' + rows);
      assert(text('[data-view=boards] span') === 'Quadros', 'Rótulo Quadros');
      assert(document.querySelector('[data-view=boards] use').getAttribute('href') === '#icon-boards', 'Ícone do quadro');
      document.querySelector('[data-view=boards]').click(); await wait(200);
      assert(text('#page-content h1') === 'Quadros', 'Título do índice');
      assert(text('#page-content .view-description') === 'Nenhum quadro neste caderno', 'Contagem vazia');
      assert(text('.empty h2') === 'Um quadro em branco?' && text('.empty p') === 'Post-its, setas e imagens num papel sem fim.', 'Estado vazio');
      assert(text('#empty-create') === 'Novo quadro' && document.querySelector('#empty-create use').getAttribute('href') === '#icon-add', 'Botão do estado vazio');
      const button = getComputedStyle(document.querySelector('#empty-create'));
      assert(button.backgroundColor === 'rgba(0, 0, 0, 0)' && button.color === 'rgb(48, 48, 37)' && button.fontSize === '13px', 'Botão do estado vazio deve ser texto em tinta, como na referência: ' + [button.backgroundColor, button.color, button.fontSize]);
      assert(getComputedStyle(document.querySelector('.empty svg')).color === 'rgb(48, 48, 37)', 'Ilustração do estado vazio em tinta');
      assert(document.querySelector('.empty use').getAttribute('href') === '#illus-boards', 'Ilustração do quadro');
      assert(!document.querySelector('#back-to-index') && text('#new-note') === 'Novo quadro', 'Barra do índice');
      return true;
    },
    // Novo quadro opens an empty board: page header, then the canvas with the rail and the footer.
    async openNewBoard() {
      document.querySelector('#empty-create').click();
      await until(() => document.querySelector('.board-canvas .excalidraw') && !document.querySelector('.notebook.turning') && document.activeElement?.id === 'note-title', 'Excalidraw montado e página virada');
      assert(currentNote().type === 'boards' && document.querySelector('#note-title') && document.querySelector('#category-badges') && document.querySelector('#note-notebook'), 'Cabeçalho igual ao das notas');
      const tools = [...document.querySelectorAll('.board-rail [data-tool]')];
      assert(tools.map(tool => tool.dataset.tool).join() === 'selection,hand,rectangle,diamond,ellipse,arrow,line,freedraw,text,postit,image,frame,eraser', 'Ferramentas do trilho: ' + tools.map(tool => tool.dataset.tool));
      assert(tools.map(tool => tool.querySelector('small').textContent).join('') === 'VHRDOALPTN9FE', 'Atalhos do trilho');
      assert(document.querySelectorAll('.board-rail hr').length === 3, 'Três separadores no trilho');
      assert(document.querySelector('.board-rail [data-tool=selection]').classList.contains('active'), 'Seleção ativa');
      assert(text('.board-count') === '0 elementos', 'Contagem de elementos');
      for (const hidden of ['.App-toolbar', '.App-menu_top .Island', '.main-menu-trigger', '.help-icon', '.HintViewer']) {
        const element = document.querySelector('.board-canvas ' + hidden);
        assert(!element || !element.checkVisibility(), 'Controle nativo visível: ' + hidden);
      }
      const canvas = document.querySelector('.board-canvas .excalidraw__canvas.interactive');
      return { noteId: currentNote().id, canvas: center(canvas) };
    },
    activeTool: () => document.querySelector('.board-rail .active')?.dataset.tool,
    // Clicking each rail button activates it (the image tool opens a native picker, checked separately).
    async railClicks() {
      for (const tool of ['hand', 'rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text', 'postit', 'frame', 'eraser', 'selection']) {
        document.querySelector(`.board-rail [data-tool=${tool}]`).click();
        await until(() => document.querySelector('.board-rail .active')?.dataset.tool === tool, 'ferramenta ' + tool);
      }
      return true;
    },
    // Waits for pending saves so the main side can read the scene from SQLite.
    async flush() { await window.CaderninhoBoard.flush(); return true; },
    editing: () => Boolean(document.querySelector('.board-canvas textarea.excalidraw-wysiwyg')),
    editorColor: () => getComputedStyle(document.querySelector('.board-canvas textarea.excalidraw-wysiwyg')).color,
    // Bar content as data-control ids, '|' for separators; null when no bar is shown.
    barControls() {
      const bar = document.querySelector('.board-context-bar');
      return bar ? [...bar.querySelectorAll(':scope > button, :scope > .board-separator')].map(node => node.classList.contains('board-separator') ? '|' : node.dataset.control) : null;
    },
    async waitBar(kind) { await until(() => document.querySelector(`.board-context-bar[data-kind="${kind}"]`), 'barra ' + kind); return window.boardSteps.barControls(); },
    async control(id) { const button = document.querySelector(`.board-context-bar [data-control="${id}"]`); assert(button && !button.disabled, 'Controle ausente: ' + id); button.click(); await wait(120); return true; },
    // Opens a popover control and clicks the choice with that label (or swatch colour).
    async choose(id, label) {
      await window.boardSteps.control(id);
      const popover = document.querySelector('.board-context-bar .board-popover');
      assert(popover, 'Popover não abriu: ' + id);
      const choice = [...popover.querySelectorAll('button')].find(button => button.dataset.color === label || button.textContent.trim() === label);
      assert(choice, `Opção ${label} ausente em ${id}: ${popover.textContent}`);
      choice.click(); await wait(150);
      return true;
    },
    popoverText(id) { return document.querySelector('.board-context-bar .board-popover')?.textContent; },
    canvasRect() { const rect = document.querySelector('.board-canvas').getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; },
    async slider(value) { const input = document.querySelector('.board-context-bar .board-popover input[type=range]'); assert(input, 'Controle deslizante ausente'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); await wait(150); return true; },
    frameNameEditor: () => Boolean(document.querySelector('.board-canvas input.frame-name-editing, .board-canvas .frame-name input, .board-canvas input:not([type])')),
    // Paste and drop deliver real File objects, as the clipboard and Finder do.
    async pasteImage(bytes) {
      const data = new DataTransfer(); data.items.add(new File([new Uint8Array(bytes)], 'colado.png', { type: 'image/png' }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      await wait(600); return true;
    },
    async dropImage(bytes, point) {
      const data = new DataTransfer(); data.items.add(new File([new Uint8Array(bytes)], 'arrastado.png', { type: 'image/png' }));
      const target = document.elementFromPoint(point.x, point.y);
      for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { dataTransfer: data, clientX: point.x, clientY: point.y, bubbles: true, cancelable: true }));
      await wait(600); return true;
    },
    async reopen(noteId) {
      document.querySelector('#back-to-index')?.click();
      await until(() => document.querySelector(`[data-note-id="${noteId}"]`), 'linha do quadro');
      document.querySelector(`[data-note-id="${noteId}"]`).click();
      await until(() => document.querySelector('.board-canvas .excalidraw') && !document.querySelector('.notebook.turning'), 'quadro reaberto');
      await wait(500);
      assert(document.querySelector('#toast').hidden || !/imagens/.test(document.querySelector('#toast').textContent), 'Imagens não carregaram: ' + document.querySelector('#toast').textContent);
      return true;
    },
    count: () => Number(text('.board-count').split(' ')[0]),
    title: () => document.querySelector('#note-title').value,
    // Mais > Relacionados on a board answers (results or the no-connection text), never stays searching.
    async relatedAnswers() {
      document.querySelector('#related-open').click();
      await until(() => !document.querySelector('#related-content').textContent.includes('À procura de conexões'), 'Relacionados respondeu no quadro', 3000);
      const footer = document.querySelector('#footer-label').textContent;
      document.querySelector('#related-dialog').close();
      await wait(150); // the dialog gives focus back on its (asynchronous) close event
      assert(!footer.includes('Relacionados'), 'Rodapé de relacionados sobre o quadro');
      return true;
    },
    // After a board save the renderer state (search, index) carries the new text, with no navigation.
    async stateHasText(noteId, value) { await until(() => state.notes.find(note => note.id === noteId)?.body.includes(value), 'estado com o texto ' + value, 3000); return true; },
    // A save that succeeds after a failure clears the failure label.
    markFailed() { document.querySelector('#save-state').textContent = 'Falha ao salvar'; document.querySelector('#save-state').classList.add('failed'); return true; },
    async failedLabelClears() {
      await until(() => !document.querySelector('#save-state').classList.contains('failed'), 'rótulo de falha limpo', 3000);
      return true;
    },
    // Typing in the board title and undoing it with the page history (not the canvas).
    async titleUndo() {
      const title = document.querySelector('#note-title'), before = title.value;
      title.focus(); title.value = before + ' x'; title.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' x' }));
      await until(() => !pending, 'título salvo');
      title.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, ctrlKey: !/Mac/.test(navigator.platform), bubbles: true, cancelable: true }));
      await wait(400); await undoQueue;
      assert(!document.querySelector('#save-state').classList.contains('failed'), 'Desfazer no título falhou: ' + document.querySelector('#toast').textContent);
      assert(title.value === before && currentNote().title === before, 'Desfazer não restaurou o título: ' + title.value);
      return true;
    },
    async footer(direction) { document.querySelector(`.board-canvas [data-testid="button-${direction}"]`).click(); await wait(200); return true; },
    exitButtonSize() { const button = document.querySelector('#board-exit-fullscreen').getBoundingClientRect(), icon = document.querySelector('#board-exit-fullscreen svg').getBoundingClientRect(); return { width: Math.round(button.width), height: Math.round(button.height), icon: [Math.round(icon.width), Math.round(icon.height)] }; },
    fullScreen: () => document.body.classList.contains('board-full-screen') && !document.querySelector('#board-exit-fullscreen').hidden && !document.querySelector('.sidebar').checkVisibility() && !document.querySelector('#note-title').checkVisibility(),
    async more(id) { document.querySelector('#page-more').click(); await wait(80); document.querySelector('#' + id).click(); await wait(300); return true; },
    async exitButton() { document.querySelector('#board-exit-fullscreen').click(); await wait(150); return true; },
    // Every visible text in the canvas chrome must be Portuguese (or a number).
    visibleEnglish() {
      const allowed = /^(\d+%?|\d+ elementos?|[VHRDOALPTN9FE]|esc|Sair da tela cheia|Frame|Roteiro)$/;
      const shown = node => node.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const texts = [...document.querySelectorAll('.board-canvas *:not(canvas)')].filter(node => node.childElementCount === 0 && shown(node) && node.textContent.trim()).map(node => node.textContent.trim());
      return texts.filter(value => !allowed.test(value) && !/[áéíóúãõçÀ-ú]|^(Opacidade|Renomear|Exportar PNG|Agrupar|Em frame|M|P|G|XG|Normal|Código|À mão)/.test(value));
    },
    async search(query) {
      openGlobalSearch(); searchInput.value = query; renderGlobalSearch();
      const first = searchResults.querySelector('[data-search-index="0"]');
      assert(first && first.querySelector('small').textContent.startsWith('Quadro ·'), 'Busca não achou o quadro: ' + searchResults.textContent);
      first.click();
      await until(() => document.querySelector('#board-host .board-canvas .excalidraw') && !document.querySelector('.notebook.turning'), 'resultado abriu o quadro');
      await wait(300);
      assert(document.querySelector('#board-host .board-canvas .excalidraw'), 'Quadro aberto pela busca sumiu');
      return currentNote().id;
    },
    async leaveToNotes() { document.querySelector('[data-view=notes]').click(); await wait(400); return !document.querySelector('.board-canvas'); },
    async elementCount(expected) {
      await until(() => text('.board-count') === `${expected} ${expected === 1 ? 'elemento' : 'elementos'}`, 'contagem ' + expected);
      return true;
    },
    // Back on the index, the board row carries its thumbnail once the first save sent one.
    async indexWithThumbnail(noteId, line) {
      document.querySelector('#back-to-index').click();
      await until(() => document.querySelector(`[data-note-id="${noteId}"] .board-thumbnail img`), 'miniatura no índice', 8000);
      assert(text('#page-content .view-description') === '1 quadro neste caderno', 'Contagem do índice');
      const row = document.querySelector(`[data-note-id="${noteId}"]`);
      assert(text('.note-index-row strong') === 'Sem título', 'Quadro sem título');
      assert(new RegExp(`^\\d{2}/\\d{2}/\\d{4}, \\d{2}:\\d{2} · ${line}$`).test(row.querySelector('small').textContent), 'Linha do índice: ' + row.querySelector('small').textContent);
      return true;
    },
  };
  return { errors: window.smokeErrors };
})()
