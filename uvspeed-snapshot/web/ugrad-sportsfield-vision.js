/**
 * ugrad-sportsfield-vision.js — lazy COCO-SSD (YOLO-class single-shot) in-browser ball detect → pitch meters.
 * Official tracking / Hawkeye / Chyron: post JSON on hexcast-stream or use Apply telemetry instead.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  var TF_CDN = 'https://unpkg.com/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  var COCO_CDN = 'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';

  var model = null;
  var loading = false;
  var raf = 0;
  var stream = null;
  var lastX = 0;
  var lastY = 0;
  var lastT = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg) {
    var el = $('sf-vision-status');
    if (el) el.textContent = msg || '';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('load ' + src));
      };
      document.head.appendChild(s);
    });
  }

  function getCocoApi() {
    return global.cocoSsd || global.coco_ssd;
  }

  function bboxCenterMeters(bbox, vw, vh) {
    var cx = bbox[0] + bbox[2] * 0.5;
    var cy = bbox[1] + bbox[3] * 0.5;
    if (!global.SportsfieldPitch || !global.SportsfieldPitch.getDimensions) return null;
    var d = global.SportsfieldPitch.getDimensions();
    return {
      x: (cx / vw) * d.L,
      y: (cy / vh) * d.W
    };
  }

  function drawOverlay(video, canvas, preds) {
    if (!canvas || !video || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var vw = video.videoWidth || 1;
    var vh = video.videoHeight || 1;
    var cw = canvas.width;
    var ch = canvas.height;
    ctx.fillStyle = '#0a0f12';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(video, 0, 0, cw, ch);
    var sx = cw / vw;
    var sy = ch / vh;
    var i, p, b;
    ctx.font = '10px ui-monospace,monospace';
    for (i = 0; i < preds.length; i++) {
      p = preds[i];
      b = p.bbox;
      ctx.strokeStyle =
        p.class === 'sports ball' ? 'rgba(250, 204, 21, 0.95)' : 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b[0] * sx, b[1] * sy, b[2] * sx, b[3] * sy);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(p.class + ' ' + (p.score * 100).toFixed(0) + '%', b[0] * sx + 2, b[1] * sy + 12);
    }
  }

  function tick() {
    var video = $('sf-vision-video');
    var canvas = $('sf-vision-canvas');
    var drive = $('sf-vision-drive') && $('sf-vision-drive').checked;
    if (!video || !model || video.readyState < 2) {
      raf = requestAnimationFrame(tick);
      return;
    }
    model.detect(video).then(
      function (preds) {
        drawOverlay(video, canvas, preds);
        var best = null;
        var i, p;
        for (i = 0; i < preds.length; i++) {
          p = preds[i];
          if (p.class === 'sports ball' && p.score > 0.22) {
            if (!best || p.score > best.score) best = p;
          }
        }
        if (drive && best && global.SportsfieldPitch) {
          var vw = video.videoWidth;
          var vh = video.videoHeight;
          var m = bboxCenterMeters(best.bbox, vw, vh);
          if (m) {
            var now = performance.now();
            var vx = 0;
            var vy = 0;
            if (lastT > 0) {
              var dt = (now - lastT) / 1000;
              if (dt > 1e-3) {
                vx = (m.x - lastX) / dt;
                vy = (m.y - lastY) / dt;
              }
            }
            lastX = m.x;
            lastY = m.y;
            lastT = now;
            global.SportsfieldPitch.applyExternalBallState({ x: m.x, y: m.y, vx: vx, vy: vy });
          }
        }
        raf = requestAnimationFrame(tick);
      },
      function () {
        raf = requestAnimationFrame(tick);
      }
    );
  }

  function startLoop() {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastT = 0;
  }

  async function loadDetector() {
    if (model) return model;
    if (loading) return null;
    loading = true;
    setStatus('Loading TensorFlow.js + COCO-SSD…');
    try {
      await loadScript(TF_CDN);
      await loadScript(COCO_CDN);
      var api = getCocoApi();
      if (!api || !api.load) throw new Error('coco-ssd global missing');
      model = await api.load({ base: 'mobilenet_v2' });
      setStatus('COCO-SSD ready · sports ball class (YOLO-class SSD)');
      return model;
    } catch (e) {
      setStatus('Load failed: ' + (e && e.message ? e.message : String(e)));
      model = null;
      return null;
    } finally {
      loading = false;
    }
  }

  async function toggleCamera() {
    var video = $('sf-vision-video');
    var btn = $('sf-vision-cam');
    if (!video) return;
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
      video.srcObject = null;
      stopLoop();
      if (btn) btn.textContent = 'Camera';
      setStatus('Camera off');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('getUserMedia not available (use HTTPS or localhost)');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } },
        audio: false
      });
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      if (btn) btn.textContent = 'Stop camera';
      setStatus('Camera on · load detector then enable Drive ball');
      if (model) startLoop();
    } catch (e) {
      setStatus('Camera error: ' + (e && e.message ? e.message : String(e)));
    }
  }

  function init() {
    if (global.__sfVisionInit) return;
    global.__sfVisionInit = true;
    var cam = $('sf-vision-cam');
    var ld = $('sf-vision-load');
    var dr = $('sf-vision-drive');
    if (cam) cam.addEventListener('click', toggleCamera);
    if (ld)
      ld.addEventListener('click', function () {
        loadDetector().then(function (m) {
          if (m && $('sf-vision-video') && $('sf-vision-video').srcObject) startLoop();
        });
      });
    if (dr)
      dr.addEventListener('change', function () {
        if (!dr.checked) lastT = 0;
      });
  }

  global.SportsfieldVision = {
    init: init,
    loadDetector: loadDetector
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
