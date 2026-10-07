// Board session wiring around the Excalidraw API: autosave, the post-it tool and readable post-it labels.
import { useEffect, useRef } from 'react';
import { CaptureUpdateAction, convertToExcalidrawElements, getSceneVersion, newElementWith } from '@excalidraw/excalidraw';
import { createSaveScheduler } from './save-scheduler.js';
import { createBoardPersistence } from './persistence.js';
import { postItSkeleton, invisibleLabels, POST_IT_INK } from './post-it.js';
import { thumbnailDataURL } from './export.js';
import { runKeyAction } from './native-actions.js';

const viewportOf = appState => ({ scrollX: appState.scrollX, scrollY: appState.scrollY, zoom: appState.zoom.value });
const plainKey = (event, letter) => event.key.toLowerCase() === letter && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;

export function useBoardSession({ api, host, board, bridge, onSessionReady }) {
  const signature = useRef(null);
  const session = useRef(null);
  useEffect(() => {
    if (!api) return undefined;
    const persistence = createBoardPersistence({
      api: bridge.api, noteId: board.noteId, version: board.version, attached: board.files.map(file => file.fileId),
      getState: () => ({ elements: api.getSceneElementsIncludingDeleted(), viewport: viewportOf(api.getAppState()), files: api.getFiles() }),
      thumbnail: () => thumbnailDataURL(api),
      onSaved: bridge.onSaved,
      onRejectedFile: (fileId, error) => {
        api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map(element => element.fileId === fileId ? newElementWith(element, { isDeleted: true }) : element), captureUpdate: CaptureUpdateAction.NEVER });
        bridge.onError(error.message);
      },
    });
    const scheduler = createSaveScheduler({ persist: persistence.persist, onError: error => bridge.onError(error.message) });
    // The post-it tool is a custom Excalidraw tool: the next press on the canvas drops a note there.
    const insertPostIt = origin => {
      const [note] = convertToExcalidrawElements([postItSkeleton(origin)]);
      api.updateScene({ elements: [...api.getSceneElementsIncludingDeleted(), note], appState: { selectedElementIds: { [note.id]: true } }, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      api.setActiveTool({ type: 'selection' });
      setTimeout(() => runKeyAction(host.current, 'editText'), 0);
    };
    const offPointer = api.onPointerDown((tool, pointer) => { if (tool.type === 'custom' && tool.customType === 'postit') insertPostIt(pointer.origin); });
    api.registerAction({ name: 'caderninhoPostIt', label: 'Post-it', trackEvent: false, keyTest: event => plainKey(event, 'n'), perform: () => { api.setActiveTool({ type: 'custom', customType: 'postit' }); return false; } });
    session.current = { scheduler, persistence };
    onSessionReady({ flush: () => scheduler.flush(), pending: () => scheduler.pending(), postIt: () => api.setActiveTool({ type: 'custom', customType: 'postit' }) });
    return () => { offPointer(); scheduler.dispose(); session.current = null; };
  }, [api]);

  // Called from Excalidraw's onChange: schedules a save for scene or viewport changes, never for selection only.
  return function sceneChanged(elements, appState) {
    const next = `${getSceneVersion(elements)}:${appState.scrollX}:${appState.scrollY}:${appState.zoom.value}`;
    if (signature.current === null) { signature.current = next; return; }
    if (next !== signature.current) { signature.current = next; session.current?.scheduler.changed(); }
    const hidden = invisibleLabels(elements);
    if (hidden.length) queueMicrotask(() => api?.updateScene({ elements: api.getSceneElementsIncludingDeleted().map(element => hidden.includes(element.id) ? newElementWith(element, { strokeColor: POST_IT_INK }) : element), captureUpdate: CaptureUpdateAction.NEVER }));
  };
}
