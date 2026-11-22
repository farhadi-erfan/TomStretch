# The mouse, drawn as clean vector parts the same way as the cat
# (../drawn/draw.py), over ChatGPT's mouse turnaround: reference-stage.png
# (front) and reference-side.png (side, facing right), both 700 x 1000.
#
#   python3 design/parts/mouse-drawn/draw.py            <part>.svg + layout.json
#   python3 design/parts/mouse-drawn/draw.py --preview  + side-by-side previews
#   python3 design/parts/mouse-drawn/draw.py --rive     rive/lib/mouse-drawn.json
#
# Same joint rules as the cat: every child limb starts with an unoutlined round
# cap on its pivot, a hair narrower than its parent's end, drawn in front of it;
# the torso ends in half-discs round the hips, under the thighs' caps.
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'drawn'))
from vec import capsule, capsule_open, ellipse, fill, line, sample, poly_d, to_cubics, bbox, INK, WHITE  # noqa: E402

COAT = '#FCB656'
FAR = '#E39D45'        # far limbs in the side view
CREAM = '#FDDEA7'
FAR_CREAM = '#EBC892'
SALMON = '#FB836A'
TAIL = '#F28C7E'
SCARF = '#948A2C'
SCARF_DARK = '#6F6820'
MOUTH = '#5A2430'
TONGUE = '#F28C8C'
PUPIL = '#1C1310'
CX = 437               # the front view's centre line


def mx(x):
    return 2 * CX - x


def clip(inner, outer, color):
    """`inner` cut to `outer` as plain geometry (no clip paths)."""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    a = unary_union([Polygon(p).buffer(0) for p in sample(inner)])
    b = unary_union([Polygon(p).buffer(0) for p in sample(outer)])
    return f'<path d="{poly_d(a.intersection(b))}" fill="{color}"/>'


