// TomStretch desktop app (Electron main process).
//
// Plays the role the service worker plays in the Chrome extension: owns the
// break timer, settings storage and window control. The pets themselves are
// the same code as the extension's content script (src/content), running in a
// transparent, click-through, always-on-top overlay that covers the screen.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const windowControl = require('./window-control');
const vision = require('./vision');

require('../src/shared/settings.js'); // defines globalThis.DeskPet.settings
const DEFAULTS = globalThis.DeskPet.settings.DEFAULTS;

const IDLE_AWAY_SECONDS = 90; // no input for this long = the user has left
const CURSOR_HZ = 30;

let overlay = null;
let settingsWin = null;
let tray = null;

// ---- Storage (stands in for chrome.storage) --------------------------------

let store = {};
const storeFile = () => path.join(app.getPath('userData'), 'store.json');

// A plain-text log of warnings and errors (ours and the overlay's), so a
// problem on someone else's machine can be sent over. Kept small.
const logFile = () => path.join(app.getPath('userData'), 'tomstretch.log');
function log(...parts) {
  try {
    const file = logFile();
    if (fs.existsSync(file) && fs.statSync(file).size > 512 * 1024) fs.renameSync(file, file + '.old');
    fs.appendFileSync(file, `${new Date().toISOString()} ${parts.join(' ')}\n`);
  } catch (e) {
    /* logging must never break the app */
  }
}

function loadStore() {
  try {
    store = JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
  } catch (e) {
    store = {};
  }
}

function getSettings() {
  return globalThis.DeskPet.settings.merge(store.settings); // defaults filled in, bad numbers repaired
}

function setStore(obj) {
  const before = getSettings();
  const changes = {};
  for (const key of Object.keys(obj)) {
    changes[key] = { oldValue: store[key], newValue: obj[key] };
    store[key] = obj[key];
  }
  fs.writeFileSync(storeFile(), JSON.stringify(store, null, 2));
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send('storage-changed', changes);
  if (changes.settings) {
    const after = getSettings();
    if (after.enabled !== before.enabled || after.intervalMinutes !== before.intervalMinutes) schedule();
    if (['enabled', 'visionTerrain', 'visionHz'].some((k) => after[k] !== before[k])) scanSoon(0);
    buildTrayMenu();
  }
}

const saveSettings = (patch) => setStore({ settings: { ...getSettings(), ...patch } });

// ---- Break timer -----------------------------------------------------------

let nextBreakAt = null;
let snoozeAt = null;
let pendingBreak = false; // a break came due while the user was away
let away = false;
let located = null; // window whose minimize button the cat is heading for
let minimizedTarget = null; // window we minimized for the current break
let lastUserPid = null; // app the user was in before opening our settings

const intervalMs = () => Math.max(1, Number(getSettings().intervalMinutes) || 30) * 60000;

function schedule() {
  snoozeAt = null;
  nextBreakAt = getSettings().enabled ? Date.now() + intervalMs() : null;
}

function triggerBreak(force) {
  const s = getSettings();
  if (!s.enabled) return { ok: false, reason: 'disabled' };
  if (!force && s.pausedUntil > Date.now()) return { ok: false, reason: 'paused' };
  if (!force && away) {
    pendingBreak = true; // nobody to stretch; wait until they're back
    return { ok: false, reason: 'away' };
  }
  pendingBreak = false;
  if (!overlayLive()) return { ok: false, reason: 'quitting' };
  overlay.webContents.send('message', { type: 'BREAK_START' });
  return { ok: true };
}

function tick() {
  if (!overlayLive()) return;
  const nowAway = powerMonitor.getSystemIdleTime() >= IDLE_AWAY_SECONDS;
  if (nowAway !== away) {
    away = nowAway;
    overlay.webContents.send('presence', { away });
    if (!away && pendingBreak) setTimeout(() => triggerBreak(false), 4000); // after the welcome back
  }
  const now = Date.now();
  if (snoozeAt && now >= snoozeAt) {
    snoozeAt = null;
    triggerBreak(false);
  }
  if (nextBreakAt && now >= nextBreakAt) {
    nextBreakAt = now + intervalMs();
    triggerBreak(false);
  }
}

// ---- Messages from the renderers (same protocol as the extension) ----------

