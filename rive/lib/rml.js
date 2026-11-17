// Turns a character description (a tree of pivoted parts with simple shapes,
// plus a table of poses) into Rive Markup (RML) for the Rive CLI to compile.
//
// Coordinates in the description are the same ones the SVG rigs use (viewBox
// units, y down, shapes listed back-to-front). This file handles the
// differences: Rive wants pivots as nested Nodes, radians, front-to-back
// sibling order, and every animated property keyed in every animation
// (a property an animation doesn't key keeps whatever the last one left).
'use strict';

const RAD = Math.PI / 180;
const num = (v) => String(Math.round(v * 10000) / 10000);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Describing a rig
// ---------------------------------------------------------------------------

// A part: a named pivot with children (shapes and other parts), back-to-front.
// opts.opacity: resting opacity (for parts that states switch on and off).
const part = (name, pivot, children, opts = {}) => ({ kind: 'part', name, pivot, children, ...opts });

const ellipse = (cx, cy, rx, ry, paint) => ({ kind: 'ellipse', cx, cy, rx, ry, paint });
const rect = (x, y, w, h, r, paint) => ({ kind: 'rect', x, y, w, h, r, paint });
const poly = (points, paint) => ({ kind: 'poly', points, paint });
// Open stroked paths. Each is [start, ...segments]; a segment is
// {c1, c2, p} (cubic), {q, p} (quadratic) or {p} (line). `paths` may hold several.
const strokes = (paths, paint) => ({ kind: 'strokes', paths, paint });

// paint: {fill, stroke, width, alpha}
function paintRml(paint, pad) {
  const color = (hex, alpha = 1) => Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase() + hex.replace('#', '').toUpperCase();
  let out = '';
  if (paint.fill) out += `${pad}<Fill name="Fill"><SolidColor colorValue="${color(paint.fill, paint.alpha)}" name="Color"/></Fill>\n`;
  if (paint.stroke) {
    out += `${pad}<Stroke thickness="${num(paint.width || 1)}" cap="round" join="round" name="Stroke"><SolidColor colorValue="${color(paint.stroke, paint.alpha)}" name="Color"/></Stroke>\n`;
  }
  return out;
}

// One open path as a PointsPath of detached cubic vertices.
function pathRml(path, origin, pad) {
  const [start, ...segs] = path;
  // Normalise every segment to a cubic.
  const pts = [{ p: start, cin: null, cout: null }];
  let prev = start;
  for (const s of segs) {
    let c1;
    let c2;
    if (s.c1) [c1, c2] = [s.c1, s.c2];
    else if (s.q) {
      c1 = [prev[0] + (2 / 3) * (s.q[0] - prev[0]), prev[1] + (2 / 3) * (s.q[1] - prev[1])];
      c2 = [s.p[0] + (2 / 3) * (s.q[0] - s.p[0]), s.p[1] + (2 / 3) * (s.q[1] - s.p[1])];
    }
    pts[pts.length - 1].cout = c1 || null;
    pts.push({ p: s.p, cin: c2 || null, cout: null });
    prev = s.p;
  }
  const handle = (from, to) => (to ? [Math.atan2(to[1] - from[1], to[0] - from[0]), Math.hypot(to[0] - from[0], to[1] - from[1])] : [0, 0]);
  let out = `${pad}<PointsPath name="Path">\n`;
  for (const v of pts) {
    const x = num(v.p[0] - origin[0]);
    const y = num(v.p[1] - origin[1]);
    if (!v.cin && !v.cout) {
      out += `${pad}    <StraightVertex x="${x}" y="${y}"/>\n`;
    } else {
      const [ir, id] = handle(v.p, v.cin);
      const [or, od] = handle(v.p, v.cout);
      out += `${pad}    <CubicDetachedVertex x="${x}" y="${y}" inRotation="${num(ir)}" inDistance="${num(id)}" outRotation="${num(or)}" outDistance="${num(od)}"/>\n`;
    }
  }
  return out + `${pad}</PointsPath>\n`;
}

// ---------------------------------------------------------------------------
// Emitting the tree
// ---------------------------------------------------------------------------

class Build {
  constructor() {
    this.next = 10;
    this.parts = {}; // name -> {id, rest: {x, y, opacity}}
  }
  id() {
    return `0:${this.next++}`;
  }

  shape(s, origin, pad) {
    const open = (x, y, name) => `${pad}<Shape x="${num(x - origin[0])}" y="${num(y - origin[1])}" name="${name}">\n`;
    if (s.kind === 'ellipse') {
      return open(s.cx, s.cy, 'Ellipse') + `${pad}    <Ellipse originX="0.5" originY="0.5" width="${num(s.rx * 2)}" height="${num(s.ry * 2)}" name="Path"/>\n` + paintRml(s.paint, pad + '    ') + `${pad}</Shape>\n`;
    }
    if (s.kind === 'rect') {
      return (
        open(s.x + s.w / 2, s.y + s.h / 2, 'Rect') +
        `${pad}    <Rectangle originX="0.5" originY="0.5" width="${num(s.w)}" height="${num(s.h)}" cornerRadiusTL="${num(s.r)}" name="Path"/>\n` +
        paintRml(s.paint, pad + '    ') +
        `${pad}</Shape>\n`
      );
    }
    if (s.kind === 'poly') {
      // Winding: positive shoelace area is clockwise on screen (y down).
      let area = 0;
      s.points.forEach(([x, y], i) => {
        const [nx, ny] = s.points[(i + 1) % s.points.length];
        area += x * ny - nx * y;
      });
      let out = `${pad}<Shape name="Poly">\n${pad}    <PointsPath isClosed="true" isClockwise="${area > 0}" name="Path">\n`;
      for (const [x, y] of s.points) out += `${pad}        <StraightVertex x="${num(x - origin[0])}" y="${num(y - origin[1])}"/>\n`;
      return out + `${pad}    </PointsPath>\n` + paintRml(s.paint, pad + '    ') + `${pad}</Shape>\n`;
    }
    if (s.kind === 'strokes') {
      let out = `${pad}<Shape name="Lines">\n`;
      for (const p of s.paths) out += pathRml(p, origin, pad + '    ');
      return out + paintRml(s.paint, pad + '    ') + `${pad}</Shape>\n`;
    }
    throw new Error('unknown shape ' + s.kind);
  }

