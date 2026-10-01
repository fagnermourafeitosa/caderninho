const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('quick', {
  state: () => ipcRenderer.invoke('quick:state'),
  write: input => ipcRenderer.invoke('quick:write', input),
  commit: () => ipcRenderer.invoke('quick:commit'),
  hide: () => ipcRenderer.invoke('quick:hide'),
  reveal: id => ipcRenderer.invoke('quick:reveal', id),
  onRefresh: callback => ipcRenderer.on('quick:refresh', callback)
});
