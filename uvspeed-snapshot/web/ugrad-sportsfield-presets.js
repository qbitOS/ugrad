/**
 * ugrad-sportsfield-presets.js — sport / surface / venue registry for μgrad sports field.
 * Optional per-preset `metricLines` (half / quarter / custom meters or t∈[0,1]) and
 * `scoringZones` (goal_segment, hoop, net_segment, endzone_rect, home_plate) append via
 * `renderFieldOverlays` after the base `svg(L,W)`. Extend with `UgradSportsfieldPresets.register({...})`.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  /**
   * @typedef {Object} MetricLineSpec
   * @property {string} [id]
   * @property {string} [label]
   * @property {'x'|'y'} [axis] — full-bleed line at posM along length (x) or width (y)
   * @property {number} [posM] — meters from origin (0,0) top-left
   * @property {number} [t] — 0..1 fraction along axis (use with axis; alternative to posM)
   * @property {'dashed'|'solid'|'ref'} [style]
   * @property {'fraction'} [kind] — use t with axis
   */
  /**
   * @typedef {Object} ScoringZoneSpec
   * @property {string} [id]
   * @property {string} [label]
   * @property {'goal_segment'|'hoop'|'net_segment'|'endzone_rect'|'home_plate'} kind
   * @property {number} [x1],[y1],[x2],[y2],[cx],[cy],[r],[x],[y],[w],[h]
   */
  /** @typedef {{ id:string, label:string, genre:string, surface:string, lengthM:number, widthM:number, cols:number, rows:number, ball:Object, shotModel:string, svg:function, metricLines?:MetricLineSpec[], scoringZones?:ScoringZoneSpec[] }} SportPreset */

  /** NFL: 120×53⅓ yd playing surface incl. end zones (≈109.73×48.77 m). */
  var NFL_L_M = 109.728;
  var NFL_W_M = 48.768;
  var NFL_EZ_M = 9.144;
  var YD_M = 0.9144;

  function renderFieldOverlays(p, L, W) {
    if (!p) return '';
    var s = '';
    var i;
    var mlines = p.metricLines;
    var zones = p.scoringZones;
    if (mlines && mlines.length) {
      for (i = 0; i < mlines.length; i++) {
        s += metricLineSvg(mlines[i], L, W);
      }
    }
    if (zones && zones.length) {
      for (i = 0; i < zones.length; i++) {
        s += scoringZoneSvg(zones[i], L, W);
      }
    }
    return s;
  }

  function metricLineSvg(m, L, W) {
    if (!m) return '';
    var dash = m.style === 'dashed' || m.style === 'ref';
    var cls = 'sf-metric' + (dash ? ' sf-metric--dash' : '');
    var x1, y1, x2, y2, pos;
    if (m.kind === 'fraction' && m.axis === 'x' && typeof m.t === 'number') {
      pos = m.t * L;
      return (
        '<line class="' +
        cls +
        '" x1="' +
        pos +
        '" y1="0" x2="' +
        pos +
        '" y2="' +
        W +
        '" />'
      );
    }
    if (m.kind === 'fraction' && m.axis === 'y' && typeof m.t === 'number') {
      pos = m.t * W;
      return (
        '<line class="' +
        cls +
        '" x1="0" y1="' +
        pos +
        '" x2="' +
        L +
        '" y2="' +
        pos +
        '" />'
      );
    }
    if (m.axis === 'x' && typeof m.posM === 'number') {
      pos = m.posM;
      return (
        '<line class="' +
        cls +
        '" x1="' +
        pos +
        '" y1="0" x2="' +
        pos +
        '" y2="' +
        W +
        '" />'
      );
    }
    if (m.axis === 'y' && typeof m.posM === 'number') {
      pos = m.posM;
      return (
        '<line class="' +
        cls +
        '" x1="0" y1="' +
        pos +
        '" x2="' +
        L +
        '" y2="' +
        pos +
        '" />'
      );
    }
    return '';
  }

  function scoringZoneSvg(z, L, W) {
    if (!z || !z.kind) return '';
    if (z.kind === 'goal_segment') {
      return (
        '<line class="sf-zone sf-zone--goal" x1="' +
        z.x1 +
        '" y1="' +
        z.y1 +
        '" x2="' +
        z.x2 +
        '" y2="' +
        z.y2 +
        '" />'
      );
    }
    if (z.kind === 'net_segment') {
      return (
        '<line class="sf-zone sf-zone--net" x1="' +
        z.x1 +
        '" y1="' +
        z.y1 +
        '" x2="' +
        z.x2 +
        '" y2="' +
        z.y2 +
        '" />'
      );
    }
    if (z.kind === 'hoop') {
      var r = typeof z.r === 'number' ? z.r : 0.45;
      return '<circle class="sf-zone sf-zone--hoop" cx="' + z.cx + '" cy="' + z.cy + '" r="' + r + '" />';
    }
    if (z.kind === 'endzone_rect') {
      return (
        '<rect class="sf-zone sf-zone--endzone" x="' +
        z.x +
        '" y="' +
        z.y +
        '" width="' +
        z.w +
        '" height="' +
        z.h +
        '" />'
      );
    }
    if (z.kind === 'home_plate') {
      var rp = typeof z.r === 'number' ? z.r : 0.4;
      return '<circle class="sf-zone sf-zone--home" cx="' + z.cx + '" cy="' + z.cy + '" r="' + rp + '" />';
    }
    return '';
  }

  function svgBaseball(L, W) {
    var hx = L / 2;
    var side = 27.432;
    var hy = W - 4;
    if (hy - side * 2 < 6) hy = W * 0.65;
    var h0x = hx;
    var h0y = hy;
    var b1x = hx + side;
    var b1y = hy;
    var b2x = hx + side;
    var b2y = hy - side;
    var b3x = hx;
    var b3y = hy - side;
    var mx = hx + side * 0.5;
    var my = hy - side * 0.5;
    return (
      '<title>MLB infield (90 ft base paths)</title>' +
      '<rect class="sf-grass sf-surface-dirt" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<polygon class="sf-m" points="' +
      h0x +
      ',' +
      h0y +
      ' ' +
      b1x +
      ',' +
      b1y +
      ' ' +
      b2x +
      ',' +
      b2y +
      ' ' +
      b3x +
      ',' +
      b3y +
      '" fill="none" />' +
      '<line class="sf-m" x1="' +
      h0x +
      '" y1="' +
      h0y +
      '" x2="' +
      b3x +
      '" y2="' +
      b3y +
      '" />' +
      '<line class="sf-m" x1="' +
      h0x +
      '" y1="' +
      h0y +
      '" x2="' +
      b1x +
      '" y2="' +
      b1y +
      '" />' +
      '<circle class="sf-spot" cx="' +
      b1x +
      '" cy="' +
      b1y +
      '" r="0.25" />' +
      '<circle class="sf-spot" cx="' +
      b2x +
      '" cy="' +
      b2y +
      '" r="0.25" />' +
      '<circle class="sf-spot" cx="' +
      b3x +
      '" cy="' +
      b3y +
      '" r="0.25" />' +
      '<circle class="sf-m" cx="' +
      mx +
      '" cy="' +
      my +
      '" r="2.9" fill="none" />' +
      '<circle class="sf-spot" cx="' +
      h0x +
      '" cy="' +
      h0y +
      '" r="0.35" />'
    );
  }

  function svgAmericanFootball(L, W) {
    var ez = NFL_EZ_M;
    var gl0 = ez;
    var gl1 = L - ez;
    var n;
    var s =
      '<title>NFL field (120×53⅓ yd, metric)</title>' +
      '<rect class="sf-grass sf-surface-turf" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-zone sf-zone--endzone" x="0" y="0" width="' +
      ez +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-zone sf-zone--endzone" x="' +
      (L - ez) +
      '" y="0" width="' +
      ez +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-m" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" fill="none" />';
    for (n = 1; n < 10; n++) {
      var x = gl0 + n * 10 * YD_M;
      s +=
        '<line class="sf-metric sf-metric--dash" x1="' +
        x +
        '" y1="0" x2="' +
        x +
        '" y2="' +
        W +
        '" />';
    }
    s +=
      '<line class="sf-metric" x1="' +
      gl0 +
      '" y1="0" x2="' +
      gl0 +
      '" y2="' +
      W +
      '" />' +
      '<line class="sf-metric" x1="' +
      gl1 +
      '" y1="0" x2="' +
      gl1 +
      '" y2="' +
      W +
      '" />' +
      '<line class="sf-metric sf-metric--dash" x1="' +
      (L / 2) +
      '" y1="0" x2="' +
      (L / 2) +
      '" y2="' +
      W +
      '" />';
    return s;
  }

  function svgFootball(L, W) {
    var hx = L / 2;
    var hy = W / 2;
    var g0 = (W - 7.32) / 2;
    var g1 = g0 + 7.32;
    return (
      '<title>IFAB / FIFA</title>' +
      '<rect class="sf-grass" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-m" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<line class="sf-m" x1="' +
      hx +
      '" y1="0" x2="' +
      hx +
      '" y2="' +
      W +
      '" />' +
      '<circle class="sf-m" cx="' +
      hx +
      '" cy="' +
      hy +
      '" r="9.15" />' +
      '<circle class="sf-spot" cx="' +
      hx +
      '" cy="' +
      hy +
      '" r="0.22" />' +
      '<rect class="sf-m" x="0" y="' +
      (hy - 20.16) +
      '" width="16.5" height="40.32" />' +
      '<rect class="sf-m" x="' +
      (L - 16.5) +
      '" y="' +
      (hy - 20.16) +
      '" width="16.5" height="40.32" />' +
      '<rect class="sf-m" x="0" y="' +
      (hy - 9.16) +
      '" width="5.5" height="18.32" />' +
      '<rect class="sf-m" x="' +
      (L - 5.5) +
      '" y="' +
      (hy - 9.16) +
      '" width="5.5" height="18.32" />' +
      '<circle class="sf-spot" cx="11" cy="' +
      hy +
      '" r="0.22" /><circle class="sf-spot" cx="' +
      (L - 11) +
      '" cy="' +
      hy +
      '" r="0.22" />' +
      '<line class="sf-m-soft" x1="0" y1="' +
      g0 +
      '" x2="0" y2="' +
      g1 +
      '" />' +
      '<line class="sf-m-soft" x1="' +
      L +
      '" y1="' +
      g0 +
      '" x2="' +
      L +
      '" y2="' +
      g1 +
      '" />'
    );
  }

  function svgIceHockey(L, W) {
    var hx = L / 2;
    var hy = W / 2;
    return (
      '<title>NHL-style rink (approx)</title>' +
      '<rect class="sf-grass sf-surface-ice" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-m" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" rx="2" ry="2" />' +
      '<line class="sf-m" x1="' +
      hx +
      '" y1="0" x2="' +
      hx +
      '" y2="' +
      W +
      '" stroke="#c41e3a" stroke-width="0.35" />' +
      '<circle class="sf-m" cx="' +
      hx +
      '" cy="' +
      hy +
      '" r="' +
      Math.min(4.5, W * 0.18) +
      '" fill="none" />' +
      '<line class="sf-m" x1="7.5" y1="0" x2="7.5" y2="' +
      W +
      '" stroke="#3b82f6" stroke-width="0.2" />' +
      '<line class="sf-m" x1="' +
      (L - 7.5) +
      '" y1="0" x2="' +
      (L - 7.5) +
      '" y2="' +
      W +
      '" stroke="#3b82f6" stroke-width="0.2" />'
    );
  }

  function svgBasketball(L, W) {
    var hx = L / 2;
    var hy = W / 2;
    var keyW = Math.min(5.8, L * 0.2);
    return (
      '<title>NBA court (approx)</title>' +
      '<rect class="sf-grass sf-surface-court" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-m" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<line class="sf-m" x1="' +
      hx +
      '" y1="0" x2="' +
      hx +
      '" y2="' +
      W +
      '" />' +
      '<circle class="sf-m" cx="' +
      hx +
      '" cy="' +
      hy +
      '" r="' +
      Math.min(1.8, W * 0.12) +
      '" fill="none" />' +
      '<rect class="sf-m" x="0" y="' +
      (hy - keyW / 2) +
      '" width="' +
      Math.min(5.8, L * 0.2) +
      '" height="' +
      keyW +
      '" fill="none" />' +
      '<rect class="sf-m" x="' +
      (L - Math.min(5.8, L * 0.2)) +
      '" y="' +
      (hy - keyW / 2) +
      '" width="' +
      Math.min(5.8, L * 0.2) +
      '" height="' +
      keyW +
      '" fill="none" />'
    );
  }

  function svgTennis(L, W) {
    var hx = L / 2;
    return (
      '<title>Tennis singles (approx)</title>' +
      '<rect class="sf-grass sf-surface-acrylic" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<line class="sf-m" x1="' +
      hx +
      '" y1="0" x2="' +
      hx +
      '" y2="' +
      W +
      '" />' +
      '<line class="sf-m" x1="0" y1="' +
      W / 2 +
      '" x2="' +
      L +
      '" y2="' +
      W / 2 +
      '" />'
    );
  }

  function svgVolleyball(L, W) {
    var hx = L / 2;
    return (
      '<title>Volleyball court</title>' +
      '<rect class="sf-grass sf-surface-synthetic" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<line class="sf-m" x1="' +
      hx +
      '" y1="0" x2="' +
      hx +
      '" y2="' +
      W +
      '" />'
    );
  }

  function svgBlank(L, W) {
    return (
      '<title>Generic rectangle</title>' +
      '<rect class="sf-grass sf-surface-synthetic" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" />' +
      '<rect class="sf-m" x="0" y="0" width="' +
      L +
      '" height="' +
      W +
      '" fill="none" />'
    );
  }

  var PRESETS = {
    football_fifa: {
      id: 'football_fifa',
      label: 'Football · FIFA (grass)',
      genre: 'team_field',
      surface: 'grass',
      lengthM: 105,
      widthM: 68,
      cols: 51,
      rows: 33,
      ball: { x: 52.5, y: 34, vx: 22, vy: 16 },
      shotModel: 'soccer_ifab',
      svg: svgFootball,
      metricLines: [
        { id: 'q25', kind: 'fraction', axis: 'x', t: 0.25, style: 'ref' },
        { id: 'q75', kind: 'fraction', axis: 'x', t: 0.75, style: 'ref' }
      ],
      scoringZones: [
        { id: 'goal_left', kind: 'goal_segment', x1: 0, y1: 24.84, x2: 0, y2: 43.16 },
        { id: 'goal_right', kind: 'goal_segment', x1: 105, y1: 24.84, x2: 105, y2: 43.16 }
      ]
    },
    hockey_nhl: {
      id: 'hockey_nhl',
      label: 'Ice hockey · NHL (ice)',
      genre: 'team_rink',
      surface: 'ice',
      lengthM: 60.96,
      widthM: 25.91,
      cols: 51,
      rows: 22,
      ball: { x: 30.48, y: 12.96, vx: 18, vy: 10 },
      shotModel: 'none',
      svg: svgIceHockey
    },
    basketball_nba: {
      id: 'basketball_nba',
      label: 'Basketball · NBA (hardwood)',
      genre: 'team_court',
      surface: 'hardwood',
      lengthM: 28.65,
      widthM: 15.24,
      cols: 51,
      rows: 27,
      ball: { x: 14.32, y: 7.62, vx: 14, vy: 9 },
      shotModel: 'none',
      svg: svgBasketball,
      metricLines: [
        { id: 'q1', kind: 'fraction', axis: 'y', t: 0.25, style: 'ref' },
        { id: 'q3', kind: 'fraction', axis: 'y', t: 0.75, style: 'ref' }
      ],
      scoringZones: [
        { id: 'hoop_left', kind: 'hoop', cx: 4.225, cy: 7.62, r: 0.45 },
        { id: 'hoop_right', kind: 'hoop', cx: 24.425, cy: 7.62, r: 0.45 }
      ]
    },
    tennis_hard: {
      id: 'tennis_hard',
      label: 'Tennis · singles (acrylic)',
      genre: 'court',
      surface: 'acrylic',
      lengthM: 23.77,
      widthM: 10.97,
      cols: 48,
      rows: 22,
      ball: { x: 11.89, y: 5.49, vx: 12, vy: 6 },
      shotModel: 'none',
      svg: svgTennis,
      scoringZones: [
        { id: 'net', kind: 'net_segment', x1: 0, y1: 5.485, x2: 23.77, y2: 5.485 }
      ]
    },
    volleyball: {
      id: 'volleyball',
      label: 'Volleyball (synthetic)',
      genre: 'court',
      surface: 'synthetic',
      lengthM: 18,
      widthM: 9,
      cols: 36,
      rows: 18,
      ball: { x: 9, y: 4.5, vx: 10, vy: 8 },
      shotModel: 'none',
      svg: svgVolleyball,
      metricLines: [
        { id: 'half_a', kind: 'fraction', axis: 'x', t: 0.25, style: 'ref' },
        { id: 'half_b', kind: 'fraction', axis: 'x', t: 0.75, style: 'ref' }
      ],
      scoringZones: [{ id: 'net', kind: 'net_segment', x1: 9, y1: 0, x2: 9, y2: 9 }]
    },
    futsal: {
      id: 'futsal',
      label: 'Futsal (turf/hard)',
      genre: 'team_indoor',
      surface: 'turf',
      lengthM: 40,
      widthM: 20,
      cols: 40,
      rows: 20,
      ball: { x: 20, y: 10, vx: 16, vy: 12 },
      shotModel: 'none',
      svg: svgBlank
    },
    beach: {
      id: 'beach',
      label: 'Beach pitch (sand)',
      genre: 'team_field',
      surface: 'sand',
      lengthM: 37,
      widthM: 28,
      cols: 37,
      rows: 28,
      ball: { x: 18.5, y: 14, vx: 14, vy: 10 },
      shotModel: 'none',
      svg: svgBlank
    },
    football_nfl: {
      id: 'football_nfl',
      label: 'American football · NFL (metric)',
      genre: 'grid_iron',
      surface: 'turf',
      lengthM: NFL_L_M,
      widthM: NFL_W_M,
      cols: 55,
      rows: 24,
      ball: { x: NFL_L_M * 0.5, y: NFL_W_M * 0.5, vx: 12, vy: 0 },
      shotModel: 'none',
      svg: svgAmericanFootball,
      metricLines: [
        { id: 'q_field_25', kind: 'fraction', axis: 'x', t: 0.25, style: 'ref' },
        { id: 'q_field_75', kind: 'fraction', axis: 'x', t: 0.75, style: 'ref' }
      ],
      scoringZones: []
    },
    field_blank: {
      id: 'field_blank',
      label: 'Blank rectangle · 100×50 m',
      genre: 'custom',
      surface: 'synthetic',
      lengthM: 100,
      widthM: 50,
      cols: 50,
      rows: 25,
      ball: { x: 50, y: 25, vx: 20, vy: 12 },
      shotModel: 'none',
      svg: svgBlank
    },
    generic: {
      id: 'generic',
      label: 'Baseball · infield (MLB 90 ft)',
      genre: 'diamond',
      surface: 'dirt',
      lengthM: 100,
      widthM: 100,
      cols: 50,
      rows: 50,
      ball: { x: 63.7, y: 82.3, vx: 10, vy: -8 },
      shotModel: 'none',
      svg: svgBaseball,
      metricLines: [
        { id: 'half_x', axis: 'x', posM: 50, style: 'dashed' },
        { id: 'half_y', axis: 'y', posM: 50, style: 'dashed' },
        { id: 'q25', kind: 'fraction', axis: 'x', t: 0.25, style: 'ref' },
        { id: 'q75', kind: 'fraction', axis: 'x', t: 0.75, style: 'ref' }
      ],
      scoringZones: [{ id: 'home', kind: 'home_plate', cx: 50, cy: 96, r: 0.45 }]
    }
  };

  function get(id) {
    var p = PRESETS[id] || PRESETS.football_fifa;
    return p;
  }

  function list() {
    return Object.keys(PRESETS).map(function (k) {
      var p = PRESETS[k];
      return { id: p.id, label: p.label, genre: p.genre, surface: p.surface };
    });
  }

  function register(preset) {
    if (!preset || !preset.id) return false;
    PRESETS[preset.id] = preset;
    return true;
  }

  global.UgradSportsfieldPresets = {
    get: get,
    list: list,
    register: register,
    PRESETS: PRESETS,
    renderFieldOverlays: renderFieldOverlays,
    metricLineSvg: metricLineSvg,
    scoringZoneSvg: scoringZoneSvg
  };
})(typeof window !== 'undefined' ? window : globalThis);
