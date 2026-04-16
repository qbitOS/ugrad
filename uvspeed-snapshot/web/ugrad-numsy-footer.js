/**
 * ugrad-numsy-footer.js — μgrad game engine slot: placeholder + optional Brother Numsy iframe preview.
 * Toggle: localStorage ugrad-engine-mode = 'placeholder' | 'iframe'
 */
(function () {
  'use strict';
  var STORAGE_KEY = 'ugrad-engine-mode';

  function gameLabel() {
    try {
      var b = document.body;
      if (b && b.getAttribute('data-ugrad-game')) return b.getAttribute('data-ugrad-game');
      var m = document.querySelector('meta[name="ugrad-game"]');
      if (m && m.getAttribute('content')) return m.getAttribute('content').trim();
    } catch (e) {}
    return '';
  }

  function getMode() {
    try {
      var m = localStorage.getItem(STORAGE_KEY);
      if (m === 'iframe' || m === 'placeholder') return m;
    } catch (e) {}
    return 'placeholder';
  }

  function setMode(m) {
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function placeholderHtml(gLine) {
    return (
      '<div class="ugrad-engine-body">' +
      '<div class="ugrad-engine-toolbar">' +
      '<label class="ugrad-engine-toggle"><input type="checkbox" id="ugrad-engine-iframe-cb" /> Show tensor preview (Brother Numsy iframe)</label>' +
      '</div>' +
      '<div class="ugrad-engine-hd">Placeholder mode — shared engine not wired yet · parity with go tensor slice + MLP lane</div>' +
      '<div class="ugrad-engine-strip" role="list">' +
      '<div class="ugrad-engine-card" role="listitem">State tensor → model<br><span style="opacity:.75">TBD</span></div>' +
      '<div class="ugrad-engine-card" role="listitem">Train / policy head<br><span style="opacity:.75">TBD</span></div>' +
      '<div class="ugrad-engine-card" role="listitem">DAC + Iron Line export<br><span style="opacity:.75">TBD</span></div>' +
      '</div>' +
      '<p class="ugrad-numsy-note">Trainable reflex engine will attach here. Sibling runners: ' +
      '<a href="brothernumsy.html" target="_blank" rel="noopener">brothernumsy.html</a> · ' +
      '<a href="numsy.html" target="_blank" rel="noopener">numsy.html</a>.</p>' +
      '</div>'
    );
  }

  function iframeHtml() {
    return (
      '<div class="ugrad-engine-body ugrad-engine-iframe-mode">' +
      '<div class="ugrad-engine-toolbar">' +
      '<label class="ugrad-engine-toggle"><input type="checkbox" id="ugrad-engine-iframe-cb" checked /> Show tensor preview (Brother Numsy iframe)</label>' +
      '</div>' +
      '<div class="ugrad-engine-hd">Preview — Brother Numsy canvas (same-origin iframe)</div>' +
      '<div class="ugrad-numsy-frame"><iframe src="brothernumsy.html" title="Brother Numsy preview" loading="lazy" ' +
      'sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"></iframe></div>' +
      '<p class="ugrad-numsy-note">Toggle off for lightweight placeholder. Full runner: <a href="brothernumsy.html" target="_blank" rel="noopener">brothernumsy.html</a>.</p>' +
      '</div>'
    );
  }

  function mount() {
    if (document.querySelector('.ugrad-numsy-footer')) return;
    var g = gameLabel();
    var gLine = g ? '<span class="ugrad-engine-game"> · ' + escapeHtml(g) + '</span>' : '';
    var mode = getMode();
    var sec = document.createElement('section');
    sec.className = 'ugrad-numsy-footer';
    sec.setAttribute('aria-label', 'μgrad game engine');
    sec.innerHTML =
      '<details class="ugrad-numsy-details">' +
      '<summary class="ugrad-numsy-sum">μgrad game engine · training lane' +
      gLine +
      '</summary>' +
      (mode === 'iframe' ? iframeHtml() : placeholderHtml(gLine)) +
      '</details>';
    var foot = document.querySelector('.gu-foot');
    if (foot && foot.parentNode) foot.parentNode.insertBefore(sec, foot);
    else document.body.appendChild(sec);

    function wireCb() {
      var cb = document.getElementById('ugrad-engine-iframe-cb');
      if (!cb) return;
      cb.checked = getMode() === 'iframe';
      cb.addEventListener('change', function () {
        setMode(cb.checked ? 'iframe' : 'placeholder');
        var old = document.querySelector('.ugrad-numsy-footer');
        if (old) old.remove();
        mount();
      });
    }
    wireCb();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
