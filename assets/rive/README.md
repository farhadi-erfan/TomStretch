# Rive character art

`node rive/build.js --publish` generates both files from code and puts them here (see the main README). You can also replace either with one drawn by hand in the Rive editor.

Drop `cat.riv` and/or `mouse.riv` in this folder and the desktop app draws that character with Rive instead of the built-in SVG rig. No code changes; restart the app. A character without a file keeps the SVG rig, so you can replace one at a time.

Nothing else changes: scenes, movement, signs, the break lunge and the timer are all driven from code and only tell the character *which state to be in*, *which way it is heading* and *where to look*.

## What each file must contain

| | Cat | Mouse |
| --- | --- | --- |
| File | `cat.riv` | `mouse.riv` |
| Artboard name | `Cat` | `Mouse` |
| State machine name | `Pet` | `Pet` |
| Artboard proportions | 96 × 112 (6:7), or larger with `frame` set | 46 × 55, or larger with `frame` set |

(The names are set in `src/content/characters/cat.js` and `mouse.js` under `rive:` if you prefer others.)

**Artboard layout.** The character stands on the bottom edge, centred horizontally, and the code treats the bottom-centre as the feet. Leave the background transparent. To leave room for squashes, leans and tails, make the artboard bigger than the character and describe where the character's box sits in it with `rive.frame` in the character file (`width`, `height` of the artboard; `left` offset of the box; `box` its size), in artboard units. The generated files do this.

**Where the sign goes.** Signs are drawn by the app, on a stick that starts at the raised paw. With `holding` on, the paw should be at about 77% across and 37% down the artboard for the cat (78%, 45% for the mouse). If your pose puts it elsewhere, change `hand` in the character file.

## Values the app sets

Expose these in either of the two ways Rive offers; the app tries both, by name:

- **Data binding (Rive's current way):** properties on the artboard's default view model, bound to whatever they should drive.
- **State machine inputs (the older way):** inputs on the `Pet` state machine.

Any you leave out are simply ignored, so you can start with `state` alone.

| Name | Type | Meaning |
| --- | --- | --- |
| `state` | Number | Which animation to play; see the table below. |
| `dir` | Number | `1` heading right, `-1` heading left. Mirror the side-view states with it. |
| `lookX` | Number | Gaze, `-100` (left) to `100` (right). |
| `lookY` | Number | Gaze, `-100` (up) to `100` (down). |
| `holding` | Boolean | One paw is up holding a sign; blend it over whatever else the body is doing. |

Wire `state` as conditions on transitions out of *Any State* (`state == 2` → run, and so on). Give the transitions a short blend (around 100–150 ms) — that cross-fading is the main thing Rive gives you over the SVG rig, where poses snap.

### `state` values

"View" is how the SVG rig draws the state today; it is a suggestion, not a rule.

| Value | State | View | Notes |
| --- | --- | --- | --- |
| 0 | `idle` | front | Breathing, blinking. |
| 1 | `walk` | side | Loop. |
| 2 | `run` | side | Loop, fast. |
| 3 | `sneak` | front | Not used at present. |
| 4 | `crouch` | side | Wind-up before a jump; hold with a wiggle. |
| 5 | `pounce` | side | In the air, stretched; hold. |
| 6 | `land` | front | One-shot squash, then hold a neutral pose. |
| 7 | `confused` | front | Head tilt, scratching. |
| 8 | `embarrassed` | front | Blush, looking down. |
| 9 | `look` | front | Alert, looking around. |
| 10 | `search` | front | Not used at present. |
| 11 | `startled` | front | One-shot jump, then hold the surprise. |
| 12 | `tired` | front | Panting, sweating. |
| 13 | `sleep` | front | Curled up or dozing upright. |
| 14 | `wave` | front | Loop. |
| 15 | `cheer` | front | Loop. |
| 16 | `press` | front | Stomping on a button under the feet. |
| 17 | `taunt` | front | Mouse: thumbs in ears. |
| 18 | `laugh` | front | Loop. |
| 19 | `climb` | side | Hand over hand up a wall on the heading side. |
| 20 | `fall` | front | Flailing; loop. |
| 21 | `hang` | front | Standing on nothing, not yet falling. Eyes follow `lookX`/`lookY`. |
| 22 | `scared` | front | Trembling behind paws. |
| 23 | `grab` | front | Clinging to something overhead with both paws. |
| 24 | `splat` | front | Pressed against the glass, facing the viewer. Shown at about 25× size, so the face needs to hold up large. |
| 25 | `ex-overhead` | front | Exercise: arms slowly up overhead and down. |
| 26 | `ex-side` | front | Exercise: arms up, lean left, lean right. |
| 27 | `ex-shoulders` | front | Exercise: shoulder rolls. |
| 28 | `ex-march` | front | Exercise: marching on the spot. |
| 29 | `ex-lookaway` | front | Exercise: looking far left, far right. |
| 30 | `ex-wrists` | front | Exercise: shaking out the hands. |

The numbers are the order of the entries in `src/content/animation/states.js`. **Add new states at the end of that file** so existing numbers never change. At runtime the list is `DeskPet.RIVE_STATE_IDS`.

## What has been tested

The generated files: they compile with no problems, and both the Rive CLI's renderer and the desktop app show the states, left/right mirroring, gaze and the sign-holding arm working from the view model values, with the sign landing in the raised paw.

**The watermark.** Files published from a Free Rive workspace carry Rive's splash screen: each character draws as a solid black box for about 2.5 seconds after it loads, then appears normally. In the app that happens once per character per launch. Publishing from a paid workspace removes it; deleting the `.riv` files here returns the app to the SVG rig.

The renderer:

With Rive's public sample files standing in for a character: the file loads and draws inside the character's box in the overlay, the sign attaches, the drawing is re-rendered at full resolution when the character is scaled up, and setting a Number state machine input by name changes the animation. Not tested, because no file with them was to hand: view model (data binding) properties, and of course an actual cat.

## Limits

- Desktop app only for now. The Chrome extension keeps the SVG rig: the Rive runtime is WebAssembly, which a content script cannot rely on being allowed to run inside arbitrary pages.
- The app reads only files in this folder, by file name.
