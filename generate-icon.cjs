const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1024, height: 1024, frame: false, transparent: true, show: false, webPreferences: { contextIsolation: true, sandbox: true } });
  const svg = fs.readFileSync(path.join(__dirname, 'assets', 'icon.svg'), 'utf8');
  await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<html><head><style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style></head><body>' + svg + '</body></html>'));
  await new Promise(resolve => setTimeout(resolve, 350));
  fs.writeFileSync(path.join(__dirname, 'assets', 'icon.png'), (await window.webContents.capturePage()).toPNG());
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
