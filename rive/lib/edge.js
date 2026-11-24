// Climbing a wall, the far paw reaches round the wall's edge and goes behind
// it. Both renderers clip the far arm to the near side of the edge while
// climbing; this is where that edge is.
//
// The app puts a climbing character's centre HUG of its width away from the
// edge (src/content/world/locomotion.js, hugX), on the side it faces. The side
// view is drawn facing right, so the edge is a vertical line HUG * boxW right
// of the box's centre. The far arm hangs in the torso, so the line is given in
// torso coordinates, undoing the climb pose's body shift and lean.
'use strict';
const { poses } = require('./poses');

const HUG = 0.2;

// A polygon (drawing units, the torso's own coordinates) covering everything
// on the character's side of the edge.
function climbMask(side, boxW, isMouse) {
  const P = poses(isMouse).climb.parts;
  const shift = P.sRig.x || 0;
  const lean = P.sTorso.rot || 0;
  if (typeof shift !== 'number' || typeof lean !== 'number') throw new Error('climbMask expects a still body in the climb pose');
  const E = boxW / 2 + HUG * boxW - shift;
  const [px, py] = side.joints.sTorso;
  const t = (-lean * Math.PI) / 180;
  const local = ([x, y]) => {
    const dx = x - px;
    const dy = y - py;
    return [px + Math.cos(t) * dx - Math.sin(t) * dy, py + Math.sin(t) * dx + Math.cos(t) * dy];
  };
  return [[E - 1000, -500], [E, -500], [E, 600], [E - 1000, 600]].map(local);
}

module.exports = { climbMask };
