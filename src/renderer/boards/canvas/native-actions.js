// Runs Excalidraw's own actions for bar buttons: its keyboard bindings, or its (CSS-hidden) properties panel.
// The imperative API has no executeAction; these paths keep Excalidraw's logic (bindings, text metrics, routing).
const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const key = (k, code, mods = {}) => ({ key: k, code, ...mods });
const KEYS = {
  duplicate: key('d', 'KeyD', { cmd: true }),
  delete: key('Delete', 'Delete'),
  bringForward: key(']', 'BracketRight', { cmd: true }),
  sendBackward: key('[', 'BracketLeft', { cmd: true }),
  bringToFront: key(']', 'BracketRight', isMac ? { cmd: true, alt: true } : { cmd: true, shift: true }),
  sendToBack: key('[', 'BracketLeft', isMac ? { cmd: true, alt: true } : { cmd: true, shift: true }),
  group: key('g', 'KeyG', { cmd: true }),
  lock: key('l', 'KeyL', { cmd: true, shift: true }),
  copyStyles: key('c', 'KeyC', { cmd: true, alt: true }),
  pasteStyles: key('v', 'KeyV', { cmd: true, alt: true }),
  alignLeft: key('ArrowLeft', 'ArrowLeft', { cmd: true, shift: true }),
  alignTop: key('ArrowUp', 'ArrowUp', { cmd: true, shift: true }),
  distribute: key('h', 'KeyH', { alt: true }),
  editText: key('Enter', 'Enter'),
};
const PANEL = {
  alignHorizontal: 'align-horizontal-center',
  'font:À mão': 'font-family-hand-drawn', 'font:Normal': 'font-family-normal', 'font:Código': 'font-family-code',
  'size:P': 'fontSize-small', 'size:M': 'fontSize-medium', 'size:G': 'fontSize-large', 'size:XG': 'fontSize-veryLarge',
  sharpArrow: 'sharp-arrow', curveArrow: 'round-arrow', elbowArrow: 'elbow-arrow',
  undo: 'button-undo', redo: 'button-redo',
};

export function runKeyAction(host, name) {
  const spec = KEYS[name], target = host.querySelector('.excalidraw__canvas.interactive');
  if (!spec || !target) return false;
  const init = { key: spec.key, code: spec.code, bubbles: true, cancelable: true, altKey: Boolean(spec.alt), shiftKey: Boolean(spec.shift), metaKey: Boolean(spec.cmd && isMac), ctrlKey: Boolean(spec.cmd && !isMac) };
  target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
  return true;
}

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const panelControl = (host, name) => PANEL[name] && host.querySelector(`[data-testid="${PANEL[name]}"]`);

// On a narrow canvas Excalidraw uses its mobile layout, where the panel exists only while its menu is open.
export async function runPanelAction(host, name, api = null) {
  let control = panelControl(host, name);
  if (!control && api) { api.updateScene({ appState: { openMenu: 'shape' } }); await frame(); control = panelControl(host, name); }
  if (!control) return false;
  control.click();
  return true;
}
