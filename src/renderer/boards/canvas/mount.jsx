// Bundle entry: window.CaderninhoBoard mounts one board into the page and answers the page glue.
import './asset-path.js';
import { createRoot } from 'react-dom/client';
import { BoardApp } from './board-app.jsx';
import { exportData } from './export.js';
import { runPanelAction } from './native-actions.js';

let current = null, generation = 0, leaving = Promise.resolve();

async function loadFiles(api, noteId, files, onError) {
  const results = await Promise.allSettled(files.map(file => api.boardFile({ noteId, fileId: file.fileId })));
  if (results.some(result => result.status === 'rejected')) onError('Algumas imagens do quadro não foram encontradas.');
  return Object.fromEntries(results.filter(result => result.status === 'fulfilled').map(({ value }) => [value.fileId, { id: value.fileId, mimeType: value.mime, dataURL: value.dataURL, created: Date.now() }]));
}

// Excalidraw only cancels what is in progress on Esc; an idle canvas lets the page use it (leave full screen).
const idle = api => { const state = api.getAppState(); return !state.editingTextElement && !state.newElement && !state.editingFrame && state.activeTool.type === 'selection' && !Object.keys(state.selectedElementIds).length; };

function keyGuard(element, options, getApi) {
  return event => {
    const api = getApi();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f' && !event.shiftKey) { event.preventDefault(); event.stopPropagation(); options.onSearch(); }
    else if (event.key === 'Escape' && api && idle(api)) options.onIdleEscape();
  };
}

async function mount(element, options) {
  unmount();
  const ticket = ++generation;
  // The previous board's last save must land before this one reads its version.
  await leaving;
  const { noteId, api } = options;
  const opened = await api.boardOpen(noteId);
  const binaryFiles = await loadFiles(api, noteId, opened.files, options.onError);
  if (ticket !== generation) return false;
  const root = createRoot(element);
  const entry = { root, element, noteId, api, title: options.title, onError: options.onError, controller: null };
  const bridge = {
    api, onSaved: options.onSaved, onError: options.onError,
    exportFrame: frame => exportImage('png', frame),
  };
  const guard = keyGuard(element, options, () => entry.controller?.api);
  element.addEventListener('keydown', guard, true);
  entry.dispose = () => element.removeEventListener('keydown', guard, true);
  current = entry;
  await new Promise(resolve => root.render(<BoardApp board={{ ...opened, binaryFiles }} bridge={bridge} onReady={controller => { entry.controller = controller; resolve(); }} />));
  return true;
}

// Saves what is pending, then removes the React tree; safe to call when nothing is mounted.
function unmount() {
  generation++;
  const entry = current;
  current = null;
  if (entry) leaving = leaving.then(async () => {
    try { await entry.controller?.flush(); }
    finally { entry.dispose(); entry.root.unmount(); }
  }).catch(error => { entry.onError(error.message); });
  return leaving;
}

async function exportImage(format, frame = null) {
  const entry = current;
  if (!entry?.controller) return { saved: false };
  const title = entry.title?.() || 'Quadro';
  const data = await exportData(entry.controller.api, format, frame);
  return entry.api.boardExport({ noteId: entry.noteId, format, name: frame?.name || title, data });
}

window.CaderninhoBoard = {
  mount, unmount, exportImage,
  flush: () => current?.controller?.flush() ?? Promise.resolve(),
  pending: () => Boolean(current?.controller?.pending()),
  hasFocus: () => Boolean(current && current.element.contains(document.activeElement)),
  history: direction => Boolean(current) && runPanelAction(current.element, direction),
  noteId: () => current?.noteId ?? null,
};
