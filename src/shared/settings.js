// Settings shared by the service worker, content script and popup.
// Loaded as a classic script everywhere; attaches to the DeskPet namespace.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const DEFAULTS = {
    enabled: true,
    intervalMinutes: 30,
    snoozeMinutes: 5,
    pausedUntil: 0, // epoch ms; breaks are suppressed until then
    autoMinimize: false, // opt-in: cat presses the minimize button by itself
    restoreAfterBreak: true, // desktop app: bring the minimized window back afterwards
    exercises: {
      overhead: true,
      side: true,
      shoulders: true,
      walk: true,
      eyes: true,
      wrists: true,
    },
    cursorGag: true,
    buttonReactions: true,
    volume: 0, // 0..1, silent by default
    opacity: 1, // 0.2..1
    size: 1, // character scale
    visionTerrain: true, // desktop: look at the screen to find ledges inside windows
    simpleArt: false, // desktop: draw the built-in SVG characters instead of the Rive files
  };

  const area = () => chrome.storage.sync || chrome.storage.local;

  function merge(stored) {
    const s = { ...DEFAULTS, ...(stored || {}) };
    s.exercises = { ...DEFAULTS.exercises, ...((stored && stored.exercises) || {}) };
    return s;
  }

  async function load() {
    try {
      const r = await area().get('settings');
      return merge(r.settings);
    } catch (e) {
      return merge(null);
    }
  }

  async function save(patch) {
    const next = { ...(await load()), ...patch };
    await area().set({ settings: next });
    return next;
  }

  // cb(newSettings, oldSettings)
  function onChange(cb) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) cb(merge(changes.settings.newValue), merge(changes.settings.oldValue));
    });
  }

  DP.settings = { DEFAULTS, load, save, onChange };
})(globalThis);
