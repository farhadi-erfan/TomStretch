// The two characters as trees of pivoted parts. Same drawings, coordinates and
// part names as the SVG rigs in src/content/characters (front view: rig, torso,
// head, armL...; side view: the same with an "s" prefix, limbs N(ear)/F(ar)).
// Children are listed back-to-front.
'use strict';
const { part, ellipse, rect, poly, strokes, svg, mask } = require('./rml');
const { climbMask } = require('./edge');
const { MASK_PARK } = require('./poses');

const ink = (color, width, alpha) => ({ stroke: color, width, alpha });

// A hand-drawn character's front view, from design/parts/drawn/draw.py --rive
// (cat-drawn.json) or design/parts/mouse-drawn/draw.py --rive (mouse-drawn.json).
// Parts one character doesn't have (the mouse's tuft and scarf) come out empty.
function drawnFront(D) {
  const J = D.joints;
  // A drawn part's shapes, each with its own paint.
  const art = (name) => (D.parts[name] || []).map((s) => svg(s.paths, { fill: s.fill, stroke: s.stroke, width: s.width }));
  const P = (name, joint, children, opts) => part(name, J[joint], children, opts);
  const hidden = { opacity: 0 };
  const leg = (s, l) =>
    P(`leg${s}`, `leg${s}`, [...art(`thigh-${l}`), P(`shin${s}`, `shin${s}`, art(`shin-${l}`))]);
  const arm = (s, l) =>
    P(`arm${s}`, `arm${s}`, [...art(`upper-arm-${l}`), P(`fore${s}`, `fore${s}`, art(`forearm-${l}`))]);
  const head = P('head', 'head', [
    P('earL', 'earL', art('ear-l')),
    P('earR', 'earR', art('ear-r')),
    ...art('tuft'),
    ...art('head'),
    P('blush', 'blush', art('blush'), hidden),
    P('eyes', 'eyes', [...art('eye-white-l'), ...art('eye-white-r'), P('pupils', 'pupils', [...art('pupil-l'), ...art('pupil-r')])]),
    P('browL', 'browL', art('brow-l')),
    P('browR', 'browR', art('brow-r')),
    ...art('whiskers'),
    P('mSmile', 'mouth', art('mouth-smile')),
    P('mFlat', 'mouth', art('mouth-flat'), hidden),
    P('mWavy', 'mouth', art('mouth-flat'), hidden), // no wavy mouth drawn yet
    P('mOpen', 'mouth', art('mouth-o'), hidden),
    P('mPant', 'mouth', art('mouth-pant'), hidden),
    ...art('nose'),
    P('sweat', 'sweat', art('sweat'), hidden),
  ]);
  // Back to front: tail, torso (head, then arms, inside it), then the
  // legs in front of the torso so the hips turn cleanly (see draw.py).
  return part('front', [0, 0], [
    P('rig', 'rig', [
      P('tail', 'tail', art('tail')),
      P('torso', 'torso', [...art('torso'), head, ...art('scarf'), arm('L', 'l'), arm('R', 'r')]), // arms over the head: raised paws stay in sight
      leg('L', 'l'),
      leg('R', 'r'),
    ]),
  ]);
}