def taper(p0, c1, c2, p1, c3, c4, p2, w0, w1):
    """A tail: two joined cubics as a centre line, half-width w0 -> w1, with a
    round tip."""
    def bez(a, b, c, d, t):
        u = 1 - t
        return tuple(u**3 * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t**3 * d[k] for k in (0, 1))
    pts = [bez(p0, c1, c2, p1, j / 40) for j in range(40)] + [bez(p1, c3, c4, p2, j / 40) for j in range(41)]
    L = [0.0]
    for j in range(1, len(pts)): L.append(L[-1] + math.dist(pts[j - 1], pts[j]))
    left, right = [], []
    for j, p in enumerate(pts):
        a, b = pts[max(0, j - 1)], pts[min(len(pts) - 1, j + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; n = math.hypot(tx, ty) or 1
        nx, ny = -ty / n, tx / n
        w = w0 + (w1 - w0) * L[j] / L[-1]
        left.append((p[0] + nx * w, p[1] + ny * w)); right.append((p[0] - nx * w, p[1] - ny * w))
    f = lambda q: f'{q[0]:.1f} {q[1]:.1f}'
    tip = (pts[-1][0] + (pts[-1][0] - pts[-2][0]) / math.dist(pts[-1], pts[-2]) * w1, pts[-1][1] + (pts[-1][1] - pts[-2][1]) / math.dist(pts[-1], pts[-2]) * w1)
    return ('M' + ' L'.join(f(q) for q in left) + f' Q{f(tip)} {f(right[-1])} L'
            + ' L'.join(f(q) for q in reversed(right)) + ' Z')


def paw(cx, cy, flip, k=1.0, color=CREAM):
    # The cat's mitten fist, scaled.
    f = -1 if flip else 1
    X = lambda dx: cx + f * dx * k
    Y = lambda dy: cy + dy * k
    d = (f'M{X(-36)} {Y(-26)} C{X(-24)} {Y(-50)} {X(24)} {Y(-50)} {X(36)} {Y(-26)} '
         f'C{X(48)} {Y(-4)} {X(46)} {Y(34)} {X(24)} {Y(46)} C{X(6)} {Y(54)} {X(-22)} {Y(52)} {X(-34)} {Y(38)} '
         f'C{X(-46)} {Y(24)} {X(-44)} {Y(6)} {X(-36)} {Y(-4)} C{X(-48)} {Y(-8)} {X(-50)} {Y(-22)} {X(-36)} {Y(-26)} Z')
    return [fill(d, color), line(f'M{X(-2)} {Y(50)} Q{X(-4)} {Y(32)} {X(2)} {Y(20)}', 4),
            line(f'M{X(20)} {Y(46)} Q{X(22)} {Y(30)} {X(26)} {Y(20)}', 4)]


def foot(cx, cy, flip, color=CREAM):
    # A long, flat-bottomed oval foot, toe pointing outwards.
    f = -1 if flip else 1
    X = lambda dx: cx + f * dx
    d = (f'M{X(-70)} {cy + 6} C{X(-74)} {cy - 26} {X(-46)} {cy - 42} {X(-4)} {cy - 42} '
         f'C{X(50)} {cy - 42} {X(92)} {cy - 26} {X(94)} {cy + 4} C{X(96)} {cy + 30} {X(80)} {cy + 40} {X(56)} {cy + 40} '
         f'L{X(-48)} {cy + 40} C{X(-66)} {cy + 40} {X(-70)} {cy + 26} {X(-70)} {cy + 6} Z')
    return [fill(d, color)]


# ---- front view (back to front) -----------------------------------------------
P = {}
P['tail'] = [fill(taper((372, 782), (290, 812), (226, 780), (196, 712), (166, 640), (96, 618), (44, 668), 22, 7), TAIL, width=3)]

EAR_L = ellipse(214, 190, 88, 110)
P['ear-l'] = [fill(EAR_L, COAT, False), clip(ellipse(198, 204, 64, 84), EAR_L, SALMON), line(EAR_L)]
EAR_R = ellipse(mx(214), 190, 88, 110)
P['ear-r'] = [fill(EAR_R, COAT, False), clip(ellipse(mx(198), 204, 64, 84), EAR_R, SALMON), line(EAR_R)]

HIP_L, HIP_R, KNEE_L, KNEE_R = (369, 760), (mx(369), 760), (369, 836), (mx(369), 836)
TORSO = ('M376 430 L372 466 C340 500 318 550 314 610 C310 670 326 720 336 760 A33 33 0 0 0 402 760 '
         'C410 738 464 738 472 760 A33 33 0 0 0 538 760 C548 720 564 670 560 610 C556 550 534 500 502 466 L498 430 Z')
TORSO_LINE = ('M372 466 C340 500 318 550 314 610 C310 670 326 720 336 760 M402 760 C410 738 464 738 472 760 '
              'M538 760 C548 720 564 670 560 610 C556 550 534 500 502 466')
P['torso'] = [fill(TORSO, COAT, False), clip(ellipse(CX, 640, 54, 108), TORSO, CREAM), line(TORSO_LINE)]

thigh = lambda h, k: capsule(*h, *k, 33, 31)
P['thigh-l'] = [fill(thigh(HIP_L, KNEE_L), COAT, False), line(capsule_open(*HIP_L, *KNEE_L, 33, 31))]
P['thigh-r'] = [fill(thigh(HIP_R, KNEE_R), COAT, False), line(capsule_open(*HIP_R, *KNEE_R, 33, 31))]
P['shin-l'] = [fill(capsule(*KNEE_L, 366, 872, 29, 28), COAT, False), line(capsule_open(*KNEE_L, 366, 872, 29, 28))] + foot(318, 914, True)
P['shin-r'] = [fill(capsule(*KNEE_R, mx(366), 872, 29, 28), COAT, False), line(capsule_open(*KNEE_R, mx(366), 872, 29, 28))] + foot(mx(318), 914, False)

SH_L, EL_L, SH_R, EL_R = (342, 540), (304, 612), (mx(342), 540), (mx(304), 612)
P['upper-arm-l'] = [fill(capsule(*SH_L, *EL_L, 21, 19), COAT)]
P['upper-arm-r'] = [fill(capsule(*SH_R, *EL_R, 21, 19), COAT)]
P['forearm-l'] = [fill(capsule(*EL_L, 292, 648, 17, 17), COAT, False), line(capsule_open(*EL_L, 292, 648, 17, 17))] + paw(282, 684, True, 0.98)
P['forearm-r'] = [fill(capsule(*EL_R, mx(292), 648, 17, 17), COAT, False), line(capsule_open(*EL_R, mx(292), 648, 17, 17))] + paw(mx(282), 684, False, 0.98)

P['tuft'] = [fill('M396 116 C390 72 428 44 498 30 C470 50 458 62 460 78 C486 66 508 68 526 76 C500 86 488 100 486 118 Z', COAT)]
HEAD = ('M437 96 C520 96 572 148 586 214 C608 258 624 300 620 344 C612 410 530 450 437 450 '
        'C344 450 262 410 254 344 C250 300 266 258 288 214 C302 148 354 96 437 96 Z')
P['head'] = [fill(HEAD, COAT, False), clip(ellipse(CX, 380, 128, 74), HEAD, CREAM), line(HEAD)]
P['whiskers'] = [line(d, 2.5) for d in ('M330 318 Q250 322 168 344', 'M332 334 Q262 352 186 396',
                                        f'M{mx(330)} 318 Q{mx(250)} 322 {mx(168)} 344', f'M{mx(332)} 334 Q{mx(262)} 352 {mx(186)} 396')]
P['nose'] = [fill(ellipse(CX, 318, 28, 20), SALMON, width=4)]
P['scarf'] = [
    fill('M360 470 C310 448 252 452 206 486 C262 498 320 494 360 488 Z', SCARF),
    fill('M358 488 C302 502 252 530 222 572 C282 562 332 536 362 506 Z', SCARF),
    fill('M362 442 C404 452 474 452 520 442 C526 466 524 488 514 506 C470 514 404 514 362 502 C352 484 352 466 362 446 Z', SCARF),
    line('M376 460 C420 474 470 472 506 460', 3, SCARF_DARK),
]

EYES = {
    'open': {
        'eye-white-l': [fill(ellipse(369, 246, 34, 62), WHITE, width=4.5)],
        'eye-white-r': [fill(ellipse(mx(369), 246, 34, 62), WHITE, width=4.5)],
        'pupil-l': [fill(ellipse(388, 264, 15, 26), PUPIL, False)],
        'pupil-r': [fill(ellipse(mx(388), 264, 15, 26), PUPIL, False)],
        'brow-l': [line('M340 168 Q366 146 394 160', 6)],
        'brow-r': [line(f'M{mx(340)} 168 Q{mx(366)} 146 {mx(394)} 160', 6)],
    },
    'happy': {'eyes-happy': [line('M344 258 Q371 226 398 258', 6), line(f'M{mx(344)} 258 Q{mx(371)} 226 {mx(398)} 258', 6)]},
    'closed': {'eyes-closed': [line('M344 252 Q371 272 398 252', 6), line(f'M{mx(344)} 252 Q{mx(371)} 272 {mx(398)} 252', 6)]},
}
MOUTHS = {
    'smile': {'mouth-smile': [line('M386 352 Q437 394 488 352')]},
    'flat': {'mouth-flat': [line('M408 366 L466 366')]},
    'o': {'mouth-o': [fill(ellipse(CX, 372, 16, 20), MOUTH, width=4)]},
    'pant': {'mouth-pant': [fill('M396 352 Q437 348 478 352 Q470 392 437 398 Q404 392 396 352 Z', MOUTH, width=4),
                            fill('M422 380 Q437 376 452 380 L450 420 Q437 430 424 420 Z', TONGUE, width=3)]},
}
EXTRA = {
    'blush': [fill(ellipse(312, 366, 22, 12), '#F79A9A', False), fill(ellipse(mx(312), 366, 22, 12), '#F79A9A', False)],
    'sweat': [fill('M600 150 Q616 180 612 194 Q600 208 588 194 Q584 180 600 150 Z', '#7CC7FF', width=4)],
}
ORDER = ['tail', 'ear-l', 'ear-r', 'torso', 'thigh-l', 'thigh-r', 'shin-l', 'shin-r', 'tuft', 'head', 'whiskers', 'nose',
         'scarf', 'upper-arm-l', 'upper-arm-r', 'forearm-l', 'forearm-r']


def write(name, elements):
    x0, y0, x1, y1 = bbox(elements)
    w, h = x1 - x0, y1 - y0
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.1f}" height="{h:.1f}" '
           f'viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}">' + ''.join(elements) + '</svg>')
    open(os.path.join(HERE, name + '.svg'), 'w').write(svg)
    return [name, round(x0, 1), round(y0, 1), 1, 0, '']


