// Sensors observe the user's environment and emit plain events. They are
// strictly read-only: passive capture listeners, no preventDefault, no
// synthetic clicks, no reading of form values.
//
// Events:
//   cursor        {x, y}
//   shake         the pointer was shaken hard (macOS enlarges it)
//   button-hover  {rect}
//   button-click  {rect}
//   away          {hidden}            tab hidden or window lost focus
//   return        {awayMs, wasHidden}
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const BUTTON_SELECTOR =
    'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], summary';

  class Sensors {
    // opts.external: input is injected (desktop app) instead of read from the DOM.
    constructor(ownHost, opts = {}) {
      this.ownHost = ownHost;
      this.listeners = {};
      this.cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2, seen: false };
      this.away = opts.external ? false : this._isAway();
      this.awaySince = 0;
      this.wasHidden = false;
      this._hovered = null;
      this._trail = []; // recent pointer samples, for shake detection
      this._lastShake = 0;

      if (opts.external) return;
      const listen = { capture: true, passive: true };
      window.addEventListener('mousemove', (e) => this._onMove(e), listen);
      window.addEventListener('mouseover', (e) => this._onOver(e), listen);
      window.addEventListener('click', (e) => this._onClick(e), listen);
      document.addEventListener('visibilitychange', () => this._onPresence());
      window.addEventListener('blur', () => this._onPresence());
      window.addEventListener('focus', () => this._onPresence());
    }

    on(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    }

    _emit(type, data) {
      for (const fn of this.listeners[type] || []) {
        try {
          fn(data);
        } catch (e) {
          console.warn('[DeskPet]', e);
        }
      }
    }

    // Several quick left-right reversals over a long path = a shake.
    _trackShake(x, y) {
      const now = performance.now();
      const trail = this._trail;
      trail.push({ x, y, t: now });
      while (trail.length && now - trail[0].t > 700) trail.shift();
      if (now - this._lastShake < 3000 || trail.length < 6) return;
      let reversals = 0;
      let dist = 0;
      let heading = 0;
      for (let i = 1; i < trail.length; i++) {
        const dx = trail[i].x - trail[i - 1].x;
        dist += Math.abs(dx) + Math.abs(trail[i].y - trail[i - 1].y);
        const sign = Math.abs(dx) > 6 ? Math.sign(dx) : 0;
        if (sign && sign !== heading) {
          if (heading) reversals++;
          heading = sign;
        }
      }
      if (reversals >= 4 && dist > 900) {
        this._lastShake = now;
        this._trail = [];
        this._emit('shake', {});
      }
    }

    _onMove(e) {
      this.cursor.movedAt = Date.now();
      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
      this.cursor.seen = true;
      this._trackShake(e.clientX, e.clientY);
      if (this._moveQueued) return;
      this._moveQueued = true;
      requestAnimationFrame(() => {
        this._moveQueued = false;
        this._emit('cursor', this.cursor);
      });
    }

    // Events from our own shadow DOM are retargeted to the host element.
    _button(e) {
      const t = e.target;
      if (!t || t === this.ownHost || !t.closest) return null;
      return t.closest(BUTTON_SELECTOR);
    }

    _onOver(e) {
      const btn = this._button(e);
      if (btn === this._hovered) return;
      this._hovered = btn;
      if (btn) this._emit('button-hover', { rect: btn.getBoundingClientRect() });
    }

    _onClick(e) {
      const btn = this._button(e);
      if (btn) this._emit('button-click', { rect: btn.getBoundingClientRect() });
    }

    _isAway() {
      return document.hidden || !document.hasFocus();
    }

    // External input (desktop app).
    injectCursor(x, y) {
      if (x !== this.cursor.x || y !== this.cursor.y) this.cursor.movedAt = Date.now();
      this.cursor.x = x;
      this.cursor.y = y;
      this.cursor.seen = true;
      this._trackShake(x, y);
      this._emit('cursor', this.cursor);
    }

    setAway(away) {
      this._setAway(!!away, false);
    }

    _onPresence() {
      this._setAway(this._isAway(), document.hidden);
    }

    _setAway(away, hidden) {
      if (away) this.wasHidden = this.wasHidden || hidden;
      if (away === this.away) return;
      this.away = away;
      if (away) {
        this.awaySince = Date.now();
        this.wasHidden = hidden;
        this._emit('away', { hidden });
      } else {
        this._emit('return', { awayMs: Date.now() - this.awaySince, wasHidden: this.wasHidden });
      }
    }
  }

  DP.Sensors = Sensors;
})(globalThis);