const windowCtx = () => ({ selfPid: process.pid, fallbackPid: lastUserPid });

const handlers = {
  // Where is the real minimize button of the user's window? Answered in
  // overlay coordinates so the cat can run and jump to it.
  async LOCATE_MINIMIZE() {
    located = null;
    const res = await windowControl.locateMinimizeButton(windowCtx());
    if (!res.ok) return res;
    const b = overlay.getBounds();
    const x = res.button.x + res.button.width / 2 - b.x;
    let y = res.button.y + res.button.height / 2 - b.y;
    if (y < 0 && y > -40) y = 2; // a title bar tucked under the menu bar: just reachable
    if (x < 0 || y < 0 || x > b.width || y > b.height) return { ok: false, hint: "Can't reach that screen" };
    located = res.target;
    return { ok: true, x, y };
  },
  async MINIMIZE_WINDOW() {
    // Test runs leave the user's windows alone unless DESKPET_LIVE is set.
    if (process.env.DESKPET_SMOKE && !process.env.DESKPET_LIVE) return (located = null), { ok: true };
    const res = await windowControl.pressMinimizeButton(windowCtx(), located);
    located = null;
    if (!res.ok) return res;
    minimizedTarget = res.target;
    return { ok: true };
  },
  async SNOOZE(msg) {
    snoozeAt = Date.now() + Math.max(1, Number(msg.minutes) || getSettings().snoozeMinutes) * 60000;
    return { ok: true };
  },
  async BREAK_DONE() {
    if (minimizedTarget && getSettings().restoreAfterBreak) await windowControl.restoreWindow(minimizedTarget);
    minimizedTarget = null;
    schedule();
    return { ok: true };
  },
  async TRIGGER_BREAK_NOW() {
    return triggerBreak(true);
  },
  QUIT() {
    setTimeout(() => app.quit(), 50); // let the reply go back first
    return true;
  },
  async GET_STATUS() {
    const times = [nextBreakAt, snoozeAt].filter(Boolean);
    return { nextBreakAt: times.length ? Math.min(...times) : null };
  },
};

ipcMain.handle('message', (e, msg) => (msg && handlers[msg.type] ? handlers[msg.type](msg) : null));
// Character art files (assets/rive/*.riv). Only that folder, only by file name.
ipcMain.handle('read-asset', (e, name) => {
  if (getSettings().simpleArt) return null; // the renderer then uses the SVG characters
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'assets', 'rive', path.basename(String(name))));
  } catch (err) {
    return null;
  }
});
ipcMain.handle('storage-get', (e, key) => ({ [key]: store[key] }));
ipcMain.handle('storage-set', (e, obj) => setStore(obj));

// The overlay ignores the mouse except while the cursor is over the break
// panel or the minimize button.
ipcMain.on('set-interactive', (e, on) => {
  if (overlay && e.sender === overlay.webContents) overlay.setIgnoreMouseEvents(!on);
});

// ---- Terrain: what the pets can stand on ------------------------------------

// Layer 1: app windows. A small helper process streams their geometry.
let tracker = null;
let quitting = false;
// The overlay is usable (not closing down with the app).
const overlayLive = () => !quitting && overlay && !overlay.isDestroyed();
let windowRects = []; // overlay coordinates, front-most first

function startWindowTracker() {
  if (process.platform !== 'darwin') return;
  let buf = '';
  const launch = () => {
    buf = '';
    // In a packaged app the helper is unpacked next to the archive, where osascript can read it.
    const helper = path.join(__dirname, 'window-tracker.jxa.js').replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
    tracker = spawn('osascript', ['-l', 'JavaScript', helper, String(process.pid)], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    tracker.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        try {
          onWindows(JSON.parse(line));
        } catch (e) {
          /* partial line */
        }
      }
    });
    tracker.on('exit', () => {
      if (!quitting) setTimeout(launch, 1000);
    });
  };
  launch();
  setInterval(() => tracker && tracker.kill(), 10 * 60 * 1000); // recycle: the helper leaks slowly
}

function onWindows(list) {
  if (!overlayLive()) return;
  const b = overlay.getBounds();
  windowRects = list.map(([id, pid, x, y, w, h]) => ({ id: 'w' + id, left: x - b.x, top: y - b.y, right: x - b.x + w, bottom: y - b.y + h }));
  overlay.webContents.send('windows', windowRects);
  scanSoon(250); // what's inside them has probably changed too
}

