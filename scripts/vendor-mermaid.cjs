// Copies only Mermaid's self-contained browser build into the renderer; the npm package stays a dev dependency.
const fs = require('node:fs');
const path = require('node:path');
const source = require.resolve('mermaid/dist/mermaid.min.js');
const target = path.join(__dirname, '..', 'src', 'renderer', 'vendor', 'mermaid.min.js');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