// The side view (facing right; sideFlip mirrors it about the box's centre),
// from the same file. box and isMouse place the climb mask (see edge.js).
function drawnSide(D, box, isMouse) {
  const J = D.joints;
  const art = (name) => (D.parts[name] || []).map((s) => svg(s.paths, { fill: s.fill, stroke: s.stroke, width: s.width }));
  const P = (name, joint, children, opts) => part(name, J[joint], children, opts);
  const hidden = { opacity: 0 };
  const leg = (s, l) => P(`sLeg${s}`, `sLeg${s}`, [...art(`s-thigh-${l}`), P(`sShin${s}`, `sShin${s}`, art(`s-shin-${l}`))]);
  const arm = (s, l, opts) => P(`sArm${s}`, `sArm${s}`, [...art(`s-arm-${l}`), P(`sFore${s}`, `sFore${s}`, art(`s-fore-${l}`))], opts);
  // The far arm is clipped at the wall's edge while climbing. The mask sits
  // MASK_PARK units to the right (covering the whole arm) and the climb pose
  // moves it into place (sEdge in poses.js).
  const edge = part('sEdge', J.sTorso, [mask('climbEdge', climbMask(D, box[0], isMouse).map(([x, y]) => [x + MASK_PARK, y]))]);
  const head = P('sHead', 'sHead', [
    ...art('s-ear-f'),
    ...art('s-tuft'),
    ...art('s-head'),
    ...art('s-ear-n'),
    P('sEyes', 'sEyes', [...art('s-eye'), P('sPupil', 'sPupil', art('s-pupil'))]),
    ...art('s-brow'),
    ...art('s-whiskers'),
    P('smSmile', 'sMouth', art('s-mouth-smile')),
    P('smFlat', 'sMouth', art('s-mouth-flat'), hidden),
    P('smOpen', 'sMouth', art('s-mouth-open'), hidden),
    ...art('s-nose'),
  ]);
  // Far limbs behind the body; the near leg in front of it (its hip cap hides
  // the torso's hip, as in the front view) and the near arm on top.
  return part('side', [0, 0], [
    part('sideFlip', [box[0] / 2, 0], [
      P('sRig', 'sRig', [
        P('sTail', 'sTail', art('s-tail')),
        leg('F', 'f'),
        P('sTorso', 'sTorso', [edge, arm('F', 'f', { clipBy: 'climbEdge' }), ...art('s-torso'), head, ...art('s-scarf'), arm('N', 'n')]),
        leg('N', 'n'),
      ]),
    ]),
  ], hidden);
}

const drawn = (D, box, isMouse) => [drawnFront(D), drawnSide(D.side, box, isMouse)];

