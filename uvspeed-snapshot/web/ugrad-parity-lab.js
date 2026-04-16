/**
 * ugrad-parity-lab.js — shared wiring for go/gomoku-parity μgrad lab shells (tensor, snapshots, BC, lane).
 * Requires: quantum-prefixes optional; ugrad-tensor-envs.js for tensor dropdown; ugrad-game-chrome.js for clock.
 */
(function (global) {
  'use strict';

  var TENSOR_LANE = 'ugrad-tensor-lane';
  var TRAIN_CH = 'ugrad-tensor-train';
  /** Remote tensor slices keyed by env · source (one page = one laneStore). */
  var laneStore = {};

  function $(id) {
    return document.getElementById(id);
  }

  function zeros9() {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  function getLaneSid(gameId) {
    var gid = gameId || 'lab';
    try {
      var k = 'ugrad-lane-sid-' + gid;
      var x = sessionStorage.getItem(k);
      if (x) return x;
      x = 'ug' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(k, x);
      return x;
    } catch (e) {
      return 'ug' + Date.now();
    }
  }

  function normSliceVal(v) {
    var n = +v;
    if (n > 0.25) return 1;
    if (n < -0.25) return -1;
    return 0;
  }

  function normalizeSlice9(s) {
    if (!s || s.length < 9) return null;
    var out = [];
    var i;
    for (i = 0; i < 9; i++) out.push(normSliceVal(s[i]));
    return out;
  }

  function fillMini9(el, b9, micro) {
    if (!el) return;
    var norm = normalizeSlice9(b9) || b9;
    el.innerHTML = '';
    el.className = 'gu-mini9' + (micro ? ' gu-mini9--micro' : '');
    var i, sp, s;
    for (i = 0; i < 9; i++) {
      s = document.createElement('span');
      sp = norm[i];
      s.textContent = sp === 1 ? '●' : sp === -1 ? '○' : '·';
      el.appendChild(s);
    }
  }

  function laneKeyForMessage(d) {
    var src = d.source != null ? String(d.source) : '?';
    if (src.length > 28) src = src.slice(0, 26) + '…';
    return (d.env || 'unknown') + ' · ' + src;
  }

  function paintLaneRail() {
    var rail = $('gu-bar-rail');
    if (!rail) return;
    rail.innerHTML = '';
    var keys = Object.keys(laneStore);
    if (!keys.length) return;
    keys.sort(function (a, b) {
      return (laneStore[b].ts || 0) - (laneStore[a].ts || 0);
    });
    var i, k, slot, lbl, mini;
    for (i = 0; i < Math.min(3, keys.length); i++) {
      k = keys[i];
      if (!laneStore[k] || !laneStore[k].slice) continue;
      slot = document.createElement('div');
      slot.className = 'gu-bar-rail-slot';
      lbl = document.createElement('span');
      lbl.className = 'gu-lane-env';
      lbl.textContent = k.length > 14 ? k.slice(0, 12) + '…' : k;
      lbl.title = k;
      mini = document.createElement('div');
      fillMini9(mini, laneStore[k].slice, true);
      slot.appendChild(lbl);
      slot.appendChild(mini);
      rail.appendChild(slot);
    }
  }

  function paintLaneSyncGrid() {
    var grid = $('gm-lane-grid');
    if (!grid) return;
    var keys = Object.keys(laneStore);
    if (!keys.length) {
      grid.innerHTML =
        '<p class="gu-lane-empty" id="gm-lane-empty">No remote slices yet.</p>';
      return;
    }
    grid.innerHTML = '';
    keys.sort(function (a, b) {
      return (laneStore[b].ts || 0) - (laneStore[a].ts || 0);
    });
    var i, k, card, hd, mini;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (!laneStore[k] || !laneStore[k].slice) continue;
      card = document.createElement('div');
      card.className = 'gu-lane-card';
      hd = document.createElement('div');
      hd.className = 'gu-lane-card-hd';
      hd.textContent = k + ' · ' + new Date(laneStore[k].ts || Date.now()).toLocaleTimeString();
      mini = document.createElement('div');
      fillMini9(mini, laneStore[k].slice, false);
      card.appendChild(hd);
      card.appendChild(mini);
      grid.appendChild(card);
    }
  }

  function renderMini9(elId, slice) {
    var el = $(elId);
    if (!el || !slice || slice.length < 9) return;
    var s = '';
    var t;
    for (t = 0; t < 9; t++) {
      var v = slice[t];
      var ch = v === 1 ? '●' : v === -1 ? '○' : '·';
      s += '<span>' + ch + '</span>';
    }
    el.innerHTML = s;
  }

  function populateTensorEnv(selectId, preferredId) {
    var sel = $(selectId || 'gm-tensor-env');
    if (!sel || !global.UgradTensorEnvs) return;
    var ids = UgradTensorEnvs.ids();
    sel.innerHTML = '';
    var i, m, opt;
    for (i = 0; i < ids.length; i++) {
      m = UgradTensorEnvs.meta(ids[i]);
      if (!m) continue;
      opt = document.createElement('option');
      opt.value = ids[i];
      opt.textContent = m.name;
      sel.appendChild(opt);
    }
    if (preferredId && ids.indexOf(preferredId) >= 0) sel.value = preferredId;
    else if (ids.indexOf('go-board') >= 0) sel.value = 'go-board';
  }

  function runTrain(readoutId) {
    var envEl = $('gm-tensor-env');
    var stepsEl = $('gm-steps');
    var env = envEl ? envEl.value : 'go-board';
    var steps = stepsEl ? parseInt(stepsEl.value, 10) || 80 : 80;
    try {
      var ch = new BroadcastChannel(TRAIN_CH);
      ch.postMessage({ type: 'train', env: env, steps: steps, source: 'ugrad-parity-lab' });
      ch.close();
    } catch (e) {}
    var ro = $(readoutId || 'gm-cmd-readout');
    if (ro) {
      ro.textContent =
        'train dispatched · env ' + env + ' · steps ' + steps + ' · ' + new Date().toISOString().slice(11, 19);
    }
  }

  function exportJson(getPayload, filenamePrefix) {
    var payload = typeof getPayload === 'function' ? getPayload() : getPayload;
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (filenamePrefix || 'ugrad-lab') + '-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function addSnapshot(stripId, slice9, title) {
    var strip = $(stripId || 'gm-snap-strip');
    if (!strip || !slice9) return;
    var card = document.createElement('div');
    card.className = 'gu-snap-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML =
      '<div class="gu-s-t">' +
      (title || 'snap') +
      '</div><div class="gu-mini9" style="margin-top:4px;display:grid;grid-template-columns:repeat(3,18px);gap:2px">' +
      slice9
        .map(function (v) {
          return (
            '<span style="display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;font-size:9px;border:1px solid var(--qp-border);border-radius:3px">' +
            (v === 1 ? '●' : v === -1 ? '○' : '·') +
            '</span>'
          );
        })
        .join('') +
      '</div>';
    strip.appendChild(card);
    strip.scrollLeft = strip.scrollWidth;
  }

  /**
   * @param {object} opts
   * @param {string} opts.storageKey
   * @param {function():object} [opts.getSavePayload]
   * @param {function(object)} [opts.onLoad]
   */
  function wireSavedGames(opts) {
    var storageKey = opts.storageKey;
    var sel = $('gm-history');
    var saveBtn = $('gm-save-game');
    if (!storageKey || !sel) return;

    function loadList() {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch (e) {
        return [];
      }
    }
    function saveList(arr) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(arr));
      } catch (e2) {}
    }
    function refresh() {
      var games = loadList();
      sel.innerHTML = '<option value="">-- pick recorded game --</option>';
      var i, g, opt;
      for (i = 0; i < games.length; i++) {
        g = games[i];
        opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = (g.name || 'game') + ' · ' + (g.ts || '') + ' · ' + (g.note || '');
        sel.appendChild(opt);
      }
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var games = loadList();
        var name = ($('gm-bc-label') && $('gm-bc-label').value) || 'recorded';
        var entry = { name: name, ts: new Date().toISOString().slice(0, 19), note: '' };
        if (opts.getSavePayload) Object.assign(entry, opts.getSavePayload());
        games.push(entry);
        if (games.length > 40) games.shift();
        saveList(games);
        refresh();
        var log = $('gm-act');
        if (log) log.textContent += '\n— saved · ' + games.length + ' in list';
      });
    }
    sel.addEventListener('change', function () {
      var ix = this.value;
      if (ix === '' || !opts.onLoad) return;
      var games = loadList();
      opts.onLoad(games[parseInt(ix, 10)]);
    });
    refresh();
  }

  function wireLane(opts) {
    opts = opts || {};
    var gameId = opts.gameId || 'lab';
    var laneSid = getLaneSid(gameId);
    var recvCb = $('gm-lane-recv');
    var grid = $('gm-lane-grid');
    var laneCh = null;
    try {
      laneCh = new BroadcastChannel(TENSOR_LANE);
    } catch (e) {}
    if (!laneCh || !grid) return;
    laneCh.addEventListener('message', function (e) {
      var d = e.data;
      if (!recvCb || !recvCb.checked) return;
      if (!d || d.type !== 'tensor-slice' || !Array.isArray(d.slice) || d.slice.length !== 9) return;
      if (d.source && d.source === laneSid) return;
      var k = laneKeyForMessage(d);
      laneStore[k] = { slice: d.slice.slice(), ts: d.ts || Date.now(), source: d.source || '' };
      paintLaneRail();
      paintLaneSyncGrid();
    });
  }

  function publishLaneSlice(getSlice9, envName, gameId) {
    if (!$('gm-lane-send') || !$('gm-lane-send').checked) return;
    var slice = typeof getSlice9 === 'function' ? getSlice9() : zeros9();
    var gid = gameId || (document.body && document.body.getAttribute('data-ugrad-game')) || 'lab';
    var sid = getLaneSid(gid);
    try {
      var ch = new BroadcastChannel(TENSOR_LANE);
      ch.postMessage({
        type: 'tensor-slice',
        v: 1,
        env: envName || 'lab',
        slice: slice.map(function (v) { return v; }),
        source: sid,
        ts: Date.now()
      });
      ch.close();
    } catch (e) {}
  }

  /**
   * Full bootstrap for static lab pages with standard gm-* ids.
   * @param {object} opts
   * @param {string} opts.gameId
   * @param {string} opts.version
   * @param {string} opts.storageKey
   * @param {string} [opts.bcChannel]
   * @param {function():number[]} [opts.getSlice9]
   * @param {function():object} [opts.getExportPayload]
   * @param {string} [opts.tensorDefault] preferred env id
   * @param {boolean} [opts.hideBoardSize]
   * @param {boolean} [opts.hideAiMove]
   */
  function init(opts) {
    opts = opts || {};
    populateTensorEnv('gm-tensor-env', opts.tensorDefault || 'gomoku-density');

    var trainBtn = $('gm-train');
    if (trainBtn) trainBtn.addEventListener('click', function () { runTrain('gm-cmd-readout'); });

    var ex = $('gm-export');
    if (ex && opts.getExportPayload) {
      ex.addEventListener('click', function () {
        exportJson(opts.getExportPayload, opts.gameId || 'ugrad-lab');
      });
    }

    var snapBtn = $('gm-snap');
    if (snapBtn && opts.getSlice9) {
      var snapN = 0;
      snapBtn.addEventListener('click', function () {
        snapN++;
        var sl = opts.getSlice9();
        addSnapshot('gm-snap-strip', sl, 'snap #' + snapN + ' · ' + new Date().toISOString().slice(11, 19));
        var ro = $('gm-cmd-readout');
        if (ro) ro.textContent = 'snapshot · ℝ⁹ ' + sl.join(',');
      });
    }

    var laneSend = $('gm-lane-send');
    if (laneSend && opts.getSlice9) {
      laneSend.addEventListener('change', function () {
        if (this.checked) publishLaneSlice(opts.getSlice9, opts.gameId || 'lab', opts.gameId);
      });
    }

    if (opts.storageKey) {
      wireSavedGames({
        storageKey: opts.storageKey,
        getSavePayload: opts.getSavePayload,
        onLoad: opts.onLoad
      });
    }

    wireLane({ getSlice9: opts.getSlice9, gameId: opts.gameId || 'lab' });

    var fs = $('gm-fs');
    if (fs) {
      fs.addEventListener('click', function () {
        if (global.UgradGameChrome && UgradGameChrome.toggleFullscreen) UgradGameChrome.toggleFullscreen();
      });
    }

    if (opts.hideBoardSize === true || opts.hideBoardSize === 'true') {
      var bs = $('gm-board-size');
      if (bs && bs.closest('label')) bs.closest('label').style.display = 'none';
      var bw = $('gm-board-size-wrap');
      if (bw) bw.style.display = 'none';
    }
    if (opts.hideAiMove === true || opts.hideAiMove === 'true') {
      var ai = $('gm-ai-move');
      if (ai) ai.style.display = 'none';
    }

    var meta = $('gm-side-meta');
    if (meta && opts.version) {
      meta.textContent =
        (opts.gameId || 'lab') +
        '-ugrad v' +
        opts.version +
        ' · chess clock · BC · tensor envs · 3×3 slice';
    }

    global.UgradParityLab._publishLaneSlice = function () {
      publishLaneSlice(opts.getSlice9 || zeros9, opts.gameId || 'lab', opts.gameId);
    };

    return {
      renderMini9: renderMini9,
      zeros9: zeros9,
      publishLaneSlice: global.UgradParityLab._publishLaneSlice,
      runTrain: runTrain
    };
  }

  global.UgradParityLab = {
    VERSION: '0.2.0',
    zeros9: zeros9,
    renderMini9: renderMini9,
    fillMini9: fillMini9,
    getLaneSid: getLaneSid,
    populateTensorEnv: populateTensorEnv,
    runTrain: runTrain,
    exportJson: exportJson,
    addSnapshot: addSnapshot,
    wireSavedGames: wireSavedGames,
    wireLane: wireLane,
    publishLaneSlice: publishLaneSlice,
    init: init
  };
})(typeof window !== 'undefined' ? window : globalThis);
