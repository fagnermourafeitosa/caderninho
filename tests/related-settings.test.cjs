const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/main/store.cjs');
const { createRelatedPages } = require('../src/main/related/compose.cjs');

// A temporary notebook with a model folder on disk and an engine stand-in that records what it was asked.
function fixture(t, embed = async () => [1, 0]) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-related-settings-'));
  const cacheDir = path.join(directory, 'models'), effects = [];
  const engine = { embed: async text => { effects.push('embed'); return embed(text); }, recognize: async () => '', canRecognize: () => false, stop: async () => { effects.push('stop'); } };
  const opened = [];
  const open = () => { const store = new Store(directory); const related = createRelatedPages({ store, media: { file: () => null }, cacheDir, engine }); opened.push({ store, related }); return { store, related }; };
  t.after(() => { opened.reverse().forEach(({ store, related }) => { related.close(); store.close(); }); fs.rmSync(directory, { recursive: true, force: true }); });
  const modelFile = (name, bytes) => { const file = path.join(cacheDir, 'onnx-community/embeddinggemma-300m-ONNX', name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.alloc(bytes)); };
  return { ...open(), open, effects, cacheDir, modelFile };
}

test('a fresh notebook has related pages on, 8 results, balanced sensitivity and no model on disk', t => {
  const { related } = fixture(t);
  assert.deepEqual(related.useCases.readRelatedSettings(), {
    preferences: { enabled: true, limit: 8, sensitivity: 'balanced' },
    model: { name: 'embeddinggemma-300m-ONNX', revision: '5090578', quantization: 'q4', sourceUrl: 'https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX', bytes: 0, state: 'absent' },
  });
});

test('the model block reports the folder size and whether every model file is there', t => {
  const { related, modelFile } = fixture(t);
  modelFile('config.json', 10); modelFile('onnx/model_q4.onnx', 100);
  assert.deepEqual([related.useCases.readRelatedSettings().model.bytes, related.useCases.readRelatedSettings().model.state], [110, 'absent']);
  related.scheduler.setStatus('loading');
  assert.equal(related.useCases.readRelatedSettings().model.state, 'downloading');
  for (const name of ['tokenizer.json', 'tokenizer_config.json', 'onnx/model_q4.onnx_data']) modelFile(name, 5);
  related.scheduler.setStatus('ready');
  assert.deepEqual([related.useCases.readRelatedSettings().model.bytes, related.useCases.readRelatedSettings().model.state], [125, 'downloaded']);
});

// Ten pages in one notebook; vectors make the page "far" score just below 0.40 and "near" well above.
async function indexedPages(store, related) {
  store.dispatch('note:trash', { id: 'welcome' });
  const ids = [];
  for (let i = 0; i < 10; i++) { store.dispatch('note:create', { type: 'notes', title: `Página ${i}` }); ids.push(store.snapshot().selected.notes); }
  await related.scheduler.runNow();
  return ids;
}

test('quantity and sensitivity change the related results and survive reopening', async t => {
  const { store, related, open } = fixture(t);
  const [first] = await indexedPages(store, related);
  assert.equal(related.useCases.queryRelated(first).results.length, 8);
  const view = related.useCases.updateRelatedSettings({ limit: 3, sensitivity: 'strict' });
  assert.deepEqual(view.preferences, { enabled: true, limit: 3, sensitivity: 'strict' });
  assert.equal(related.useCases.queryRelated(first).results.length, 3);
  assert.deepEqual(open().related.useCases.readRelatedSettings().preferences, { enabled: true, limit: 3, sensitivity: 'strict' });
});

test('the sensitivity level decides which weak connections are dropped', async t => {
  // Only the semantic signal counts here (no shared words or categories), so score = 0.65 × (cos − 0.30) / 0.55.
  const at = cos => [cos, Math.sqrt(1 - cos * cos)];
  const vectors = { Fonte: [1, 0], Media: at(0.655), Fraca: at(0.613) }; // scores ≈ 0.42 and ≈ 0.37
  const { store, related } = fixture(t, async text => vectors[text]);
  store.dispatch('note:trash', { id: 'welcome' });
  const create = title => { store.dispatch('note:create', { type: 'notes', title }); return store.snapshot().selected.notes; };
  const source = create('Fonte'); create('Media'); create('Fraca');
  await related.scheduler.runNow();
  for (const [sensitivity, expected] of [['broad', ['Media', 'Fraca']], ['balanced', ['Media']], ['strict', []]]) {
    related.useCases.updateRelatedSettings({ sensitivity });
    assert.deepEqual(related.useCases.queryRelated(source).results.map(d => d.title), expected, sensitivity);
  }
});

