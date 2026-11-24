# TomStretch — cat & mouse break buddies

An animated cat and mouse who drop in on your screen. They are not there all the time: every minute or two (*Drop by* in settings: often, now and then, rarely, or only for breaks) they tear through mid-chase, nap on top of a window, or go after your pointer the way a pet would — and every 30 minutes the cat asks you to take a stretch break.

The cat ("Biscuit") is a hand-drawn blue-grey tabby with one bent ear, and the mouse ("Pip") a sand-coloured mouse with an olive scarf. The desktop app draws them with Rive; the Chrome extension and the desktop app's "Simple art" fallback draw the same art as an SVG rig animated with CSS. Names live in `displayName` in `src/content/characters/*.js`.

It ships in two forms that share the same pet code:

- a **desktop app** (Electron) — the pets live on your whole desktop, stand on your windows and can minimize whichever one you are working in;
- a **Chrome extension** — the pets live inside web pages, stand on page elements and can minimize the Chrome window.

## What they do

| Scene | What happens |
| --- | --- |
| Wrong mouse | They run in mid-chase and make their way to your pointer over whatever is on screen: along ledges, up the edges of windows and panels, hopping over things in the way (or turning back when they can't). The mouse leaps at the pointer, bonks into it and drops away; the cat, a beat behind, grabs the pointer instead and clings to it wherever you move it, then realises, lets go and holds up "Oops." If there is truly no way up, they look at it and give up. Test it from the menu-bar item **Reach for the pointer**. |
| Nap | The cat makes its way up onto a window (or a page element), curls up and sleeps. Drag the window sideways and it rides along. Move it down, close it, or scroll the page away, and the cat is left standing on nothing: it looks left, looks right, looks down, waves, and drops. |
| Chase | A chase across the floor, with a taunt and a miss. Anything in the way is hopped over or climbed; if it can't be, they double back. |
| Pointer shake | Shake the pointer (the gesture that enlarges it on macOS) while they are on screen: both jump, cower, and bolt. |
| Welcome back | After you have been away, the cat pops in with a greeting. |
| Break | The chase ends with the cat out of breath on top of the window you are working in, on its minimize button (or hanging off the button, when the window fills the screen). It holds up a sign: **Take a break?** Yes / Snooze / No. Snooze, or no answer for 3 minutes: it comes back later. No: it skips this one. |
| Yes | The cat stomps the window's real minimize button and drops when the window vanishes, pulls out the plan, and does two exercises with you, about 45 seconds in all, beside a timer board with a **Done** button. The timer starts only once the window is gone, and the window comes back when the break ends. The mouse stays out of the way. In the Chrome extension, where the browser's own button is out of reach, the cat stomps a red stand-in instead. |

**They never float.** Everything they stand on or climb comes from a terrain map, and they move by running, jumping (in arcs), climbing vertical edges and falling. Walking is obstacle-aware: an edge in the way at leg height is hopped onto or over, climbed if it's too tall, or makes them turn back. A small route planner strings hops together: floor → ledge → ledge → window top.

**They speak with signs.** Every line is on a little wooden sign held up in one paw; nothing hovers over their heads.

Exercises: chin tucks, neck side tilts and a chest opener (for "tech neck"), plus reach overhead, side stretch, shoulder rolls, stand up and move, look far away, loosen hands and wrists. Each break has one neck exercise and one other. Each can be switched off in settings.

## Installation

### macOS (Apple silicon or Intel)

1. Download the `.dmg` for your Mac from the [Releases](../../releases) page: `arm64` for Apple silicon (M1 and later), `x64` for Intel.
2. Open it and drag **TomStretch** into **Applications**.
3. The app is not signed with an Apple developer certificate yet, so macOS blocks the first launch (it may say the app "is damaged"). Clear the download flag once:

   ```bash
   xattr -dr com.apple.quarantine "/Applications/TomStretch.app"
   ```

   Then open it normally. (Alternatively: try to open it, then *System Settings → Privacy & Security → Open Anyway*.)
4. A cat appears in the menu bar. macOS asks for permissions the first time each feature is used; grant them to **TomStretch** in *System Settings → Privacy & Security*:
   - **Screen Recording** — to find edges inside windows to climb on (optional);
   - **Accessibility**, and control of **System Events** — to press a window's minimize button during a break (optional).

   After granting Screen Recording, quit TomStretch from its menu and open it again.

### Windows 10/11

1. Download the installer from the [Releases](../../releases) page and run it: `TomStretch-…-win.exe` works on any Windows PC. The smaller `-win-x64.exe` (Intel/AMD) and `-win-arm64.exe` (ARM, including Windows in Parallels on an Apple-silicon Mac) each hold one version.
2. The installer is not code-signed yet, so SmartScreen may warn: choose **More info → Run anyway**.
3. A cat appears in the notification area (click the `^` by the clock if it's hidden).

The Windows version has had only light testing on real machines. Expected differences: no live window tracking (the pets use edges found on screen instead of window outlines), and the minimize button's position comes from Windows (or, for apps that draw their own title bar, its usual place at the window's top right).

**To quit:** the tray menu or the **Quit TomStretch** button at the bottom of the settings window. In Task Manager it is listed as **TomStretch**.

**To uninstall:** Start menu → **Uninstall TomStretch**, or Settings → Apps → TomStretch → Uninstall. This stops the app and removes it along with its settings, logs and caches. Installing a newer version keeps your settings.

**Coming from Desk Pet (0.1.x)?** The app was renamed to TomStretch in 0.2.0, and your settings carry over. On Windows the installer replaces Desk Pet. On macOS, quit Desk Pet, delete `Desk Pet.app` from Applications, and grant the permissions again to TomStretch.

### If something looks wrong

- **A pet is invisible but its signs and sounds work:** tick **Simple art** in the tray menu. The pets switch to the built-in drawings, which don't depend on the graphics setup. The app also switches by itself when it detects the Rive art isn't drawing.
- **Nothing appears at all (often in a virtual machine):** if the graphics driver crashes, TomStretch restarts once with GPU drawing turned off and keeps it off. You can force that from the start by launching it with `--safe-graphics`. Startup errors appear in a dialog and in the log.
- **To report a problem:** choose **Show log file** in the tray menu and send `tomstretch.log`. It holds warnings and errors only, plus the system's graphics and display-scale details; it never includes screen contents.

### From source (either system)

Needs [Node.js](https://nodejs.org) 20 or later.

```bash
git clone https://github.com/farhadi-erfan/TomStretch.git
```

```bash
cd TomStretch
```

```bash
npm install
```

```bash
npm start
```

Run this way on macOS, the permission entries are named **Electron** (or your terminal) rather than TomStretch.

To build the installers yourself: `npm run dist:mac` on a Mac, `npm run dist:win` on Windows (output in `dist/`). Pushing a tag such as `v0.2.0` builds both on GitHub and attaches them to a release (`.github/workflows/release.yml`).

## Desktop app

A cat icon appears in the menu bar (system tray on Windows); there is no Dock icon. The menu has **Take a break now**, **Reach for the pointer** (runs the pointer gag on demand), snooze/pause, the main toggles, **Settings…** and **Quit**. Only one copy runs at a time.

- The overlay is transparent and click-through: clicks, scrolling and typing go to whatever is underneath. It only catches the mouse over the break sign, the timer board and (extension) the red button.
- It never takes keyboard focus, so the app you are working in stays frontmost — which is how it knows which window to minimize.
- If you have not touched the keyboard or mouse for 90 seconds, a break that comes due waits for you.

### What the pets can stand on (desktop)

| Source | What it gives | Permission |
| --- | --- | --- |
| Window geometry | Tops and sides of every app window, tracked live (about 7 times a second) so they ride and fall with windows you drag. | None |
| Screen scan | Edges *inside* windows, in web pages and web apps as much as anywhere: horizontal ones (tops of cards, images, toolbars, panels) to stand on and vertical ones (their sides, sidebars, dividers) to climb or bump into. Text is ignored: an edge with letters right beside it (the top or baseline of a line of text) is dropped, so paragraphs, headings and labels don't become ledges. A live half-resolution stream of the screen is searched several times a second while the pets are on screen (*Look for ledges* in settings: 2 to 15 times, 8 by default), once a second otherwise, and right after a window moves; if the stream can't start, one-off screenshots every second or so are the fallback. Frames are analysed in memory and discarded; nothing is saved or sent. Switch off with *Climb on things inside windows*. | Screen Recording |
| Accessibility | Finding and pressing the real minimize button. | Accessibility, and control of *System Events* |

macOS asks for each permission the first time it is needed (see Installation). Without Screen Recording the pets still use window tops and sides. Full-screen windows cannot be minimized. With Stage Manager on, a minimized window goes to the side strip; that works too.

**Windows** finds the front window's minimize button through `user32` (via PowerShell) and minimizes that window; this has had little testing. There is no window tracking there yet, so the pets rely on the screen scan to find surfaces. **Linux** is not implemented.

To check it boots without touching any windows: `DESKPET_SMOKE=/tmp/deskpet npm start` (the folder must exist) runs a whole break (pretending to minimize), saves screenshots and quits; it uses its own profile, so it can run beside a normal copy. Adding `DESKPET_LIVE=1` also sends the cat to minimize your front window for real and checks it comes back. `DESKPET_SMOKE_EVAL=/path/script.js` instead evaluates that script in the overlay, prints its result and saves a screenshot. `DESKPET_VISION_DEBUG=1 npm start` prints each batch of edges the screen stream finds.


## Chrome extension

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (the one containing `manifest.json`).
4. Open or reload any normal web page, and wait a few seconds for the first visit.
5. Click the extension's toolbar icon for settings, or **Take a break now**.

After editing code, press the reload icon on the extension's card and reload the page.

In a page, the terrain is the page itself: buttons, inputs, images, videos, headings, tables and code blocks that are at least 90px wide. Scrolling moves the terrain, so scrolling a napping cat's perch away drops it.

### Try the pet code without installing

`demo/index.html` runs the same code on a plain page with `chrome.*` stubbed, plus buttons to trigger each scene. It must be served over HTTP:

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765/demo/index.html>. Minimizing is simulated there (the page dims for four seconds).

### Extension permissions

| Permission | Why |
| --- | --- |
| `storage` | Saves your settings. |
| `alarms` | The break timer (survives the service worker going to sleep). |
| Content script on `<all_urls>` | The broad one. The characters are drawn *inside* the page you are looking at, so the script has to be allowed everywhere. It reads the pointer position, the on-screen position and size of the element types listed above, clicks on buttons (only *that* one happened), and tab visibility/focus. It never reads page text or form values, never clicks or changes anything on the page, and sends nothing anywhere — there is no network code. |

## Architecture

```
manifest.json            Chrome extension
package.json             desktop app
src/
  shared/
    settings.js          defaults + load/save/onChange over chrome.storage
    exercises.js         exercise catalogue (name, instructions, seconds, animation state)
  background/
    service-worker.js    extension: break alarm, snooze, minimize, return detection
  content/               THE PETS (shared by both shells)
    characters/          ARTWORK    cat.js, mouse.js: front + side SVG rigs, pivot points, sign hand
    animation/           ANIMATION
      states.js            the state vocabulary (run, climb, fall, hang, scared, splat, ex-side, …)
      rig.css.js           how each state looks on the SVG rig
      character.js         Character (position, zoom, tweening, gaze, signs) + SvgRigRenderer
      rive-renderer.js     optional Rive renderer (desktop), used when a .riv file is present
    stage/               overlay in a shadow root, prop styles, sound effects
    sensors.js           INPUT      pointer, shake, buttons, focus → events (read-only)
    world/               GEOMETRY
      terrain.js           layers of rectangles → platforms to stand on
      dom-terrain.js       extension: page elements → terrain
      locomotion.js        run / jump / climb / fall, and the hop-by-hop route planner
    behaviors/           LOGIC
      director.js          runs one prioritised, cancellable routine at a time
      behaviors.js         the scenes: visits, wrong mouse, nap + fall, scare, welcome
    break/
      break-sequence.js    up to the minimize button, the question, the stomp, two exercises
    main.js              wires it all together
  popup/                 settings UI (also the desktop app's settings window)
desktop/                 the Electron shell
  main.js                  timer, storage, tray, overlay window (the service worker's role)
  window-tracker.jxa.js    helper process streaming window geometry
  vision.js                screen permission, one-off screenshots (fallback)
  vision-edges.js          image → ledges and walls (shared)
  vision-capture.*         hidden window: live screen stream, edges several times a second
  window-control.js        find, press and undo the front window's minimize button
  preload.js               narrow IPC bridge
  chrome-shim.js           maps chrome.storage / chrome.runtime onto that bridge
  overlay.html             loads src/content exactly as the extension does
  overlay-bridge.js        pointer, idle state and terrain → the pets; click-through toggling
rive/                    Rive versions of the characters, built from code with the Rive CLI
  lib/rigs.js              the drawings as trees of pivoted parts
  lib/poses.js             every animation state as data (a port of rig.css.js)
  lib/rml.js               writes Rive markup (RML)
  build.js                 generates rive/*/scene.rml, checks, renders, optionally publishes
assets/rive/             cat.riv / mouse.riv go here; README has the contract
demo/                    stubbed-chrome test page
```

The layers only talk through narrow interfaces:

- **Scenes never touch SVG or CSS.** They call `character.setState('climb')`, `say('…')`, `gaze(x, y)`, and move through `Locomotion` (`travel`, `jump`, `fall`, `exit`). Scenes are plain `async` functions, so a gag reads top to bottom like a storyboard.
- **States are a named vocabulary** (`states.js`). The renderer decides what a state looks like.
- **Terrain is just rectangles.** Whoever knows the screen calls `terrain.setLayer(name, rects)`; the pets do not care whether a ledge is a window, a `<button>` or an edge found in a screenshot. A VLM or the accessibility tree could feed the same call later for semantic labels ("this is a video", "this is the Send button").
- **The director** gives each routine a handle whose `wait`/`move` calls are cancellation points, so a break (priority 3) cleanly interrupts a scare (2), which interrupts a visit (1).
- **Both shells speak one message protocol** (`BREAK_START`, `LOCATE_MINIMIZE`, `MINIMIZE_WINDOW`, `SNOOZE`, `BREAK_DONE`, …), so `src/content` and `src/popup` do not know which one they are running in.

### The artwork

Each character has two SVG rigs: a **front view** for acting (idle, reactions, exercises) and a **side view** for travel (walk, run, crouch, pounce, climb), mirrored to face the way it is heading. `states.js` says which view a state uses.

- *New SVG art:* the drawn art comes from `characters/art.js`, generated by `node rive/build-svg.js` (see *Rive* below). To draw by hand instead, delete that file and replace the `svg` / `sideSvg` strings in `characters/cat.js`, keeping the part class names (front: `rig`, `torso`, `head`, `arm-l` › `fore`, `leg-l` › `shin`, `tail`, `eyes`, `pupil`; side: the same with an `s-` prefix, limbs tagged `s-near` / `s-far`) and updating the pivot points in `css` and the `hand` position. All existing animations then apply.
- *Rive:* `rive/` builds Rive versions of both characters from code, with the [Rive CLI](https://rive.app/docs/cli). `rive/lib/rigs.js` nests each character's parts into a tree of joints, `rive/lib/poses.js` every animation state; `node rive/build.js` turns them into Rive markup (`rive/*/scene.rml`), compiles and checks it, and renders a preview PNG. The Rive versions add what the CSS rig can't do: 110 ms cross-fades between every state, and blended gaze. `node rive/build.js --publish` writes `cat.riv` and `mouse.riv` into `assets/rive/`, where the desktop app picks them up instead of the SVG rig; that step needs `rive login`, and on a Free Rive plan the files carry Rive's splash-screen watermark: each character shows as a black box for about 2.5 seconds after loading, once per launch. Delete the files in `assets/rive/` to go back to the SVG rig. The cat's artwork is drawn in code in `design/parts/drawn/draw.py` (front and side views, every part a clean vector shape with round joints): `python3 design/parts/drawn/draw.py --rive` exports it to `rive/lib/cat-drawn.json` (needs `pip install shapely`), and `pose_test.py` beside it renders the parts in bent poses to check the joints. The mouse is drawn the same way in `design/parts/mouse-drawn/draw.py` (over a front-and-side turnaround from ChatGPT, saved beside it as `reference-stage.png` and `reference-side.png`) and exports to `rive/lib/mouse-drawn.json`; both scripts share `design/parts/drawn/vec.py`. `OLD_CAT=1` / `OLD_MOUSE=1 node rive/build.js` builds the old orange cat or grey mouse instead. Climbing a wall, the far arm is clipped at the wall's edge so the paw reaching round it disappears behind the window; `rive/lib/edge.js` works out where that edge falls in the drawing, for both renderers. `node rive/build-svg.js` turns the same drawn parts into the SVG rig (`src/content/characters/art.js`) that the Chrome extension and the "Simple art" fallback use. [assets/rive/README.md](assets/rive/README.md) is the contract any `.riv`, generated or hand-made, has to meet.
- *Anything else* (sprite sheets, Lottie): implement the renderer contract at the top of `animation/character.js` (`mount`, `setState`, `setFacing`, `lookAt`, optionally `setHolding`, `setZoom`) and return it from `DP.rendererFor`.

### Adding things

- *An exercise:* add an entry to `shared/exercises.js`, a state **at the end of** `states.js` (Rive files refer to states by position), a CSS block to `rig.css.js`, and a default in `settings.js`.
- *A scene:* write an `async scene(s)` method in `behaviors.js`, add it to the options in `visit()`, and end it with `loco.exit(...)` or `leaveStage(s)`.

## Known limits

Desktop app:

- Primary display only.
- The screen scan finds edges, not meaning: it cannot tell a button from a picture frame, lags a scroll by a couple of seconds, and sees whatever is on screen (including a dark line in a photo).
- The wrong-mouse gag only starts while the pointer is in the lower half of the screen, where the mouse can reach it with one leap from the floor.
- The cat's route to the minimize button uses the window's top edge; for a maximised window it shins up the edge of the screen and hangs off the button.

Chrome extension:

- The pets cannot appear on `chrome://` pages, the Web Store, or the new-tab page. A break due there is held and starts on your next tab switch.
- The break runs in the active tab only; each tab has its own independent pair.
- There is no idle detection, so a break can fire while you are away (it snoozes itself after 3 minutes).

Both:

- Sound is off by default; in the extension it stays silent until you have clicked on the page (browser autoplay rules).
