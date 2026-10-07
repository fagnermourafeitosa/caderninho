/* Kanban board: columns, cards, dragging cards, and the column menu. Used by the pipeline page and the home strip. */
function kanbanCard(task) {
  return `<div class="kanban-card" tabindex="0" role="button" data-task-id="${escape(task.id)}" aria-label="${escape(task.title)}"><strong>${escape(task.title)}</strong><span class="kanban-card-meta"><span>${escape(shortDate(task.createdAt))}</span>${task.commentCount ? `<span class="pipeline-pill">${icon('comment')}${escape(taskCountLabel(task.commentCount))}</span>` : ''}</span></div>`;
}

function kanbanColumn(pipeline, column, index, { compact, limit }) {
  const cards = pipeline.tasks.filter(task => task.columnId === column.id).sort((a, b) => a.position - b.position);
  const shown = limit ? cards.slice(0, limit) : cards;
  const menu = compact ? '' : `<button type="button" class="kanban-column-menu" data-column-menu="${escape(column.id)}" aria-label="Opções da coluna ${escape(column.name)}" title="Opções da coluna">${icon('more')}</button>`;
  const add = !compact && index === 0 ? `<button type="button" class="kanban-add-task" data-add-task>${actionLabel('add', 'Nova tarefa')}</button>` : '';
  const more = cards.length > shown.length ? `<span class="kanban-more">${icon('add')}mais ${cards.length - shown.length}</span>` : '';
  return `<section class="kanban-column ${column.final ? 'final' : ''}" data-column-id="${escape(column.id)}" aria-label="${escape(column.name)}"><header><b>${escape(column.name)}</b><span class="kanban-count">${cards.length}</span>${column.final ? `<span class="pipeline-pill done">${icon('tick')}finalizada</span>` : ''}<span class="kanban-spacer"></span>${menu}</header><div class="kanban-cards">${shown.map(kanbanCard).join('')}${more}</div>${add}</section>`;
}

function renderKanban(container, pipeline, { compact = false, limit = 0, onAddTask } = {}) {
  const columns = pipeline.columns.map((column, index) => kanbanColumn(pipeline, column, index, { compact, limit }));
  if (!compact) columns.splice(columns.length - 1, 0, `<button type="button" class="kanban-add-column" data-add-column aria-label="Adicionar coluna" title="Adicionar coluna antes da final">${icon('add')}</button>`);
  container.innerHTML = `<div class="kanban ${compact ? 'compact' : ''}" data-pipeline-id="${escape(pipeline.id)}">${columns.join('')}</div>`;
  container.querySelectorAll('.kanban-card').forEach(card => bindKanbanCard(card, container));
  container.querySelectorAll('[data-column-menu]').forEach(button => button.onclick = () => openColumnMenu(button, pipeline.id, button.dataset.columnMenu));
  const addColumn = container.querySelector('[data-add-column]');
  if (addColumn) addColumn.onclick = async () => {
    const name = await pipelinePrompt({ title: 'Nova coluna', label: 'Nome da coluna', confirm: 'Adicionar coluna' });
    if (name) pipelineCall('pipelineColumn', { action: 'add', pipelineId: pipeline.id, name });
  };
  const addTask = container.querySelector('[data-add-task]');
  if (addTask) addTask.onclick = () => (onAddTask ? onAddTask() : openNewTaskModal({ pipelineId: pipeline.id }));
}

// Pointer dragging: a short move starts the drag; a click without moving opens the task.
function bindKanbanCard(card, container) {
  card.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTaskModal(card.dataset.taskId); } };
  card.onpointerdown = event => {
    if (event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY }, rect = card.getBoundingClientRect();
    let drag = null;
    // Document listeners keep following the pointer after it leaves the card, with or without pointer capture.
    const move = next => {
      if (next.pointerId !== event.pointerId) return;
      if (!drag && Math.hypot(next.clientX - start.x, next.clientY - start.y) < 5) return;
      if (!drag) drag = startCardDrag(card, rect, start);
      drag.follow(next.clientX, next.clientY, container);
    };
    const end = done => {
      if (done.pointerId !== event.pointerId) return;
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
      if (!drag) { if (done.type === 'pointerup' && card.contains(done.target)) openTaskModal(card.dataset.taskId); return; }
      const target = drag.finish();
      if (target && done.type === 'pointerup') pipelineCall('taskMove', { taskId: card.dataset.taskId, ...target });
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  };
}

