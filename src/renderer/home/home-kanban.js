// Home: the most recently created pipeline of the active notebook, unchanged from spec 008.
const homePipeline = () => notebookPipelines(state.activeNotebook)[0];
function homePipelineSection() {
  const pipeline = homePipeline();
  if (!pipeline) return homeStrip('pipeline', { icon: 'kanban', label: 'Kanban' }, '', `<div class="home-pipeline-empty"><p>Nenhum pipeline ainda.</p><button type="button" class="primary" data-home-new-pipeline>${actionLabel('add', 'Novo pipeline')}</button></div>`, 'home-pipeline');
  return homeStrip('pipeline', { icon: 'kanban', label: pipeline.title || 'Sem título' }, `último pipeline · ${escape(pipelineProgress(pipeline))} <button type="button" class="daily-link" data-home-pipeline="${escape(pipeline.id)}">${actionLabel('open', 'Abrir pipeline')}</button>`, '<div id="home-kanban"></div>', 'home-pipeline');
}
function renderHomePipeline() {
  const host = $('#home-pipeline-strip'); if (!host) return;
  host.innerHTML = homePipelineSection(); bindHomeStrips(host);
  const pipeline = homePipeline(); if (pipeline && $('#home-kanban')) renderKanban($('#home-kanban'), pipeline, { compact: true, limit: 3 });
  host.querySelector('[data-home-new-pipeline]')?.addEventListener('click', async () => { if (await action('view:select', { view: 'tasks' })) { view = state.activeView; createNote(); } });
  host.querySelector('[data-home-pipeline]')?.addEventListener('click', async () => { if (await action('note:select', { id: host.querySelector('[data-home-pipeline]').dataset.homePipeline })) { view = state.activeView; render(); } });
}
onPipelinesChanged(() => { if (view === 'home') renderHomePipeline(); });
