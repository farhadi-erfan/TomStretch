// Tiny synthesized sound effects (no audio assets). Silent unless the user
// raises the volume; also silently does nothing if the page hasn't had a user
// gesture yet (browser autoplay policy).
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  // name -> [startHz, endHz, seconds, waveform]
  const SOUNDS = {
    boing: [220, 640, 0.22, 'sine'],
    squeak: [1300, 1900, 0.09, 'triangle'],
    pop: [520, 260, 0.08, 'sine'],
    click: [180, 90, 0.07, 'square'],
    chime: [660, 990, 0.35, 'sine'],
  };

  let ctx = null;

  DP.sfx = {
    volume: 0,
    play(name) {
      const s = SOUNDS[name];
      if (!s || this.volume <= 0 || document.hidden) return;
      try {
        ctx = ctx || new AudioContext();
        if (ctx.state !== 'running') return;
        const [f0, f1, dur, type] = s;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
        gain.gain.setValueAtTime(this.volume * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
      } catch (e) {
        /* audio is optional */
      }
    },
  };
})(globalThis);
