---
name: vector-character
description: Turn a character idea or a generated reference image into a rigged vector character for TomStretch - clean SVG parts drawn in code, a Rive file and the SVG rig, with every existing animation working. Use when adding or redrawing a character, changing how one looks (new part, colour, outfit, proportions), or fixing joints and art glitches in cat or mouse.
---

# From a picture to an animated vector character

This is how the hand-drawn cat and mouse were made. Each step below has a command to run and a picture to look at before you go on.

```
reference image(s)  ──►  draw.py (parts in code)  ──►  rive/lib/<char>-drawn.json
 front + side view        --preview: overlay check        │
                          pose_test.py: joint check        ├─► node rive/build.js [--publish] ─► assets/rive/<char>.riv  (desktop)
                                                           └─► node rive/build-svg.js          ─► src/content/characters/art.js (extension, fallback)
```

Animation is not drawn per character. The poses in `rive/lib/poses.js` (Rive) and `src/content/animation/rig.css.js` (SVG) move named parts about named joints. A new drawing that keeps the part and joint names gets every state for free: walk, climb, exercises, gaze and signs.

## Ground rules

- **Original characters only.** The design can be in a genre or style, but it must not be a recreation of an existing character: no copied names, looks or model sheets.
- **Generated or downloaded images stay out of git.** Keep references in `design/` and don't commit them. Commit the scripts (`draw.py`, `vec.py`) and what the build writes.
- **Rive:** `--publish` needs the user's own `rive login`. Never sign in for them. A Free plan adds Rive's splash watermark; say so and leave it alone.

## 1. Get a reference

You need a **turnaround**: one character in a **front view** and a **side view facing right**. Use the same proportions in both, flat colours and a clear dark outline. An image generator does this well. The mouse came from a ChatGPT turnaround and the cat from a model sheet.

Ask for:
- "character turnaround, front and side view, full body, standing, neutral pose"
- "flat colours, bold even outline, no shading, plain white background"
- arms slightly away from the body, legs slightly apart

Separated limbs make the joints readable. The user generates the image (or you do, if they give you a tool and ask you to). Save it under `design/`.

Crop and scale each view onto the **700 × 1000 stage** that every drawing uses, with the feet at about y = 955. Save the front as `design/parts/<char>-drawn/reference-stage.png` and the side as `reference-side.png`. A few lines of Pillow do this; `reference.json` in `design/parts/drawn/` records the crop, scale and offset used for the cat.

**Don't trace the image.** Tracing generated art (vtracer, Recraft's SVG export, and the `cut_parts.py` / `split_svg.py` / `fit_parts.py` tools in `design/parts/`) was tried first and dropped. The results had lumpy outlines and parts that didn't separate at the joints, so they tore when posed. The reference is something to draw *over*, not something to convert.

## 2. Draw the parts in code

Copy `design/parts/mouse-drawn/draw.py` to `design/parts/<char>-drawn/draw.py` and redraw. It imports the shared helpers from `design/parts/drawn/vec.py`:

- `capsule(x1, y1, x2, y2, r1, r2)`: a tapered limb with round ends. Use it for every arm and leg segment.
- `capsule_open(...)`: the same outline without the start cap, for a child limb that sits on its parent's joint.
- `ellipse`, `fill(d, colour, outline=True)`, `line(d)`: shapes with the standard ink outline.
- `band(...)`: fur tufts. `sample`, `poly_d` and shapely do geometry such as `clip()`, which cuts an inner patch to an outer shape as plain paths with no clip-paths.
- `to_cubics`, `bbox`: used by the export.

**Rules that keep the rig clean when it moves:**

1. **Each part that moves is its own shape**, and its name comes from the contract:
   - **Front view:** `tail`, `ear-l/r`, `head`, `torso`, `upper-arm-l/r`, `forearm-l/r`, `thigh-l/r`, `shin-l/r`, `eye-white-l/r`, `pupil-l/r`, `brow-l/r`, `nose`, `whiskers`, `mouth-smile|flat|o|pant`, plus optional `tuft`, `scarf`, `blush`, `sweat`.
   - **Side view:** the same parts with an `s-` prefix, and limbs ending in `-n` (near) or `-f` (far).
   - A character can leave a part out; it comes out empty.
