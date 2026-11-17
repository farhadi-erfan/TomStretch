// The break sequence: the cat gives up the chase, plants Start / Snooze
// boards beside itself, then demonstrates the exercise next to a timer board,
// optionally goes and stomps the window's minimize button, and leaves.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const UNANSWERED_MS = 3 * 60 * 1000; // an ignored invitation snoozes itself
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

    // Props planted on the floor beside the cat: the choice boards, the
    // timer board, and the red button that sends the cat off to minimize the
    // window.
    _buildUi() {
      const stage = this.w.stage.el;
      this.boards = document.createElement('div');
      this.boards.className = 'dp-boards';
      this.boards.setAttribute('role', 'dialog');
      this.boards.setAttribute('aria-label', 'TomStretch break');
      this.boards.innerHTML = `
        <button class="dp-board dp-board-btn" data-act="snooze"></button>
        <div class="dp-board dp-board-info">
          <div class="dp-board-kicker">Break time</div>
          <div class="dp-board-name"></div>
          <div class="dp-board-how"></div>
        </div>
        <button class="dp-board dp-board-btn dp-primary" data-act="start"></button>`;
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
      stage.append(this.boards, this.timerEl, this.minBtn);

      const $ = (sel) => this.boards.querySelector(sel);
      this.ui = {
        name: $('.dp-board-name'),
        how: $('.dp-board-how'),
        start: $('[data-act="start"]'),
        snooze: $('[data-act="snooze"]'),
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
      this.boards.addEventListener('click', onClick);
      this.minBtn.addEventListener('click', onClick);
    }

    onAction(act) {
      const st = this.st;
      if (!st) return;
      if (act === 'minimize') st.wantMin = true;
      if (act === 'done') st.done = true;
      if (st.choose && (act === 'start' || act === 'snooze')) st.choose(act);
    }

    // Extension: the user restored the minimized browser window.
    onReturn() {
      if (this.st && this.st.awaitingReturn) {
        this.st.awaitingReturn = false;
        this.st.returned = true;
      }
    }

    pickExercise() {
      const enabled = DP.exercises.filter((e) => this.w.settings.exercises[e.id]);
      const pool = enabled.length ? enabled : DP.exercises;
      const fresh = pool.filter((e) => e.id !== this.lastExercise);
      const list = fresh.length ? fresh : pool;
      const ex = list[Math.floor(Math.random() * list.length)];
      this.lastExercise = ex.id;
      return ex;
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
          if (cat.zoom !== 1) cat.setPos(cat.x, 0, 1);
          this.st = null;
        }
      });
    }

    // Plant a prop on the floor on the roomier side of the cat.
    _place(el, width) {
      const { cat } = this.w;
      const right = cat.x + cat.w * 0.7;
      const left = cat.x - cat.w * 0.7 - width;
      el.style.left = Math.round(right + width < this.vw - 12 || left < 12 ? right : left) + 'px';
    }

    showChoice(ex) {
      this.ui.name.textContent = ex.name;
      this.ui.how.textContent = ex.how;
      this.ui.start.textContent = `Start · ${fmt(ex.seconds * 1000)}`;
      this.ui.snooze.textContent = `Snooze ${this.w.settings.snoozeMinutes} min`;
      this.boards.classList.add('dp-show');
      this._place(this.boards, this.boards.offsetWidth || 460);
    }

    hideChoice() {
      this.boards.classList.remove('dp-show');
    }

    // The timer board: the exercise and time left (or a note while waiting).
    showTimer(ex, text, waiting = false) {
      this.ui.timerName.textContent = ex.name;
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
      const { cat, mouse, loco, sfx, behaviors, settings } = this.w;
      const ex = this.pickExercise();
      const st = (this.st = { wantMin: false, minimized: false, awaitingReturn: false, returned: false, done: false, choose: null });
      const cx = this.vw / 2;
      const v = Math.max(560, this.vw / 3);

      // 1. The chase comes through one last time; the cat runs out of steam
      //    at centre stage.
      if (cat.hidden) {
        const side = Math.random() < 0.5 ? -1 : 1;
        loco.enter(mouse, side);
        loco.enter(cat, side);
        cat.setPos(cat.x + side * 230, 0);
        sfx.play('squeak');
        loco.exit(s, mouse, -side, { speed: v * 1.15 }).catch(() => {});
        await loco.run(s, cat, cx, { speed: v, ease: 'out' });
      } else {
        if (!mouse.hidden) loco.exit(s, mouse).catch(() => {});
        await loco.descend(s, cat);
        await loco.run(s, cat, cx, { speed: v, ease: 'out' });
      }
      cat.setState('tired');
      await s.wait(1400);
      cat.face(1);
      cat.setState('idle');
      cat.say('Break time', 1600);
      sfx.play('chime');
      await s.wait(1200);

      // 2. Start or snooze: boards planted next to the cat.
      this.showChoice(ex);
      const choice = await Promise.race([
        new Promise((resolve) => (st.choose = resolve)),
        DP.sleep(UNANSWERED_MS).then(() => 'snooze'),
      ]);
      st.choose = null;
      s.check();
      this.hideChoice();

      if (choice === 'snooze') {
        await send({ type: 'SNOOZE' });
        cat.setState('wave');
        cat.say('Later, then.', 1600);
        await s.wait(1800);
        return behaviors.leaveStage(s);
      }

      // 3. The exercise: the cat demonstrates beside the timer board (click
      //    Done to finish early).
      cat.setState(ex.state);
      this.btnX = clamp(cat.x - cat.w * 1.6 - 52, 70, this.vw - 70);
      this.minBtn.style.left = this.btnX - 52 + 'px';
      this.minBtn.classList.remove('dp-pressed');
      this.minBtn.classList.add('dp-show');
      if (settings.autoMinimize) st.wantMin = true;

      // Wall clock, so it stays right while the window is minimized. Time spent
      // on the cat's trips (minimizing, saying hello) never comes out of it.
      let endAt = Date.now() + ex.seconds * 1000;
      while (Date.now() < endAt && !st.done) {
        this.showTimer(ex, fmt(endAt - Date.now()));
        if (st.wantMin && !st.minimized) {
          const t0 = Date.now();
          this.showTimer(ex, 'starts when the window is gone', true);
          const minimized = await this.pressMinimize(s, ex, cx);
          // Minimized: the exercise starts now, in full. Otherwise just give
          // back the time the attempt took.
          endAt = minimized ? Date.now() + ex.seconds * 1000 : endAt + (Date.now() - t0);
        }
        if (st.returned) {
          const t0 = Date.now();
          await this.welcomeBack(s, ex, cx);
          endAt += Date.now() - t0;
        }
        await s.wait(250);
      }

      // 4. If the user is still away (extension), wait before celebrating.
      while (document.hidden) await s.wait(500);
      if (st.returned || cat.y > 0) await this.welcomeBack(s, null, cx);
      this.minBtn.classList.remove('dp-show');
      this.hideTimer();
      cat.setState('cheer');
      cat.say('Nice.', 1800);
      sfx.play('chime');
      await send({ type: 'BREAK_DONE' });
      await s.wait(2400);
      await behaviors.leaveStage(s);
    }

    // ---- the minimize interaction ------------------------------------------

    async pressMinimize(s, ex, cx) {
      const { cat, loco, sfx } = this.w;
      const st = this.st;
      st.minimized = true;

      // Desktop: where is the working window's real minimize button?
      const loc = await send({ type: 'LOCATE_MINIMIZE' });
      s.check();
      if (loc && loc.ok) return this.pressRealButton(s, ex, cx, loc);
      if (loc && loc.hint) return this.minimizeFailed(s, ex, cx, loc);
      // (each path resolves true if the window was minimized)

      // Extension: Chrome's own button is out of reach, so the cat stomps the
      // stand-in on the floor and the background minimizes the window.
      this.minBtn.classList.add('dp-show');
      await loco.run(s, cat, this.btnX + (cat.x >= this.btnX ? 70 : -70));
      await loco.jump(s, cat, this.btnX, 26, { arc: 70 });
      this.minBtn.classList.add('dp-pressed');
      cat.setPos(this.btnX, 12);
      cat.setState('press');
      sfx.play('click');
      await s.wait(750);
      st.awaitingReturn = true;
      const res = await send({ type: 'MINIMIZE_WINDOW' });
      s.check();
      if (!res || !res.ok) {
        st.awaitingReturn = false;
        return this.minimizeFailed(s, ex, cx, res);
      }
      cat.setState(ex.state);
      return true;
    }

    // Desktop: travel to the window's own minimize button over real surfaces
    // (up its side, along its top), stomp it, and be left standing on nothing
    // when the window goes. loc: {x, y} centre of the button, viewport px.
    async pressRealButton(s, ex, cx, loc) {
      const { cat, loco, sfx, terrain, behaviors } = this.w;
      this.minBtn.classList.remove('dp-show');
      const rect = terrain.rectAt(loc.x, loc.y);
      const top = rect && terrain.platforms.find((p) => p.rectId === rect.id && loc.x >= p.x1 - 20 && loc.x <= p.x2 + 20);
      const buttonH = this.vh - loc.y - 6; // feet height that puts the paws on it

      if (top) {
        await loco.travel(s, cat, top, loc.x);
      } else {
        // No walkable top (e.g. a maximised window): shin up the nearest edge
        // of the window, or of the screen, and reach across.
        await loco.descend(s, cat);
        const windowSide = rect && loco.hugX(cat, rect.left, 1) >= cat.w / 2;
        if (windowSide) await loco.climbWall(s, cat, rect.left, Math.max(0, this.vh - rect.bottom), buttonH, 1);
        else await loco.climbWall(s, cat, 0, 0, buttonH, -1); // up the screen's own left edge
        cat.setState('pounce');
        await s.move(cat, clamp(loc.x, cat.w / 2, this.vw - cat.w / 2), buttonH, { duration: 300, arc: 24 });
      }
      cat.lookAt(loc.x, loc.y);
      cat.setState('press');
      sfx.play('click');
      await s.wait(750);

      const res = await send({ type: 'MINIMIZE_WINDOW' });
      s.check();
      if (!res || !res.ok) return this.minimizeFailed(s, ex, cx, res);

      await behaviors.airFall(s, cat); // the floor just left
      await loco.descend(s, cat);
      await loco.run(s, cat, cx, { speed: 460, ease: 'out' });
      cat.setState(ex.state);
      return true;
    }

    // Couldn't minimize: say why if we know, and carry on with the break.
    async minimizeFailed(s, ex, cx, res) {
      const { cat, loco } = this.w;
      this.minBtn.classList.remove('dp-pressed');
      const hint = res && res.hint;
      cat.setState('confused');
      if (hint) cat.say(hint, 3200);
      await s.wait(hint ? 3400 : 1200);
      await loco.descend(s, cat);
      await loco.run(s, cat, cx, { speed: 460, ease: 'out' });
      cat.setState(ex.state);
      return false;
    }

    // Extension: the user restored the window. Hop off the button, say hello.
    // `resumeEx` is the exercise to go back to, or null if the break is over.
    async welcomeBack(s, resumeEx, cx) {
      const { cat, loco, sfx } = this.w;
      this.st.returned = false;
      this.st.awaitingReturn = false;
      this.minBtn.classList.remove('dp-pressed', 'dp-show');
      if (cat.y > 0) await loco.jump(s, cat, cx, 0, { windup: 0, arc: 60 });
      cat.setState('wave');
      cat.say('Hi!', 1500);
      sfx.play('chime');
      await s.wait(2000);
      if (resumeEx) cat.setState(resumeEx.state);
    }
  }

  DP.BreakSequence = BreakSequence;
})(globalThis);
