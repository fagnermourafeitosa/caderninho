// Home: the three most recent notes as cards.
function homeRecentNotesSection() {
  const live = homeIsLive(), notes = state.daily.overview.recentNotes.slice(0, 3);
  const body = notes.length ? `<div class="home-note-grid">${notes.map(note => `<button class="home-note-card" data-home-note="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}</strong><small>${escape(note.body || 'Página em branco')}</small><time>${note.updated ? formatDateTime(note.updated) : ''}</time></button>`).join('')}</div>` : '<p class="daily-empty">Suas próximas ideias aparecem aqui.</p>';
  return homeStrip('notes', { icon: 'notes', label: 'Últimas notas' }, live ? `<button class="daily-link" data-home-view="notes">${actionLabel('list', 'Ver todas')}</button>` : '', body, 'daily-section home-card');
}