  // parentPivot: this part's parent's pivot, in drawing coordinates.
  part(p, parentPivot, pad) {
    if (this.parts[p.name]) throw new Error('duplicate part ' + p.name);
    const id = this.id();
    const rest = { x: p.pivot[0] - parentPivot[0], y: p.pivot[1] - parentPivot[1], opacity: p.opacity == null ? 1 : p.opacity };
    this.parts[p.name] = { id, rest };
    let out = `${pad}<Node x="${num(rest.x)}" y="${num(rest.y)}"${rest.opacity !== 1 ? ` opacity="${num(rest.opacity)}"` : ''} name="${esc(p.name)}" id="${id}">\n`;
    // Rive paints the FIRST sibling on top; the description is back-to-front.
    for (const c of [...p.children].reverse()) {
      out += c.kind === 'part' ? this.part(c, p.pivot, pad + '    ') : this.shape(c, p.pivot, pad + '    ');
    }
    return out + `${pad}</Node>\n`;
  }
}

// ---------------------------------------------------------------------------
// Describing motion
// ---------------------------------------------------------------------------

// A channel value is a number (held) or a list of keys [{t, v, ease}], t in 0..1.
// `ease` shapes the segment that STARTS at that key: 'inout' (default), 'linear',
// 'in', 'out', 'hold'.

// n back-and-forth cycles between a (at the start) and b (half-way through each
// cycle). phase 0.5 starts at b instead - the "other leg".
function swing(n, a, b, phase = 0, ease = 'inout') {
  const keys = [];
  const steps = n * 2;
  for (let i = 0; i <= steps; i++) keys.push({ t: i / steps, v: (i + (phase ? 1 : 0)) % 2 === 0 ? a : b, ease });
  return keys;
}
// Explicit keys: [[t, v, ease?], ...]
const keys = (list) => list.map(([t, v, ease]) => ({ t, v, ease: ease || 'inout' }));
// The same keys played n times over. End each cycle a little before t = 1
// (with a 'hold') if the next one should restart from a different value.
function repeat(n, list) {
  const out = [];
  for (let i = 0; i < n; i++) for (const k of list) out.push({ ...k, t: (i + k.t) / n });
  return out;
}

const EASES = { inout: [0.42, 0, 0.58, 1], in: [0.42, 0, 1, 1], out: [0, 0, 0.58, 1] };
const CHANNELS = { rot: 'rotation', x: 'x', y: 'y', sx: 'scaleX', sy: 'scaleY', opacity: 'opacity' };

function channelRml(build, partName, channel, value, frames, pad) {
  const { rest } = build.parts[partName];
  const toRive = (v) => (channel === 'rot' ? v * RAD : channel === 'x' ? rest.x + v : channel === 'y' ? rest.y + v : v);
  const list = typeof value === 'number' ? [{ t: 0, v: value, ease: 'hold' }] : value;
  let out = `${pad}<KeyedProperty property="${CHANNELS[channel]}">\n`;
  let lastFrame = -1;
  for (const k of list) {
    const frame = Math.round(k.t * frames);
    if (frame === lastFrame) continue; // two keys rounded onto one frame
    lastFrame = frame;
    const v = num(toRive(k.v));
    if (k.ease === 'hold' || k.ease === 'linear') {
      out += `${pad}    <KeyFrameDouble value="${v}" frame="${frame}" interpolationType="${k.ease}"/>\n`;
    } else {
      const [x1, y1, x2, y2] = EASES[k.ease];
      out += `${pad}    <KeyFrameDouble value="${v}" frame="${frame}" interpolationType="cubic"><CubicEaseInterpolator x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></KeyFrameDouble>\n`;
    }
  }
  return out + `${pad}</KeyedProperty>\n`;
}

// pose: {partName: {channel: value}}
function animationRml(build, name, id, frames, loop, pose, pad) {
  let out = `${pad}<LinearAnimation loopValue="${loop ? 'loop' : 'oneShot'}" duration="${frames}" name="${esc(name)}" id="${id}">\n`;
  for (const partName of Object.keys(pose)) {
    if (!build.parts[partName]) continue; // this character has no such part
    const channels = pose[partName];
    if (!Object.keys(channels).length) continue;
    out += `${pad}    <KeyedObject objectId="${build.parts[partName].id}">\n`;
    for (const ch of Object.keys(channels)) out += channelRml(build, partName, ch, channels[ch], frames, pad + '        ');
    out += `${pad}    </KeyedObject>\n`;
  }
  return out + `${pad}</LinearAnimation>\n`;
}

module.exports = { part, ellipse, rect, poly, strokes, Build, swing, keys, repeat, animationRml, num, esc };
