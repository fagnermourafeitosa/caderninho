// Pipelines scenario, renderer side (spec 008). Steps run one by one from tests/smoke/pipelines.cjs.
(() => { window.pipelineSteps = (() => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (value, label) => { if (!value) throw new Error(label); };
  const until = async (check, label, ms = 3000) => { const end = Date.now() + ms; while (Date.now() < end) { const value = check(); if (value) return value; await wait(25); } throw new Error('Timeout: ' + label); };
  const command = async (name, input) => { state = await window.notebook.action(name, input); };
  const pipeline = () => pipelineOf(currentNote().id);
  const names = () => [...document.querySelectorAll('#kanban-host .kanban-column header b')].map(item => item.textContent);
  const cards = name => [...[...document.querySelectorAll('#kanban-host .kanban-column')].find(column => column.querySelector('header b').textContent === name).querySelectorAll('.kanban-card strong')].map(item => item.textContent);
  const dialog = selector => until(() => document.querySelector(selector + '[open]'), selector);
  const submitPrompt = async value => { const open = await dialog('.pipeline-dialog'); const input = open.querySelector('input, select'); if (input.tagName === 'INPUT') input.value = value; else input.value = value; open.querySelector('form').requestSubmit(); await until(() => !open.isConnected, 'prompt closed'); };
  const columnMenu = async name => { const column = [...document.querySelectorAll('#kanban-host .kanban-column')].find(item => item.querySelector('header b').textContent === name); column.querySelector('[data-column-menu]').click(); return until(() => document.querySelector('.kanban-menu'), 'column menu'); };
  const typeIn = (host, text) => { const span = [...host.querySelectorAll('.line-text')].at(-1); putCaret(span, span.textContent.length); document.execCommand('insertText', false, text); };
  return {
    async createPipeline() {
      await command('view:select', { view: 'tasks' }); view = state.activeView;
      await command('note:create', { type: 'tasks', title: 'Reforma da cozinha' }); view = state.activeView; render();
      await until(() => document.querySelector('#kanban-host .kanban'), 'kanban rendered');
      assert(JSON.stringify(names()) === JSON.stringify(['Backlog', 'Ready to Dev', 'Doing', 'Review', 'Done']), 'Default columns: ' + names());
      const last = document.querySelector('#kanban-host .kanban-column:last-of-type');
      assert(last.classList.contains('final') && last.querySelector('.pipeline-pill.done').textContent.includes('finalizada'), 'Final column pill');
      assert(document.querySelector('#kanban-host [data-add-column]').nextElementSibling === last, 'Add column sits before the final column');
      return { pipelineId: currentNote().id };
    },
    async createTasks(titles) {
      for (const title of titles) {
        document.querySelector('#new-task').click();
        const open = await dialog('.new-task-dialog');
        assert(open.querySelector('#new-task-pipeline').value === currentNote().id, 'Pipeline preselected');
        assert(open.querySelector('#new-task-column').textContent === 'Backlog', 'Born in Backlog');
        open.querySelector('#new-task-title').value = title;
        open.querySelector('#new-task-owner').value = title === 'Pedir orçamento' ? 'Ana' : '';
        open.querySelector('form').requestSubmit();
        await until(() => !open.isConnected, 'new task closed');
      }
      await until(() => cards('Backlog').length === titles.length, 'cards created');
      assert(JSON.stringify(cards('Backlog')) === JSON.stringify([...titles].reverse()), 'Newest on top: ' + cards('Backlog'));
      return { ids: Object.fromEntries(pipeline().tasks.map(task => [task.title, task.id])) };
    },
    async configureColumns() {
      document.querySelector('#kanban-host [data-add-column]').click(); await submitPrompt('QA');
      await until(() => names().includes('QA'), 'QA added');
      assert(names().at(-2) === 'QA', 'QA before final: ' + names());
      let menu = await columnMenu('Done');
      assert(menu.querySelectorAll('button').length === 1, 'Final column only renames');
      menu.querySelector('[data-column-action=rename]').click(); await submitPrompt('Feito');
      await until(() => names().at(-1) === 'Feito', 'final renamed');
      menu = await columnMenu('Backlog');
      assert(menu.querySelector('[data-column-action=left]').disabled, 'First column cannot move left');
      menu.querySelector('[data-column-action=right]').click();
      await until(() => names()[1] === 'Backlog', 'Backlog moved right');
      menu = await columnMenu('Backlog'); menu.querySelector('[data-column-action=left]').click();
      await until(() => names()[0] === 'Backlog', 'Backlog moved back');
      menu = await columnMenu('QA'); menu.querySelector('[data-column-action=remove]').click();
      await pipelineDialogConfirm();
      await until(() => !names().includes('QA'), 'QA removed');
      return { columns: names() };
      async function pipelineDialogConfirm() { const open = await dialog('.pipeline-dialog'); open.querySelector('form').requestSubmit(); await until(() => !open.isConnected, 'confirm closed'); }
    },
    async removeColumnWithCards(taskId) {
      await window.notebook.taskMove({ taskId, columnId: pipeline().columns.find(column => column.name === 'Review').id, position: 0 }).then(next => { state = next; refreshPipelineSurfaces(); });
      await until(() => cards('Review').length === 1, 'card in Review');
      const menu = await columnMenu('Review'); menu.querySelector('[data-column-action=remove]').click();
      const open = await dialog('.pipeline-dialog');
      const select = open.querySelector('select');
      assert([...select.options].map(option => option.textContent).join() === 'Backlog,Ready to Dev,Doing,Feito', 'Target options: ' + [...select.options].map(option => option.textContent));
      select.value = pipeline().columns.find(column => column.name === 'Doing').id;
      open.querySelector('form').requestSubmit();
      await until(() => !names().includes('Review'), 'Review removed');
      assert(cards('Doing').length === 1, 'Card relocated to Doing');
      return { columns: names() };
    },
    cardPoint(title) { const card = [...document.querySelectorAll('#kanban-host .kanban-card')].find(item => item.querySelector('strong').textContent === title); card.scrollIntoView({ block: 'center', inline: 'center' }); const box = card.getBoundingClientRect(); return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + 12) }; },
    columnPoint(name) { const column = [...document.querySelectorAll('#kanban-host .kanban-column')].find(item => item.querySelector('header b').textContent === name); const box = column.querySelector('.kanban-cards').getBoundingClientRect(); return { x: Math.round(box.left + box.width / 2), y: Math.round(box.bottom - 4) }; },
    cardsIn(name) { return cards(name); },
    async modal(taskId) {
      openTaskModal(taskId);
      const open = await dialog('.task-modal');
      await until(() => open.querySelector('#task-history li'), 'history rendered');
      assert(open.querySelector('#block-menu') && open.querySelector('#format-menu'), 'Editor menus live in the modal');
      assert(open.querySelector('#task-owner').value === 'Ana', 'Owner shown');
      const title = open.querySelector('#task-title'); title.value = 'Pedir dois orçamentos'; title.dispatchEvent(new Event('input', { bubbles: true }));
      const description = open.querySelector('#task-description');
      typeIn(description, 'Ligar para a marcenaria');
      await until(() => taskCardOf(taskId).title === 'Pedir dois orçamentos', 'title saved', 4000);
      let detail = await window.notebook.taskOpen(taskId);
      await until(async () => true, 'tick');
      for (let i = 0; i < 40 && !pageDocument.text(detail.description).includes('marcenaria'); i++) { await wait(100); detail = await window.notebook.taskOpen(taskId); }
      assert(pageDocument.text(detail.description).includes('Ligar para a marcenaria'), 'Description saved: ' + pageDocument.text(detail.description));
      // Slash menu inside the modal inserts a table into the description.
      typeIn(description, ' /tab');
      await until(() => !document.querySelector('#block-menu').hidden && document.querySelector('#block-menu [data-insert-block=table]'), 'slash menu in modal');
      insertEditorBlock('table', 2, 2);
      await until(() => description.querySelector('.table-block'), 'table inserted');
      // An image dropped on the description is stored in the pipeline folder and shown as a thumbnail.
      const file = new File([new Uint8Array(window.cutTestBytes)], 'foto da pia.png', { type: 'image/png' });
      const transfer = new DataTransfer(); transfer.items.add(file);
      description.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      await until(() => description.querySelector('.image-block img'), 'image block');
      await until(() => open.querySelectorAll('.task-thumbs img').length === 1, 'thumbnail', 4000);
      const loaded = await new Promise(resolve => { const img = open.querySelector('.task-thumbs img'); if (img.complete && img.naturalWidth) resolve(true); img.onload = () => resolve(true); img.onerror = () => resolve(false); });
      assert(loaded, 'Thumbnail loads through caderno-pipeline://');
      // Comments: add, edit, remove.
      const composer = open.querySelector('#task-composer-editor');
      typeIn(composer, 'Oficina Silva respondeu'); open.querySelector('#task-comment-send').click();
      await until(() => open.querySelectorAll('.task-comment').length === 1, 'comment added');
      await until(() => document.querySelector('#kanban-host .kanban-card[data-task-id="' + taskId + '"] .pipeline-pill')?.textContent.includes('1 comentário'), 'comment pill on card');
      open.querySelector('.task-comment [data-edit]').click();
      const editor = open.querySelector('.task-comment .task-editor'); typeIn(editor, ' hoje');
      open.querySelector('.task-comment [data-save]').click();
      await until(() => open.querySelector('.task-comment-meta')?.textContent.includes('editado em'), 'edited mark');
      assert(open.querySelector('.task-comment-body').textContent.includes('respondeu hoje'), 'Edited text');
      open.querySelector('.task-comment [data-remove]').click();
      const confirm = await dialog('.pipeline-dialog'); confirm.querySelector('form').requestSubmit();
      await until(() => !open.querySelectorAll('.task-comment').length, 'comment removed');
      typeIn(composer, 'Fica este'); open.querySelector('#task-comment-send').click();
      await until(() => open.querySelectorAll('.task-comment').length === 1, 'second comment');
      // Column from the modal, then history.
      const select = open.querySelector('#task-column'); select.value = pipeline().columns.find(column => column.name === 'Doing').id; select.dispatchEvent(new Event('change'));
      await until(() => taskCardOf(taskId).columnId === select.value, 'moved from modal');
      await until(() => open.querySelector('#task-history').textContent.includes('Backlog → Doing'), 'history entry');
      open.close();
      await until(() => !document.querySelector('.task-modal'), 'modal closed');
      assert(document.body.querySelector(':scope > #block-menu'), 'Editor menus returned to the page');
      return { history: true };
    },
    async noteTasks(pipelineId) {
      await command('note:create', { type: 'notes', title: 'Visita da arquiteta' }); view = state.activeView;
      const noteId = state.selected.notes;
      await command('note:update', { id: noteId, editorDoc: [{ id: 'b1', type: 'paragraph', runs: [{ text: 'precisamos de dois orçamentos de marcenaria', marks: {} }] }, { id: 'b2', type: 'paragraph', runs: [{ text: '', marks: {} }] }] });
      render();
      const span = document.querySelector('#note-body [data-block-id=b1] .line-text');
      const range = document.createRange(); const a = editorTextPoint(span, 14), b = editorTextPoint(span, 43); range.setStart(a.node, a.offset); range.setEnd(b.node, b.offset);
      getSelection().removeAllRanges(); getSelection().addRange(range);
      openSourceComposer(selectedOrigin());
      let open = await dialog('.new-task-dialog');
      assert(open.querySelector('#new-task-title').value === 'dois orçamentos de marcenaria', 'Title prefilled: ' + open.querySelector('#new-task-title').value);
      assert(open.querySelector('#new-task-pipeline').value === pipelineId, 'Pipeline of the notebook preselected');
      open.querySelector('form').requestSubmit();
      await until(() => document.querySelector('#source-margin .task-margin-card'), 'margin task card');
      assert(document.querySelector('#source-margin .task-margin-card .pipeline-pill').textContent === 'Backlog', 'Column pill in margin');
      assert(!document.querySelector('#source-margin input[type=checkbox]'), 'No checkbox in margin');
      assert(document.querySelector('#note-body [data-source-anchor]'), 'Origin highlighted');
      // [] at the start of an empty line opens the modal; cancelling leaves plain text.
      const empty = document.querySelector('#note-body [data-block-id=b2] .line-text'); putCaret(empty, 0);
      document.execCommand('insertText', false, '[] ');
      open = await dialog('.new-task-dialog');
      assert(open.querySelector('#new-task-title').value === '', 'Empty title for a bare []');
      open.querySelector('[data-cancel]').click();
      await until(() => !document.querySelector('.new-task-dialog'), 'cancelled');
      assert(!document.querySelector('#note-body [data-block-id=b2] .line-text').textContent.includes('['), 'Marker removed on cancel');
      putCaret(document.querySelector('#note-body [data-block-id=b2] .line-text'), 0);
      document.execCommand('insertText', false, '[] ');
      open = await dialog('.new-task-dialog');
      open.querySelector('#new-task-title').value = 'Trocar a fiação'; open.querySelector('form').requestSubmit();
      await until(() => document.querySelector('#note-body .task-line .pipeline-pill'), 'task line');
      assert(document.querySelector('#note-body .task-line b').textContent === 'Trocar a fiação', 'Task line title');
      await until(() => state.notes.find(note => note.id === noteId).editorDoc?.some(block => block.type === 'task'), 'task line saved', 4000);
      return { noteId };
    },
    async home(pipelineId) {
      await command('view:select', { view: 'home' }); view = state.activeView; render();
      await until(() => document.querySelector('#home-kanban .kanban'), 'home kanban');
      const strips = [...document.querySelectorAll('#daily-overview .home-strip')].map(strip => strip.dataset.strip);
      assert(JSON.stringify(strips) === JSON.stringify(['latest', 'pipeline', 'reminders', 'notes']), 'Strip order: ' + strips);
      assert(document.querySelector('#home-kanban .kanban').dataset.pipelineId === pipelineId, 'Latest pipeline on home');
      document.querySelector('[data-fold=notes]').click();
      await until(() => state.homeFolded.notes === true, 'fold saved');
      render(); await until(() => document.querySelector('[data-strip=notes] .home-strip-body'), 'home again');
      assert(document.querySelector('[data-strip=notes] .home-strip-body').hidden, 'Folded after render');
      return { strips };
    },
    async search(taskId) {
      openGlobalSearch(); searchInput.value = 'Fica este'; renderGlobalSearch();
      assert(searchMatches[0]?.kind === 'task' && searchMatches[0].task.id === taskId, 'Comment text finds the task');
      await selectGlobalResult(0);
      await dialog('.task-modal');
      document.querySelector('.task-modal[open]').close();
      return { found: true };
    },
    async guards(taskId) {
      openTaskModal(taskId);
      let open = await dialog('.task-modal');
      // An unsent comment is not discarded silently.
      typeIn(open.querySelector('#task-composer-editor'), 'Rascunho importante');
      open.querySelector('#task-close').click();
      let confirm = await dialog('.pipeline-dialog');
      assert(open.open, 'Modal stays open while asking');
      confirm.querySelector('[data-close]').click(); await until(() => !confirm.isConnected, 'kept');
      assert(open.open && open.querySelector('#task-composer-editor').textContent.includes('Rascunho importante'), 'Keeping returns to the draft');
      open.querySelector('#task-close').click();
      confirm = await dialog('.pipeline-dialog'); confirm.querySelector('form').requestSubmit();
      await until(() => !document.querySelector('.task-modal'), 'discarded and closed');
      // A cleared title is restored instead of silently ignored.
      openTaskModal(taskId); open = await dialog('.task-modal');
      const title = open.querySelector('#task-title'), before = taskCardOf(taskId).title;
      title.value = '   '; title.dispatchEvent(new Event('input', { bubbles: true })); title.dispatchEvent(new Event('blur'));
      await until(() => title.value === before, 'title restored');
      open.close(); await until(() => !document.querySelector('.task-modal'), 'closed');
      return { guarded: true };
    },
    async dragThroughRedraw(title, target) {
      const card = [...document.querySelectorAll('#kanban-host .kanban-card')].find(item => item.querySelector('strong').textContent === title);
      const box = card.getBoundingClientRect(), to = this.columnPoint(target), id = card.dataset.taskId;
      const pointer = (type, x, y, target = card) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, button: 0, clientX: x, clientY: y }));
      pointer('pointerdown', box.left + 10, box.top + 10);
      pointer('pointermove', box.left + 40, box.top + 30, document);
      refreshPipelineSurfaces(); // another surface saved meanwhile
      pointer('pointermove', to.x, to.y, document);
      pointer('pointerup', to.x, to.y, document);
      await until(() => taskCardOf(id).columnId === pipeline().columns.find(column => column.name === target).id, 'move survived a redraw');
      return { moved: true };
    },
    async plainNoteTaskLine() {
      await command('note:create', { type: 'notes', title: 'Nota simples' }); view = state.activeView; render();
      const area = $('#note-body'); assert(area.tagName === 'TEXTAREA', 'Plain note starts as textarea');
      area.focus(); area.value = 'Antes\n[] '; area.selectionStart = area.selectionEnd = area.value.length;
      area.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' ' }));
      const open = await dialog('.new-task-dialog');
      open.querySelector('#new-task-title').value = 'Ligar para o eletricista'; open.querySelector('form').requestSubmit();
      await until(() => document.querySelector('#note-body .task-line b')?.textContent === 'Ligar para o eletricista', 'task line from a plain note');
      assert(document.querySelector('#note-body .writing-line .line-text').textContent === 'Antes', 'Text before is kept');
      return { noteId: currentNote().id };
    },
    async typeBeforeClose(taskId) {
      openTaskModal(taskId); const open = await dialog('.task-modal');
      typeIn(open.querySelector('#task-description'), ' Salvo no fechamento');
      return { typed: true };
    },
    modalOpen() { return Boolean(document.querySelector('.task-modal[open]')); },
    closeModal() { document.querySelector('.task-modal[open]')?.close(); },
  };
})(); return true; })();
