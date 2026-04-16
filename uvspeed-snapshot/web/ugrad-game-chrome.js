/**
 * ugrad-game-chrome.js — shared chess-style clock + fullscreen for gu-board-wrap (μgrad arena shells).
 * Requires: id="gu-board-wrap" on panel, optional #ugc-color (1 / -1), clock ids ugc-clock-*.
 */
(function () {
  'use strict';
  var timeB = 300;
  var timeW = 300;
  var clockPaused = false;
  var clockArmed = false;
  var lastTick = Date.now();
  var STORAGE_PREFIX = 'ugrad-chrome-';
  var gameKey = '';

  function storeKey() {
    return STORAGE_PREFIX + gameId();
  }

  function gameId() {
    try {
      var b = document.body && document.body.getAttribute('data-ugrad-game');
      return b ? String(b).trim() : 'arena';
    } catch (e) {
      return 'arena';
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function formatClock(sec) {
    if (sec <= 0 || !isFinite(sec)) return '0:00';
    var s = Math.floor(sec);
    var m = (s / 60) | 0;
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function applyMainMinutes() {
    var inp = $('ugc-clock-min');
    var m = inp ? parseInt(inp.value, 10) || 5 : 5;
    if (m < 1) m = 1;
    if (m > 120) m = 120;
    return m * 60;
  }

  function resetClocksFromUI() {
    var sec = applyMainMinutes();
    timeB = sec;
    timeW = sec;
    clockPaused = false;
    clockArmed = false;
    lastTick = Date.now();
    var pp = $('ugc-clock-pause');
    if (pp) pp.textContent = 'Pause';
    updateClockDisplay();
  }

  function updateClockDisplay() {
    var eb = $('ugc-clock-b');
    var ew = $('ugc-clock-w');
    var col = $('ugc-color') ? parseInt($('ugc-color').value, 10) || 1 : 1;
    var on = $('ugc-clock-on') && $('ugc-clock-on').checked;
    if (eb) {
      eb.textContent = 'B · ' + formatClock(timeB);
      eb.classList.toggle('gu-clock-hot', !!(on && !clockPaused && clockArmed && col === 1));
    }
    if (ew) {
      ew.textContent = 'W · ' + formatClock(timeW);
      ew.classList.toggle('gu-clock-hot', !!(on && !clockPaused && clockArmed && col === -1));
    }
  }

  function clockTick() {
    var on = $('ugc-clock-on') && $('ugc-clock-on').checked;
    if (!on || clockPaused || !clockArmed) {
      lastTick = Date.now();
      updateClockDisplay();
      return;
    }
    var now = Date.now();
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    var col = $('ugc-color') ? parseInt($('ugc-color').value, 10) || 1 : 1;
    if (col === 1) timeB -= dt;
    else timeW -= dt;
    if (timeB <= 0 || timeW <= 0) {
      clockPaused = true;
      var pp = $('ugc-clock-pause');
      if (pp) pp.textContent = 'Resume';
    }
    updateClockDisplay();
  }

  function armClockOnFirstInteraction() {
    if (!clockArmed) {
      clockArmed = true;
      lastTick = Date.now();
    }
  }

  /** Fullscreen board only, or #ugc-fs-target (e.g. .gu-main) to include activity log + side column. */
  function fullscreenTarget() {
    return $('ugc-fs-target') || $('gu-board-wrap');
  }

  function toggleBoardFullscreen() {
    var el = fullscreenTarget();
    if (!el) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) ex.call(document);
    } else {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
      else if (typeof el.webkitRequestFullScreen === 'function') el.webkitRequestFullScreen();
    }
  }

  function syncFsButtons() {
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    var bi = $('ugc-fs-inline');
    if (bi) {
      bi.textContent = on ? '✕' : '⛶';
      var wide = !!$('ugc-fs-target');
      bi.title = on ? 'Exit fullscreen' : wide ? 'Fullscreen board + activity log' : 'Fullscreen board';
    }
  }

  function persist() {
    try {
      var k = storeKey();
      if ($('ugc-clock-on')) localStorage.setItem(k + '-on', $('ugc-clock-on').checked ? '1' : '0');
      if ($('ugc-clock-min')) localStorage.setItem(k + '-min', $('ugc-clock-min').value);
    } catch (e) {}
  }

  function loadPersist() {
    try {
      var k = storeKey();
      if (localStorage.getItem(k + '-on') === '0' && $('ugc-clock-on')) $('ugc-clock-on').checked = false;
      var m = localStorage.getItem(k + '-min');
      if (m && $('ugc-clock-min')) $('ugc-clock-min').value = m;
    } catch (e2) {}
  }

  function init() {
    if (!$('gu-board-wrap') || !$('ugc-clock-b')) return;
    gameKey = gameId();
    loadPersist();
    resetClocksFromUI();

    var pauseBtn = $('ugc-clock-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        clockPaused = !clockPaused;
        pauseBtn.textContent = clockPaused ? 'Resume' : 'Pause';
        lastTick = Date.now();
        updateClockDisplay();
      });
    }
    var resetBtn = $('ugc-clock-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetClocksFromUI);

    var minInp = $('ugc-clock-min');
    if (minInp) minInp.addEventListener('change', resetClocksFromUI);

    var cOn = $('ugc-clock-on');
    if (cOn) {
      cOn.addEventListener('change', function () {
        lastTick = Date.now();
        updateClockDisplay();
        persist();
      });
    }
    if (minInp) minInp.addEventListener('change', persist);

    var uc = $('ugc-color');
    if (uc) {
      uc.addEventListener('change', function () {
        lastTick = Date.now();
        updateClockDisplay();
      });
    }

    var fsInline = $('ugc-fs-inline');
    if (fsInline) fsInline.addEventListener('click', toggleBoardFullscreen);
    document.addEventListener('fullscreenchange', function () {
      syncFsButtons();
    });
    document.addEventListener('webkitfullscreenchange', function () {
      syncFsButtons();
    });
    syncFsButtons();

    setInterval(clockTick, 100);

    var om = $('ugc-open-monitor');
    if (om) om.addEventListener('click', function () { window.location.href = 'go-ugrad-monitor.html'; });
    var hm = $('ugc-open-hub-monitor');
    if (hm) hm.addEventListener('click', function () { window.location.href = 'hub-ugrad-monitor.html'; });

    window.UgradGameChrome = window.UgradGameChrome || {};
    window.UgradGameChrome.armClock = armClockOnFirstInteraction;
    window.UgradGameChrome.toggleFullscreen = toggleBoardFullscreen;
    window.UgradGameChrome.fullscreenTarget = fullscreenTarget;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
