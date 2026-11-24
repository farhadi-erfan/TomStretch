// Screen access for the edge finder (vision-edges.js): the macOS Screen
// Recording permission, the capture source for the live stream
// (vision-capture.html), and one-off screenshots as the fallback when the
// stream can't run. Images are analysed in memory and dropped; nothing is
// written to disk or sent anywhere.
const { desktopCapturer, systemPreferences } = require('electron');
const { SCALE, findEdges, toScreen } = require('./vision-edges');

let asked = false;

// 'granted' | 'denied' | ... (always 'granted' off macOS)
function permission() {
  return process.platform === 'darwin' ? systemPreferences.getMediaAccessStatus('screen') : 'granted';
}

// Asks for the permission once (shows the system prompt). True if granted.
function ensurePermission() {
  if (permission() === 'granted') return true;
  if (!asked) {
    asked = true;
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 8, height: 8 } }).catch(() => {}); // triggers the system prompt
  }
  return false;
}

// One-off screenshot of `display` -> edges in screen points, or null when the
// permission is missing. About 0.3 s per call on macOS; the live stream in
// vision-capture.html is the fast path, this is the fallback.
async function scan(display) {
  if (!ensurePermission()) return null;
  const size = { width: Math.round(display.size.width * SCALE), height: Math.round(display.size.height * SCALE) };
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
  const source = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
  if (!source || source.thumbnail.isEmpty()) return { ledges: [], walls: [] };
  const { width: w, height: h } = source.thumbnail.getSize();
  return toScreen(findEdges(source.thumbnail.toBitmap(), w, h), display, w, h);
}

// The capture source id for `display`, for a getUserMedia stream.
async function sourceId(display) {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
  const source = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
  return source ? source.id : null;
}

module.exports = { scan, sourceId, permission, ensurePermission, toScreen, SCALE };
