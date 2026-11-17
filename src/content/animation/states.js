// Animation state registry: the vocabulary behaviours are allowed to use.
// Behaviours only ever say character.setState('pounce'); how a state looks is
// up to the renderer (CSS rig today, Rive state machine inputs later).
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  // mouth: which mouth shape the state uses (default 'smile').
  // view: 'side' draws the state in profile (travel); default is front-on.
  DP.STATES = {
    idle: {},
    walk: { view: 'side' },
    run: { mouth: 'open', view: 'side' },
    sneak: { mouth: 'flat' },
    crouch: { mouth: 'flat', view: 'side' },
    pounce: { mouth: 'open', view: 'side' },
    land: { mouth: 'flat' },
    confused: { mouth: 'flat' },
    embarrassed: { mouth: 'wavy' },
    look: {},
    search: { mouth: 'flat' },
    startled: { mouth: 'open' },
    tired: { mouth: 'pant' },
    sleep: { mouth: 'flat' },
    wave: {},
    cheer: { mouth: 'open' },
    press: { mouth: 'open' },
    taunt: { mouth: 'pant' },
    laugh: { mouth: 'open' },
    climb: { mouth: 'flat', view: 'side' },
    fall: { mouth: 'open' },
    hang: { mouth: 'flat' }, // mid-air, before gravity notices
    scared: { mouth: 'wavy' },
    grab: {},
    splat: { mouth: 'open' }, // pressed up against the screen
    'ex-overhead': {},
    'ex-side': {},
    'ex-shoulders': {},
    'ex-march': {},
    'ex-lookaway': {},
    'ex-wrists': {},
  };
})(globalThis);
