// Home graph card (spec 012): connections of the latest note of the active notebook. While the daily
// note is being written it waits for 3 s without typing; ↻ asks the main process to index now.
const HOME_GRAPH_QUIET_MS = 3000;
let homeRelatedRequest = 0, homeGraphQuietUntil = 0, homeGraphTimer;
// Without any note in the notebook there is nothing to connect: the card is left out.
function homeGraphSection() {
  const note = latestHomeNote(); if (!note) return '';
  const meta = `${note ? `<button type="button" class="daily-link" data-home-note="${escape(note.id)}">${actionLabel('open', note.title || 'Sem título')}</button>` : ''}<button type="button" class="daily-link" data-home-graph-refresh aria-label="Recalcular conexões" title="Recalcular conexões">${icon('refresh')}</button>`;
  return homeStrip('graph', { icon: 'related', label: 'Conexões' }, meta, `<div id="home-related-content" data-note-id="${escape(note?.id || '')}"><p class="daily-empty">Sem conexões ainda.</p></div>`, 'daily-section home-card home-graph');
}
// Typing in the daily note pushes the redraw back; the last pause triggers it.
function quietHomeGraph() {
  homeGraphQuietUntil = Date.now() + HOME_GRAPH_QUIET_MS;
  clearTimeout(homeGraphTimer); homeGraphTimer = setTimeout(refreshHomeRelated, HOME_GRAPH_QUIET_MS);
}
async function refreshHomeGraphNow() {
  homeGraphQuietUntil = 0; clearTimeout(homeGraphTimer);
  try { await window.notebook.relatedRefresh(); } catch (error) { toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); }
  const host = $('#home-related-content'); if (host) delete host.dataset.connections;
  await refreshHomeRelated();
}
function bindHomeGraph(section) {
  bindHomePanels(section);
  section.querySelector('[data-home-graph-refresh]').onclick = refreshHomeGraphNow;
}
function emptyHomeGraph(host, signature) {
  if (host.dataset.connections === signature) return;
  host.dataset.connections = signature; host.innerHTML = '<p class="daily-empty">Sem conexões ainda.</p>';
}
async function refreshHomeRelated() {
  let host = $('#home-related-content'); const note = latestHomeNote(), request = ++homeRelatedRequest, pair = $('.home-pair');
  if (view !== 'home' || !homeIsLive() || !pair || Date.now() < homeGraphQuietUntil) return;
  if (!note) { host?.closest('.home-strip').remove(); return; }
  if (host?.dataset.noteId !== note.id) {
    host?.closest('.home-strip').remove(); pair.insertAdjacentHTML('afterbegin', homeGraphSection());
    host = $('#home-related-content');
  }
  const section = host.closest('.home-strip');
  if (!section.dataset.bound) { bindHomeGraph(section); section.dataset.bound = '1'; }
  try {
    const data = await window.notebook.related(note.id);
    if (request !== homeRelatedRequest || view !== 'home' || !host.isConnected || host.dataset.noteId !== note.id || latestHomeNote()?.id !== note.id) return;
    const results = orderRelated(data.results).slice(0, 4), signature = JSON.stringify([note.title, data.status, results.map(item => [item.id, item.title, item.score])]);
    if (host.dataset.connections === signature) return;
    if (!results.length) { emptyHomeGraph(host, signature); return; }
    host.dataset.connections = signature;
    renderRelatedGraph(note, { ...data, results }, host, { openCenter: true });
  } catch {
    if (request === homeRelatedRequest && host.isConnected) emptyHomeGraph(host, 'error');
  }
}
