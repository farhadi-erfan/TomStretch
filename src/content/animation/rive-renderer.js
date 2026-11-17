// Rive renderer: draws a character from a .riv file instead of the SVG rig.
// Implements the same contract as SvgRigRenderer (see character.js), so
// scenes, locomotion and the break system do not know the difference.
//
// It is used only when BOTH are present: the Rive runtime (global `rive`) and
// the character's .riv file. Otherwise the SVG rig is used, silently.
//
// What the .riv must contain is documented in assets/rive/README.md. In short:
// one state machine driven by the values below. Each can be either a property
// of the artboard's default view model (Rive's data binding, the current way)
// or a state machine input of the same name (the older way); any that are
// missing are ignored:
//   state    Number   index of the animation state, see DP.RIVE_STATE_IDS
//   dir      Number   +1 heading right, -1 heading left
//   lookX    Number   gaze, -100 (left) .. 100 (right)
//   lookY    Number   gaze, -100 (up) .. 100 (down)
//   holding  Boolean  a paw is raised to hold a sign
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  // The state input's value is the position of the state's name in this list.
  DP.RIVE_STATE_IDS = Object.keys(DP.STATES);

  const MAX_CANVAS = 2048; // px on the long side, however far the cat zooms
  const LOAD_TIMEOUT = 8000; // ms for a .riv to load before giving up on it

  // Both ways of driving a file are supported; don't nag about the older one.
  if (g.rive && g.rive.Rive) g.rive.Rive.suppressDeprecationWarnings = ['state-machine-inputs'];

  class RiveRenderer {
    constructor(def) {
      this.def = def;
      this.inputs = {};
      this.values = {}; // last value asked for, replayed once the file loads
      this.loaded = false;
    }

    mount(el) {
      this.el = el;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'dp-rive';
      // The artboard can be bigger than the character's box (room for tails,
      // squashes and leans): cfg.frame gives the box's place inside it, in
      // artboard units. The canvas is sized and offset so the box lines up.
      const frame = this.def.rive.frame;
      if (frame) {
        const k = 100 / frame.box[0]; // percent of the character's box per artboard unit
        Object.assign(this.canvas.style, {
          position: 'absolute',
          width: frame.width * k + '%',
          height: (frame.height * k * frame.box[0]) / frame.box[1] + '%',
          left: -frame.left * k + '%',
          bottom: '0',
        });
      }
      el.prepend(this.canvas);
      this._resize(1);

      const { rive } = g;
      const cfg = this.def.rive;
      this.rive = new rive.Rive({
        buffer: cfg.buffer,
        canvas: this.canvas,
        artboard: cfg.artboard,
        stateMachine: cfg.stateMachine,
        autoplay: true,
        autoBind: true, // bind the default view model, if the file has one
        layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
        onLoad: () => {
          if (this.fb) return; // already switched to the simple drawing
          clearTimeout(this._loadTimer);
          this.loaded = true;
          this._resize(this.zoom || 1);
          this.vmi = this.rive.viewModelInstance || null;
          try {
            for (const input of this.rive.stateMachineInputs(cfg.stateMachine) || []) this.inputs[input.name] = input;
          } catch (e) {
            /* file uses data binding only */
          }
          for (const name of Object.keys(this.values)) this._set(name, this.values[name]);
        },
        onLoadError: (e) => this._fallBack('could not load ' + cfg.file + ': ' + (e && (e.data || e.type || e))),
      });
      // A file that never finishes loading, or a canvas that stays empty while
      // the pet is on screen (seen on some Windows graphics setups), means
      // the pet would be invisible: switch to the SVG drawing instead.
      this._loadTimer = setTimeout(() => this.loaded || this._fallBack('load timed out'), LOAD_TIMEOUT);
      this._watchBlank();
    }

    _watchBlank() {
      let shown = 0;
      let checks = 0;
      const tick = () => {
        if (this.fb || checks >= 20) return;
        const r = this.el.getBoundingClientRect();
        const onScreen = r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && getComputedStyle(this.el).visibility !== 'hidden';
        shown = this.loaded && onScreen ? shown + 1 : 0;
        if (shown >= 2) {
          // Rive draws with a 2D context here; null means it chose WebGL and
          // its pixels can't be read this way, so trust it.
          checks++;
          let ctx = null;
          try {
            ctx = this.canvas.getContext('2d');
          } catch (e) {
            ctx = null;
          }
          if (!ctx) return;
          const { width: w, height: h } = this.canvas;
          const data = ctx.getImageData(0, 0, w, h).data;
          for (let i = 3; i < data.length; i += 16) if (data[i]) return; // something drawn: fine, stop watching
          if (checks >= 2) return this._fallBack('canvas stayed empty');
        }
        this._blankTimer = setTimeout(tick, 1500);
      };
      this._blankTimer = setTimeout(tick, 1500);
    }

    _fallBack(why) {
      if (this.fb) return;
      console.warn('[DeskPet] Rive art not shown for', this.def.rive.file, '-', why, '- using the simple drawing');
      clearTimeout(this._loadTimer);
      clearTimeout(this._blankTimer);
      try {
        if (this.rive) this.rive.cleanup();
      } catch (e) {
        /* already gone */
      }
      this.canvas.remove();
      this.fb = new DP.SvgRigRenderer(this.def);
      this.fb.mount(this.el);
      const v = this.values;
      if (this._state) this.fb.setState(this._state, DP.STATES[this._state]);
      if ('dir' in v) this.fb.setFacing(v.dir);
      if ('lookX' in v) this.fb.lookAt(v.lookX / 100, v.lookY / 100);
    }

    _set(name, value) {
      this.values[name] = value;
      if (this.fb) return;
      // Data-bound property first, then a state machine input of that name.
      let target = null;
      if (this.vmi) {
        try {
          target = typeof value === 'boolean' ? this.vmi.boolean(name) : this.vmi.number(name);
        } catch (e) {
          target = null;
        }
      }
      target = target || this.inputs[name];
      if (target) target.value = value;
    }

    // Size the drawing surface for the character's current scale, from our own
    // numbers. (Rive's resizeDrawingSurfaceToCanvas measures the canvas on
    // screen instead, which is 0x0 while a pet is off stage: a size change
    // made then left the pet invisible on Windows.)
    _resize(zoom) {
      if (this.fb) return;
      this.zoom = zoom;
      const dpr = g.devicePixelRatio || 1;
      const f = this.def.rive.frame;
      // CSS size of the canvas at zoom 1.
      const w = f ? (this.def.width * f.width) / f.box[0] : this.def.width;
      const h = f ? (this.def.height * f.height) / f.box[1] : this.def.height;
      const k = Math.min(zoom * dpr, MAX_CANVAS / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * k));
      const ch = Math.max(1, Math.round(h * k));
      if (this.canvas.width !== cw) this.canvas.width = cw;
      if (this.canvas.height !== ch) this.canvas.height = ch;
      if (!this.loaded) return;
      this.rive.devicePixelRatioUsed = k / zoom;
      this.rive.resizeToCanvas();
      this.rive.drawFrame();
    }

    // The pet just came on stage: Rive may have re-measured the canvas while
    // it was hidden or appearing, so put our size back once it is laid out.
    refresh() {
      if (this.fb || !this.loaded) return;
      requestAnimationFrame(() => this._resize(this.zoom || 1));
    }

    setState(name, meta) {
      this._state = name;
      if (this.fb) return this.fb.setState(name, meta || DP.STATES[name]);
      this.el.dataset.state = name; // handy for debugging and tests
      this._set('state', DP.RIVE_STATE_IDS.indexOf(name));
    }
    setFacing(dir) {
      if (this.fb) this.fb.setFacing(dir);
      this._set('dir', dir);
    }
    lookAt(lx, ly) {
      if (this.fb) this.fb.lookAt(lx, ly);
      this._set('lookX', lx * 100);
      this._set('lookY', ly * 100);
    }
    // Optional parts of the contract (the SVG rig does these in CSS):
    setHolding(on) {
      this._set('holding', !!on);
    }
    setZoom(zoom) {
      this._resize(zoom);
    }
  }

  // Fetch each character's .riv (if the shell can supply files and the runtime
  // is loaded). Characters without one keep the SVG rig.
  DP.loadRiveAssets = async function () {
    const bridge = g.deskpetBridge;
    if (!g.rive || !bridge || !bridge.readAsset) return;
    for (const def of Object.values(DP.characters)) {
      if (!def.rive) continue;
      try {
        const bytes = await bridge.readAsset(def.rive.file);
        if (bytes) def.rive.buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      } catch (e) {
        /* no file: SVG rig */
      }
    }
  };

  DP.rendererFor = function (def) {
    return g.rive && def.rive && def.rive.buffer ? new RiveRenderer(def) : new DP.SvgRigRenderer(def);
  };

  DP.RiveRenderer = RiveRenderer;
})(globalThis);
