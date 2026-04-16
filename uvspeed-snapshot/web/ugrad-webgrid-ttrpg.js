/**
 * ugrad-webgrid-ttrpg.js — WebGrid arena: 72×48 · layers land / power / zone / mark / path + erase,
 * 6 seat colors = simultaneous characters + skills; cells draw as inset outline rings (see-through);
 * tensor 3×3 follows scroll viewport; swarm orbits marks (per seat) else land/power/zone/path anchors.
 */
(function (global) {
  'use strict';

  var WG_COLS = 72;
  var WG_ROWS = 48;
  var N = WG_COLS * WG_ROWS;
  var LAYERS = 5;
  /** land · power · zone · mark · path */
  var LAYER_KEYS = ['land', 'power', 'zone', 'mark', 'path'];
  var LAND_LAYER = 0;
  var MARK_LAYER = 3;
  var POWER_LAYER = 1;
  var ZONE_LAYER = 2;
  var PATH_LAYER = 4;
  var SEAT_HEX = ['#f85149', '#58a6ff', '#3fb950', '#d29922', '#a371f7', '#f778ba'];
  var SEAT_SKILLS = ['Strike', 'Ward', 'Zone ctrl', 'Mark', 'Path', 'Wild'];
  var SEAT_RGBA = [
    'rgba(248,81,73,',
    'rgba(88,166,255,',
    'rgba(63,185,80,',
    'rgba(210,153,34,',
    'rgba(163,113,247,',
    'rgba(247,120,186,'
  ];
  var PAL = [
    ['#1b4332', '#2d6a4f', '#40916c', '#52b788'],
    ['#7c2d12', '#c2410c', '#ea580c', '#fb923c'],
    ['#312e81', '#4338ca', '#6366f1', '#a5b4fc'],
    ['#21262d', '#30363d', '#484f58', '#6e7681'],
    ['#1c1917', '#44403c', '#78716c', '#a8a29e']
  ];

  var layers = [];
  var cells = [];
  var painting = false;
  var paintVal = 1;
  var currentLayer = 0;
  var eraseMode = false;
  var brush = 0;
  var bc = null;
  var bcFollow = false;
  var bcSend = true;
  var reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var particles = [];
  var swarm = [];
  var cursor = { x: 0, y: 0 };
  var activeSeat = 0;
  var swarmOn = true;
  var raf = 0;
  var fxOn = true;
  var centerBase = 0;
  /** Top-left cell index of the live 3×3 tensor block (follows scroll viewport). */
  var tensorBlockBase = 0;
  var lastTensorSlice9 = null;
  var lastTensorIndices = [];
  var tensorScrollRaf = 0;
  var shockwaves = [];
  var strokeBuffer = [];
  var strokeLayerAtStart = 0;
  var strokeEraseAtStart = false;
  var cellStageX = new Float32Array(N);
  var cellStageY = new Float32Array(N);
  var landGenTick = 0;
  var SWARM_MAX = 220;

  function $(id) {
    return document.getElementById(id);
  }

  function getRoomId() {
    var el = $('gm-bc-label');
    var v = el && el.value ? el.value.trim() : '';
    return v || 'webgrid-public';
  }

  function compositeAt(i) {
    var L, v;
    for (L = LAYERS - 1; L >= 0; L--) {
      v = layers[L][i];
      if (v > 0) return { L: L, v: v };
    }
    return null;
  }

  var MAP_OUTLINE_ALPHA = 0.9;

  function hexToOutlineRgba(hex, alpha) {
    if (!hex || hex.charAt(0) !== '#') return 'rgba(128,128,128,' + alpha + ')';
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * 0.18));
    g = Math.min(255, Math.round(g + (255 - g) * 0.18));
    b = Math.min(255, Math.round(b + (255 - b) * 0.18));
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function tensorOutlineFromEl(el) {
    if (!el || !el.classList) return null;
    if (el.classList.contains('wg-tensor-neg')) return 'rgba(96,165,250,0.92)';
    if (el.classList.contains('wg-tensor-pos')) return 'rgba(52,211,153,0.92)';
    if (el.classList.contains('wg-tensor-zero')) return 'rgba(255,255,255,0.45)';
    return null;
  }

  function applyCellVisual(i) {
    var el = cells[i];
    if (!el) return;
    var c = compositeAt(i);
    var mapOutline = null;
    var hex;
    if (c) {
      if (c.L === MARK_LAYER && c.v >= 1 && c.v <= 6) hex = SEAT_HEX[c.v - 1];
      else hex = PAL[c.L][Math.min(3, c.v - 1)] || PAL[c.L][0];
      mapOutline = hexToOutlineRgba(hex, MAP_OUTLINE_ALPHA);
    }
    el.style.background = 'transparent';
    var tOutline = tensorOutlineFromEl(el);
    var parts = [];
    if (mapOutline) parts.push('inset 0 0 0 1px ' + mapOutline);
    if (tOutline) {
      if (mapOutline) parts.push('inset 0 0 0 2px ' + tOutline);
      else parts.push('inset 0 0 0 1px ' + tOutline);
    }
    el.style.boxShadow = parts.length ? parts.join(', ') : 'none';
  }

  function paintCell(i) {
    var el = cells[i];
    if (!el) return;
    var v;
    if (eraseMode) {
      layers[currentLayer][i] = 0;
    } else {
      v = currentLayer === MARK_LAYER ? activeSeat + 1 : paintVal;
      layers[currentLayer][i] = Math.min(currentLayer === MARK_LAYER ? 6 : 4, Math.max(1, v | 0));
    }
    if (painting && strokeBuffer.indexOf(i) === -1) strokeBuffer.push(i);
    applyCellVisual(i);
  }

  function neighbors(ix, rad) {
    var out = [];
    var c = ix % WG_COLS;
    var r = (ix / WG_COLS) | 0;
    var dy, dx, nc, nr, ni;
    for (dy = -rad; dy <= rad; dy++) {
      for (dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) > rad) continue;
        nr = r + dy;
        nc = c + dx;
        if (nr < 0 || nr >= WG_ROWS || nc < 0 || nc >= WG_COLS) continue;
        ni = nr * WG_COLS + nc;
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
    for (i = 0; i < N; i++) {
      applyCellVisual(i);
    }
  }

  function clearMap() {
    var L, i;
    for (L = 0; L < LAYERS; L++) {
      for (i = 0; i < N; i++) layers[L][i] = 0;
    }
    renderAll();
    if (!reduced && swarmOn) {
      var cv = $('wg-swarm');
      if (cv && cv.clientWidth > 4) {
        pushShockwave(cv.clientWidth * 0.5, cv.clientHeight * 0.5, {
          kind: 'collapse',
          radiusMax: 340,
          speed: 11,
          strength: 0.72
        });
      }
    }
  }

  function serialize() {
    var L;
    var out = [];
    for (L = 0; L < LAYERS; L++) out.push(Array.from(layers[L]));
    return {
      cols: WG_COLS,
      rows: WG_ROWS,
      layerKeys: LAYER_KEYS,
      layers: out,
      activeSeat: activeSeat,
      seatSkills: SEAT_SKILLS,
      room: getRoomId(),
      v: 2
    };
  }

  function loadSerialized(data) {
    if (!data || !data.layers) return;
    var L, i, src = data.layers;
    if (src.length < LAYERS) return;
    for (L = 0; L < LAYERS; L++) {
      if (!src[L] || src[L].length !== N) return;
      for (i = 0; i < N; i++) layers[L][i] = src[L][i] | 0;
    }
    if (typeof data.activeSeat === 'number' && data.activeSeat >= 0 && data.activeSeat < 6) {
      activeSeat = data.activeSeat | 0;
      var r = document.querySelector('input[name="wg-seat"][value="' + activeSeat + '"]');
      if (r) r.checked = true;
    }
    renderAll();
  }

  function broadcastMap() {
    if (!bcSend || !bc) return;
    try {
      bc.postMessage({
        type: 'webgrid-map',
        room: getRoomId(),
        payload: serialize(),
        ts: Date.now()
      });
    } catch (e) {}
  }

  function rippleAt(clientX, clientY) {
    var stage = $('wg-stage');
    var layer = $('wg-ripple-layer');
    if (!stage || !layer || reduced) return;
    var r = stage.getBoundingClientRect();
    var x = clientX - r.left;
    var y = clientY - r.top;
    var d = document.createElement('div');
    d.className = 'wg-ripple';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.width = '28px';
    d.style.height = '28px';
    layer.appendChild(d);
    setTimeout(function () {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, 800);
  }

  function speckBurst(n) {
    if (reduced || !fxOn) return;
    var cv = $('wg-fx');
    if (!cv) return;
    var w = cv.width;
    var h = cv.height;
    var dpr = cv.width / Math.max(cv.clientWidth, 1);
    var i;
    for (i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.5 + h * 0.45,
        vx: (Math.random() - 0.5) * 2 * dpr,
        vy: (-1.8 - Math.random() * 2.5) * dpr,
        r: (1 + Math.random() * 2.2) * dpr,
        a: 0.25 + Math.random() * 0.35,
        hue: 220 + Math.random() * 100
      });
    }
  }

  function cacheCellCenters() {
    var st = $('wg-stage');
    if (!st || !cells.length) return;
    var sbr = st.getBoundingClientRect();
    var i, cell, br;
    for (i = 0; i < N; i++) {
      cell = cells[i];
      if (!cell) continue;
      br = cell.getBoundingClientRect();
      cellStageX[i] = br.left + br.width * 0.5 - sbr.left;
      cellStageY[i] = br.top + br.height * 0.5 - sbr.top;
    }
  }

  function sizeCanvasToStage(cv, st) {
    if (!cv || !st) return;
    var dpr = Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2);
    var rw = st.clientWidth;
    var rh = st.clientHeight;
    if (rw < 2 || rh < 2) return;
    cv.width = Math.floor(rw * dpr);
    cv.height = Math.floor(rh * dpr);
    cv.style.width = rw + 'px';
    cv.style.height = rh + 'px';
    var ctx = cv.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resizeFx() {
    var st = $('wg-stage');
    sizeCanvasToStage($('wg-fx'), st);
    sizeCanvasToStage($('wg-swarm'), st);
    cacheCellCenters();
    initSwarm();
    if (lastTensorSlice9) paintTensorSlice(lastTensorSlice9);
  }

  function pushShockwave(cx, cy, opts) {
    opts = opts || {};
    var kind = opts.kind || 'burst';
    var radiusMax = opts.radiusMax != null ? opts.radiusMax : 120;
    var strength = opts.strength != null ? opts.strength : 0.9;
    var speed = opts.speed != null ? opts.speed : 10;
    shockwaves.push({
      cx: cx,
      cy: cy,
      radius: 0,
      radiusMax: radiusMax,
      speed: speed,
      life: 1,
      strength: strength,
      kind: kind
    });
  }

  function finishStrokeShockwave() {
    if (reduced || !swarmOn) {
      strokeBuffer = [];
      return;
    }
    var L = strokeLayerAtStart;
    if (L !== POWER_LAYER && L !== ZONE_LAYER) {
      strokeBuffer = [];
      return;
    }
    var uniq = {};
    var k, ix, keys, n;
    for (k = 0; k < strokeBuffer.length; k++) {
      uniq[strokeBuffer[k]] = 1;
    }
    keys = Object.keys(uniq);
    n = keys.length;
    if (n < 2) {
      strokeBuffer = [];
      return;
    }
    var st = $('wg-stage');
    if (!st) {
      strokeBuffer = [];
      return;
    }
    var sbr = st.getBoundingClientRect();
    var sumX = 0;
    var sumY = 0;
    var j;
    for (j = 0; j < keys.length; j++) {
      ix = +keys[j];
      var cell = cells[ix];
      if (!cell) continue;
      var br = cell.getBoundingClientRect();
      sumX += br.left + br.width / 2 - sbr.left;
      sumY += br.top + br.height / 2 - sbr.top;
    }
    var cx = sumX / n;
    var cy = sumY / n;
    var mag = Math.min(1.55, 0.38 + Math.sqrt(n) * 0.065);
    var burst = !strokeEraseAtStart;
    pushShockwave(cx, cy, {
      kind: burst ? 'burst' : 'collapse',
      radiusMax: 52 + Math.min(n * 2.5, 200),
      speed: 5.5 + Math.min(n * 0.14, 18),
      strength: mag * (burst ? 0.95 : 0.62)
    });
    strokeBuffer = [];
  }

  function spawnSuperAtCursor() {
    if (reduced || !swarmOn) return;
    var cv = $('wg-swarm');
    if (!cv) return;
    pushShockwave(cursor.x, cursor.y, {
      kind: 'super',
      radiusMax: 280,
      speed: 16,
      strength: 1.45
    });
    speckBurst(28);
  }

  function initSwarm() {
    shockwaves.length = 0;
    var cv = $('wg-swarm');
    if (!cv) return;
    var rw = cv.clientWidth;
    var rh = cv.clientHeight;
    if (rw < 4 || rh < 4) return;
    swarm = [];
    var si, k;
    for (si = 0; si < 6; si++) {
      for (k = 0; k < 18; k++) {
        swarm.push({
          x: Math.random() * rw,
          y: Math.random() * rh,
          vx: 0,
          vy: 0,
          seat: si,
          r: 1.2 + Math.random() * 2.4,
          hoverPhase: Math.random() * Math.PI * 2
        });
      }
    }
    cursor.x = rw * 0.5;
    cursor.y = rh * 0.5;
  }

  function drawSwarm() {
    var cv = $('wg-swarm');
    if (!cv || reduced) return;
    var ctx = cv.getContext('2d');
    var rw = cv.clientWidth;
    var rh = cv.clientHeight;
    var dpr = cv.width / Math.max(rw, 1);
    if (!ctx || cv.width < 2) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rw, rh);
    if (!swarmOn) return;
    var tx = cursor.x;
    var ty = cursor.y;
    var i, p, dx, dy, d, pull, a;
    var sw, w, ringDist, fall, nx, ny, imp, dist, band, sign, tw;
    var ci, mv, landN, landCx, landCy, landMag, markLists, ml, bestIx, bestD, ddx, ddy, dd;
    var mx, my, rx, ry, rd, orbitR, htx, hty, cursorBlend, markCount;
    var anchorCells, anchorStride, mi, anchorStrength;

    landN = 0;
    landCx = 0;
    landCy = 0;
    markLists = [[], [], [], [], [], []];
    anchorCells = [];
    for (ci = 0; ci < N; ci++) {
      if (layers[LAND_LAYER][ci] > 0) {
        landCx += cellStageX[ci];
        landCy += cellStageY[ci];
        landN++;
      }
      mv = layers[MARK_LAYER][ci];
      if (mv >= 1 && mv <= 6) markLists[mv - 1].push(ci);
      if (
        layers[LAND_LAYER][ci] > 0 ||
        layers[POWER_LAYER][ci] > 0 ||
        layers[ZONE_LAYER][ci] > 0 ||
        layers[PATH_LAYER][ci] > 0
      ) {
        anchorCells.push(ci);
      }
    }
    anchorStride = anchorCells.length > 420 ? 1 + ((anchorCells.length / 420) | 0) : 1;
    if (landN > 0) {
      landCx /= landN;
      landCy /= landN;
    }
    landMag = Math.min(1.15, 0.35 + landN / 45);

    for (sw = 0; sw < shockwaves.length; sw++) {
      w = shockwaves[sw];
      w.radius += w.speed * 0.35;
      w.life *= 0.987;
    }
    shockwaves = shockwaves.filter(function (x) {
      return x.life > 0.03 && x.radius < x.radiusMax * 1.4;
    });

    for (sw = 0; sw < shockwaves.length; sw++) {
      w = shockwaves[sw];
      ctx.beginPath();
      ctx.arc(w.cx, w.cy, Math.max(0, w.radius), 0, Math.PI * 2);
      if (w.kind === 'collapse') {
        ctx.strokeStyle = 'rgba(120,180,255,' + (0.12 + w.life * 0.35) + ')';
      } else if (w.kind === 'super') {
        ctx.strokeStyle = 'rgba(255,190,90,' + (0.18 + w.life * 0.35) + ')';
      } else {
        ctx.strokeStyle = 'rgba(255,130,65,' + (0.14 + w.life * 0.38) + ')';
      }
      ctx.lineWidth = w.kind === 'super' ? 3 : 2;
      ctx.stroke();
    }

    for (i = 0; i < swarm.length; i++) {
      p = swarm[i];
      if (p.hoverPhase == null) p.hoverPhase = Math.random() * Math.PI * 2;

      markCount = markLists[p.seat] ? markLists[p.seat].length : 0;
      cursorBlend = markCount > 0 ? 0.32 : 1;
      if (markCount === 0 && anchorCells.length > 0) cursorBlend *= 0.62;
      if (landN > 0) cursorBlend *= 0.72;

      dx = tx - p.x;
      dy = ty - p.y;
      d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      pull = p.seat === activeSeat ? 0.62 : 0.22;
      var pullMult = shockwaves.length > 0 ? 0.38 : 1;
      p.vx += (dx / d) * pull * 0.55 * pullMult * cursorBlend;
      p.vy += (dy / d) * pull * 0.55 * pullMult * cursorBlend;

      if (landN > 0) {
        dx = landCx - p.x;
        dy = landCy - p.y;
        d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        p.vx += (dx / d) * landMag * 0.52;
        p.vy += (dy / d) * landMag * 0.52;
      }

      if (markCount > 0) {
        ml = markLists[p.seat];
        bestD = 1e12;
        bestIx = -1;
        for (var mi = 0; mi < ml.length; mi++) {
          ci = ml[mi];
          ddx = p.x - cellStageX[ci];
          ddy = p.y - cellStageY[ci];
          dd = ddx * ddx + ddy * ddy;
          if (dd < bestD) {
            bestD = dd;
            bestIx = ci;
          }
        }
        if (bestIx >= 0) {
          mx = cellStageX[bestIx];
          my = cellStageY[bestIx];
          rx = p.x - mx;
          ry = p.y - my;
          rd = Math.sqrt(rx * rx + ry * ry) + 0.01;
          orbitR = 7 + p.r * 2.8;
          htx = -ry / rd;
          hty = rx / rd;
          p.hoverPhase += 0.052 + 0.012 * Math.sin(i * 0.31 + landN * 0.01);
          var wobble = 0.82 + 0.18 * Math.sin(p.hoverPhase);
          p.vx += htx * 0.5 * wobble;
          p.vy += hty * 0.5 * wobble;
          var ring = (rd - orbitR) * 0.085;
          p.vx -= (rx / rd) * ring;
          p.vy -= (ry / rd) * ring;
        }
      } else if (anchorCells.length > 0) {
        bestD = 1e12;
        bestIx = -1;
        for (mi = 0; mi < anchorCells.length; mi += anchorStride) {
          ci = anchorCells[mi];
          ddx = p.x - cellStageX[ci];
          ddy = p.y - cellStageY[ci];
          dd = ddx * ddx + ddy * ddy;
          if (dd < bestD) {
            bestD = dd;
            bestIx = ci;
          }
        }
        if (bestIx >= 0) {
          mx = cellStageX[bestIx];
          my = cellStageY[bestIx];
          rx = p.x - mx;
          ry = p.y - my;
          rd = Math.sqrt(rx * rx + ry * ry) + 0.01;
          orbitR = 8 + p.r * 2.6;
          htx = -ry / rd;
          hty = rx / rd;
          anchorStrength = 0.44;
          p.hoverPhase += 0.048 + 0.01 * Math.sin(i * 0.29 + anchorCells.length * 0.002);
          var wobbleA = 0.8 + 0.2 * Math.sin(p.hoverPhase);
          p.vx += htx * anchorStrength * wobbleA;
          p.vy += hty * anchorStrength * wobbleA;
          var ringA = (rd - orbitR) * 0.078;
          p.vx -= (rx / rd) * ringA;
          p.vy -= (ry / rd) * ringA;
        }
      }

      for (sw = 0; sw < shockwaves.length; sw++) {
        w = shockwaves[sw];
        dx = p.x - w.cx;
        dy = p.y - w.cy;
        dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
        nx = dx / dist;
        ny = dy / dist;
        ringDist = Math.abs(dist - w.radius);
        band = w.kind === 'super' ? 34 : 20;
        if (ringDist < band) {
          fall = (1 - ringDist / band) * w.life;
          if (w.kind === 'collapse') {
            sign = -1;
            imp = w.strength * fall * 6.2;
          } else if (w.kind === 'super') {
            sign = 1;
            imp = w.strength * fall * 6.8;
          } else {
            sign = 1;
            imp = w.strength * fall * 5.5;
          }
          p.vx += nx * imp * sign;
          p.vy += ny * imp * sign;
          tw = (w.kind === 'super' ? 0.48 : 0.32) * fall;
          p.vx += -ny * imp * tw;
          p.vy += nx * imp * tw;
        }
      }

      p.vx += (Math.random() - 0.5) * 0.28;
      p.vy += (Math.random() - 0.5) * 0.28;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -4) p.x = rw + 4;
      if (p.x > rw + 4) p.x = -4;
      if (p.y < -4) p.y = rh + 4;
      if (p.y > rh + 4) p.y = -4;
      a = p.seat === activeSeat ? 0.88 : 0.38;
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(0.9, p.r * 0.38);
      ctx.strokeStyle = SEAT_RGBA[p.seat] + (a * 0.72) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, p.r - ctx.lineWidth * 0.35), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (landN > 0 && swarm.length < SWARM_MAX) {
      landGenTick++;
      if (landGenTick >= 64) {
        landGenTick = 0;
        for (sw = 0; sw < 28; sw++) {
          ci = (Math.random() * N) | 0;
          if (layers[LAND_LAYER][ci] > 0) {
            swarm.push({
              x: cellStageX[ci] + (Math.random() - 0.5) * 6,
              y: cellStageY[ci] + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 0.6,
              vy: (Math.random() - 0.5) * 0.6,
              seat: (Math.random() * 6) | 0,
              r: 1.1 + Math.random() * 2.2,
              hoverPhase: Math.random() * Math.PI * 2
            });
            break;
          }
        }
      }
    }

    ctx.globalAlpha = 1;
  }

  function fxLoop() {
    var cv = $('wg-fx');
    if (cv && fxOn) {
      var ctx = cv.getContext('2d');
      var rw = cv.clientWidth;
      var rh = cv.clientHeight;
      var dpr = cv.width / Math.max(rw, 1);
      if (ctx && cv.width >= 2) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = 'rgba(6,8,12,0.2)';
        ctx.fillRect(0, 0, rw, rh);
        var alive = [];
        var i, p;
        for (i = 0; i < particles.length; i++) {
          p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.a *= 0.986;
          if (p.a > 0.04 && p.y > -10 && p.y < rh + 30) {
            ctx.globalAlpha = Math.min(1, p.a);
            ctx.fillStyle = 'hsla(' + p.hue + ',70%,55%,' + p.a + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            alive.push(p);
          }
        }
        particles = alive;
        ctx.globalAlpha = 1;
      }
    }
    drawSwarm();
    raf = requestAnimationFrame(fxLoop);
  }

  function computeTensorBlockFromViewport() {
    var sc = $('wg-map-scroll');
    if (!sc || !cells.length) return centerBase;
    var rect = sc.getBoundingClientRect();
    var cx = rect.left + sc.clientWidth * 0.5;
    var cy = rect.top + sc.clientHeight * 0.5;
    var u = document.elementFromPoint(cx, cy);
    while (u && u !== document.body) {
      if (u.getAttribute && u.hasAttribute('data-i')) {
        var centerIx = +u.getAttribute('data-i');
        if (centerIx >= 0 && centerIx < N) {
          var cc = centerIx % WG_COLS;
          var cr = (centerIx / WG_COLS) | 0;
          var c0 = Math.max(0, Math.min(WG_COLS - 3, cc - 1));
          var r0 = Math.max(0, Math.min(WG_ROWS - 3, cr - 1));
          return r0 * WG_COLS + c0;
        }
      }
      u = u.parentElement;
    }
    var cell0 = cells[0];
    if (!cell0) return centerBase;
    var cw = cell0.offsetWidth || 8;
    var ch = cell0.offsetHeight || 8;
    if (cw < 1) cw = 8;
    if (ch < 1) ch = 8;
    var midX = sc.scrollLeft + sc.clientWidth * 0.5;
    var midY = sc.scrollTop + sc.clientHeight * 0.5;
    var centerCol = Math.min(WG_COLS - 1, Math.max(0, (midX / cw) | 0));
    var centerRow = Math.min(WG_ROWS - 1, Math.max(0, (midY / ch) | 0));
    var c0f = Math.max(0, Math.min(WG_COLS - 3, centerCol - 1));
    var r0f = Math.max(0, Math.min(WG_ROWS - 3, centerRow - 1));
    return r0f * WG_COLS + c0f;
  }

  function clearTensorBlockCells() {
    var j, ix, el;
    var old = lastTensorIndices;
    lastTensorIndices = [];
    for (j = 0; j < old.length; j++) {
      ix = old[j];
      el = cells[ix];
      if (!el) continue;
      el.classList.remove('wg-tensor-neg', 'wg-tensor-zero', 'wg-tensor-pos');
      applyCellVisual(ix);
    }
  }

  function requestTensorRepaint() {
    if (!lastTensorSlice9) return;
    if (tensorScrollRaf) return;
    tensorScrollRaf = requestAnimationFrame(function () {
      tensorScrollRaf = 0;
      var nb = computeTensorBlockFromViewport();
      if (nb !== tensorBlockBase) {
        paintTensorSlice(lastTensorSlice9);
      }
    });
  }

  function wireTensorScrollFollow() {
    var sc = $('wg-map-scroll');
    if (!sc || reduced) return;
    sc.addEventListener(
      'scroll',
      function () {
        requestTensorRepaint();
      },
      { passive: true }
    );
  }

  function paintTensorSlice(slice9) {
    if (!cells.length || !slice9 || slice9.length < 9) return;
    var sbuf = [];
    var i, ix, row, col, v, el;
    for (i = 0; i < 9; i++) sbuf[i] = +slice9[i];
    lastTensorSlice9 = sbuf;
    clearTensorBlockCells();
    tensorBlockBase = computeTensorBlockFromViewport();
    for (i = 0; i < 9; i++) {
      row = (i / 3) | 0;
      col = i % 3;
      ix = tensorBlockBase + row * WG_COLS + col;
      lastTensorIndices.push(ix);
      el = cells[ix];
      if (!el) continue;
      el.classList.remove('wg-tensor-neg', 'wg-tensor-zero', 'wg-tensor-pos');
      v = sbuf[i];
      if (v > 0.25) el.classList.add('wg-tensor-pos');
      else if (v < -0.25) el.classList.add('wg-tensor-neg');
      else el.classList.add('wg-tensor-zero');
      applyCellVisual(ix);
    }
  }

  function clearTensorClasses() {
    lastTensorSlice9 = null;
    clearTensorBlockCells();
    var i, el;
    for (i = 0; i < cells.length; i++) {
      el = cells[i];
      if (!el) continue;
      el.classList.remove('wg-tensor-neg', 'wg-tensor-zero', 'wg-tensor-pos');
      applyCellVisual(i);
    }
  }

  function syncPaintFromLayerAndSeat() {
    var pv = $('wg-paint');
    var pw = $('wg-paint-wrap');
    if (currentLayer === MARK_LAYER) {
      paintVal = activeSeat + 1;
      if (pw) pw.style.display = 'none';
    } else {
      if (pw) pw.style.display = '';
      if (pv) paintVal = Math.min(4, Math.max(1, +pv.value | 0));
    }
  }

  function readActiveSeat() {
    var r = document.querySelector('input[name="wg-seat"]:checked');
    activeSeat = r ? Math.min(5, Math.max(0, +r.value | 0)) : 0;
    syncPaintFromLayerAndSeat();
    document.querySelectorAll('.wg-party-seat').forEach(function (node, j) {
      node.classList.toggle('is-active-seat', j === activeSeat);
    });
  }

  function buildParty() {
    var host = $('wg-party-seats');
    if (!host) return;
    host.innerHTML = '';
    var si, seat, lbl, sk;
    for (si = 0; si < 6; si++) {
      seat = document.createElement('label');
      seat.className = 'wg-party-seat';
      seat.style.setProperty('--wg-seat-color', SEAT_HEX[si]);
      sk = SEAT_SKILLS[si] || '—';
      seat.innerHTML =
        '<input type="radio" name="wg-seat" value="' +
        si +
        '" ' +
        (si === 0 ? 'checked' : '') +
        '/>' +
        '<span class="wg-seat-dot" aria-hidden="true"></span>' +
        '<div class="wg-seat-body">' +
        '<div class="wg-seat-n">Seat ' +
        (si + 1) +
        ' · ' +
        sk +
        '</div>' +
        '<input type="text" class="wg-seat-name" maxlength="20" placeholder="Character" data-seat="' +
        si +
        '" aria-label="Seat ' +
        (si + 1) +
        ' name" />' +
        '</div>';
      host.appendChild(seat);
    }
    host.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'wg-seat') readActiveSeat();
    });
    readActiveSeat();
  }

  function rollDice(sides) {
    var n = (Math.random() * sides) | 0;
    var v = n + 1;
    var el = $('wg-dice-last');
    if (el) el.textContent = 'd' + sides + ' → ' + v;
    speckBurst(6);
    var act = $('gm-act');
    if (act) act.textContent += '\nd' + sides + '=' + v;
    return v;
  }

  function wireDice() {
    var tray = $('wg-dice-tray');
    if (!tray) return;
    tray.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.hasAttribute('data-d')) {
        rollDice(+t.getAttribute('data-d'));
      }
    });
  }

  function wireGridPointer() {
    var grid = $('wg-map-grid');
    if (!grid) return;
    var lastIx = -1;

    function ixFromEvent(e) {
      var t = e.target;
      if (!t || !t.getAttribute) return -1;
      var ix = t.getAttribute('data-i');
      if (ix == null) return -1;
      return +ix;
    }

    grid.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      painting = true;
      strokeBuffer = [];
      strokeLayerAtStart = currentLayer;
      strokeEraseAtStart = eraseMode;
      var ix = ixFromEvent(e);
      if (ix >= 0) {
        applyBrush(ix);
        lastIx = ix;
      }
      rippleAt(e.clientX, e.clientY);
    });
    grid.addEventListener('mousemove', function (e) {
      if (!painting) return;
      var ix = ixFromEvent(e);
      if (ix >= 0 && ix !== lastIx) {
        applyBrush(ix);
        lastIx = ix;
      }
    });
    window.addEventListener('mouseup', function () {
      if (painting) {
        finishStrokeShockwave();
        painting = false;
        lastIx = -1;
        broadcastMap();
        speckBurst(4);
      }
    });
  }

  function wireBc() {
    try {
      bc = new BroadcastChannel('ugrad-webgrid-board');
    } catch (e) {
      bc = null;
    }
    if (!bc) return;
    bc.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || d.type !== 'webgrid-map' || !d.payload) return;
      if (d.room !== getRoomId()) return;
      if (!bcFollow) return;
      loadSerialized(d.payload);
    });
    var ff = $('gm-bc-follow');
    var sd = $('gm-bc-send');
    if (ff)
      ff.addEventListener('change', function () {
        bcFollow = ff.checked;
      });
    if (sd)
      sd.addEventListener('change', function () {
        bcSend = sd.checked;
      });
    bcFollow = ff ? ff.checked : false;
    bcSend = sd ? sd.checked : true;
  }

  function wireCursor() {
    var st = $('wg-stage');
    if (!st) return;
    st.addEventListener(
      'mousemove',
      function (e) {
        var r = st.getBoundingClientRect();
        cursor.x = e.clientX - r.left;
        cursor.y = e.clientY - r.top;
      },
      { passive: true }
    );
    st.addEventListener('mouseleave', function () {
      var cv = $('wg-swarm');
      if (cv && cv.clientWidth > 2) {
        cursor.x = cv.clientWidth * 0.5;
        cursor.y = cv.clientHeight * 0.5;
      }
    });
  }

  function wireHud() {
    var ls = $('wg-layer');
    var pv = $('wg-paint');
    var er = $('wg-erase');
    var br = $('wg-brush');
    if (ls)
      ls.addEventListener('change', function () {
        currentLayer = (+ls.value | 0) % LAYERS;
        syncPaintFromLayerAndSeat();
      });
    if (pv)
      pv.addEventListener('change', function () {
        if (currentLayer !== MARK_LAYER) paintVal = Math.min(4, Math.max(1, +pv.value | 0));
      });
    if (er)
      er.addEventListener('change', function () {
        eraseMode = er.checked;
      });
    if (br)
      br.addEventListener('change', function () {
        brush = +br.value | 0;
      });
    var fx = $('wg-fx-on');
    if (fx)
      fx.addEventListener('change', function () {
        fxOn = fx.checked;
      });
    var sw = $('wg-swarm-on');
    if (sw)
      sw.addEventListener('change', function () {
        swarmOn = sw.checked;
      });
    var imp = $('wg-import-json');
    if (imp)
      imp.addEventListener('click', function () {
        try {
          var t = prompt('Paste map JSON (export `map` or raw serialize):');
          if (!t) return;
          var o = JSON.parse(t);
          if (o.map && o.map.layers) loadSerialized(o.map);
          else loadSerialized(o);
        } catch (err) {}
      });
    var ult = $('wg-super');
    if (ult)
      ult.addEventListener('click', function () {
        spawnSuperAtCursor();
      });
  }

  function buildGrid() {
    var g = $('wg-map-grid');
    if (!g) return;
    var L, i;
    for (L = 0; L < LAYERS; L++) layers[L] = new Uint8Array(N);
    g.innerHTML = '';
    cells = [];
    g.style.setProperty('--wg-cell', '8px');
    g.style.gridTemplateColumns = 'repeat(' + WG_COLS + ', var(--wg-cell))';
    var r0 = ((WG_ROWS - 3) / 2) | 0;
    var c0 = ((WG_COLS - 3) / 2) | 0;
    centerBase = r0 * WG_COLS + c0;
    tensorBlockBase = centerBase;
    lastTensorSlice9 = null;
    lastTensorIndices = [];
    var frag = document.createDocumentFragment();
    var idx, cell;
    for (idx = 0; idx < N; idx++) {
      cell = document.createElement('div');
      cell.className = 'wg-map-cell';
      cell.setAttribute('data-i', String(idx));
      cell.title = 'cell ' + (idx % WG_COLS) + ',' + ((idx / WG_COLS) | 0);
      frag.appendChild(cell);
      cells.push(cell);
    }
    g.appendChild(frag);
    renderAll();
    cacheCellCenters();
    var hr = $('wg-hud-readout');
    if (hr) hr.textContent = 'map · ' + WG_COLS + '×' + WG_ROWS + ' · ' + LAYERS + ' layers';
  }

  function init() {
    var ls = $('wg-layer');
    var pv = $('wg-paint');
    var br = $('wg-brush');
    var fx = $('wg-fx-on');
    if (ls) currentLayer = +ls.value | 0;
    if (pv) paintVal = Math.min(4, Math.max(1, +pv.value | 0));
    if (br) brush = Math.min(2, Math.max(0, +br.value | 0));
    if (fx) fxOn = fx.checked;
    var sw = $('wg-swarm-on');
    if (sw) swarmOn = sw.checked;
    buildGrid();
    buildParty();
    wireHud();
    wireCursor();
    wireGridPointer();
    wireBc();
    wireDice();
    resizeFx();
    wireTensorScrollFollow();
    window.addEventListener('resize', resizeFx);
    syncPaintFromLayerAndSeat();
    if (!reduced) raf = requestAnimationFrame(fxLoop);
  }

  global.WebgridTtrpg = {
    init: init,
    serialize: serialize,
    loadSerialized: loadSerialized,
    clearMap: clearMap,
    paintTensorSlice: paintTensorSlice,
    clearTensorClasses: clearTensorClasses,
    speckBurst: speckBurst,
    spawnSuperAtCursor: spawnSuperAtCursor,
    getRoomId: getRoomId,
    COLS: WG_COLS,
    ROWS: WG_ROWS
  };
})(typeof window !== 'undefined' ? window : globalThis);
