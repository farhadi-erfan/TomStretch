// Find, press and undo the real minimize button of the window the user is
// working in (the main window of the frontmost app), whichever app that is.
//
// macOS: System Events via osascript. Needs the Accessibility permission, and
//        macOS asks once whether Desk Pet may control "System Events".
// Windows: no button lookup; minimizes the foreground window with user32
//        ShowWindow via PowerShell. (Written but not yet tested.)
const { execFile } = require('child_process');
const { systemPreferences } = require('electron');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 8000 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout.trim());
    });
  });
}

// ---- macOS -----------------------------------------------------------------

// argv: mode ("locate" | "press"), our pid, target pid (0 = frontmost app).
// Returns "pid|x|y|w|h|app name|window title"; x..h is the minimize button's
// frame in screen points (all 0 if the window has no such button).
const MAC_BUTTON = `
on run argv
  set mode to item 1 of argv
  set selfPid to (item 2 of argv) as integer
  set targetPid to (item 3 of argv) as integer
  tell application "System Events"
    if targetPid is 0 then
      set p to first application process whose frontmost is true
      if (unix id of p) is selfPid then error "DESKPET_SELF_FRONT"
    else
      set p to first application process whose unix id is targetPid
    end if
    set w to missing value
    try
      set w to first window of p whose value of attribute "AXMain" is true
    end try
    if w is missing value then set w to window 1 of p
    set t to ""
    try
      set t to name of w
    end try
    set b to missing value
    try
      set b to value of attribute "AXMinimizeButton" of w
    end try
    set geo to "0|0|0|0"
    if b is not missing value then
      set bp to position of b
      set bs to size of b
      set geo to ((item 1 of bp) as text) & "|" & (item 2 of bp) & "|" & (item 1 of bs) & "|" & (item 2 of bs)
    end if
    if mode is "press" then
      if b is not missing value then
        perform action "AXPress" of b
      else
        set value of attribute "AXMinimized" of w to true
      end if
    end if
    return ((unix id of p) as text) & "|" & geo & "|" & (name of p) & "|" & t
  end tell
end run`;

// argv: pid, window title. Un-minimizes that window and brings the app forward.
// (Works for the Dock and for Stage Manager, where AXMinimized reads false.)
const MAC_RESTORE = `
on run argv
  set thePid to (item 1 of argv) as integer
  set t to item 2 of argv
  tell application "System Events"
    set p to first application process whose unix id is thePid
    set found to false
    repeat with w in (windows of p)
      try
        if (name of w) is t then
          set value of attribute "AXMinimized" of w to false
          set found to true
          exit repeat
        end if
      end try
    end repeat
    if not found then
      try
        set value of attribute "AXMinimized" of window 1 of p to false
      end try
    end if
    set frontmost of p to true
  end tell
end run`;

const MAC_FRONT_PID = 'tell application "System Events" to return unix id of (first application process whose frontmost is true)';

async function macButton(mode, { selfPid, targetPid, fallbackPid }) {
  let out;
  try {
    out = await run('osascript', ['-e', MAC_BUTTON, mode, String(selfPid), String(targetPid || 0)]);
  } catch (e) {
    // Our own settings window is in front: use the app the user was in before.
    if (!/DESKPET_SELF_FRONT/.test(e.message) || !fallbackPid) throw e;
    out = await run('osascript', ['-e', MAC_BUTTON, mode, String(selfPid), String(fallbackPid)]);
  }
  const [pid, x, y, w, h, appName, ...title] = out.split('|');
  return {
    pid: Number(pid),
    appName,
    title: title.join('|'),
    button: Number(w) > 0 ? { x: Number(x), y: Number(y), width: Number(w), height: Number(h) } : null,
  };
}

function failure(e) {
  console.warn('[DeskPet] window control failed:', e.message.split('\n')[0]);
  if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(false)) {
    systemPreferences.isTrustedAccessibilityClient(true); // opens the system prompt
    return { ok: false, hint: 'Need Accessibility access' };
  }
  if (/DESKPET_SELF_FRONT/.test(e.message)) return { ok: false, hint: 'Click a window first' };
  return { ok: false, hint: "It won't budge" };
}

// ---- Windows ---------------------------------------------------------------

const WIN_API =
  "Add-Type -Namespace DP -Name W -MemberDefinition '" +
  '[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();' +
  '[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c);' +
  '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h);' +
  "';";
const powershell = (script) => run('powershell', ['-NoProfile', '-NonInteractive', '-Command', WIN_API + script]);

// ---- Public API ------------------------------------------------------------

// Pid of the frontmost app (macOS only; null elsewhere or on failure).
async function frontAppPid() {
  if (process.platform !== 'darwin') return null;
  try {
    return Number(await run('osascript', ['-e', MAC_FRONT_PID])) || null;
  } catch (e) {
    return null;
  }
}

// Where is the working window's minimize button?
// -> { ok: true, target, button: {x, y, width, height} }   (screen points)
// -> { ok: false, unsupported: true }   no real button to aim at on this OS
// -> { ok: false, hint }                something the cat can say
async function locateMinimizeButton(ctx) {
  if (process.platform !== 'darwin') return { ok: false, unsupported: true };
  try {
    const target = await macButton('locate', ctx);
    if (!target.button) return { ok: false, hint: 'No button there' };
    return { ok: true, target, button: target.button };
  } catch (e) {
    return failure(e);
  }
}

// Press it. `target` is a previous locate result (so the same window gets
// pressed even if focus moved), or null for "whatever is in front now".
// -> { ok: true, target } | { ok: false, hint }
async function pressMinimizeButton(ctx, target) {
  try {
    if (process.platform === 'darwin') {
      return { ok: true, target: await macButton('press', { ...ctx, targetPid: target && target.pid }) };
    }
    if (process.platform === 'win32') {
      const hwnd = await powershell('$h=[DP.W]::GetForegroundWindow(); [DP.W]::ShowWindow($h,6) | Out-Null; $h.ToInt64()');
      return { ok: true, target: { hwnd } };
    }
    return { ok: false, hint: "Can't do that here" };
  } catch (e) {
    return failure(e);
  }
}

async function restoreWindow(target) {
  try {
    if (process.platform === 'darwin') await run('osascript', ['-e', MAC_RESTORE, String(target.pid), target.title || '']);
    else if (process.platform === 'win32') {
      const h = String(target.hwnd).replace(/[^0-9-]/g, '');
      await powershell(`$h=[System.IntPtr]${h}; [DP.W]::ShowWindow($h,9) | Out-Null; [DP.W]::SetForegroundWindow($h) | Out-Null`);
    }
    return true;
  } catch (e) {
    console.warn('[DeskPet] restore failed:', e.message.split('\n')[0]);
    return false;
  }
}

module.exports = { frontAppPid, locateMinimizeButton, pressMinimizeButton, restoreWindow };
