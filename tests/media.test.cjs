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