# ---- side view (facing right) ----------------------------------------------------
S = {}
S_HIP, S_KNEE = (372, 780), (372, 846)
S_SH, S_EL = (404, 552), (392, 614)
FAR_DX = 26


def side_leg(dx, coat, cream):
    h, k = (S_HIP[0] + dx, S_HIP[1]), (S_KNEE[0] + dx, S_KNEE[1])
    thigh = [fill(capsule(*h, *k, 34, 31), coat, False), line(capsule_open(*h, *k, 34, 31))]
    d = (f'M{302 + dx} 902 C{298 + dx} 878 {318 + dx} 864 {352 + dx} 864 L{440 + dx} 864 C{500 + dx} 864 {532 + dx} 886 '
         f'{532 + dx} 916 C{532 + dx} 942 {516 + dx} 954 {490 + dx} 954 L{322 + dx} 954 C{302 + dx} 954 {298 + dx} 930 {302 + dx} 902 Z')
    shin = [fill(capsule(*k, k[0] + 2, 878, 29, 28), coat, False), line(capsule_open(*k, k[0] + 2, 878, 29, 28)), fill(d, cream)]
    return thigh, shin


def side_arm(dx, coat, cream):
    sh, el = (S_SH[0] + dx, S_SH[1]), (S_EL[0] + dx, S_EL[1])
    upper = [fill(capsule(*sh, *el, 21, 19), coat)]
    fore = [fill(capsule(*el, el[0] - 6, 646, 17, 17), coat, False), line(capsule_open(*el, el[0] - 6, 646, 17, 17))] + paw(el[0] - 14, 688, False, 0.98, cream)
    return upper, fore


