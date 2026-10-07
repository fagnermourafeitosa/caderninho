// The paper dot grid drawn in CSS, kept aligned with Excalidraw's scroll and zoom.
const STEP = 22, OFFSET = 6;
const wrap = (value, size) => Math.round((((value % size) + size) % size) * 100) / 100;

function gridBackground({ scrollX, scrollY, zoom }) {
  const size = STEP * zoom;
  return { size: `${size}px ${size}px`, position: `${wrap((OFFSET + scrollX) * zoom, size)}px ${wrap((OFFSET + scrollY) * zoom, size)}px` };
}

module.exports = { gridBackground };
