/**
 * Bridge hexcast sportsfield telemetry → μgrad R0 training buffer (localStorage + live).
 * Ingests sportsfield-telemetry / sportsfield-ball on BroadcastChannel('hexcast-stream').
 * Features: ball position (nx,ny), speed norm, flock proxy (player count). Label = "pressure" heuristic.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  var LM = 105;
  var WM = 68;
  var MAX_SPEED_MS = 36;
  var RING_KEY = 'ugrad-sf-telemetry-ring-v1';
  var ring = [];
  var hexCh = null;

  function loadRing() {
    try {
      var s = localStorage.getItem(RING_KEY);
      if (s) {
        var p = JSON.parse(s);
        ring = Array.isArray(p) ? p : [];
      }
    } catch (e) {
      ring = [];
    }
  }

  function saveRing() {
    try {
      while (ring.length > 4096) ring.shift();
      localStorage.setItem(RING_KEY, JSON.stringify(ring));
    } catch (e) {}
  }

  function pushFromPayload(d) {
    var mx =
      d.meters && typeof d.meters.x === 'number'
        ? d.meters.x
        : typeof d.x === 'number'
          ? d.x
          : null;
    var my =
      d.meters && typeof d.meters.y === 'number'
        ? d.meters.y
        : typeof d.y === 'number'
          ? d.y
          : null;
    if (typeof mx !== 'number' || typeof my !== 'number') return;
    var vx = (d.velocityMs && d.velocityMs.vx) || d.vx || 0;
    var vy = (d.velocityMs && d.velocityMs.vy) || d.vy || 0;
    var sp = Math.sqrt(vx * vx + vy * vy);
    var nx = Math.max(0, Math.min(1, mx / LM));
    var ny = Math.max(0, Math.min(1, my / WM));
    var vn = Math.min(1, sp / MAX_SPEED_MS);
    var nPl = 0;
    if (Array.isArray(d.players)) nPl = d.players.length;
    else if (d.playersCount != null) nPl = +d.playersCount;
    var fl = Math.min(1, nPl / 24);
    ring.push({ nx: nx, ny: ny, vn: vn, fl: fl, ts: d.ts || Date.now() });
    saveRing();
  }

  function onHex(ev) {
    var d = ev.data;
    if (!d || (d.type !== 'sportsfield-telemetry' && d.type !== 'sportsfield-ball')) return;
    pushFromPayload(d);
  }

  function labelFor(x) {
    var edge = x.nx < 0.28 || x.nx > 0.72 || x.ny < 0.18 || x.ny > 0.82;
    var hot = x.vn > 0.38;
    var crowd = x.fl > 0.45;
    return edge || hot || crowd ? 1 : 0;
  }

  function synthPad(targetN) {
    var X = [];
    var Y = [];
    var i;
    var u;
    for (i = 0; i < targetN; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = Math.random() * 0.48;
      var nx = 0.5 + rad * Math.cos(ang);
      var ny = 0.5 + rad * Math.sin(ang);
      u = { nx: nx, ny: ny, vn: Math.random(), fl: Math.random() };
      X.push([u.nx, u.ny, u.vn, u.fl]);
      Y.push(labelFor(u));
    }
    return { X: X, Y: Y };
  }

  /**
   * @param {number} n  target sample count
   * @returns {{ X: number[][], Y: number[], dim: number, name: string, n: number, difficulty: number }}
   */
  function getDataset(n) {
    loadRing();
    var want = Math.max(80, n | 0);
    var slice = ring.length ? ring.slice(-Math.min(want, ring.length)) : [];
    var X = [];
    var Y = [];
    var i;
    var u;
    for (i = 0; i < slice.length; i++) {
      u = slice[i];
      X.push([u.nx, u.ny, u.vn, u.fl]);
      Y.push(labelFor(u));
    }
    if (X.length < want) {
      var pad = synthPad(want - X.length);
      X = X.concat(pad.X);
      Y = Y.concat(pad.Y);
    }
    return {
      X: X,
      Y: Y,
      dim: 4,
      name: 'sf-live',
      n: X.length,
      difficulty: 5
    };
  }

  loadRing();
  try {
    hexCh = new BroadcastChannel('hexcast-stream');
    hexCh.addEventListener('message', onHex);
  } catch (e) {}

  global.UgradSportsfieldBridge = {
    getDataset: getDataset,
    ringLength: function () {
      loadRing();
      return ring.length;
    },
    clearRing: function () {
      ring = [];
      try {
        localStorage.removeItem(RING_KEY);
      } catch (e) {}
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