S['s-tail'] = [fill(taper((340, 772), (270, 800), (236, 768), (210, 704), (184, 636), (112, 612), (54, 668), 22, 7), TAIL, width=3)]
S['s-thigh-f'], S['s-shin-f'] = side_leg(FAR_DX, FAR, FAR_CREAM)
S['s-arm-f'], S['s-fore-f'] = side_arm(FAR_DX, FAR, FAR_CREAM)
S_TORSO = ('M356 420 L352 452 C322 500 304 560 304 630 C304 690 324 740 338 780 A34 34 0 0 0 406 780 '
           'C440 740 470 690 474 620 C478 556 470 500 446 452 L444 420 Z')
S['s-torso'] = [fill(S_TORSO, COAT, False),
                clip('M430 470 C470 520 478 600 470 660 C464 700 450 730 430 760 L400 760 C420 680 424 560 410 470 Z', S_TORSO, CREAM),
                line('M352 452 C322 500 304 560 304 630 C304 690 324 740 338 780 M406 780 C440 740 470 690 474 620 C478 556 470 500 446 452')]
S['s-thigh-n'], S['s-shin-n'] = side_leg(0, COAT, CREAM)
S['s-arm-n'], S['s-fore-n'] = side_arm(0, COAT, CREAM)
S_EAR = ellipse(206, 204, 100, 124)
S['s-ear-f'] = [fill(S_EAR, COAT, False), clip(ellipse(182, 214, 74, 94), S_EAR, SALMON), line(S_EAR)]
S['s-tuft'] = [fill('M322 126 C310 76 340 44 382 24 C366 46 360 62 364 76 C396 52 430 42 462 34 C440 52 422 66 414 84 '
                    'C442 74 470 74 492 82 C462 90 444 102 434 116 Z', COAT)]
