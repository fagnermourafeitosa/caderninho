// Scene validation and normalisation: the whitelist and limits every saved board obeys.
const INVALID = 'Quadro inválido.';
const MAX_ELEMENTS = 10_000, MAX_BYTES = 8 * 1024 * 1024, MIN_ZOOM = 0.1, MAX_ZOOM = 30;
const ELEMENT_TYPES = new Set(['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text', 'image', 'frame']);

const plainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function normalizeElement(value) {
  if (!plainObject(value) || !ELEMENT_TYPES.has(value.type)) throw new Error(INVALID);
  // No element hyperlinks in v1: a pasted Excalidraw clip may still carry them.
  return { ...value, link: null };
}

function normalizeViewport(value) {
  if (!plainObject(value) || ![value.scrollX, value.scrollY, value.zoom].every(Number.isFinite)) throw new Error(INVALID);
  return { scrollX: value.scrollX, scrollY: value.scrollY, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value.zoom)) };
}

function normalizeScene(input) {
  if (!plainObject(input) || !Array.isArray(input.elements) || input.elements.length > MAX_ELEMENTS) throw new Error(INVALID);
  const result = { elements: input.elements.map(normalizeElement), viewport: normalizeViewport(input.viewport) };
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_BYTES) throw new Error(INVALID);
  return result;
}

module.exports = { normalizeScene, INVALID };
