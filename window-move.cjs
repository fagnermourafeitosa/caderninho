// Electron's native window coordinates must fit signed 32-bit integers.
function nativeCoordinate(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= -2147483648 && rounded <= 2147483647 ? rounded : null;
}

function movePosition(bounds, origin, cursor) {
  if (!bounds || !origin || !cursor) return null;
  if ([bounds.x, bounds.y, origin.x, origin.y, cursor.x, cursor.y].some(value => nativeCoordinate(value) === null)) return null;
  const x = nativeCoordinate(bounds.x + cursor.x - origin.x);
  const y = nativeCoordinate(bounds.y + cursor.y - origin.y);
  return x === null || y === null ? null : { x, y };
}

module.exports = { nativeCoordinate, movePosition };
