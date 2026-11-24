// Content-script entry point: builds the world and wires the layers together.
(function (g) {
  const DP = g.DeskPet;

  async function boot() {
    if (window.top !== window) return; // top-level pages only, never iframes
    if (window.innerWidth < 420 || window.innerHeight < 320) return; // too small to host a pet
    if (document.querySelector('desk-pet')) return;

    const world = { settings: await DP.settings.load(), sfx: DP.sfx };
    if (DP.loadRiveAssets) await DP.loadRiveAssets(); // desktop: use Rive art if it is there
    world.stage = new DP.Stage();
    world.cat = world.stage.addCharacter(DP.characters.cat);
    world.mouse = world.stage.addCharacter(DP.characters.mouse);
    world.sensors = new DP.Sensors(world.stage.host, { external: !!DP.desktop });
    world.terrain = new DP.Terrain();
    world.loco = new DP.Locomotion(world);
    // Extension: page elements are the terrain. (Desktop feeds windows instead.)
    if (!DP.desktop) world.domTerrain = new DP.DomTerrain(world.terrain);
    world.director = new DP.Director();
    world.behaviors = new DP.Behaviors(world);
    world.breaks = new DP.BreakSequence(world);

    function apply(settings) {
      const pace = world.settings && world.settings.visitMinutes;
      world.settings = settings;
      world.sfx.volume = settings.volume;
      world.stage.setOpacity(settings.opacity);
      world.cat.setScale(settings.size);
      world.mouse.setScale(settings.size);
      world.stage.setEnabled(settings.enabled);
      if (settings.enabled) world.behaviors.start();
      else world.behaviors.stop();
      if (pace !== undefined && pace !== settings.visitMinutes) world.behaviors.setPace();
    }
    apply(world.settings);
    DP.settings.onChange(apply);

    // Run a scene on request (the desktop app's tray menu, for testing).
    // A pointer gag asked for from the menu would aim at the menu itself
    // (the menu bar, or the taskbar), out of reach: wait - up to 8 s - for
    // the pointer to come back down to somewhere they can get at.
    world.playScene = (name) => {
      const b = world.behaviors;
      const go = () => b.play(name, 2.2, (s) => b[name](s));
      if (name !== 'wrongMouse' && name !== 'hello') return go();
      const until = Date.now() + 8000;
      const wait = () => {
        const cur = world.sensors.cursor;
        const settled = Date.now() - (cur.movedAt || 0) > 350; // stopped moving
        if ((b.cursorReachable() && cur.y > 60 && settled) || Date.now() > until) go();
        else setTimeout(wait, 150);
      };
      setTimeout(wait, 400);
    };

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'BREAK_START') {
        world.breaks.start();
        sendResponse({ ok: true });
      } else if (msg.type === 'SCENE' && typeof world.behaviors[msg.name] === 'function' && world.settings.enabled) {
        world.playScene(msg.name);
      } else if (msg.type === 'BREAK_RETURN') {
        world.breaks.onReturn();
      }
    });

    DP.world = world; // handy for the demo page and for debugging
  }

  boot().catch((e) => console.warn('[DeskPet] failed to start', e));
})(globalThis);