S_HEAD = ('M332 98 C410 72 482 110 512 160 C540 204 546 250 554 284 C578 286 600 300 600 320 C600 344 590 372 570 394 '
          'C540 424 492 438 442 438 C372 438 290 422 252 372 C222 332 232 252 262 182 C280 140 302 108 332 98 Z')
S['s-head'] = [fill(S_HEAD, COAT, False), clip(ellipse(526, 372, 92, 58), S_HEAD, CREAM), line(S_HEAD),
               line('M372 300 Q436 306 494 324', 2.5), line('M384 354 Q430 340 470 330', 2.5)]
S['s-eye'] = [fill(ellipse(490, 222, 34, 58), WHITE, width=4.5)]
S['s-pupil'] = [fill(ellipse(512, 248, 11, 25), PUPIL, False)]
S['s-brow'] = [line('M418 162 Q438 140 462 152', 6)]
S['s-whiskers'] = [line(d, 2.5) for d in ('M566 318 Q614 304 664 300', 'M566 330 Q616 336 662 358')]
S['s-nose'] = [fill(ellipse(582, 302, 24, 18), SALMON, width=4)]
S['s-mouth-smile'] = [line('M500 352 Q530 384 566 360')]
S['s-mouth-flat'] = [line('M510 366 L560 364')]
S['s-mouth-open'] = [fill('M504 352 Q534 360 564 350 Q560 388 534 394 Q508 388 504 352 Z', MOUTH, width=4)]
S['s-scarf'] = [
    fill('M342 462 C296 440 226 446 158 484 C224 496 292 494 342 486 Z', SCARF),
    fill('M340 484 C284 500 222 530 186 572 C254 562 312 534 346 506 Z', SCARF),
    fill('M332 438 C380 454 430 458 466 446 C474 466 472 488 462 504 C420 510 374 506 332 494 C324 476 324 456 332 438 Z', SCARF),
]
SIDE_ORDER = ['s-tail', 's-thigh-f', 's-shin-f', 's-arm-f', 's-fore-f', 's-torso', 's-thigh-n', 's-shin-n',
              's-ear-f', 's-tuft', 's-head', 's-eye', 's-pupil', 's-brow', 's-whiskers', 's-nose', 's-mouth-smile',
              's-scarf', 's-arm-n', 's-fore-n']


layout = [write(n, P[n]) for n in ORDER]
for group, sets in (('eyes', EYES), ('mouth', MOUTHS)):
    for option, parts in sets.items():
        for name, els in parts.items():
            e = write(name, els); e[0] = f'{option}|{name}'; e[5] = group; layout.append(e)
json.dump(layout, open(os.path.join(HERE, 'layout.json'), 'w'), indent=0)
print('wrote', len(layout), 'parts')


def render(svg_body, out_png, ref_png):
    import pymupdf
    from PIL import Image
    path = out_png.replace('.png', '.svg')
    open(path, 'w').write('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1000" viewBox="0 0 700 1000">' + svg_body + '</svg>')
    pix = pymupdf.open(path)[0].get_pixmap(alpha=True)
    art = Image.frombytes('RGBA', (pix.width, pix.height), pix.samples).resize((700, 1000))
    ref = Image.open(os.path.join(HERE, ref_png)).convert('RGBA')
    sbs = Image.new('RGBA', (1400, 1000), 'white'); sbs.paste(ref, (0, 0)); sbs.alpha_composite(art, (700, 0))
    sbs.convert('RGB').save(out_png)


if '--preview' in sys.argv:
    front = [n for n in ORDER if n not in ('scarf', 'upper-arm-l', 'upper-arm-r', 'forearm-l', 'forearm-r')]
    body = (''.join(''.join(P[n]) for n in front[:front.index('nose') + 1])
            + ''.join(''.join(v) for v in EYES['open'].values()) + ''.join(MOUTHS['smile']['mouth-smile'])
            + ''.join(''.join(P[n]) for n in ('scarf', 'upper-arm-l', 'upper-arm-r', 'forearm-l', 'forearm-r')))
    render(body, os.path.join(HERE, 'side-by-side.png'), 'reference-stage.png')
    render(''.join(''.join(S[n]) for n in SIDE_ORDER), os.path.join(HERE, 'side-by-side-side.png'), 'reference-side.png')
    print('previews written')


