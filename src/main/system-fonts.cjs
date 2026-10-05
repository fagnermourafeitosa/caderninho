// Read-only access to macOS system fonts that Chromium cannot resolve by name (New York is hidden as ".New York").
const { pathToFileURL } = require('node:url');
const SCHEME = 'caderno-font';
const FILES = { 'new-york': '/System/Library/Fonts/NewYork.ttf', 'new-york-italic': '/System/Library/Fonts/NewYorkItalic.ttf' };
function fontFile(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== SCHEME + ':' || !['', '/'].includes(url.pathname) || url.search) return null;
  return Object.hasOwn(FILES, url.hostname) ? FILES[url.hostname] : null;
}
function registerFontProtocol(protocol, net) {
  protocol.handle(SCHEME, async request => {
    const file = fontFile(request.url);
    if (!file) return new Response('Fonte não encontrada', { status: 404 });
    const response = await net.fetch(pathToFileURL(file).href);
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'font/ttf' } });
  });
}
module.exports = { SCHEME, fontFile, registerFontProtocol };