// Layer 2: edges seen inside windows (toolbars, cards, images, web pages):
// ledges to stand on and walls to climb. A hidden window keeps a live,
// low-resolution stream of the screen and looks at it several times a second
// (the visionHz setting) while the pets are on screen, once a second
// otherwise. If the stream can't start, one-off screenshots (about 0.3 s
// each) are the fallback.
const LOOK_HZ_IDLE = 1;
let scanTimer = null;
let scanning = false;
let petsOnStage = false;
let visionWin = null;
let streamFailed = false;
ipcMain.on('on-stage', (e, on) => {
  if (!overlay || e.sender !== overlay.webContents) return;
  petsOnStage = !!on;
  if (petsOnStage) scanSoon(0);
  else updateVision(); // slow the stream down
});

function sendEdges(edges) {
  if (!overlayLive()) return;
  const b = overlay.getBounds();
  const local = (r) => ({ ...r, left: r.left - b.x, right: r.right - b.x, top: r.top - b.y, bottom: r.bottom - b.y });
  overlay.webContents.send('ledges', edges.ledges.map(local));
  overlay.webContents.send('walls', edges.walls.map(local));
}

// Starts, retunes or stops the stream to match the settings and whether the
// pets are on screen.
const streamAlive = () => visionWin && !visionWin.isDestroyed();
let sentRate = null;
function updateVision() {
  const s = getSettings();
  const want = !quitting && s.enabled && s.visionTerrain && !streamFailed && vision.ensurePermission();
  if (!want) {
    if (streamAlive()) visionWin.destroy();
    visionWin = null;
    return;
  }
  if (!streamAlive()) {
    sentRate = null;
    visionWin = new BrowserWindow({
      show: false,
      webPreferences: { preload: path.join(__dirname, 'vision-preload.js'), backgroundThrottling: false },
    });
    visionWin.on('closed', () => (visionWin = null));
    visionWin.webContents.on('render-process-gone', (e, d) => streamGone('vision window gone: ' + d.reason));
    visionWin.loadFile(path.join(__dirname, 'vision-capture.html'));
  }
  const rate = petsOnStage ? s.visionHz : LOOK_HZ_IDLE;
  if (rate !== sentRate) {
    sentRate = rate;
    visionWin.webContents.send('vision-rate', rate);
  }
}

// The stream stopped for good: fall back to screenshots.
function streamGone(why) {
  log('screen stream failed, using screenshots:', why);
  streamFailed = true;
  scanSoon(0); // destroys the window, starts the screenshot loop
}

const fromVision = (e) => streamAlive() && e.sender === visionWin.webContents;
ipcMain.handle('vision-start', async (e) => {
  if (!fromVision(e)) return null;
  const d = screen.getPrimaryDisplay();
  const sourceId = await vision.sourceId(d);
  if (!sourceId) return null;
  sentRate = null; // the page is listening now: send the rate again
  updateVision();
  return { sourceId, width: Math.round(d.size.width * vision.SCALE), height: Math.round(d.size.height * vision.SCALE) };
});
ipcMain.on('vision-edges', (e, raw) => {
  if (!fromVision(e) || !getSettings().visionTerrain) return;
  if (process.env.DESKPET_VISION_DEBUG) console.log('[vision]', Date.now() % 100000, raw.ledges.length, 'ledges', raw.walls.length, 'walls');
  sendEdges(vision.toScreen(raw, screen.getPrimaryDisplay(), raw.w, raw.h));
});
ipcMain.on('vision-failed', (e, why) => fromVision(e) && streamGone(why));

// Looks at the screen after `delay` ms: the stream's next frame, or a
// screenshot when there is no stream.
function scanSoon(delay) {
  updateVision();
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    if (streamAlive()) visionWin.webContents.send('vision-now');
    else scanLedges();
  }, delay);
}

