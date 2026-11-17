// The stage is a full-viewport overlay in a shadow root. It ignores pointer
// input (pointer-events: none), so the page underneath stays fully usable;
// only the break panel and minimize button opt back in.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  class Stage {
    constructor() {
      this.host = document.createElement('desk-pet');
      this.host.style.cssText =
        'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
      this.root = this.host.attachShadow({ mode: 'open' });

      const css = [DP.stageCss, DP.rigCss, ...Object.values(DP.characters).map((c) => c.css)].join('\n');
      // Constructable stylesheets are not blocked by the page's CSP.
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      this.root.adoptedStyleSheets = [sheet];

      this.el = document.createElement('div');
      this.el.className = 'dp-stage';
      this.root.appendChild(this.el);
      document.documentElement.appendChild(this.host);
    }

    get vw() {
      return window.innerWidth;
    }
    get vh() {
      return window.innerHeight;
    }

    addCharacter(def) {
      return new DP.Character(def, this.el, DP.rendererFor ? DP.rendererFor(def) : undefined);
    }

    // A little starburst at a viewport point.
    burst(x, y) {
      const el = document.createElement('div');
      el.className = 'dp-burst';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      this.el.appendChild(el);
      setTimeout(() => el.remove(), 700);
    }

    setEnabled(on) {
      this.el.classList.toggle('dp-off', !on);
    }

    setOpacity(v) {
      this.el.style.setProperty('--dp-opacity', v);
    }
  }

  DP.Stage = Stage;
})(globalThis);
