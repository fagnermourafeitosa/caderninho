/* Comments of a task: read-only rich text, edit in place, remove with confirmation, and the composer. */
function renderReadOnlyDocument(target, doc) {
  const page = document.createElement('div');
  renderingTaskEditor = true;
  try { doc.forEach((block, index) => page.append(renderDocumentBlock(block, index))); } finally { renderingTaskEditor = false; }
  page.querySelectorAll('.image-remove,.table-tools').forEach(element => element.remove());
  page.querySelectorAll('[contenteditable]').forEach(element => element.removeAttribute('contenteditable'));
  page.querySelectorAll('[role="textbox"],[tabindex]').forEach(element => { element.removeAttribute('role'); element.removeAttribute('tabindex'); });
  target.replaceChildren(...page.childNodes);
  target.querySelectorAll('a').forEach(anchor => anchor.onclick = event => { event.preventDefault(); if (event.metaKey || event.ctrlKey) window.notebook.openLink(anchor.href).catch(error => toast(error.message)); });
}

function createTaskComments(container, taskId) {
  let editing = null, composer = null, draft = [];
  const attach = taskImageAttacher(taskId);
  container.innerHTML = '<span class="task-label" id="task-comments-label"></span><div class="task-comment-list"></div><div class="task-composer"><div id="task-composer-editor"></div><button type="button" class="primary" id="task-comment-send">Comentar</button></div>';
  const list = container.querySelector('.task-comment-list');
  const resetComposer = () => {
    composer?.destroy(); draft = [];
    composer = createTaskEditor(container.querySelector('#task-composer-editor'), { doc: [], label: 'Novo comentário', placeholder: 'Escreva um comentário… (arraste imagens aqui)', onChange: doc => { draft = doc; }, attachImages: attach });
  };
  resetComposer();
  container.querySelector('#task-comment-send').onclick = async () => {
    const doc = composer.read();
    if (!pageDocument.text(doc).trim() && !doc.some(block => block.type === 'image' || block.type === 'table')) { toast('Escreva um comentário primeiro.'); return; }
    if (await pipelineCall('taskComment', { action: 'add', taskId, document: doc })) resetComposer();
  };
  const edit = (comment, item) => {
    editing?.session.destroy();
    const body = item.querySelector('.task-comment-body');
    body.innerHTML = '';
    const session = createTaskEditor(body, { doc: comment.document, label: 'Editar comentário', onChange: () => {}, attachImages: attach });
    editing = { id: comment.id, session };
    const actions = document.createElement('div'); actions.className = 'task-comment-actions';
    actions.innerHTML = '<button type="button" data-cancel>Cancelar</button><button type="button" class="primary" data-save>Salvar comentário</button>';
    item.append(actions);
    actions.querySelector('[data-cancel]').onclick = () => { session.destroy(); editing = null; api.render(api.comments); };
    actions.querySelector('[data-save]').onclick = async () => { const doc = session.read(); session.destroy(); editing = null; if (!await pipelineCall('taskComment', { action: 'edit', commentId: comment.id, document: doc })) api.render(api.comments); };
    session.focus();
  };
  const api = {
    comments: [],
    render(comments) {
      api.comments = comments;
      container.querySelector('#task-comments-label').innerHTML = `${icon('comment')}Comentários · ${comments.length}`;
      if (editing) return; // keep the comment being edited untouched until it is saved or cancelled
      list.innerHTML = comments.map(comment => `<article class="task-comment" data-comment-id="${escape(comment.id)}"><div class="task-comment-meta"><span>${escape(formatDateTime(comment.createdAt))}${comment.editedAt ? ` · editado em ${escape(formatDateTime(comment.editedAt))}` : ''}</span><span class="kanban-spacer"></span><button type="button" data-edit aria-label="Editar comentário" title="Editar">${icon('edit')}</button><button type="button" data-remove aria-label="Remover comentário" title="Remover">${icon('trash')}</button></div><div class="task-comment-body note-body"></div></article>`).join('');
      list.querySelectorAll('.task-comment').forEach(item => {
        const comment = comments.find(entry => entry.id === item.dataset.commentId);
        renderReadOnlyDocument(item.querySelector('.task-comment-body'), comment.document);
        item.querySelector('[data-edit]').onclick = () => edit(comment, item);
        item.querySelector('[data-remove]').onclick = async () => { if (await pipelineConfirm({ title: 'Remover comentário', text: 'O comentário será apagado. Isso não pode ser desfeito.', confirm: 'Remover comentário' })) pipelineCall('taskComment', { action: 'remove', commentId: comment.id }); };
      });
    },
    hasDraft: () => Boolean(pageDocument.text(draft).trim()) || draft.some(block => block.type === 'image' || block.type === 'table'),
    destroy() { composer?.destroy(); editing?.session.destroy(); },
  };
  return api;
}
