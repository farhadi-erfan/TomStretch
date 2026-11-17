// Terrain: what the characters can stand on, besides the floor. Fed with
// rectangles by whoever knows the screen (desktop: app windows; extension:
// page elements). Coordinates in: viewport px, y down. Platform heights out:
// px above the bottom of the viewport, matching Character.y.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const MIN_WIDTH = 70; // narrowest ledge worth standing on
  const HEADROOM = 110; // a surface this close to the top of the screen has no room
  const MIN_HEIGHT = 40; // basically the floor

  // Remove [a, b] from a list of [x1, x2] intervals.
  function cut(segments, a, b) {
    const out = [];
    for (const [x1, x2] of segments) {
      if (b <= x1 || a >= x2) out.push([x1, x2]);
      else {
        if (a > x1) out.push([x1, a]);
        if (b < x2) out.push([b, x2]);
      }
    }
    return out;
  }

  class Terrain {
    constructor() {
      this.layers = {}; // name -> {rects, occlusion}
      this.rects = []; // solid rects (windows / elements), front-most first
      this.platforms = [];
      this.walls = []; // vertical edges: {id, x, bottom, top, kind}, heights above the floor
      this.byId = new Map();
      this.listeners = [];
    }

    on(fn) {
      this.listeners.push(fn);
    }

    // Layers:
    //   'windows'  app windows, front-most first (desktop). Tops and sides.
    //   'elements' page elements (extension). Tops and sides.
    //   'ledges'   horizontal edges seen inside windows (desktop vision). Tops only.
    //   'walls'    vertical edges seen inside windows (desktop vision): climbable,
    //              and in the way of anyone walking into them.
    // rects: [{id, left, top, right, bottom}] in viewport px.
    setLayer(name, rects, { occlusion = false } = {}) {
      this.layers[name] = { rects, occlusion };
      this._build();
      for (const fn of this.listeners) fn();
    }

    _build() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const platforms = [];
      const add = (r, kind, a, b, k) => {
        if (b - a >= MIN_WIDTH) platforms.push({ id: r.id + ':' + k, rectId: r.id, rect: r, kind, x1: a, x2: b, top: vh - r.top });
      };
      const usable = (r) => vh - r.top >= MIN_HEIGHT && r.top >= HEADROOM;

      const solid = [];
      for (const [name, kind] of [['windows', 'window'], ['elements', 'element']]) {
        const layer = this.layers[name];
        if (!layer) continue;
        layer.rects.forEach((r, i) => {
          solid.push(r);
          if (!usable(r)) return;
          let segments = [[Math.max(0, r.left), Math.min(vw, r.right)]];
          if (layer.occlusion) {
            // Hide the parts of the top edge covered by rects in front of it.
            for (let j = 0; j < i; j++) {
              const f = layer.rects[j];
              if (f.top < r.top && f.bottom > r.top - 24) segments = cut(segments, f.left, f.right);
            }
          }
          segments.forEach(([a, b], k) => add(r, kind, a, b, k));
        });
      }
      this.rects = solid;
      this.byId = new Map(solid.map((r) => [r.id, r]));

      // Ledges only count inside a window, and not where they merely repeat
      // that window's own top edge.
      const windows = this.layers.windows ? this.layers.windows.rects : null;
      for (const r of (this.layers.ledges || { rects: [] }).rects) {
        if (!usable(r)) continue;
        if (windows) {
          const mid = (r.left + r.right) / 2;
          const host = windows.find((w) => mid >= w.left && mid <= w.right && r.top >= w.top && r.top <= w.bottom);
          if (!host || r.top - host.top < 30) continue;
        }
        add(r, 'ledge', Math.max(0, r.left), Math.min(vw, r.right), 0);
      }
      this.platforms = platforms;

      // Walls: the sides of windows and elements, plus vertical edges seen on
      // screen (tall ones only: short ones are text and icons).
      const walls = [];
      for (const r of solid) {
        const bottom = Math.max(0, vh - r.bottom);
        const top = vh - r.top;
        if (top - bottom < 24) continue;
        walls.push({ id: r.id + ':L', x: r.left, bottom, top, kind: 'side', rect: r });
        walls.push({ id: r.id + ':R', x: r.right, bottom, top, kind: 'side', rect: r });
      }
      for (const r of (this.layers.walls || { rects: [] }).rects) {
        const bottom = Math.max(0, vh - r.bottom);
        const top = vh - r.top;
        if (top - bottom >= 70) walls.push({ id: r.id, x: (r.left + r.right) / 2, bottom, top, kind: 'seen' });
      }
      this.walls = walls;
    }

    // The first wall a body `height` tall, feet at `feet`, would walk into on
    // the way from x0 to x1 (or null). Walls it is standing on top of don't
    // count, nor ones that start above its legs (it ducks under those).
    wallAhead(x0, x1, feet, height) {
      const dir = Math.sign(x1 - x0);
      if (!dir) return null;
      let best = null;
      for (const w of this.walls) {
        const d = (w.x - x0) * dir;
        if (d <= 2 || d > Math.abs(x1 - x0)) continue;
        if (w.top <= feet + 10 || w.bottom >= feet + height * 0.4) continue;
        if (!best || d < (best.x - x0) * dir) best = w;
      }
      return best;
    }

    // A wall standing at the end of a ledge (seen on screen), if any.
    wallUnder(p, side) {
      const x = side < 0 ? p.x1 : p.x2;
      return this.walls.find((w) => w.kind === 'seen' && Math.abs(w.x - x) <= 14 && Math.abs(w.top - p.top) <= 30) || null;
    }

    floor() {
      return { id: 'floor', kind: 'floor', x1: 0, x2: window.innerWidth, top: 0 };
    }

    rect(id) {
      return this.byId.get(id) || null;
    }

    // The front-most rect containing a viewport point.
    rectAt(x, y) {
      return this.rects.find((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) || null;
    }

    // Highest surface under the point (x, height y). {top, platform|null};
    // platform null means the floor.
    below(x, y) {
      let best = { top: 0, platform: null };
      for (const p of this.platforms) {
        if (x >= p.x1 && x <= p.x2 && p.top <= y + 2 && p.top > best.top) best = { top: p.top, platform: p };
      }
      return best;
    }

    // The platform something at (x, y) is standing on, or null (floor / mid-air).
    standingOn(x, y) {
      const b = this.below(x, y);
      return b.platform && Math.abs(b.top - y) <= 4 ? b.platform : null;
    }
  }

  DP.Terrain = Terrain;
})(globalThis);
