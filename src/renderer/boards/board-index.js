/* Board rows in the Quadros index: a 64×40 thumbnail, the title and "date · board text". */
const boardThumbnails = new Map();

function boardIndexRow(note) {
  // Each text element is one line of the extracted body; the row shows them as "a · b · c".
  const text = note.body.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ').slice(0, 160) || 'Quadro em branco';
  return `<button class="note-index-row board-index-row" data-note-id="${escape(note.id)}"><span class="board-thumbnail" ${note.hasThumbnail ? `data-thumbnail="${escape(note.id)}" data-version="${escape(note.updated)}"` : ''}></span><span class="board-index-copy"><strong>${escape(note.title || 'Sem título')}</strong><small>${escape(formatDateTime(note.updated))} · ${escape(text)}</small></span></button>`;
}

// Thumbnails load only for rows that come into view; the latest one per board is kept.
function loadBoardThumbnails(container) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      showBoardThumbnail(entry.target);
    }
  }, { root: container });
  container.querySelectorAll('[data-thumbnail]').forEach(slot => observer.observe(slot));
}
async function showBoardThumbnail(slot) {
  const noteId = slot.dataset.thumbnail, version = slot.dataset.version;
  try {
    // One entry per board: a newer version replaces the older image.
    if (boardThumbnails.get(noteId)?.version !== version) boardThumbnails.set(noteId, { version, png: (await window.notebook.boardThumbnailRead(noteId))?.png || null });
    const png = boardThumbnails.get(noteId).png;
    if (png && slot.isConnected) { const image = new Image(); image.alt = ''; image.src = png; slot.replaceChildren(image); }
  } catch (error) { console.error('Miniatura do quadro:', error.message); }
}
