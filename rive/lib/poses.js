// The pose table: what every part does in every animation state. A port of
// src/content/animation/rig.css.js - same angles, same timings - written as
// data. Angles in degrees (positive = clockwise on screen), offsets in drawing
// units from the part's resting place, 60 frames a second.
//
// Parts a character doesn't have (the mouse has no fore/shin) are skipped.
'use strict';
const { swing, keys, repeat } = require('./rml');

// Mirror a pose onto the left (s = 1) and right (s = -1) limb.
const pair = (name, fn) => ({ [`${name}L`]: fn(1), [`${name}R`]: fn(-1) });
// Near and far limb of the side view; the far one runs half a cycle behind.
const stride = (name, fn) => ({ [`${name}N`]: fn(0), [`${name}F`]: fn(0.5) });
const merge = (...objs) => {
  const out = {};
  for (const o of objs) for (const k of Object.keys(o)) out[k] = { ...(out[k] || {}), ...o[k] };
  return out;
};

// Always-on life for front-view states long enough to hold it.
function ambient(frames) {
  const breaths = Math.max(1, Math.round(frames / 156));
  return {
    torso: { sy: swing(breaths, 1, 1.035) },
    tail: { rot: swing(Math.max(1, Math.round(frames / 180)), -8, 12) },
    eyes: { sy: keys([[0, 1, 'hold'], [0.93, 1], [0.96, 0.1], [1, 1]]) },
  };
}