// Fallback without the stream: one-off screenshots.
async function scanLedges() {
  if (streamAlive()) return; // the stream took over
  scanSoon(petsOnStage ? 900 : 3000);
  if (scanning || !overlayLive() || !getSettings().enabled) return;
  if (!getSettings().visionTerrain) {
    overlay.webContents.send('ledges', []);
    return overlay.webContents.send('walls', []);
  }
  scanning = true;
  try {
    const edges = await vision.scan(screen.getPrimaryDisplay());
    if (edges) sendEdges(edges);
  } catch (e) {
    console.warn('[DeskPet] screen scan failed:', e.message);
  } finally {
    scanning = false;
  }
}

// ---- Windows ---------------------------------------------------------------

const webPreferences = () => ({
  preload: path.join(__dirname, 'preload.js'),
  backgroundThrottling: false,
  autoplayPolicy: 'no-user-gesture-required',
});

function createOverlay() {
  // The work area excludes the menu bar and Dock/taskbar, so the pets stand on
  // top of the Dock rather than behind it.
  const area = screen.getPrimaryDisplay().workArea;
  overlay = new BrowserWindow({
    ...area,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false, // never steals focus, so the user's app stays frontmost
    show: false,
    roundedCorners: false,
    webPreferences: webPreferences(),
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform !== 'win32') overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true);
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
  overlay.once('ready-to-show', () => overlay.showInactive());
  // Overlay warnings, errors and [DeskPet] notes go to the log file.
  overlay.webContents.on('console-message', (e, level, message, line, source) => {
    if (level >= 2 || /\[DeskPet\]/.test(message)) log('overlay', message, source ? `(${path.basename(source)}:${line})` : '');
  });
  overlay.webContents.on('render-process-gone', (e, d) => log('overlay crashed:', d.reason));
  app.on('child-process-gone', (e, d) => log('process gone:', d.type, d.reason));
  log('start', app.getVersion(), process.platform, process.arch, `gpu=${JSON.stringify(app.getGPUFeatureStatus())}`, `scale=${screen.getPrimaryDisplay().scaleFactor}`);

  const refit = () => overlay.setBounds(screen.getPrimaryDisplay().workArea);
  screen.on('display-metrics-changed', refit);
  screen.on('display-added', refit);
  screen.on('display-removed', refit);

  // Feed the cursor position to the pets (the overlay gets no mouse events).
  let last = '';
  let lastSent = 0;
  setInterval(() => {
    if (!overlayLive()) return;
    const p = screen.getCursorScreenPoint();
    const b = overlay.getBounds();
    const key = p.x + ',' + p.y;
    if (key === last && Date.now() - lastSent < 1000) return; // resend now and then, for late listeners
    last = key;
    lastSent = Date.now();
    overlay.webContents.send('cursor', { x: p.x - b.x, y: p.y - b.y });
  }, 1000 / CURSOR_HZ);
}

async function openSettings() {
  if (settingsWin) return settingsWin.focus();
  const pid = await windowControl.frontAppPid(); // remember where the user was
  if (pid && pid !== process.pid) lastUserPid = pid;
  settingsWin = new BrowserWindow({
    width: 360,
    height: 720,
    title: 'TomStretch',
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: webPreferences(),
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, '..', 'src', 'popup', 'popup.html'));
  settingsWin.on('closed', () => (settingsWin = null));
}

function buildTrayMenu() {
  if (!tray) return;
  const s = getSettings();
  const paused = s.pausedUntil > Date.now();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Take a break now', click: () => triggerBreak(true) },
      { label: 'Reach for the pointer', click: () => overlay.webContents.send('message', { type: 'SCENE', name: 'wrongMouse' }) },
      { label: `Snooze ${s.snoozeMinutes} min`, click: () => handlers.SNOOZE({}) },
      { type: 'separator' },
      { label: 'Pause breaks for 30 min', click: () => saveSettings({ pausedUntil: Date.now() + 30 * 60000 }) },
      { label: 'Pause breaks for 1 hour', click: () => saveSettings({ pausedUntil: Date.now() + 60 * 60000 }) },
      { label: 'Resume breaks', visible: paused, click: () => saveSettings({ pausedUntil: 0 }) },
      { type: 'separator' },
      { label: 'Show companion', type: 'checkbox', checked: s.enabled, click: (item) => saveSettings({ enabled: item.checked }) },
      { label: 'Climb on things inside windows', type: 'checkbox', checked: s.visionTerrain, click: (item) => saveSettings({ visionTerrain: item.checked }) },
      {
        label: 'Simple art (if a pet is invisible)',
        type: 'checkbox',
        checked: s.simpleArt,
        click: (item) => {
          saveSettings({ simpleArt: item.checked });
          if (overlay) overlay.webContents.reload();
        },
      },
      { label: 'Settings…', click: openSettings },
      { type: 'separator' },
      { label: 'Show log file', click: () => shell.showItemInFolder(logFile()) },
      { label: 'Quit TomStretch', click: () => app.quit() },
    ])
  );
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip('TomStretch');
  buildTrayMenu();
}

