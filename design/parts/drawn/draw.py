# The cat, drawn from scratch as clean vector parts, in stage coordinates
# (the 700 x 1000 stage the parts editor uses, where the model sheet's front
# view is laid out by reference.json).
#
#   python3 design/parts/drawn/draw.py            writes <part>.svg + layout.json
#   python3 design/parts/drawn/draw.py --preview  also renders preview.png and
#                                                 overlay.png (over the model sheet)
#
# Every part is its own SVG whose viewBox is its box on the stage, so the
# layout places each at its box corner with scale 1. Limbs are capsules with
# round ends, so they overlap cleanly at the joints when rotated.
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from vec import capsule, capsule_open, ellipse, fill, line, sample, poly_d, band, to_cubics, bbox  # noqa: E402

COAT = '#7C7993'
STRIPE = '#454761'
CREAM = '#FCDFC0'
SALMON = '#F4846B'
INK = '#3B2A20'
WHITE = '#FFFDF8'
MOUTH = '#5A2430'
TONGUE = '#F28C8C'
LINE = 5  # outline width, stage px


def striped(d, stripes, color=COAT, extra=(), outline=None):
    """A shape with fur bands cut to its outline (real geometry, no clip
    paths, so any renderer and Rive draw it the same). The outline is drawn
    last so bands never cross it; `extra` (a belly) sits between."""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    shape = unary_union([Polygon(p).buffer(0) for p in sample(d)])
    bands = unary_union([Polygon(p).buffer(0) for b in stripes for p in sample(b)]).intersection(shape)
    return ([f'<path d="{d}" fill="{color}"/>', f'<path d="{poly_d(bands)}" fill="{STRIPE}"/>'] + list(extra)
            + [line(outline or d)])


# ---- the parts (back to front) ---------------------------------------------
# name: (list of SVG elements, group, option) - group/option for swappable sets.
P = {}

TAIL = ('M268 690 C230 722 160 758 96 750 C36 742 14 680 26 622 C38 566 82 532 128 534 '
        'C160 536 170 570 146 584 C110 590 82 610 80 648 C78 690 110 702 150 696 C196 690 232 670 256 650 Z')
P['tail'] = striped(TAIL, [band(30, 700, 110, 680, 16, 20), band(10, 620, 96, 632, 16, 20), band(80, 520, 118, 590, 16, 18),
                            band(140, 770, 138, 690, 14, 18), band(206, 750, 192, 676, 14, 17)])

P['ear-l'] = [fill('M214 236 C184 172 176 102 188 34 C232 58 274 92 308 128 Z', COAT),
              fill('M222 206 C200 156 196 112 202 70 C236 92 262 112 284 136 Z', SALMON, False),
              line('M214 190 L238 174', 3), line('M212 168 L232 160', 3)]
P['ear-r'] = [
    fill('M424 150 C450 100 510 70 552 82 C582 92 586 132 578 170 C574 194 546 196 544 174 '
         'C542 150 538 132 526 136 L484 240 Z', COAT),
    fill('M446 160 C462 136 486 124 512 136 L488 222 Z', SALMON, False),
    line('M526 136 C534 128 540 120 544 108', 4),
]


def foot(cx, cy, flip):
    # A big round-toed foot, flat underneath, toe creases from the front edge.
    f = -1 if flip else 1
    X = lambda dx: cx + f * dx
    d = (f'M{X(-78)} {cy + 10} C{X(-82)} {cy - 22} {X(-50)} {cy - 40} {X(-6)} {cy - 40} '
         f'C{X(40)} {cy - 40} {X(80)} {cy - 26} {X(82)} {cy + 2} C{X(84)} {cy + 28} {X(70)} {cy + 34} {X(48)} {cy + 34} '
         f'L{X(-58)} {cy + 34} C{X(-74)} {cy + 34} {X(-78)} {cy + 24} {X(-78)} {cy + 10} Z')
    return [fill(d, CREAM), line(f'M{X(14)} {cy + 32} Q{X(12)} {cy + 14} {X(18)} {cy + 2}', 4),
            line(f'M{X(46)} {cy + 32} Q{X(46)} {cy + 16} {X(52)} {cy + 4}', 4)]


