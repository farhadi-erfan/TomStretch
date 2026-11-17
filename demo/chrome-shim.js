// Minimal stand-in for the chrome.* APIs so the content script can run on a
// plain web page (demo/index.html) without installing the extension.
// "Minimizing" is simulated: the page dims for a few seconds, then "returns".
(function () {
  if (window.chrome && chrome.runtime && chrome.runtime.id) return; // real extension present

  const store = {};
  const storageListeners = [];
  const messageListeners = [];

  const area = {
    async get(key) {
      return { [key]: store[key] };
    },
    async set(obj) {
      const changes = {};
      for (const k of Object.keys(obj)) {
        changes[k] = { oldValue: store[k], newValue: obj[k] };
        store[k] = obj[k];
      }
      storageListeners.forEach((fn) => fn(changes));
    },
  };

  const deliver = (msg) => messageListeners.forEach((fn) => fn(msg, {}, () => {}));

  window.chrome = {
    storage: { sync: area, local: area, onChanged: { addListener: (fn) => storageListeners.push(fn) } },
    runtime: {
      onMessage: { addListener: (fn) => messageListeners.push(fn) },
      async sendMessage(msg) {
        console.log('[demo] to background:', msg.type);
        if (msg.type === 'LOCATE_MINIMIZE') return { ok: false, unsupported: true };
        if (msg.type === 'MINIMIZE_WINDOW') {
          const veil = document.getElementById('veil');
          veil.hidden = false;
          setTimeout(() => {
            veil.hidden = true;
            deliver({ type: 'BREAK_RETURN' });
          }, 4000);
        }
        return { ok: true };
      },
    },
  };

  window.demo = { deliver };
})();
