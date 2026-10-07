const test = require('node:test');
const assert = require('node:assert/strict');
const { createSaveScheduler } = require('../src/renderer/boards/canvas/save-scheduler.js');

// Manual clock: timers fire only when the test advances time.
function clock() {
  let now = 0, timers = [];
  return {
    setTimeout: (callback, delay) => { const timer = { at: now + delay, callback }; timers.push(timer); return timer; },
    clearTimeout: timer => { timers = timers.filter(item => item !== timer); },
    advance(ms) { now += ms; const due = timers.filter(timer => timer.at <= now); timers = timers.filter(timer => timer.at > now); due.forEach(timer => timer.callback()); },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a save runs 400 ms after the last change, once', async () => {
  const time = clock(), saves = [];
  const scheduler = createSaveScheduler({ persist: async () => { saves.push('save'); }, ...time });
  scheduler.changed(); time.advance(300); scheduler.changed(); time.advance(399);
  assert.equal(saves.length, 0);
  time.advance(1); await settle();
  assert.equal(saves.length, 1);
});

test('only one save is in flight; changes during it trigger exactly one more save', async () => {
  const time = clock(), resolvers = [];
  const scheduler = createSaveScheduler({ persist: () => new Promise(resolve => resolvers.push(resolve)), ...time });
  scheduler.changed(); time.advance(400);
  assert.equal(resolvers.length, 1);
  scheduler.changed(); time.advance(400); scheduler.changed(); time.advance(400);
  assert.equal(resolvers.length, 1);
  resolvers[0](); await settle(); time.advance(400); await settle();
  assert.equal(resolvers.length, 2);
  resolvers[1](); await settle(); time.advance(1000);
  assert.equal(resolvers.length, 2);
});

test('flush saves pending changes immediately and waits for the save in flight', async () => {
  const time = clock(), saves = [];
  let release;
  const scheduler = createSaveScheduler({ persist: () => { saves.push('save'); return saves.length === 1 ? new Promise(resolve => { release = resolve; }) : Promise.resolve(); }, ...time });
  scheduler.changed(); time.advance(400); scheduler.changed();
  let flushed = false;
  const flushing = scheduler.flush().then(() => { flushed = true; });
  await settle(); assert.equal(flushed, false);
  release(); await flushing;
  assert.deepEqual([saves.length, flushed, scheduler.pending()], [2, true, false]);
});

test('a failed save is reported and the changes stay pending for the next attempt', async () => {
  const time = clock(), errors = [];
  let fail = true;
  const scheduler = createSaveScheduler({ persist: async () => { if (fail) throw new Error('disco cheio'); }, onError: error => errors.push(error.message), ...time });
  scheduler.changed(); time.advance(400); await settle();
  assert.deepEqual([errors, scheduler.pending()], [['disco cheio'], true]);
  fail = false; await scheduler.flush();
  assert.equal(scheduler.pending(), false);
});

const { selectionKind, barControls } = require('../src/renderer/boards/canvas/bar-model.js');
const el = (id, type, extra = {}) => ({ id, type, isDeleted: false, ...extra });

test('the selection kind follows the selected elements', () => {
  assert.equal(selectionKind([]), null);
  for (const type of ['rectangle', 'diamond', 'ellipse']) assert.equal(selectionKind([el('a', type)]), 'shape');
  for (const type of ['arrow', 'line']) assert.equal(selectionKind([el('a', type)]), 'connector');
  assert.equal(selectionKind([el('a', 'text')]), 'text');
  assert.equal(selectionKind([el('a', 'image')]), 'image');
  assert.equal(selectionKind([el('a', 'frame')]), 'frame');
  assert.equal(selectionKind([el('a', 'freedraw')]), 'freedraw');
  assert.equal(selectionKind([el('a', 'rectangle'), el('b', 'ellipse')]), 'several');
});

// Order and separators copied from specs/assets/007-board/quadro-barra-de-contexto.png.
test('each selection kind shows its controls in the order of the reference image', () => {
  assert.deepEqual(barControls('shape'), ['fill', 'stroke', '|', 'width', 'lineStyle', 'roughness', 'corners', '|', 'shapeText', '|', 'layer', 'duplicate', 'delete', 'more']);
  assert.deepEqual(barControls('connector'), ['stroke', '|', 'width', 'lineStyle', 'roughness', '|', 'sharp', 'curve', 'elbow', '|', 'startHead', 'endHead', '|', 'layer', 'duplicate', 'delete', 'more']);
  assert.deepEqual(barControls('text'), ['textColor', '|', 'fontFamily', 'fontSize', 'alignLeft', 'alignCenter', '|', 'layer', 'duplicate', 'delete', 'more']);
  assert.deepEqual(barControls('image'), ['opacity', '|', 'layer', 'duplicate', 'delete', 'more']);
  assert.deepEqual(barControls('frame'), ['rename', '|', 'exportFrame', '|', 'duplicate', 'delete', 'more']);
  assert.deepEqual(barControls('several'), ['fill', 'width', 'lineStyle', '|', 'alignLeft', 'alignHorizontal', 'alignTop', 'distribute', '|', 'group', 'wrapFrame', '|', 'layer', 'duplicate', 'delete', 'more']);
  assert.deepEqual(barControls(null), []);
});

