const test = require('node:test');
const assert = require('node:assert/strict');
const { windowMenu, menuSettingChange } = require('../src/main/settings/presentation/menu.cjs');

test('the Window menu check mirrors the stored keep-on-top choice and sends the clicked state', () => {
  const sent = [];
  const item = windowMenu(true, on => sent.push(on)).submenu.find(entry => entry.label === 'Manter na Frente');
  assert.equal(item.type, 'checkbox');
  assert.equal(item.checked, true);
  item.click({ checked: false });
  assert.deepEqual(sent, [false]);
});

test('a change from the menu announces the new settings, and a failed one is reported and redraws the menu', () => {
  const events = [];
  const change = outcome => menuSettingChange({
    update: changes => { if (outcome === 'fail') throw new Error('disk full'); return { preferences: changes }; },
    onUpdated: view => events.push(['updated', view]),
    report: error => events.push(['report', error.message]),
    rebuild: () => events.push(['rebuild']),
  });
  change('ok')({ keepOnTop: true });
  change('fail')({ keepOnTop: false });
  assert.deepEqual(events, [['updated', { preferences: { keepOnTop: true } }], ['report', 'disk full'], ['rebuild']]);
});
