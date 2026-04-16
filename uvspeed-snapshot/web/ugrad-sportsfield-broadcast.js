/**
 * ugrad-sportsfield-broadcast.js — YouTube sidebar, kbatch transcript, sky flow + flock, telemetry JSON.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  var TRAIL_MAX = 90;
  var BOIDS = 22;
  var STORAGE_YT = 'sf-broadcast-youtube-id-v1';

  var lastFieldL = 0;
  var lastFieldW = 0;

  function getFieldDims() {
    if (global.SportsfieldPitch && global.SportsfieldPitch.getDimensions) {
      var d = global.SportsfieldPitch.getDimensions();
      if (d && typeof d.L === 'number' && typeof d.W === 'number') {
        return { LM: d.L, WM: d.W };
      }
    }
    return { LM: 105, WM: 68 };
  }

  var trail = [];
  var lastVx = 0;
  var lastVy = 0;
  var boids = [];
  var hc = null;
  var tx = null;
  var raf = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function extractYouTubeId(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var m = s.match(/(?:youtu\.be\/|v\/|embed\/|watch\?v=)([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{6,}$/.test(s)) return s;
    return '';
  }

  /** Watch URL for when embed is blocked (FIFA, music, region, etc.). */
  function youTubeWatchUrl(id) {
    if (!id) return '';
    return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
  }

  function setYouTubeWatchLink(id) {
    var a = $('sf-yt-open');
    if (!a) return;
    if (!id) {
      a.hidden = true;
      a.setAttribute('href', '#');
      return;
    }
    a.href = youTubeWatchUrl(id);
    a.hidden = false;
  }

  function setYouTubeEmbed(id) {
    var fr = $('sf-yt-frame');
    if (!fr) return;
    if (!id) {
      fr.removeAttribute('src');
      setYouTubeWatchLink('');
      return;
    }
    fr.src =
      'https://www.youtube-nocookie.com/embed/' +
      id +
      '?rel=0&modestbranding=1&playsinline=1';
    setYouTubeWatchLink(id);
    try {
      localStorage.setItem(STORAGE_YT, id);
    } catch (e) {}
  }

  function pushTranscriptLine(html) {
    var el = $('sf-tx-log');
    if (!el) return;
    var row = document.createElement('div');
    row.className = 'sf-tx-line';
    row.innerHTML = html;
    el.insertBefore(row, el.firstChild);
    while (el.children.length > 80) el.removeChild(el.lastChild);
  }

  function initBoids() {
    var D = getFieldDims();
    var LM = D.LM;
    var WM = D.WM;
    lastFieldL = LM;
    lastFieldW = WM;
    boids = [];
    var i, a, r;
    for (i = 0; i < BOIDS; i++) {
      a = Math.random() * Math.PI * 2;
      r = 8 + Math.random() * 28;
      boids.push({
        x: LM * 0.5 + Math.cos(a) * r * 0.4,
        y: WM * 0.5 + Math.sin(a) * r * 0.35,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6
      });
    }
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function stepBoids(bx, by, flowX, flowY, enabled, LM, WM) {
    var i,
      j,
      b,
      dx,
      dy,
      d,
      sepX,
      sepY,
      fx,
      fy;
    if (!enabled) return;
    for (i = 0; i < boids.length; i++) {
      b = boids[i];
      fx = flowX * 0.35 + (bx - b.x) * 0.012;
      fy = flowY * 0.35 + (by - b.y) * 0.012;
      sepX = 0;
      sepY = 0;
      for (j = 0; j < boids.length; j++) {
        if (j === i) continue;
        dx = b.x - boids[j].x;
        dy = b.y - boids[j].y;
        d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        if (d < 9) {
          sepX += dx / (d * d) * 40;
          sepY += dy / (d * d) * 40;
        }
      }
      b.vx = (b.vx + fx + sepX) * 0.92;
      b.vy = (b.vy + fy + sepY) * 0.92;
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > 42) {
        b.vx = (b.vx / sp) * 42;
        b.vy = (b.vy / sp) * 42;
      }
      b.x += b.vx * 0.016;
      b.y += b.vy * 0.016;
      if (b.x < 1) {
        b.x = 1;
        b.vx *= -0.6;
      } else if (b.x > LM - 1) {
        b.x = LM - 1;
        b.vx *= -0.6;
      }
      if (b.y < 1) {
        b.y = 1;
        b.vy *= -0.6;
      } else if (b.y > WM - 1) {
        b.y = WM - 1;
        b.vy *= -0.6;
      }
    }
  }

  function drawSky() {
    var c = $('sf-sky-canvas');
    if (!c || !c.getContext) return;
    var D0 = getFieldDims();
    var LM = D0.LM;
    var WM = D0.WM;
    if (LM !== lastFieldL || WM !== lastFieldW) initBoids();
    D0 = getFieldDims();
    LM = D0.LM;
    WM = D0.WM;
    var ctx = c.getContext('2d');
    var w = c.width;
    var h = c.height;
    var sx = w / LM;
    var sy = h / WM;
    var flockOn = $('sf-flock-on') && $('sf-flock-on').checked;

    ctx.fillStyle = 'rgba(6, 12, 10, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(250,250,252,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    var i,
      p,
      bx = trail.length ? trail[trail.length - 1].x : LM * 0.5;
    var by = trail.length ? trail[trail.length - 1].y : WM * 0.5;

    stepBoids(bx, by, lastVx, lastVy, flockOn, LM, WM);

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (i = 0; i < trail.length; i++) {
      p = trail[i];
      ctx.lineTo(p.x * sx, p.y * sy);
    }
    if (trail.length) ctx.stroke();

    if (flockOn) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
      for (i = 0; i < boids.length; i++) {
        p = boids[i];
        ctx.beginPath();
        ctx.arc(p.x * sx, p.y * sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(bx * sx, by * sy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx * sx, by * sy);
    ctx.lineTo(bx * sx + lastVx * 0.8 * sx, by * sy + lastVy * 0.8 * sy);
    ctx.stroke();

    var st = $('sf-flow-stats');
    if (st) {
      var sp = Math.sqrt(lastVx * lastVx + lastVy * lastVy);
      st.textContent =
        'flow |v|=' +
        sp.toFixed(2) +
        ' m/s · trail n=' +
        trail.length +
        (flockOn ? ' · flock n=' + BOIDS : '');
    }
  }

  function onHexcast(ev) {
    var d = ev.data;
    if (!d) return;
    if (d.type !== 'sportsfield-ball' && d.type !== 'sportsfield-telemetry') return;
    var m = d.meters;
    if (!m || typeof m.x !== 'number' || typeof m.y !== 'number') return;
    trail.push({ x: m.x, y: m.y, ts: d.ts || Date.now() });
    while (trail.length > TRAIL_MAX) trail.shift();
    var v = d.velocityMs || {};
    lastVx = typeof v.vx === 'number' ? v.vx : 0;
    lastVy = typeof v.vy === 'number' ? v.vy : 0;
  }

  function onTranscript(ev) {
    var d = ev.data;
    if (!d) return;
    var ts = new Date().toISOString().slice(11, 19);
    if (d.type === 'sportsfield-teleprompter' && d.line) {
      pushTranscriptLine('<span class="sf-tx-ts">' + ts + '</span> ' + String(d.line));
      return;
    }
    if (d.type === 'transcript-dca' && d.payload && d.payload.segments) {
      pushTranscriptLine('<span class="sf-tx-ts">' + ts + '</span> DCA · ' + d.payload.segments.length + ' seg');
    }
  }

  function loop() {
    drawSky();
    raf = requestAnimationFrame(loop);
  }

  function applyJsonTelemetry() {
    var ta = $('sf-json-tel');
    if (!ta || !global.SportsfieldPitch) return;
    try {
      var o = JSON.parse(ta.value);
      var mx = o.meters && typeof o.meters.x === 'number' ? o.meters.x : o.x;
      var my = o.meters && typeof o.meters.y === 'number' ? o.meters.y : o.y;
      if (typeof mx !== 'number' || typeof my !== 'number') return;
      var vx = o.velocityMs ? o.velocityMs.vx : o.vx;
      var vy = o.velocityMs ? o.velocityMs.vy : o.vy;
      global.SportsfieldPitch.applyExternalBallState({
        x: mx,
        y: my,
        vx: vx,
        vy: vy
      });
      global.SportsfieldPitch.setLiveTelemetry(true);
      var liv = $('sf-live-tel');
      if (liv) liv.checked = true;
    } catch (e) {}
  }

  function init() {
    if (global.__sfBroadcastInit) return;
    global.__sfBroadcastInit = true;
    var inp = $('sf-yt-id');
    var load = $('sf-yt-load');
    if (inp) {
      try {
        inp.value = localStorage.getItem(STORAGE_YT) || '';
      } catch (e) {}
    }
    if (load && inp) {
      function doLoad() {
        setYouTubeEmbed(extractYouTubeId(inp.value));
      }
      load.addEventListener('click', doLoad);
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') doLoad();
      });
      if (inp.value) setYouTubeEmbed(extractYouTubeId(inp.value));
    }

    var ap = $('sf-json-apply');
    if (ap) ap.addEventListener('click', applyJsonTelemetry);

    initBoids();

    try {
      hc = new BroadcastChannel('hexcast-stream');
      hc.onmessage = onHexcast;
    } catch (e) {
      hc = null;
    }
    try {
      tx = new BroadcastChannel('kbatch-transcript');
      tx.onmessage = onTranscript;
    } catch (e) {
      tx = null;
    }

    raf = requestAnimationFrame(loop);
  }

  global.SportsfieldBroadcast = {
    init: init,
    extractYouTubeId: extractYouTubeId,
    youTubeWatchUrl: youTubeWatchUrl
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