# Joints: each child limb starts with a round cap centred on its pivot, drawn
# in front of its parent with no outline on that cap, and a hair narrower than
# the parent's end, so it can rotate any amount and the joint stays clean.
HIP_L, HIP_R, KNEE_L, KNEE_R = (272, 690), (428, 690), (262, 776), (432, 776)
thigh = lambda h, k: capsule(*h, *k, 46, 41)
P['thigh-l'] = striped(thigh(HIP_L, KNEE_L), [band(214, 712, 268, 718, 12, 15), band(214, 750, 262, 756, 11, 14)],
                       outline=capsule_open(*HIP_L, *KNEE_L, 46, 41))
P['thigh-r'] = striped(thigh(HIP_R, KNEE_R), [band(486, 712, 432, 718, 12, 15), band(482, 750, 434, 756, 11, 14)],
                       outline=capsule_open(*HIP_R, *KNEE_R, 46, 41))
P['shin-l'] = [fill(capsule(*KNEE_L, 252, 800, 38.5, 38), COAT, False), line(capsule_open(*KNEE_L, 252, 800, 38.5, 38))] + foot(220, 818, True)
P['shin-r'] = [fill(capsule(*KNEE_R, 446, 800, 38.5, 38), COAT, False), line(capsule_open(*KNEE_R, 446, 800, 38.5, 38))] + foot(456, 818, False)

# The torso ends in two half-discs around the hips (hidden under the thighs'
# caps, never outlined) with the crotch between them.
TORSO = ('M292 392 C266 410 248 424 246 456 C238 520 232 600 234 650 C234 668 230 680 226 690 '
         'A46 46 0 0 0 318 690 C328 668 376 668 382 690 A46 46 0 0 0 474 690 '
         'C470 680 466 668 466 650 C466 600 460 520 452 456 C448 424 430 408 408 392 Z')
TORSO_LINE = ('M292 392 C266 410 248 424 246 456 C238 520 232 600 234 650 C234 668 230 680 226 690 '
              'M318 690 C328 668 376 668 382 690 '
              'M474 690 C470 680 466 668 466 650 C466 600 460 520 452 456 C448 424 430 408 408 392')
P['torso'] = striped(TORSO, [band(236, 470, 282, 494, 14, 16), band(228, 560, 276, 572, 14, 16), band(232, 640, 276, 640, 12, 14),
                              band(462, 470, 418, 494, 14, 16), band(470, 560, 424, 572, 14, 16), band(466, 640, 424, 640, 12, 14)],
                      extra=[fill('M352 420 C392 420 410 480 410 548 C410 620 388 670 352 670 C316 670 294 620 294 548 '
                                  'C294 480 312 420 352 420 Z', CREAM, False)], outline=TORSO_LINE)


def paw(cx, cy, flip):
    # A mitten fist: round, a thumb bump on the inside, two finger creases.
    f = -1 if flip else 1
    X = lambda dx: cx + f * dx
    d = (f'M{X(-36)} {cy - 26} C{X(-24)} {cy - 50} {X(24)} {cy - 50} {X(36)} {cy - 26} '
         f'C{X(48)} {cy - 4} {X(46)} {cy + 34} {X(24)} {cy + 46} C{X(6)} {cy + 54} {X(-22)} {cy + 52} {X(-34)} {cy + 38} '
         f'C{X(-46)} {cy + 24} {X(-44)} {cy + 6} {X(-36)} {cy - 4} C{X(-48)} {cy - 8} {X(-50)} {cy - 22} {X(-36)} {cy - 26} Z')
    return [fill(d, CREAM), line(f'M{X(-2)} {cy + 50} Q{X(-4)} {cy + 32} {X(2)} {cy + 20}', 4),
            line(f'M{X(20)} {cy + 46} Q{X(22)} {cy + 30} {X(26)} {cy + 20}', 4)]


