// The cat. Its art comes from characters/art.js (generated); the SVG below is
// the old placeholder, used if that file is missing. To swap the art, keep the part class names
// (rig, torso, head, arm-l/arm-r > fore, leg-l/leg-r > shin, tail, eyes, pupil,
// brow-l/brow-r, m m-*) and update the pivot points in `css`.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});
  DP.characters = DP.characters || {};

  const FUR = '#f2994a';
  const DARK = '#d97b2b';
  const CREAM = '#fff1dc';
  const INK = '#3b2a20';

  DP.characters.cat = {
    id: 'cat',
    displayName: 'Biscuit',
    width: 96,
    height: 112,
    hand: { x: 0.775, y: 0.37 }, // raised right paw, as a fraction of the box
    // Optional Rive art (desktop). Drop the file in assets/rive/ and it is used
    // instead of the SVG below; see assets/rive/README.md for what it must contain.
    rive: { file: 'cat.riv', artboard: 'Cat', stateMachine: 'Pet', frame: { width: 200, height: 170, left: 40, box: [120, 140] } },
    svg: `
<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <g class="rig">
  <g class="tail"><path d="M72 106 C98 108 104 88 95 72" fill="none" stroke="${DARK}" stroke-width="7" stroke-linecap="round"/></g>
  <g class="leg leg-l">
   <rect x="45" y="104" width="10" height="16" rx="5" fill="${FUR}"/>
   <g class="shin"><rect x="45" y="116" width="10" height="15" rx="5" fill="${FUR}"/><ellipse cx="48" cy="132" rx="9" ry="4.5" fill="${CREAM}" stroke="${DARK}" stroke-width="1"/></g>
  </g>
  <g class="leg leg-r">
   <rect x="65" y="104" width="10" height="16" rx="5" fill="${FUR}"/>
   <g class="shin"><rect x="65" y="116" width="10" height="15" rx="5" fill="${FUR}"/><ellipse cx="72" cy="132" rx="9" ry="4.5" fill="${CREAM}" stroke="${DARK}" stroke-width="1"/></g>
  </g>
  <g class="torso">
   <ellipse cx="60" cy="90" rx="19" ry="23" fill="${FUR}"/>
   <ellipse cx="60" cy="94" rx="12" ry="15" fill="${CREAM}"/>
   <g class="arm arm-l">
    <rect x="37" y="74" width="9" height="18" rx="4.5" fill="${FUR}"/>
    <g class="fore"><rect x="37" y="87" width="9" height="17" rx="4.5" fill="${FUR}"/><circle cx="41.5" cy="106" r="6" fill="${CREAM}" stroke="${DARK}" stroke-width="1"/></g>
   </g>
   <g class="arm arm-r">
    <rect x="74" y="74" width="9" height="18" rx="4.5" fill="${FUR}"/>
    <g class="fore"><rect x="74" y="87" width="9" height="17" rx="4.5" fill="${FUR}"/><circle cx="78.5" cy="106" r="6" fill="${CREAM}" stroke="${DARK}" stroke-width="1"/></g>
   </g>
   <g class="head">
    <path d="M40 36 L37 12 L57 27 Z" fill="${FUR}"/><path d="M43 31 L42 19 L52 27 Z" fill="#f7b7a3"/>
    <path d="M80 36 L83 12 L63 27 Z" fill="${FUR}"/><path d="M77 31 L78 19 L68 27 Z" fill="#f7b7a3"/>
    <ellipse cx="60" cy="44" rx="25" ry="21" fill="${FUR}"/>
    <path d="M60 24 v7 M53 25 l1 6 M67 25 l-1 6" stroke="${DARK}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="60" cy="55" rx="13" ry="8.5" fill="${CREAM}"/>
    <ellipse class="blush" cx="40" cy="52" rx="5" ry="3" fill="#ff7d7d"/>
    <ellipse class="blush" cx="80" cy="52" rx="5" ry="3" fill="#ff7d7d"/>
    <g class="eyes">
     <ellipse cx="50" cy="41" rx="6.5" ry="8" fill="#fff"/><circle class="pupil" cx="50" cy="42" r="3.3" fill="${INK}"/>
     <ellipse cx="70" cy="41" rx="6.5" ry="8" fill="#fff"/><circle class="pupil" cx="70" cy="42" r="3.3" fill="${INK}"/>
    </g>
    <path class="brow brow-l" d="M44 30 Q50 27 56 30" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path class="brow brow-r" d="M64 30 Q70 27 76 30" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M57 50 h6 l-3 3.5 z" fill="#d9534f"/>
    <path d="M36 52 h-10 M36 56 l-9 3 M84 52 h10 M84 56 l9 3" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".55"/>
    <path class="m m-smile" d="M53 56.5 Q60 62.5 67 56.5" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path class="m m-flat" d="M55 58.5 h10" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path class="m m-wavy" d="M52 58.5 q2 -3 4 0 t4 0 t4 0 t4 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <ellipse class="m m-open" cx="60" cy="59" rx="5" ry="5.5" fill="#7a2e2e"/>
    <g class="m m-pant"><ellipse cx="60" cy="58.5" rx="6" ry="4.5" fill="#7a2e2e"/><ellipse cx="60" cy="63" rx="3.5" ry="4.5" fill="#ff8f9c"/></g>
    <path class="sweat" d="M90 26 q4 7 0 9 q-4 -2 0 -9 z" fill="#7cc7ff"/>
   </g>
  </g>
 </g>
</svg>`,
    // Profile view, drawn facing right; used for the travel states (walk, run,
    // crouch, pounce, climb) and mirrored when heading left. Parts are named
    // s-* so front-view animations never touch them.
    sideSvg: `
<svg class="view-side" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <g class="s-rig">
  <g class="s-tail"><path d="M48 106 C24 108 16 90 24 72" fill="none" stroke="${DARK}" stroke-width="7" stroke-linecap="round"/></g>
  <g class="s-leg s-far">
   <rect x="52" y="102" width="10" height="17" rx="5" fill="${DARK}"/>
   <g class="s-shin"><rect x="52" y="115" width="10" height="16" rx="5" fill="${DARK}"/><ellipse cx="62" cy="132" rx="10" ry="4.5" fill="#f3dfc2" stroke="${DARK}" stroke-width="1"/></g>
  </g>
  <g class="s-torso">
   <g class="s-arm s-far">
    <rect x="55" y="74" width="9" height="18" rx="4.5" fill="${DARK}"/>
    <g class="s-fore"><rect x="55" y="87" width="9" height="17" rx="4.5" fill="${DARK}"/><circle cx="59.5" cy="106" r="6" fill="#f3dfc2" stroke="${DARK}" stroke-width="1"/></g>
   </g>
   <ellipse cx="58" cy="89" rx="16" ry="23" fill="${FUR}"/>
   <ellipse cx="65" cy="93" rx="8" ry="14" fill="${CREAM}"/>
   <g class="s-head">
    <path d="M64 30 L72 9 L82 30 Z" fill="${DARK}"/>
    <path d="M48 34 L52 10 L68 27 Z" fill="${FUR}"/><path d="M52 30 L54 18 L63 27 Z" fill="#f7b7a3"/>
    <ellipse cx="64" cy="44" rx="23" ry="20" fill="${FUR}"/>
    <path d="M58 25 l-1 7 M65 24 v7 M72 26 l1 6" stroke="${DARK}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="82" cy="53" rx="11" ry="7.5" fill="${CREAM}"/>
    <path d="M90 47 h5 l-2 4 z" fill="#d9534f"/>
    <g class="s-eyes"><ellipse cx="73" cy="40" rx="6" ry="8" fill="#fff"/><circle class="s-pupil" cx="75" cy="41" r="3.3" fill="${INK}"/></g>
    <path class="s-brow" d="M66 29 Q73 26 80 30" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M87 54 l12 -2 M87 57 l11 3" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".55"/>
    <path class="m m-smile" d="M80 58 Q86 62 91 57" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path class="m m-flat" d="M81 59 h9" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <ellipse class="m m-open" cx="86" cy="59" rx="5" ry="4" fill="#7a2e2e"/>
   </g>
   <g class="s-arm s-near">
    <rect x="55" y="74" width="9" height="18" rx="4.5" fill="${FUR}"/>
    <g class="s-fore"><rect x="55" y="87" width="9" height="17" rx="4.5" fill="${FUR}"/><circle cx="59.5" cy="106" r="6" fill="${CREAM}" stroke="${DARK}" stroke-width="1"/></g>
   </g>
  </g>
  <g class="s-leg s-near">
   <rect x="52" y="102" width="10" height="17" rx="5" fill="${FUR}"/>
   <g class="s-shin"><rect x="52" y="115" width="10" height="16" rx="5" fill="${FUR}"/><ellipse cx="62" cy="132" rx="10" ry="4.5" fill="${CREAM}" stroke="${DARK}" stroke-width="1"/></g>
  </g>
 </g>
</svg>`,
    // Pivot points, in viewBox units.
    css: `
.dp-char[data-char="cat"] { --pr: 2.6px; }
.dp-char[data-char="cat"] .rig { transform-origin: 60px 136px; }
.dp-char[data-char="cat"] .torso { transform-origin: 60px 110px; }
.dp-char[data-char="cat"] .head { transform-origin: 60px 64px; }
.dp-char[data-char="cat"] .eyes { transform-origin: 60px 42px; }
.dp-char[data-char="cat"] .brow-l { transform-origin: 50px 30px; }
.dp-char[data-char="cat"] .brow-r { transform-origin: 70px 30px; }
.dp-char[data-char="cat"] .arm-l { transform-origin: 41.5px 77px; }
.dp-char[data-char="cat"] .arm-l .fore { transform-origin: 41.5px 90px; }
.dp-char[data-char="cat"] .arm-r { transform-origin: 78.5px 77px; }
.dp-char[data-char="cat"] .arm-r .fore { transform-origin: 78.5px 90px; }
.dp-char[data-char="cat"] .leg-l { transform-origin: 50px 106px; }
.dp-char[data-char="cat"] .leg-l .shin { transform-origin: 50px 118px; }
.dp-char[data-char="cat"] .leg-r { transform-origin: 70px 106px; }
.dp-char[data-char="cat"] .leg-r .shin { transform-origin: 70px 118px; }
.dp-char[data-char="cat"] .tail { transform-origin: 72px 106px; }
.dp-char[data-char="cat"] .s-rig { transform-origin: 58px 136px; }
.dp-char[data-char="cat"] .s-torso { transform-origin: 58px 108px; }
.dp-char[data-char="cat"] .s-head { transform-origin: 62px 64px; }
.dp-char[data-char="cat"] .s-eyes { transform-origin: 73px 40px; }
.dp-char[data-char="cat"] .s-arm { transform-origin: 59.5px 77px; }
.dp-char[data-char="cat"] .s-fore { transform-origin: 59.5px 90px; }
.dp-char[data-char="cat"] .s-leg { transform-origin: 57px 104px; }
.dp-char[data-char="cat"] .s-shin { transform-origin: 57px 117px; }
.dp-char[data-char="cat"] .s-tail { transform-origin: 48px 106px; }
`,
  };
  // The hand-drawn art (characters/art.js, built by rive/build-svg.js), when loaded.
  if (DP.drawnArt && DP.drawnArt.cat) Object.assign(DP.characters.cat, DP.drawnArt.cat);
})(globalThis);
