// The board canvas: Excalidraw with its native chrome hidden, Caderninho's rail, contextual bar and footer count.
import { useRef, useState, useCallback } from 'react';
import { Excalidraw, FONT_FAMILY } from '@excalidraw/excalidraw';
import { ToolRail } from './tool-rail.jsx';
import { ContextBar } from './context-bar.jsx';
import { gridBackground } from './grid.js';
import { useBoardSession } from './use-board-session.js';

const APP_STATE = { viewBackgroundColor: 'transparent', currentItemStrokeColor: '#303025', currentItemBackgroundColor: 'transparent', currentItemFillStyle: 'solid', currentItemStrokeWidth: 2, currentItemStrokeStyle: 'solid', currentItemRoughness: 1, currentItemFontFamily: FONT_FAMILY.Excalifont, currentItemFontSize: 20, currentItemOpacity: 100 };
const UI_OPTIONS = { canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false }, tools: { image: true } };
const TOOL_FOR = { postit: { type: 'custom', customType: 'postit' }, image: { type: 'image', insertOnCanvasDirectly: true } };
const busy = appState => appState.cursorButton === 'down' || Boolean(appState.editingTextElement || appState.newElement || appState.resizingElement || appState.isRotating || appState.selectedElementsAreBeingDragged || appState.editingFrame);
const isLabel = element => element.type === 'text' && element.containerId;
const plural = count => `${count} ${count === 1 ? 'elemento' : 'elementos'}`;

function applyGrid(node, viewport) {
  if (!node) return;
  const grid = gridBackground(viewport);
  node.style.backgroundSize = grid.size;
  node.style.backgroundPosition = grid.position;
}

export function BoardApp({ board, bridge, onReady }) {
  const host = useRef(null);
  const [api, setApi] = useState(null);
  const [view, setView] = useState({ tool: 'selection', selected: [], hidden: false, count: 0, tick: 0 });
  const sceneChanged = useBoardSession({ api, host, board, bridge, onSessionReady: session => onReady({ ...session, api, host: host.current }) });

  const onChange = useCallback((elements, appState) => {
    sceneChanged(elements, appState);
    const live = elements.filter(element => !element.isDeleted);
    const selected = live.filter(element => appState.selectedElementIds[element.id] && !(isLabel(element) && appState.selectedElementIds[element.containerId]));
    const tool = appState.activeTool.type === 'custom' ? appState.activeTool.customType : appState.activeTool.type;
    const next = { tool, selected, hidden: busy(appState), count: live.filter(element => !isLabel(element)).length };
    setView(previous => previous.tool === next.tool && previous.hidden === next.hidden && previous.count === next.count && previous.selected.length === next.selected.length && previous.selected.every((element, index) => element === next.selected[index]) ? previous : { ...next, tick: previous.tick });
  }, [sceneChanged]);

  const onScroll = useCallback((scrollX, scrollY, zoom) => {
    applyGrid(host.current, { scrollX, scrollY, zoom: zoom.value });
    setView(previous => ({ ...previous, tick: previous.tick + 1 }));
  }, []);

  // Excalidraw handles keys only while its container has focus, and it does not take focus on a canvas press.
  const focusCanvas = () => host.current?.querySelector('.excalidraw-container')?.focus({ preventScroll: true });
  const onPointerDown = event => { if (event.target.closest('.excalidraw__canvas, .board-rail')) focusCanvas(); };
  const selectTool = tool => { if (!api) return; api.setActiveTool(TOOL_FOR[tool] || { type: tool }); focusCanvas(); };
  return (
    <div className="board-canvas" onPointerDownCapture={onPointerDown} ref={node => { host.current = node; applyGrid(node, board.scene.viewport); }}>
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={{ elements: board.scene.elements, files: board.binaryFiles, appState: { ...APP_STATE, scrollX: board.scene.viewport.scrollX, scrollY: board.scene.viewport.scrollY, zoom: { value: board.scene.viewport.zoom } } }}
        langCode="pt-BR" theme="light" UIOptions={UI_OPTIONS} handleKeyboardGlobally={false} detectScroll
        validateEmbeddable={false} renderTopRightUI={() => null}
        onChange={onChange} onScrollChange={onScroll}
      />
      <ToolRail active={view.tool} onSelect={selectTool} />
      {api && !view.hidden && view.selected.length > 0 && <ContextBar api={api} host={host.current} selected={view.selected} tick={view.tick} bridge={bridge} />}
      <span className="board-count">{plural(view.count)}</span>
    </div>
  );
}