function poses(isMouse) {
  const P = {};
  // def(name, frames, loop, parts, {life}) - life: add breathing/blinking.
  const def = (name, frames, loop, parts, life = false) => {
    P[name] = { frames, loop, parts: life ? merge(ambient(frames), parts) : parts };
  };

  def('idle', 252, true, {}, true);

  // ---- travel (side view) ----
  def('walk', 50, true, merge(
    { sRig: { y: swing(2, 0, -4) }, sTorso: { rot: 5 }, sTail: { rot: swing(1, -8, 12) } },
    stride('sLeg', (ph) => ({ rot: swing(1, 24, -24, ph) })),
    stride('sShin', (ph) => ({ rot: swing(1, 30, 3, ph) })),
    stride('sArm', (ph) => ({ rot: swing(1, -22, 22, ph) }))
  ));
  def('run', 20, true, merge(
    { sRig: { y: swing(2, 0, -4) }, sTorso: { rot: 19 }, sHead: { rot: -9 }, sTail: { rot: -38 } },
    stride('sLeg', (ph) => ({ rot: swing(1, 52, -52, ph, 'linear') })),
    stride('sShin', (ph) => ({ rot: swing(1, 75, 3, ph, 'linear') })),
    stride('sArm', (ph) => ({ rot: swing(1, -70, 46, ph, 'linear') })),
    stride('sFore', () => ({ rot: -80 }))
  ));
  def('crouch', 20, true, merge(
    { sRig: { sx: 1.12, sy: 0.76, rot: swing(2, -2.5, 2.5, 0, 'linear') }, sTorso: { rot: 24 }, sHead: { rot: -14 }, sTail: { rot: swing(2, -8, 12) } },
    stride('sArm', () => ({ rot: 40 })),
    stride('sLeg', () => ({ rot: -14 })),
    stride('sShin', () => ({ rot: 30 }))
  ));
  def('pounce', 60, true, {
    sRig: { sx: 1.1, sy: 0.93 }, sTorso: { rot: 30 }, sHead: { rot: -16 }, sTail: { rot: -32 },
    sArmN: { rot: -128 }, sArmF: { rot: -108 }, sLegN: { rot: 48 }, sLegF: { rot: 68 }, sShinN: { rot: 16 }, sShinF: { rot: 16 },
  });
  def('climb', 30, true, merge(
    { sRig: { x: 9 }, sTorso: { rot: -4 }, sHead: { rot: -18 }, sTail: { rot: swing(1, -8, 12) } },
    { sArmF: { rot: swing(1, -158, -104) }, sArmN: { rot: swing(1, -158, -104, 0.5) } },
    { sLegF: { rot: swing(1, -48, 6) }, sLegN: { rot: swing(1, -48, 6, 0.5) } },
    { sShinF: { rot: swing(1, 72, 8) }, sShinN: { rot: swing(1, 72, 8, 0.5) } },
    stride('sFore', () => ({ rot: -18 }))
  ));

  // ---- acting (front view) ----
  def('land', 30, false, merge(
    { rig: { sx: keys([[0, 1.28, 'out'], [0.45, 0.93], [0.75, 1.04], [1, 1]]), sy: keys([[0, 0.62, 'out'], [0.45, 1.1], [0.75, 0.97], [1, 1]]) } },
    pair('arm', (s) => ({ rot: s * 40 }))
  ));
  def('confused', 168, true, {
    head: { rot: 12 }, armR: { rot: -150 }, foreR: { rot: swing(8, -55, -85) },
    ...(isMouse ? { armR: { rot: swing(8, -140, -160) } } : {}),
    browL: { y: -3 }, browR: { rot: -12 },
  }, true);
  def('embarrassed', 216, true, merge(
    { head: { y: 3, rot: -6 }, blush: { opacity: 0.85 }, legR: { rot: swing(4, -4, -16) } },
    pair('arm', (s) => ({ rot: s * -10 })),
    pair('brow', (s) => ({ rot: s * -14 }))
  ), true);
  def('look', 264, true, merge({ head: { rot: swing(2, -4, 5) } }, pair('brow', () => ({ y: -2 }))), true);
  def('startled', 33, false, merge(
    {
      rig: {
        y: keys([[0, 0, 'out'], [0.3, -26, 'in'], [0.62, 0], [1, 0]]),
        sx: keys([[0, 1.12], [0.3, 0.88], [0.62, 1.1], [1, 1]]),
        sy: keys([[0, 0.82], [0.3, 1.22], [0.62, 0.88], [1, 1]]),
      },
      eyes: { sx: 1.22, sy: 1.22 }, tail: { rot: -32 },
    },
    pair('arm', (s) => ({ rot: s * 110 })),
    pair('brow', () => ({ y: -4 }))
  ));
  def('tired', 168, true, merge(
    {
      torso: { rot: 5, sy: swing(6, 0.93, 0.98) }, head: { y: 4, rot: 4 }, eyes: { sy: 0.55 }, tail: { rot: 20 },
      sweat: {
        y: repeat(3, keys([[0, -3, 'in'], [0.96, 12, 'hold']])),
        opacity: repeat(3, keys([[0, 0, 'linear'], [0.3, 1, 'linear'], [0.96, 0, 'hold']])),
      },
    },
    pair('arm', (s) => ({ rot: s * -4 })),
    pair('brow', (s) => ({ rot: s * -14 }))
  ));
  def('sleep', 228, true, { rig: { sx: 1.06, sy: 0.88 }, torso: { sy: swing(1, 1, 1.035) }, head: { y: 4, rot: 9 }, eyes: { sy: 0.08 } });
  def('wave', 240, true, {
    rig: { y: swing(5, 0, -3) },
    ...(isMouse ? { armR: { rot: swing(10, -125, -165) } } : { armR: { rot: -150 }, foreR: { rot: swing(10, 35, -20) } }),
  }, true);
  def('cheer', 25, true, merge(
    { rig: { y: swing(1, 0, -9), sx: swing(1, 1.06, 0.96), sy: swing(1, 0.92, 1.06) } },
    pair('arm', (s) => ({ rot: s * 160 }))
  ));
  def('press', 18, true, merge(
    { rig: { y: swing(1, 0, -7), sx: swing(1, 1.12, 0.95), sy: swing(1, 0.84, 1.1) } },
    pair('arm', (s) => ({ rot: s * 120 }))
  ));
  def('taunt', 60, true, merge(
    { rig: { rot: swing(2, -6, 6) } },
    pair('arm', (s) => ({ rot: swing(5, s * 138, s * 164) })),
    pair('fore', (s) => ({ rot: s * 40 }))
  ));
  def('laugh', 20, true, merge(
    { rig: { y: swing(2, 1.5, -1.5, 0, 'linear'), rot: swing(2, -3, 3, 0, 'linear') }, eyes: { sy: 0.15 } },
    pair('arm', (s) => ({ rot: s * -24 }))
  ));
  def('fall', 40, true, {
    rig: { sx: 0.9, sy: 1.14 }, eyes: { sx: 1.25, sy: 1.25 }, tail: { rot: -40 },
    armL: { rot: swing(5, 165, 120, 0, 'linear') }, armR: { rot: swing(5, -165, -120, 0.5, 'linear') },
    legL: { rot: swing(4, 28, -8, 0, 'linear') }, legR: { rot: swing(4, -28, 8, 0.5, 'linear') },
    browL: { y: -4 }, browR: { y: -4 },
  });
  def('hang', 66, true, merge(
    { eyes: { sx: 1.15, sy: 1.15 }, tail: { rot: 24 }, legL: { rot: swing(1, -5, 5) }, legR: { rot: swing(1, -5, 5, 0.5) } },
    pair('arm', (s) => ({ rot: s * 18 })),
    pair('brow', () => ({ y: -3 }))
  ));
  def('scared', 16, true, merge(
    { rig: { x: swing(4, -1.6, 1.6, 0, 'linear') }, torso: { sy: 0.94 }, eyes: { sx: 1.2, sy: 1.2 }, tail: { rot: -36 } },
    pair('arm', (s) => ({ rot: s * 150 })),
    pair('fore', (s) => ({ rot: s * 75 })),
    pair('leg', (s) => ({ rot: swing(2, s * -9, s * 3, 0, 'linear') })),
    pair('brow', (s) => ({ y: -3, rot: s * -16 }))
  ));
  def('grab', 42, true, merge(
    { eyes: { sy: 0.18 }, tail: { rot: swing(1, -8, 12) }, legL: { rot: swing(1, -5, 5) }, legR: { rot: swing(1, -5, 5, 0.5) } },
    pair('arm', (s) => ({ rot: s * (isMouse ? 165 : 140) })),
    pair('fore', (s) => ({ rot: s * 55 }))
  ));
  def('splat', 30, false, merge(
    { rig: { sx: keys([[0, 1.14, 'out'], [0.45, 0.95], [1, 1]]), sy: keys([[0, 0.84, 'out'], [0.45, 1.05], [1, 1]]) }, eyes: { sx: 1.1, sy: 1.1 } },
    pair('arm', (s) => ({ rot: s * 128 })),
    pair('fore', (s) => ({ rot: s * 30 })),
    pair('brow', () => ({ y: -2 }))
  ));

  // ---- exercises ----
  def('ex-overhead', 240, true, merge(
    { rig: { sx: keys([[0, 1], [0.35, 0.97], [0.72, 0.97], [1, 1]]), sy: keys([[0, 1], [0.35, 1.06], [0.72, 1.06], [1, 1]]) } },
    pair('arm', (s) => ({ rot: keys([[0, s * 8], [0.35, s * 172], [0.72, s * 172], [1, s * 8]]) }))
  ), true);
  def('ex-side', 300, true, merge(
    { torso: { rot: keys([[0, 0], [0.25, 15], [0.5, 0], [0.75, -15], [1, 0]]) } },
    pair('arm', (s) => ({ rot: s * 170 }))
  ));
  def('ex-shoulders', 120, true, merge(
    { head: { y: swing(1, 0, -3) } },
    pair('arm', (s) => ({
      x: keys([[0, 0, 'linear'], [0.25, s * 2, 'linear'], [0.5, s * -3, 'linear'], [0.75, s * -2, 'linear'], [1, 0]]),
      y: keys([[0, 0, 'linear'], [0.25, -6, 'linear'], [0.5, -4, 'linear'], [0.75, 1, 'linear'], [1, 0]]),
    }))
  ));
  def('ex-march', 46, true, {
    rig: { y: swing(2, 0, -3) },
    legL: { y: swing(1, 0, -13) }, legR: { y: swing(1, 0, -13, 0.5) },
    armL: { rot: swing(1, 30, -14) }, armR: { rot: swing(1, 14, -30) },
  });
  def('ex-lookaway', 420, true, {
    head: {
      x: keys([[0, -4, 'hold'], [0.42, -4], [0.5, 4, 'hold'], [0.92, 4], [1, -4]]),
      rot: keys([[0, -7, 'hold'], [0.42, -7], [0.5, 7, 'hold'], [0.92, 7], [1, -7]]),
    },
    armL: { rot: 150 }, foreL: { rot: 75 },
  }, true);
  def('ex-wrists', 26, true, merge(
    isMouse ? pair('arm', (s) => ({ rot: swing(2, s * 60, s * 78, 0, 'linear') })) : pair('arm', (s) => ({ rot: s * 65 })),
    pair('fore', (s) => ({ rot: swing(2, s * 15, s * 50, 0, 'linear') }))
  ));

  // Not used by any scene at present; kept so state numbers stay stable.
  P.sneak = P.idle;
  P.search = P.look;
  return P;
}

module.exports = { poses };