2. **Joints are round.** Every child limb starts with an unoutlined round cap centred on its pivot. Make the cap a hair narrower than the parent's end and draw it in front of the parent. The torso ends in half-discs round the hips, under the thighs' caps. Then a bent elbow or knee shows no gap and no doubled outline.
3. **Pivots go in `JOINTS` / `SIDE_JOINTS`.** List every pivot (`rig`, `torso`, `head`, `armL`, `foreL`, `legL`, `shinL`, `tail`, `eyes`, `pupils`, `brow*`, `mouth`, …; side: `sRig`, `sTorso`, `sHead`, `sArmN`, `sForeN`, `sArmF`, …) in stage coordinates, at the centre of the round cap.
4. **The far limbs in the side view** are a copy of the near ones, shifted by `FAR_DX` and drawn a shade darker (`FAR`, `FAR_CREAM`).
5. **Keep everything symmetric** with `mx(x)` (mirror about `CX`), so left and right can't drift apart.
6. **Expressions are parallel sets** (`EYES`, `MOUTHS`) that share a joint. The app shows one at a time.

**Check the drawing:**
- `python3 design/parts/<char>-drawn/draw.py --preview` writes `side-by-side.png` and `side-by-side-side.png`: the reference and the drawing side by side. Look at them with Read and compare silhouettes, proportions and where the joints sit.
- `python3 design/parts/drawn/pose_test.py <parts dir> poses.png` bends the arms and legs through a strip of poses. Look for gaps, seams or doubled outlines at the elbows, knees, hips and shoulders.

Repeat until both look right. It needs `pip install shapely`, plus `pymupdf` and Pillow for the previews.

## 3. Export for the rig

Set the box and scale at the bottom of `draw.py`:
- `RIG_K` sets the size: (top of the head to the sole) in the stage, mapped onto the rig box height.
- `RIG_O` / `SIDE_O` map the stage's feet point to the box's feet point, e.g. `(CX, 955, 40, 93)` for an 80 × 96 box.
- `STROKE_K` sets the outline thickness on screen.

Then run:

```bash
python3 design/parts/<char>-drawn/draw.py --rive
```

This writes `rive/lib/<char>-drawn.json`, which holds the joints, the parts as cubic paths with their paint, and the side view.

For a **new** character, also:

- **`rive/lib/rigs.js`:** add it to the build. Copy how `drawn(D, box, isMouse)` / `drawnSide(...)` are used for the mouse, set its box, and adjust the stacking order if the design needs it.
- **`rive/build-svg.js`:** add it to `chars` with its `box`, pupil travel and head-turn limit `lim`.
- **`rive/lib/poses.js`:** usually unchanged. Add per-character tweaks only if a pose clips the art; for example, wide heads need the elbow bent to raise a paw past them.
- **`src/content/characters/<char>.js`:** add the character, modelled on `mouse.js`:
  - `width` / `height` on screen;
  - `sole` = feet y / box height, so it stands on the ground with no gap;
  - `hand`, where the sign stick starts;
  - `rive: { file, artboard, stateMachine, frame: { width, height, left, box } }`.

  Also load it in `manifest.json`, `desktop/overlay.html` and `demo/`.

## 4. Build

```bash
node rive/build.js
```

This generates `rive/*/scene.rml`, compiles and checks it with the Rive CLI, and renders a preview. No sign-in is needed. Look at the preview PNG.

To check one state, render a frame with the CLI's `--commands`: `viewport 400x400`, `fit contain`, `data state=19` (the state number is its position in `states.js`: walk = 1, climb = 19), `advance 400ms`, `screenshot out.png`. Write `advance` in ms; a bare number didn't work.

```bash
node rive/build-svg.js
```

This regenerates `src/content/characters/art.js`, the SVG rig used by the extension and the "Simple art" fallback.

```bash
node rive/build.js --publish
```

Run this only when the art is final and the user is signed in to Rive (`rive login`). It installs `assets/rive/<char>.riv`.

## 5. Check it in the app

- **Demo page** (SVG rig): start the `demo` server from `.claude/launch.json` on port 8765 and open `demo/`. Reload `art.js` with `fetch(src, {cache: 'reload'})`, or the browser serves the old file. Play states from the console: `DeskPet.world.cat.setState('climb')`, `face(-1)`, `say('Hi!', 3000)` (raises the sign paw). Look at the front view, the side view facing each way, the climb, the exercises and a held sign.
- **Desktop app** (Rive): run `DESKPET_SMOKE=<dir> npx electron .`. It runs a full break, saves screenshots and logs the renderer, which should be `RiveRenderer`. Use `DESKPET_SMOKE_EVAL=<script>` to pose the pets and take a screenshot. Stub `behaviors.setState` / routines first so a scene doesn't override your pose.
- **Feet:** measure the gap between the sole and the ground in a screenshot. It should be 0. If it isn't, fix `sole`.
- **Climbing:** the far paw should disappear behind the wall's edge (see `rive/lib/edge.js`). Check facing left and facing right.

Then update the README's *The artwork* section if anything in the pipeline changed, and commit the scripts and the build output. Leave the reference images and design scratch out.
