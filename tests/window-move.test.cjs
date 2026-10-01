const test = require('node:test');
const assert = require('node:assert/strict');
const { movePosition } = require('../window-move.cjs');

test('desktop cursor moves the window by the total drag distance without accumulating movement', () => {
  const bounds = { x: 100, y: 80 }, origin = { x: 200, y: 150 };
  assert.deepEqual(movePosition(bounds, origin, { x: 224, y: 170 }), { x: 124, y: 100 });
  assert.deepEqual(movePosition(bounds, origin, { x: 230, y: 180 }), { x: 130, y: 110 });
  assert.deepEqual(movePosition(bounds, origin, origin), bounds);
});

test('drag supports displays with negative coordinates', () => {
  assert.deepEqual(movePosition({ x: -1500, y: -300 }, { x: -1400, y: -200 }, { x: -1440, y: -210 }), { x: -1540, y: -310 });
});

test('invalid and overflowing coordinates never reach Electron positioning', () => {
  const bounds = { x: 100, y: 80 }, origin = { x: 200, y: 150 };
  for (const x of [undefined, null, '10', NaN, Infinity, -Infinity, Number.MAX_VALUE, 2147483648]) {
    assert.equal(movePosition(bounds, origin, { x, y: 170 }), null);
  }
  assert.equal(movePosition({ x: 2147483640, y: 80 }, origin, { x: 224, y: 170 }), null);
  assert.equal(movePosition(bounds, null, origin), null);
});