ARM_L = capsule(272, 462, 236, 548, 27, 25)
ARM_R = capsule(428, 462, 464, 548, 27, 25)
P['upper-arm-l'] = striped(ARM_L, [band(204, 500, 252, 518, 12, 15)])
P['upper-arm-r'] = striped(ARM_R, [band(496, 500, 448, 518, 12, 15)])
P['forearm-l'] = striped(capsule(236, 548, 218, 590, 22.5, 22), [band(186, 566, 230, 574, 10, 12)], outline=capsule_open(236, 548, 218, 590, 22.5, 22)) + paw(208, 622, True)
P['forearm-r'] = striped(capsule(464, 548, 482, 590, 22.5, 22), [band(514, 566, 470, 574, 10, 12)], outline=capsule_open(464, 548, 482, 590, 22.5, 22)) + paw(490, 622, False)

P['head'] = [
    fill('M340 100 C400 98 448 128 466 176 C480 214 498 246 522 262 L496 274 L532 300 L490 304 '
         'C470 360 422 396 366 396 C312 396 272 372 256 340 L210 346 L236 320 L160 302 L224 286 '
         'L148 256 L224 246 C214 186 258 104 340 100 Z', COAT),
    fill('M322 104 C326 82 344 70 366 66 C354 80 350 92 352 104 Z', COAT),
    fill('M348 104 C362 80 382 72 396 68 C382 84 374 94 372 106 Z', COAT),
    fill('M356 112 L374 178 L392 114 Z', STRIPE, False),
    fill('M318 118 L330 160 L340 112 Z', STRIPE, False),
    fill('M404 120 L404 164 L424 132 Z', STRIPE, False),
]
P['whiskers'] = [line(d, 2.5) for d in (
    'M300 282 Q230 262 160 262', 'M300 294 Q222 292 150 302', 'M304 306 Q240 322 178 342',
    'M432 282 Q496 262 556 264', 'M434 294 Q500 300 560 312', 'M430 306 Q490 324 548 346')]
P['nose'] = [fill('M356 278 Q378 270 400 278 Q402 292 378 304 Q354 292 356 278 Z', SALMON, width=4)]

EYES = {
    'open': {
        'eye-white-l': [fill(ellipse(322, 226, 32, 48), WHITE, width=4.5)],
        'eye-white-r': [fill(ellipse(399, 229, 26, 46), WHITE, width=4.5)],
        'pupil-l': [fill(ellipse(327, 238, 10, 18), INK, False)],
        'pupil-r': [fill(ellipse(396, 238, 10, 18), INK, False)],
        'brow-l': [line('M292 168 Q314 146 344 156', 6)],
        'brow-r': [line('M380 152 Q406 144 428 164', 6)],
    },
    'happy': {
        'eyes-happy': [line('M292 238 Q320 206 348 238', 6), line('M374 238 Q396 210 418 238', 6)],
    },
    'closed': {
        'eyes-closed': [line('M292 232 Q320 252 348 232', 6), line('M374 232 Q396 250 418 232', 6)],
    },
}
MOUTHS = {
    'smile': {'mouth-smile': [line('M312 310 Q372 352 436 306')]},
    'laugh': {'mouth-laugh': [fill('M306 298 Q362 320 426 300 Q414 362 366 378 Q318 370 306 298 Z', MOUTH, width=4.5),
                              fill('M330 350 Q346 334 364 342 Q384 334 392 352 Q380 378 360 378 Q338 372 330 350 Z', TONGUE, False)]},
    'flat': {'mouth-flat': [line('M342 326 L404 326')]},
    'o': {'mouth-o': [fill(ellipse(372, 332, 16, 20), MOUTH, width=4)]},
    'pant': {'mouth-pant': [fill('M326 308 Q372 304 418 308 Q410 352 372 358 Q334 352 326 308 Z', MOUTH, width=4),
                            fill('M354 340 Q372 336 390 340 L388 390 Q372 402 356 390 Z', TONGUE, width=3)]},
}

