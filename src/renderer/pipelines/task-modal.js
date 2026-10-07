/* Task modal: title, description, images, comments, column, owner, dates and movement history. */
let taskModal = null;
const fileDataURL = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
// Images need a task: they are stored under its pipeline as soon as they are dropped.
const taskImageAttacher = taskId => async files => {
  const attached = [];
  for (const file of files) {
    const result = await window.notebook.taskAttachImage({ taskId, name: file.name, mime: file.type, dataURL: await fileDataURL(file) });
    attached.push(result);
  }
  return attached;
};
// The editor menus live in the page; while a modal dialog is open they must sit inside it to be visible.
function hostEditorMenus(dialog) { dialog.append($('#block-menu'), $('#format-menu')); }
function releaseEditorMenus() { hideEditorMenus(); document.body.append($('#block-menu'), $('#format-menu')); }
function guardEditorEscape(dialog) {
  dialog.addEventListener('cancel', event => { if (!$('#block-menu').hidden || !$('#format-menu').hidden || document.querySelector('.kanban-menu')) { event.preventDefault(); hideEditorMenus(); closeColumnMenu(); } });
}

function movementText(movement) {
  const to = `<b>${escape(movement.to)}</b>`;
  if (movement.kind === 'create') return `Criada em ${to}`;
  if (movement.kind === 'restore') return `Restaurada em ${to}`;
  if (movement.kind === 'reorder') return `Reordenada em ${escape(movement.to)} (${movement.fromPosition + 1}ª → ${movement.toPosition + 1}ª)`;
  return `${escape(movement.from)} → ${to}`;
}
const historyTime = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

// Debounced field saves; flush() runs what is pending (on close and before trashing).
function taskSaver(taskId) {
  const pending = {}; let timer = null, inFlight = 0, running = Promise.resolve();
  const flush = () => {
    clearTimeout(timer); timer = null;
    const input = { ...pending }; for (const key of Object.keys(pending)) delete pending[key];
    if (!Object.keys(input).length) return running;
    inFlight++; running = running.then(() => pipelineCall('taskUpdate', { taskId, ...input })).finally(() => { inFlight--; });
    return running;
  };
  return { set(field, value) { pending[field] = value; clearTimeout(timer); timer = setTimeout(flush, 400); }, flush, pending: () => timer !== null || inFlight > 0 };
}
// Closing the window or quitting waits for the open task's pending save, then closes again.
window.addEventListener('beforeunload', event => {
  if (!taskModal?.pending()) return;
  event.preventDefault(); event.returnValue = false;
  taskModal.flush().then(() => { if (!taskModal?.pending()) window.close(); });
});