const { barPosition } = require('../src/renderer/boards/canvas/bar-placement.js');
const canvas = { width: 964, height: 600 };

test('the bar is centred over the selection and sits above it with the reference gap', () => {
  assert.deepEqual(barPosition({ x: 340, y: 200, width: 140, height: 120 }, { width: 300, height: 42 }, canvas), { left: 260, top: 108, placement: 'above' });
});

test('the bar stays 12 px inside the canvas horizontally', () => {
  assert.equal(barPosition({ x: 0, y: 300, width: 40, height: 40 }, { width: 300, height: 42 }, canvas).left, 12);
  assert.equal(barPosition({ x: 940, y: 300, width: 40, height: 40 }, { width: 300, height: 42 }, canvas).left, 964 - 300 - 12);
});

test('without room above, the bar sits below the selection', () => {
  assert.deepEqual(barPosition({ x: 340, y: 60, width: 140, height: 120 }, { width: 300, height: 42 }, canvas), { left: 260, top: 230, placement: 'below' });
});

const { gridBackground } = require('../src/renderer/boards/canvas/grid.js');

test('the dot grid is 22 px at 100% with dots 6 px from the origin', () => {
  assert.deepEqual(gridBackground({ scrollX: 0, scrollY: 0, zoom: 1 }), { size: '22px 22px', position: '6px 6px' });
});

test('the dot grid pans with the scene and scales with the zoom', () => {
  assert.deepEqual(gridBackground({ scrollX: 10, scrollY: -30, zoom: 1 }), { size: '22px 22px', position: '16px 20px' });
  assert.deepEqual(gridBackground({ scrollX: 0, scrollY: 0, zoom: 2 }), { size: '44px 44px', position: '12px 12px' });
});

const { postItSkeleton, invisibleLabels, POST_IT_INK } = require('../src/renderer/boards/canvas/post-it.js');

test('a post-it is a 140×120 flat yellow rectangle centred where it is dropped', () => {
  assert.deepEqual(postItSkeleton({ x: 300, y: 200 }), { type: 'rectangle', x: 230, y: 140, width: 140, height: 120, backgroundColor: '#f6d77a', fillStyle: 'solid', strokeColor: 'transparent', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, roundness: null });
});

test('labels of transparent-outline shapes are found so they can be inked explicitly', () => {
  const elements = [
    el('p', 'rectangle', { strokeColor: 'transparent', boundElements: [{ id: 't', type: 'text' }] }),
    el('t', 'text', { containerId: 'p', strokeColor: 'transparent' }),
    el('q', 'rectangle', { strokeColor: '#303025' }),
    el('u', 'text', { containerId: 'q', strokeColor: '#303025' }),
    el('free', 'text', { strokeColor: 'transparent' }),
  ];
  assert.deepEqual(invisibleLabels(elements), ['t']);
  assert.equal(POST_IT_INK, '#303025');
});

const { stylePatches } = require('../src/renderer/boards/canvas/style.js');
const shapes = [el('r', 'rectangle', { roughness: 1, roundness: null }), el('d', 'diamond'), el('o', 'ellipse'), el('a', 'arrow'), el('t', 'text', { containerId: 'r' })];

