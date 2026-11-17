// Locomotion: getting a character from A to B the way a cartoon animal would,
// not by floating. Everything is run / jump (ballistic) / climb / fall along
// the surfaces in Terrain, with a small route planner that strings hops
// together (floor -> ledge -> ledge -> window top). Each method takes the
// director's script handle `s`, so a higher-priority routine can interrupt.
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const GRAVITY = 2600; // px/s^2
  const JUMP_UP = 260; // highest ledge reachable in one jump
  const JUMP_ACROSS = 210; // widest gap

  class Locomotion {
    constructor(world) {
      this.w = world;
    }
    get vw() {
      return window.innerWidth;
    }
    get vh() {
      return window.innerHeight;
    }

    // Put a character just off-screen on the floor. side: -1 left, +1 right.
    enter(c, side) {
      c.stop();
      c.hush();
      c.perch = null;
      c.perchLost = false;
      c.setPos(side < 0 ? -c.w : this.vw + c.w, 0, 1);
      c.face(-side);
      c.show();
    }

    // What the character is standing on: a platform, the floor, or null (mid-air).
    node(c) {
      return this.w.terrain.standingOn(c.x, c.y) || (c.y <= 2 ? this.w.terrain.floor() : null);
    }

    // ---- primitives --------------------------------------------------------

    async run(s, c, x, { speed = 420, state = 'run', ease = 'linear' } = {}) {
      if (Math.abs(x - c.x) < 3) return;
      c.setState(state);
      await s.move(c, x, c.y, { speed, ease });
    }

    // Walk/run toward x like an animal would: if the ledge ends, step off and
    // drop; if something is in the way, hop up onto it or over it, climb it,
    // or - with onBlock 'turn', or when it's too big - stop and give up.
    // Resolves true if it got there.
    async walk(s, c, x, { speed = 420, state = 'run', onBlock = 'auto' } = {}) {
      const { terrain } = this.w;
      for (let i = 0; i < 10; i++) {
        if (!this.node(c)) await this.fall(s, c); // standing on nothing
        if (Math.abs(x - c.x) < 4) return true;
        const dir = Math.sign(x - c.x);
        const on = this.node(c);
        let target = x;
        let offEnd = false;
        if (on && on.kind !== 'floor') {
          const end = dir > 0 ? on.x2 : on.x1;
          if ((end - x) * dir < c.w * 0.1) {
            target = end - dir * 4;
            offEnd = true;
          }
        }
        const wall = terrain.wallAhead(c.x, target + dir * c.w * 0.4, c.y, c.h);
        if (wall) target = wall.x - dir * c.w * 0.42;
        if ((target - c.x) * dir > 2) await this.run(s, c, target, { speed, state });
        c.face(dir);

        if (wall) {
          if (onBlock === 'turn') return false;
          const rise = wall.top - c.y;
          if (rise <= JUMP_UP) {
            // Up onto it, or over it if there's nothing on top to stand on.
            const landX = wall.x + dir * c.w * 0.45;
            const atTop = terrain.below(landX, wall.top + 4).top;
            const landY = atTop >= wall.top - 30 ? atTop : terrain.below(wall.x + dir * c.w * 0.7, c.y + 2).top;
            const overX = atTop >= wall.top - 30 ? landX : wall.x + dir * c.w * 0.7;
            await this.jump(s, c, overX, landY, { windup: 300, arc: Math.max(30, wall.top - Math.max(c.y, landY) + 30) });
            continue;
          }
          if (wall.bottom <= c.y + 30) {
            // Too tall to jump: climb it and heave over the top.
            await this.climbWall(s, c, wall.x, wall.bottom, wall.top - c.h * 0.15, dir);
            c.setState('pounce');
            await s.move(c, wall.x + dir * c.w * 0.4, wall.top, { duration: 260, arc: c.h * 0.3, ease: 'out' });
            c.setState('land');
            await s.wait(240);
            continue;
          }
          c.setState('look'); // can't get past this one
          await s.wait(400);
          return false;
        }
        if (offEnd) {
          c.setState('pounce');
          await s.move(c, c.x + dir * c.w * 0.45, c.y, { duration: 200, arc: 14 });
          await this.fall(s, c);
        }
      }
      return Math.abs(x - c.x) < 8;
    }

    // Drop to whatever is underneath (or to `toY`), with a squashy landing.
    async fall(s, c, { toY } = {}) {
      const floor = toY != null ? toY : this.w.terrain.below(c.x, c.y - 6).top;
      const h = c.y - floor;
      if (h <= 2) return c.setPos(c.x, floor);
      c.setState('fall');
      await s.move(c, c.x, floor, { duration: Math.max(160, Math.sqrt((2 * h) / GRAVITY) * 1000), ease: 'in' });
      c.setState('land');
      this.w.sfx.play('pop');
      await s.wait(420);
    }

    // Wind up, leap in an arc, land.
    async jump(s, c, x, y, { windup = 380, arc } = {}) {
      c.face(x >= c.x ? 1 : -1);
      if (windup) {
        c.setState('crouch');
        await s.wait(windup);
      }
      const dx = Math.abs(x - c.x);
      const dy = Math.abs(y - c.y);
      c.setState('pounce');
      this.w.sfx.play('boing');
      await s.move(c, x, y, {
        duration: clamp(260 + (dy + dx * 0.4) * 0.45, 300, 820),
        arc: arc != null ? arc : clamp(30 + dx * 0.15, 30, 90),
        ease: y > c.y ? 'out' : 'inout',
      });
      c.setState('land');
      await s.wait(240);
    }

    // Where a character's centre goes to climb a vertical edge at edgeX, with
    // the wall on side `dir` (+1 right, -1 left): belly against the wall, so
    // the reaching paws overlap its edge.
    hugX(c, edgeX, dir) {
      return edgeX - dir * c.w * 0.2;
    }

    // Shin up the vertical edge at edgeX (wall on side `dir`), grabbing it with
    // a leap if it doesn't reach down to the character, and stop with the feet
    // at height toY.
    async climbWall(s, c, edgeX, wallBottom, toY, dir) {
      const x = this.hugX(c, edgeX, dir);
      await this.run(s, c, clamp(x - dir * 50, c.w / 2, this.vw - c.w / 2));
      c.face(dir);
      if (wallBottom > c.y + 30) {
        // Leap straight onto the side of the wall: no landing, it's a grab.
        c.setState('crouch');
        await s.wait(320);
        c.setState('pounce');
        this.w.sfx.play('boing');
        const dy = wallBottom + 10 - c.y;
        await s.move(c, x, wallBottom + 10, { duration: clamp(260 + dy * 0.45, 300, 700), arc: 18, ease: 'out' });
        c.face(dir);
      } else {
        c.setState('walk');
        await s.move(c, x, c.y, { duration: 160 });
      }
      c.setState('climb');
      await s.move(c, x, toY, { speed: 330, ease: 'linear' });
    }

    // ---- route planning ----------------------------------------------------

    _gap(a, b) {
      return Math.max(0, b.x1 - a.x2, a.x1 - b.x2);
    }

    _canHop(a, b) {
      const rise = b.top - a.top;
      return rise > 0 ? rise <= JUMP_UP && this._gap(a, b) <= JUMP_ACROSS : this._gap(a, b) <= JUMP_ACROSS + 20;
    }

    // How to climb from surface a up to surface b, if there is a way:
    // {dir, edgeX, bottom} - the wall at edgeX, facing dir (+1 the wall is to
    // the right), reaching down to height `bottom`. Windows and page elements
    // are climbed by their sides; seen ledges by a seen edge under either end.
    _climbOption(a, b, c) {
      if (b.top <= a.top) return null;
      const opts = [];
      if (b.kind === 'window' || b.kind === 'element') {
        const bottom = Math.max(0, this.vh - b.rect.bottom);
        opts.push({ dir: 1, edgeX: b.rect.left, bottom }, { dir: -1, edgeX: b.rect.right, bottom });
      } else if (b.kind === 'ledge') {
        for (const side of [-1, 1]) {
          const wall = this.w.terrain.wallUnder(b, side);
          if (wall) opts.push({ dir: -side, edgeX: side < 0 ? b.x1 : b.x2, bottom: wall.bottom });
        }
      }
      const ok = opts.filter((o) => {
        if (o.bottom > a.top + JUMP_UP || b.top - o.bottom < 40) return false;
        const x = this.hugX(c, o.edgeX, o.dir);
        return x >= c.w / 2 && x <= this.vw - c.w / 2 && x >= a.x1 - 10 && x <= a.x2 + 10;
      });
      ok.sort((p, q) => Math.abs(c.x - this.hugX(c, p.edgeX, p.dir)) - Math.abs(c.x - this.hugX(c, q.edgeX, q.dir)));
      return ok[0] || null;
    }

    // Fewest-moves route between two surfaces: [{node, how: 'hop' | 'climb'}], or null.
    route(from, to, c) {
      const nodes = [this.w.terrain.floor(), ...this.w.terrain.platforms];
      const start = nodes.find((n) => n.id === from.id) || from;
      const goal = nodes.find((n) => n.id === to.id);
      if (!goal) return null;
      const prev = new Map([[start.id, null]]);
      const queue = [start];
      while (queue.length) {
        const a = queue.shift();
        if (a.id === goal.id) {
          const path = [];
          for (let step = prev.get(a.id), node = a; step; node = step.from, step = prev.get(node.id)) {
            path.unshift({ node, how: step.how });
          }
          return path;
        }
        for (const b of nodes) {
          if (prev.has(b.id)) continue;
          const how = this._canHop(a, b) ? 'hop' : this._climbOption(a, b, c) ? 'climb' : null;
          if (!how) continue;
          prev.set(b.id, { from: a, how });
          queue.push(b);
        }
      }
      return null;
    }

    // ---- executing one move of a route -------------------------------------

    async hop(s, c, a, b) {
      const m = c.w * 0.4;
      const bx1 = Math.min(b.x1 + m, (b.x1 + b.x2) / 2);
      const bx2 = Math.max(b.x2 - m, (b.x1 + b.x2) / 2);
      const onFloor = a.kind === 'floor';

      if (b.top > a.top) {
        // Up: take off as close to under/next to the ledge as this surface allows.
        const land = clamp(c.x, bx1, bx2);
        const take = clamp(land, onFloor ? c.w / 2 : a.x1 + m / 2, onFloor ? this.vw - c.w / 2 : a.x2 - m / 2);
        await this.run(s, c, take);
        return this.jump(s, c, land, b.top);
      }

      // Down: step off an end of this ledge if the target is under it...
      const offL = a.x1 - c.w * 0.45;
      const offR = a.x2 + c.w * 0.45;
      const ends = [];
      if (!onFloor && offL >= b.x1 && offL <= b.x2 && offL > c.w / 2) ends.push([a.x1 + 6, offL]);
      if (!onFloor && offR >= b.x1 && offR <= b.x2 && offR < this.vw - c.w / 2) ends.push([a.x2 - 6, offR]);
      if (ends.length) {
        const [edge, off] = ends.sort((p, q) => Math.abs(p[0] - c.x) - Math.abs(q[0] - c.x))[0];
        await this.run(s, c, edge, { speed: 320 });
        c.setState('pounce');
        await s.move(c, off, c.y, { duration: 200, arc: 14 });
        return this.fall(s, c, { toY: b.top });
      }
      // ...or leap across a gap to it...
      if (this._gap(a, b) > 0) {
        const take = b.x1 > a.x2 ? a.x2 - m / 2 : a.x1 + m / 2;
        await this.run(s, c, take);
        return this.jump(s, c, b.x1 > a.x2 ? bx1 : bx2, b.top, { windup: 300 });
      }
      // ...or it is directly underneath: hop down through.
      c.setState('crouch');
      await s.wait(240);
      await s.move(c, clamp(c.x, bx1, bx2), c.y, { duration: 120 });
      return this.fall(s, c, { toY: b.top });
    }

    async climbEdge(s, c, a, b) {
      const o = this._climbOption(a, b, c) || { dir: 1, edgeX: b.x1, bottom: a.top };
      await this.climbWall(s, c, o.edgeX, o.bottom, b.top - c.h * 0.15, o.dir);
      const ledgeX = o.edgeX + o.dir * c.w * 0.4;
      c.setState('pounce'); // heave over the edge
      await s.move(c, ledgeX, b.top, { duration: 260, arc: c.h * 0.3, ease: 'out' });
      c.setState('land');
      await s.wait(240);
    }

    // ---- journeys ----------------------------------------------------------

    // Go stand on `target` (a platform, or terrain.floor()) at destX.
    async travel(s, c, target, destX) {
      let from = this.node(c);
      if (!from) {
        await this.fall(s, c);
        from = this.node(c) || this.w.terrain.floor();
      }
      if (from.id !== target.id) {
        const path = this.route(from, target, c);
        if (path) {
          let cur = from;
          for (const step of path) {
            if (step.how === 'climb') await this.climbEdge(s, c, cur, step.node);
            else await this.hop(s, c, cur, step.node);
            cur = step.node;
          }
        } else {
          // No tidy route: get to the floor the blunt way, then one big leap.
          await this.dropDown(s, c);
          if (target.kind !== 'floor') {
            const land = clamp(destX != null ? destX : c.x, target.x1 + c.w * 0.4, target.x2 - c.w * 0.4);
            await this.run(s, c, clamp(land - 70, c.w / 2, this.vw - c.w / 2));
            await this.jump(s, c, land, target.top, { windup: 520 });
          }
        }
      }
      if (destX != null) {
        const m = target.kind === 'floor' ? c.w / 2 : Math.min(c.w * 0.4, (target.x2 - target.x1) / 2);
        await this.walk(s, c, clamp(destX, target.x1 + m, target.x2 - m), { speed: 260, state: 'walk' });
      }
    }

    // Fallback descent: keep walking off ends and falling until on the floor.
    async dropDown(s, c) {
      for (let i = 0; i < 6 && c.y > 2; i++) {
        const p = this.w.terrain.standingOn(c.x, c.y);
        if (p) {
          const left = p.x1 - c.w * 0.45 > c.w / 2 && (c.x - p.x1 <= p.x2 - c.x || p.x2 + c.w * 0.45 >= this.vw - c.w / 2);
          await this.run(s, c, left ? p.x1 + 6 : p.x2 - 6, { speed: 320 });
          c.setState('pounce');
          await s.move(c, left ? p.x1 - c.w * 0.45 : p.x2 + c.w * 0.45, c.y, { duration: 200, arc: 14 });
        }
        await this.fall(s, c, p ? {} : { toY: i > 3 ? 0 : undefined });
      }
      if (c.y > 2) await this.fall(s, c, { toY: 0 });
    }

    descend(s, c) {
      return this.travel(s, c, this.w.terrain.floor());
    }

    // Leave: get down, run off the nearer (or given) side, disappear.
    async exit(s, c, side, { speed = 520 } = {}) {
      c.hush();
      c.perch = null;
      await this.descend(s, c);
      if (side == null) side = c.x < this.vw / 2 ? -1 : 1;
      await this.run(s, c, side < 0 ? -c.w : this.vw + c.w, { speed: Math.max(speed, this.vw / 3.5) });
      c.hide();
    }
  }

  DP.Locomotion = Locomotion;
})(globalThis);