async function openTaskModal(taskId) {
  let detail;
  try { detail = await window.notebook.taskOpen(taskId); } catch (error) { toast(pipelineError(error)); return; }
  taskModal?.dialog.close();
  for (const image of detail.images) taskImageUrls.set(image.imageId, image.url);
  const dialog = document.createElement('dialog');
  dialog.className = 'task-modal'; dialog.setAttribute('aria-label', 'Tarefa');
  dialog.innerHTML = `<div class="task-main"><div class="task-head"><textarea id="task-title" class="task-title" rows="1" maxlength="500" aria-label="Título da tarefa"></textarea><span class="page-more"><button type="button" id="task-more" aria-label="Mais ações da tarefa" title="Mais ações">${icon('more')}</button><div id="task-more-menu" class="page-more-menu" role="menu" hidden><button type="button" id="task-trash" role="menuitem" class="page-more-danger">${actionLabel('trash', 'Mover para a lixeira')}</button></div></span><button type="button" id="task-close" aria-label="Fechar tarefa" title="Fechar">${icon('close')}</button></div><span class="task-label">Descrição</span><div id="task-description"></div><div id="task-images"></div><div id="task-comments"></div></div><aside class="task-side"><label class="task-label" for="task-column">Coluna</label><select id="task-column"></select><label class="task-label" for="task-owner">${icon('user')}Owner</label><input id="task-owner" maxlength="120" placeholder="Opcional" autocomplete="off"><span class="task-label">${icon('clock')}Criada em</span><p id="task-created"></p><span class="task-label">${icon('kanban')}Pipeline</span><p id="task-pipeline"></p><span class="task-label">${icon('history')}Histórico</span><ul id="task-history" class="task-history"></ul></aside>`;
  document.body.append(dialog);
  hostEditorMenus(dialog); guardEditorEscape(dialog);
  const saver = taskSaver(taskId);
  const title = dialog.querySelector('#task-title'), owner = dialog.querySelector('#task-owner');
  title.value = detail.title; owner.value = detail.owner;
  const fit = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };
  title.oninput = () => { fit(); if (title.value.trim()) saver.set('title', title.value); };
  // A title cannot be empty: leaving the field empty brings the saved title back.
  title.onblur = () => { if (!title.value.trim()) { title.value = taskCardOf(taskId)?.title || detail.title; fit(); toast('O título da tarefa não pode ficar vazio.'); } };
  title.onkeydown = event => { if (event.key === 'Enter') event.preventDefault(); };
  owner.oninput = () => saver.set('owner', owner.value);
  const description = createTaskEditor(dialog.querySelector('#task-description'), { doc: detail.description, label: 'Descrição da tarefa', placeholder: 'Escreva com / para listas, tabela, imagem…', onChange: doc => saver.set('description', doc), attachImages: taskImageAttacher(taskId) });
  const comments = createTaskComments(dialog.querySelector('#task-comments'), taskId);
  dialog.querySelector('#task-column').onchange = event => pipelineCall('taskMove', { taskId, columnId: event.target.value, position: 0 });
  const more = dialog.querySelector('#task-more'), menu = dialog.querySelector('#task-more-menu');
  more.onclick = () => { menu.hidden = !menu.hidden; };
  dialog.querySelector('#task-trash').onclick = async () => { await saver.flush(); if (await pipelineCall('taskTrash', taskId)) { dialog.close(); toast('Tarefa movida para a lixeira. Você pode restaurá-la.'); } };
  // An unsent comment is never discarded without asking.
  const requestClose = async () => {
    if (comments.hasDraft() && !await pipelineConfirm({ title: 'Descartar comentário?', text: 'O comentário ainda não foi enviado.', confirm: 'Descartar comentário' })) return;
    dialog.close();
  };
  dialog.querySelector('#task-close').onclick = requestClose;
  dialog.addEventListener('cancel', event => { if (event.defaultPrevented) return; event.preventDefault(); requestClose(); });
  const render = next => {
    detail = next;
    for (const image of next.images) taskImageUrls.set(image.imageId, image.url);
    const pipeline = pipelineOf(next.pipelineId), card = taskCardOf(taskId);
    dialog.querySelector('#task-column').innerHTML = (pipeline?.columns || []).map(column => `<option value="${escape(column.id)}" ${column.id === card?.columnId ? 'selected' : ''}>${escape(column.name)}${column.final ? ' · finalizada' : ''}</option>`).join('');
    dialog.querySelector('#task-created').textContent = formatDateTime(next.createdAt);
    dialog.querySelector('#task-pipeline').textContent = pipeline?.title || 'Sem título';
    dialog.querySelector('#task-history').innerHTML = [...next.movements].reverse().map(item => `<li><time>${escape(historyTime(item.at))}</time><span>${movementText(item)}</span></li>`).join('');
    const thumbs = next.images.filter(image => [next.description, ...next.comments.map(comment => comment.document)].some(doc => doc.some(block => block.imageId === image.imageId)));
    dialog.querySelector('#task-images').innerHTML = thumbs.length ? `<span class="task-label">${icon('image')}Imagens da tarefa · ${thumbs.length}</span><div class="task-thumbs">${thumbs.map(image => `<img src="${escape(image.url)}" alt="Imagem da tarefa">`).join('')}</div>` : '';
    comments.render(next.comments);
  };
  const refresh = async () => {
    if (!taskCardOf(taskId)) { dialog.close(); return; }
    try { render(await window.notebook.taskOpen(taskId)); } catch (error) { toast(pipelineError(error)); }
  };
  const unsubscribe = onPipelinesChanged(refresh);
  dialog.addEventListener('close', async () => {
    unsubscribe(); await saver.flush(); description.destroy(); comments.destroy(); releaseEditorMenus(); dialog.remove();
    if (taskModal?.dialog === dialog) taskModal = null;
  });
  taskModal = { dialog, taskId, flush: saver.flush, pending: saver.pending };
  render(detail);
  dialog.showModal(); fit(); title.focus();
}
