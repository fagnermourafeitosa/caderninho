/* Tasks inside notes: task lines created by typing [] and the column pill they show. */
const TASK_LINE_MARKER = /^\s*\[ ?\][  ]/;

function taskLineStatus(taskId) {
  const card = taskCardOf(taskId);
  if (card) { const column = columnOf(pipelineOf(card.pipelineId), card.columnId); return { title: card.title, label: column?.name || '', done: card.done }; }
  const trashed = state.trashTasks.find(task => task.id === taskId);
  return trashed ? { title: trashed.title, label: 'na lixeira', trashed: true } : { gone: true };
}

function fillTaskLine(line) {
  const status = taskLineStatus(line.dataset.taskId), title = status.title || line.dataset.title;
  line.classList.toggle('task-line-gone', Boolean(status.gone));
  line.innerHTML = `<button type="button" class="task-line-chip" ${status.gone ? 'disabled' : ''} title="${status.gone ? 'Tarefa removida' : 'Abrir tarefa'}">${icon('kanban')}<b>${escape(title)}</b>${status.gone ? '' : `<span class="pipeline-pill ${status.done ? 'done' : ''} ${status.trashed ? 'trashed' : ''}">${status.done ? icon('tick') : ''}${escape(status.label)}</span>`}</button>`;
  line.querySelector('button').onclick = () => { if (!status.gone && !status.trashed) openTaskModal(line.dataset.taskId); else if (status.trashed) toast('A tarefa está na lixeira. Restaure-a em Lixeira › Tarefas.'); };
}

function renderTaskLineBlock(block, index) {
  const line = document.createElement('div');
  line.className = 'writing-line task-line'; line.contentEditable = 'false';
  line.dataset.blockType = 'task'; line.dataset.blockId = block.id; line.dataset.taskId = block.taskId; line.dataset.title = block.title; line.dataset.lineIndex = index;
  fillTaskLine(line);
  return line;
}
onPipelinesChanged(() => document.querySelectorAll('.task-line').forEach(fillTaskLine));

// "[] " at the start of a plain paragraph opens "Nova tarefa"; the rest of the line becomes the title.
function detectTaskLine(noteId, event) {
  if (event?.isComposing || (event?.inputType && !event.inputType.startsWith('insert'))) return false;
  let editor = $('#note-body');
  if (editor?.tagName === 'TEXTAREA') {
    const before = editor.value.slice(0, editor.selectionStart).split('\n').at(-1);
    if (!TASK_LINE_MARKER.test(before) || before.replace(TASK_LINE_MARKER, '') !== '') return false;
    editor = ensureRichEditor();
  }
  const span = getSelection().anchorNode?.parentElement?.closest('.line-text'), line = span?.closest('.writing-line');
  if (!line || !editor?.contains(line) || span.classList.contains('table-cell-text') || (line.dataset.blockType && line.dataset.blockType !== 'paragraph')) return false;
  const text = span.textContent, match = text.match(TASK_LINE_MARKER);
  if (!match || caretOffset(span) !== match[0].length) return false;
  const note = currentNote(), blockId = line.dataset.blockId;
  renderInlineRuns(span, sliceInlineRuns(readInlineRuns(span), match[0].length, text.length));
  saveDocument();
  openNewTaskModal({
    title: text.slice(match[0].length), notebookId: note.notebookId, source: { noteId, origin: { kind: 'line' } },
    onCreated: taskId => {
      if (view !== 'notes' || currentNote()?.id !== noteId) return;
      const doc = readEditorDocument(), index = doc.findIndex(block => block.id === blockId), card = taskCardOf(taskId);
      const taskBlock = { id: pageDocument.id(), type: 'task', taskId, title: card?.title || '' };
      if (index < 0) doc.push(taskBlock); else doc.splice(index, 1, taskBlock);
      const at = index < 0 ? doc.length - 1 : index;
      if (at === doc.length - 1) doc.push({ id: pageDocument.id(), type: 'paragraph', runs: pageDocument.plainRuns('') });
      replaceDocument(doc, at + 1);
    },
    onCancel: () => { const target = $('#note-body')?.querySelector(`[data-block-id="${CSS.escape(blockId)}"] .line-text`); if (target) putCaret(target, 0); },
  });
  return true;
}
