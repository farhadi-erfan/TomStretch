// The director runs one scripted routine at a time. A routine is an async
// function that receives a script handle `s`; every `await s.wait()` /
// `await s.move()` is a cancellation point, so a higher-priority routine can
// take over cleanly mid-gag.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const CANCELLED = Symbol('cancelled');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class Director {
    constructor() {
      this.gen = 0;
      this.name = null;
      this.priority = -1;
      this.onIdle = null; // called when a routine finishes with nothing queued
    }

    // Starts the routine unless something of equal or higher priority is
    // already playing. Returns whether it started.
    play(name, priority, fn) {
      if (this.name && priority <= this.priority) return false;
      const gen = ++this.gen;
      this.name = name;
      this.priority = priority;

      const s = {
        check: () => {
          if (gen !== this.gen) throw CANCELLED;
        },
        wait: async (ms) => {
          await sleep(ms);
          s.check();
        },
        move: async (character, x, y, opts) => {
          await character.moveTo(x, y, opts);
          s.check();
        },
        all: async (promises) => {
          await Promise.all(promises);
          s.check();
        },
      };

      (async () => {
        try {
          await fn(s);
        } catch (e) {
          if (e !== CANCELLED) console.warn('[DeskPet] routine failed:', name, e);
        }
        if (gen === this.gen) {
          this.name = null;
          this.priority = -1;
          if (this.onIdle) this.onIdle();
        }
      })();
      return true;
    }

    // Cancel whatever is playing.
    stop() {
      this.gen++;
      this.name = null;
      this.priority = -1;
    }
  }

  DP.Director = Director;
  DP.sleep = sleep;
})(globalThis);