ORDER = ['tail', 'ear-l', 'ear-r', 'torso', 'thigh-l', 'thigh-r', 'shin-l', 'shin-r',
         'upper-arm-l', 'upper-arm-r', 'forearm-l', 'forearm-r', 'head', 'whiskers', 'nose']


# ---- output ------------------------------------------------------------------
def write(name, elements):
    x0, y0, x1, y1 = bbox(elements)
    w, h = x1 - x0, y1 - y0
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.1f}" height="{h:.1f}" '
           f'viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}">' + ''.join(elements) + '</svg>')
    open(os.path.join(HERE, name + '.svg'), 'w').write(svg)
    return [name, round(x0, 1), round(y0, 1), 1, 0, '']


layout = [write(n, P[n]) for n in ORDER]
for group, sets in (('eyes', EYES), ('mouth', MOUTHS)):
    for option, parts in sets.items():
        for name, els in parts.items():
            e = write(name, els)
            e[0] = f'{option}|{name}'
            e[5] = group
            layout.append(e)
json.dump(layout, open(os.path.join(HERE, 'layout.json'), 'w'), indent=0)
print('wrote', len(layout), 'parts')

if '--preview' in sys.argv:
    import pymupdf
    from PIL import Image
    shown = [e for e in layout if not e[5] or e[0].split('|')[0] in ('open', 'laugh')]
    full = ('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1000" viewBox="0 0 700 1000">'
            + ''.join(''.join(P.get(e[0], []) or next(v for s in (EYES, MOUTHS) for o in s.values() for k, v in o.items() if k == e[0].split('|')[-1]))
                      for e in shown) + '</svg>')
    open(os.path.join(HERE, 'preview.svg'), 'w').write(full)
    pix = pymupdf.open(os.path.join(HERE, 'preview.svg'))[0].get_pixmap(alpha=True)
    art = Image.frombytes('RGBA', (pix.width, pix.height), pix.samples)
    art.save(os.path.join(HERE, 'preview.png'))
    ref = Image.open(os.path.join(HERE, 'reference-stage.png')).convert('RGBA')
    ghost = Image.blend(Image.new('RGBA', ref.size, 'white'), ref, 0.35)
    ghost.alpha_composite(art.resize(ref.size))
    side = Image.new('RGBA', (1400, 1000), 'white'); side.paste(ref, (0, 0)); side.alpha_composite(art.resize(ref.size), (700, 0))
    ghost.convert('RGB').save(os.path.join(HERE, 'overlay.png'))
    side.convert('RGB').save(os.path.join(HERE, 'side-by-side.png'))
    print('previews written')


# ---- side view (facing right), from the sheet's "Cat Side" ------------------
# Same stage scale as the front. Near limbs in COAT, far limbs a shade darker
# and set back a little; the far ones sit behind the body.
FAR = '#625F7C'
FAR_CREAM = '#E9C8A6'
FAR_DX = 10
S_HIP, S_KNEE, S_SHOULDER, S_ELBOW = (300, 690), (300, 776), (330, 440), (322, 545)
S = {}


def shift(d, dx):
    import re
    out, i = [], 0
    for cmd, args in re.findall(r'([MLCQAZ])([^MLCQAZ]*)', d):
        n = re.findall(r'-?\d*\.?\d+', args)
        if cmd == 'A':  # rx ry rot large sweep x y
            n = n[:5] + [f'{float(n[5]) + dx:g}', n[6]]
        else:
            n = [f'{float(v) + dx:g}' if j % 2 == 0 else v for j, v in enumerate(n)]
        out.append(cmd + ' '.join(n))
    return ' '.join(out)


