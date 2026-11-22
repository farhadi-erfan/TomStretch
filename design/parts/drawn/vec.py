# Shared vector helpers for the hand-drawn characters (draw.py, ../mouse-drawn/draw.py).
# Absolute SVG path data in, path data or <path> elements out.
import math

INK = '#3B2A20'
WHITE = '#FFFDF8'
LINE = 5  # outline width, stage px


def capsule(x1, y1, x2, y2, r1, r2):
    """A tapered tube from (x1,y1) radius r1 to (x2,y2) radius r2, round ends."""
    a = math.atan2(y2 - y1, x2 - x1)
    nx, ny = -math.sin(a), math.cos(a)
    p = lambda x, y: f'{x:.1f} {y:.1f}'
    return (f'M{p(x1 + nx * r1, y1 + ny * r1)} L{p(x2 + nx * r2, y2 + ny * r2)} '
            f'A{r2} {r2} 0 0 0 {p(x2 - nx * r2, y2 - ny * r2)} '
            f'L{p(x1 - nx * r1, y1 - ny * r1)} A{r1} {r1} 0 0 0 {p(x1 + nx * r1, y1 + ny * r1)} Z')


def capsule_open(x1, y1, x2, y2, r1, r2):
    """The outline of capsule() without its start cap: the two sides and the
    far end, so a limb that overlaps its parent shows no line at the joint."""
    a = math.atan2(y2 - y1, x2 - x1)
    nx, ny = -math.sin(a), math.cos(a)
    p = lambda x, y: f'{x:.1f} {y:.1f}'
    return (f'M{p(x1 + nx * r1, y1 + ny * r1)} L{p(x2 + nx * r2, y2 + ny * r2)} '
            f'A{r2} {r2} 0 0 0 {p(x2 - nx * r2, y2 - ny * r2)} L{p(x1 - nx * r1, y1 - ny * r1)}')


def ellipse(cx, cy, rx, ry):
    return f'M{cx - rx} {cy} A{rx} {ry} 0 1 0 {cx + rx} {cy} A{rx} {ry} 0 1 0 {cx - rx} {cy} Z'


def fill(d, color, outline=True, width=LINE):
    s = f' stroke="{INK}" stroke-width="{width}" stroke-linejoin="round"' if outline else ''
    return f'<path d="{d}" fill="{color}"{s}/>'


def line(d, width=LINE, color=INK):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'


def sample(d, step=3.0):
    """Points along absolute SVG path data (M L C Q A Z), one list per subpath."""
    import re
    toks = re.findall(r'[MLCQAZ]|-?\d*\.?\d+', d)
    subs, cur, i, cmd, pos = [], [], 0, None, (0.0, 0.0)
    num = lambda: float(toks[i])
    while i < len(toks):
        if toks[i] in 'MLCQAZ':
            cmd = toks[i]; i += 1
            if cmd == 'Z':
                if cur: subs.append(cur); cur = []
                continue
        if cmd == 'M':
            if cur: subs.append(cur)
            pos = (num(), float(toks[i + 1])); i += 2; cur = [pos]; cmd = 'L'
        elif cmd == 'L':
            pos = (num(), float(toks[i + 1])); i += 2; cur.append(pos)
        elif cmd in 'CQ':
            k = 6 if cmd == 'C' else 4
            v = [float(t) for t in toks[i:i + k]]; i += k
            pts = [pos] + [(v[j], v[j + 1]) for j in range(0, k, 2)]
            L = sum(math.dist(pts[j], pts[j + 1]) for j in range(len(pts) - 1))
            n = max(2, int(L / step))
            for t in (j / n for j in range(1, n + 1)):
                if cmd == 'C':
                    p0, p1, p2, p3 = pts; u = 1 - t
                    cur.append(tuple(u**3 * p0[c] + 3 * u * u * t * p1[c] + 3 * u * t * t * p2[c] + t**3 * p3[c] for c in (0, 1)))
                else:
                    p0, p1, p2 = pts; u = 1 - t
                    cur.append(tuple(u * u * p0[c] + 2 * u * t * p1[c] + t * t * p2[c] for c in (0, 1)))
            pos = pts[-1]
        elif cmd == 'A':  # circular/elliptical arc, no rotation
            rx, ry, _, large, sweep, x, y = [float(t) for t in toks[i:i + 7]]; i += 7
            x1, y1 = pos
            dx, dy = (x1 - x) / 2, (y1 - y) / 2
            lam = (dx / rx) ** 2 + (dy / ry) ** 2
            if lam > 1: rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
            num_ = max(0.0, rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx)
            co = math.sqrt(num_ / (rx * rx * dy * dy + ry * ry * dx * dx)) * (-1 if large == sweep else 1)
            cxp, cyp = co * rx * dy / ry, -co * ry * dx / rx
            cx, cy = cxp + (x1 + x) / 2, cyp + (y1 + y) / 2
            ang = lambda ux, uy: math.atan2(uy, ux)
            t1 = ang((dx - cxp) / rx, (dy - cyp) / ry)
            dt = ang((-dx - cxp) / rx, (-dy - cyp) / ry) - t1
            if sweep and dt < 0: dt += 2 * math.pi
            if not sweep and dt > 0: dt -= 2 * math.pi
            n = max(4, int(abs(dt) * max(rx, ry) / step))
            cur += [(cx + rx * math.cos(t1 + dt * j / n), cy + ry * math.sin(t1 + dt * j / n)) for j in range(1, n + 1)]
            pos = (x, y)
    if cur: subs.append(cur)
    return subs


