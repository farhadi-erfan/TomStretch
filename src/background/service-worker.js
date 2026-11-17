// Background service worker: owns the break timer and everything that needs
// privileged Chrome APIs (alarms, tabs, windows). It never touches page content.
importScripts('/src/shared/settings.js');

const { settings } = DeskPet;
const BREAK = 'deskpet-break';
const SNOOZE = 'deskpet-snooze';

// ---- Scheduling ------------------------------------------------------------

async function schedule() {
  const s = await settings.load();
  await chrome.alarms.clear(BREAK);
  await chrome.alarms.clear(SNOOZE);
  if (!s.enabled) return;
  const minutes = Math.max(1, Number(s.intervalMinutes) || 30);
  chrome.alarms.create(BREAK, { delayInMinutes: minutes, periodInMinutes: minutes });
}

async function ensureScheduled() {
  if (!(await chrome.alarms.get(BREAK))) await schedule();
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(ensureScheduled);

settings.onChange((next, prev) => {
  if (next.enabled !== prev.enabled || next.intervalMinutes !== prev.intervalMinutes) schedule();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BREAK || alarm.name === SNOOZE) triggerBreak(false);
});

// ---- Break delivery --------------------------------------------------------

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

// Ask the content script in the active tab to start the break. Pages without a
// content script (chrome://, the Web Store, …) can't host the pets, so the
// break is held and delivered on the next tab/window switch.
async function triggerBreak(force) {
  const s = await settings.load();
  if (!s.enabled) return { ok: false, reason: 'disabled' };
  if (!force && s.pausedUntil > Date.now()) return { ok: false, reason: 'paused' };
  try {
    const tab = await activeTab();
    await chrome.tabs.sendMessage(tab.id, { type: 'BREAK_START' });
    await chrome.storage.session.set({ pendingBreak: false });
    return { ok: true };
  } catch (e) {
    await chrome.storage.session.set({ pendingBreak: true });
    return { ok: false, reason: 'no-page' };
  }
}

async function deliverPending() {
  const { pendingBreak } = await chrome.storage.session.get('pendingBreak');
  if (pendingBreak) await triggerBreak(false);
}

chrome.tabs.onActivated.addListener(deliverPending);

// ---- Window state ----------------------------------------------------------

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  const { minimized } = await chrome.storage.session.get('minimized');
  if (minimized && minimized.windowId === windowId) {
    await chrome.storage.session.remove('minimized');
    chrome.tabs.sendMessage(minimized.tabId, { type: 'BREAK_RETURN' }).catch(() => {});
  }
  deliverPending();
});

// ---- Messages from content script and popup --------------------------------

const handlers = {
  // Chrome can't point at its own minimize button; the cat uses the stand-in.
  async LOCATE_MINIMIZE() {
    return { ok: false, unsupported: true };
  },

  // Only ever minimizes the window that hosts the tab asking for it.
  async MINIMIZE_WINDOW(msg, sender) {
    if (!sender.tab) return { ok: false };
    await chrome.storage.session.set({
      minimized: { windowId: sender.tab.windowId, tabId: sender.tab.id },
    });
    await chrome.windows.update(sender.tab.windowId, { state: 'minimized' });
    return { ok: true };
  },

  async SNOOZE(msg) {
    const s = await settings.load();
    const minutes = Math.max(1, Number(msg.minutes) || s.snoozeMinutes);
    chrome.alarms.create(SNOOZE, { delayInMinutes: minutes });
    return { ok: true };
  },

  // A break finished or was skipped: count the next interval from now.
  async BREAK_DONE() {
    await schedule();
    return { ok: true };
  },

  async TRIGGER_BREAK_NOW() {
    return triggerBreak(true);
  },

  async GET_STATUS() {
    const [main, snooze] = await Promise.all([chrome.alarms.get(BREAK), chrome.alarms.get(SNOOZE)]);
    const times = [main, snooze].filter(Boolean).map((a) => a.scheduledTime);
    return { nextBreakAt: times.length ? Math.min(...times) : null };
  },
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = msg && handlers[msg.type];
  if (!handler) return false;
  handler(msg, sender).then(sendResponse, (e) => sendResponse({ ok: false, error: String(e) }));
  return true; // async response
});
