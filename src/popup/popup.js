// Popup: every control writes straight to chrome.storage; the service worker
// and content scripts react to the change event.
(async function () {
  const { settings, exercises } = DeskPet;
  const $ = (id) => document.getElementById(id);
  if (window.deskpetBridge) document.body.classList.add('desktop');
  let s = await settings.load();

  const send = (msg) => chrome.runtime.sendMessage(msg).catch(() => null);
  const save = async (patch) => {
    s = await settings.save(patch);
    render();
  };

  // Exercise checkboxes.
  for (const ex of exercises) {
    const label = document.createElement('label');
    label.className = 'check';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.dataset.exercise = ex.id;
    const text = document.createElement('span');
    text.textContent = ex.name;
    label.append(box, text);
    $('exercises').append(label);
    box.addEventListener('change', () => save({ exercises: { ...s.exercises, [ex.id]: box.checked } }));
  }

  const CHECKS = ['enabled', 'autoMinimize', 'restoreAfterBreak', 'cursorGag', 'buttonReactions', 'visionTerrain'];
  const NUMBERS = ['intervalMinutes', 'snoozeMinutes', 'volume', 'opacity', 'size'];

  for (const id of CHECKS) $(id).addEventListener('change', () => save({ [id]: $(id).checked }));
  for (const id of NUMBERS) {
    $(id).addEventListener('change', () => {
      const el = $(id);
      let v = Number(el.value);
      if (!Number.isFinite(v)) return render();
      if (el.min !== '') v = Math.max(Number(el.min), v);
      if (el.max !== '') v = Math.min(Number(el.max), v);
      save({ [id]: v });
    });
  }

  $('breakNow').addEventListener('click', async () => {
    const res = await send({ type: 'TRIGGER_BREAK_NOW' });
    if (res && res.ok) window.close();
    else $('status').textContent = res && res.reason === 'disabled'
      ? 'Turn the companion on first.'
      : window.deskpetBridge ? "Couldn't start a break." : "The pets can't appear on this page — the break will start on your next tab.";
  });
  $('snooze').addEventListener('click', async () => {
    await send({ type: 'SNOOZE' });
    renderStatus();
  });
  for (const btn of document.querySelectorAll('[data-pause]')) {
    btn.addEventListener('click', () => save({ pausedUntil: Date.now() + Number(btn.dataset.pause) * 60000 }));
  }
  $('resume').addEventListener('click', () => save({ pausedUntil: 0 }));
  if ($('quit')) $('quit').addEventListener('click', () => send({ type: 'QUIT' }));

  const clock = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  async function renderStatus() {
    const paused = s.pausedUntil > Date.now();
    $('resume').hidden = !paused;
    if (!s.enabled) return ($('status').textContent = 'Companion is off.');
    if (paused) return ($('status').textContent = `Breaks paused until ${clock(s.pausedUntil)}.`);
    const res = await send({ type: 'GET_STATUS' });
    $('status').textContent = res && res.nextBreakAt ? `Next break around ${clock(res.nextBreakAt)}.` : 'No break scheduled.';
  }

  function render() {
    for (const id of CHECKS) $(id).checked = !!s[id];
    for (const id of NUMBERS) $(id).value = s[id];
    $('snooze').textContent = `Snooze ${s.snoozeMinutes} min`;
    for (const box of document.querySelectorAll('[data-exercise]')) box.checked = !!s.exercises[box.dataset.exercise];
    renderStatus();
  }

  render();
})();