def side_leg(dx, coat, cream):
    h = (S_HIP[0] + dx, S_HIP[1]); k = (S_KNEE[0] + dx, S_KNEE[1])
    thigh = striped(capsule(*h, *k, 46, 41), [band(248 + dx, 740, 300 + dx, 746, 12, 15)], color=coat,
                    outline=capsule_open(*h, *k, 46, 41))
    foot = ('M240 826 C236 802 254 786 284 786 L332 786 C370 786 394 804 394 830 C394 848 382 856 364 856 '
            'L258 856 C246 856 240 844 240 826 Z')
    shin = [fill(capsule(*k, k[0] - 2, 800, 38.5, 38), coat, False), line(capsule_open(*k, k[0] - 2, 800, 38.5, 38)),
            fill(shift(foot, dx), cream), line(f'M{344 + dx} 854 Q{342 + dx} 836 {350 + dx} 822', 4),
            line(f'M{368 + dx} 852 Q{368 + dx} 838 {376 + dx} 826', 4)]
    return thigh, shin


def side_arm(dx, coat, cream):
    sh = (S_SHOULDER[0] + dx, S_SHOULDER[1]); el = (S_ELBOW[0] + dx, S_ELBOW[1])
    upper = striped(capsule(*sh, *el, 26, 24), [band(296 + dx, 490, 350 + dx, 498, 11, 14)], color=coat)
    fore = striped(capsule(*el, el[0] - 6, 600, 22.5, 22), [], color=coat, outline=capsule_open(*el, el[0] - 6, 600, 22.5, 22))
    p = paw(el[0] - 6, 636, False)
    p[0] = p[0].replace(CREAM, cream)
    return upper, fore + p


S['s-tail'] = striped(shift(TAIL, -30), [shift(b, -30) for b in (band(30, 700, 110, 680, 16, 20), band(10, 620, 96, 632, 16, 20),
                      band(80, 520, 118, 590, 16, 18), band(140, 770, 138, 690, 14, 18), band(206, 750, 192, 676, 14, 17))])
S['s-thigh-f'], S['s-shin-f'] = side_leg(FAR_DX, FAR, FAR_CREAM)
S['s-arm-f'], S['s-fore-f'] = side_arm(FAR_DX, FAR, FAR_CREAM)
S_TORSO = ('M292 392 C274 420 264 460 268 500 C272 540 262 580 252 620 C246 648 250 672 254 690 A46 46 0 0 0 346 690 '
           'C350 650 360 610 374 570 C390 524 400 470 390 424 C386 408 380 398 372 392 Z')
S['s-torso'] = striped(S_TORSO, [band(250, 450, 322, 462, 14, 16), band(250, 520, 318, 526, 14, 16), band(246, 600, 306, 600, 13, 15)],
                       extra=[fill('M372 410 C398 450 398 520 380 566 C366 604 358 640 352 682 L336 682 C340 620 350 560 358 500 '
                                   'C362 462 362 428 372 410 Z', CREAM, False)],
                       outline='M292 392 C274 420 264 460 268 500 C272 540 262 580 252 620 C246 648 250 672 254 690 M346 690 C350 650 360 610 374 570 C390 524 400 470 390 424 C386 408 380 398 372 392')
S['s-thigh-n'], S['s-shin-n'] = side_leg(0, COAT, CREAM)
S['s-arm-n'], S['s-fore-n'] = side_arm(0, COAT, CREAM)
S['s-ear-f'] = [fill('M320 150 C340 110 390 92 426 104 C446 112 448 140 436 152 C428 160 418 156 416 146 '
                     'C412 132 400 128 390 136 L380 180 Z', FAR), line('M392 112 C408 112 418 124 418 140', 3.5)]
