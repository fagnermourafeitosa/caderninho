// Where the contextual bar sits, in canvas pixels: centred on the selection, above it, inside the canvas.
const GAP = 50, MARGIN = 12;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function barPosition(selection, bar, canvas) {
  const left = clamp(Math.round(selection.x + selection.width / 2 - bar.width / 2), MARGIN, canvas.width - bar.width - MARGIN);
  const above = selection.y - GAP - bar.height;
  if (above >= MARGIN) return { left, top: Math.round(above), placement: 'above' };
  const below = clamp(selection.y + selection.height + GAP, MARGIN, canvas.height - bar.height - MARGIN);
  return { left, top: Math.round(below), placement: 'below' };
}

module.exports = { barPosition, GAP, MARGIN };
