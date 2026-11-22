// CSS for the SVG rig renderer: one block per animation state. Rules are
// character-agnostic; they address rig parts by class and rely on per-character
// pivot points (characters/*.js). Kept as a JS string so it can be adopted into
// the shadow root without being subject to the host page's CSP.
//
// Conventions:
//   --s    +1 on left limbs/brows, -1 on right ones, so rotate(var(--s) * N)
//          moves both sides symmetrically (positive raises an arm outward).
//   --dir  +1 when travelling right, -1 when travelling left.
//   --lx/--ly  gaze direction, -1..1, set from JS.
//   --lim  how far an upper arm can rise before the head is in the way; past it
//          the elbow bends and the forearm takes the rest (a "hooray" arm),
//          so a raised paw shows beside the head instead of over the face.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  DP.rigCss = `
.dp-char { --dir: 1; --lx: 0; --ly: 0; --pr: 2.5px; --lim: 110deg; }
.dp-char .rig * { transform-box: view-box; }
.dp-char .arm-l, .dp-char .leg-l, .dp-char .brow-l { --s: 1; }
.dp-char .arm-r, .dp-char .leg-r, .dp-char .brow-r { --s: -1; }
.dp-char .arm, .dp-char .fore, .dp-char .leg, .dp-char .head, .dp-char .torso,
.dp-char .brow, .dp-char .rig, .dp-char .eyes { transition: transform .22s ease-out; }
.dp-char .pupil { transform: translate(calc(var(--lx) * var(--pr)), calc(var(--ly) * var(--pr))); transition: transform .12s; }
.dp-char .blush, .dp-char .sweat { opacity: 0; transition: opacity .3s; }

/* mouths */
.dp-char .m { display: none; }
.dp-char[data-mouth="smile"] .m-smile, .dp-char[data-mouth="flat"] .m-flat,
.dp-char[data-mouth="wavy"] .m-wavy, .dp-char[data-mouth="open"] .m-open,
.dp-char[data-mouth="pant"] .m-pant { display: block; }

/* always-on life: breathing, tail, blinking */
.dp-char .torso { animation: dp-breathe 2.6s ease-in-out infinite; }
.dp-char .tail { animation: dp-tail 3s ease-in-out infinite; }
.dp-char .eyes { animation: dp-blink 4.2s infinite; }

