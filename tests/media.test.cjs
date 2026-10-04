const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { metadata, publicAddress, webUrl, MediaStore, download } = require('../media.cjs');
const { Store } = require('../store.cjs');
test('metadata uses Open Graph with attribute order, entities and relative images', () => {
  assert.deepEqual(metadata(`<title>Fallback</title><meta content='Papel &amp; tinta' property='og:title'><meta name="description" content="Descrição"><meta property="og:image" content="/cover.png">`, 'https://example.com/page'), { title: 'Papel & tinta', description: 'Descrição', image: 'https://example.com/cover.png' });
  assert.equal(metadata('<title>Título básico</title>', 'https://example.com').title, 'Título básico');
  assert.equal(metadata('<meta property="og:image" content="javascript:alert(1)">', 'https://example.com').image, undefined);
});
test('preview downloader rejects private hosts and non-web URLs', async () => {
  for (const value of ['127.0.0.1','10.0.0.1','192.168.1.2','172.16.1.1','169.254.169.254','::1','fc00::1']) assert.equal(publicAddress(value), false);
  assert.equal(publicAddress('8.8.8.8'), true);
  assert.throws(() => webUrl('file:///etc/passwd'));
  assert.throws(() => webUrl('https://user:password@example.com'));
  await assert.rejects(download('http://127.0.0.1/'));
});
test('media deduplicates bytes and garbage collection retains trashed references', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-test-'));
  const store = new Store(directory);
  t.after(() => { store.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const nativeImage = { createFromBuffer: bytes => ({ isEmpty: () => !bytes.length, getSize: () => ({ width: 1, height: 1 }), toPNG: () => bytes }) };
  const media = new MediaStore(store, nativeImage, async url => url.endsWith('.png') ? { bytes: Buffer.from('image'), type: 'image/png', url } : { bytes: Buffer.from('<meta property="og:title" content="Offline"><meta property="og:image" content="/image.png">'), type: 'text/html', url });
  const id = media.image(Buffer.from('image')); assert.equal(media.image(Buffer.from('image')), id);
  assert.equal(fs.readdirSync(media.directory).length, 1);
  const noteId = store.snapshot().selected.notes;
  store.dispatch('cut:create', { id: 'image', noteId, kind: 'image', blobId: id });
  assert.equal((await media.preview('https://example.com')).blobId, id);
  store.dispatch('cut:trash', { id: 'image' }); media.collect(); assert.ok(fs.existsSync(media.file(id)));
  store.dispatch('cut:purge', { id: 'image' }); media.collect(); assert.equal(media.file(id), null); assert.equal(fs.readdirSync(media.directory).length, 0);
});

test('PDF copy, metadata, deduplication, persistence and trash lifecycle', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-cut-test-'));
  let store = new Store(directory);
  t.after(() => { store.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const media = new MediaStore(store, null);
  const bytes = require('./pdf-fixture.cjs')();
  const reader = path.join(__dirname, '../native/caderninho-ocr');
  const data = await media.pdf(bytes, 'referencia.pdf', reader);
  if (process.platform === 'darwin' && fs.existsSync(reader)) {
    assert.equal(data.title, 'Meu documento PDF');
    assert.match(data.description, /Trecho inicial/);
  }
  assert.deepEqual(fs.readFileSync(media.file(data.blobId)), bytes);
  assert.equal((await media.pdf(bytes, 'outra-copia.pdf', reader)).blobId, data.blobId);
  assert.equal(fs.readdirSync(media.directory).length, 1);
  const noteId = store.snapshot().selected.notes;
  store.dispatch('cut:create', { id:'pdf', noteId, kind:'pdf', ...data });
  store.dispatch('cut:layout', { id:'pdf', side:'left', anchor:1, width:.42 });
  store.close(); store = new Store(directory); media.store = store;
  const cut = store.snapshot().notes.find(note => note.id === noteId).cuts[0];
  assert.equal(cut.kind, 'pdf'); assert.equal(cut.title, data.title); assert.equal(cut.description, data.description); assert.equal(cut.side, 'left');
  store.dispatch('cut:trash', { id:'pdf' }); media.collect(); assert.ok(fs.existsSync(media.file(data.blobId)));
  store.dispatch('cut:restore', { id:'pdf' }); assert.equal(store.cut('pdf').blob_id, data.blobId);
  store.dispatch('cut:trash', { id:'pdf' }); store.dispatch('cut:purge', { id:'pdf' }); media.collect(); assert.equal(media.file(data.blobId), null);
  await assert.rejects(media.pdf(Buffer.from('not a PDF'), 'wrong.pdf'), /inválido/);
  const fallback = await media.pdf(bytes, 'nome-original.pdf'); assert.equal(fallback.title, 'nome-original.pdf'); assert.equal(fallback.description, '');
});

test('legacy cuts constraint migration preserves existing cards and temporal columns', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-migration-'));
  let store = new Store(directory);
  t.after(() => { store.close(); fs.rmSync(directory, { recursive:true, force:true }); });
  const noteId = store.snapshot().selected.notes;
  store.dispatch('cut:create', { id:'old-link', noteId, kind:'link', title:'Minha referencia', url:'https://example.com', description:'Texto preservado' });
  store.dispatch('cut:trash', { id:'old-link' });
  const original = { ...store.cut('old-link') };
  const schema = store.db.prepare("SELECT sql FROM sqlite_master WHERE name='cuts'").get().sql;
  store.db.exec('PRAGMA foreign_keys=OFF');
  store.transaction(() => {
    store.db.exec(schema.replace(/CREATE TABLE "?cuts"?/i, 'CREATE TABLE legacy_cuts').replace("'image','link','pdf'", "'image','link'"));
    store.db.exec('INSERT INTO legacy_cuts SELECT * FROM cuts; DROP TABLE cuts; ALTER TABLE legacy_cuts RENAME TO cuts');
  });
  store.close(); store = new Store(directory);
  assert.deepEqual({ ...store.cut('old-link') }, original);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(), []);
  const media = new MediaStore(store, null);
  return media.pdf(require('./pdf-fixture.cjs')(), 'documento.pdf').then(data => {
    store.dispatch('cut:create', { id:'new-pdf', noteId, kind:'pdf', ...data });
    assert.equal(store.cut('new-pdf').kind, 'pdf');
  });
});