test('width and line style choices map to Excalidraw stroke values for every selected element', () => {
  assert.deepEqual(stylePatches(shapes.slice(0, 4), 'width', 'Grossa'), [['r', { strokeWidth: 4 }], ['d', { strokeWidth: 4 }], ['o', { strokeWidth: 4 }], ['a', { strokeWidth: 4 }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'width', 'Fina'), [['r', { strokeWidth: 1 }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'lineStyle', 'Pontilhada'), [['r', { strokeStyle: 'dotted' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'lineStyle', 'Tracejada'), [['r', { strokeStyle: 'dashed' }]]);
});

test('fill applies only to shapes; the hatched swatch means a transparent fill', () => {
  assert.deepEqual(stylePatches(shapes, 'fill', '#c9d8df'), [['r', { backgroundColor: '#c9d8df' }], ['d', { backgroundColor: '#c9d8df' }], ['o', { backgroundColor: '#c9d8df' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'fill', 'transparent'), [['r', { backgroundColor: 'transparent' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'fillPattern', 'Hachura'), [['r', { fillStyle: 'hachure' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'fillPattern', 'Sólido'), [['r', { fillStyle: 'solid' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'fillPattern', 'Vazio'), [['r', { backgroundColor: 'transparent' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'opacity', 40), [['r', { opacity: 40 }]]);
});

test('toggles flip hand-drawn strokes and rounded corners per shape type', () => {
  assert.deepEqual(stylePatches([shapes[0]], 'roughness'), [['r', { roughness: 0 }]]);
  assert.deepEqual(stylePatches([el('x', 'rectangle', { roughness: 0 })], 'roughness'), [['x', { roughness: 1 }]]);
  assert.deepEqual(stylePatches(shapes.slice(0, 3), 'corners'), [['r', { roundness: { type: 3 } }], ['d', { roundness: { type: 2 } }]]);
  assert.deepEqual(stylePatches([el('x', 'rectangle', { roundness: { type: 3 } })], 'corners'), [['x', { roundness: null }]]);
});

test('connector heads and line curvature map to Excalidraw values', () => {
  assert.deepEqual(stylePatches([shapes[3]], 'endHead', 'Triângulo'), [['a', { endArrowhead: 'triangle' }]]);
  assert.deepEqual(stylePatches([shapes[3]], 'startHead', 'Nenhuma'), [['a', { startArrowhead: null }]]);
  assert.deepEqual(stylePatches([el('l', 'line')], 'curve'), [['l', { roundness: { type: 2 } }]]);
  assert.deepEqual(stylePatches([el('l', 'line')], 'sharp'), [['l', { roundness: null }]]);
});

test('text colour and alignment apply to free text only', () => {
  assert.deepEqual(stylePatches([el('f', 'text')], 'textColor', '#303025'), [['f', { strokeColor: '#303025' }]]);
  assert.deepEqual(stylePatches([el('f', 'text')], 'alignCenter'), [['f', { textAlign: 'center' }]]);
  assert.deepEqual(stylePatches([el('f', 'text')], 'alignLeft'), [['f', { textAlign: 'left' }]]);
  assert.deepEqual(stylePatches([shapes[0]], 'alignLeft'), []);
});

const { createBoardPersistence } = require('../src/renderer/boards/canvas/persistence.js');
function persistenceHarness({ attachFails = [] } = {}) {
  const calls = [];
  let time = 0, state = { elements: [], viewport: { scrollX: 0, scrollY: 0, zoom: 1 }, files: {} };
  const api = {
    boardAttachImage: async input => { calls.push(['attach', input.fileId]); if (attachFails.includes(input.fileId)) throw new Error('Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.'); return { fileId: input.fileId }; },
    boardSave: async input => { calls.push(['save', input.baseVersion, input.scene.elements.map(element => element.id)]); return { version: input.baseVersion + 1, updated: 'agora' }; },
    boardThumbnail: async input => { calls.push(['thumbnail', input.png]); return null; },
  };
  const rejected = [];
  const persistence = createBoardPersistence({ api, noteId: 'n1', version: 3, attached: ['old'], getState: () => state, thumbnail: async () => 'data:image/png;base64,AAAA', now: () => time, onRejectedFile: (fileId, error) => rejected.push([fileId, error.message]) });
  return { calls, rejected, persistence, set: next => { state = { ...state, ...next }; }, advance: ms => { time += ms; } };
}
const image = (id, fileId, extra = {}) => el(id, 'image', { fileId, ...extra });
const file = (id, mimeType = 'image/png') => ({ id, mimeType, dataURL: `data:${mimeType};base64,AAAA` });

test('new image files are attached before the save that first references them, once', async () => {
  const h = persistenceHarness();
  h.set({ elements: [image('i1', 'f1'), image('i0', 'old')], files: { f1: file('f1'), old: file('old') } });
  await h.persistence.persist();
  await h.persistence.persist();
  assert.deepEqual(h.calls.filter(call => call[0] !== 'thumbnail'), [['attach', 'f1'], ['save', 3, ['i1', 'i0']], ['save', 4, ['i1', 'i0']]]);
});

test('an image whose bytes are not loaded yet is left out of the save until they are', async () => {
  const h = persistenceHarness();
  h.set({ elements: [el('t', 'text'), image('i1', 'f1')], files: {} });
  await h.persistence.persist();
  assert.deepEqual(h.calls.filter(call => call[0] === 'save'), [['save', 3, ['t']]]);
});

test('an image the main process refuses is reported and left out of the save', async () => {
  const h = persistenceHarness({ attachFails: ['svg'] });
  h.set({ elements: [image('i1', 'svg')], files: { svg: file('svg', 'image/svg+xml') } });
  await h.persistence.persist();
  assert.deepEqual([h.rejected, h.calls.filter(call => call[0] === 'save')], [[['svg', 'Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.']], [['save', 3, []]]]);
});

test('the thumbnail is sent after a successful save at most every 5 seconds', async () => {
  const h = persistenceHarness();
  await h.persistence.persist(); h.advance(4000); await h.persistence.persist(); h.advance(1000); await h.persistence.persist();
  assert.equal(h.calls.filter(call => call[0] === 'thumbnail').length, 2);
});
