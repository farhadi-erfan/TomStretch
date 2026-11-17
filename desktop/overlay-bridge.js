// Overlay renderer: feeds system-wide input into the pets' world (pointer,
// idle state, window geometry, seen ledges) and makes the overlay clickable
// only while the pointer is over something of ours that takes clicks.
(function () {
  const bridge = window.deskpetBridge;
  const CLICKABLE = '.dp-timer.dp-show .dp-board, .dp-minbtn.dp-show, .dp-sign.dp-show.dp-clickable .dp-sign-board';
  let interactive = false;
  const pending = {}; // terrain layers that arrived before the world was built

  function world() {
    const w = DeskPet.world;
    if (w) {
      for (const name of Object.keys(pending)) {
        setLayer(w, name, pending[name]);
        delete pending[name];
      }
    }
    return w;
  }

  function setLayer(w, name, rects) {
    if (name === 'windows') return w.terrain.setLayer('windows', rects, { occlusion: true });
    // A screenshot also sees the pets and their props: ignore edges that lie
    // mostly within one of them. (The ledge a pet stands on runs well past its
    // feet, so it survives.)
    const ours = [w.cat, w.mouse].filter((c) => !c.hidden).map((c) => c.el.getBoundingClientRect());
    for (const el of w.stage.root.querySelectorAll('.dp-show')) ours.push(el.getBoundingClientRect());
    const inside = (r, b) => {
      const pad = 6;
      const ox = Math.min(r.right, b.right + pad) - Math.max(r.left, b.left - pad);
      const oy = Math.min(r.bottom, b.bottom + pad) - Math.max(r.top, b.top - pad);
      if (ox <= 0 || oy <= 0) return false;
      return name === 'walls' ? oy / Math.max(1, r.bottom - r.top) > 0.7 : ox / Math.max(1, r.right - r.left) > 0.7;
    };
    const clean = rects.filter((r) => !ours.some((b) => inside(r, b)));
    if (name === 'ledges') {
      // A pet's own body can hide the edge it stands on from the screenshot:
      // keep that ledge until it is really gone (the window moved, say).
      for (const c of [w.cat, w.mouse]) {
        if (c.hidden) continue;
        const p = w.terrain.standingOn(c.x, c.y);
        if (!p || p.kind !== 'ledge') continue;
        const still = clean.some((r) => Math.abs(r.top - p.rect.top) < 8 && r.left < c.x && r.right > c.x);
        if (!still && (p.rect.missed = (p.rect.missed || 0) + 1) < 4) clean.push(p.rect);
      }
    }
    w.terrain.setLayer(name, clean);
  }

  for (const name of ['windows', 'ledges', 'walls']) {
    bridge.on(name, (rects) => {
      const w = DeskPet.world;
      if (w) setLayer(w, name, rects);
      else pending[name] = rects;
    });
  }

  bridge.on('cursor', ({ x, y }) => {
    const w = world();
    if (!w) return;
    w.sensors.injectCursor(x, y);
    const hit = [...w.stage.root.querySelectorAll(CLICKABLE)].some((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
    });
    if (hit !== interactive) {
      interactive = hit;
      bridge.setInteractive(hit);
    }
  });

  bridge.on('presence', ({ away }) => {
    const w = world();
    if (w) w.sensors.setAway(away);
  });

  // Don't wait for the pointer to move before applying early terrain.
  const ready = setInterval(() => world() && clearInterval(ready), 300);

  // Tell the main process when the pets are on screen, so it looks at the
  // screen more often while they need fresh edges.
  let onStage = false;
  setInterval(() => {
    const w = DeskPet.world;
    const now = !!w && (!w.cat.hidden || !w.mouse.hidden);
    if (now !== onStage) {
      onStage = now;
      bridge.setOnStage(now);
    }
  }, 400);
})();
