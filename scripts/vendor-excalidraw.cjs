// Builds the board bundle (Caderninho board UI + Excalidraw + React) into the git-ignored renderer vendor folder,
// and copies Excalidraw's stylesheet and fonts next to it so nothing loads from the network.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const target = path.join(ROOT, 'src', 'renderer', 'vendor', 'excalidraw');
const excalidraw = path.join(ROOT, 'node_modules', '@excalidraw', 'excalidraw');

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(ROOT, 'src', 'renderer', 'boards', 'canvas', 'mount.jsx')],
  outfile: path.join(target, 'board.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: true,
  legalComments: 'linked',
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  logLevel: 'warning',
});
fs.copyFileSync(path.join(excalidraw, 'dist', 'prod', 'index.css'), path.join(target, 'excalidraw.css'));
fs.cpSync(path.join(excalidraw, 'dist', 'prod', 'fonts'), path.join(target, 'fonts'), { recursive: true });
