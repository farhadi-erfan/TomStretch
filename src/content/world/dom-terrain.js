// Extension only: turns the visible elements of the page into terrain, so the
// characters can stand on buttons, images, headings and so on. Read-only: it
// measures elements and never touches them.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const SELECTOR =
    'button,[role="button"],input:not([type="hidden"]),select,textarea,img,video,canvas,h1,h2,h3,pre,table,figure,blockquote';
  const MAX_SCANNED = 500;
  const MAX_RECTS = 40;

  class DomTerrain {
    constructor(terrain) {
      this.terrain = terrain;
      this.ids = new WeakMap();
      this.next = 1;
      this.queued = false;
      const queue = () => {
        if (this.queued) return;
        this.queued = true;
        setTimeout(() => {
          this.queued = false;
          this.scan();
        }, 90);
      };
      window.addEventListener('scroll', queue, { capture: true, passive: true });
      window.addEventListener('resize', queue, { passive: true });
      setInterval(queue, 2500); // pages change under us
      queue();
    }

    scan() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rects = [];
      const els = document.querySelectorAll(SELECTOR);
      for (let i = 0; i < els.length && i < MAX_SCANNED && rects.length < MAX_RECTS; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.width < 90 || r.height < 18) continue;
        if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
        if (r.width > vw * 0.9 && r.height > vh * 0.6) continue; // page-sized, not a ledge
        let id = this.ids.get(el);
        if (!id) this.ids.set(el, (id = 'el' + this.next++));
        rects.push({ id, left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      }
      this.terrain.setLayer('elements', rects);
    }
  }

  DP.DomTerrain = DomTerrain;
})(globalThis);
