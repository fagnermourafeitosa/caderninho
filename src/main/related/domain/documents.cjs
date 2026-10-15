// Searchable documents: one per active page and per linked reminder, with a content hash for the vector cache.
const { createHash } = require('node:crypto');
const pageDocument = require('../../../shared/editor-document.js');

// Diagram code is Mermaid syntax, not prose: it would relate pages by keywords like "flowchart".
const prose = note => note.editorDoc ? pageDocument.text(note.editorDoc.filter(block => block.type !== 'diagram')) : note.body;

function documents(state, ocr = {}) {
  const out = [];
  for (const n of state.notes.filter(n => !n.trashed)) {
    const categories = (n.categories || []).map(c => c.id);
    const text = [n.title, prose(n), ...(n.cuts || []).map(c => [c.title, c.description, c.kind === 'image' ? ocr[c.blobId] || '' : ''].join('\n'))].filter(Boolean).join('\n');
    out.push({ id: 'page:' + n.id, noteId: n.id, notebookId: n.notebookId, type: n.type, title: n.title || 'Sem título', text, categories });
  }
  for (const a of state.sourceActions || []) out.push({ id: 'source:' + a.id, noteId: a.noteId, sourceActionId: a.id, notebookId: a.notebookId, type: 'reminders', title: a.title, text: [a.title, a.origin?.quote].filter(Boolean).join('\n'), categories: out.find(d => d.id === 'page:' + a.noteId)?.categories || [] });
  return out.map(d => ({ ...d, hash: createHash('sha256').update(d.text).digest('hex') }));
}

module.exports = { documents };
