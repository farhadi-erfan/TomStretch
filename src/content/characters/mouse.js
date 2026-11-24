// Placeholder mouse artwork. Same part naming contract as cat.js (the mouse
// has single-segment limbs, so there are no .fore / .shin parts).
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});
  DP.characters = DP.characters || {};

  const FUR = '#a9afbd';
  const DARK = '#878d9c';
  const BELLY = '#eef0f5';
  const PINK = '#f4a9b4';
  const INK = '#2f2a33';

  DP.characters.mouse = {
    id: 'mouse',
    displayName: 'Pip',
    width: 46,
    height: 55,
    sole: 94 / 96,
    hand: { x: 0.78, y: 0.45 },
    rive: { file: 'mouse.riv', artboard: 'Mouse', stateMachine: 'Pet', frame: { width: 160, height: 126, left: 40, box: [80, 96] } }, // optional, see cat.js
    svg: `
<svg viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <g class="rig">
  <g class="tail"><path d="M46 78 C68 82 72 64 63 54" fill="none" stroke="${PINK}" stroke-width="3" stroke-linecap="round"/></g>
  <g class="leg leg-l"><rect x="30" y="74" width="7" height="15" rx="3.5" fill="${FUR}"/><ellipse cx="32" cy="90" rx="7" ry="3.5" fill="${PINK}"/></g>
  <g class="leg leg-r"><rect x="43" y="74" width="7" height="15" rx="3.5" fill="${FUR}"/><ellipse cx="48" cy="90" rx="7" ry="3.5" fill="${PINK}"/></g>
  <g class="torso">
   <ellipse cx="40" cy="66" rx="13" ry="15" fill="${FUR}"/>
   <ellipse cx="40" cy="69" rx="8" ry="10" fill="${BELLY}"/>
   <g class="arm arm-l"><rect x="23" y="56" width="6" height="16" rx="3" fill="${FUR}"/><circle cx="26" cy="73" r="4" fill="${PINK}"/></g>
   <g class="arm arm-r"><rect x="51" y="56" width="6" height="16" rx="3" fill="${FUR}"/><circle cx="54" cy="73" r="4" fill="${PINK}"/></g>
   <g class="head">
    <circle cx="21" cy="18" r="13" fill="${DARK}"/><circle cx="21" cy="18" r="8" fill="${PINK}"/>
    <circle cx="59" cy="18" r="13" fill="${DARK}"/><circle cx="59" cy="18" r="8" fill="${PINK}"/>
    <ellipse cx="40" cy="34" rx="18" ry="16" fill="${FUR}"/>
    <ellipse cx="40" cy="42" rx="9" ry="6" fill="${BELLY}"/>
    <g class="eyes">
     <ellipse cx="33" cy="31" rx="4.5" ry="6" fill="#fff"/><circle class="pupil" cx="33" cy="32" r="2.4" fill="${INK}"/>
     <ellipse cx="47" cy="31" rx="4.5" ry="6" fill="#fff"/><circle class="pupil" cx="47" cy="32" r="2.4" fill="${INK}"/>
    </g>
    <path class="brow brow-l" d="M29 23 Q33 21 37 23" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path class="brow brow-r" d="M43 23 Q47 21 51 23" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="40" cy="39.5" r="2.4" fill="#d9536a"/>
    <path d="M30 42 h-9 M50 42 h9" stroke="${INK}" stroke-width=".8" stroke-linecap="round" opacity=".5"/>
    <path class="m m-smile" d="M35 43.5 Q40 48 45 43.5" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path class="m m-flat" d="M36 45 h8" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse class="m m-open" cx="40" cy="45.5" rx="3.6" ry="4" fill="#7a2e2e"/>
    <g class="m m-pant"><ellipse cx="40" cy="45" rx="4" ry="3" fill="#7a2e2e"/><ellipse cx="40" cy="48" rx="2.4" ry="3.2" fill="#ff8f9c"/></g>
   </g>
  </g>
 </g>
</svg>`,
    // Profile view, facing right (see cat.js).
    sideSvg: `
<svg class="view-side" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <g class="s-rig">
  <g class="s-tail"><path d="M34 78 C14 82 10 64 18 54" fill="none" stroke="${PINK}" stroke-width="3" stroke-linecap="round"/></g>
  <g class="s-leg s-far"><rect x="36" y="74" width="7" height="15" rx="3.5" fill="${DARK}"/><ellipse cx="43" cy="90" rx="7" ry="3.5" fill="#dc97a2"/></g>
  <g class="s-torso">
   <g class="s-arm s-far"><rect x="39" y="56" width="6" height="16" rx="3" fill="${DARK}"/><circle cx="42" cy="73" r="4" fill="#dc97a2"/></g>
   <ellipse cx="39" cy="66" rx="12" ry="15" fill="${FUR}"/>
   <ellipse cx="44" cy="69" rx="6" ry="10" fill="${BELLY}"/>
   <g class="s-head">
    <circle cx="50" cy="16" r="12" fill="${DARK}"/>
    <circle cx="30" cy="17" r="13" fill="${DARK}"/><circle cx="30" cy="17" r="8" fill="${PINK}"/>
    <ellipse cx="42" cy="34" rx="17" ry="15" fill="${FUR}"/>
    <ellipse cx="57" cy="40" rx="9" ry="6" fill="${BELLY}"/>
    <circle cx="65" cy="38" r="2.6" fill="#d9536a"/>
    <g class="s-eyes"><ellipse cx="49" cy="30" rx="4.5" ry="6" fill="#fff"/><circle class="s-pupil" cx="50.5" cy="31" r="2.4" fill="${INK}"/></g>
    <path class="s-brow" d="M44 22 Q49 20 54 23" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M59 42 l10 -1 M59 44 l9 3" stroke="${INK}" stroke-width=".8" stroke-linecap="round" opacity=".5"/>
    <path class="m m-smile" d="M55 45 Q60 48 64 44" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path class="m m-flat" d="M56 46 h7" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse class="m m-open" cx="59" cy="45.5" rx="3.5" ry="3" fill="#7a2e2e"/>
   </g>
   <g class="s-arm s-near"><rect x="39" y="56" width="6" height="16" rx="3" fill="${FUR}"/><circle cx="42" cy="73" r="4" fill="${PINK}"/></g>
  </g>
  <g class="s-leg s-near"><rect x="36" y="74" width="7" height="15" rx="3.5" fill="${FUR}"/><ellipse cx="43" cy="90" rx="7" ry="3.5" fill="${PINK}"/></g>
 </g>
</svg>`,
    css: `
.dp-char[data-char="mouse"] { --pr: 1.8px; }
.dp-char[data-char="mouse"] .rig { transform-origin: 40px 93px; }
.dp-char[data-char="mouse"] .torso { transform-origin: 40px 80px; }
.dp-char[data-char="mouse"] .head { transform-origin: 40px 50px; }
.dp-char[data-char="mouse"] .eyes { transform-origin: 40px 32px; }
.dp-char[data-char="mouse"] .brow-l { transform-origin: 33px 23px; }
.dp-char[data-char="mouse"] .brow-r { transform-origin: 47px 23px; }
.dp-char[data-char="mouse"] .arm-l { transform-origin: 26px 58px; }
.dp-char[data-char="mouse"] .arm-r { transform-origin: 54px 58px; }
.dp-char[data-char="mouse"] .leg-l { transform-origin: 33.5px 76px; }
.dp-char[data-char="mouse"] .leg-r { transform-origin: 46.5px 76px; }
.dp-char[data-char="mouse"] .tail { transform-origin: 46px 78px; }
.dp-char[data-char="mouse"] .s-rig { transform-origin: 40px 93px; }
.dp-char[data-char="mouse"] .s-torso { transform-origin: 40px 80px; }
.dp-char[data-char="mouse"] .s-head { transform-origin: 42px 50px; }
.dp-char[data-char="mouse"] .s-eyes { transform-origin: 49px 30px; }
.dp-char[data-char="mouse"] .s-arm { transform-origin: 42px 58px; }
.dp-char[data-char="mouse"] .s-leg { transform-origin: 39.5px 76px; }
.dp-char[data-char="mouse"] .s-tail { transform-origin: 34px 78px; }
`,
  };
  // The hand-drawn art (characters/art.js, built by rive/build-svg.js), when loaded.
  if (DP.drawnArt && DP.drawnArt.mouse) Object.assign(DP.characters.mouse, DP.drawnArt.mouse);
})(globalThis);