// ---- App lifecycle ---------------------------------------------------------

// Test runs get their own profile so they can run beside a normal instance.
if (process.env.DESKPET_SMOKE) app.setPath('userData', path.join(process.env.DESKPET_SMOKE, 'profile'));

// The app was called "Desk Pet" before 0.2.0: bring its settings along once.
function adoptOldSettings() {
  try {
    const dir = app.getPath('userData');
    if (fs.existsSync(path.join(dir, 'store.json'))) return;
    for (const old of ['Desk Pet', 'desk-pet']) {
      const from = path.join(app.getPath('appData'), old);
      if (from === dir || !fs.existsSync(path.join(from, 'store.json'))) continue;
      fs.mkdirSync(dir, { recursive: true });
      for (const f of ['store.json', 'safe-graphics']) if (fs.existsSync(path.join(from, f))) fs.copyFileSync(path.join(from, f), path.join(dir, f));
      return;
    }
  } catch (e) {
    /* start with defaults */
  }
}
if (!process.env.DESKPET_SMOKE) adoptOldSettings();
if (!app.requestSingleInstanceLock()) app.quit();

// Anything that goes wrong in the main process goes to the log, and the user
// gets told once instead of the app vanishing silently.
let errorShown = false;
function fatal(where, err) {
  log(where, err && err.stack ? err.stack : String(err));
  if (errorShown || !app.isReady()) return;
  errorShown = true;
  dialog.showErrorBox('TomStretch ran into a problem', `${err && err.message ? err.message : err}\n\nDetails are in ${logFile()}`);
}
process.on('uncaughtException', (e) => fatal('uncaught exception:', e));
process.on('unhandledRejection', (e) => fatal('unhandled rejection:', e));

// Safe graphics: some setups (virtual machines, older or unusual graphics
// drivers) can't draw a transparent always-on-top window with the GPU. If the
// GPU process dies, restart once with hardware acceleration off, and stay
// that way (delete safe-graphics in the data folder to try the GPU again).
const safeGraphicsFile = () => path.join(app.getPath('userData'), 'safe-graphics');
const safeGraphics = process.argv.includes('--safe-graphics') || fs.existsSync(safeGraphicsFile());
if (safeGraphics) app.disableHardwareAcceleration();
app.on('child-process-gone', (e, d) => {
  if (d.type !== 'GPU' || safeGraphics || d.reason === 'clean-exit') return;
  log('GPU process gone:', d.reason, '- restarting with safe graphics');
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(safeGraphicsFile(), new Date().toISOString());
  } catch (err) {
    /* still restart with the flag below */
  }
  app.relaunch({ args: process.argv.slice(1).concat('--safe-graphics') });
  app.exit(0);
});

app.whenReady().then(() => {
  log('ready', app.getVersion(), process.platform, process.arch, safeGraphics ? 'safe-graphics' : 'gpu');
  if (app.dock) app.dock.hide(); // menu-bar app: no Dock icon
  if (process.platform === 'win32') app.setAppUserModelId('app.deskpet.desktop'); // groups and names it in Windows
  loadStore();
  createOverlay();
  createTray();
  startWindowTracker();
  scanSoon(1500);
  schedule();
  setInterval(tick, 1000);
  if (process.env.DESKPET_SMOKE) require('./smoke')(overlay, () => triggerBreak(true), () => ({ located, minimizedTarget, windows: windowRects.length, vision: vision.permission() }), async () => (await openSettings(), settingsWin));
});

app.on('second-instance', openSettings);
app.on('before-quit', () => (quitting = true)); // before the windows close: timers stand down
app.on('will-quit', () => {
  if (tracker) tracker.kill();
});
app.on('window-all-closed', () => {}); // keep running in the tray
