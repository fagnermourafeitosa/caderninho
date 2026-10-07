/* The pipeline page: the full kanban of the selected pipeline in Tarefas. */
const pipelineProgress = pipeline => `${pipeline.done} ${pipeline.done === 1 ? 'finalizado' : 'finalizados'} de ${pipeline.total}`;

function renderPipelinePage() {
  const note = currentNote(), label = labels.tasks;
  const toolbar = `<div class="view-toolbar"><span class="toolbar-left"><button id="back-to-index" class="toolbar-back" aria-label="${indexLabels.tasks.back}" title="${indexLabels.tasks.back}">${icon('chevron')}</button></span><span class="toolbar-right">${note ? `<button id="new-task" class="add-note toolbar-action toolbar-primary" aria-label="Nova tarefa" title="Nova tarefa">${icon('add')}<span class="toolbar-action-label">Nova tarefa</span></button>${moreMenu([moreItem('new-pipeline', 'kanban', label.create, '⌘N'), '<hr>', moreItem('trash-note', 'trash', 'Mover para a lixeira', '⇧⌘⌫', true)])}` : `<button id="new-note" class="add-note toolbar-action toolbar-primary" aria-label="${label.create}" title="${label.create}">${icon('add')}<span class="toolbar-action-label">${label.create}</span></button>`}</span></div>`;
  if (!note) {
    $('#page-content').innerHTML = toolbar + empty('Seu primeiro pipeline?', 'Organize tarefas em colunas, do Backlog ao Done.', 'tasks', `<button id="empty-create" class="primary">${actionLabel('kanban', label.create)}</button>`);
    $('#empty-create').onclick = createNote; $('#new-note').onclick = createNote; bindBack(); syncNoteCommands(); return;
  }
  const pipeline = pipelineOf(note.id);
  $('#page-content').innerHTML = `${toolbar}<input id="note-title" class="note-title" type="text" maxlength="160" aria-label="Título do pipeline" placeholder="Sem título" value="${escape(note.title)}"><div class="note-categories"><div id="category-badges" class="category-badges" aria-label="Categorias da página"></div></div><p class="note-provenance"><span id="pipeline-progress">${escape(pipelineProgress(pipeline))}</span><span class="provenance-dot" aria-hidden="true">·</span>${notebookAssociation(note)}<span class="provenance-dot" aria-hidden="true">·</span><span id="note-dates" class="list-date">${noteDates(note)}</span></p><div id="kanban-host" class="kanban-host"></div>`;
  bindBack(); bindMoreMenu();
  $('#new-task').onclick = () => openNewTaskModal({ pipelineId: note.id });
  $('#new-pipeline').onclick = createNote;
  $('#note-title').oninput = () => action('note:update', { id: note.id, title: $('#note-title').value });
  $('#trash-note').onclick = async () => { if (await turn('note:trash', { id: note.id })) toast('Pipeline movido para a lixeira. Você pode restaurá-lo.'); };
  renderKanban($('#kanban-host'), pipeline);
  updateTemporalLabels(); renderCategoryBadges(); wireNotebookAssociation(note); ensurePageHistory(note); syncNoteCommands();
}

// After a pipeline change only the board and its counters are redrawn, so the title keeps its caret.
onPipelinesChanged(() => {
  if (view !== 'tasks' || !$('#kanban-host')) return;
  const pipeline = pipelineOf(currentNote()?.id); if (!pipeline) return;
  const scroll = $('#kanban-host').scrollLeft;
  renderKanban($('#kanban-host'), pipeline);
  $('#kanban-host').scrollLeft = scroll;
  $('#pipeline-progress').textContent = pipelineProgress(pipeline);
});