# ---- export for the Rive generator (rive/lib/rigs.js) -------------------------------
# Rig units: the mouse's 80 x 96 box, feet centred at (40, 93).
RIG_K = 88 / (955 - 30)            # tuft tip to sole -> 88 units
RIG_O = (CX, 955, 40, 93)
SIDE_O = (414, 955, 40, 93)
STROKE_K = 3.5                     # outlines as thick on screen as the cat's

JOINTS = {
    'rig': (CX, 955), 'tail': (372, 776), 'torso': (CX, 760),
    'legL': HIP_L, 'shinL': KNEE_L, 'legR': HIP_R, 'shinR': KNEE_R,
    'armL': SH_L, 'foreL': EL_L, 'armR': SH_R, 'foreR': EL_R,
    'head': (CX, 450), 'earL': (290, 236), 'earR': (mx(290), 236),
    'eyes': (CX, 244), 'pupils': (CX, 262), 'browL': (366, 156), 'browR': (mx(366), 156),
    'mouth': (CX, 366), 'blush': (CX, 366), 'sweat': (600, 180),
}
SIDE_JOINTS = {
    'sRig': (414, 955), 'sTail': (340, 772), 'sTorso': (390, 780), 'sHead': (400, 440),
    'sLegN': S_HIP, 'sShinN': S_KNEE, 'sLegF': (S_HIP[0] + FAR_DX, S_HIP[1]), 'sShinF': (S_KNEE[0] + FAR_DX, S_KNEE[1]),
    'sArmN': S_SH, 'sForeN': S_EL, 'sArmF': (S_SH[0] + FAR_DX, S_SH[1]), 'sForeF': (S_EL[0] + FAR_DX, S_EL[1]),
    'sEyes': (490, 222), 'sPupil': (512, 248), 'sMouth': (532, 364),
}


def rive_shapes(elements, O):
    import re
    R = lambda pt: [round((pt[0] - O[0]) * RIG_K + O[2], 3), round((pt[1] - O[1]) * RIG_K + O[3], 3)]
    out = []
    for e in elements:
        for tag in re.findall(r'<path\b[^>]*/>', e):
            at = dict(re.findall(r'([\w-]+)="([^"]*)"', tag))
            if not at.get('d'): continue
            subs = [{'closed': s['closed'], 'start': R(s['start']), 'segs': [{k: R(v) for k, v in seg.items()} for seg in s['segs']]}
                    for s in to_cubics(at['d'])]
            fillc = at.get('fill') if at.get('fill', 'none') != 'none' else None
            stroke = at.get('stroke')
            out.append({'paths': subs, 'fill': fillc, 'stroke': stroke,
                        'width': round(float(at.get('stroke-width', 0)) * RIG_K * STROKE_K, 3) if stroke else 0})
    return out


if '--rive' in sys.argv:
    flat = dict(P)
    for sets in (EYES, MOUTHS):
        for o in sets.values(): flat.update(o)
    flat.update(EXTRA)
    R = lambda O: (lambda pt: [round((pt[0] - O[0]) * RIG_K + O[2], 3), round((pt[1] - O[1]) * RIG_K + O[3], 3)])
    data = {'joints': {k: R(RIG_O)(v) for k, v in JOINTS.items()},
            'parts': {n: rive_shapes(els, RIG_O) for n, els in flat.items()},
            'side': {'joints': {k: R(SIDE_O)(v) for k, v in SIDE_JOINTS.items()},
                     'parts': {n: rive_shapes(els, SIDE_O) for n, els in S.items()}}}
    out = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'rive', 'lib', 'mouse-drawn.json'))
    json.dump(data, open(out, 'w'), separators=(',', ':'))
    print('wrote', out, os.path.getsize(out), 'bytes')