function cat() {
  const FUR = '#f2994a';
  const DARK = '#d97b2b';
  const CREAM = '#fff1dc';
  const CREAM2 = '#f3dfc2';
  const INK = '#3b2a20';
  const paw = (fill) => ({ fill, stroke: DARK, width: 1 });

  const frontLeg = (name, x, footX) =>
    part(`leg${name}`, [x + 5, 106], [
      rect(x, 104, 10, 16, 5, { fill: FUR }),
      part(`shin${name}`, [x + 5, 118], [rect(x, 116, 10, 15, 5, { fill: FUR }), ellipse(footX, 132, 9, 4.5, paw(CREAM))]),
    ]);
  const frontArm = (name, x) =>
    part(`arm${name}`, [x + 4.5, 77], [
      rect(x, 74, 9, 18, 4.5, { fill: FUR }),
      part(`fore${name}`, [x + 4.5, 90], [rect(x, 87, 9, 17, 4.5, { fill: FUR }), ellipse(x + 4.5, 106, 6, 6, paw(CREAM))]),
    ]);

  const front = part('front', [0, 0], [
    part('rig', [60, 136], [
      part('tail', [72, 106], [strokes([[[72, 106], { c1: [98, 108], c2: [104, 88], p: [95, 72] }]], ink(DARK, 7))]),
      frontLeg('L', 45, 48),
      frontLeg('R', 65, 72),
      part('torso', [60, 110], [
        ellipse(60, 90, 19, 23, { fill: FUR }),
        ellipse(60, 94, 12, 15, { fill: CREAM }),
        frontArm('L', 37),
        frontArm('R', 74),
        part('head', [60, 64], [
          poly([[40, 36], [37, 12], [57, 27]], { fill: FUR }),
          poly([[43, 31], [42, 19], [52, 27]], { fill: '#f7b7a3' }),
          poly([[80, 36], [83, 12], [63, 27]], { fill: FUR }),
          poly([[77, 31], [78, 19], [68, 27]], { fill: '#f7b7a3' }),
          ellipse(60, 44, 25, 21, { fill: FUR }),
          strokes([[[60, 24], { p: [60, 31] }], [[53, 25], { p: [54, 31] }], [[67, 25], { p: [66, 31] }]], ink(DARK, 2.5)),
          ellipse(60, 55, 13, 8.5, { fill: CREAM }),
          part('blush', [60, 52], [ellipse(40, 52, 5, 3, { fill: '#ff7d7d' }), ellipse(80, 52, 5, 3, { fill: '#ff7d7d' })], { opacity: 0 }),
          part('eyes', [60, 42], [
            ellipse(50, 41, 6.5, 8, { fill: '#ffffff' }),
            ellipse(70, 41, 6.5, 8, { fill: '#ffffff' }),
            part('pupils', [60, 42], [ellipse(50, 42, 3.3, 3.3, { fill: INK }), ellipse(70, 42, 3.3, 3.3, { fill: INK })]),
          ]),
          part('browL', [50, 30], [strokes([[[44, 30], { q: [50, 27], p: [56, 30] }]], ink(INK, 2))]),
          part('browR', [70, 30], [strokes([[[64, 30], { q: [70, 27], p: [76, 30] }]], ink(INK, 2))]),
          poly([[57, 50], [63, 50], [60, 53.5]], { fill: '#d9534f' }),
          strokes([[[36, 52], { p: [26, 52] }], [[36, 56], { p: [27, 59] }], [[84, 52], { p: [94, 52] }], [[84, 56], { p: [93, 59] }]], ink(INK, 1, 0.55)),
          part('mSmile', [60, 58], [strokes([[[53, 56.5], { q: [60, 62.5], p: [67, 56.5] }]], ink(INK, 2))]),
          part('mFlat', [60, 58], [strokes([[[55, 58.5], { p: [65, 58.5] }]], ink(INK, 2))], { opacity: 0 }),
          part('mWavy', [60, 58], [
            strokes([[[52, 58.5], { q: [54, 55.5], p: [56, 58.5] }, { q: [58, 61.5], p: [60, 58.5] }, { q: [62, 55.5], p: [64, 58.5] }, { q: [66, 61.5], p: [68, 58.5] }]], ink(INK, 2)),
          ], { opacity: 0 }),
          part('mOpen', [60, 59], [ellipse(60, 59, 5, 5.5, { fill: '#7a2e2e' })], { opacity: 0 }),
          part('mPant', [60, 59], [ellipse(60, 58.5, 6, 4.5, { fill: '#7a2e2e' }), ellipse(60, 63, 3.5, 4.5, { fill: '#ff8f9c' })], { opacity: 0 }),
          part('sweat', [90, 30], [ellipse(90, 31, 3, 4.5, { fill: '#7cc7ff' })], { opacity: 0 }),
        ]),
      ]),
    ]),
  ]);

  const sideLeg = (name, fill, foot) =>
    part(`sLeg${name}`, [57, 104], [
      rect(52, 102, 10, 17, 5, { fill }),
      part(`sShin${name}`, [57, 117], [rect(52, 115, 10, 16, 5, { fill }), ellipse(62, 132, 10, 4.5, paw(foot))]),
    ]);
  const sideArm = (name, fill, hand) =>
    part(`sArm${name}`, [59.5, 77], [
      rect(55, 74, 9, 18, 4.5, { fill }),
      part(`sFore${name}`, [59.5, 90], [rect(55, 87, 9, 17, 4.5, { fill }), ellipse(59.5, 106, 6, 6, paw(hand))]),
    ]);

  // Drawn facing right; "sideFlip" sits on the centre line so scaleX -1 mirrors it.
  const side = part('side', [0, 0], [
    part('sideFlip', [60, 0], [
      part('sRig', [58, 136], [
        part('sTail', [48, 106], [strokes([[[48, 106], { c1: [24, 108], c2: [16, 90], p: [24, 72] }]], ink(DARK, 7))]),
        sideLeg('F', DARK, CREAM2),
        part('sTorso', [58, 108], [
          sideArm('F', DARK, CREAM2),
          ellipse(58, 89, 16, 23, { fill: FUR }),
          ellipse(65, 93, 8, 14, { fill: CREAM }),
          part('sHead', [62, 64], [
            poly([[64, 30], [72, 9], [82, 30]], { fill: DARK }),
            poly([[48, 34], [52, 10], [68, 27]], { fill: FUR }),
            poly([[52, 30], [54, 18], [63, 27]], { fill: '#f7b7a3' }),
            ellipse(64, 44, 23, 20, { fill: FUR }),
            strokes([[[58, 25], { p: [57, 32] }], [[65, 24], { p: [65, 31] }], [[72, 26], { p: [73, 32] }]], ink(DARK, 2.5)),
            ellipse(82, 53, 11, 7.5, { fill: CREAM }),
            poly([[90, 47], [95, 47], [93, 51]], { fill: '#d9534f' }),
            part('sEyes', [73, 40], [ellipse(73, 40, 6, 8, { fill: '#ffffff' }), part('sPupil', [75, 41], [ellipse(75, 41, 3.3, 3.3, { fill: INK })])]),
            strokes([[[66, 29], { q: [73, 26], p: [80, 30] }]], ink(INK, 2)),
            strokes([[[87, 54], { p: [99, 52] }], [[87, 57], { p: [98, 60] }]], ink(INK, 1, 0.55)),
            part('smSmile', [86, 58], [strokes([[[80, 58], { q: [86, 62], p: [91, 57] }]], ink(INK, 2))]),
            part('smFlat', [86, 59], [strokes([[[81, 59], { p: [90, 59] }]], ink(INK, 2))], { opacity: 0 }),
            part('smOpen', [86, 59], [ellipse(86, 59, 5, 4, { fill: '#7a2e2e' })], { opacity: 0 }),
          ]),
          sideArm('N', FUR, CREAM),
        ]),
        sideLeg('N', FUR, CREAM),
      ]),
    ]),
  ], { opacity: 0 });

  return { name: 'cat', artboard: 'Cat', box: [120, 140], pupil: 2.6, parts: process.env.OLD_CAT ? [front, side] : drawn(require('./cat-drawn.json'), [120, 140], false) };
}