S_HEAD = ('M300 112 C360 100 420 120 448 170 C462 200 470 240 478 262 C494 272 494 296 478 306 '
          'C470 312 462 318 452 322 C446 350 420 380 370 388 C330 394 290 386 266 366 L236 372 L250 350 '
          'L196 352 L226 326 L148 316 L208 292 L150 258 L210 246 L168 196 L222 202 C230 150 260 118 300 112 Z')
S['s-head'] = striped(S_HEAD, [band(146, 252, 300, 264, 16, 20), band(150, 304, 288, 308, 14, 18),
                               band(344, 96, 352, 164, 12, 15), band(384, 104, 380, 158, 11, 13)])
S['s-ear-n'] = [fill('M200 196 C206 130 236 70 266 36 C290 80 312 130 324 172 Z', COAT),
                fill('M222 180 C230 132 248 94 264 72 C280 106 294 138 304 168 Z', SALMON, False)]
S['s-eye'] = [fill(ellipse(405, 228, 30, 46), WHITE, width=4.5)]
S['s-pupil'] = [fill(ellipse(426, 244, 11, 19), INK, False)]
S['s-brow'] = [line('M372 162 Q402 140 434 168', 6)]
S['s-whiskers'] = [line(d, 2.5) for d in ('M452 292 Q500 272 534 270', 'M454 302 Q500 300 530 312', 'M448 312 Q490 322 512 340')]
S['s-nose'] = [fill('M458 266 Q474 262 486 272 Q484 286 472 290 Q458 282 458 266 Z', SALMON, width=4)]
S['s-mouth-smile'] = [line('M408 318 Q440 334 468 308')]
S['s-mouth-flat'] = [line('M418 322 L462 320')]
S['s-mouth-open'] = [fill('M414 314 Q444 318 466 308 Q462 340 440 346 Q418 340 414 314 Z', MOUTH, width=4)]
SIDE_ORDER = ['s-tail', 's-thigh-f', 's-shin-f', 's-arm-f', 's-fore-f', 's-torso', 's-thigh-n', 's-shin-n',
              's-ear-f', 's-head', 's-ear-n', 's-eye', 's-pupil', 's-brow', 's-whiskers', 's-nose', 's-mouth-smile',
              's-arm-n', 's-fore-n']

if '--preview' in sys.argv:
    import pymupdf
    from PIL import Image
    body = ''.join(''.join(S[n]) for n in SIDE_ORDER)
    open(os.path.join(HERE, 'preview-side.svg'), 'w').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1000" viewBox="0 0 700 1000">' + body + '</svg>')
    pix = pymupdf.open(os.path.join(HERE, 'preview-side.svg'))[0].get_pixmap(alpha=True)
    art = Image.frombytes('RGBA', (pix.width, pix.height), pix.samples).resize((700, 1000))
    ref = Image.open(os.path.join(HERE, 'reference-side.png')).convert('RGBA')
    sbs = Image.new('RGBA', (1400, 1000), 'white'); sbs.paste(ref, (0, 0)); sbs.alpha_composite(art, (700, 0))
    sbs.convert('RGB').save(os.path.join(HERE, 'side-by-side-side.png'))


# ---- export for the Rive generator (rive/lib/rigs.js) -------------------------
# python3 draw.py --rive  writes rive-parts.json: every part's shapes as cubic
# paths in rig units (the 120 x 140 box the app's poses are written in: feet
# centre at (60, 136)), plus the joints, so rigs.js only has to nest them.
RIG_K = 124 / (852 - 34)          # ear tip to sole -> 124 units
RIG_O = (352, 852, 60, 136)       # stage point -> rig point
STROKE_K = 2.2                    # outlines read ~1.5 px at the default size

