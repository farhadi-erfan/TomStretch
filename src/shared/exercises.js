// Exercise catalogue. `state` is the animation state the characters play while
// demonstrating (see content/animation/states.js).
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  // A break is two of these, about 45 seconds in all (see break-sequence.js);
  // `neck` ones undo "tech neck" (head pushed forward over a screen), and a
  // break includes one of them when any is enabled.
  DP.exercises = [
    {
      id: 'chin',
      name: 'Chin tucks',
      how: 'Sit tall, glide your chin straight back, hold for three seconds, release.',
      seconds: 22,
      state: 'ex-chin',
      neck: true,
    },
    {
      id: 'tilt',
      name: 'Neck side tilts',
      how: 'Tip one ear toward your shoulder and hold, then the other side. Shoulders stay down.',
      seconds: 22,
      state: 'ex-tilt',
      neck: true,
    },
    {
      id: 'chest',
      name: 'Chest opener',
      how: 'Hands behind you, squeeze your shoulder blades together and lift your chest.',
      seconds: 22,
      state: 'ex-chest',
      neck: true,
    },
    {
      id: 'overhead',
      name: 'Reach for the sky',
      how: 'Lift both arms overhead, stretch tall, then lower slowly.',
      seconds: 20,
      state: 'ex-overhead',
    },
    {
      id: 'side',
      name: 'Gentle side stretch',
      how: 'Arms up, lean slowly to one side, then the other.',
      seconds: 30,
      state: 'ex-side',
    },
    {
      id: 'shoulders',
      name: 'Shoulder rolls',
      how: 'Roll your shoulders up, back and down in slow circles.',
      seconds: 20,
      state: 'ex-shoulders',
    },
    {
      id: 'walk',
      name: 'Stand up and move',
      how: 'Get up and walk around for a minute.',
      seconds: 60,
      state: 'ex-march',
    },
    {
      id: 'eyes',
      name: 'Look far away',
      how: 'Look at something far from the screen for 20 seconds.',
      seconds: 20,
      state: 'ex-lookaway',
    },
    {
      id: 'wrists',
      name: 'Loosen hands and wrists',
      how: 'Let your hands hang and shake them out gently.',
      seconds: 20,
      state: 'ex-wrists',
    },
  ];
})(globalThis);
