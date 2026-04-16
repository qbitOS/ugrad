/**
 * ugrad-game-presence.js — localStorage heartbeats for μgrad game pages + games hub stats.
 * Same-origin only; multi-tab counts. Global online = Workers roadmap (see hub copy).
 */
(function () {
  'use strict';
  var PREFIX = 'ugrad-presence-v1:';
  var TTL_MS = 18000;
  var BEAT_MS = 4000;
  var cid =
    (function () {
      try {
        var s = sessionStorage.getItem('ugrad-presence-cid');
        if (s) return s;
        s = '';
        var i;
        for (i = 0; i < 12; i++) s += '0123456789abcdef'.charAt((Math.random() * 16) | 0);
        sessionStorage.setItem('ugrad-presence-cid', s);
        return s;
      } catch (e) {
        return 'x' + String(Date.now());
      }
    })();

  function gameId() {
    try {
      var b = document.body;
      if (b && b.getAttribute('data-ugrad-game')) return b.getAttribute('data-ugrad-game').trim();
    } catch (e) {}
    return '';
  }

  function sweepStale() {
    try {
      var now = Date.now();
      var keys = Object.keys(localStorage);
      var i, k, raw, o;
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (k.indexOf(PREFIX) !== 0) continue;
        raw = localStorage.getItem(k);
        if (!raw) {
          localStorage.removeItem(k);
          continue;
        }
        try {
          o = JSON.parse(raw);
          if (!o || typeof o.t !== 'number' || now - o.t > TTL_MS) localStorage.removeItem(k);
        } catch (e) {
          localStorage.removeItem(k);
        }
      }
    } catch (e2) {}
  }

  function beat(game) {
    try {
      var key = PREFIX + game + ':' + cid;
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), c: cid }));
    } catch (e) {}
  }

  var g = gameId();
  try {
    if (!g && document.body && document.body.getAttribute('data-ugrad-presence-hub') === '1') g = 'hub';
  } catch (e0) {}
  if (g) {
    sweepStale();
    beat(g);
    setInterval(function () {
      sweepStale();
      beat(g);
    }, BEAT_MS);
  }

  /** Hub: count active sessions per game id */
  window.UgradGamePresence = {
    PREFIX: PREFIX,
    TTL_MS: TTL_MS,
    sweepStale: sweepStale,
    countGame: function (game) {
      sweepStale();
      var n = 0;
      try {
        var keys = Object.keys(localStorage);
        var i, k, pre;
        pre = PREFIX + game + ':';
        for (i = 0; i < keys.length; i++) {
          k = keys[i];
          if (k.indexOf(pre) === 0) n++;
        }
      } catch (e) {}
      return n;
    },
    countAllGameSessions: function () {
      sweepStale();
      var map = {};
      try {
        var keys = Object.keys(localStorage);
        var i, k, parts, gid;
        for (i = 0; i < keys.length; i++) {
          k = keys[i];
          if (k.indexOf(PREFIX) !== 0) continue;
          parts = k.slice(PREFIX.length).split(':');
          gid = parts[0];
          if (!gid || gid === 'hub') continue;
          map[gid] = (map[gid] || 0) + 1;
        }
      } catch (e) {}
      return map;
    }
  };
})();
