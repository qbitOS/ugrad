/**
 * ugrad-sportsfield-pitch.js — FIFA pitch 51×33 on 105×68m, layers, ball sim (pong-style) → hexcast-stream.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  /** FIFA recommended pitch (m). 51×33 cells ≈ 105:68 aspect; ~2.06m per cell. */
  var LENGTH_M = 105;
  var WIDTH_M = 68;
  var PITCH_COLS = 51;
  var PITCH_ROWS = 33;
  var N = PITCH_COLS * PITCH_ROWS;
  var LAYERS = 7;
  var LAYER_KEYS = [
    'tactics',
    'zones',
    'regions',
    'players_fast',
    'players_slow',
    'players_bounce',
    'players_avoid'
  ];
  /** Player physics layers: fast / slow = speed field; bounce = elastic; avoid = soft repulsion. */
  var L_PLAYER_FAST = 3;
  var L_PLAYER_SLOW = 4;
  var L_PLAYER_BOUNCE = 5;
  var L_PLAYER_AVOID = 6;
  var PAL = [
    ['#14532d', '#166534', '#22c55e', '#4ade80'],
    ['#7c2d12', '#c2410c', '#ea580c', '#fb923c'],
    ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa'],
    ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    ['#9ca3af', '#6b7280', '#4b5563', '#374151'],
    ['#fbcfe8', '#f472b6', '#db2777', '#9d174d'],
    ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490']
  ];
  var CELL_LEN_M = LENGTH_M / PITCH_COLS;
  var CELL_WID_M = WIDTH_M / PITCH_ROWS;

  var activePresetId = 'football_fifa';
  var gridPointerWired = false;

  var layers = [];
  var cells = [];
  var painting = false;
  var paintVal = 1;
  var currentLayer = 0;
  var eraseMode = false;
  var brush = 0;
  var lastHoverIx = -1;
  var ball = { x: 52.5, y: 34, vx: 22, vy: 16 };
  var BR = 0.11;
  var ballRaf = 0;
  var lastBallT = 0;
  var ballBroadcastLast = 0;
  var ballRun = false;
  var liveTelemetry = false;
  /** Last tracker sample; reapplied each frame while live mode is on (holds between messages). */
  var externalBallState = null;
  var shotHint = null;
  var lastPhysicsFlags = { fast: false, slow: false, bounce: false, avoid: false };
  var liveCh = null;
  var reducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function paintFieldSvg(p) {
    var svg = $('sf-field-svg');
    if (!svg || !p || !p.svg) return;
    var L = p.lengthM;
    var W = p.widthM;
    svg.setAttribute('viewBox', '0 0 ' + L + ' ' + W);
    svg.setAttribute('preserveAspectRatio', 'none');
    var inner = p.svg(L, W);
    if (global.UgradSportsfieldPresets && typeof global.UgradSportsfieldPresets.renderFieldOverlays === 'function') {
      inner += global.UgradSportsfieldPresets.renderFieldOverlays(p, L, W);
    }
    svg.innerHTML = inner;
  }

  function applySportPreset(id) {
    if (!global.UgradSportsfieldPresets || !global.UgradSportsfieldPresets.get) return;
    var p = global.UgradSportsfieldPresets.get(id);
    activePresetId = p.id;
    LENGTH_M = p.lengthM;
    WIDTH_M = p.widthM;
    PITCH_COLS = p.cols;
    PITCH_ROWS = p.rows;
    N = PITCH_COLS * PITCH_ROWS;
    CELL_LEN_M = LENGTH_M / PITCH_COLS;
    CELL_WID_M = WIDTH_M / PITCH_ROWS;
    ball.x = p.ball.x;
    ball.y = p.ball.y;
    ball.vx = p.ball.vx;
    ball.vy = p.ball.vy;
    var wrap = $('sf-field-wrap');
    if (wrap) {
      wrap.setAttribute('data-surface', p.surface);
      wrap.setAttribute('data-sport', p.id);
      wrap.setAttribute('data-genre', p.genre || '');
    }
    var sel = $('sf-sport-preset');
    if (sel) sel.value = p.id;
    paintFieldSvg(p);
    if (typeof global.SportsfieldShot !== 'undefined' && global.SportsfieldShot.setPitchConfig) {
      global.SportsfieldShot.setPitchConfig(p);
    }
    buildGrid();
    ballToCss();
    updateReadout(-1);
    var lede = $('sf-lede');
    if (lede) {
      lede.innerHTML =
        '<strong>' +
        LENGTH_M.toFixed(2) +
        '×' +
        WIDTH_M.toFixed(2) +
        ' m</strong> · ' +
        p.label +
        ' · <strong>' +
        PITCH_COLS +
        '×' +
        PITCH_ROWS +
        '</strong> cells (~' +
        CELL_LEN_M.toFixed(2) +
        '×' +
        CELL_WID_M.toFixed(2) +
        ' m/cell) · layers tactics / zones / regions + player types (<strong>fast</strong> boost · <strong>slow</strong> drag · <strong>bounce</strong> elastic · <strong>avoid</strong> repel) · <code>sf-' +
        PITCH_COLS +
        'x' +
        PITCH_ROWS +
        '-r*c*</code> · <code>hexcast-stream</code> · telemetry <code>sportsfield-telemetry</code>.';
    }
    try {
      localStorage.setItem('sf-sport-preset-id', p.id);
    } catch (e) {}
  }

  function $(id) {
    return document.getElementById(id);
  }

  function compositeAt(i) {
    var L, v;
    for (L = LAYERS - 1; L >= 0; L--) {
      v = layers[L][i];
      if (v > 0) return { L: L, v: v };
    }
    return null;
  }

  function hexToOutlineRgba(hex, alpha) {
    if (!hex || hex.charAt(0) !== '#') return 'rgba(128,128,128,' + alpha + ')';
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * 0.15));
    g = Math.min(255, Math.round(g + (255 - g) * 0.15));
    b = Math.min(255, Math.round(b + (255 - b) * 0.15));
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function applyCellVisual(i) {
    var el = cells[i];
    if (!el) return;
    var c = compositeAt(i);
    var mapOutline = null;
    if (c) {
      var hex = PAL[c.L][Math.min(3, c.v - 1)] || PAL[c.L][0];
      mapOutline = hexToOutlineRgba(hex, 0.88);
    }
    el.style.background = 'transparent';
    el.style.boxShadow = mapOutline ? 'inset 0 0 0 1px ' + mapOutline : 'none';
  }

  function cellRowCol(i) {
    return { c: i % PITCH_COLS, r: (i / PITCH_COLS) | 0 };
  }

  /** Stable key for API / H3 parent assignment (not a real H3 index — wire lat/lng offline). */
  function cellSpatialKey(i) {
    var p = cellRowCol(i);
    return 'sf-' + PITCH_COLS + 'x' + PITCH_ROWS + '-r' + p.r + 'c' + p.c;
  }

  function cellMetersFromCorner(i) {
    var p = cellRowCol(i);
    return {
      x: (p.c + 0.5) * CELL_LEN_M,
      y: (p.r + 0.5) * CELL_WID_M
    };
  }

  function paintCell(i) {
    var el = cells[i];
    if (!el) return;
    if (eraseMode) {
      layers[currentLayer][i] = 0;
    } else {
      layers[currentLayer][i] = Math.min(4, Math.max(1, paintVal | 0));
    }
    applyCellVisual(i);
  }

  function neighbors(ix, rad) {
    var out = [];
    var c = ix % PITCH_COLS;
    var r = (ix / PITCH_COLS) | 0;
    var dy, dx, nc, nr, ni;
    for (dy = -rad; dy <= rad; dy++) {
      for (dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) > rad) continue;
        nr = r + dy;
        nc = c + dx;
        if (nr < 0 || nr >= PITCH_ROWS || nc < 0 || nc >= PITCH_COLS) continue;
        ni = nr * PITCH_COLS + nc;
        out.push(ni);
      }
    }
    return out;
  }

  function applyBrush(ix) {
    var rad = brush | 0;
    if (rad > 2) rad = 2;
    var list = neighbors(ix, rad);
    var j;
    for (j = 0; j < list.length; j++) paintCell(list[j]);
  }

  function renderAll() {
    var i;
    for (i = 0; i < N; i++) applyCellVisual(i);
  }

  function clearPitch() {
    var L, i;
    for (L = 0; L < LAYERS; L++) {
      for (i = 0; i < N; i++) layers[L][i] = 0;
    }
    renderAll();
    if (global.UgradSportsfieldPresets) {
      var p = global.UgradSportsfieldPresets.get(activePresetId);
      ball.x = p.ball.x;
      ball.y = p.ball.y;
      ball.vx = p.ball.vx;
      ball.vy = p.ball.vy;
    } else {
      ball.x = 52.5;
      ball.y = 34;
      ball.vx = 22;
      ball.vy = 16;
    }
    ballToCss();
  }

  function updateReadout(ix) {
    var el = $('sf-readout');
    if (!el) return;
    if (ix < 0 || ix >= N) {
      el.textContent = 'hover pitch · FIFA 105×68m · ~' + CELL_LEN_M.toFixed(2) + '×' + CELL_WID_M.toFixed(2) + 'm/cell';
      return;
    }
    var m = cellMetersFromCorner(ix);
    el.textContent =
      cellSpatialKey(ix) +
      ' · ' +
      m.x.toFixed(2) +
      'm, ' +
      m.y.toFixed(2) +
      'm (from corner) · ix ' +
      ix;
  }

  function ballToCss() {
    var el = $('sf-ball');
    if (!el) return;
    el.style.left = (ball.x / LENGTH_M) * 100 + '%';
    el.style.top = (ball.y / WIDTH_M) * 100 + '%';
  }

  function attachShotAnalysis(msg) {
    if (typeof global.SportsfieldShot === 'undefined' || !global.SportsfieldShot.analyze) return msg;
    var base = {
      x: ball.x,
      y: ball.y,
      vx: ball.vx,
      vy: ball.vy
    };
    var a = global.SportsfieldShot.analyze(base);
    msg.shotAnalysis = a;
    if (msg.shot && typeof msg.shot === 'object' && !msg.shot.analysis) {
      msg.shot = Object.assign({}, msg.shot, { analysis: a });
    }
    return msg;
  }

  function broadcastBall() {
    try {
      var ch = new BroadcastChannel('hexcast-stream');
      var msg = {
        type: 'sportsfield-ball',
        meters: { x: ball.x, y: ball.y },
        velocityMs: { vx: ball.vx, vy: ball.vy },
        pitchM: { L: LENGTH_M, W: WIDTH_M },
        sportPresetId: activePresetId,
        playerPhysics: lastPhysicsFlags,
        liveTelemetry: liveTelemetry,
        ts: Date.now()
      };
      if (shotHint) {
        msg.shot = shotHint;
        shotHint = null;
      }
      attachShotAnalysis(msg);
      ch.postMessage(msg);
      ch.close();
    } catch (e) {}
  }

  function resolveCircleAabb(cx, cy, r, rx, ry, rw, rh) {
    var qx = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
    var qy = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
    var dx = cx - qx;
    var dy = cy - qy;
    var d2 = dx * dx + dy * dy;
    if (d2 < 1e-14) {
      var dl = cx - rx;
      var dr = rx + rw - cx;
      var dt = cy - ry;
      var db = ry + rh - cy;
      var m = Math.min(dl, dr, dt, db);
      if (m === dl) return { nx: -1, ny: 0, pen: r + dl };
      if (m === dr) return { nx: 1, ny: 0, pen: r + dr };
      if (m === dt) return { nx: 0, ny: -1, pen: r + dt };
      return { nx: 0, ny: 1, pen: r + db };
    }
    if (d2 >= r * r) return null;
    var d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, pen: r - d };
  }

  function cellIndexAtMeters(x, y) {
    var c = (x / CELL_LEN_M) | 0;
    var r = (y / CELL_WID_M) | 0;
    if (c < 0 || c >= PITCH_COLS || r < 0 || r >= PITCH_ROWS) return -1;
    return r * PITCH_COLS + c;
  }

  function resolveBallBounceLayer() {
    var pass, c, r, ix, rx, ry, res, any;
    lastPhysicsFlags.bounce = false;
    for (pass = 0; pass < 5; pass++) {
      any = false;
      var col0 = Math.floor((ball.x - BR) / CELL_LEN_M);
      var col1 = Math.ceil((ball.x + BR) / CELL_LEN_M);
      var row0 = Math.floor((ball.y - BR) / CELL_WID_M);
      var row1 = Math.ceil((ball.y + BR) / CELL_WID_M);
      for (r = Math.max(0, row0); r <= Math.min(PITCH_ROWS - 1, row1); r++) {
        for (c = Math.max(0, col0); c <= Math.min(PITCH_COLS - 1, col1); c++) {
          ix = r * PITCH_COLS + c;
          if (layers[L_PLAYER_BOUNCE][ix] <= 0) continue;
          rx = c * CELL_LEN_M;
          ry = r * CELL_WID_M;
          res = resolveCircleAabb(ball.x, ball.y, BR, rx, ry, CELL_LEN_M, CELL_WID_M);
          if (res && res.pen > 1e-6) {
            ball.x += res.nx * res.pen;
            ball.y += res.ny * res.pen;
            var dot = ball.vx * res.nx + ball.vy * res.ny;
            if (dot < 0) {
              ball.vx -= 2 * dot * res.nx;
              ball.vy -= 2 * dot * res.ny;
            }
            lastPhysicsFlags.bounce = true;
            any = true;
          }
        }
      }
      if (!any) break;
    }
  }

  /** Soft repulsion from avoid-layer cell centers (no hard collision). */
  function applyAvoidRepulsion(dt) {
    lastPhysicsFlags.avoid = false;
    var col0 = Math.floor((ball.x - BR) / CELL_LEN_M);
    var col1 = Math.ceil((ball.x + BR) / CELL_LEN_M);
    var row0 = Math.floor((ball.y - BR) / CELL_WID_M);
    var row1 = Math.ceil((ball.y + BR) / CELL_WID_M);
    var c, r, ix, mcx, mcy, dx, dy, dist, rInf, f;
    rInf = Math.max(CELL_LEN_M, CELL_WID_M) * 1.1;
    for (r = Math.max(0, row0); r <= Math.min(PITCH_ROWS - 1, row1); r++) {
      for (c = Math.max(0, col0); c <= Math.min(PITCH_COLS - 1, col1); c++) {
        ix = r * PITCH_COLS + c;
        if (layers[L_PLAYER_AVOID][ix] <= 0) continue;
        mcx = (c + 0.5) * CELL_LEN_M;
        mcy = (r + 0.5) * CELL_WID_M;
        dx = ball.x - mcx;
        dy = ball.y - mcy;
        dist = Math.sqrt(dx * dx + dy * dy) || 1e-9;
        if (dist >= rInf) continue;
        f = (1 - dist / rInf) * 95;
        ball.vx += (dx / dist) * f * dt;
        ball.vy += (dy / dist) * f * dt;
        lastPhysicsFlags.avoid = true;
      }
    }
  }

  /** Speed modifiers from cell under ball center (fast / slow). */
  function applyFastSlowZones(dt) {
    var ix = cellIndexAtMeters(ball.x, ball.y);
    lastPhysicsFlags.fast = false;
    lastPhysicsFlags.slow = false;
    if (ix < 0) return;
    var vf = layers[L_PLAYER_FAST][ix] > 0;
    var vs = layers[L_PLAYER_SLOW][ix] > 0;
    var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (vf && vs) {
      ball.vx *= 1 - 0.35 * dt;
      ball.vy *= 1 - 0.35 * dt;
      return;
    }
    if (vf) {
      var boost = 1 + 2.8 * dt;
      if (sp * boost > 120) boost = 120 / Math.max(sp, 1e-6);
      ball.vx *= boost;
      ball.vy *= boost;
      lastPhysicsFlags.fast = true;
    }
    if (vs) {
      ball.vx *= 1 - 1.9 * dt;
      ball.vy *= 1 - 1.9 * dt;
      if (sp > 1e-6 && Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) < 2) {
        ball.vx *= 0.5;
        ball.vy *= 0.5;
      }
      lastPhysicsFlags.slow = true;
    }
  }

  function shouldRunBallLoop() {
    return (ballRun || liveTelemetry) && !reducedMotion;
  }

  function ballTick(t) {
    if (!shouldRunBallLoop()) {
      ballRaf = 0;
      return;
    }
    var dt = lastBallT ? Math.min(0.048, (t - lastBallT) / 1000) : 0.016;
    lastBallT = t;
    if (liveTelemetry) {
      if (externalBallState) {
        ball.x = externalBallState.x;
        ball.y = externalBallState.y;
        if (externalBallState.vx != null) ball.vx = externalBallState.vx;
        if (externalBallState.vy != null) ball.vy = externalBallState.vy;
      }
      ballToCss();
      if (t - ballBroadcastLast > 90) {
        ballBroadcastLast = t;
        broadcastBall();
      }
      ballRaf = requestAnimationFrame(ballTick);
      return;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    resolveBallBounceLayer();
    applyAvoidRepulsion(dt);
    applyFastSlowZones(dt);
    if (ball.x < BR) {
      ball.x = BR;
      ball.vx *= -1;
    } else if (ball.x > LENGTH_M - BR) {
      ball.x = LENGTH_M - BR;
      ball.vx *= -1;
    }
    if (ball.y < BR) {
      ball.y = BR;
      ball.vy *= -1;
    } else if (ball.y > WIDTH_M - BR) {
      ball.y = WIDTH_M - BR;
      ball.vy *= -1;
    }
    ballToCss();
    if (t - ballBroadcastLast > 90) {
      ballBroadcastLast = t;
      broadcastBall();
    }
    ballRaf = requestAnimationFrame(ballTick);
  }

  function stopBallLoop() {
    if (ballRaf) cancelAnimationFrame(ballRaf);
    ballRaf = 0;
    lastBallT = 0;
  }

  function broadcastCell(ix, kind) {
    try {
      var ch = new BroadcastChannel('hexcast-stream');
      ch.postMessage({
        type: 'sportsfield-pitch',
        kind: kind || 'paint',
        cellKey: cellSpatialKey(ix),
        ix: ix,
        row: cellRowCol(ix).r,
        col: cellRowCol(ix).c,
        meters: cellMetersFromCorner(ix),
        layer: LAYER_KEYS[currentLayer],
        layerIndex: currentLayer,
        value: eraseMode ? 0 : layers[currentLayer][ix],
        pitchM: { L: LENGTH_M, W: WIDTH_M },
        grid: { cols: PITCH_COLS, rows: PITCH_ROWS },
        ts: Date.now()
      });
      ch.close();
    } catch (e) {}
  }

  function serialize() {
    var L;
    var out = [];
    for (L = 0; L < LAYERS; L++) out.push(Array.from(layers[L]));
    return {
      pitchM: { length: LENGTH_M, width: WIDTH_M },
      grid: { cols: PITCH_COLS, rows: PITCH_ROWS },
      cellMeters: { dx: CELL_LEN_M, dy: CELL_WID_M },
      layerKeys: LAYER_KEYS,
      layers: out,
      spatialKeyPrefix: 'sf-' + PITCH_COLS + 'x' + PITCH_ROWS,
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
      presetId: activePresetId,
      note:
        'cellSpatialKey is not H3 — map to H3/latlng off-thread; pro AR often uses sub-cm tracking + 4K–6K video.',
      v: 3
    };
  }

  function loadSerialized(data) {
    if (!data || !data.layers) return;
    var ver = data.v | 0;
    var pid = ver === 1 || ver === 0 ? 'football_fifa' : data.presetId || 'football_fifa';
    if (global.UgradSportsfieldPresets) {
      applySportPreset(pid);
    }
    var L, i, src = data.layers;
    if (src.length === 4 && (ver === 1 || ver === 0)) {
      for (L = 0; L < 3; L++) {
        if (!src[L] || src[L].length !== N) return;
        for (i = 0; i < N; i++) layers[L][i] = src[L][i] | 0;
      }
      if (!src[3] || src[3].length !== N) return;
      for (i = 0; i < N; i++) layers[L_PLAYER_BOUNCE][i] = src[3][i] | 0;
      for (L = L_PLAYER_FAST; L <= L_PLAYER_AVOID; L++) {
        for (i = 0; i < N; i++) layers[L][i] = 0;
      }
      renderAll();
      restoreBallFromSave(data);
      return;
    }
    if (src.length < LAYERS) return;
    for (L = 0; L < LAYERS; L++) {
      if (!src[L] || src[L].length !== N) return;
      for (i = 0; i < N; i++) layers[L][i] = src[L][i] | 0;
    }
    renderAll();
    restoreBallFromSave(data);
  }

  function restoreBallFromSave(data) {
    if (!data || !data.ball || typeof data.ball.x !== 'number') return;
    ball.x = data.ball.x;
    ball.y = data.ball.y;
    if (data.ball.vx != null) ball.vx = data.ball.vx;
    if (data.ball.vy != null) ball.vy = data.ball.vy;
    ballToCss();
  }

  function wireGridPointer() {
    var grid = $('sf-grid');
    if (!grid || gridPointerWired) return;
    gridPointerWired = true;
    var lastIx = -1;

    function ixFromEvent(e) {
      var t = e.target;
      if (!t || !t.getAttribute) return -1;
      var ix = t.getAttribute('data-i');
      if (ix == null) return -1;
      return +ix;
    }

    grid.addEventListener('mousemove', function (e) {
      var ix = ixFromEvent(e);
      if (ix >= 0 && ix !== lastHoverIx) {
        lastHoverIx = ix;
        updateReadout(ix);
      }
      if (painting && ix >= 0 && ix !== lastIx) {
        applyBrush(ix);
        lastIx = ix;
        broadcastCell(ix, 'stroke');
      }
    });
    grid.addEventListener('mouseleave', function () {
      lastHoverIx = -1;
      updateReadout(-1);
    });

    grid.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      painting = true;
      var ix = ixFromEvent(e);
      if (ix >= 0) {
        applyBrush(ix);
        lastIx = ix;
        broadcastCell(ix, 'stroke');
      }
    });
    window.addEventListener('mouseup', function () {
      painting = false;
      lastIx = -1;
    });
  }

  function wireHud() {
    var ls = $('sf-layer');
    var pv = $('sf-paint');
    var er = $('sf-erase');
    var br = $('sf-brush');
    var cl = $('sf-clear');
    var ex = $('sf-export');
    if (ls)
      ls.addEventListener('change', function () {
        currentLayer = Math.min(LAYERS - 1, Math.max(0, +ls.value | 0));
      });
    if (pv)
      pv.addEventListener('change', function () {
        paintVal = Math.min(4, Math.max(1, +pv.value | 0));
      });
    if (er)
      er.addEventListener('change', function () {
        eraseMode = er.checked;
      });
    if (br)
      br.addEventListener('change', function () {
        brush = +br.value | 0;
      });
    if (cl)
      cl.addEventListener('click', function () {
        clearPitch();
      });
    if (ex)
      ex.addEventListener('click', function () {
        try {
          var t = JSON.stringify(serialize(), null, 2);
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t);
          else prompt('Pitch JSON:', t);
        } catch (err) {}
      });
    var spr = $('sf-sport-preset');
    if (spr)
      spr.addEventListener('change', function () {
        applySportPreset(spr.value);
      });
    var brun = $('sf-ball-run');
    if (brun) {
      brun.addEventListener('change', function () {
        ballRun = !!(brun.checked && !reducedMotion);
        if (!shouldRunBallLoop()) stopBallLoop();
        else if (!ballRaf) {
          ballBroadcastLast = 0;
          lastBallT = 0;
          ballRaf = requestAnimationFrame(ballTick);
        }
      });
      if (reducedMotion) {
        brun.disabled = true;
        brun.title = 'Ball sim off when reduced motion is requested';
      }
    }
    var liv = $('sf-live-tel');
    if (liv) {
      liv.addEventListener('change', function () {
        liveTelemetry = !!liv.checked;
        if (!liveTelemetry) externalBallState = null;
        if (!shouldRunBallLoop()) stopBallLoop();
        else if (!ballRaf) {
          ballBroadcastLast = 0;
          lastBallT = 0;
          ballRaf = requestAnimationFrame(ballTick);
        }
      });
      liveTelemetry = !!liv.checked;
    }
  }

  function buildGrid() {
    var g = $('sf-grid');
    if (!g) return;
    var L, i;
    for (L = 0; L < LAYERS; L++) layers[L] = new Uint8Array(N);
    g.innerHTML = '';
    cells = [];
    g.style.setProperty('--sf-cols', String(PITCH_COLS));
    var frag = document.createDocumentFragment();
    var idx, cell;
    for (idx = 0; idx < N; idx++) {
      cell = document.createElement('div');
      cell.className = 'sf-map-cell';
      cell.setAttribute('data-i', String(idx));
      cell.title = cellSpatialKey(idx);
      frag.appendChild(cell);
      cells.push(cell);
    }
    g.appendChild(frag);
    renderAll();
    updateReadout(-1);
  }

  function wireLiveTelemetryChannel() {
    if (liveCh) return;
    try {
      liveCh = new BroadcastChannel('hexcast-stream');
      liveCh.onmessage = function (ev) {
        var d = ev.data;
        if (!d || d.type !== 'sportsfield-telemetry') return;
        if (d.shot) {
          shotHint = d.shot;
          if (typeof global.SportsfieldShot !== 'undefined' && global.SportsfieldShot.analyze && d.meters) {
            var vx = (d.velocityMs && d.velocityMs.vx) || 0;
            var vy = (d.velocityMs && d.velocityMs.vy) || 0;
            var a = global.SportsfieldShot.analyze({
              x: d.meters.x,
              y: d.meters.y,
              vx: vx,
              vy: vy,
              targetGoal: d.shot && d.shot.targetGoal
            });
            shotHint = Object.assign({}, shotHint, { analysis: a });
          }
        }
        if (!liveTelemetry) return;
        if (d.meters && typeof d.meters.x === 'number' && typeof d.meters.y === 'number') {
          externalBallState = {
            x: d.meters.x,
            y: d.meters.y,
            vx: d.velocityMs && d.velocityMs.vx,
            vy: d.velocityMs && d.velocityMs.vy
          };
        }
      };
    } catch (e) {
      liveCh = null;
    }
  }

  function init() {
    var ls = $('sf-layer');
    var pv = $('sf-paint');
    var br = $('sf-brush');
    var spr = $('sf-sport-preset');
    if (spr && global.UgradSportsfieldPresets && spr.options.length === 0) {
      global.UgradSportsfieldPresets.list().forEach(function (x) {
        var o = document.createElement('option');
        o.value = x.id;
        o.textContent = x.label;
        spr.appendChild(o);
      });
    }
    var saved = '';
    try {
      saved = localStorage.getItem('sf-sport-preset-id') || '';
    } catch (e) {}
    var pid = (spr && spr.value) || saved || 'football_fifa';
    if (global.UgradSportsfieldPresets && !global.UgradSportsfieldPresets.get(pid)) pid = 'football_fifa';
    if (global.UgradSportsfieldPresets && global.UgradSportsfieldPresets.get(pid)) {
      if (spr) spr.value = pid;
      applySportPreset(pid);
    } else {
      buildGrid();
      if (typeof global.SportsfieldShot !== 'undefined' && global.SportsfieldShot.setPitchConfig) {
        global.SportsfieldShot.setPitchConfig({
          lengthM: 105,
          widthM: 68,
          shotModel: 'soccer_ifab'
        });
      }
      ballToCss();
    }
    if (ls) currentLayer = Math.min(LAYERS - 1, Math.max(0, +ls.value | 0));
    if (pv) paintVal = Math.min(4, Math.max(1, +pv.value | 0));
    if (br) brush = Math.min(2, Math.max(0, +br.value | 0));
    wireHud();
    wireGridPointer();
    wireLiveTelemetryChannel();
    ballToCss();
    if (shouldRunBallLoop() && !ballRaf) {
      ballBroadcastLast = 0;
      lastBallT = 0;
      ballRaf = requestAnimationFrame(ballTick);
    }
  }

  global.SportsfieldPitch = {
    init: init,
    serialize: serialize,
    loadSerialized: loadSerialized,
    clearPitch: clearPitch,
    cellSpatialKey: cellSpatialKey,
    cellMetersFromCorner: cellMetersFromCorner,
    getBall: function () {
      return { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
    },
    /** Drive ball from external tracking (meters, same origin as pitch). */
    applyExternalBallState: function (o) {
      if (!o || typeof o.x !== 'number' || typeof o.y !== 'number') return;
      externalBallState = {
        x: o.x,
        y: o.y,
        vx: o.vx,
        vy: o.vy
      };
      ball.x = o.x;
      ball.y = o.y;
      if (o.vx != null) ball.vx = o.vx;
      if (o.vy != null) ball.vy = o.vy;
      ballToCss();
      broadcastBall();
      if (shouldRunBallLoop() && !ballRaf && !reducedMotion) {
        ballBroadcastLast = 0;
        lastBallT = 0;
        ballRaf = requestAnimationFrame(ballTick);
      }
    },
    setLiveTelemetry: function (on) {
      liveTelemetry = !!on;
      var liv = $('sf-live-tel');
      if (liv) liv.checked = liveTelemetry;
      if (!liveTelemetry) externalBallState = null;
      if (!shouldRunBallLoop()) stopBallLoop();
      else if (!ballRaf) {
        ballBroadcastLast = 0;
        lastBallT = 0;
        ballRaf = requestAnimationFrame(ballTick);
      }
    },
    setShotHint: function (shot) {
      shotHint = shot || null;
    },
    /** xG-style + goal-mouth ray (requires ugrad-sportsfield-shot.js). */
    analyzeShot: function (o) {
      if (typeof global.SportsfieldShot === 'undefined' || !global.SportsfieldShot.analyze) return null;
      return global.SportsfieldShot.analyze(o || {});
    },
    getDimensions: function () {
      return {
        L: LENGTH_M,
        W: WIDTH_M,
        cols: PITCH_COLS,
        rows: PITCH_ROWS,
        presetId: activePresetId
      };
    },
    setSportPreset: applySportPreset,
    LAYER_KEYS: LAYER_KEYS,
    get LENGTH_M() {
      return LENGTH_M;
    },
    get WIDTH_M() {
      return WIDTH_M;
    },
    get COLS() {
      return PITCH_COLS;
    },
    get ROWS() {
      return PITCH_ROWS;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
