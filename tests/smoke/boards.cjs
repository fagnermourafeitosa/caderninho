// Board scenario, main side: native keyboard and pointer input, persistence checks and network watch.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Store } = require('../../src/main/store.cjs');

const ROOT = path.join(__dirname, '..', '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function driver(win) {
  const contents = win.webContents;
  const run = async script => contents.executeJavaScript(script);
  const step = (name, ...args) => run(`boardSteps.${name}(${args.map(value => JSON.stringify(value)).join(',')})`);
  const key = async (keyCode, modifiers = []) => {
    contents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    if (keyCode.length === 1 && !modifiers.length) contents.sendInputEvent({ type: 'char', keyCode, modifiers });
    contents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
    await wait(80);
  };
  const drag = async (from, to) => {
    contents.sendInputEvent({ type: 'mouseMove', x: from.x, y: from.y });
    contents.sendInputEvent({ type: 'mouseDown', x: from.x, y: from.y, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 6; i++) { contents.sendInputEvent({ type: 'mouseMove', x: Math.round(from.x + (to.x - from.x) * i / 6), y: Math.round(from.y + (to.y - from.y) * i / 6), button: 'left' }); await wait(16); }
    contents.sendInputEvent({ type: 'mouseUp', x: to.x, y: to.y, button: 'left', clickCount: 1 });
    await wait(120);
  };
  const click = async point => drag(point, point);
  return { run, step, key, drag, click };
}

// Every request the window makes must stay inside the app (file:, data:, blob:, app protocols).
function watchNetwork(win) {
  const external = [];
  win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    if (!/^(file|data|blob|caderno-media|caderno-font|devtools|chrome-extension):/.test(details.url)) external.push(details.url);
    callback({});
  });
  return external;
}

const savedBoard = noteId => {
  const store = new Store(app.getPath('userData'));
  try { return { row: store.db.prepare('SELECT version,scene,thumbnail FROM boards WHERE note_id=?').get(noteId), page: store.db.prepare('SELECT body,title FROM notes WHERE id=?').get(noteId) }; }
  finally { store.close(); }
};

