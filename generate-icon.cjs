const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1024, height: 1024, frame: false, transparent: true, show: false, webPreferences: { contextIsolation: true, sandbox: true } });
  const svg = fs.readFileSync(path.join(__dirname, 'assets', 'icon.svg'), 'utf8');
  await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<html><head><style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style></head><body>' + svg + '</body></html>'));
  await new Promise(resolve => setTimeout(resolve, 350));
  const image = await window.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, 'assets', 'icon.png'), image.toPNG());
  if (process.platform === 'darwin') {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-icon-'));
    try {
      const iconset = path.join(temporary, 'Caderninho.iconset');
      fs.mkdirSync(iconset);
      for (const size of [16, 32, 128, 256, 512]) {
        for (const scale of [1, 2]) {
          const name = `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`;
          fs.writeFileSync(path.join(iconset, name), image.resize({ width: size * scale, height: size * scale }).toPNG());
        }
      }
      execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', path.join(__dirname, 'assets', 'icon.icns')]);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
