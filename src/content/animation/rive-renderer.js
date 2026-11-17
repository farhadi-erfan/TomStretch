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
          this.loaded = true;
          this.rive.resizeDrawingSurfaceToCanvas();
          this.vmi = this.rive.viewModelInstance || null;
          try {
            for (const input of this.rive.stateMachineInputs(cfg.stateMachine) || []) this.inputs[input.name] = input;
          } catch (e) {
            /* file uses data binding only */
          }
          for (const name of Object.keys(this.values)) this._set(name, this.values[name]);
        },
        onLoadError: (e) => console.warn('[DeskPet] could not load', cfg.file, e),
      });
    }

    _set(name, value) {
      this.values[name] = value;
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

    // Keep the drawing sharp when the character is scaled up (the break lunge).
    _resize(zoom) {
      const dpr = g.devicePixelRatio || 1;
      const f = this.def.rive.frame;
      // CSS size of the canvas at zoom 1.
      const w = f ? (this.def.width * f.width) / f.box[0] : this.def.width;
      const h = f ? (this.def.height * f.height) / f.box[1] : this.def.height;
      const k = Math.min(zoom * dpr, MAX_CANVAS / Math.max(w, h));
      this.canvas.width = Math.round(w * k);
      this.canvas.height = Math.round(h * k);
      if (this.loaded) this.rive.resizeDrawingSurfaceToCanvas();
    }

    setState(name) {
      this.el.dataset.state = name; // handy for debugging and tests
      this._set('state', DP.RIVE_STATE_IDS.indexOf(name));
    }
    setFacing(dir) {
      this._set('dir', dir);
    }
    lookAt(lx, ly) {
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
