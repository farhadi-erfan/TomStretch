// Renderer for vision-capture.html. The main process sets the rate (frames
// looked at per second; 0 = paused) and can ask for a frame right away.
(async function () {
  const bridge = window.visionBridge;
  let hz = 0;
  let timer = null;
  let video = null;
  let ctx = null;

  bridge.onRate((rate) => {
    const was = hz;
    hz = rate;
    if (hz > 0 && (was === 0 || hz > was)) look();
    else if (hz === 0) clearTimeout(timer);
  });
  bridge.onNow(() => hz > 0 && look());

  try {
    const src = await bridge.start();
    if (!src) return bridge.failed('no screen source');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: src.sourceId,
          maxWidth: src.width,
          maxHeight: src.height,
          maxFrameRate: 15,
        },
      },
    });
    video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    stream.getVideoTracks()[0].addEventListener('ended', () => bridge.failed('stream ended'));
    if (hz > 0) look();
  } catch (e) {
    return bridge.failed(e && e.message ? e.message : e);
  }

  function look() {
    clearTimeout(timer);
    timer = hz > 0 ? setTimeout(look, 1000 / hz) : null;
    if (!ctx || !video.videoWidth) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.drawImage(video, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const e = window.visionEdges.findEdges(px, w, h, true);
    bridge.edges({ ledges: e.ledges, walls: e.walls, w, h });
  }
})();
