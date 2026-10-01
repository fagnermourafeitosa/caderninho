const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('notebook', {
  state: () => ipcRenderer.invoke('notebook:state'),
  action: (action, input) => ipcRenderer.invoke('notebook:action', action, input),
  purge: (kind, id) => ipcRenderer.invoke('notebook:purge', kind, id),
  sound: () => ipcRenderer.invoke('notebook:sound'),
  quick: () => ipcRenderer.invoke('quick:open'),
  image: input => ipcRenderer.invoke('cuts:image', input),
  link: input => ipcRenderer.invoke('cuts:link', input),
  openCut: id => ipcRenderer.invoke('cuts:open', id),
  onCutsUpdated: callback => ipcRenderer.on('notebook:cuts-updated', (_event, state) => callback(state)),
  resize: (phase, input) => ipcRenderer.send('notebook:resize', phase, input),
  move: (phase, input) => ipcRenderer.send('notebook:move', phase, input),
  onWindowState: callback => ipcRenderer.on('notebook:window-state', (_event, info) => callback(info)),
  window: action => ipcRenderer.invoke('notebook:window', action),
  onNavigate: callback => ipcRenderer.on('notebook:navigate', (_event, state) => callback(state)),
  onReminder: callback => ipcRenderer.on('notebook:reminder', (_event, reminders) => callback(reminders)),
  onSaveError: callback => ipcRenderer.on('notebook:save-error', (_event, message) => callback(message))
});
