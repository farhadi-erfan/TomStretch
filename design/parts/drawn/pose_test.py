# Pose the drawn parts: rotate arms/legs about their joints and render a strip.
#   python3 pose_test.py <parts dir> <out.png>     e.g. python3 pose_test.py . poses.png
import re, sys, os, tempfile
import pymupdf
from PIL import Image
D = sys.argv[1]; OUT = sys.argv[2]
def body(n):
    s = open(os.path.join(D, n + '.svg')).read()
    return re.search(r'<svg[^>]*>(.*)</svg>', s, re.S).group(1)
SH_L, EL_L, SH_R, EL_R = (272, 462), (236, 548), (428, 462), (464, 548)
HIP_L, KN_L = (272, 690), (262, 776)
def g(content, ang, c):
    return f'<g transform="rotate({ang} {c[0]} {c[1]})">{content}</g>'
def pose(sh, el, sh_r, el_r, hip=0, knee=0):
    # left arm: shoulder angle sh, elbow el (forearm rotates with the arm, then about the moved elbow)
    larm = g(body('upper-arm-l') + g(body('forearm-l'), el, EL_L), sh, SH_L)
    rarm = g(body('upper-arm-r') + g(body('forearm-r'), el_r, EL_R), sh_r, SH_R)
    lleg = g(body('thigh-l') + g(body('shin-l'), knee, KN_L), hip, HIP_L)
    parts = [body('tail'), body('ear-l'), body('ear-r'), body('torso'), lleg, body('thigh-r'), body('shin-r'),
             larm, rarm, body('head'), body('whiskers'), body('nose'),
             body('eye-white-l'), body('eye-white-r'), body('pupil-l'), body('pupil-r'), body('brow-l'), body('brow-r'),
             body('mouth-smile')]
    return '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900">' + ''.join(parts) + '</svg>'
poses = [(0, 0, 0, 0), (0, 70, 0, -70), (40, 120, -40, -120), (60, 100, -150, -40, 30, -70), (-20, -60, 20, 60, -40, 80)]
tiles = []
for i, p in enumerate(poses):
    f = os.path.join(tempfile.gettempdir(), f'pose{i}.svg')
    open(f, 'w').write(pose(*p))
    pix = pymupdf.open(f)[0].get_pixmap(alpha=False)
    tiles.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples).crop((0, 20, 700, 900)))
W = Image.new('RGB', (700 * len(tiles), 880), 'white')
for i, t in enumerate(tiles): W.paste(t, (700 * i, 0))
W.resize((350 * len(tiles), 440)).save(OUT)
