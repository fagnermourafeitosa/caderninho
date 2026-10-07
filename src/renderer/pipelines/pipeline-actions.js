/* Pipelines in the renderer: IPC calls that refresh the snapshot, lookups and small dialogs. */
const pipelineSurfaces = new Set();
const pipelineError = error => String(error?.message || error).replace(/^Error invoking remote method '[^']+': Error: /, '');
const pipelineOf = id => state.pipelines.find(pipeline => pipeline.id === id && !pipeline.trashed);
const taskCardOf = taskId => state.pipelines.flatMap(pipeline => pipeline.tasks).find(task => task.id === taskId);
const columnOf = (pipeline, columnId) => pipeline?.columns.find(column => column.id === columnId);
const taskCountLabel = count => `${count} ${count === 1 ? 'comentário' : 'comentários'}`;
const shortDate = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

// Every surface that shows pipeline data (page, home strip, note pills, modal) re-renders after a change.
function onPipelinesChanged(render) { pipelineSurfaces.add(render); return () => pipelineSurfaces.delete(render); }
function refreshPipelineSurfaces() { for (const render of [...pipelineSurfaces]) render(); }

// Runs one pipeline command; results that carry a snapshot replace the state.
async function pipelineCall(name, input) {
  pending++; beginSaving();
  try {
    const result = await window.notebook[name](input);
    if (result?.notes) state = result; else if (result?.state) state = result.state;
    pending--; saved(); refreshPipelineSurfaces();
    return result;
  } catch (error) {
    pending--; $('#save-state').textContent = 'Falha ao salvar'; $('#save-state').classList.add('failed');
    toast(pipelineError(error), 8000); return null;
  }
}

function pipelineDialog(body, { label }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'cut-dialog pipeline-dialog'; dialog.setAttribute('aria-label', label);
  dialog.innerHTML = body;
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  return dialog;
}

// Asks for a text (column name). Resolves with the trimmed text, or null when cancelled.
function pipelinePrompt({ title, label, value = '', confirm }) {
  return new Promise(resolve => {
    const dialog = pipelineDialog(`<form method="dialog"><div class="drawer-heading"><h2>${escape(title)}</h2><button type="button" data-close aria-label="Cancelar">${icon('close')}</button></div><label>${escape(label)}<input name="value" maxlength="60" required autocomplete="off"></label><button class="primary" type="submit">${escape(confirm)}</button></form>`, { label: title });
    const input = dialog.querySelector('input'); input.value = value; input.select();
    let answer = null;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = () => { answer = input.value.trim() || null; };
    dialog.addEventListener('close', () => resolve(answer));
  });
}

// Asks to pick one option (where the cards of a removed column go).
function pipelineChoose({ title, text, label, options, confirm }) {
  return new Promise(resolve => {
    const dialog = pipelineDialog(`<form method="dialog"><div class="drawer-heading"><h2>${escape(title)}</h2><button type="button" data-close aria-label="Cancelar">${icon('close')}</button></div><p>${escape(text)}</p><label>${escape(label)}<select name="choice">${options.map(option => `<option value="${escape(option.value)}">${escape(option.label)}</option>`).join('')}</select></label><button class="primary" type="submit">${escape(confirm)}</button></form>`, { label: title });
    let answer = null;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = () => { answer = dialog.querySelector('select').value; };
    dialog.addEventListener('close', () => resolve(answer));
  });
}

function pipelineConfirm({ title, text, confirm }) {
  return new Promise(resolve => {
    const dialog = pipelineDialog(`<form method="dialog"><div class="drawer-heading"><h2>${escape(title)}</h2><button type="button" data-close aria-label="Cancelar">${icon('close')}</button></div><p>${escape(text)}</p><button class="primary danger" type="submit">${escape(confirm)}</button></form>`, { label: title });
    let answer = false;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = () => { answer = true; };
    dialog.addEventListener('close', () => resolve(answer));
  });
}
