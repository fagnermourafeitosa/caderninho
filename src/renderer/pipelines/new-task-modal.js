/* "Nova tarefa": the same modal from the kanban, a note selection, the margin or a [] line. */
const notebookPipelines = notebookId => state.pipelines.filter(pipeline => !pipeline.trashed && pipeline.notebookId === notebookId).sort((a, b) => Date.parse(b.created) - Date.parse(a.created));

function openNewTaskModal({ pipelineId = null, title = '', source = null, notebookId = state.activeNotebook, onCreated = () => {}, onCancel = () => {} } = {}) {
  const options = notebookPipelines(notebookId), chosen = pipelineId || options[0]?.id;
  let created = false;
  const dialog = document.createElement('dialog');
  dialog.className = 'cut-dialog new-task-dialog'; dialog.setAttribute('aria-label', 'Nova tarefa');
  const body = options.length
    ? `<label for="new-task-title">Título</label><input id="new-task-title" maxlength="500" required autocomplete="off"><div class="new-task-row"><div><label for="new-task-pipeline">Pipeline</label><select id="new-task-pipeline">${options.map(item => `<option value="${escape(item.id)}" ${item.id === chosen ? 'selected' : ''}>${escape(item.title || 'Sem título')}</option>`).join('')}</select></div><div><label for="new-task-owner">Owner (opcional)</label><input id="new-task-owner" maxlength="120" placeholder="Quem cuida disso?" autocomplete="off"></div></div><label>Descrição</label><div id="new-task-description"></div><small class="new-task-born">Nasce em <span class="pipeline-pill" id="new-task-column"></span> no topo</small><div class="new-task-actions"><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">${actionLabel('kanban', 'Criar tarefa')}</button></div>`
    : `<p>Crie um pipeline primeiro. As tarefas sempre pertencem a um pipeline.</p><button type="button" class="primary" data-new-pipeline>${actionLabel('kanban', 'Novo pipeline')}</button>`;
  dialog.innerHTML = `<form><div class="drawer-heading"><h2>Nova tarefa</h2><button type="button" data-cancel aria-label="Cancelar">${icon('close')}</button></div>${body}</form>`;
  document.body.append(dialog);
  hostEditorMenus(dialog); guardEditorEscape(dialog);
  let description = null;
  dialog.querySelectorAll('[data-cancel]').forEach(button => button.onclick = () => dialog.close());
  dialog.addEventListener('close', () => { description?.destroy(); releaseEditorMenus(); dialog.remove(); if (!created) onCancel(); });
  if (!options.length) {
    dialog.querySelector('[data-new-pipeline]').onclick = async () => { dialog.close(); if (await action('view:select', { view: 'tasks' })) { view = state.activeView; createNote(); } };
    dialog.showModal(); return;
  }
  const input = dialog.querySelector('#new-task-title'), select = dialog.querySelector('#new-task-pipeline');
  const showColumn = () => { dialog.querySelector('#new-task-column').textContent = pipelineOf(select.value)?.columns[0]?.name || ''; };
  input.value = title.replace(/\s+/g, ' ').trim().slice(0, 500); select.onchange = showColumn; showColumn();
  description = createTaskEditor(dialog.querySelector('#new-task-description'), { doc: [], label: 'Descrição da nova tarefa', placeholder: 'Escreva com / para listas e tabelas…', attachImages: async () => { throw new Error('Adicione imagens depois de criar a tarefa.'); } });
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    if (!input.value.trim()) { input.focus(); return; }
    const submit = dialog.querySelector('[type=submit]'); submit.disabled = true;
    const result = await pipelineCall('taskCreate', { pipelineId: select.value, title: input.value, owner: dialog.querySelector('#new-task-owner').value, description: description.read(), ...(source ? { source } : {}) });
    submit.disabled = false;
    if (!result) return;
    created = true; dialog.close(); onCreated(result.taskId);
  };
  dialog.showModal(); input.focus(); input.select();
}
