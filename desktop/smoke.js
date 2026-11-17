// Dev aids, enabled by environment variables (see README):
//   DESKPET_SMOKE=/dir  boot, run a break up to the exercise, save overlay
//                       screenshots, print state, quit. Never minimizes anything.
//   DESKPET_LIVE=1      also send the cat to the real minimize button: minimizes
//                       your front window, ends the break, checks it came back.
const { app } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function smoke(overlay, startBreak, probe, settingsWindow) {
  const dir = process.env.DESKPET_SMOKE;
  const live = !!process.env.DESKPET_LIVE;
  const wc = overlay.webContents;
  wc.on('console-message', (e, level, message) => console.log('[renderer]', message));
  const shot = async (name) => fs.writeFileSync(path.join(dir, name), (await wc.capturePage()).toPNG());
  const js = (code) => wc.executeJavaScript(code);
  const state = () =>
    js(`(() => { const w = DeskPet.world; if (!w) return 'no world'; const c = w.cat; return JSON.stringify({ routine: w.director.name, cat: c.hidden ? '-' : c.state, x: Math.round(c.x), y: Math.round(c.y), zoom: +c.zoom.toFixed(1), view: c.el.dataset.view, renderer: c.renderer.constructor.name, riveRuntime: typeof rive !== 'undefined', sign: c.signEl.classList.contains('dp-show') ? c.boardEl.textContent : null, platforms: w.terrain.platforms.reduce((n, p) => (n[p.kind] = (n[p.kind] || 0) + 1, n), {}) }); })()`);
  // Where the app's normal windows are on screen right now (independent of
  // what the accessibility API claims).
  const JXA = "ObjC.import('CoreGraphics'); function run(a){ const l = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0))); return l.filter(w => w.kCGWindowOwnerPID == a[0] && w.kCGWindowLayer === 0).map(w => JSON.stringify(w.kCGWindowBounds)).join(' ') || 'none on screen'; }";
  const onScreen = (pid) =>
    new Promise((resolve) => execFile('osascript', ['-l', 'JavaScript', '-e', JXA, String(pid)], { timeout: 6000 }, (err, out, stderr) => resolve(err ? 'query failed: ' + (stderr || err.message).trim() : out.trim())));
  const at = (ms, fn) => setTimeout(() => fn().catch((e) => console.log('[smoke] error', e)), ms);
  const log = async (label) => console.log(`[smoke] ${label}`, await state(), JSON.stringify(probe()));

  // DESKPET_SMOKE_POPUP_EVAL=/path/to/script.js: run this in the settings
  // window first (it opens it), print the result, then go on.
  const popupEval = async () => {
    if (!process.env.DESKPET_SMOKE_POPUP_EVAL) return;
    // Pets off stage while the settings change (stop hides them).
    await js(`(() => { const b = DeskPet.world.behaviors; b.stop(); b.start(); clearTimeout(b.visitTimer); })()`);
    const win = await settingsWindow();
    await new Promise((r) => (win.webContents.isLoading() ? win.webContents.once('did-finish-load', r) : r()));
    await new Promise((r) => setTimeout(r, 500));
    console.log('[popup]', await win.webContents.executeJavaScript(fs.readFileSync(process.env.DESKPET_SMOKE_POPUP_EVAL, 'utf8')));
  };

  // DESKPET_SMOKE_EVAL=/path/to/script.js: instead of the break run, evaluate
  // that script in the overlay (it should return a promise of a string),
  // print the result, save eval.png and quit.
  if (process.env.DESKPET_SMOKE_EVAL) {
    at(3000, async () => {
      await js(`clearTimeout(DeskPet.world.behaviors.visitTimer)`);
      await popupEval();
      console.log('[eval]', await js(fs.readFileSync(process.env.DESKPET_SMOKE_EVAL, 'utf8')));
      await shot('eval.png');
      app.quit();
    });
    return;
  }

  at(3000, async () => {
    await js(`clearTimeout(DeskPet.world.behaviors.visitTimer)`);
    await log('boot');
    startBreak();
  });
  // The break: arrive, ask, (pretend to) minimize, two exercises, done.
  // Never minimizes anything unless DESKPET_LIVE is set.
  at(3100, () => js(`(() => { const b = DeskPet.world.breaks, o = b.onAction.bind(b); window.__acts = []; b.onAction = (a) => { window.__acts.push(a + '@' + Math.round(performance.now())); o(a); }; })()`));
  let target = null;
  const choiceUp = () => js(`DeskPet.world.cat.signEl.classList.contains('dp-choices')`);
  const waitFor = async (fn, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 250))) if (await fn()) return true;
    return false;
  };
  at(3300, async () => {
    const p = probe();
    if (live && p.located) console.log('[live] windows before:', await onScreen(p.located.pid));
    const asked = await waitFor(choiceUp, 25000);
    await shot('choice.png');
    await log(asked ? 'asking' : 'never asked');
    await js(`DeskPet.world.breaks.onAction('start')`);
    await new Promise((r) => setTimeout(r, 2500));
    await log('after press');
    target = probe().minimizedTarget;
    if (live && target) console.log('[live] windows after press:', await onScreen(target.pid));
    await waitFor(() => js(`DeskPet.world.breaks.timerEl.classList.contains('dp-show')`), 15000);
    await new Promise((r) => setTimeout(r, 1500));
    await shot('exercise.png');
    await log('exercise 1');
    await new Promise((r) => setTimeout(r, 23500));
    await shot('exercise2.png');
    await log('exercise 2');
    await js(`DeskPet.world.breaks.onAction('done')`);
    await new Promise((r) => setTimeout(r, 2500));
    await log('after done');
    if (live && target) console.log('[live] windows after restore:', await onScreen(target.pid));
    app.quit();
  });
};