JOINTS = {  # stage coordinates
    'rig': (352, 852), 'tail': (250, 680), 'torso': (350, 690),
    'legL': HIP_L, 'shinL': KNEE_L, 'legR': HIP_R, 'shinR': KNEE_R,
    'armL': (272, 462), 'foreL': (236, 548), 'armR': (428, 462), 'foreR': (464, 548),
    'head': (350, 395), 'earL': (250, 180), 'earR': (452, 190),
    'eyes': (360, 230), 'pupils': (370, 238), 'browL': (318, 162), 'browR': (404, 160),
    'mouth': (370, 322), 'blush': (366, 300), 'sweat': (510, 190),
}
EXTRA = {
    'blush': [fill(ellipse(262, 300, 24, 13), '#F79A9A', False), fill(ellipse(472, 300, 24, 13), '#F79A9A', False)],
    'sweat': [fill('M510 160 Q526 190 522 204 Q510 218 498 204 Q494 190 510 160 Z', '#7CC7FF', width=4)],
}


def rive_shapes(elements, origin=None):
    import re
    out = []
    O = origin or RIG_O
    R = lambda pt: [round((pt[0] - O[0]) * RIG_K + O[2], 3), round((pt[1] - O[1]) * RIG_K + O[3], 3)]
    _unused = lambda pt: [round((pt[0] - RIG_O[0]) * RIG_K + RIG_O[2], 3), round((pt[1] - RIG_O[1]) * RIG_K + RIG_O[3], 3)]
    for e in elements:
        for tag in re.findall(r'<path\b[^>]*/>', e):
            at = dict(re.findall(r'([\w-]+)="([^"]*)"', tag))
            if not at.get('d'): continue
            subs = []
            for s in to_cubics(at['d']):
                segs = [{k: R(v) for k, v in seg.items()} for seg in s['segs']]
                subs.append({'closed': s['closed'], 'start': R(s['start']), 'segs': segs})
            fillc = at.get('fill') if at.get('fill', 'none') != 'none' else None
            stroke = at.get('stroke')
            out.append({'paths': subs, 'fill': fillc, 'stroke': stroke,
                        'width': round(float(at.get('stroke-width', 0)) * RIG_K * STROKE_K, 3) if stroke else 0})
    return out


if '--rive' in sys.argv:
    R = lambda pt: [round((pt[0] - RIG_O[0]) * RIG_K + RIG_O[2], 3), round((pt[1] - RIG_O[1]) * RIG_K + RIG_O[3], 3)]
    flat = {}
    for n in ORDER: flat[n] = P[n]
    for sets in (EYES, MOUTHS):
        for o in sets.values(): flat.update(o)
    flat.update(EXTRA)
    data = {'joints': {k: R(v) for k, v in JOINTS.items()},
            'parts': {n: rive_shapes(els) for n, els in flat.items()}}
    SIDE_O = (300, 852, 58, 136)
    RS = lambda pt: [round((pt[0] - SIDE_O[0]) * RIG_K + SIDE_O[2], 3), round((pt[1] - SIDE_O[1]) * RIG_K + SIDE_O[3], 3)]
    far = lambda pt: (pt[0] + FAR_DX, pt[1])
    side_joints = {
        'sRig': (300, 852), 'sTail': (226, 680), 'sTorso': (300, 690), 'sHead': (330, 395),
        'sLegN': S_HIP, 'sShinN': S_KNEE, 'sLegF': far(S_HIP), 'sShinF': far(S_KNEE),
        'sArmN': S_SHOULDER, 'sForeN': S_ELBOW, 'sArmF': far(S_SHOULDER), 'sForeF': far(S_ELBOW),
        'sEyes': (405, 228), 'sPupil': (426, 244), 'sMouth': (440, 320),
    }
    data['side'] = {'joints': {k: RS(v) for k, v in side_joints.items()},
                    'parts': {n: rive_shapes(els, SIDE_O) for n, els in S.items()}}
    out = os.path.join(HERE, '..', '..', '..', 'rive', 'lib', 'cat-drawn.json')
    json.dump(data, open(out, 'w'), separators=(',', ':'))
    print('wrote', os.path.normpath(out), os.path.getsize(out), 'bytes')
