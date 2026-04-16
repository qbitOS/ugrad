/**
 * ugrad-hub-live.js — games hub hero: featured go-ugrad broadcast + tensor lane leaderboard + Hexcast stats.
 * Listens: BroadcastChannel('ugrad-go-board'), ('ugrad-tensor-lane'), ('hexcast-stream').
 */
(function () {
  'use strict';
  var ns = 'http://www.w3.org/2000/svg';
  var BC_GO = 'ugrad-go-board';
  var BC_LANE = 'ugrad-tensor-lane';
  var BC_HEX = 'hexcast-stream';

  function idx(x, y, N) {
    return y * N + x;
  }
  function neighbors(x, y, N) {
    var arr = [];
    if (x > 0) arr.push([x - 1, y]);
    if (x < N - 1) arr.push([x + 1, y]);
    if (y > 0) arr.push([x, y - 1]);
    if (y < N - 1) arr.push([x, y + 1]);
    return arr;
  }
  function collectGroup(boardArr, sx, sy, color, N) {
    if (boardArr[idx(sx, sy, N)] !== color) return [];
    var stack = [[sx, sy]];
    var visited = new Uint8Array(N * N);
    var group = [];
    while (stack.length) {
      var p = stack.pop();
      var vi = idx(p[0], p[1], N);
      if (visited[vi]) continue;
      if (boardArr[vi] !== color) continue;
      visited[vi] = 1;
      group.push(p);
      neighbors(p[0], p[1], N).forEach(function (nb) {
        var j = idx(nb[0], nb[1], N);
        if (!visited[j] && boardArr[j] === color) stack.push(nb);
      });
    }
    return group;
  }
  function libertyCount(boardArr, group, N) {
    var libSeen = new Uint8Array(N * N);
    var c = 0;
    var gi;
    for (gi = 0; gi < group.length; gi++) {
      var p = group[gi];
      neighbors(p[0], p[1], N).forEach(function (nb) {
        var k = idx(nb[0], nb[1], N);
        if (boardArr[k] === 0 && !libSeen[k]) {
          libSeen[k] = 1;
          c++;
        }
      });
    }
    return c;
  }
  function removeDeadOpponentGroups(b, x, y, col, N) {
    var opp = -col;
    var processed = new Set();
    neighbors(x, y, N).forEach(function (nb) {
      var nx = nb[0],
        ny = nb[1],
        i = idx(nx, ny, N);
      if (b[i] !== opp) return;
      var g = collectGroup(b, nx, ny, opp, N);
      var key = g
        .map(function (p) {
          return idx(p[0], p[1], N);
        })
        .sort(function (a, z) {
          return a - z;
        })
        .join(',');
      if (processed.has(key)) return;
      processed.add(key);
      if (libertyCount(b, g, N) === 0) {
        g.forEach(function (p) {
          b[idx(p[0], p[1], N)] = 0;
        });
      }
    });
  }
  function applyMoveWithCapture(boardArr, x, y, col, N) {
    if (boardArr[idx(x, y, N)] !== 0) return false;
    var b = new Int8Array(boardArr);
    b[idx(x, y, N)] = col;
    removeDeadOpponentGroups(b, x, y, col, N);
    var myGroup = collectGroup(b, x, y, col, N);
    if (libertyCount(b, myGroup, N) === 0) return false;
    boardArr.set(b);
    return true;
  }
  function buildBoardFromMoves(moves, n) {
    var N = n;
    var board = new Int8Array(N * N);
    var i, m;
    for (i = 0; i < moves.length; i++) {
      m = moves[i];
      if (!m || m.x == null) continue;
      if (!applyMoveWithCapture(board, m.x, m.y, m.c, N)) break;
    }
    return board;
  }
  function hoshiForN(n) {
    if (n === 19) return [[3, 3], [3, 15], [9, 9], [15, 3], [15, 15]];
    if (n === 13) return [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]];
    if (n === 9) return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
    return [];
  }
  function board9FromBoard(board, N) {
    var r = [];
    var ry, rx, y0, y1, x0, x1, y, x, sum, s, v;
    for (ry = 0; ry < 3; ry++) {
      y0 = Math.floor((ry * N) / 3);
      y1 = Math.floor(((ry + 1) * N) / 3);
      for (rx = 0; rx < 3; rx++) {
        x0 = Math.floor((rx * N) / 3);
        x1 = Math.floor(((rx + 1) * N) / 3);
        sum = 0;
        s = 0;
        for (y = y0; y < y1; y++) {
          for (x = x0; x < x1; x++) {
            v = board[idx(x, y, N)];
            if (v) {
              sum += v;
              s++;
            }
          }
        }
        var avg = s ? sum / s : 0;
        r.push(avg > 0.25 ? 1 : avg < -0.25 ? -1 : 0);
      }
    }
    return r;
  }
  function drawMiniSvg(board, N, isLight) {
    var gridStroke = isLight ? 'rgba(31,35,40,.2)' : 'rgba(250,250,252,.16)';
    var hoshiFill = isLight ? 'rgba(31,35,40,.45)' : 'rgba(250,250,252,.35)';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '-0.5 -0.5 ' + N + ' ' + N);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    var i, l, c, x, y, v;
    for (i = 0; i < N; i++) {
      l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', i);
      l.setAttribute('y1', 0);
      l.setAttribute('x2', i);
      l.setAttribute('y2', N - 1);
      l.setAttribute('stroke', gridStroke);
      l.setAttribute('stroke-width', 0.06);
      svg.appendChild(l);
      l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', 0);
      l.setAttribute('y1', i);
      l.setAttribute('x2', N - 1);
      l.setAttribute('y2', i);
      l.setAttribute('stroke', gridStroke);
      l.setAttribute('stroke-width', 0.06);
      svg.appendChild(l);
    }
    hoshiForN(N).forEach(function (p) {
      c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', p[0]);
      c.setAttribute('cy', p[1]);
      c.setAttribute('r', 0.22);
      c.setAttribute('fill', hoshiFill);
      svg.appendChild(c);
    });
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        v = board[idx(x, y, N)];
        if (!v) continue;
        c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', x);
        c.setAttribute('cy', y);
        c.setAttribute('r', v === 1 ? 0.38 : 0.36);
        if (v === 1) {
          c.setAttribute('fill', isLight ? 'rgba(20,24,32,.9)' : 'rgba(250,250,252,.85)');
        } else {
          c.setAttribute('fill', isLight ? 'rgba(255,255,255,.95)' : 'rgba(230,230,235,.22)');
          c.setAttribute('stroke', isLight ? 'rgba(20,24,32,.35)' : 'rgba(250,250,252,.5)');
          c.setAttribute('stroke-width', 0.08);
        }
        svg.appendChild(c);
      }
    }
    return svg;
  }
  function formatClock(sec) {
    if (sec == null || !isFinite(sec)) return '—';
    if (sec <= 0) return '0:00';
    var s = Math.floor(sec);
    var m = (s / 60) | 0;
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function fillMini9(el, b9) {
    if (!el) return;
    el.innerHTML = '';
    el.className = 'gu-mini9';
    var i, s, sp;
    for (i = 0; i < 9; i++) {
      s = document.createElement('span');
      sp = b9[i];
      s.textContent = sp === 1 ? '●' : sp === -1 ? '○' : '·';
      el.appendChild(s);
    }
  }
  function normVec9(v) {
    var i,
      dot = 0;
    for (i = 0; i < 9; i++) dot += v[i] * v[i];
    var inv = dot > 1e-9 ? 1 / Math.sqrt(dot) : 0;
    return v.map(function (x) {
      return x * inv;
    });
  }
  function cosineSim(a, b) {
    var i,
      d = 0;
    for (i = 0; i < 9; i++) d += a[i] * b[i];
    return d;
  }

  function logLine(el, s) {
    if (!el) return;
    el.textContent = (el.textContent + '\n' + s).slice(-5000);
    el.scrollTop = el.scrollHeight;
  }

  function init() {
    var mount = document.getElementById('gh-live-svg-mount');
    var miniEl = document.getElementById('gh-live-mini9');
    var metaEl = document.getElementById('gh-live-meta');
    var logEl = document.getElementById('gh-live-log');
    var lbEl = document.getElementById('gh-live-lb-body');
    var hexStats = document.getElementById('gh-live-hex-stats');
    var tokenInp = document.getElementById('gh-live-token');
    var tokenBtn = document.getElementById('gh-live-token-save');
    var sponsorFrame = document.getElementById('gh-live-sponsor-frame');

    if (!mount || typeof BroadcastChannel === 'undefined') return;

    var featured = null;
    var featuredKey = '';
    /** @type {Record<string, object>} */
    var sources = {};
    var laneStore = {};
    var refSlice = null;
    var hexFrames = 0;
    var lastHexT = 0;

    var TOKEN_KEY = 'ugrad-hub-hexcast-token';
    try {
      if (tokenInp && localStorage.getItem(TOKEN_KEY)) tokenInp.value = localStorage.getItem(TOKEN_KEY);
    } catch (e0) {}

    function renderFeatured() {
      var d = featured;
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (!d || !Array.isArray(d.moves)) {
        mount.innerHTML = '';
        var p = document.createElementNS(ns, 'svg');
        p.setAttribute('viewBox', '-0.5 -0.5 19 19');
        p.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        p.setAttribute('aria-label', 'Waiting for go-ugrad broadcast');
        var t = document.createElementNS(ns, 'text');
        t.setAttribute('x', 9);
        t.setAttribute('y', 9.5);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', 'rgba(250,250,252,.25)');
        t.setAttribute('font-size', '0.35');
        t.textContent = 'open go-ugrad + Broadcast';
        p.appendChild(t);
        mount.appendChild(p);
        fillMini9(miniEl, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
        if (metaEl) metaEl.innerHTML = '<strong>Featured</strong> · no live source yet';
        return;
      }
      var n = parseInt(d.n, 10) || 19;
      if ([9, 13, 19].indexOf(n) < 0) n = 19;
      var board = buildBoardFromMoves(d.moves, n);
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      mount.appendChild(drawMiniSvg(board, n, isLight));
      var b9 = board9FromBoard(board, n);
      fillMini9(miniEl, b9);
      refSlice = b9;
      var label = (d.label && String(d.label).trim()) || featuredKey.slice(0, 20);
      var turn = d.turn != null ? d.turn : 1;
      if (metaEl) {
        metaEl.innerHTML =
          '<strong>' +
          (label || 'source') +
          '</strong> · ' +
          n +
          '×' +
          n +
          ' · moves ' +
          d.moves.length +
          ' · ' +
          (turn === 1 ? '●' : '○') +
          '<br>B ' +
          formatClock(d.timeB) +
          ' · W ' +
          formatClock(d.timeW) +
          (d.clockPaused ? ' · paused' : '');
      }
    }

    function paintLeaderboard() {
      if (!lbEl) return;
      var keys = Object.keys(laneStore);
      if (!keys.length) {
        lbEl.innerHTML = '<tr><td colspan="4">No tensor-slice envs yet — Publish slice on go-ugrad or another μgrad tab.</td></tr>';
        return;
      }
      keys.sort(function (a, b) {
        return (laneStore[b].ts || 0) - (laneStore[a].ts || 0);
      });
      var ref = refSlice ? normVec9(refSlice.map(Number)) : null;
      lbEl.innerHTML = '';
      var i, k, row, td, sim, sl, nv;
      for (i = 0; i < Math.min(keys.length, 12); i++) {
        k = keys[i];
        sl = laneStore[k].slice;
        if (!sl || sl.length !== 9) continue;
        nv = normVec9(sl.map(Number));
        sim = ref ? cosineSim(ref, nv) : 0;
        row = document.createElement('tr');
        row.innerHTML =
          '<td>' +
          (k.length > 22 ? k.slice(0, 20) + '…' : k) +
          '</td><td>' +
          (laneStore[k].source ? String(laneStore[k].source).slice(0, 12) : '—') +
          '</td><td class="gh-live-sim">' +
          (ref ? sim.toFixed(3) : '—') +
          '</td><td class="gh-live-mini">' +
          sl
            .map(function (v) {
              var n = +v;
              return n > 0.25 ? '●' : n < -0.25 ? '○' : '·';
            })
            .join('') +
          '</td>';
        lbEl.appendChild(row);
      }
    }

    function pickFeatured() {
      var best = null;
      var bestTs = -1;
      var k;
      var d;
      var t;
      for (k in sources) {
        d = sources[k];
        t = d.ts || 0;
        if (t >= bestTs) {
          bestTs = t;
          best = d;
          featuredKey = k;
        }
      }
      featured = best;
    }

    function onGo(ev) {
      var d = ev.data;
      if (!d || d.type !== 'go-ugrad-state' || !d.source) return;
      if (!d.ts) d.ts = Date.now();
      sources[d.source] = d;
      pickFeatured();
      renderFeatured();
      paintLeaderboard();
      logLine(logEl, 'go · ' + d.source.slice(0, 12) + ' · moves ' + (d.moves && d.moves.length));
    }

    function onLane(ev) {
      var d = ev.data;
      if (!d || d.type !== 'tensor-slice' || !Array.isArray(d.slice) || d.slice.length !== 9) return;
      var env = d.env || 'unknown';
      laneStore[env] = { slice: d.slice.slice(), ts: d.ts || Date.now(), source: d.source || '' };
      logLine(logEl, 'lane · ' + env + ' · ' + (d.source || '').slice(0, 10));
      paintLeaderboard();
    }

    function onHex(ev) {
      var d = ev.data;
      if (!d || d.type !== 'hexframe') return;
      hexFrames++;
      lastHexT = performance.now() - (d.t || 0);
      if (hexStats) {
        hexStats.textContent = 'hexcast · frames ' + hexFrames + ' · Δt ~' + lastHexT.toFixed(0) + 'ms · res ' + (d.res || '?');
      }
    }

    try {
      var chGo = new BroadcastChannel(BC_GO);
      chGo.onmessage = onGo;
    } catch (e1) {}
    try {
      var chLane = new BroadcastChannel(BC_LANE);
      chLane.onmessage = onLane;
    } catch (e2) {}
    try {
      var chHex = new BroadcastChannel(BC_HEX);
      chHex.onmessage = onHex;
    } catch (e3) {}

    if (tokenBtn && tokenInp && sponsorFrame) {
      tokenBtn.addEventListener('click', function () {
        var t = (tokenInp.value || '').trim();
        try {
          localStorage.setItem(TOKEN_KEY, t);
        } catch (e4) {}
        var base = sponsorFrame.getAttribute('data-sponsor-base') || '';
        if (base && t) sponsorFrame.src = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(t);
        logLine(logEl, 'token · saved (embed if base URL set on iframe)');
      });
    }

    renderFeatured();
    paintLeaderboard();
    logLine(logEl, 'hub live deck · listening on ' + BC_GO + ' · ' + BC_LANE + ' · ' + BC_HEX);

    if (window.QuantumPrefixes && QuantumPrefixes.onThemeChange) {
      QuantumPrefixes.onThemeChange(function () {
        renderFeatured();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
