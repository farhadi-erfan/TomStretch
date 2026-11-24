// "Basic visual inspection": find long straight edges in a picture of the
// screen, web pages included.
//   - horizontal edges (tops of cards, images, toolbars, panels): ledges to
//     stand on;
//   - vertical edges (sides of those, sidebars, dividers): walls to climb, or
//     to bump into.
// Text is ignored: a line of letters makes long edges too (along its top and
// its baseline). Those have letter strokes right beside them; real edges -
// borders, card tops, image edges - have a plain margin on both sides.
//
// Pure functions, shared by the main process (vision.js, one-off screenshots)
// and the hidden stream window (vision-capture.js), so this file loads as a
// CommonJS module or as a plain script (window.visionEdges).
(function (root) {
  const SCALE = 0.5; // analyse at half resolution
  const EDGE = 14; // luminance step that counts as an edge
  const MIN_LEDGE = 45; // shortest ledge, in analysed pixels (90 screen px)
  const MIN_WALL = 40; // shortest wall (80 screen px)
  const MAX_GAP = 3; // tolerate small breaks in an edge
  const MAX_LEDGES = 60;
  const MAX_WALLS = 40;
  const BAND = 3; // how far either side of an edge to look for text, in analysed pixels
  const BUSY = 0.18; // share of an edge's length with strokes beside it that marks it as text

  // Runs of edge pixels along one axis. `at(i, j)` is the contrast between pixel
  // j of line i and the matching pixel of the previous line.
  function runs(lines, length, minRun, at) {
    const out = [];
    for (let i = 2; i < lines - 1; i++) {
      let start = -1;
      let gap = 0;
      for (let j = 0; j <= length; j++) {
        if (j < length && at(i, j) > EDGE) {
          if (start < 0) start = j;
          gap = 0;
        } else if (start >= 0 && (++gap > MAX_GAP || j === length)) {
          // A gap ends the run - and so does the edge of the image.
          const end = j - gap + 1;
          if (end - start >= minRun) out.push({ line: i, a: start, b: end });
          start = -1;
        }
      }
    }
    return out;
  }

  // Keep the longest; drop ones crowding a kept one (the same edge one line
  // over, or too close for anything to fit between).
  function thin(list, spacing, max) {
    list.sort((p, q) => q.b - q.a - (p.b - p.a));
    const kept = [];
    for (const r of list) {
      if (!kept.some((k) => Math.abs(k.line - r.line) < spacing && Math.min(k.b, r.b) - Math.max(k.a, r.a) > 0)) kept.push(r);
      if (kept.length >= max) break;
    }
    return kept;
  }

  // Pure function: BGRA bitmap (RGBA with `rgba`) -> {ledges: [{x1, x2, y}],
  // walls: [{x, y1, y2}]} in bitmap pixels.
  function findEdges(buf, w, h, rgba) {
    const lum = new Uint8Array(w * h);
    const [kb, kr] = rgba ? [2, 0] : [0, 2];
    for (let i = 0, p = 0; i < lum.length; i++, p += 4) lum[i] = (buf[p + kb] * 29 + buf[p + 1] * 150 + buf[p + kr] * 77) >> 8;
    const horiz = runs(h, w, MIN_LEDGE, (y, x) => Math.abs(lum[y * w + x] - lum[(y - 1) * w + x]));
    const vert = runs(w, h, MIN_WALL, (x, y) => Math.abs(lum[y * w + x] - lum[y * w + x - 1]));

    // How much of a band beside an edge is busy with strokes running across it
    // (letters). For a horizontal edge between rows y-1 and y, the bands are a
    // few rows above and below, and "across" means left-right changes.
    const busy = (lines, from, to, a, b, at) => {
      let hits = 0;
      for (let j = a; j < b; j++) {
        for (let i = from; i < to; i++) {
          if (i > 0 && i < lines && at(i, j) > EDGE) {
            hits++;
            break;
          }
        }
      }
      return hits / Math.max(1, b - a);
    };
    const across = (y, x) => (x > 0 ? Math.abs(lum[y * w + x] - lum[y * w + x - 1]) : 0);
    const down = (x, y) => (y > 0 ? Math.abs(lum[y * w + x] - lum[(y - 1) * w + x]) : 0);
    const notText = (r, lines, at) =>
      Math.max(busy(lines, r.line - BAND, r.line - 1, r.a, r.b, at), busy(lines, r.line + 1, r.line + BAND, r.a, r.b, at)) <= BUSY;
    return {
      ledges: thin(horiz.filter((r) => notText(r, h, across)), 24, MAX_LEDGES).map((r) => ({ x1: r.a, x2: r.b, y: r.line })),
      walls: thin(vert.filter((r) => notText(r, w, down)), 12, MAX_WALLS).map((r) => ({ x: r.line, y1: r.a, y2: r.b })),
    };
  }

  // Bitmap-pixel edges -> screen points on `display`:
  //   {ledges: [{id, left, top, right, bottom}], walls: [...]}
  function toScreen(edges, display, w, h) {
    const sx = display.size.width / w;
    const sy = display.size.height / h;
    const X = (v) => Math.round(display.bounds.x + v * sx);
    const Y = (v) => Math.round(display.bounds.y + v * sy);
    return {
      ledges: edges.ledges.map((r) => ({ id: `ledge:${X(r.x1) >> 3}:${Y(r.y) >> 2}`, left: X(r.x1), top: Y(r.y), right: X(r.x2), bottom: Y(r.y) + 6 })),
      walls: edges.walls.map((r) => ({ id: `wall:${X(r.x) >> 2}:${Y(r.y1) >> 3}`, left: X(r.x), top: Y(r.y1), right: X(r.x) + 2, bottom: Y(r.y2) })),
    };
  }

  const api = { SCALE, findEdges, toScreen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.visionEdges = api;
})(globalThis);
