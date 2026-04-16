/**
 * ugrad-go-ascii.js — replay go-ugrad moves → Int8Array board → ASCII (HexTerm / logs).
 * Mirrors go-ugrad.html capture rules (minimal; ko not enforced in lab).
 */
(function (global) {
  'use strict';

  function idx(n, x, y) {
    return y * n + x;
  }

  function neighbors(n, x, y) {
    var o = [];
    if (x > 0) o.push([x - 1, y]);
    if (x < n - 1) o.push([x + 1, y]);
    if (y > 0) o.push([x, y - 1]);
    if (y < n - 1) o.push([x, y + 1]);
    return o;
  }

  function collectGroup(b, n, x, y, col) {
    var stack = [[x, y]];
    var seen = new Set();
    var out = [];
    var key = function (px, py) {
      return py * n + px;
    };
    while (stack.length) {
      var p = stack.pop();
      var px = p[0],
        py = p[1];
        var k = key(px, py);
      if (seen.has(k)) continue;
      seen.add(k);
      if (b[idx(n, px, py)] !== col) continue;
      out.push([px, py]);
      neighbors(n, px, py).forEach(function (nb) {
        if (b[idx(n, nb[0], nb[1])] === col) stack.push(nb);
      });
    }
    return out;
  }

  function libertyCount(b, n, g) {
    var lib = new Set();
    var i, p, nb;
    for (i = 0; i < g.length; i++) {
      p = g[i];
      neighbors(n, p[0], p[1]).forEach(function (q) {
        if (b[idx(n, q[0], q[1])] === 0) lib.add(q[0] + ',' + q[1]);
      });
    }
    return lib.size;
  }

  function removeDeadOpponentGroups(boardArr, n, x, y, col) {
    var opp = -col;
    var removed = 0;
    var processed = new Set();
    neighbors(n, x, y).forEach(function (nb) {
      var nx = nb[0],
        ny = nb[1];
      var i = idx(n, nx, ny);
      if (boardArr[i] !== opp) return;
      var g = collectGroup(boardArr, n, nx, ny, opp);
      var gkey = g
        .map(function (p) {
          return idx(n, p[0], p[1]);
        })
        .sort(function (a, z) {
          return a - z;
        })
        .join(',');
      if (processed.has(gkey)) return;
      processed.add(gkey);
      if (libertyCount(boardArr, n, g) === 0) {
        g.forEach(function (p) {
          boardArr[idx(n, p[0], p[1])] = 0;
          removed++;
        });
      }
    });
    return removed;
  }

  function applyMoveWithCapture(boardArr, n, x, y, col) {
    if (boardArr[idx(n, x, y)] !== 0) return { ok: false, reason: 'occupied' };
    var b = new Int8Array(boardArr);
    b[idx(n, x, y)] = col;
    removeDeadOpponentGroups(b, n, x, y, col);
    var myGroup = collectGroup(b, n, x, y, col);
    if (libertyCount(b, n, myGroup) === 0) {
      return { ok: false, reason: 'suicide' };
    }
    boardArr.set(b);
    return { ok: true };
  }

  function replayToBoard(n, movesList) {
    var board = new Int8Array(n * n);
    var i,
      m,
      r;
    for (i = 0; i < movesList.length; i++) {
      m = movesList[i];
      if (!m || m.x == null) continue;
      r = applyMoveWithCapture(board, n, m.x, m.y, m.c);
      if (!r.ok) break;
    }
    return board;
  }

  /** @param {object} d go-ugrad-state message */
  function render(d) {
    if (!d || d.type !== 'go-ugrad-state' || !Array.isArray(d.moves)) return '';
    var n = parseInt(d.n, 10) || 19;
    if ([9, 13, 19].indexOf(n) < 0) n = 19;
    var board = replayToBoard(n, d.moves);
    var lines = [];
    var header =
      '   ' +
      Array.from({ length: n }, function (_, i) {
        return String.fromCharCode(97 + i);
      }).join('');
    lines.push(header);
    var y, x, row, s;
    for (y = 0; y < n; y++) {
      row = (y < 9 ? ' ' : '') + (y + 1) + ' ';
      for (x = 0; x < n; x++) {
        s = board[idx(n, x, y)];
        row += s === 1 ? '#' : s === -1 ? 'O' : '+';
      }
      lines.push(row);
    }
    var meta =
      'source=' +
      (d.source || '?') +
      ' moves=' +
      d.moves.length +
      ' clock B/W=' +
      (typeof d.timeB === 'number' ? Math.floor(d.timeB) : '?') +
      '/' +
      (typeof d.timeW === 'number' ? Math.floor(d.timeW) : '?');
    return meta + '\n' + lines.join('\n');
  }

  global.UgradGoAscii = { render: render, replayToBoard: replayToBoard };
})(typeof window !== 'undefined' ? window : globalThis);