function startCardDrag(card, rect, start) {
  const ghost = card.cloneNode(true), placeholder = document.createElement('div');
  ghost.classList.add('kanban-ghost'); ghost.style.width = rect.width + 'px';
  placeholder.className = 'kanban-placeholder'; placeholder.style.height = rect.height + 'px';
  const offset = { x: start.x - rect.left, y: start.y - rect.top };
  document.body.append(ghost); card.classList.add('dragging'); card.after(placeholder);
  return {
    follow(x, y, container) {
      ghost.style.left = x - offset.x + 'px'; ghost.style.top = y - offset.y + 'px';
      const column = [...container.querySelectorAll('.kanban-column')].find(item => { const box = item.getBoundingClientRect(); return x >= box.left && x <= box.right; });
      const list = column?.querySelector('.kanban-cards'); if (!list) return;
      const next = [...list.querySelectorAll('.kanban-card:not(.dragging)')].find(item => { const box = item.getBoundingClientRect(); return y < box.top + box.height / 2; });
      list.insertBefore(placeholder, next || list.querySelector('.kanban-more'));
    },
    finish() {
      ghost.remove(); card.classList.remove('dragging');
      const list = placeholder.parentElement, columnId = list?.closest('.kanban-column')?.dataset.columnId;
      const position = list ? [...list.children].filter(item => item === placeholder || (item.classList.contains('kanban-card') && !item.classList.contains('dragging'))).indexOf(placeholder) : -1;
      placeholder.remove();
      return columnId && position >= 0 ? { columnId, position } : null;
    },
  };
}
function closeColumnMenu() { document.querySelector('.kanban-menu')?.remove(); }
function openColumnMenu(button, pipelineId, columnId) {
  closeColumnMenu();
  const pipeline = pipelineOf(pipelineId), index = pipeline.columns.findIndex(column => column.id === columnId), column = pipeline.columns[index];
  const items = [['rename', 'edit', 'Renomear coluna', false]];
  if (!column.final) items.push(['left', 'chevron', 'Mover para a esquerda', index === 0], ['right', 'chevron', 'Mover para a direita', index >= pipeline.columns.length - 2], ['remove', 'trash', 'Remover coluna…', pipeline.columns.length <= 2]);
  const menu = document.createElement('div');
  menu.className = 'editor-popup kanban-menu'; menu.setAttribute('role', 'menu');
  menu.innerHTML = items.map(([action, name, label, disabled]) => `${action === 'remove' ? '<hr>' : ''}<button type="button" role="menuitem" data-column-action="${action}" class="${action === 'right' ? 'forward' : ''}" ${disabled ? 'disabled' : ''}>${actionLabel(name, label)}</button>`).join('');
  document.body.append(menu); popupPosition(menu, button.getBoundingClientRect());
  menu.querySelector('button:not([disabled])')?.focus();
  menu.onclick = async event => {
    const action = event.target.closest('[data-column-action]')?.dataset.columnAction; if (!action) return;
    closeColumnMenu();
    if (action === 'rename') { const name = await pipelinePrompt({ title: 'Renomear coluna', label: 'Nome da coluna', value: column.name, confirm: 'Salvar nome' }); if (name) pipelineCall('pipelineColumn', { action: 'rename', columnId, name }); }
    if (action === 'left' || action === 'right') pipelineCall('pipelineColumn', { action: 'move', columnId, toPosition: index + (action === 'left' ? -1 : 1) });
    if (action === 'remove') removeColumnFlow(pipeline, column);
  };
}

async function removeColumnFlow(pipeline, column) {
  const others = pipeline.columns.filter(item => item.id !== column.id), count = pipeline.tasks.filter(task => task.columnId === column.id).length;
  let target = others[0].id;
  if (count) target = await pipelineChoose({ title: 'Remover coluna', text: `${column.name} tem ${count} ${count === 1 ? 'tarefa' : 'tarefas'}.`, label: 'Mover as tarefas para', options: others.map(item => ({ value: item.id, label: item.name })), confirm: 'Mover e remover coluna' });
  else if (!await pipelineConfirm({ title: 'Remover coluna', text: `Remover a coluna ${column.name}?`, confirm: 'Remover coluna' })) return;
  if (target) pipelineCall('pipelineColumn', { action: 'remove', columnId: column.id, targetColumnId: target });
}
document.addEventListener('pointerdown', event => { if (!event.target.closest('.kanban-menu, [data-column-menu]')) closeColumnMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.querySelector('.kanban-menu')) closeColumnMenu(); });