@keyframes dp-breathe { 50% { transform: scaleY(1.035); } }
@keyframes dp-tail { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(12deg); } }
@keyframes dp-blink { 0%,93%,100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
@keyframes dp-bob { 50% { transform: translateY(-3px); } }
@keyframes dp-step { 0%,100% { transform: none; } 50% { transform: translateY(-6px) rotate(calc(var(--dir) * -14deg)); } }
@keyframes dp-rock { 0%,100% { transform: rotate(calc(var(--dir) * 4deg - 3deg)); } 50% { transform: rotate(calc(var(--dir) * 4deg + 3deg)); } }
@keyframes dp-swing { 0%,100% { transform: rotate(calc(var(--s) * 8deg + 22deg)); } 50% { transform: rotate(calc(var(--s) * 8deg - 22deg)); } }

/* walk */
.dp-char[data-state="walk"] {
  .rig { animation: dp-bob .42s ease-in-out infinite; }
  .torso { animation: dp-rock .84s ease-in-out infinite; }
  .leg { animation: dp-step .84s ease-in-out infinite; }
  .leg-r { animation-delay: -.42s; }
  .arm { animation: dp-swing .84s ease-in-out infinite; }
}

/* run */
@keyframes dp-run-lean { 0%,100% { transform: rotate(calc(var(--dir) * 15deg - 3deg)); } 50% { transform: rotate(calc(var(--dir) * 15deg + 3deg)); } }
@keyframes dp-run-step { 0%,100% { transform: rotate(calc(var(--dir) * 18deg)); } 50% { transform: translateY(-9px) rotate(calc(var(--dir) * -30deg)); } }
@keyframes dp-pump { 0%,100% { transform: rotate(calc(var(--s) * 30deg + 45deg)); } 50% { transform: rotate(calc(var(--s) * 30deg - 45deg)); } }
.dp-char[data-state="run"] {
  .rig { animation: dp-bob .16s ease-in-out infinite; }
  .torso { animation: dp-run-lean .32s ease-in-out infinite; }
  .leg { animation: dp-run-step .32s ease-in-out infinite; }
  .leg-r { animation-delay: -.16s; }
  .arm { animation: dp-pump .32s ease-in-out infinite; }
  .fore { transform: rotate(calc(var(--s) * 60deg)); }
  .tail { animation: none; transform: rotate(calc(var(--dir) * -35deg)); }
}

/* sneak: low, claws out, slow tiptoe */
@keyframes dp-claw { 0%,100% { transform: rotate(calc(var(--s) * 55deg)); } 50% { transform: rotate(calc(var(--s) * 75deg)); } }
.dp-char[data-state="sneak"] {
  .rig { transform: scale(1.04, .9); }
  .torso { animation: none; transform: rotate(calc(var(--dir) * 9deg)); }
  .leg { animation: dp-step 1s ease-in-out infinite; }
  .leg-r { animation-delay: -.5s; }
  .arm { transform: rotate(calc(var(--s) * 55deg)); }
  .fore { animation: dp-claw .5s ease-in-out infinite; }
  .brow { transform: rotate(calc(var(--s) * 14deg)); }
  .tail { animation-duration: .7s; }
}

/* crouch: anticipation before a jump */
@keyframes dp-wiggle { 0%,100% { transform: scale(1.12, .76) rotate(-2.5deg); } 50% { transform: scale(1.12, .76) rotate(2.5deg); } }
.dp-char[data-state="crouch"] {
  .rig { animation: dp-wiggle .16s linear infinite; }
  .arm { transform: rotate(calc(var(--s) * 28deg)); }
  .brow { transform: rotate(calc(var(--s) * 16deg)); }
  .tail { animation-duration: .3s; }
}

/* pounce: stretched in the air */
.dp-char[data-state="pounce"] {
  .rig { transform: scale(.9, 1.16) rotate(calc(var(--dir) * 18deg)); }
  .arm { transform: rotate(calc(var(--s) * min(150deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * max(0deg, 150deg - var(--lim)))); }
  .leg { transform: rotate(calc(var(--s) * 26deg)); }
  .brow { transform: rotate(calc(var(--s) * 14deg)); }
  .tail { animation: none; transform: rotate(-30deg); }
}

/* land: squash and settle (one-shot) */
@keyframes dp-land { 0% { transform: scale(1.28, .62); } 45% { transform: scale(.93, 1.1); } 75% { transform: scale(1.04, .97); } 100% { transform: none; } }
.dp-char[data-state="land"] {
  .rig { animation: dp-land .5s ease-out forwards; }
  .arm { transform: rotate(calc(var(--s) * 40deg)); }
}

/* confused: head tilt, scratching */
@keyframes dp-scratch { 0%,100% { transform: rotate(calc(var(--s) * 55deg)); } 50% { transform: rotate(calc(var(--s) * 85deg)); } }
.dp-char[data-state="confused"] {
  .head { transform: rotate(12deg); }
  .arm-r { transform: rotate(-150deg); }
  .arm-r .fore { animation: dp-scratch .35s ease-in-out infinite; }
  .brow-l { transform: translateY(-3px); }
  .brow-r { transform: rotate(-12deg); }
}

/* embarrassed: blush, look down, scuff a foot */
@keyframes dp-scuff { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(-16deg); } }
.dp-char[data-state="embarrassed"] {
  .head { transform: translateY(3px) rotate(-6deg); }
  .blush { opacity: .85; }
  .arm { transform: rotate(calc(var(--s) * -10deg)); }
  .leg-r { animation: dp-scuff .9s ease-in-out infinite; }
  .brow { transform: rotate(calc(var(--s) * -14deg)); }
  .pupil { transform: translate(-1.5px, var(--pr)); }
}

/* look: attentive */
@keyframes dp-headlook { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }
.dp-char[data-state="look"] {
  .head { animation: dp-headlook 2.2s ease-in-out infinite; }
  .brow { transform: translateY(-2px); }
}

/* search: paw over eyes, scanning */
@keyframes dp-scan { 0%,100% { transform: rotate(-13deg); } 50% { transform: rotate(13deg); } }
@keyframes dp-scan-eyes { 0%,100% { transform: translate(calc(var(--pr) * -1), 0); } 50% { transform: translate(var(--pr), 0); } }
.dp-char[data-state="search"] {
  .head { animation: dp-scan 1.6s ease-in-out infinite; }
  .pupil { animation: dp-scan-eyes 1.6s ease-in-out infinite; }
  .arm-l { transform: rotate(min(150deg, var(--lim))); }
  .arm-l .fore { transform: rotate(calc(75deg + max(0deg, 150deg - var(--lim)))); }
  .brow { transform: rotate(calc(var(--s) * -8deg)); }
}

/* startled: jump out of skin (one-shot), hold the surprise */
@keyframes dp-startle { 0% { transform: scale(1.12, .82); } 30% { transform: translateY(-26px) scale(.88, 1.22); } 62% { transform: scale(1.1, .88); } 100% { transform: none; } }
.dp-char[data-state="startled"] {
  .rig { animation: dp-startle .55s ease-out forwards; }
  .arm { transform: rotate(calc(var(--s) * 110deg)); }
  .eyes { animation: none; transform: scale(1.22); }
  .brow { transform: translateY(-4px); }
  .tail { animation: none; transform: rotate(-32deg); }
}

/* tired: panting, sweating */
@keyframes dp-pant { 0%,100% { transform: rotate(calc(var(--dir) * 5deg)) scaleY(.93); } 50% { transform: rotate(calc(var(--dir) * 5deg)) scaleY(.98); } }
@keyframes dp-drip { 0% { transform: translateY(-3px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }
.dp-char[data-state="tired"] {
  .torso { animation: dp-pant .46s ease-in-out infinite; }
  .head { transform: translateY(4px) rotate(4deg); }
  .arm { transform: rotate(calc(var(--s) * -4deg)); }
  .eyes { animation: none; transform: scaleY(.55); }
  .brow { transform: rotate(calc(var(--s) * -14deg)); }
  .sweat { animation: dp-drip 1.1s ease-in infinite; }
  .tail { animation: none; transform: rotate(20deg); }
}

/* sleep */
.dp-char[data-state="sleep"] {
  .rig { transform: scale(1.06, .88); }
  .torso { animation-duration: 3.8s; }
  .head { transform: translateY(4px) rotate(9deg); }
  .eyes { animation: none; transform: scaleY(.08); }
  .tail { animation: none; }
}

/* wave */
@keyframes dp-wave { 0%,100% { transform: rotate(calc(35deg - max(0deg, 150deg - var(--lim)))); } 50% { transform: rotate(calc(-20deg - max(0deg, 150deg - var(--lim)))); } }
.dp-char[data-state="wave"] {
  .rig { animation: dp-bob .8s ease-in-out infinite; }
  .arm-r { transform: rotate(calc(-1 * min(150deg, var(--lim)))); }
  .arm-r .fore { animation: dp-wave .4s ease-in-out infinite; }
}

/* cheer */
@keyframes dp-hop { 0%,100% { transform: scale(1.06, .92); } 50% { transform: translateY(-9px) scale(.96, 1.06); } }
.dp-char[data-state="cheer"] {
  .rig { animation: dp-hop .42s ease-in-out infinite; }
  .arm { transform: rotate(calc(var(--s) * min(160deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * max(0deg, 160deg - var(--lim)))); }
}

/* press: stomping on a button */
@keyframes dp-stomp { 0%,100% { transform: scale(1.12, .84); } 50% { transform: translateY(-7px) scale(.95, 1.1); } }
.dp-char[data-state="press"] {
  .rig { animation: dp-stomp .3s ease-in-out infinite; }
  .arm { transform: rotate(calc(var(--s) * min(120deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * max(0deg, 120deg - var(--lim)))); }
}

/* taunt: thumbs in ears */
@keyframes dp-taunt-arm { 0%,100% { transform: rotate(calc(var(--s) * 138deg)); } 50% { transform: rotate(calc(var(--s) * 164deg)); } }
@keyframes dp-sway { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
.dp-char[data-state="taunt"] {
  .rig { animation: dp-sway .5s ease-in-out infinite; }
  .arm { animation: dp-taunt-arm .2s ease-in-out infinite; }
  .fore { transform: rotate(calc(var(--s) * 40deg)); }
}

/* laugh */
@keyframes dp-laugh { 0%,100% { transform: translateY(1.5px) rotate(-3deg); } 50% { transform: translateY(-1.5px) rotate(3deg); } }
.dp-char[data-state="laugh"] {
  .rig { animation: dp-laugh .16s linear infinite; }
  .arm { transform: rotate(calc(var(--s) * -24deg)); }
  .eyes { animation: none; transform: scaleY(.15); }
}

/* climb: hand over hand up a wall */
@keyframes dp-climb-arm { 0%,100% { transform: rotate(calc(var(--s) * min(168deg, var(--lim)))); } 50% { transform: rotate(calc(var(--s) * min(118deg, var(--lim)))); } }
@keyframes dp-climb-fore { 0%,100% { transform: rotate(calc(var(--s) * max(0deg, 168deg - var(--lim)))); } 50% { transform: rotate(calc(var(--s) * max(0deg, 118deg - var(--lim)))); } }
@keyframes dp-climb-leg { 0%,100% { transform: translateY(-7px); } 50% { transform: none; } }
.dp-char[data-state="climb"] {
  .rig { animation: dp-sway .5s ease-in-out infinite; }
  .arm { animation: dp-climb-arm .5s ease-in-out infinite; }
  .fore { animation: dp-climb-fore .5s ease-in-out infinite; }
  .arm-r, .arm-r .fore { animation-delay: -.25s; }
  .leg { animation: dp-climb-leg .5s ease-in-out infinite; }
  .leg-l { animation-delay: -.25s; }
  .brow { transform: rotate(calc(var(--s) * 10deg)); }
}

/* fall: flailing */
@keyframes dp-flail { 0%,100% { transform: rotate(calc(var(--s) * min(165deg, var(--lim)))); } 50% { transform: rotate(calc(var(--s) * min(120deg, var(--lim)))); } }
@keyframes dp-flail-fore { 0%,100% { transform: rotate(calc(var(--s) * max(0deg, 165deg - var(--lim)))); } 50% { transform: rotate(calc(var(--s) * max(0deg, 120deg - var(--lim)))); } }
@keyframes dp-kick { 0%,100% { transform: rotate(calc(var(--s) * 28deg)); } 50% { transform: rotate(calc(var(--s) * -8deg)); } }
.dp-char[data-state="fall"] {
  .rig { transform: scale(.9, 1.14); }
  .arm { animation: dp-flail .14s linear infinite; }
  .fore { animation: dp-flail-fore .14s linear infinite; }
  .arm-r, .arm-r .fore { animation-delay: -.07s; }
  .leg { animation: dp-kick .16s linear infinite; }
  .leg-r { animation-delay: -.08s; }
  .eyes { animation: none; transform: scale(1.25); }
  .brow { transform: translateY(-4px); }
  .tail { animation: none; transform: rotate(-40deg); }
}

/* hang: standing on nothing, not yet falling */
@keyframes dp-dangle { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
.dp-char[data-state="hang"] {
  .torso { animation: none; }
  .leg { animation: dp-dangle 1.1s ease-in-out infinite; }
  .leg-r { animation-delay: -.55s; }
  .arm { transform: rotate(calc(var(--s) * 18deg)); }
  .eyes { animation: none; transform: scale(1.15); }
  .brow { transform: translateY(-3px); }
  .tail { animation: none; transform: rotate(24deg); }
}

/* scared: trembling behind its paws */
@keyframes dp-tremble { 0%,100% { transform: translateX(-1.6px); } 50% { transform: translateX(1.6px); } }
@keyframes dp-knock { 0%,100% { transform: rotate(calc(var(--s) * -9deg)); } 50% { transform: rotate(calc(var(--s) * 3deg)); } }
.dp-char[data-state="scared"] {
  .rig { animation: dp-tremble .07s linear infinite; }
  .torso { animation: none; transform: scaleY(.94); }
  .arm { transform: rotate(calc(var(--s) * min(150deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * (75deg + max(0deg, 150deg - var(--lim))))); }
  .leg { animation: dp-knock .14s linear infinite; }
  .eyes { animation: none; transform: scale(1.2); }
  .brow { transform: translateY(-3px) rotate(calc(var(--s) * -16deg)); }
  .tail { animation: none; transform: rotate(-36deg); }
}

/* grab: clinging on to a prize */
.dp-char[data-state="grab"] {
  .arm { transform: rotate(calc(var(--s) * min(140deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * (55deg + max(0deg, 140deg - var(--lim))))); }
  .leg { animation: dp-dangle .7s ease-in-out infinite; }
  .leg-r { animation-delay: -.35s; }
  .eyes { animation: none; transform: scaleY(.18); }
  .tail { animation-duration: .5s; }
}

/* splat: flattened against the glass */
@keyframes dp-splat { 0% { transform: scale(1.14, .84); } 45% { transform: scale(.95, 1.05); } 100% { transform: none; } }
.dp-char[data-state="splat"] {
  .rig { animation: dp-splat .5s ease-out forwards; }
  .arm { transform: rotate(calc(var(--s) * min(128deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * (30deg + max(0deg, 128deg - var(--lim))))); }
  .eyes { transform: scale(1.1); }
  .brow { transform: translateY(-2px); }
}

/* holding a sign: the right arm goes up whatever else the body is doing */
.dp-char[data-sign] .arm-r { animation: none !important; transform: rotate(calc(-1 * min(150deg, var(--lim)))) !important; }
.dp-char[data-sign] .arm-r .fore { animation: none !important; transform: rotate(calc(-1 * max(0deg, 150deg - var(--lim)))) !important; }

/* ==== profile view (travel) ==================================================
   Drawn facing right and mirrored with --dir. Near and far limbs share
   keyframes; the far side runs half a cycle behind. Positive rotation swings
   a limb backwards. */
.dp-char .view-side { display: none; transform: scaleX(var(--dir)); }
.dp-char[data-view="side"] .view-front { display: none; }
.dp-char[data-view="side"] .view-side { display: block; }
.dp-char .view-side * { transform-box: view-box; }
.dp-char .s-rig, .dp-char .s-torso, .dp-char .s-head, .dp-char .s-arm, .dp-char .s-fore,
.dp-char .s-leg, .dp-char .s-shin, .dp-char .s-tail { transition: transform .16s ease-out; }
.dp-char .s-pupil { transform: translate(calc(var(--lx) * var(--dir) * var(--pr)), calc(var(--ly) * var(--pr))); transition: transform .12s; }
.dp-char .s-eyes { animation: dp-blink 4.2s infinite; }
.dp-char .s-tail { animation: dp-tail 3s ease-in-out infinite; }

@keyframes dp-s-leg { 0%,100% { transform: rotate(var(--a)); } 50% { transform: rotate(calc(var(--a) * -1)); } }
@keyframes dp-s-knee { 0%,100% { transform: rotate(var(--k)); } 50% { transform: rotate(3deg); } }
@keyframes dp-s-arm { 0%,100% { transform: rotate(calc(var(--ab) - var(--b))); } 50% { transform: rotate(calc(var(--ab) + var(--b))); } }
@keyframes dp-s-bob { 0%,100% { transform: none; } 50% { transform: translateY(-4px); } }

.dp-char[data-state="walk"] .view-side {
  --a: 24deg; --k: 30deg; --b: 22deg; --ab: 0deg;
  .s-rig { animation: dp-s-bob .42s ease-in-out infinite; }
  .s-torso { transform: rotate(5deg); }
  .s-leg { animation: dp-s-leg .84s ease-in-out infinite; }
  .s-shin { animation: dp-s-knee .84s ease-in-out infinite; }
  .s-arm { animation: dp-s-arm .84s ease-in-out infinite; }
  .s-far, .s-far .s-shin { animation-delay: -.42s; }
}

.dp-char[data-state="run"] .view-side {
  --a: 52deg; --k: 75deg; --b: 58deg; --ab: -12deg;
  .s-rig { animation: dp-s-bob .16s ease-in-out infinite; }
  .s-torso { transform: rotate(19deg); }
  .s-head { transform: rotate(-9deg); }
  .s-leg { animation: dp-s-leg .32s linear infinite; }
  .s-shin { animation: dp-s-knee .32s linear infinite; }
  .s-arm { animation: dp-s-arm .32s linear infinite; }
  .s-fore { transform: rotate(-80deg); }
  .s-far, .s-far .s-shin { animation-delay: -.16s; }
  .s-tail { animation: none; transform: rotate(-38deg); }
}

.dp-char[data-state="crouch"] .view-side {
  .s-rig { animation: dp-wiggle .16s linear infinite; }
  .s-torso { transform: rotate(24deg); }
  .s-head { transform: rotate(-14deg); }
  .s-arm { transform: rotate(40deg); }
  .s-leg { transform: rotate(-14deg); }
  .s-shin { transform: rotate(30deg); }
  .s-tail { animation-duration: .3s; }
}

.dp-char[data-state="pounce"] .view-side {
  .s-rig { transform: scale(1.1, .93); }
  .s-torso { transform: rotate(30deg); }
  .s-head { transform: rotate(-16deg); }
  .s-arm { transform: rotate(-128deg); }
  .s-arm.s-far { transform: rotate(-108deg); }
  .s-leg { transform: rotate(48deg); }
  .s-leg.s-far { transform: rotate(68deg); }
  .s-shin { transform: rotate(16deg); }
  .s-tail { animation: none; transform: rotate(-32deg); }
}

@keyframes dp-s-reach { 0%,100% { transform: rotate(-158deg); } 50% { transform: rotate(-104deg); } }
@keyframes dp-s-step-up { 0%,100% { transform: rotate(-48deg); } 50% { transform: rotate(6deg); } }
@keyframes dp-s-knee-up { 0%,100% { transform: rotate(72deg); } 50% { transform: rotate(8deg); } }
.dp-char[data-state="climb"] .view-side {
  .s-rig { transform: translateX(9px); }
  .s-torso { transform: rotate(-4deg); }
  .s-head { transform: rotate(-18deg); }
  .s-arm { animation: dp-s-reach .5s ease-in-out infinite; }
  .s-fore { transform: rotate(-18deg); }
  .s-leg { animation: dp-s-step-up .5s ease-in-out infinite; }
  .s-shin { animation: dp-s-knee-up .5s ease-in-out infinite; }
  .s-near, .s-near .s-shin { animation-delay: -.25s; }
  .s-tail { animation-duration: .6s; }
}

.dp-char[data-sign] .s-arm.s-near { animation: none !important; transform: rotate(-165deg) !important; }

/* ---- exercises ---- */

@keyframes dp-ex-reach { 0%,100% { transform: rotate(calc(var(--s) * 8deg)); } 35%,72% { transform: rotate(calc(var(--s) * min(172deg, var(--lim)))); } }
@keyframes dp-ex-reach-fore { 0%,100% { transform: none; } 35%,72% { transform: rotate(calc(var(--s) * max(0deg, 172deg - var(--lim)))); } }
@keyframes dp-ex-tall { 0%,100% { transform: none; } 35%,72% { transform: scale(.97, 1.06); } }
.dp-char[data-state="ex-overhead"] {
  .rig { animation: dp-ex-tall 4s ease-in-out infinite; }
  .arm { animation: dp-ex-reach 4s ease-in-out infinite; }
  .fore { animation: dp-ex-reach-fore 4s ease-in-out infinite; }
}

@keyframes dp-ex-lean { 0%,50%,100% { transform: none; } 25% { transform: rotate(15deg); } 75% { transform: rotate(-15deg); } }
.dp-char[data-state="ex-side"] {
  .torso { animation: dp-ex-lean 5s ease-in-out infinite; }
  .arm { transform: rotate(calc(var(--s) * min(170deg, var(--lim)))); }
  .fore { transform: rotate(calc(var(--s) * max(0deg, 170deg - var(--lim)))); }
}

@keyframes dp-ex-roll {
  0%,100% { transform: none; }
  25% { transform: translate(calc(var(--s) * 2px), -6px); }
  50% { transform: translate(calc(var(--s) * -3px), -4px); }
  75% { transform: translate(calc(var(--s) * -2px), 1px); }
}
.dp-char[data-state="ex-shoulders"] {
  .arm { animation: dp-ex-roll 2s linear infinite; }
  .head { animation: dp-bob 2s ease-in-out infinite; }
}

@keyframes dp-ex-knee { 0%,100% { transform: none; } 50% { transform: translateY(-13px); } }
.dp-char[data-state="ex-march"] {
  .rig { animation: dp-bob .38s ease-in-out infinite; }
  .leg { animation: dp-ex-knee .76s ease-in-out infinite; }
  .leg-r { animation-delay: -.38s; }
  .arm { animation: dp-swing .76s ease-in-out infinite; }
}

@keyframes dp-ex-far { 0%,42% { transform: translateX(-4px) rotate(-7deg); } 50%,92% { transform: translateX(4px) rotate(7deg); } 100% { transform: translateX(-4px) rotate(-7deg); } }
@keyframes dp-ex-far-eyes { 0%,42% { transform: translate(calc(var(--pr) * -1.2), -1px); } 50%,92% { transform: translate(calc(var(--pr) * 1.2), -1px); } 100% { transform: translate(calc(var(--pr) * -1.2), -1px); } }
.dp-char[data-state="ex-lookaway"] {
  .head { animation: dp-ex-far 7s ease-in-out infinite; }
  .pupil { animation: dp-ex-far-eyes 7s ease-in-out infinite; }
  .arm-l { transform: rotate(min(150deg, var(--lim))); }
  .arm-l .fore { transform: rotate(calc(75deg + max(0deg, 150deg - var(--lim)))); }
}

@keyframes dp-ex-shake { 0%,100% { transform: rotate(calc(var(--s) * 15deg)); } 50% { transform: rotate(calc(var(--s) * 50deg)); } }
.dp-char[data-state="ex-wrists"] {
  .arm { transform: rotate(calc(var(--s) * 65deg)); }
  .fore { animation: dp-ex-shake .22s linear infinite; }
}

@keyframes dp-ex-tuck { 0%,18%,88%,100% { transform: none; } 30%,72% { transform: translateY(3px) scale(1, .96); } }
.dp-char[data-state="ex-chin"] {
  .head { animation: dp-ex-tuck 3.6s ease-in-out infinite; }
  .arm-r { transform: rotate(calc(-1 * min(150deg, var(--lim)))); }
  .arm-r .fore { transform: rotate(calc(-80deg - max(0deg, 150deg - var(--lim)))); }
}

@keyframes dp-ex-tilt { 0%,8%,50%,58%,100% { transform: none; } 18%,40% { transform: rotate(18deg); } 68%,90% { transform: rotate(-18deg); } }
.dp-char[data-state="ex-tilt"] {
  .head { animation: dp-ex-tilt 7s ease-in-out infinite; }
}

@keyframes dp-ex-open { 0%,100% { transform: rotate(calc(var(--s) * 6deg)); } 30%,70% { transform: rotate(calc(var(--s) * 30deg)); } }
@keyframes dp-ex-chest { 0%,100% { transform: none; } 30%,70% { transform: scale(1.05, 1.02); } }
@keyframes dp-ex-chin-up { 0%,100% { transform: none; } 30%,70% { transform: translateY(-2px); } }
.dp-char[data-state="ex-chest"] {
  .arm { animation: dp-ex-open 4s ease-in-out infinite; }
  .torso { animation: dp-ex-chest 4s ease-in-out infinite; }
  .head { animation: dp-ex-chin-up 4s ease-in-out infinite; }
}

@media (prefers-reduced-motion: reduce) {
  .dp-char .torso, .dp-char .tail { animation: none; }
}
`;
})(globalThis);
