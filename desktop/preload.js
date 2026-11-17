// Narrow bridge between the renderers and the main process. chrome-shim.js
// builds the chrome.* look-alike on top of this.
const { contextBridge, ipcRenderer } = require('electron');

const INBOUND = ['message', 'storage-changed', 'cursor', 'presence', 'windows', 'ledges', 'walls'];

contextBridge.exposeInMainWorld('deskpetBridge', {
  storageGet: (key) => ipcRenderer.invoke('storage-get', key),
  storageSet: (obj) => ipcRenderer.invoke('storage-set', obj),
  sendMessage: (msg) => ipcRenderer.invoke('message', msg),
  setInteractive: (on) => ipcRenderer.send('set-interactive', !!on),
  setOnStage: (on) => ipcRenderer.send('on-stage', !!on),
  readAsset: (name) => ipcRenderer.invoke('read-asset', name),
  on: (channel, cb) => {
    if (INBOUND.includes(channel)) ipcRenderer.on(channel, (event, data) => cb(data));
  },
});
