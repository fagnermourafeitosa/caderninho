// The floating contextual bar over the selection, and the popover of its open button.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CaptureUpdateAction, getCommonBounds, newElementWith, sceneCoordsToViewportCoords } from '@excalidraw/excalidraw';
import { selectionKind, barControls } from './bar-model.js';
import { barPosition } from './bar-placement.js';
import { stylePatches } from './style.js';
import { CONTROLS } from './bar-controls.jsx';
import { runKeyAction, runPanelAction } from './native-actions.js';
import { wrapInFrame } from './frame-wrap.js';

const CHOICE_TARGET = { font: 'panel', size: 'panel', layer: 'key', more: 'key' };

function context({ api, host, selected, bridge }) {
  const first = selected[0], scene = api.getSceneElements();
  const label = first.boundElements?.find(bound => bound.type === 'text');
  const fills = [...new Set(selected.map(element => element.backgroundColor).filter(color => color && color !== 'transparent'))];
  const ctx = {
    api, first, several: selected.length > 1, arrow: first.type === 'arrow',
    text: first.type === 'text' ? first : label && scene.find(element => element.id === label.id),
    fillMix: fills.length > 1 ? `linear-gradient(90deg, ${fills[0]} 50%, ${fills[1]} 50%)` : fills[0] || 'transparent',
    apply(control, value) {
      const patches = new Map(stylePatches(selected, control, value));
      if (!patches.size) return;
      api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map(element => patches.has(element.id) ? newElementWith(element, patches.get(element.id)) : element), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    },
    key: name => runKeyAction(host, name),
    panel: name => runPanelAction(host, name, api),
    choose: (control, value) => CHOICE_TARGET[control] === 'panel' ? ctx.panel(`${control}:${value}`) : CHOICE_TARGET[control] === 'key' ? ctx.key(value) : ctx.apply(control, value),
    renameFrame: () => api.updateScene({ appState: { editingFrame: first.id } }),
    exportFrame: () => bridge.exportFrame(first),
    wrapFrame: () => wrapInFrame(api, selected),
  };
  return ctx;
}

export function ContextBar({ api, host, selected, tick, bridge }) {
  const bar = useRef(null);
  const [open, setOpen] = useState(null);
  const [place, setPlace] = useState(null);
  const ids = selected.map(element => element.id).join();
  useEffect(() => setOpen(null), [ids]);
  useEffect(() => {
    const close = event => { if (!bar.current?.contains(event.target)) setOpen(null); };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, []);
  useLayoutEffect(() => {
    const appState = api.getAppState(), [x1, y1, x2, y2] = getCommonBounds(selected), frame = host.getBoundingClientRect();
    const a = sceneCoordsToViewportCoords({ sceneX: x1, sceneY: y1 }, appState), b = sceneCoordsToViewportCoords({ sceneX: x2, sceneY: y2 }, appState);
    setPlace(barPosition({ x: a.x - frame.left, y: a.y - frame.top, width: b.x - a.x, height: b.y - a.y }, { width: bar.current.offsetWidth, height: bar.current.offsetHeight }, { width: frame.width, height: frame.height }));
  }, [selected, tick, open]);

  const kind = selectionKind(selected), controls = barControls(kind);
  if (!controls.length) return null;
  const ctx = context({ api, host, selected, bridge });
  const opened = open && CONTROLS[open.id];
  return (
    <div ref={bar} className="board-context-bar" role="toolbar" aria-label="Barra de contexto" data-kind={kind} style={place ? { left: place.left, top: place.top } : { visibility: 'hidden' }}>
      {controls.map((id, index) => {
        if (id === '|') return <span key={'sep' + index} className="board-separator" aria-hidden="true" />;
        const control = CONTROLS[id], isOpen = open?.id === id;
        const onClick = event => control.popover ? setOpen(isOpen ? null : { id, left: event.currentTarget.offsetLeft }) : control.run(ctx);
        return <button key={id} type="button" data-control={id} title={control.title} aria-label={control.title} aria-pressed={control.on ? control.on(ctx) : undefined} aria-expanded={control.popover ? isOpen : undefined} disabled={control.disabled?.(ctx)} className={isOpen || control.on?.(ctx) ? 'on' : ''} onClick={onClick}>{control.face(ctx)}</button>;
      })}
      {opened && <div className="board-popover-anchor" style={{ left: open.left }}>{opened.popover(ctx)}</div>}
    </div>
  );
}
