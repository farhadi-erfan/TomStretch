// Long-running helper (macOS, run with `osascript -l JavaScript`): prints the
// on-screen app windows as one JSON line whenever they change.
//   [[windowId, ownerPid, x, y, width, height], ...]   front-most first
// Only geometry is read (no titles, no pixels), which needs no permission.
// argv[0] = pid to ignore (TomStretch's own windows).
ObjC.import('CoreGraphics');
ObjC.import('Foundation');

function run(argv) {
  const selfPid = Number(argv[0]);
  const stdout = $.NSFileHandle.fileHandleWithStandardOutput;
  let last = '';
  for (;;) {
    const info = ObjC.deepUnwrap(
      ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0))
    );
    const wins = [];
    for (const w of info) {
      if (w.kCGWindowLayer !== 0 || w.kCGWindowOwnerPID === selfPid) continue; // normal app windows only
      if (w.kCGWindowAlpha !== undefined && w.kCGWindowAlpha < 0.1) continue;
      const b = w.kCGWindowBounds;
      if (b.Width < 200 || b.Height < 120) continue;
      wins.push([w.kCGWindowNumber, w.kCGWindowOwnerPID, Math.round(b.X), Math.round(b.Y), Math.round(b.Width), Math.round(b.Height)]);
    }
    const line = JSON.stringify(wins);
    if (line !== last) {
      last = line;
      stdout.writeData($(line + '\n').dataUsingEncoding($.NSUTF8StringEncoding)); // throws (and so exits) if the app is gone
    }
    delay(0.15);
  }
}
