// The break sequence. The chase ends with the cat out of steam on top of the
// working window's minimize button (or hanging off it), and holds up a sign:
// "Take a break?" Yes / Snooze / No. Yes: it stomps the button, the window goes, the cat
// drops with it, pulls out the plan and does it - two exercises, about 45
// seconds in all - with the user, then cheers and leaves.
//
// Where there is no real button to stand on (the Chrome extension, Windows),
// a red stand-in button on the floor plays its part.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const UNANSWERED_MS = 3 * 60 * 1000; // an ignored invitation snoozes itself
  const BREAK_SECONDS = 45; // the two exercises together
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (ms) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };

  // Messages to the background (service worker / desktop main). Never throws.
  async function send(msg) {
    try {
      return await chrome.runtime.sendMessage(msg);
    } catch (e) {
      return null;
    }
  }

  class BreakSequence {
    constructor(world) {
      this.w = world;
      this.st = null; // live state of the running break, or null
      this.lastExercise = null;
      this._buildUi();
      world.sensors.on('return', (e) => {
        if (e.wasHidden) this.onReturn();
      });
    }

    get active() {
      return !!this.st;
    }
    get vw() {
      return window.innerWidth;
    }
    get vh() {
      return window.innerHeight;
    }

    // Props planted beside the cat: the timer board, and (extension only)
    // the red stand-in for the window's minimize button.
    _buildUi() {
      const stage = this.w.stage.el;
      this.minBtn = document.createElement('button');
      this.minBtn.className = 'dp-minbtn';
      this.minBtn.dataset.act = 'minimize';
      this.minBtn.textContent = 'MINIMIZE';
      this.minBtn.title = 'Send the cat to minimize this window';
      this.timerEl = document.createElement('div');
      this.timerEl.className = 'dp-timer';
      this.timerEl.innerHTML = `
        <div class="dp-board">
          <div class="dp-board-name"></div>
          <div class="dp-timer-count"></div>
          <button class="dp-timer-done" data-act="done">Done</button>
        </div>`;
      stage.append(this.timerEl, this.minBtn);

      this.ui = {
        timerName: this.timerEl.querySelector('.dp-board-name'),
        timerCount: this.timerEl.querySelector('.dp-timer-count'),
        timerDone: this.timerEl.querySelector('.dp-timer-done'),
      };
      this.timerEl.addEventListener('click', (e) => {
        const el = e.target.closest && e.target.closest('[data-act]');
        if (el) this.onAction(el.dataset.act);
      });
      const onClick = (e) => {
        const el = e.target.closest && e.target.closest('[data-act]');
        if (el) this.onAction(el.dataset.act);
      };
      this.minBtn.addEventListener('click', onClick);
    }

    onAction(act) {
      const st = this.st;
      if (!st) return;
      if (act === 'done') st.done = true;
      if (act === 'minimize') act = 'start'; // pressing the red button yourself = rest
      if (st.choose && (act === 'start' || act === 'snooze' || act === 'skip')) st.choose(act);
    }

    // Extension: the user restored the minimized browser window.
    onReturn() {
      if (this.st && this.st.awaitingReturn) {
        this.st.awaitingReturn = false;
        this.st.returned = true;
      }
    }

    // Two different exercises: one for the neck (when any is enabled) and one
    // other, avoiding a repeat of last break's where there is a choice.
    pickExercises() {
      const enabled = DP.exercises.filter((e) => this.w.settings.exercises[e.id]);
      const pool = enabled.length ? enabled : DP.exercises;
      const last = this.lastExercises || [];
      const take = (list) => {
        const fresh = list.filter((e) => !last.includes(e.id));
        const from = fresh.length ? fresh : list;
        return from[Math.floor(Math.random() * from.length)];
      };
      const neck = pool.filter((e) => e.neck);
      const first = neck.length ? take(neck) : take(pool);
      const rest = pool.filter((e) => e !== first);
      const second = rest.length ? take(rest.filter((e) => !e.neck).length ? rest.filter((e) => !e.neck) : rest) : first;
      const plan = Math.random() < 0.5 ? [first, second] : [second, first];
      this.lastExercises = plan.map((e) => e.id);
      return plan;
    }

    start() {
      if (this.active || !this.w.settings.enabled) return false;
      return this.w.director.play('break', 3, async (s) => {
        this.w.behaviors.release();
        try {
          await this.run(s);
        } finally {
          const { cat } = this.w;
          this.hideChoice();
          this.hideTimer();
          this.minBtn.classList.remove('dp-show', 'dp-pressed');
          cat.gazeLock = false;
          cat.clinging = false;
          this.hanging = false;
          if (cat.zoom !== 1) cat.setPos(cat.x, 0, 1);
          this.st = null;
        }
      });
    }

    // Plant a prop on the roomier side of the cat, on whatever it stands on
    // (the floor, or the top of the window).
    _place(el, width) {
      const { cat } = this.w;
      const right = cat.x + cat.w * 0.7;
      const left = cat.x - cat.w * 0.7 - width;
      el.style.left = Math.round(right + width < this.vw - 12 || left < 12 ? right : left) + 'px';
      // Beside a cat hanging off a button, a prop hangs from the top edge.
      el.classList.toggle('dp-hung', !!this.hanging);
      el.style.bottom = this.hanging ? 'auto' : Math.round(clamp(cat.y, 0, this.vh - 170)) + 'px';
      el.style.top = this.hanging ? '0px' : 'auto';
    }

    // The question, on the sign the cat holds up.
    showChoice(plan) {
      const { cat, settings } = this.w;
      cat.say('Take a break?', 0, {
        choices: [
          { act: 'start', label: 'Yes', primary: true, title: `${plan.map((e) => e.name).join(' + ')}, ${BREAK_SECONDS} seconds` },
          { act: 'snooze', label: 'Snooze', title: `Ask again in ${settings.snoozeMinutes} min` },
          { act: 'skip', label: 'No', title: 'Skip this break' },
        ],
        onChoose: (act) => this.onAction(act),
      });
    }

    hideChoice() {
      this.w.cat.hush();
    }

    // The timer board: the exercise and time left (or a note while waiting).
    showTimer(ex, text, waiting = false) {
      this.ui.timerName.textContent = ex.name;
      this.ui.timerName.title = ex.how;
      this.ui.timerCount.textContent = text;
      this.timerEl.classList.toggle('dp-waiting', waiting);
      if (!this.timerEl.classList.contains('dp-show')) {
        this.timerEl.classList.add('dp-show');
        this._place(this.timerEl, this.timerEl.offsetWidth || 190);
      }
    }

    hideTimer() {
      this.timerEl.classList.remove('dp-show');
    }

    async run(s) {
      const { cat, loco, sfx, behaviors } = this.w;
      const plan = this.pickExercises();
      const st = (this.st = { minimized: false, awaitingReturn: false, returned: false, done: false, choose: null });

      // 1. Where is the working window's minimize button? (desktop app)
      const loc = await send({ type: 'LOCATE_MINIMIZE' });
      s.check();
      const real = loc && loc.ok ? loc : null;

      // 2. The chase comes through and the cat runs out of steam on top of
      //    the button (or the stand-in), panting.
      this.hanging = false;
      const perched = await this.arrive(s, real);
      if (!this.hanging) {
        cat.setState('tired');
        await s.wait(1400);
        cat.face(1);
        cat.setState('idle');
      }
      sfx.play('chime');
      await s.wait(500);

      // 3. Take a break? Asked on the sign it holds up.
      this.showChoice(plan);
      const choice = await Promise.race([
        new Promise((resolve) => (st.choose = resolve)),
        DP.sleep(UNANSWERED_MS).then(() => 'snooze'),
      ]);
      st.choose = null;
      s.check();
      this.hideChoice();

      if (choice === 'snooze' || choice === 'skip') {
        // Snooze: ask again soon. No: skip this one; the next comes a full
        // interval from now.
        await send({ type: choice === 'snooze' ? 'SNOOZE' : 'BREAK_DONE' });
        if (!this.hanging) cat.setState('wave');
        cat.say(choice === 'snooze' ? 'Later, then.' : 'Okay.', 1600);
        await s.wait(1800);
        this.minBtn.classList.remove('dp-show');
        if (this.hanging) {
          cat.clinging = false;
          await loco.fall(s, cat);
        }
        return behaviors.leaveStage(s);
      }

      // 4. Stomp. The window goes, and the cat goes down with it.
      if (real) st.minimized = await this.stompReal(s, real, perched);
      else if (DP.desktop) {
        // No window was in front when it came: look again now.
        const again = await send({ type: 'LOCATE_MINIMIZE' });
        s.check();
        if (again && again.ok) {
          const onTop = await this.goToButton(s, again, again.x < cat.x ? 1 : -1);
          st.minimized = await this.stompReal(s, again, onTop);
        } else {
          await this.say(s, (again && again.hint) || (loc && loc.hint) || 'Click a window first');
        }
      } else st.minimized = await this.stompStandIn(s);

      // 5. It pulls out the plan and does it with you. The clock starts now,
      //    after the trip; wall-clock time, so it stays right while hidden.
      await this.takeOut(s, plan[0]);
      const split = [Math.ceil(BREAK_SECONDS / 2), Math.floor(BREAK_SECONDS / 2)];
      for (let i = 0; i < plan.length && !st.done; i++) {
        const ex = plan[i];
        if (i > 0) {
          cat.setState('idle');
          this.showTimer(ex, 'next', true);
          await s.wait(900);
        }
        cat.setState(ex.state);
        let endAt = Date.now() + split[i] * 1000;
        while (Date.now() < endAt && !st.done) {
          this.showTimer(ex, fmt(endAt - Date.now()));
          if (st.returned) {
            const t0 = Date.now();
            await this.welcomeBack(s, ex);
            endAt += Date.now() - t0;
          }
          await s.wait(250);
        }
      }

      // 6. If the user is still away (extension), wait before celebrating.
      while (document.hidden) await s.wait(500);
      if (st.returned) await this.welcomeBack(s, null);
      this.hideTimer();
      cat.setState('cheer');
      cat.say('Nice.', 1800);
      sfx.play('chime');
      await send({ type: 'BREAK_DONE' });
      await s.wait(2400);
      await behaviors.leaveStage(s);
    }

    // ---- getting there -------------------------------------------------------

    // Chase in. With a real button: the mouse leads the way up to the top of
    // the window and off again; the cat gets as far as the button and stops
    // there. Resolves true if the cat is standing on it (false: no walkable
    // top - a maximised window - so it waits underneath and climbs later).
    // Without one: across the floor, onto the red stand-in.
    async arrive(s, loc) {
      const { cat, mouse, loco, sfx, terrain } = this.w;
      const v = Math.max(560, this.vw / 3);
      const side = loc ? (loc.x < this.vw / 2 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
      if (cat.hidden) {
        loco.enter(mouse, side);
        loco.enter(cat, side);
        cat.setPos(cat.x + side * 230, 0);
        sfx.play('squeak');
      } else {
        await loco.descend(s, cat);
      }

      if (loc) return this.goToButton(s, loc, side);

      if (!mouse.hidden) loco.exit(s, mouse, -side, { speed: v * 1.15 }).catch(() => {});
      const cx = this.vw / 2;
      await loco.run(s, cat, cx + side * 90, { speed: v, ease: 'out' });
      // Desktop: no window to aim at yet; it asks from the floor and looks
      // again when the answer is Rest. Extension: the window's own button is
      // out of reach, so a red stand-in pops up and the cat hops onto it.
      if (DP.desktop) return false;
      this.btnX = cx;
      this.minBtn.style.left = this.btnX - 52 + 'px';
      this.minBtn.classList.remove('dp-pressed');
      this.minBtn.classList.add('dp-show');
      await s.wait(300);
      await loco.jump(s, cat, this.btnX, 26, { windup: 220, arc: 60 });
      cat.setPos(this.btnX, 26);
      return true;
    }

    // Up onto the window's minimize button: along the window's top if it has
    // one to stand on (the mouse leading the way), else up an edge to hang off
    // the button itself. Resolves true if standing on it, false if hanging.
    async goToButton(s, loc, side = 1) {
      const { cat, mouse, loco, terrain } = this.w;
      const v = Math.max(560, this.vw / 3);
      {
        const top = this.buttonTop(loc);
        if (top) {
          // The mouse scampers up there first and away along the top...
          if (!mouse.hidden) {
            (async () => {
              await loco.travel(s, mouse, top, loc.x);
              await loco.exit(s, mouse, -side, { speed: v * 1.15 });
            })().catch(() => {});
          }
          await s.wait(500);
          // ...the cat follows as far as the button and gives up there.
          await loco.travel(s, cat, top, loc.x);
          cat.face(-side);
          return true;
        }
        // No top to stand on (a window filling the screen): up the window's
        // side, or the screen's edge, and hang off the button itself.
        if (!mouse.hidden) loco.exit(s, mouse, -side, { speed: v * 1.15 }).catch(() => {});
        const rect = terrain.rectAt(loc.x, loc.y);
        const buttonH = clamp(this.vh - loc.y - cat.h * 0.6, 0, this.vh - cat.h * 0.5); // paws on the button
        const windowSide = rect && loco.hugX(cat, rect.left, 1) >= cat.w / 2;
        if (windowSide) await loco.climbWall(s, cat, rect.left, Math.max(0, this.vh - rect.bottom), buttonH, 1);
        else await loco.climbWall(s, cat, 0, 0, buttonH, -1); // up the screen's own left edge
        cat.setState('pounce');
        await s.move(cat, clamp(loc.x, cat.w / 2, this.vw - cat.w / 2), buttonH, { duration: 300, arc: 24 });
        cat.clinging = true;
        cat.setState('grab');
        this.hanging = true;
        return false;
      }
    }

    // The window top the minimize button sits on, if it is walkable.
    buttonTop(loc) {
      const { terrain } = this.w;
      const rect = terrain.rectAt(loc.x, loc.y);
      return (rect && terrain.platforms.find((p) => p.rectId === rect.id && loc.x >= p.x1 - 20 && loc.x <= p.x2 + 20)) || null;
    }

    // ---- the minimize interaction ------------------------------------------

    // Desktop: stomp the window's own minimize button (climbing to it first
    // if it couldn't stand on it) and drop when the window goes.
    // Resolves whether the window was minimized.
    async stompReal(s, loc, perched) {
      const { cat, loco, sfx, terrain, behaviors } = this.w;
      if (!perched) {
        // Hanging off it: a tug.
        await s.move(cat, cat.x, cat.y - 10, { duration: 160, ease: 'in' });
        await s.move(cat, cat.x, cat.y + 10, { duration: 120, ease: 'out' });
      } else {
        cat.setState('crouch');
        await s.wait(260);
        await s.move(cat, loc.x, cat.y + 34, { duration: 200, ease: 'out' });
        await s.move(cat, loc.x, cat.y - 34, { duration: 140, ease: 'in' });
      }
      cat.lookAt(loc.x, loc.y);
      cat.setState('press');
      sfx.play('click');
      await s.wait(650);

      const res = await send({ type: 'MINIMIZE_WINDOW' });
      s.check();
      cat.clinging = false;
      const hung = this.hanging;
      this.hanging = false;
      if (!res || !res.ok) {
        await this.say(s, res && res.hint);
        if (hung) await loco.fall(s, cat);
        await loco.descend(s, cat);
        return false;
      }
      if (hung) await loco.fall(s, cat); // let go
      else await behaviors.airFall(s, cat); // the floor just left
      await loco.descend(s, cat);
      return true;
    }

    // Stand-in: stomp the red button; the background minimizes the window.
    async stompStandIn(s) {
      const { cat, loco, sfx } = this.w;
      const st = this.st;
      cat.setState('crouch');
      await s.wait(260);
      this.minBtn.classList.add('dp-pressed');
      cat.setPos(this.btnX, 12);
      cat.setState('press');
      sfx.play('click');
      await s.wait(650);
      st.awaitingReturn = true;
      const res = await send({ type: 'MINIMIZE_WINDOW' });
      s.check();
      // Off the button, which pops back and goes away.
      await loco.jump(s, cat, clamp(this.btnX + 120, cat.w, this.vw - cat.w), 0, { windup: 0, arc: 50 });
      this.minBtn.classList.remove('dp-pressed', 'dp-show');
      if (!res || !res.ok) {
        st.awaitingReturn = false;
        await this.say(s, res && res.hint);
        return false;
      }
      return true;
    }

    // Something the cat can explain on a sign (why the window didn't go).
    async say(s, hint) {
      if (!hint) return;
      this.w.cat.setState('confused');
      this.w.cat.say(hint, 3000);
      await s.wait(3200);
    }

    // It produces the plan: a crouch, and the board shoots up beside it.
    async takeOut(s, ex) {
      const { cat, sfx } = this.w;
      cat.setState('crouch');
      await s.wait(350);
      this.showTimer(ex, fmt(Math.ceil(BREAK_SECONDS / 2) * 1000));
      sfx.play('pop');
      cat.setState('cheer');
      await s.wait(700);
    }

    // Extension: the user restored the window. Say hello, carry on.
    // `resumeEx` is the exercise to go back to, or null if the break is over.
    async welcomeBack(s, resumeEx) {
      const { cat, sfx } = this.w;
      this.st.returned = false;
      this.st.awaitingReturn = false;
      cat.setState('wave');
      cat.say('Hi!', 1500);
      sfx.play('chime');
      await s.wait(2000);
      if (resumeEx) cat.setState(resumeEx.state);
    }
  }

  DP.BreakSequence = BreakSequence;
})(globalThis);
