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

  // Where the pets and their props have been lately. A frame of the screen is
  // a little old by the time its edges arrive (0.1-0.2 s), so a running pet's
  // outline in it sits behind where the pet is now; checking only the pet's
  // current box would let the cat stand on its own old outline.
  const HISTORY_MS = 700;
  const history = []; // [{t, rects}]
  function ourRects(w) {
    const rects = [w.cat, w.mouse].filter((c) => !c.hidden).map((c) => c.el.getBoundingClientRect());
    for (const el of w.stage.root.querySelectorAll('.dp-show')) rects.push(el.getBoundingClientRect());
    return rects;
  }
  setInterval(() => {
    const w = DeskPet.world;
    if (!w) return;
    const now = Date.now();
    history.push({ t: now, rects: ourRects(w) });
    while (history.length && now - history[0].t > HISTORY_MS) history.shift();
  }, 50);

  // An edge counts once it shows up in two frames in a row at about the same
  // place (or was already in use): a one-frame edge is usually something
  // moving, a pet included.
  const lastSeen = {}; // name -> rects of the previous frame
  const same = (p, q) => Math.abs(p.left - q.left) < 6 && Math.abs(p.right - q.right) < 6 && Math.abs(p.top - q.top) < 6 && Math.abs(p.bottom - q.bottom) < 6;

  function setLayer(w, name, rects) {
    if (name === 'windows') return w.terrain.setLayer('windows', rects, { occlusion: true });
    // A screenshot also sees the pets and their props: ignore edges that lie
    // mostly within one of them, now or lately. (The ledge a pet stands on
    // runs well past its feet, so it survives.)
    const ours = ourRects(w);
    for (const h of history) ours.push(...h.rects);
    const inside = (r, b) => {
      const pad = 6;
      const ox = Math.min(r.right, b.right + pad) - Math.max(r.left, b.left - pad);
      const oy = Math.min(r.bottom, b.bottom + pad) - Math.max(r.top, b.top - pad);
      if (ox <= 0 || oy <= 0) return false;
      return name === 'walls' ? oy / Math.max(1, r.bottom - r.top) > 0.7 : ox / Math.max(1, r.right - r.left) > 0.7;
    };
    const fresh = rects.filter((r) => !ours.some((b) => inside(r, b)));
    const before = lastSeen[name] || [];
    const inUse = (w.terrain.layers[name] || { rects: [] }).rects;
    lastSeen[name] = fresh;
    const clean = fresh.filter((r) => before.some((q) => same(r, q)) || inUse.some((q) => same(r, q)));
    if (name === 'ledges') {
      // A pet's own body can hide the edge it stands on from the screenshot:
      // keep that ledge for a few seconds until it is really gone (the window
      // moved, say).
      const now = Date.now();
      for (const c of [w.cat, w.mouse]) {
        if (c.hidden) continue;
        const p = w.terrain.standingOn(c.x, c.y);
        if (!p || p.kind !== 'ledge') continue;
        const still = clean.some((r) => Math.abs(r.top - p.rect.top) < 8 && r.left < c.x && r.right > c.x);
        if (still) p.rect.lostAt = 0;
        else if (now - (p.rect.lostAt || (p.rect.lostAt = now)) < 3000) clean.push(p.rect);
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
