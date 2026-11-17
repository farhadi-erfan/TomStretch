// Character = position/motion in the viewport + a renderer that draws a pose.
//
// Renderer contract (implement this to plug in Rive or sprite sheets):
//   mount(el)            draw yourself inside el
//   setState(name, meta) switch to an animation state from DP.STATES
//   setFacing(dir)       +1 right, -1 left
//   lookAt(lx, ly)       gaze direction, each -1..1
// Optional: setHolding(bool) a paw is up holding a sign; setZoom(scale) the
// character is now drawn this many times its base size.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  class SvgRigRenderer {
    constructor(def) {
      this.def = def;
    }
    mount(el) {
      this.el = el;
      el.insertAdjacentHTML('afterbegin', this.def.svg + (this.def.sideSvg || ''));
      el.querySelector('svg').classList.add('view-front');
    }
    setState(name, meta) {
      this.el.dataset.state = name;
      this.el.dataset.mouth = meta.mouth || 'smile';
      this.el.dataset.view = meta.view === 'side' && this.def.sideSvg ? 'side' : 'front';
    }
    setFacing(dir) {
      this.el.style.setProperty('--dir', dir);
    }
    lookAt(lx, ly) {
      this.el.style.setProperty('--lx', lx.toFixed(2));
      this.el.style.setProperty('--ly', ly.toFixed(2));
    }
  }

  const EASE = {
    linear: (t) => t,
    in: (t) => t * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    inout: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  };

  class Character {
    // x: horizontal centre in viewport px. y: height of the feet above the
    // bottom of the viewport. zoom: scale about the feet (1 = normal).
    constructor(def, parent, renderer) {
      this.def = def;
      this.id = def.id;
      this.x = 0;
      this.y = 0;
      this.zoom = 1;
      this.dir = 1;
      this.state = null;
      this.hidden = false;
      this.gazeLock = false; // true while a routine is directing the eyes
      this.perch = null; // {rectId, dx, top} while sitting on a moving surface
      this.perchLost = false;
      this.el = document.createElement('div');
      this.el.className = 'dp-char';
      this.el.dataset.char = def.id;
      this.el.innerHTML = '<div class="dp-sign"><div class="dp-sign-board"></div><div class="dp-sign-stick"></div></div>';
      this.signEl = this.el.querySelector('.dp-sign');
      this.boardEl = this.el.querySelector('.dp-sign-board');
      this.boardEl.addEventListener('click', () => this._signClick && this._signClick());
      this.el.style.setProperty('--hx', def.hand.x * 100 + '%');
      this.el.style.setProperty('--hy', def.hand.y * 100 + '%');
      this.renderer = renderer || new SvgRigRenderer(def);
      this.renderer.mount(this.el);
      parent.appendChild(this.el);
      this.setScale(1);
      this.setState('idle');
    }

    setScale(scale) {
      this.scale = scale;
      this.w = this.def.width * scale;
      this.h = this.def.height * scale;
      this.el.style.width = this.w + 'px';
      this.el.style.height = this.h + 'px';
      this.setPos(this.x, this.y);
      if (this.renderer.setZoom) this.renderer.setZoom(this.zoom * scale);
    }

    setState(name) {
      if (!DP.STATES[name]) name = 'idle';
      if (name === this.state) return;
      this.state = name;
      this.renderer.setState(name, DP.STATES[name]);
    }

    face(dir) {
      this.dir = dir >= 0 ? 1 : -1;
      this.renderer.setFacing(this.dir);
    }

    setPos(x, y, zoom) {
      this.x = x;
      this.y = y;
      if (zoom != null) this.zoom = zoom;
      const z = this.zoom === 1 ? '' : ` scale(${this.zoom.toFixed(3)})`;
      this.el.style.transform = `translate(${(x - this.w / 2).toFixed(1)}px, ${(-y).toFixed(1)}px)${z}`;
    }

    show() {
      this.hidden = false;
      this.el.classList.remove('dp-hidden');
      if (this.renderer.refresh) this.renderer.refresh();
    }
    hide() {
      this.hidden = true;
      this.el.classList.add('dp-hidden');
      this.hush();
    }

    // Point the eyes at a viewport coordinate (ignored while a routine has
    // locked the gaze).
    lookAt(px, py) {
      if (this.gazeLock) return;
      const hx = this.x;
      const hy = window.innerHeight - this.y - this.h * 0.68;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      this.renderer.lookAt(clamp((px - hx) / 220), clamp((py - hy) / 220));
    }

    // Direct the eyes explicitly: lx, ly in -1..1.
    gaze(lx, ly) {
      this.renderer.lookAt(lx, ly);
    }

    stop() {
      if (this._cancelMove) this._cancelMove();
    }

    // Tween to (x, y). opts: speed (px/s) or duration (ms), arc (px of extra
    // height at mid-flight), ease, zoom (target scale). Resolves when done or
    // superseded.
    moveTo(x, y, opts = {}) {
      this.stop();
      const { speed = 200, arc = 0, ease = 'inout' } = opts;
      const x0 = this.x;
      const y0 = this.y;
      const z0 = this.zoom;
      const z1 = opts.zoom != null ? opts.zoom : z0;
      const dur = opts.duration != null ? opts.duration : Math.max(120, (Math.hypot(x - x0, y - y0) / speed) * 1000);
      if (Math.abs(x - x0) > 2) this.face(x > x0 ? 1 : -1);
      return new Promise((resolve) => {
        const t0 = performance.now();
        let raf = 0;
        let timer = 0;
        let done = false;
        const place = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          const e = EASE[ease](t);
          this.setPos(x0 + (x - x0) * e, y0 + (y - y0) * e + arc * 4 * t * (1 - t), z0 + (z1 - z0) * e);
          return t;
        };
        const finish = (snap) => {
          if (done) return;
          done = true;
          cancelAnimationFrame(raf);
          clearTimeout(timer);
          // Superseded mid-move: stay wherever the clock says we have got to,
          // even if the browser has been stingy with animation frames.
          if (snap) this.setPos(x, y, z1);
          else place(performance.now());
          if (z1 !== z0 && this.renderer.setZoom) this.renderer.setZoom(this.zoom * this.scale);
          this._cancelMove = null;
          resolve();
        };
        const tick = (now) => {
          if (place(now) >= 1) finish(true);
          else raf = requestAnimationFrame(tick);
        };
        // rAF stops in hidden tabs; the timer guarantees scripts never hang.
        timer = setTimeout(() => finish(true), dur + 400);
        this._cancelMove = () => finish(false);
        raf = requestAnimationFrame(tick);
      });
    }

    // Speak by holding up a sign. ms = 0 keeps it up until hush().
    // opts.onClick makes the sign a button; opts.big uses larger lettering.
    say(text, ms = 2600, opts = {}) {
      clearTimeout(this._sayTimer);
      this.boardEl.textContent = text;
      this._signClick = opts.onClick || null;
      this.signEl.classList.toggle('dp-clickable', !!opts.onClick);
      this.signEl.classList.toggle('dp-sign-big', !!opts.big);
      this.signEl.classList.add('dp-show');
      this.el.dataset.sign = '1'; // the rig raises an arm to hold it
      if (this.renderer.setHolding) this.renderer.setHolding(true);

      // Slide the board sideways if it would poke off the screen.
      const half = this.boardEl.offsetWidth / 2;
      const cx = this.x - this.w / 2 + this.def.hand.x * this.w;
      const shift = Math.max(8 - (cx - half), Math.min(0, window.innerWidth - 8 - (cx + half)));
      this.boardEl.style.transform = shift ? `translateX(${shift.toFixed(0)}px)` : '';

      if (ms) this._sayTimer = setTimeout(() => this.hush(), ms);
    }

    hush() {
      clearTimeout(this._sayTimer);
      this._signClick = null;
      this.signEl.classList.remove('dp-show', 'dp-clickable');
      delete this.el.dataset.sign;
      if (this.renderer && this.renderer.setHolding) this.renderer.setHolding(false);
    }
  }

  DP.SvgRigRenderer = SvgRigRenderer;
  DP.Character = Character;
})(globalThis);
