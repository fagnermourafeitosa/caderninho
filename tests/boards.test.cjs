const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeScene } = require('../src/main/boards/domain/scene.cjs');
const { acceptSave } = require('../src/main/boards/domain/board.cjs');
const { parseBoardImage } = require('../src/main/boards/domain/board-image.cjs');
const { sceneText } = require('../src/main/boards/domain/scene-text.cjs');

const element = (type, extra = {}) => ({ id: 'el-' + type, type, x: 0, y: 0, width: 10, height: 10, isDeleted: false, ...extra });
const scene = (elements, viewport = { scrollX: 0, scrollY: 0, zoom: 1 }) => ({ elements, viewport });

test('a scene with every whitelisted element type is accepted', () => {
  const types = ['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text', 'image', 'frame'];
  const result = normalizeScene(scene(types.map(type => element(type))));
  assert.deepEqual(result.elements.map(item => item.type), types);
});

for (const type of ['embeddable', 'iframe', 'magicframe', 'video']) {
  test(`a scene containing a ${type} element is rejected as invalid`, () => {
    assert.throws(() => normalizeScene(scene([element('rectangle'), element(type)])), { message: 'Quadro inválido.' });
  });
}

test('element hyperlinks are normalised to null', () => {
  const result = normalizeScene(scene([element('rectangle', { link: 'https://example.com' }), element('text', { link: 'javascript:alert(1)' })]));
  assert.deepEqual(result.elements.map(item => item.link), [null, null]);
});

test('a scene may hold 10,000 elements but not 10,001', () => {
  const many = count => Array.from({ length: count }, (_, index) => element('rectangle', { id: 'r' + index }));
  assert.equal(normalizeScene(scene(many(10_000))).elements.length, 10_000);
  assert.throws(() => normalizeScene(scene(many(10_001))), { message: 'Quadro inválido.' });
});

test('a scene larger than 8 MB once serialised is rejected', () => {
  const big = element('text', { text: 'x'.repeat(8 * 1024 * 1024) });
  assert.throws(() => normalizeScene(scene([big])), { message: 'Quadro inválido.' });
});

for (const viewport of [null, { scrollX: NaN, scrollY: 0, zoom: 1 }, { scrollX: 0, scrollY: Infinity, zoom: 1 }, { scrollX: 0, scrollY: 0, zoom: '1' }, { scrollX: 0, scrollY: 0 }]) {
  test(`a non-finite viewport ${JSON.stringify(viewport)} is rejected`, () => {
    assert.throws(() => normalizeScene(scene([], viewport)), { message: 'Quadro inválido.' });
  });
}

test('the viewport zoom is clamped between 0.1 and 30', () => {
  assert.deepEqual(normalizeScene(scene([], { scrollX: 5, scrollY: -3, zoom: 0.01 })).viewport, { scrollX: 5, scrollY: -3, zoom: 0.1 });
  assert.equal(normalizeScene(scene([], { scrollX: 0, scrollY: 0, zoom: 99 })).viewport.zoom, 30);
  assert.equal(normalizeScene(scene([], { scrollX: 0, scrollY: 0, zoom: 1.5 })).viewport.zoom, 1.5);
});

test('scene text joins text elements, bound labels and frame names in scene order', () => {
  const elements = [
    element('frame', { id: 'f', name: 'Roteiro · sábado' }),
    element('rectangle', { id: 'p' }),
    element('text', { id: 'label', containerId: 'p', text: 'Sair cedo\n7h da', originalText: 'Sair cedo 7h da' }),
    element('text', { id: 'gone', text: 'apagado', originalText: 'apagado', isDeleted: true }),
    element('frame', { id: 'unnamed', name: null }),
    element('text', { id: 'free', text: 'levar: protetor', originalText: 'levar: protetor' }),
  ];
  assert.equal(sceneText(elements), 'Roteiro · sábado\nSair cedo 7h da\nlevar: protetor');
});

test('an empty scene has no text', () => {
  assert.equal(sceneText([]), '');
});

const stored = (version, fileIds = []) => ({ noteId: 'n1', version, scene: scene([]), fileIds });

test('a save based on the stored version is accepted and increments the version', () => {
  const next = acceptSave(stored(4), { baseVersion: 4, scene: scene([element('text', { text: 'oi', originalText: 'oi' })]) });
  assert.equal(next.version, 5);
  assert.equal(next.text, 'oi');
  assert.deepEqual(next.scene.elements.map(item => item.id), ['el-text']);
});

test('a save based on an older version is rejected as stale', () => {
  assert.throws(() => acceptSave(stored(4), { baseVersion: 3, scene: scene([]) }), { message: 'O quadro mudou em outra janela. Recarregue.' });
});

// A deleted element stays in the scene so undo can bring it back, so its file stays too.
test('a save keeps only the board files that image elements in the scene still reference', () => {
  const next = acceptSave(stored(0, ['a', 'b', 'c']), { baseVersion: 0, scene: scene([element('image', { id: 'i1', fileId: 'a' }), element('image', { id: 'i2', fileId: 'b', isDeleted: true })]) });
  assert.deepEqual(next.fileIds, ['a', 'b']);
});

test('a save with an image whose file was never attached to the board is rejected', () => {
  assert.throws(() => acceptSave(stored(0, ['a']), { baseVersion: 0, scene: scene([element('image', { fileId: 'zzz' })]) }), { message: 'Quadro inválido.' });
});

const IMAGE_ERROR = 'Use uma imagem PNG, JPEG, GIF ou WebP de até 15 MB.';
const dataURL = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;

for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
  test(`a ${mime} data URL decodes to its bytes`, () => {
    const image = parseBoardImage({ mime, dataURL: dataURL(mime, [1, 2, 3]) });
    assert.deepEqual({ mime: image.mime, bytes: [...image.bytes] }, { mime, bytes: [1, 2, 3] });
  });
}

for (const mime of ['image/svg+xml', 'text/html', 'application/pdf', '']) {
  test(`a ${mime || 'missing'} mime type is rejected`, () => {
    assert.throws(() => parseBoardImage({ mime, dataURL: dataURL(mime, [1]) }), { message: IMAGE_ERROR });
  });
}

test('a data URL whose prefix does not match the declared mime type is rejected', () => {
  assert.throws(() => parseBoardImage({ mime: 'image/png', dataURL: dataURL('image/svg+xml', [1]) }), { message: IMAGE_ERROR });
  assert.throws(() => parseBoardImage({ mime: 'image/png', dataURL: 'data:image/png,plain' }), { message: IMAGE_ERROR });
});

test('an image over 15 MB is rejected and an empty one too', () => {
  assert.equal(parseBoardImage({ mime: 'image/png', dataURL: dataURL('image/png', new Uint8Array(15 * 1024 * 1024)) }).bytes.length, 15 * 1024 * 1024);
  assert.throws(() => parseBoardImage({ mime: 'image/png', dataURL: dataURL('image/png', new Uint8Array(15 * 1024 * 1024 + 1)) }), { message: IMAGE_ERROR });
  assert.throws(() => parseBoardImage({ mime: 'image/png', dataURL: 'data:image/png;base64,' }), { message: IMAGE_ERROR });
});