test('invalid related settings are refused and change nothing; restoring the ranking keeps the switch', t => {
  const { related } = fixture(t);
  related.useCases.updateRelatedSettings({ enabled: false, limit: 5, sensitivity: 'broad' });
  for (const changes of [{ limit: 2 }, { limit: 13 }, { limit: 4.5 }, { limit: '5' }, { sensitivity: 'loose' }, { enabled: 'no' }, { limit: 6, sensitivity: 'x' }]) {
    assert.throws(() => related.useCases.updateRelatedSettings(changes), /Ajuste inválido/, JSON.stringify(changes));
  }
  assert.deepEqual(related.useCases.readRelatedSettings().preferences, { enabled: false, limit: 5, sensitivity: 'broad' });
  assert.deepEqual(related.useCases.resetRelatedRanking().preferences, { enabled: false, limit: 8, sensitivity: 'balanced' });
});

const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

test('turning related pages off stops the engine, skips indexing and answers disabled; turning on indexes again', async t => {
  const { store, related, effects } = fixture(t);
  const [first] = await indexedPages(store, related);
  effects.length = 0;
  related.useCases.updateRelatedSettings({ enabled: false });
  assert.deepEqual(effects, ['stop']);
  assert.deepEqual(related.useCases.queryRelated(first), { status: 'disabled', results: [] });
  store.dispatch('note:update', { id: first, body: 'Texto novo' });
  related.schedule(); await related.scheduler.runNow(); await settle(1300);
  assert.deepEqual(effects, ['stop'], 'no embedding while off');
  related.scheduler.debounceMs = 10;
  related.useCases.updateRelatedSettings({ enabled: true });
  await settle(200);
  assert.deepEqual(effects, ['stop', 'embed'], 'the edited page is embedded once turned on');
  assert.equal(related.useCases.queryRelated(first).status, 'ready');
});

test('a notebook saved with related pages off starts disabled', t => {
  const { related, open } = fixture(t);
  related.useCases.updateRelatedSettings({ enabled: false });
  const reopened = open().related;
  assert.equal(reopened.scheduler.status, 'disabled');
  reopened.schedule();
  assert.equal(reopened.scheduler.timer, undefined);
});

test('clearing the cache removes the model and vectors, keeps image text, and re-indexes only when on', async t => {
  const { store, related, effects, cacheDir, modelFile } = fixture(t);
  await indexedPages(store, related);
  modelFile('config.json', 10);
  store.db.prepare('INSERT INTO related_ocr VALUES(?,?,?)').run('blob', 'texto da imagem', '2026-10-14T00:00:00Z');
  const vectorCount = () => store.db.prepare('SELECT count(*) AS n FROM related_vectors').get().n;
  assert.equal(vectorCount(), 10);
  effects.length = 0;
  related.scheduler.debounceMs = 10;
  const view = await related.useCases.clearRelatedCache();
  assert.equal(fs.existsSync(cacheDir), false);
  assert.equal(view.model.bytes, 0);
  assert.equal(store.db.prepare('SELECT text FROM related_ocr WHERE blob_id=?').get('blob').text, 'texto da imagem');
  assert.equal(effects[0], 'stop');
  await settle(200);
  assert.equal(vectorCount(), 10, 're-indexed while on');
  related.useCases.updateRelatedSettings({ enabled: false });
  await related.useCases.clearRelatedCache(); await settle(200);
  assert.equal(vectorCount(), 0, 'stays empty while off');
});

test('clearing waits for a running pass before deleting, so no vector is written afterwards', async t => {
  let release;
  const { store, related } = fixture(t, () => new Promise(resolve => { release = () => resolve([1, 0]); }));
  store.dispatch('note:update', { id: 'welcome', body: 'Uma página para indexar' });
  const pass = related.scheduler.runNow();
  await settle(20);
  const cleared = related.useCases.clearRelatedCache();
  release();
  await Promise.all([pass, cleared]);
  related.close();
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM related_vectors').get().n, 0);
});