function mouse() {
  const FUR = '#a9afbd';
  const DARK = '#878d9c';
  const BELLY = '#eef0f5';
  const PINK = '#f4a9b4';
  const PINK2 = '#dc97a2';
  const INK = '#2f2a33';

  const front = part('front', [0, 0], [
    part('rig', [40, 93], [
      part('tail', [46, 78], [strokes([[[46, 78], { c1: [68, 82], c2: [72, 64], p: [63, 54] }]], ink(PINK, 3))]),
      part('legL', [33.5, 76], [rect(30, 74, 7, 15, 3.5, { fill: FUR }), ellipse(32, 90, 7, 3.5, { fill: PINK })]),
      part('legR', [46.5, 76], [rect(43, 74, 7, 15, 3.5, { fill: FUR }), ellipse(48, 90, 7, 3.5, { fill: PINK })]),
      part('torso', [40, 80], [
        ellipse(40, 66, 13, 15, { fill: FUR }),
        ellipse(40, 69, 8, 10, { fill: BELLY }),
        part('armL', [26, 58], [rect(23, 56, 6, 16, 3, { fill: FUR }), ellipse(26, 73, 4, 4, { fill: PINK })]),
        part('armR', [54, 58], [rect(51, 56, 6, 16, 3, { fill: FUR }), ellipse(54, 73, 4, 4, { fill: PINK })]),
        part('head', [40, 50], [
          ellipse(21, 18, 13, 13, { fill: DARK }),
          ellipse(21, 18, 8, 8, { fill: PINK }),
          ellipse(59, 18, 13, 13, { fill: DARK }),
          ellipse(59, 18, 8, 8, { fill: PINK }),
          ellipse(40, 34, 18, 16, { fill: FUR }),
          ellipse(40, 42, 9, 6, { fill: BELLY }),
          part('eyes', [40, 32], [
            ellipse(33, 31, 4.5, 6, { fill: '#ffffff' }),
            ellipse(47, 31, 4.5, 6, { fill: '#ffffff' }),
            part('pupils', [40, 32], [ellipse(33, 32, 2.4, 2.4, { fill: INK }), ellipse(47, 32, 2.4, 2.4, { fill: INK })]),
          ]),
          part('browL', [33, 23], [strokes([[[29, 23], { q: [33, 21], p: [37, 23] }]], ink(INK, 1.6))]),
          part('browR', [47, 23], [strokes([[[43, 23], { q: [47, 21], p: [51, 23] }]], ink(INK, 1.6))]),
          ellipse(40, 39.5, 2.4, 2.4, { fill: '#d9536a' }),
          strokes([[[30, 42], { p: [21, 42] }], [[50, 42], { p: [59, 42] }]], ink(INK, 0.8, 0.5)),
          part('mSmile', [40, 45], [strokes([[[35, 43.5], { q: [40, 48], p: [45, 43.5] }]], ink(INK, 1.6))]),
          part('mFlat', [40, 45], [strokes([[[36, 45], { p: [44, 45] }]], ink(INK, 1.6))], { opacity: 0 }),
          part('mOpen', [40, 45.5], [ellipse(40, 45.5, 3.6, 4, { fill: '#7a2e2e' })], { opacity: 0 }),
          part('mPant', [40, 45], [ellipse(40, 45, 4, 3, { fill: '#7a2e2e' }), ellipse(40, 48, 2.4, 3.2, { fill: '#ff8f9c' })], { opacity: 0 }),
        ]),
      ]),
    ]),
  ]);

  const side = part('side', [0, 0], [
    part('sideFlip', [40, 0], [
      part('sRig', [40, 93], [
        part('sTail', [34, 78], [strokes([[[34, 78], { c1: [14, 82], c2: [10, 64], p: [18, 54] }]], ink(PINK, 3))]),
        part('sLegF', [39.5, 76], [rect(36, 74, 7, 15, 3.5, { fill: DARK }), ellipse(43, 90, 7, 3.5, { fill: PINK2 })]),
        part('sTorso', [40, 80], [
          part('sArmF', [42, 58], [rect(39, 56, 6, 16, 3, { fill: DARK }), ellipse(42, 73, 4, 4, { fill: PINK2 })]),
          ellipse(39, 66, 12, 15, { fill: FUR }),
          ellipse(44, 69, 6, 10, { fill: BELLY }),
          part('sHead', [42, 50], [
            ellipse(50, 16, 12, 12, { fill: DARK }),
            ellipse(30, 17, 13, 13, { fill: DARK }),
            ellipse(30, 17, 8, 8, { fill: PINK }),
            ellipse(42, 34, 17, 15, { fill: FUR }),
            ellipse(57, 40, 9, 6, { fill: BELLY }),
            ellipse(65, 38, 2.6, 2.6, { fill: '#d9536a' }),
            part('sEyes', [49, 30], [ellipse(49, 30, 4.5, 6, { fill: '#ffffff' }), part('sPupil', [50.5, 31], [ellipse(50.5, 31, 2.4, 2.4, { fill: INK })])]),
            strokes([[[44, 22], { q: [49, 20], p: [54, 23] }]], ink(INK, 1.6)),
            strokes([[[59, 42], { p: [69, 41] }], [[59, 44], { p: [68, 47] }]], ink(INK, 0.8, 0.5)),
            part('smSmile', [60, 45], [strokes([[[55, 45], { q: [60, 48], p: [64, 44] }]], ink(INK, 1.6))]),
            part('smFlat', [60, 46], [strokes([[[56, 46], { p: [63, 46] }]], ink(INK, 1.6))], { opacity: 0 }),
            part('smOpen', [59, 45.5], [ellipse(59, 45.5, 3.5, 3, { fill: '#7a2e2e' })], { opacity: 0 }),
          ]),
          part('sArmN', [42, 58], [rect(39, 56, 6, 16, 3, { fill: FUR }), ellipse(42, 73, 4, 4, { fill: PINK })]),
        ]),
        part('sLegN', [39.5, 76], [rect(36, 74, 7, 15, 3.5, { fill: FUR }), ellipse(43, 90, 7, 3.5, { fill: PINK })]),
      ]),
    ]),
  ], { opacity: 0 });

  return { name: 'mouse', artboard: 'Mouse', box: [80, 96], pupil: 1.8, parts: process.env.OLD_MOUSE ? [front, side] : drawn(require('./mouse-drawn.json'), [80, 96], true) };
}

module.exports = { cat, mouse };
