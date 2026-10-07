// Pipelines scenario, main side: native pointer dragging, persistence checks and screenshots (spec 008).
const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Store } = require('../../src/main/store.cjs');

const ROOT = path.join(__dirname, '..', '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runPipelinesSmoke(win, smokeScript) {
  const contents = win.webContents;
  const run = script => contents.executeJavaScript(script);
  const step = (name, ...args) => run(`pipelineSteps.${name}(${args.map(value => JSON.stringify(value)).join(',')})`);
  const drag = async (from, to) => {
    contents.sendInputEvent({ type: 'mouseMove', x: from.x, y: from.y });
    contents.sendInputEvent({ type: 'mouseDown', x: from.x, y: from.y, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 8; i++) { contents.sendInputEvent({ type: 'mouseMove', x: Math.round(from.x + (to.x - from.x) * i / 8), y: Math.round(from.y + (to.y - from.y) * i / 8), button: 'left' }); await wait(20); }
    contents.sendInputEvent({ type: 'mouseUp', x: to.x, y: to.y, button: 'left', clickCount: 1 });
    await wait(400);
  };
  const shot = async name => { fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'artifacts', name), (await contents.capturePage()).toPNG()); };
  await run(`window.cutTestBytes = ${JSON.stringify([...fs.readFileSync(path.join(ROOT, 'assets', 'icon.png'))])}`);
  await run(smokeScript('pipelines-smoke.js'));
  const { pipelineId } = await step('createPipeline');
  const { ids } = await step('createTasks', ['Medir a parede', 'Pedir orçamento', 'Comprar a cuba']);
  await step('configureColumns');
  await step('removeColumnWithCards', ids['Comprar a cuba']);
  // Native drag: "Medir a parede" from Backlog to Feito, then a click opens the modal.
  await drag(await step('cardPoint', 'Medir a parede'), await step('columnPoint', 'Feito'));
  const done = await step('cardsIn', 'Feito');
  if (JSON.stringify(done) !== JSON.stringify(['Medir a parede'])) throw new Error('Arrastar não moveu o card: ' + JSON.stringify(done));
  if (await step('modalOpen')) throw new Error('Arrastar abriu o modal');
  await drag(await step('cardPoint', 'Pedir orçamento'), await step('cardPoint', 'Pedir orçamento'));
  if (!await step('modalOpen')) throw new Error('Clique no card não abriu o modal');
  await step('closeModal');
  await shot('pipeline-kanban.png');
  await step('modal', ids['Pedir orçamento']);
  await shot('pipeline-after-modal.png');
  const { noteId } = await step('noteTasks', pipelineId);
  await shot('pipeline-note.png');
  await step('home', pipelineId);
  await shot('pipeline-home.png');
  await step('search', ids['Pedir orçamento']);
  await run(`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(pipelineId)}});view=state.activeView;render();openTaskModal(${JSON.stringify(ids['Pedir orçamento'])});await new Promise(r=>setTimeout(r,600));})()`);
  await shot('pipeline-modal.png');
  await run("document.querySelector('.task-modal[open]')?.close()");
  const store = new Store(app.getPath('userData'));
  try {
    const saved = store.snapshot().pipelines.find(pipeline => pipeline.id === pipelineId);
    const medir = saved.tasks.find(task => task.title === 'Medir a parede');
    if (!medir.done) throw new Error('Card arrastado não ficou finalizado no SQLite');
    const kinds = store.db.prepare('SELECT kind FROM pipeline_movements WHERE task_id=? ORDER BY id').all(medir.id).map(row => row.kind);
    if (JSON.stringify(kinds) !== JSON.stringify(['create', 'column'])) throw new Error('Histórico do arraste: ' + kinds);
  } finally { store.close(); }
  await run(`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(pipelineId)}});view=state.activeView;render();})()`);
  await step('guards', ids['Pedir orçamento']);
  await step('dragThroughRedraw', 'Comprar a cuba', 'Ready to Dev');
  await step('plainNoteTaskLine');
  console.log('PIPELINES_SMOKE_OK', JSON.stringify({ pipelineId }));
  // Typing and closing the window at once: the close waits for the pending description save.
  await step('typeBeforeClose', ids['Pedir orçamento']);
  win.once('closed', () => {
    const check = new Store(app.getPath('userData'));
    try {
      const text = JSON.stringify(check.db.prepare('SELECT description FROM pipeline_tasks WHERE id=?').get(ids['Pedir orçamento']).description);
      if (text.includes('Salvo no fechamento')) console.log('PIPELINES_CLOSE_FLUSH_OK');
      else { console.error('Descrição digitada antes de fechar não foi salva'); app.exit(1); }
    } finally { check.close(); }
  });
  win.close();
  await wait(50);
  if (!win.isDestroyed()) return wait(5000).then(() => { throw new Error('A janela não fechou depois de salvar a tarefa'); });
}

module.exports = { runPipelinesSmoke };