const SHAPE_BAR = ['fill', 'stroke', '|', 'width', 'lineStyle', 'roughness', 'corners', '|', 'shapeText', '|', 'layer', 'duplicate', 'delete', 'more'];
const CONNECTOR_BAR = ['stroke', '|', 'width', 'lineStyle', 'roughness', '|', 'sharp', 'curve', 'elbow', '|', 'startHead', 'endHead', '|', 'layer', 'duplicate', 'delete', 'more'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const liveScene = noteId => JSON.parse(savedBoard(noteId).row.scene).elements.filter(element => !element.isDeleted);

// Shape and connector bars: controls in the reference order, each choice reaching the saved scene; arrows stay bound.
async function contextBarScenario({ board, step, key, drag, click, x, y, note }) {
  const postIt = { x: x + 120, y: y - 120 };
  await click(postIt);
  const shapeBar = await step('waitBar', 'shape');
  if (!same(shapeBar, SHAPE_BAR)) throw new Error('Barra da forma: ' + shapeBar);
  await step('choose', 'fill', '#c9d8df');
  await step('choose', 'width', 'Grossa');
  await step('choose', 'lineStyle', 'Pontilhada');
  await step('control', 'roughness');
  await step('control', 'corners');
  await step('flush');
  const styled = liveScene(board.noteId).find(element => element.id === note.id);
  const want = { backgroundColor: '#c9d8df', strokeWidth: 4, strokeStyle: 'dotted', roughness: 1, roundness: { type: 3 } };
  if (!same({ backgroundColor: styled.backgroundColor, strokeWidth: styled.strokeWidth, strokeStyle: styled.strokeStyle, roughness: styled.roughness, roundness: styled.roundness }, want)) throw new Error('Estilo da forma não aplicado: ' + JSON.stringify(styled));
  // Arrow from the post-it to the first rectangle binds both ends.
  await key('Escape');
  await key('a');
  await drag(postIt, { x: x - 42, y: y - 35 });
  const connectorBar = await step('waitBar', 'connector');
  if (!same(connectorBar, CONNECTOR_BAR)) throw new Error('Barra da seta: ' + connectorBar);
  await step('choose', 'endHead', 'Triângulo');
  await step('control', 'elbow');
  await step('flush');
  const scene = liveScene(board.noteId), arrow = scene.find(element => element.type === 'arrow'), rectangle = scene.find(element => element.type === 'rectangle' && element.id !== note.id);
  if (!arrow || arrow.endArrowhead !== 'triangle' || !arrow.elbowed) throw new Error('Seta sem ponta triângulo ou cotovelo: ' + JSON.stringify(arrow));
  if (arrow.startBinding?.elementId !== note.id || arrow.endBinding?.elementId !== rectangle.id) throw new Error('Seta não ficou presa às formas: ' + JSON.stringify([arrow.startBinding, arrow.endBinding]));
  // Moving the bound rectangle drags the arrow's end along.
  const before = arrow.x + arrow.points.at(-1)[0];
  await key('Escape');
  await click({ x: x - 160, y: y - 35 });
  await drag({ x: x - 160, y: y - 35 }, { x: x - 160, y: y + 115 });
  await step('flush');
  const moved = liveScene(board.noteId).find(element => element.id === arrow.id);
  if (moved.endBinding?.elementId !== rectangle.id || moved.y + moved.points.at(-1)[1] <= arrow.y + arrow.points.at(-1)[1] + 50) throw new Error('Seta não acompanhou a forma: ' + JSON.stringify({ before, after: moved.points }));
  await key('Escape');
}

const TEXT_BAR = ['textColor', '|', 'fontFamily', 'fontSize', 'alignLeft', 'alignCenter', '|', 'layer', 'duplicate', 'delete', 'more'];
const FRAME_BAR = ['rename', '|', 'exportFrame', '|', 'duplicate', 'delete', 'more'];
const SEVERAL_BAR = ['fill', 'width', 'lineStyle', '|', 'alignLeft', 'alignHorizontal', 'alignTop', 'distribute', '|', 'group', 'wrapFrame', '|', 'layer', 'duplicate', 'delete', 'more'];
const IMAGE_BAR = ['opacity', '|', 'layer', 'duplicate', 'delete', 'more'];
const COMMAND = process.platform === 'darwin' ? 'meta' : 'control';
const solidPNG = (r, g, b) => { const pixels = Buffer.alloc(40 * 30 * 4); for (let i = 0; i < pixels.length; i += 4) pixels.set([b, g, r, 255], i); return [...nativeImage.createFromBitmap(pixels, { width: 40, height: 30 }).toPNG()]; };
const EXPORTS = path.join(ROOT, 'artifacts', 'board-export');
const isPNG = file => fs.readFileSync(file).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

// Free text, frame and multi-selection bars, then images by paste and drop that survive a reload.
async function moreBarsScenario({ board, step, key, drag, click, x, y, note, contents }) {
  fs.rmSync(EXPORTS, { recursive: true, force: true }); fs.mkdirSync(EXPORTS, { recursive: true });
  const textAt = { x: x + 40, y: y + 230 };
  await key('t'); await click(textAt);
  for (const letter of 'levar') await key(letter);
  await key('Escape');
  const textBar = await step('waitBar', 'text');
  if (!same(textBar, TEXT_BAR)) throw new Error('Barra do texto: ' + textBar);
  await step('choose', 'fontFamily', 'Código');
  await step('choose', 'fontSize', 'G');
  await step('control', 'alignCenter');
  await step('choose', 'textColor', '#c9d8df');
  await step('flush');
  const text = liveScene(board.noteId).find(element => element.type === 'text' && element.originalText === 'levar');
  if (!text || text.fontFamily !== 8 || text.fontSize !== 28 || text.textAlign !== 'center' || text.strokeColor !== '#c9d8df') throw new Error('Estilo do texto não aplicado: ' + JSON.stringify(text && [text.fontFamily, text.fontSize, text.textAlign, text.strokeColor]));
  // Frame: rename through Excalidraw's own name field, export it as PNG.
  await key('Escape'); await key('f');
  await drag({ x: x + 230, y: y - 210 }, { x: x + 400, y: y - 90 });
  const frameBar = await step('waitBar', 'frame');
  if (!same(frameBar, FRAME_BAR)) throw new Error('Barra do frame: ' + frameBar);
  await step('control', 'rename');
  await key('a', [COMMAND]);
  for (const letter of 'Roteiro') await key(letter);
  await key('Enter');
  await step('flush');
  const frame = liveScene(board.noteId).find(element => element.type === 'frame');
  if (frame?.name !== 'Roteiro') throw new Error('Frame não foi renomeado: ' + frame?.name);
  await click({ x: x + 231, y: y - 209 });
  await step('waitBar', 'frame');
  await step('control', 'exportFrame');
  await wait(800);
  if (!fs.existsSync(path.join(EXPORTS, 'Roteiro.png')) || !isPNG(path.join(EXPORTS, 'Roteiro.png'))) throw new Error('Frame não foi exportado como PNG: ' + fs.readdirSync(EXPORTS));
  // Several elements: post-it plus the text, aligned left and wrapped in a new frame.
  await key('Escape');
  await click({ x: x + 120, y: y - 120 });
  contents.sendInputEvent({ type: 'mouseDown', x: textAt.x + 4, y: textAt.y + 8, button: 'left', clickCount: 1, modifiers: ['shift'] });
  contents.sendInputEvent({ type: 'mouseUp', x: textAt.x + 4, y: textAt.y + 8, button: 'left', clickCount: 1, modifiers: ['shift'] });
  await wait(200);
  const severalBar = await step('waitBar', 'several');
  if (!same(severalBar, SEVERAL_BAR)) throw new Error('Barra de vários: ' + severalBar);
  await step('control', 'alignLeft');
  await step('control', 'wrapFrame');
  await step('flush');
  const scene = liveScene(board.noteId), aligned = scene.filter(element => element.id === note.id || element.id === text.id);
  const wrapper = scene.find(element => element.type === 'frame' && element.id !== frame.id);
  if (Math.round(aligned[0].x) !== Math.round(aligned[1].x)) throw new Error('Alinhar à esquerda não alinhou: ' + aligned.map(element => element.x));
  if (!wrapper || !aligned.every(element => element.frameId === wrapper.id)) throw new Error('Em frame não envolveu a seleção');
  // Images: paste, then drop a different one; both attach to the media store and come back after a reload.
  await key('Escape');
  await click({ x: x - 250, y: y + 200 });
  await step('pasteImage', solidPNG(246, 215, 122));
  const imageBar = await step('waitBar', 'image');
  if (!same(imageBar, IMAGE_BAR)) throw new Error('Barra da imagem: ' + imageBar);
  await step('control', 'opacity');
  await step('slider', 50);
  await step('dropImage', solidPNG(201, 216, 223), { x: x - 300, y: y - 200 });
  await step('flush');
  const images = liveScene(board.noteId).filter(element => element.type === 'image');
  const stored = savedBoardFiles(board.noteId);
  if (images.length !== 2 || !images.some(element => element.opacity === 50) || stored !== 2) throw new Error('Imagens não foram salvas: ' + JSON.stringify({ images: images.map(element => element.opacity), stored }));
  await step('reopen', board.noteId);
  await click({ x: x + 300, y: y + 200 });
}
const savedBoardFiles = noteId => { const store = new Store(app.getPath('userData')); try { return store.db.prepare('SELECT count(*) AS n FROM board_files f JOIN media_blobs m ON m.id=f.blob_id WHERE f.note_id=?').get(noteId).n; } finally { store.close(); } };

// Undo/redo, full screen, search, Mais exports and the Portuguese-only chrome.
async function pageScenario({ win, board, step, key, drag, click, x, y }) {
  const { Menu } = require('electron');
  const { testHook } = require('../../src/main/main.cjs');
  const title = await step('title');
  await step('titleUndo');
  await step('relatedAnswers');
  await click({ x: x + 300, y: y + 200 });
  await step('markFailed');
  await key('r'); await drag({ x: x + 260, y: y + 60 }, { x: x + 330, y: y + 120 });
  await step('failedLabelClears');
  const drawn = await step('count');
  await key('z', [COMMAND]); await wait(200);
  if (await step('count') !== drawn - 1) throw new Error('⌘Z não desfez no quadro');
  await step('footer', 'redo');
  if (await step('count') !== drawn) throw new Error('Refazer do rodapé não refez');
  await step('footer', 'undo');
  if (await step('count') !== drawn - 1) throw new Error('Desfazer do rodapé não desfez');
  await click({ x: x + 300, y: y + 200 });
  testHook.dispatchHistory('redo', win); await wait(300);
  if (await step('count') !== drawn || await step('title') !== title) throw new Error('Editar > Refazer não agiu só no quadro');
  // Full screen: Nota menu, Mais item and the exit button; Esc while typing keeps it.
  const menuItem = () => Menu.getApplicationMenu().items.find(item => item.label === 'Nota').submenu.items.find(item => item.label === 'Tela cheia do quadro');
  if (!menuItem().enabled) throw new Error('Nota > Tela cheia do quadro desabilitado');
  menuItem().click(); await wait(300);
  if (!await step('fullScreen')) throw new Error('Menu não abriu a tela cheia');
  const exit = await step('exitButtonSize');
  if (exit.height !== 36 || exit.width > 220 || exit.icon.join() !== '16,16') throw new Error('Botão Sair da tela cheia fora da medida: ' + JSON.stringify(exit));
  fs.writeFileSync(path.join(ROOT, 'artifacts', 'quadro-tela-cheia.png'), (await win.webContents.capturePage()).toPNG());
  await step('exitButton');
  if (await step('fullScreen')) throw new Error('Botão Sair da tela cheia não saiu');
  await step('more', 'board-fullscreen');
  if (!await step('fullScreen')) throw new Error('Mais > Tela cheia não abriu');
  await key('t'); await click({ x: x - 250, y: y + 40 }); await key('o');
  await key('Escape'); await wait(150);
  if (!await step('fullScreen')) throw new Error('Esc durante a edição saiu da tela cheia');
  await key('Escape'); await wait(150);
  if (await step('fullScreen')) throw new Error('Esc com o quadro parado não saiu da tela cheia');
  const english = await step('visibleEnglish');
  if (english.length) throw new Error('Texto em inglês visível: ' + english.join(', '));
  // Mais exports through the (scripted) save dialog.
  await step('more', 'board-export-png'); await step('more', 'board-export-svg'); await wait(1200);
  const name = (title || 'Sem título');
  if (!isPNG(path.join(EXPORTS, name + '.png')) || !fs.readFileSync(path.join(EXPORTS, name + '.svg'), 'utf8').startsWith('<svg')) throw new Error('Exportação PNG/SVG falhou: ' + fs.readdirSync(EXPORTS));
  // Global search reaches board text and opens the board.
  if (!await step('leaveToNotes')) throw new Error('Quadro continuou montado fora da seção');
  if (await step('search', 'cafe') !== board.noteId) throw new Error('Resultado da busca não abriu o quadro');
}

async function runBoardsSmoke(win, smokeScript) {
  // The reference images are 1280×860: the canvas is wide enough for Excalidraw's desktop layout.
  win.setSize(1280, 860);
  const external = watchNetwork(win);
  const { run, step, key, drag, click } = driver(win);
  const loaded = await run(smokeScript('boards-smoke.js'));
  if (loaded.errors.length) throw new Error(loaded.errors.join('\n'));
  await step('emptyIndex');
  const board = await step('openNewBoard');
  const { x, y } = board.canvas;
  // Rectangle by shortcut and drag; it autosaves without any explicit action. A click focuses the canvas first.
  // Drawing must never start a window move (the app drags the window from empty paper).
  const moves = [];
  const countMoves = (_event, phase) => moves.push(phase);
  require('electron').ipcMain.on('notebook:move', countMoves);
  await click({ x: x + 200, y: y + 150 });
  await key('r');
  await drag({ x: x - 160, y: y - 80 }, { x: x - 40, y: y + 10 });
  await step('elementCount', 1);
  require('electron').ipcMain.off('notebook:move', countMoves);
  if (moves.length) throw new Error('Desenhar no quadro moveu a janela: ' + moves.length + ' eventos');
  await wait(700);
  const saved = savedBoard(board.noteId);
  if (!saved.row || saved.row.version < 1 || !JSON.parse(saved.row.scene).elements.some(element => element.type === 'rectangle' && !element.isDeleted)) throw new Error('Retângulo não foi salvo: ' + JSON.stringify(saved.row?.version));
  if (JSON.parse(saved.row.scene).elements.find(element => element.type === 'rectangle').roundness !== null) throw new Error('Retângulo novo deve ter cantos retos, como na referência');
  await step('railClicks');
  for (const [letter, tool] of [['h', 'hand'], ['r', 'rectangle'], ['d', 'diamond'], ['o', 'ellipse'], ['a', 'arrow'], ['l', 'line'], ['p', 'freedraw'], ['t', 'text'], ['n', 'postit'], ['f', 'frame'], ['e', 'eraser'], ['v', 'selection']]) {
    await key(letter);
    if (await step('activeTool') !== tool) throw new Error(`Atalho ${letter} não ativou ${tool}: ${await step('activeTool')}`);
  }
  // N then a press on the canvas drops a post-it already in text editing, with ink text.
  await key('n');
  await click({ x: x + 120, y: y - 120 });
  await wait(300);
  if (!await step('editing')) throw new Error('Post-it não abriu a edição do texto');
  for (const letter of 'Cafe') await key(letter);
  if (await step('editorColor') !== 'rgb(48, 48, 37)') throw new Error('Texto do post-it não está em tinta: ' + await step('editorColor'));
  await key('Escape');
  await step('flush');
  const scene = JSON.parse(savedBoard(board.noteId).row.scene).elements.filter(element => !element.isDeleted);
  const note = scene.find(element => element.type === 'rectangle' && element.backgroundColor === '#f6d77a');
  const label = note && scene.find(element => element.containerId === note.id);
  const expected = { width: 140, height: 120, fillStyle: 'solid', strokeColor: 'transparent', roughness: 0, roundness: null, text: 'Cafe', textColor: '#303025', fontFamily: 5, fontSize: 20, textAlign: 'center', verticalAlign: 'middle' };
  const actual = note && label && { width: note.width, height: note.height, fillStyle: note.fillStyle, strokeColor: note.strokeColor, roughness: note.roughness, roundness: note.roundness, text: label.originalText, textColor: label.strokeColor, fontFamily: label.fontFamily, fontSize: label.fontSize, textAlign: label.textAlign, verticalAlign: label.verticalAlign };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Post-it diferente do especificado: ' + JSON.stringify(actual));
  await step('stateHasText', board.noteId, 'Cafe');
  await contextBarScenario({ board, step, key, drag, click, x, y, note });
  await moreBarsScenario({ board, step, key, drag, click, x, y, note, contents: win.webContents });
  await pageScenario({ win, board, step, key, drag, click, x, y });
  await step('indexWithThumbnail', board.noteId, 'Cafe · levar · Roteiro');
  fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts', 'quadro-indice.png'), (await win.webContents.capturePage()).toPNG());
  if (external.length) throw new Error('O quadro acessou a rede: ' + external.join(', '));
  const errors = await run('window.smokeErrors');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('BOARDS_SMOKE_OK', JSON.stringify({ noteId: board.noteId }));
  await closeWithPendingSave(win, { step, key, drag, click, x, y, noteId: board.noteId });
}

// Draw, then close the window at once: the close waits for the board save, which lands in SQLite.
async function closeWithPendingSave(win, { step, key, drag, click, x, y, noteId }) {
  await step('reopen', noteId);
  await click({ x: x + 300, y: y + 200 });
  const shown = await step('count');
  await key('o'); await drag({ x: x + 200, y: y + 150 }, { x: x + 260, y: y + 200 });
  if (await step('count') !== shown + 1) throw new Error('Elipse não foi desenhada: ' + await step('count'));
  const ellipses = () => liveScene(noteId).filter(element => element.type === 'ellipse').length;
  const before = ellipses();
  // Closing the last window quits the app, so the outcome is checked inside the closed event.
  win.once('closed', () => {
    const landed = ellipses();
    if (landed === before + 1) console.log('BOARDS_CLOSE_FLUSH_OK', JSON.stringify({ before, landed }));
    else { console.error('Elipse desenhada antes de fechar não foi salva: ' + JSON.stringify({ before, landed })); app.exit(1); }
  });
  win.close();
  await wait(50);
  if (!win.isDestroyed()) return wait(5000).then(() => { throw new Error('A janela não fechou depois de salvar o quadro'); });
  throw new Error('A janela fechou antes de salvar o quadro');
}

module.exports = { runBoardsSmoke };