def poly_d(geom):
    """SVG path data for a shapely (multi)polygon."""
    from shapely.geometry import Polygon
    parts = [geom] if isinstance(geom, Polygon) else list(getattr(geom, 'geoms', []))
    out = []
    for g in parts:
        if g.is_empty or g.geom_type != 'Polygon': continue
        g = g.simplify(0.4)
        for ring in [g.exterior, *g.interiors]:
            c = list(ring.coords)[:-1]
            out.append('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in c) + ' Z')
    return ' '.join(out)


def band(x1, y1, x2, y2, w1, w2):
    """A fur band from the shape's edge (x1,y1, width w1) tapering to a point
    near (x2,y2) - pass it a start just outside the edge."""
    a = math.atan2(y2 - y1, x2 - x1)
    nx, ny = -math.sin(a), math.cos(a)
    return (f'M{x1 + nx * w1:.1f} {y1 + ny * w1:.1f} Q{(x1 + x2) / 2 + nx * w2:.1f} {(y1 + y2) / 2 + ny * w2:.1f} {x2:.1f} {y2:.1f} '
            f'Q{(x1 + x2) / 2 - nx * w2:.1f} {(y1 + y2) / 2 - ny * w2:.1f} {x1 - nx * w1:.1f} {y1 - ny * w1:.1f} Z')


def to_cubics(d):
    """Absolute M/L/C/Q/A/Z path data -> [{closed, start, segs}] with segs
    {'c1','c2','p'} (cubic) or {'p'} (line)."""
    import re
    toks = re.findall(r'[MLCQAZ]|-?\d*\.?\d+', d)
    subs, cur, i, cmd, pos = [], None, 0, None, (0.0, 0.0)
    f = lambda j: float(toks[j])
    while i < len(toks):
        if toks[i] in 'MLCQAZ':
            cmd = toks[i]; i += 1
            if cmd == 'Z':
                if cur: cur['closed'] = True; subs.append(cur); pos = cur['start']; cur = None
                continue
        if cmd == 'M':
            if cur: subs.append(cur)
            pos = (f(i), f(i + 1)); i += 2
            cur = {'closed': False, 'start': pos, 'segs': []}; cmd = 'L'
        elif cmd == 'L':
            pos = (f(i), f(i + 1)); i += 2; cur['segs'].append({'p': pos})
        elif cmd == 'C':
            v = [f(i + j) for j in range(6)]; i += 6
            cur['segs'].append({'c1': v[0:2], 'c2': v[2:4], 'p': tuple(v[4:6])}); pos = tuple(v[4:6])
        elif cmd == 'Q':
            q = (f(i), f(i + 1)); p = (f(i + 2), f(i + 3)); i += 4
            c1 = [pos[0] + 2 / 3 * (q[0] - pos[0]), pos[1] + 2 / 3 * (q[1] - pos[1])]
            c2 = [p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1])]
            cur['segs'].append({'c1': c1, 'c2': c2, 'p': p}); pos = p
        elif cmd == 'A':
            rx, ry, _, large, sweep, x, y = [f(i + j) for j in range(7)]; i += 7
            x1, y1 = pos
            dx, dy = (x1 - x) / 2, (y1 - y) / 2
            lam = (dx / rx) ** 2 + (dy / ry) ** 2
            if lam > 1: rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
            n_ = max(0.0, rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx)
            co = math.sqrt(n_ / (rx * rx * dy * dy + ry * ry * dx * dx)) * (-1 if large == sweep else 1)
            cxp, cyp = co * rx * dy / ry, -co * ry * dx / rx
            cx, cy = cxp + (x1 + x) / 2, cyp + (y1 + y) / 2
            t1 = math.atan2((dy - cyp) / ry, (dx - cxp) / rx)
            dt = math.atan2((-dy - cyp) / ry, (-dx - cxp) / rx) - t1
            if sweep and dt < 0: dt += 2 * math.pi
            if not sweep and dt > 0: dt -= 2 * math.pi
            n = max(1, math.ceil(abs(dt) / (math.pi / 2) - 1e-9))
            h = dt / n
            kk = 4 / 3 * math.tan(h / 4)
            for j in range(n):
                a0, a1 = t1 + h * j, t1 + h * (j + 1)
                p0 = (cx + rx * math.cos(a0), cy + ry * math.sin(a0))
                p1 = (cx + rx * math.cos(a1), cy + ry * math.sin(a1))
                c1 = [p0[0] - kk * rx * math.sin(a0), p0[1] + kk * ry * math.cos(a0)]
                c2 = [p1[0] + kk * rx * math.sin(a1), p1[1] - kk * ry * math.cos(a1)]
                cur['segs'].append({'c1': c1, 'c2': c2, 'p': p1})
            pos = (x, y)
    if cur: subs.append(cur)
    return subs


def bbox(elements):
    import re
    xs, ys = [], []
    for e in elements:
        d = re.search(r'\bd="([^"]+)"', e).group(1)
        # Arcs carry radii and flags; take coordinate pairs only from M/L/C/Q
        # and arc end points.
        for cmd, args in re.findall(r'([MLCQA])([^MLCQAZ]*)', d):
            n = [float(v) for v in re.findall(r'-?\d+\.?\d*', args)]
            pts = n[5:7] if cmd == 'A' else n
            if cmd == 'A':  # an arc bulges by up to its radius
                r = max(n[0], n[1]); xs += [pts[0] - r, pts[0] + r]; ys += [pts[1] - r, pts[1] + r]
            xs += pts[0::2]; ys += pts[1::2]
    pad = 8
    return min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad
