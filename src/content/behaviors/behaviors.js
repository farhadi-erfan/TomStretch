// Interaction logic: turns sensor events into scripted scenes. The pair does
// not live on screen; they drop in for a scene and leave again. This file
// decides *what* happens and *when*; it only talks to characters through
// setState / say / gaze and moves them through Locomotion (run, jump, climb,
// fall - never float).
//
// Priorities (higher interrupts lower):
//   1 visits (chase, wrong-mouse gag, nap)   1.5 welcome back
//   2 scared by the pointer                  3 break sequence (break-sequence.js)
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const LEAP = 230; // how far above its feet a character can leap at the pointer

  class Behaviors {
    constructor(world) {
      this.w = world;
      this.running = false;
      this.lastGag = 0;
      this.holding = false; // the cat is clinging to the user's pointer
      this.visits = 0;

      const { sensors, director, terrain } = world;
      sensors.on('cursor', (c) => this.onCursor(c));
      sensors.on('shake', () => this.onShake());
      sensors.on('button-click', () => this.onButtonClick());
      sensors.on('return', (e) => this.onReturn(e));
      terrain.on(() => this.onTerrain());
      director.onIdle = () => this.scheduleVisit();
    }

    get chars() {
      return [this.w.cat, this.w.mouse];
    }
    get vw() {
      return window.innerWidth;
    }
    get vh() {
      return window.innerHeight;
    }

    start() {
      if (this.running) return;
      this.running = true;
      for (const c of this.chars) c.hide(); // off-stage until a scene brings them on
      this.scheduleVisit(2500); // say hello soon after launch
    }

    // The visit pace changed in settings: start counting again from now.
    setPace() {
      if (this.running) this.scheduleVisit();
    }

    // Drop-in visits (and the welcome back) are off; they only come for breaks.
    get visitsOff() {
      return !(this.w.settings.visitMinutes > 0);
    }

    stop() {
      this.running = false;
      clearTimeout(this.visitTimer);
      this.w.director.stop();
      this.release();
      for (const c of this.chars) {
        c.stop();
        c.hide();
      }
    }

    // Drop every hold a scene may have left behind (used when one scene
    // interrupts another).
    release() {
      this.holding = false;
      for (const c of this.chars) {
        c.perch = null;
        c.perchLost = false;
        c.gazeLock = false;
        c.hush();
      }
    }

    // Everyone still on stage walks off.
    async leaveStage(s, side, opts) {
      const { loco } = this.w;
      await s.all(this.chars.filter((c) => !c.hidden).map((c) => loco.exit(s, c, side, opts)));
    }

    // ---- scheduling --------------------------------------------------------

    // The gap averages the "Drop by" setting, give or take half of it.
    scheduleVisit(delay = this.w.settings.visitMinutes * 60000 * rand(0.5, 1.5)) {
      clearTimeout(this.visitTimer);
      if (!this.running || this.visitsOff) return;
      this.visitTimer = setTimeout(() => {
        if (document.hidden) return this.scheduleVisit(5000);
        if (!this.play('visit', 1, (s) => this.visit(s))) this.scheduleVisit();
      }, delay);
    }

    // Start a scene; whatever it interrupts gets tidied up first.
    play(name, priority, fn) {
      return this.w.director.play(name, priority, async (s) => {
        this.release();
        try {
          await fn(s);
        } finally {
          this.holding = false;
        }
      });
    }

    async visit(s) {
      // Every launch opens with the cat pouncing on the user's pointer.
      if (this.visits === 0 && this.w.settings.cursorGag && this.w.sensors.cursor.seen) {
        this.visits++;
        return this.hello(s);
      }
      const options = [this.chaseThrough];
      if (this.napSpot()) options.push(this.napVisit, this.napVisit);
      if (this.w.settings.cursorGag && this.cursorReachable() && Date.now() - this.lastGag > 60000) {
        // The headline act: always first, and favoured afterwards.
        if (this.visits === 0) options.length = 0;
        options.push(this.wrongMouse, this.wrongMouse, this.wrongMouse);
      }
      this.visits++;
      await pick(options).call(this, s);
    }

    // ---- scene: a chase that just passes through ---------------------------

    async chaseThrough(s) {
      const { cat, mouse, loco, sfx } = this.w;
      const side = pick([-1, 1]);
      let dir = -side;
      const v = Math.max(560, this.vw / 3.2);
      loco.enter(mouse, side);
      loco.enter(cat, side);
      cat.setPos(cat.x + side * 240, 0);
      sfx.play('squeak');

      // Mostly the chase goes up onto something - a window top, a ledge on
      // screen - and plays out there; sometimes along the bottom.
      const spot = Math.random() < 0.7 ? this.chaseSpot() : null;
      if (spot) return this.chaseAlong(s, spot, -side, v);

      // Whatever is in the way gets hopped over or climbed; if it can't be,
      // the mouse doubles back and the chase goes out the way it came.
      const stopX = this.vw * rand(0.35, 0.65);
      const [mouseOk] = await Promise.all([
        loco.walk(s, mouse, stopX, { speed: v }),
        loco.walk(s, cat, stopX - dir * 210, { speed: v }),
      ]);
      s.check();
      if (!mouseOk) dir = -dir;
      mouse.face(-dir);
      mouse.setState('taunt');
      cat.setState('land');
      await s.wait(1000);
      const getaway = loco.exit(s, mouse, dir, { speed: v * 1.25 }).catch(() => {});
      await loco.jump(s, cat, mouse.x, mouse.y, { windup: 300 });
      cat.setState('confused');
      await s.wait(900);
      await getaway;
      s.check();
      await loco.exit(s, cat, dir, { speed: v });
    }

    // A surface up off the floor with room for a chase: wide enough for both,
    // with headroom, and that they can get onto from the floor.
    chaseSpot() {
      const { cat, terrain, loco } = this.w;
      const floor = terrain.floor();
      const ok = terrain.platforms.filter(
        (p) => p.x2 - p.x1 >= cat.w * 3 && p.top >= 90 && p.top <= this.vh - cat.h - 30 && loco.route(floor, p, cat)
      );
      return ok.length ? pick(ok) : null;
    }

    // The chase on surface p, heading dir: the mouse makes its way up with the
    // cat on its tail, they tear along the top, the mouse stops to taunt, the
    // cat pounces - and the mouse is already off the end and away.
    async chaseAlong(s, p, dir, v) {
      const { cat, mouse, loco } = this.w;
      const m = cat.w * 0.6;
      const from = dir > 0 ? p.x1 + m : p.x2 - m;
      const along = dir > 0 ? rand(0.55, 0.8) : rand(0.2, 0.45); // well past the middle, going their way
      const stopX = clamp(p.x1 + (p.x2 - p.x1) * along, p.x1 + m, p.x2 - m);
      const mouseUp = loco.travel(s, mouse, p, from);
      const catUp = s.wait(450).then(() => loco.travel(s, cat, p, from));
      await mouseUp;
      s.check();
      const catAlong = catUp.then(() => loco.walk(s, cat, clamp(stopX - dir * 180, p.x1 + m, p.x2 - m), { speed: v * 0.85 }));
      await loco.walk(s, mouse, stopX, { speed: v * 0.85 });
      mouse.face(-dir);
      mouse.setState('taunt');
      await catAlong;
      s.check();
      cat.setState('land');
      await s.wait(700);
      // Off the far end and away; the cat lands where it was.
      const getaway = loco.exit(s, mouse, dir, { speed: v * 1.25 }).catch(() => {});
      await s.wait(120);
      await loco.jump(s, cat, mouse.x, p.top, { windup: 300 });
      cat.setState('confused');
      await s.wait(900);
      await getaway;
      s.check();
      await loco.exit(s, cat, dir, { speed: v });
    }

    // ---- scene: the wrong-mouse gag ----------------------------------------

    // Feet height that puts the cat's raised paws on the pointer.
    gripY() {
      const { cat, sensors } = this.w;
      return clamp(this.vh - sensors.cursor.y - cat.h * 0.6, 0, this.vh - cat.h * 0.5);
    }

    // The surface to leap at the pointer from: the highest one under it that
    // is close enough below it. (The floor counts.)
    pointerPerch(c) {
      const { sensors, terrain } = this.w;
      const cur = sensors.cursor;
      const H = this.vh - cur.y;
      const reach = LEAP + c.h * 0.5;
      let best = null;
      for (const p of [terrain.floor(), ...terrain.platforms]) {
        if (cur.x < p.x1 - 200 || cur.x > p.x2 + 200) continue; // a diagonal leap reaches a little sideways
        if (p.top > H - c.h * 0.25 || H - p.top > reach) continue;
        if (!best || p.top > best.top) best = p;
      }
      return best;
    }

    // Close enough to leap at the pointer from where it stands (or clings)?
    canLeapAtPointer(c) {
      const cur = this.w.sensors.cursor;
      const rise = this.vh - cur.y - c.y;
      const footing = this.w.loco.node(c) || c.clinging;
      return !!footing && Math.abs(cur.x - c.x) < 240 && rise > -c.h * 0.3 && rise < LEAP + c.h * 0.5;
    }

    // No surface under the pointer? A vertical edge near it will do: climb it
    // and leap off. Returns {wall, from} - the wall, and the surface at its foot.
    pointerWall(c) {
      const { sensors, terrain, loco } = this.w;
      const cur = sensors.cursor;
      const H = this.vh - cur.y;
      const here = loco.node(c) || terrain.floor();
      let best = null;
      for (const wall of terrain.walls) {
        if (Math.abs(wall.x - cur.x) > 260 || wall.top < H - c.h * 0.4) continue;
        const foot = terrain.below(wall.x, wall.bottom + 2);
        const from = foot.platform || terrain.floor();
        if (wall.bottom > from.top + 220) continue; // can't reach the bottom of it
        const score = Math.abs(wall.x - cur.x) + Math.abs(from.top - here.top) * 0.5;
        if (!best || score < best.score) best = { wall, from, score };
      }
      return best;
    }

    // Is there anywhere to get at the pointer from?
    cursorReachable() {
      const cur = this.w.sensors.cursor;
      return cur.seen && cur.x > 40 && cur.x < this.vw - 40 && !!this.pointerPerch(this.w.mouse);
    }

    // Make its way to a spot it can leap at the pointer from, the way a pet
    // would: along surfaces, up edges, around or over what's in the way.
    // Re-aims when the pointer moves. Resolves whether it got there.
    async approachPointer(s, c, { speed = 480 } = {}) {
      const { sensors, loco } = this.w;
      const cur = sensors.cursor;
      const giveUpAt = Date.now() + 16000;
      c.clinging = false;
      for (let tries = 0; tries < 5 && Date.now() < giveUpAt; tries++) {
        if (this.canLeapAtPointer(c)) return true;
        const perch = this.pointerPerch(c);
        if (!perch) {
          // Up a nearby edge instead.
          const way = this.pointerWall(c);
          if (!way) return false;
          const { wall, from } = way;
          // Climb on the pointer's side of the edge (facing the edge), so the
          // leap pushes off toward the pointer.
          const faceDir = cur.x >= wall.x ? -1 : 1;
          const footX = loco.hugX(c, wall.x, faceDir);
          await loco.travel(s, c, from, footX);
          const H = this.vh - cur.y;
          const toY = clamp(H - c.h * 0.7, wall.bottom + 10, wall.top - c.h * 0.15);
          await loco.climbWall(s, c, wall.x, wall.bottom, toY, faceDir);
          c.clinging = true;
          continue;
        }
        const side = cur.x >= c.x ? 1 : -1;
        const m = perch.kind === 'floor' ? c.w / 2 : Math.min(c.w * 0.4, (perch.x2 - perch.x1) / 2);
        const x = clamp(cur.x - side * 70, perch.x1 + m, perch.x2 - m);
        const here = loco.node(c);
        if (here && here.id === perch.id) {
          const ok = await loco.walk(s, c, x, { speed });
          if (!ok) {
            // Blocked: turn back and look for another way up.
            c.face(-side);
            await s.wait(300);
            await loco.travel(s, c, perch, x);
          }
        } else {
          await loco.travel(s, c, perch, x);
        }
      }
      return this.canLeapAtPointer(c);
    }

    // They tear in mid-chase. The mouse makes its way up to the user's pointer
    // and leaps for it, bonks into it and tumbles away; the cat, a beat
    // behind, grabs the pointer instead, clings on, realises, and drops off.
    async wrongMouse(s) {
      const { cat, mouse, sensors, loco, sfx, stage } = this.w;
      const cur = sensors.cursor;
      this.lastGag = Date.now();
      const side = cur.x > this.vw / 2 ? -1 : 1; // come in from the far side
      const v = Math.max(520, this.vw / 3.4);

      loco.enter(mouse, side);
      loco.enter(cat, side);
      cat.setPos(cat.x + side * 250, 0);
      sfx.play('squeak');

      // Both head for the pointer; the cat stays a little behind.
      const catWay = s.wait(600).then(() => this.approachPointer(s, cat, { speed: v * 0.9 }));
      const mouseThere = await this.approachPointer(s, mouse, { speed: v });

      if (!mouseThere) {
        // Out of reach: look up at it, then give up.
        mouse.face(cur.x >= mouse.x ? 1 : -1);
        mouse.setState('look');
        await catWay.catch(() => {});
        s.check();
        cat.setState('confused');
        await s.wait(1600);
        return this.leaveStage(s, side < 0 ? 1 : -1);
      }

      // The mouse leaps... straight into the pointer.
      const H = this.vh - cur.y;
      mouse.face(cur.x >= mouse.x ? 1 : -1);
      mouse.setState('crouch');
      await s.wait(260);
      mouse.setState('pounce');
      sfx.play('boing');
      await s.move(mouse, cur.x, Math.max(mouse.y, H - mouse.h * 0.5), { duration: clamp(240 + (H - mouse.y) * 0.4, 260, 520), ease: 'out' });
      mouse.clinging = false;
      stage.burst(cur.x, cur.y);
      sfx.play('pop');
      mouse.gazeLock = true;
      mouse.gaze(0, 0);
      mouse.setState('hang');
      await s.wait(600); // nose to nose with the pointer for a moment

      // It drops and scurries off; the cat goes for the wrong one.
      mouse.gazeLock = false;
      const away = side < 0 ? 1 : -1;
      const getaway = (async () => {
        await loco.fall(s, mouse);
        await loco.exit(s, mouse, away, { speed: v * 1.2 });
      })().catch(() => {});

      await catWay.catch(() => {});
      s.check();
      if (!this.canLeapAtPointer(cat)) await this.approachPointer(s, cat, { speed: v });
      cat.face(cur.x >= cat.x ? 1 : -1);
      cat.setState('crouch');
      await s.wait(420);
      cat.setState('pounce');
      sfx.play('boing');
      const rise = this.gripY() - cat.y;
      await s.move(cat, cur.x, this.gripY(), { duration: clamp(280 + rise * 0.4, 300, 600), arc: 30, ease: 'out' });

      cat.clinging = false;
      // Got it. It hangs on wherever the pointer goes.
      this.holding = true;
      cat.setState('grab');
      await s.wait(2000);
      cat.setState('confused');
      cat.say('?', 1100);
      await s.wait(1400);
      this.holding = false;
      await loco.fall(s, cat); // onto whatever is underneath
      cat.setState('embarrassed');
      cat.say('Oops.', 1800);
      await s.wait(2000);
      await getaway;
      s.check();
      await loco.exit(s, cat, away, { speed: v });
    }

    // ---- scene: hello (the first thing after launch) ----------------------

    // The cat bursts in and pounces on the user's pointer: up whatever it
    // takes to get within reach, then a leap and a hug. If the pointer is out
    // of reach it jumps for it anyway, falls short, and shrugs it off.
    async hello(s) {
      const { cat, sensors, loco, sfx } = this.w;
      const cur = sensors.cursor;
      this.lastGag = Date.now();
      const side = cur.x > this.vw / 2 ? -1 : 1; // come in from the far side
      const v = Math.max(560, this.vw / 3.2);
      loco.enter(cat, side);
      sfx.play('chime');

      const there = await this.approachPointer(s, cat, { speed: v });
      cat.face(cur.x >= cat.x ? 1 : -1);
      cat.setState('crouch');
      await s.wait(380);
      cat.setState('pounce');
      sfx.play('boing');

      if (there) {
        const rise = this.gripY() - cat.y;
        await s.move(cat, cur.x, this.gripY(), { duration: clamp(280 + rise * 0.4, 300, 600), arc: 30, ease: 'out' });
        cat.clinging = false;
        this.holding = true; // hangs on wherever the pointer goes
        cat.setState('grab');
        cat.say('Hi!', 1600);
        await s.wait(2200);
        this.holding = false;
        await loco.fall(s, cat);
        cat.setState('cheer');
        await s.wait(900);
      } else {
        // Can't get up there: a hopeful jump straight at it, and down again.
        const top = Math.min(this.vh - cur.y - cat.h * 0.6, cat.y + LEAP);
        await s.move(cat, cat.x + clamp(cur.x - cat.x, -120, 120), Math.max(cat.y, top), { duration: 380, ease: 'out' });
        await loco.fall(s, cat);
        cat.face(cur.x >= cat.x ? 1 : -1);
        cat.setState('look');
        cat.say('Hi!', 1600);
        await s.wait(1800);
      }
      s.check();
      await loco.exit(s, cat, cur.x > cat.x ? -1 : 1, { speed: v * 0.8 });
    }

    // ---- scene: a nap on top of something ----------------------------------

    // A ledge worth napping on: wide enough, off the floor, with headroom.
    napSpot() {
      const { cat, terrain } = this.w;
      return terrain.platforms.find((p) => p.x2 - p.x1 >= cat.w * 1.6 && p.top >= 90 && p.top <= this.vh - cat.h - 24) || null;
    }

    // Tie a character to the surface it is on, so it rides along when that
    // surface moves (see onTerrain).
    perchOn(c, p) {
      c.perch = { rectId: p.rectId, kind: p.kind, dx: c.x - p.rect.left, top: p.rect.top };
      c.perchLost = false;
    }

    async napVisit(s) {
      const { cat, loco } = this.w;
      const p = this.napSpot();
      if (!p) return this.chaseThrough(s);
      const side = pick([-1, 1]);
      loco.enter(cat, side);
      await loco.travel(s, cat, p, rand(p.x1 + cat.w, p.x2 - cat.w));
      cat.setState('look');
      await s.wait(1000);
      cat.setState('sleep');
      this.perchOn(cat, this.w.terrain.standingOn(cat.x, cat.y) || p);

      const until = Date.now() + rand(40000, 80000);
      while (Date.now() < until) {
        await s.wait(200);
        if (cat.perchLost) {
          // The floor moved away while it slept.
          await this.airFall(s, cat);
          await s.wait(500);
          return loco.exit(s, cat);
        }
      }
      cat.hush();
      cat.perch = null;
      cat.setState('ex-overhead'); // a good stretch
      await s.wait(2200);
      await loco.exit(s, cat);
    }

    // The old cartoon rule: you don't fall until you look down.
    async airFall(s, c) {
      const { loco } = this.w;
      c.perch = null;
      c.perchLost = false;
      c.hush();
      c.gazeLock = true;
      try {
        c.setState('hang');
        c.gaze(0, 0);
        await s.wait(380);
        c.gaze(-1, 0); // look left
        await s.wait(480);
        c.gaze(1, 0); // look right
        await s.wait(480);
        c.gaze(0, 1); // look down
        await s.wait(650);
        c.gaze(0, 0);
        c.setState('wave'); // bye-bye
        await s.wait(550);
        c.hush();
        await loco.fall(s, c);
        c.setState('confused');
        await s.wait(1000);
      } finally {
        c.gazeLock = false;
      }
    }

    // Surfaces changed (a window was dragged, the page scrolled). Perched
    // characters ride along sideways and upward; if their surface drops away
    // or disappears, they are left standing on nothing.
    onTerrain() {
      const { terrain } = this.w;
      for (const c of this.chars) {
        const perch = c.perch;
        if (!perch) continue;
        if (perch.kind === 'ledge') {
          // Seen ledges have no identity; it is still there if one is under the feet.
          const p = terrain.standingOn(c.x, c.y);
          if (!p) {
            c.perch = null;
            c.perchLost = true;
          }
          continue;
        }
        const r = terrain.rect(perch.rectId);
        if (!r || r.top - perch.top > 14) {
          c.perch = null;
          c.perchLost = true;
        } else {
          perch.top = r.top;
          c.setPos(r.left + perch.dx, this.vh - r.top);
        }
      }
    }

    // ---- reactions ---------------------------------------------------------

    onCursor(c) {
      if (!this.running) return;
      const { cat } = this.w;
      if (this.holding) cat.setPos(clamp(c.x, 0, this.vw), this.gripY());
      // The eyes stay on the viewer rather than chasing the pointer.
    }

    // The user shook the pointer (which makes it balloon on macOS): terror.
    onShake() {
      if (!this.running || this.chars.every((c) => c.hidden)) return;
      const { sensors, loco, sfx } = this.w;
      this.play('scared', 2, async (s) => {
        const here = this.chars.filter((c) => !c.hidden);
        for (const c of here) {
          c.stop();
          c.face(sensors.cursor.x >= c.x ? 1 : -1);
          c.setState('startled');
        }
        sfx.play('squeak');
        await s.wait(560);
        for (const c of here) c.setState('scared');
        await s.wait(1300);
        // Bolt for whichever side is away from the pointer.
        await s.all(here.map((c) => loco.exit(s, c, sensors.cursor.x > c.x ? -1 : 1, { speed: 900 })));
      });
    }

    // Extension: a click on a page button makes a sleeping cat flinch.
    onButtonClick() {
      const { cat, settings } = this.w;
      if (!this.running || !settings.buttonReactions || cat.hidden || cat.state !== 'sleep') return;
      cat.setState('startled');
      setTimeout(() => {
        if (cat.state === 'startled' && cat.perch) cat.setState('sleep');
      }, 900);
    }

    onReturn({ awayMs }) {
      if (!this.running || this.visitsOff || awayMs < 4000) return;
      const { cat, loco, sfx } = this.w;
      this.play('welcome', 1.5, async (s) => {
        if (cat.hidden) {
          const side = pick([-1, 1]);
          loco.enter(cat, side);
          await loco.run(s, cat, side < 0 ? 150 : this.vw - 150, { speed: 480, ease: 'out' });
        } else {
          cat.stop();
        }
        cat.setState('wave');
        cat.say('Hi!', 1800);
        sfx.play('chime');
        await s.wait(2600);
        await this.leaveStage(s);
      });
    }
  }

  DP.Behaviors = Behaviors;
})(globalThis);
