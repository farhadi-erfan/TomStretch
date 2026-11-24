// Bridge for vision-capture.html (the hidden screen-stream window).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('visionBridge', {
  start: () => ipcRenderer.invoke('vision-start'), // -> {sourceId, width, height} or null
  edges: (e) => ipcRenderer.send('vision-edges', e),
  failed: (why) => ipcRenderer.send('vision-failed', String(why)),
  onRate: (cb) => ipcRenderer.on('vision-rate', (event, hz) => cb(hz)),
  onNow: (cb) => ipcRenderer.on('vision-now', () => cb()),
});
