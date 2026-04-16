/**
 * ugrad-tensor-envs.js — 9-cell tensor training environments for μgrad games + CLI/command station.
 * All envs output X[i] ∈ ℝ⁹ (ternary {-1,0,1} patterns) and Y[i] ∈ {0,1} for the slice MLP head.
 */
(function () {
  'use strict';

  function randTernary() {
    return Math.random() < 0.3 ? 1 : Math.random() < 0.5 ? -1 : 0;
  }

  function randVec() {
    var b = [];
    var v;
    for (v = 0; v < 9; v++) b.push(randTernary());
    return b;
  }

  /** Same heuristic as go-ugrad heuristicLabel(b9). */
  function labelGoBoard(b9) {
    var b = b9.filter(function (v) {
      return v === 1;
    }).length;
    var w = b9.filter(function (v) {
      return v === -1;
    }).length;
    var c = b9[4];
    var corners = [b9[0], b9[2], b9[6], b9[8]].filter(function (v) {
      return v === 1;
    }).length;
    var lib = b9.filter(function (v) {
      return v === 0;
    }).length;
    return b > w && lib > 3 && (c === 1 || corners >= 2) ? 1 : 0;
  }

  function labelXor3(b9) {
    var a = b9[0] > 0 ? 1 : 0;
    var b = b9[1] > 0 ? 1 : 0;
    var c = b9[2] > 0 ? 1 : 0;
    return a ^ b ^ c ? 1 : 0;
  }

  var ENVS = {
    'go-board': {
      name: 'Go (slice)',
      game: 'go',
      desc: 'Random ternary 3×3 · same h() as go-ugrad heuristic.',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        for (i = 0; i < n; i++) {
          b = randVec();
          X.push(b.map(Number));
          Y.push(labelGoBoard(b));
        }
        return { X: X, Y: Y };
      }
    },
    'chess-density': {
      name: 'Chess (density)',
      game: 'chess',
      desc: 'Occupation pattern; label = black-majority control.',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        var j;
        var bk;
        var wt;
        for (i = 0; i < n; i++) {
          b = [];
          for (j = 0; j < 9; j++) b.push(Math.random() < 0.42 ? 1 : Math.random() < 0.58 ? -1 : 0);
          bk = b.filter(function (v) {
            return v === 1;
          }).length;
          wt = b.filter(function (v) {
            return v === -1;
          }).length;
          X.push(b);
          Y.push(bk > wt ? 1 : 0);
        }
        return { X: X, Y: Y };
      }
    },
    'checkers-force': {
      name: 'Checkers (force)',
      game: 'checkers',
      desc: 'Edge vs center pressure on dark-square metaphor.',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        var edge;
        var mid;
        for (i = 0; i < n; i++) {
          b = randVec();
          edge = b[0] + b[2] + b[6] + b[8];
          mid = b[4];
          X.push(b);
          Y.push(edge + mid > 0 ? 1 : 0);
        }
        return { X: X, Y: Y };
      }
    },
    'pong-buckets': {
      name: 'Pong (regions)',
      game: 'pong',
      desc: 'Ball/paddle region overlap in 3×3 buckets.',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        var j;
        var bx;
        var by;
        for (i = 0; i < n; i++) {
          b = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          bx = (Math.random() * 9) | 0;
          by = (Math.random() * 9) | 0;
          b[bx] = 1;
          b[by] = b[by] === 1 ? 1 : -1;
          for (j = 0; j < 9; j++) {
            if (!b[j]) b[j] = Math.random() < 0.15 ? (Math.random() < 0.5 ? 1 : -1) : 0;
          }
          X.push(b);
          Y.push(Math.abs(bx - by) <= 2 ? 1 : 0);
        }
        return { X: X, Y: Y };
      }
    },
    'xor-lane': {
      name: 'XOR lane',
      game: 'micro',
      desc: 'Bits in first 3 cells; label = XOR (μPad / R0 parity).',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        var j;
        for (i = 0; i < n; i++) {
          b = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (j = 0; j < 3; j++) b[j] = Math.random() < 0.5 ? 1 : -1;
          X.push(b);
          Y.push(labelXor3(b));
        }
        return { X: X, Y: Y };
      }
    },
    'gomoku-density': {
      name: 'Gomoku (slice)',
      game: 'gomoku',
      desc: '3×3 ternary patterns; label = center + diagonal threat heuristic (synthetic lab batch).',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        var j;
        var c;
        var d1;
        var d2;
        for (i = 0; i < n; i++) {
          b = randVec();
          c = b[4];
          d1 = b[0] + b[4] + b[8];
          d2 = b[2] + b[4] + b[6];
          X.push(b);
          Y.push(c > 0 && (d1 > 0 || d2 > 0) ? 1 : 0);
        }
        return { X: X, Y: Y };
      }
    },
    'parity-count': {
      name: 'Parity count',
      game: 'micro',
      desc: 'Odd count of “on” cells in 3×3.',
      synthBatch: function (n) {
        var X = [];
        var Y = [];
        var i;
        var b;
        var j;
        var s;
        for (i = 0; i < n; i++) {
          b = randVec();
          s = 0;
          for (j = 0; j < 9; j++) s += b[j] > 0 ? 1 : 0;
          X.push(b);
          Y.push(s % 2 === 1 ? 1 : 0);
        }
        return { X: X, Y: Y };
      }
    }
  };

  window.UgradTensorEnvs = {
    VERSION: '0.1.0',
    ids: function () {
      return Object.keys(ENVS);
    },
    get: function (id) {
      return ENVS[id] || null;
    },
    meta: function (id) {
      var e = ENVS[id];
      if (!e) return null;
      return { id: id, name: e.name, game: e.game, desc: e.desc };
    },
    listMeta: function () {
      var k = Object.keys(ENVS);
      var out = [];
      var i;
      for (i = 0; i < k.length; i++) out.push(window.UgradTensorEnvs.meta(k[i]));
      return out;
    },
    synthBatch: function (id, n) {
      var e = ENVS[id];
      if (!e || typeof e.synthBatch !== 'function') return { X: [], Y: [] };
      return e.synthBatch(n);
    },
    defaultId: 'go-board'
  };
})();
