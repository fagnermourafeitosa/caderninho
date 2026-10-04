const { event } = require('./temporal.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const dns = require('node:dns/promises');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { execFile } = require('node:child_process');
function publicAddress(address) {
  if (net.isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address);
  if (net.isIP(address) !== 4) return false;
  const [a,b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
}
function webUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use um link HTTP ou HTTPS sem credenciais.');
  return url;
}
async function download(value, max = 2 * 1024 * 1024, redirects = 0) {
  const url = webUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Prévia disponível apenas para sites públicos.');
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      headers: { 'User-Agent': 'Caderninho/1.3 LinkPreview', Accept: 'text/html,image/*;q=0.8' },
      lookup: (_host, options, callback) => options.all ? callback(null, addresses) : callback(null, addresses[0].address, addresses[0].family)
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 4) { reject(new Error('Muitos redirecionamentos.')); return; }
        resolve(download(new URL(response.headers.location, url).href, max, redirects + 1)); return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) { response.resume(); reject(new Error('O site não disponibilizou uma prévia.')); return; }
      if (Number(response.headers['content-length']) > max) { response.destroy(); reject(new Error('Arquivo muito grande para prévia.')); return; }
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > max) { response.destroy(new Error('Prévia muito grande.')); return; } chunks.push(chunk); });
      response.on('end', () => resolve({ bytes: Buffer.concat(chunks), type: String(response.headers['content-type'] || ''), url: url.href }));
      response.on('error', reject);
    });
    const timer = setTimeout(() => request.destroy(new Error('O site demorou para responder.')), 8000);
    request.on('close', () => clearTimeout(timer)); request.on('error', reject);
  });
}
function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (all, code) => {
    if (code[0] === '#') { const n = parseInt(code.slice(code[1].toLowerCase() === 'x' ? 2 : 1), code[1].toLowerCase() === 'x' ? 16 : 10); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }
    return { amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ' }[code.toLowerCase()] || all;
  }).replace(/\s+/g, ' ').trim();
}
function metadata(html, baseUrl) {
  const tags = {};
  for (const tag of html.match(/<meta\s[^>]*>/gi) || []) {
    const attrs = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (attrs.content && !tags[key]) tags[key] = cleanText(attrs.content);
  }
  let image;
  try { if (tags['og:image'] || tags['twitter:image']) image = webUrl(new URL(tags['og:image'] || tags['twitter:image'], baseUrl).href).href; } catch {}
  return { title: (tags['og:title'] || tags['twitter:title'] || cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || new URL(baseUrl).hostname).slice(0, 300), description: (tags['og:description'] || tags['twitter:description'] || tags.description || '').slice(0, 800), image };
}
class MediaStore {
  constructor(store, nativeImage, fetch = download) { this.store = store; this.nativeImage = nativeImage; this.fetch = fetch; this.directory = path.join(store.directory, 'media'); fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 }); }
  image(input) {
    const bytes = Buffer.from(input);
    if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error('Use uma imagem de até 20 MB.');
    const image = this.nativeImage.createFromBuffer(bytes);
    if (image.isEmpty()) throw new Error('Imagem inválida. Use PNG, JPEG ou WebP.');
    const size = image.getSize(); if (size.width * size.height > 40_000_000) throw new Error('A imagem tem resolução muito alta.');
    const png = image.toPNG(); if (png.length > 40 * 1024 * 1024) throw new Error('A imagem é muito grande.');
    const id = createHash('sha256').update(png).digest('hex'), file = id + '.png';
    const target = path.join(this.directory, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, png, { mode: 0o600, flag: 'wx' });
    const inserted = this.store.db.prepare('INSERT OR IGNORE INTO media_blobs(id,file,mime,bytes,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id, file, 'image/png', png.length,new Date(this.store.now()).toISOString(),new Date(this.store.now()).toISOString());
    if (inserted.changes) event(this.store,'media',id,'create',new Date(this.store.now()).toISOString());
    return id;
  }
  async pdf(input, name, readerPath) {
    const bytes = Buffer.from(input);
    if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error('Use um PDF de até 50 MB.');
    if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Arquivo PDF inválido.');
    const id = createHash('sha256').update(bytes).digest('hex'), file = id + '.pdf';
    const target = path.join(this.directory, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { mode: 0o600, flag: 'wx' });
    let data = {};
    if (process.platform === 'darwin' && readerPath && fs.existsSync(readerPath)) {
      try {
        data = await new Promise((resolve, reject) => execFile(readerPath, [target], { timeout: 15000, maxBuffer: 1024 * 1024 }, (error, out) => {
          if (error) { reject(error); return; }
          try { resolve(JSON.parse(out)); } catch (error) { reject(error); }
        }));
      } catch { /* Keep the attachment available even without extractable metadata. */ }
    }
    const stamp = new Date(this.store.now()).toISOString();
    const inserted = this.store.db.prepare('INSERT OR IGNORE INTO media_blobs(id,file,mime,bytes,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id, file, 'application/pdf', bytes.length, stamp, stamp);
    if (inserted.changes) event(this.store,'media',id,'create',stamp);
    return { blobId: id, title: String(data.title || path.basename(String(name || 'Documento.pdf'))).trim().slice(0,300), description: String(data.text || '').replace(/\s+/g,' ').trim().slice(0,800) };
  }
  file(id) { if (!/^[a-f0-9]{64}$/.test(id)) return null; const row = this.store.db.prepare('SELECT file FROM media_blobs WHERE id=?').get(id); return row ? path.join(this.directory, row.file) : null; }
  async preview(url) {
    const result = await this.fetch(url);
    if (!/text\/html|application\/xhtml\+xml/i.test(result.type)) throw new Error('Este endereço não disponibilizou uma página de prévia.');
    const data = metadata(result.bytes.toString('utf8'), result.url);
    let blobId = null;
    if (data.image) { try { const image = await this.fetch(data.image, 15 * 1024 * 1024); if (/^image\//i.test(image.type)) blobId = this.image(image.bytes); } catch {} }
    return { title: data.title, description: data.description, blobId };
  }
  collect() {
    const rows = this.store.db.prepare('SELECT * FROM media_blobs WHERE id NOT IN (SELECT blob_id FROM cuts WHERE blob_id IS NOT NULL)').all();
    for (const row of rows) { try { fs.rmSync(path.join(this.directory, row.file), { force: true }); this.store.db.prepare('DELETE FROM media_blobs WHERE id=?').run(row.id); } catch {} }
  }
}
module.exports = { MediaStore, download, metadata, webUrl, publicAddress };
