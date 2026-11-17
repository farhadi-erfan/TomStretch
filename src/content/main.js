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
      world.settings = settings;
      world.sfx.volume = settings.volume;
      world.stage.setOpacity(settings.opacity);
      world.cat.setScale(settings.size);
      world.mouse.setScale(settings.size);
      world.stage.setEnabled(settings.enabled);
      if (settings.enabled) world.behaviors.start();
      else world.behaviors.stop();
    }
    apply(world.settings);
    DP.settings.onChange(apply);

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'BREAK_START') {
        world.breaks.start();
        sendResponse({ ok: true });
      } else if (msg.type === 'SCENE' && typeof world.behaviors[msg.name] === 'function' && world.settings.enabled) {
        // Run a scene on request (the desktop app's tray menu, for testing).
        world.behaviors.play(msg.name, 2.2, (s) => world.behaviors[msg.name](s));
      } else if (msg.type === 'BREAK_RETURN') {
        world.breaks.onReturn();
      }
    });

    DP.world = world; // handy for the demo page and for debugging
  }

  boot().catch((e) => console.warn('[DeskPet] failed to start', e));
})(globalThis);
