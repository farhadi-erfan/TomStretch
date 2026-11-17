// Exercise catalogue. `state` is the animation state the characters play while
// demonstrating (see content/animation/states.js).
(function (g) {
  const DP = (g.DeskPet = g.DeskPet || {});

  DP.exercises = [
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
