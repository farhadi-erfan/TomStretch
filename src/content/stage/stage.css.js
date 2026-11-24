// Styles for the overlay itself: character boxes, hand-held signs, and the
// break props (choice boards, floor button).
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  DP.stageCss = `
.dp-stage {
  position: fixed; inset: 0; overflow: hidden; pointer-events: none;
  font: 13px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #2b2330;
  opacity: var(--dp-opacity, 1);
  --wood: #f4dfae; --wood-edge: #5a3b1c; --stick: #8a5a2b;
}
.dp-stage.dp-off { display: none; }

.dp-char { position: absolute; left: 0; bottom: 0; z-index: 2; transform-origin: 50% var(--sole, 100%); }
.dp-char.dp-hidden { display: none; }
.dp-char canvas.dp-rive { display: block; width: 100%; height: 100%; }
.dp-char svg { display: block; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 2px 2px rgba(0,0,0,.22)); }

/* A sign on a stick, held in the raised paw. */
.dp-sign {
  position: absolute; left: var(--hx); bottom: calc(100% - var(--hy)); width: 0;
  display: flex; flex-direction: column; align-items: center;
  transform-origin: bottom center; transform: rotate(7deg) scale(0);
  transition: transform .2s cubic-bezier(.3,1.6,.5,1); pointer-events: none;
}
.dp-sign.dp-show { transform: rotate(7deg) scale(1); }
.dp-sign-board {
  background: var(--wood); border: 2px solid var(--wood-edge); border-radius: 5px; padding: 3px 9px;
  font-weight: 800; font-size: 13px; line-height: 1.25; color: #3b2a20; white-space: pre; text-align: center;
  box-shadow: 0 2px 0 var(--wood-edge), 0 5px 9px rgba(0,0,0,.22);
}
.dp-sign-stick { width: 4px; height: 20px; background: var(--stick); border: 1px solid var(--wood-edge); border-top: 0; }
.dp-sign.dp-sign-under { bottom: auto; top: 100%; flex-direction: column-reverse; transform-origin: top center; }
.dp-sign.dp-sign-under .dp-sign-stick { border-top: 1px solid var(--wood-edge); border-bottom: 0; }
.dp-sign.dp-sign-big .dp-sign-board { font-size: 14px; padding: 5px 12px; }
.dp-sign.dp-clickable .dp-sign-board { pointer-events: auto; cursor: pointer; }
.dp-sign.dp-clickable:not(.dp-choices) .dp-sign-board:hover { background: #ffedc4; }
/* A question on the sign, with answer buttons under it. */
.dp-sign.dp-choices .dp-sign-board { cursor: default; font-size: 15px; padding: 6px 10px 8px; }
.dp-sign-choices { display: flex; gap: 5px; justify-content: center; margin-top: 6px; }
.dp-sign-choice {
  all: unset; cursor: pointer; padding: 2px 10px; border-radius: 999px;
  font: 800 12.5px/1.4 system-ui, sans-serif; color: #3b2a20;
  border: 1.5px solid var(--wood-edge); background: #fff8e6;
}
.dp-sign-choice:hover { background: #ffedc4; transform: scale(1.06); }
.dp-sign-choice.dp-primary { background: #f2994a; }
.dp-sign-choice.dp-primary:hover { background: #f5a965; }
.dp-sign-choice:focus-visible { outline: 2px solid #2b6cb0; outline-offset: 2px; }

/* Impact stars where the mouse meets the pointer. */
.dp-burst {
  position: absolute; z-index: 3; width: 0; height: 0; font-size: 26px; line-height: 0; color: #ffcf33;
  text-shadow: 0 0 2px #7a4b00; animation: dp-burst .55s ease-out forwards;
}
.dp-burst::before { content: "✦"; position: absolute; left: -22px; top: -8px; }
.dp-burst::after { content: "✦"; position: absolute; left: 10px; top: 6px; font-size: 18px; }
@keyframes dp-burst { 0% { transform: scale(.2) rotate(0); opacity: 1; } 100% { transform: scale(1.9) rotate(40deg); opacity: 0; } }

/* ---- break props (the only parts that accept pointer input) ---- */

/* Boards on sticks, planted on the floor beside the cat. */
.dp-boards, .dp-timer {
  position: absolute; bottom: 0; z-index: 3;
  display: flex; align-items: flex-end; gap: 12px;
  transform: translateY(110%); visibility: hidden;
  transition: transform .35s cubic-bezier(.3,1.4,.5,1), visibility 0s .35s;
}
.dp-boards.dp-show, .dp-timer.dp-show { transform: none; visibility: visible; transition-delay: 0s; }
/* Hung from the top edge on strings (beside a cat hanging off a button). */
.dp-boards.dp-hung, .dp-timer.dp-hung { align-items: flex-start; transform: translateY(-110%); }
.dp-boards.dp-hung.dp-show, .dp-timer.dp-hung.dp-show { transform: none; }
.dp-hung .dp-board { margin-bottom: 0; margin-top: 40px; }
.dp-hung .dp-board::after { top: auto; bottom: 100%; width: 2px; margin-left: -1px; height: 42px; border: 0; background: var(--wood-edge); }
.dp-board {
  all: unset; box-sizing: border-box; position: relative; margin-bottom: 40px;
  background: var(--wood); border: 2px solid var(--wood-edge); border-radius: 6px; color: #3b2a20;
  box-shadow: 0 3px 0 var(--wood-edge), 0 6px 14px rgba(0,0,0,.28); text-align: center;
}
.dp-board::after {
  content: ""; position: absolute; left: 50%; top: 100%; width: 6px; height: 46px; margin-left: -3px;
  background: var(--stick); border: 1.5px solid var(--wood-edge); border-top: 0; box-sizing: border-box;
}
.dp-board-info { padding: 8px 12px 9px; width: 210px; transform: rotate(-1.5deg); }
.dp-board-kicker { font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #a8501a; }
.dp-board-name { font-size: 15px; font-weight: 800; margin: 1px 0 3px; }
.dp-board-how { font-size: 12px; }
.dp-board-btn {
  cursor: pointer; padding: 7px 12px; font: 800 14px/1.2 system-ui, sans-serif; white-space: nowrap;
  transform: rotate(3deg); transition: transform .12s;
}
.dp-boards.dp-show .dp-board-btn, .dp-timer.dp-show .dp-board { pointer-events: auto; }
.dp-board-btn:first-child { transform: rotate(-4deg); }
.dp-board-btn:hover { transform: rotate(0) scale(1.06); }
.dp-board-btn.dp-primary { background: #f2994a; }
.dp-board-btn:focus-visible { outline: 3px solid #2b6cb0; outline-offset: 3px; }

.dp-timer .dp-board { padding: 7px 12px 8px; min-width: 150px; transform: rotate(1.5deg); }
.dp-timer-count { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
.dp-timer.dp-waiting .dp-timer-count { font-size: 12px; font-weight: 600; line-height: 1.3; max-width: 150px; margin: 2px auto; }
.dp-timer-done {
  all: unset; cursor: pointer; margin-top: 4px; padding: 2px 10px; border-radius: 999px;
  font: 800 12px/1.4 system-ui, sans-serif; border: 1.5px solid var(--wood-edge); background: #fff8e6;
}
.dp-timer-done:hover { background: #f2994a; }
.dp-timer-done:focus-visible { outline: 2px solid #2b6cb0; outline-offset: 2px; }

/* The red floor button that sends the cat to minimize the window. */
.dp-minbtn {
  all: unset; position: absolute; bottom: 4px; z-index: 1; width: 104px; height: 30px; box-sizing: border-box;
  cursor: pointer; pointer-events: auto; text-align: center;
  font: 800 11px/24px system-ui, sans-serif; letter-spacing: .04em; color: #fff;
  background: #e5484d; border: 2px solid #2b2330; border-radius: 12px 12px 5px 5px;
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.22), 0 3px 6px rgba(0,0,0,.25);
  transform-origin: bottom center; transform: scale(0); visibility: hidden;
  transition: transform .25s cubic-bezier(.3,1.6,.5,1), visibility 0s .25s;
}
.dp-minbtn.dp-show { transform: none; visibility: visible; transition-delay: 0s; }
.dp-minbtn.dp-show:hover { transform: scale(1.05); }
.dp-minbtn.dp-pressed { transform: scale(1.1, .45); transition-duration: .08s; }
.dp-minbtn:focus-visible { outline: 2px solid #2b6cb0; outline-offset: 2px; }
`;
})(globalThis);
