// Desktop app only: maps the handful of chrome.* calls the shared code uses
// (storage, runtime messaging) onto the Electron bridge, so src/content and
// src/popup run unmodified. Does nothing inside the real Chrome extension.
(function () {
  const bridge = window.deskpetBridge;
  if (!bridge) return;

  const area = { get: (key) => bridge.storageGet(key), set: (obj) => bridge.storageSet(obj) };

  window.chrome = Object.assign(window.chrome || {}, {
    storage: {
      sync: area,
      local: area,
      onChanged: { addListener: (fn) => bridge.on('storage-changed', fn) },
    },
    runtime: {
      sendMessage: (msg) => bridge.sendMessage(msg),
      onMessage: { addListener: (fn) => bridge.on('message', (msg) => fn(msg, {}, () => {})) },
    },
  });

  (window.DeskPet = window.DeskPet || {}).desktop = true;
})();
