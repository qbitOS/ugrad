#!/usr/bin/env node
/**
 * One-shot generator: writes μgrad *-ugrad.html pages with go/gomoku-parity shell.
 * Run: node scripts/generate-ugrad-parity-pages.mjs
 *
 * Hand-maintained (not generated): webgrid-ugrad.html; sports-field-ugrad.html — FIFA pitch grid + layers.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(__dirname, '..', 'web');

const SHELL = (o) => `<!-- beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1} -->
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f1419" id="${o.id}-meta-theme">
<title>${o.title}</title>
<link rel="stylesheet" href="quantum-theme.css">
<link rel="stylesheet" href="ugrad-go-board-theme.css">
<link rel="stylesheet" href="ugrad-parity-lab.css">
<link rel="stylesheet" href="ugrad-numsy-footer.css">
<link rel="stylesheet" href="ugrad-game-chrome.css">
</head>
<body data-ugrad-game="${o.id}" class="ugb-surface">
<header class="gu-header">
  <div class="gu-header-brand">
    <strong>${o.brand}</strong>
    <span class="gu-bar-out"><a href="games-ugrad-hub.html" class="gu-bar-link" title="μgrad games hub">Hub</a></span>
    <span class="gu-header-spacer" aria-hidden="true"></span>
    <div data-qp-theme-host class="gu-theme-host" title="Light / dark (syncs with μgrad stack)"></div>
  </div>
  <div class="gu-bar" role="toolbar">
    <button type="button" class="gu-primary" id="ugc-open-monitor" title="Open multi-board monitor">Monitor</button>
    <div class="gu-bar-rail-wrap" title="3×3 slices from other tensor envs (BroadcastChannel ugrad-tensor-lane)">
      <label><input type="checkbox" id="gm-lane-recv" checked> Lane in</label>
      <label><input type="checkbox" id="gm-lane-send"> Publish slice</label>
      <div class="gu-bar-rail" id="gu-bar-rail" aria-live="polite"></div>
    </div>
    <label>Mode <select id="gm-mode"><option value="play" selected>Play &amp; record</option><option value="analyze">Analyze history</option></select></label>
    <label>To move <select id="ugc-color"><option value="1">Black (●)</option><option value="-1">White (○)</option></select></label>
    <button type="button" id="gm-undo">Undo</button>
    <button type="button" id="gm-clear">Clear</button>
    <button type="button" id="gm-save-game">Save game</button>
    <label>Tensor env <select id="gm-tensor-env"></select></label>
    <label>Train steps <input type="number" id="gm-steps" value="80" min="10" max="2000" step="10"></label>
    <button type="button" class="gu-primary" id="gm-train">Train slice MLP</button>
    <button type="button" id="gm-ai-move">AI move</button>
    <button type="button" id="gm-snap">Snapshot</button>
    <button type="button" id="gm-export">Export JSON</button>
    <button type="button" class="gu-primary" id="gm-fs" title="Fullscreen">Fullscreen board</button>
    <button type="button" id="ugc-open-hub-monitor">Hub monitor</button>
    ${o.boardSize ? `<label>Board <select id="gm-board-size">${o.boardSize}</select></label>` : '<span id="gm-board-size-wrap" style="display:none"><select id="gm-board-size"><option value="15">15×15</option></select></span>'}
    <label><input type="checkbox" id="gm-bc-follow"> Follow remote</label>
    <label><input type="checkbox" id="gm-bc-send" checked> Broadcast</label>
    <label>Name <input type="text" id="gm-bc-label" maxlength="32" placeholder="optional" style="max-width:7rem"></label>
    <button type="button" class="gu-primary" id="gm-new">New session</button>
    <button type="button" onclick="location.href='go-ugrad.html'">Go lab</button>
  </div>
</header>
<div class="gu-main" id="ugc-fs-target">
  <div class="gu-board-wrap" id="gu-board-wrap">
    <h2>${o.h2}</h2>
    <div class="gu-clock-strip" role="group" aria-label="Game clock">
      <span class="gu-cs-muted">Clock</span>
      <div class="gu-clock-pair" aria-live="polite">
        <span class="gu-clock-face" id="ugc-clock-b">B · —:—</span>
        <span class="gu-clock-face" id="ugc-clock-w">W · —:—</span>
      </div>
      <label><input type="checkbox" id="ugc-clock-on" checked> On</label>
      <label>Min/side <input type="number" id="ugc-clock-min" value="5" min="1" max="120" step="1"></label>
      <button type="button" id="ugc-clock-pause">Pause</button>
      <button type="button" class="gu-primary" id="ugc-clock-reset">Reset clock</button>
    </div>
    <div class="gu-board-fs-row" role="toolbar">
      <button type="button" class="gu-fs-btn gu-primary" id="ugc-fs-inline" title="Fullscreen">⛶</button>
    </div>
    <div class="upl-main-slot" id="${o.id}-main">
${o.center}
    </div>
    <p style="font-size:10px;color:var(--qp-fg-muted);margin:10px 0 0;line-height:1.45">${o.blurb}</p>
    <div class="gu-mini9" id="gm-mini9" aria-hidden="true"></div>
    <section class="gu-cmd" aria-label="Command station">
      <div class="gu-cmd-hd">Command station · live 3×3 slice</div>
      <div class="gu-cmd-row">
        <div class="gu-mini9 gu-cmd-live" id="gm-cmd-live"></div>
        <div class="gu-cmd-readout" id="gm-cmd-readout">idle · Train or snapshot</div>
      </div>
      <p class="gu-cmd-meta">${o.cmdMeta}</p>
    </section>
  </div>
  <div class="gu-side">
    <div class="gu-snap-wrap">
      <div class="gu-snap-hd">Iteration snapshots · scroll →</div>
      <div class="gu-snap-strip" id="gm-snap-strip" role="list"></div>
    </div>
    <div>
      <label style="font-size:10px;color:var(--qp-fg-muted)">Saved games <select id="gm-history" style="max-width:100%;margin-top:4px"></select></label>
      <div class="gu-log" id="gm-act" aria-live="polite">${o.id}-ugrad v${o.version} · activity log</div>
    </div>
    <p id="gm-side-meta" style="font:500 9px ui-monospace,monospace;color:var(--qp-fg-muted);margin:0;line-height:1.45"></p>
  </div>
</div>
<section class="gu-lane-sync" aria-label="Tensor lane">
  <h3 class="gu-lane-sync-hd">Tensor lane · remote slices</h3>
  <p class="gu-lane-sync-meta">Same ℝ⁹ shape as <code>#gm-mini9</code> · <code>BroadcastChannel('ugrad-tensor-lane')</code> · Publish slice / Lane in.</p>
  <div class="gu-lane-sync-grid" id="gm-lane-grid"><p class="gu-lane-empty" id="gm-lane-empty">No remote slices yet.</p></div>
</section>
<p class="gu-foot"><code>${o.file}</code> · <a href="go-ugrad-monitor.html">multi-monitor</a> · <a href="games-ugrad-hub.html">μgrad games hub</a> · <a href="arena-ugrad.html">arena</a> · <a href="raw-games-ugrad.html">raw index</a> · <a href="ugrad-pad-lab.html">μPad lab</a>${o.footExtra || ''}</p>
<script src="quantum-prefixes.js"></script>
<script src="qbit-dac.js"></script>
<script src="qbit-steno.js"></script>
<script src="ugrad-tensor-envs.js"></script>
<script src="ugrad-parity-lab.js"></script>
<script src="ugrad-game-chrome.js"></script>
<script src="ugrad-numsy-footer.js"></script>
<script>
(function(){
'use strict';
var VERSION='${o.version}';
var GAME='${o.id}';
var STORAGE='${o.storageKey}';
var BC_NAME='${o.bcChannel}';
function slice9(){
  if(window.UgradTensorEnvs){
    var sel=document.getElementById('gm-tensor-env');
    var id=sel?sel.value:'go-board';
    var b=UgradTensorEnvs.synthBatch(id,1);
    if(b&&b.X&&b.X[0])return b.X[0].map(Number);
  }
  return [0,0,0,0,0,0,0,0,0];
}
function exportPayload(){
  return {app:GAME+'-ugrad',version:VERSION,slice9:slice9(),ts:new Date().toISOString(),note:${JSON.stringify(o.exportNote || 'stub')}};
}
var snapTick=0;
function refreshMini(){
  var s=slice9();
  if(window.UgradParityLab){UgradParityLab.renderMini9('gm-mini9',s);UgradParityLab.renderMini9('gm-cmd-live',s);}
  var ro=document.getElementById('gm-cmd-readout');
  if(ro)ro.textContent='slice ℝ⁹ · '+s.join(',')+' · '+new Date().toISOString().slice(11,19);
}
document.getElementById('gm-train').addEventListener('click',function(){refreshMini();});
document.getElementById('gm-clear').addEventListener('click',function(){refreshMini();document.getElementById('gm-act').textContent=GAME+'-ugrad v'+VERSION+' · cleared';});
document.getElementById('gm-new').addEventListener('click',function(){refreshMini();});
document.getElementById('gm-ai-move').addEventListener('click',function(){
  document.getElementById('gm-act').textContent+='\\nAI move · roadmap — use tensor train + policy hook';
});
document.getElementById('gm-undo').addEventListener('click',function(){
  document.getElementById('gm-act').textContent+='\\nundo · roadmap';
});
if(window.UgradParityLab){
  UgradParityLab.init({
    gameId:GAME,
    version:VERSION,
    storageKey:STORAGE,
    tensorDefault:'${o.tensorDefault || 'go-board'}',
    getSlice9:slice9,
    getExportPayload:exportPayload,
    getSavePayload:function(){return {slice9:slice9()};},
    hideBoardSize:${o.hideBoardSize === true},
    hideAiMove:${o.hideAiMove === true}
  });
}
refreshMini();
${o.bcScript || ''}
if(window.QuantumPrefixes&&QuantumPrefixes.broadcastState)
  QuantumPrefixes.broadcastState(GAME+'-ugrad',{app:GAME+'-ugrad',version:VERSION,ts:Date.now()});
})();
</script>
<script>
(function(){
if(typeof BroadcastChannel==='undefined'||!window.QuantumPrefixes)return;
var ch=new BroadcastChannel('quantum-prefixes');
ch.onmessage=function(e){if(e.data&&e.data.type==='requestSync'&&QuantumPrefixes.broadcastState)
  QuantumPrefixes.broadcastState('${o.id}-ugrad',{app:'${o.id}-ugrad',version:'${o.version}',ts:Date.now()});};
})();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
</script>
<script src="ugrad-game-presence.js"></script>
</body>
</html>
`;

/** Do not overwrite — edited by hand (parity generator skips these). */
const SKIP_GENERATE = new Set(['webgrid-ugrad.html', 'sports-field-ugrad.html']);

const GAMES = [
  { file: 'mancala-ugrad.html', id: 'mancala', brand: 'mancala.ugrad.ai', title: 'Mancala — μgrad lab', h2: '◎ Pit-and-seed lab · tensor-ready pits', version: '0.3.0', storageKey: 'mancala-ugrad-games-v1', bcChannel: 'ugrad-mancala-board', tensorDefault: 'gomoku-density', boardSize: '', hideBoardSize: true, exportNote: 'mancala stub', cmdMeta: 'Oware / Kalah / Bao roadmap · same ℝ⁹ lane as go.', blurb: '<strong>Broadcast</strong> <code>' + 'ugrad-mancala-board' + '</code> (state JSON roadmap). <strong>Lane</strong> publishes synthetic or tensor batch slices.', center: `      <p style="margin:0 0 10px;font:500 12px ui-sans-serif;line-height:1.5;color:var(--qp-fg-body)">Two rows of pits, sowing, capture — family spans <strong>Oware</strong>, <strong>Kalah</strong>, <strong>Bao</strong>. Interactive board + legal moves TBD.</p>
      <p style="font:500 10px ui-monospace;color:var(--qp-fg-muted);margin:0">Refs: <a href="https://en.wikipedia.org/wiki/Mancala" target="_blank" rel="noopener" style="color:#58a6ff">Mancala</a> · <a href="arena-ugrad.html#mancala" style="color:#58a6ff">arena</a></p>`, footExtra: ' · <a href="https://mancala.ugrad.ai" target="_blank" rel="noopener">mancala.ugrad.ai</a>' },
  { file: 'backgammon-ugrad.html', id: 'backgammon', brand: 'backgammon.ugrad.ai', title: 'Backgammon — μgrad lab', h2: '🎲 Tables / race lab', version: '0.3.0', storageKey: 'backgammon-ugrad-games-v1', bcChannel: 'ugrad-backgammon-board', tensorDefault: 'gomoku-density', hideBoardSize: true, exportNote: 'backgammon stub', cmdMeta: 'Dice + pip vector · cube roadmap.', blurb: 'Race games · <code>ugrad-backgammon-board</code> · clocks match chess/go chrome.', center: `      <p style="margin:0;font:500 12px ui-sans-serif;line-height:1.5;color:var(--qp-fg-body)">Points, bar, borne-off — Nard lineage. Full board + bot TBD.</p>
      <p style="font:500 10px ui-monospace;margin:10px 0 0"><a href="https://en.wikipedia.org/wiki/Backgammon" target="_blank" rel="noopener" style="color:#58a6ff">Backgammon</a> · <a href="chess-ugrad.html" style="color:#58a6ff">chess</a></p>`, footExtra: ' · <a href="https://backgammon.ugrad.ai" target="_blank" rel="noopener">backgammon.ugrad.ai</a>' },
  { file: 'battleship-ugrad.html', id: 'battleship', brand: 'battleship.ugrad.ai', title: 'Battleship — μgrad lab', h2: '⌁ Hidden-fleet grid', version: '0.3.0', storageKey: 'battleship-ugrad-games-v1', bcChannel: 'ugrad-battleship-board', hideBoardSize: true, exportNote: 'battleship stub', cmdMeta: 'Salvo + fog-of-war tensor.', blurb: '10×10 search game · BC for hot-seat two-tab.', center: `      <p style="margin:0;font:500 12px ui-sans-serif;line-height:1.5">Placement + shooting phases roadmap. <a href="gomoku-ugrad.html" style="color:#58a6ff">gomoku</a> full-board contrast.</p>`, footExtra: ' · <a href="https://battleship.ugrad.ai" target="_blank" rel="noopener">battleship.ugrad.ai</a>' },
  { file: 'hanafuda-ugrad.html', id: 'hanafuda', brand: 'hanafuda.ugrad.ai', title: 'Hanafuda — μgrad lab', h2: '🎴 Flower cards', version: '0.3.0', storageKey: 'hanafuda-ugrad-games-v1', bcChannel: 'ugrad-hanafuda-board', hideBoardSize: true, exportNote: 'hanafuda stub', cmdMeta: '48-card tensor · yaku tables.', blurb: 'Koi-Koi scoring · original SVG art only.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">12 suits × 4 cards · Koi-Koi roadmap.</p>`, footExtra: ' · <a href="https://hanafuda.ugrad.ai" target="_blank" rel="noopener">hanafuda.ugrad.ai</a>' },
  { file: 'kobenhavn-ugrad.html', id: 'kobenhavn', brand: 'kobenhavn.ugrad.ai', title: 'København — μgrad lab', h2: '🏙 Circular economics board', version: '0.3.0', storageKey: 'kobenhavn-ugrad-games-v1', bcChannel: 'ugrad-kobenhavn-board', hideBoardSize: true, exportNote: 'kobenhavn stub', cmdMeta: 'Ring + cash vector · ledger export.', blurb: 'Generic Monopoly-class loop · no third-party marks.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Ring track · properties · rents — sim hooks TBD.</p>`, footExtra: ' · <a href="https://kobenhavn.ugrad.ai" target="_blank" rel="noopener">kobenhavn.ugrad.ai</a>' },
  { file: 'rubiks-ugrad.html', id: 'rubiks', brand: 'rubiks.ugrad.ai', title: 'Cube puzzle — μgrad lab', h2: '🧩 3×3 twisty cube', version: '0.3.0', storageKey: 'rubiks-ugrad-games-v1', bcChannel: 'ugrad-rubiks-board', tensorDefault: 'parity-count', hideBoardSize: true, exportNote: 'rubiks stub', cmdMeta: 'Quarter-turn group · move log tensor.', blurb: 'Twisty puzzle mechanics; not affiliated with any trademark.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">State tensor + QTM / HTM roadmap · <a href="mindmaze-ugrad.html" style="color:#58a6ff">mind maze</a> graphs.</p>`, footExtra: ' · <a href="https://rubiks.ugrad.ai" target="_blank" rel="noopener">rubiks.ugrad.ai</a>' },
  { file: 'cupstack-ugrad.html', id: 'cupstack', brand: 'cupstack.ugrad.ai', title: 'Cup stack — μgrad lab', h2: '▵ Timing stack', version: '0.3.0', storageKey: 'cupstack-ugrad-games-v1', bcChannel: 'ugrad-cupstack-board', hideBoardSize: true, exportNote: 'cupstack stub', cmdMeta: 'Rhythm + height vector.', blurb: 'Sport stacking patterns · <a href="dexterity-ugrad.html" style="color:inherit;font-weight:600">dexterity</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Stack height + reaction telemetry TBD.</p>`, footExtra: ' · <a href="https://cupstack.ugrad.ai" target="_blank" rel="noopener">cupstack.ugrad.ai</a>' },
  { file: 'flashcards-ugrad.html', id: 'flashcards', brand: 'flashcards.ugrad.ai', title: 'Flash cards — μgrad lab', h2: '📇 Spaced repetition', version: '0.3.0', storageKey: 'flashcards-ugrad-games-v1', bcChannel: 'ugrad-flashcards-board', hideBoardSize: true, exportNote: 'flashcards stub', cmdMeta: 'SM-2 class scheduling · deck tensor.', blurb: 'Pairs with <a href="language-ugrad.html" style="color:inherit;font-weight:600">language</a> · <a href="memory-ugrad.html" style="color:inherit;font-weight:600">memory</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Deck flip + interval schedule roadmap.</p>`, footExtra: ' · <a href="https://flashcards.ugrad.ai" target="_blank" rel="noopener">flashcards.ugrad.ai</a>' },
  { file: 'mindmaze-ugrad.html', id: 'mindmaze', brand: 'mindmaze.ugrad.ai', title: 'Mind maze — μgrad lab', h2: '◎ Grid maze', version: '0.3.0', storageKey: 'mindmaze-ugrad-games-v1', bcChannel: 'ugrad-mindmaze-board', hideBoardSize: true, exportNote: 'mindmaze stub', cmdMeta: 'BFS/A* path tensor.', blurb: 'Solve path · <a href="rubiks-ugrad.html" style="color:inherit;font-weight:600">rubiks</a> search.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Maze + pathfinding teaching surface.</p>`, footExtra: ' · <a href="https://mindmaze.ugrad.ai" target="_blank" rel="noopener">mindmaze.ugrad.ai</a>' },
  { file: 'memory-ugrad.html', id: 'memory', brand: 'memory.ugrad.ai', title: 'Memory — μgrad lab', h2: '🧠 Neural album', version: '0.3.0', storageKey: 'memory-ugrad-games-v1', bcChannel: 'ugrad-memory-board', hideBoardSize: true, exportNote: 'memory stub', cmdMeta: 'Particle + ripple feature tensor.', blurb: 'Pairs with <a href="history.html" style="color:inherit;font-weight:600">history</a> PWA.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Particles, ripple grid, burn transitions — search prep.</p>`, footExtra: ' · <a href="https://memory.ugrad.ai" target="_blank" rel="noopener">memory.ugrad.ai</a>' },
  { file: 'visualspeed-ugrad.html', id: 'visualspeed', brand: 'visualspeed.ugrad.ai', title: 'Visual speed — μgrad lab', h2: '◎ Psychophysics', version: '0.3.0', storageKey: 'visualspeed-ugrad-games-v1', bcChannel: 'ugrad-visualspeed-board', hideBoardSize: true, exportNote: 'visualspeed stub', cmdMeta: 'Acuity + RT vector.', blurb: 'Cortical-loop budget tie-in.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Reaction + acuity micro-benchmarks.</p>`, footExtra: ' · <a href="https://visualspeed.ugrad.ai" target="_blank" rel="noopener">visualspeed.ugrad.ai</a>' },
  { file: 'dexterity-ugrad.html', id: 'dexterity', brand: 'dexterity.ugrad.ai', title: 'Dexterity — μgrad lab', h2: '◎ Pointer trails', version: '0.3.0', storageKey: 'dexterity-ugrad-games-v1', bcChannel: 'ugrad-dexterity-board', hideBoardSize: true, exportNote: 'dexterity stub', cmdMeta: 'Fitts targeting tensor.', blurb: 'Gamepad / touch patterns.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Hand + pointer trails · Fitts lab.</p>`, footExtra: ' · <a href="https://dexterity.ugrad.ai" target="_blank" rel="noopener">dexterity.ugrad.ai</a>' },
  { file: 'math-ugrad.html', id: 'math', brand: 'math.ugrad.ai', title: 'Math drills — μgrad lab', h2: '∑ Drill tensor', version: '0.3.0', storageKey: 'math-ugrad-games-v1', bcChannel: 'ugrad-math-board', tensorDefault: 'gomoku-density', hideBoardSize: true, exportNote: 'math stub', cmdMeta: 'Curriculum score vector.', blurb: 'μgrad R0 datasets.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Arithmetic + drill streams · export-friendly.</p>`, footExtra: ' · <a href="https://math.ugrad.ai" target="_blank" rel="noopener">math.ugrad.ai</a>' },
  { file: 'language-ugrad.html', id: 'language', brand: 'language.ugrad.ai', title: 'Language — μgrad lab', h2: 'あ Vocab', version: '0.3.0', storageKey: 'language-ugrad-games-v1', bcChannel: 'ugrad-language-board', hideBoardSize: true, exportNote: 'language stub', cmdMeta: 'Script + i18n tensor.', blurb: 'Gutter export · <a href="calligraphy-ugrad.html" style="color:inherit;font-weight:600">calligraphy</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Vocab decks + quantum gutter export.</p>`, footExtra: ' · <a href="https://language.ugrad.ai" target="_blank" rel="noopener">language.ugrad.ai</a>' },
  { file: 'typing-ugrad.html', id: 'typing', brand: 'typing.ugrad.ai', title: 'Typing — μgrad lab', h2: '⌨ WPM · rhythm', version: '0.3.0', storageKey: 'typing-ugrad-games-v1', bcChannel: 'ugrad-typing-board', hideBoardSize: true, exportNote: 'typing stub', cmdMeta: 'kbatch capsule cross-walk.', blurb: '<a href="kbatch.html" style="color:inherit;font-weight:600">kbatch</a> · <a href="visualspeed-ugrad.html" style="color:inherit;font-weight:600">visual speed</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">WPM + accuracy + heatmaps.</p>`, footExtra: ' · <a href="https://typing.ugrad.ai" target="_blank" rel="noopener">typing.ugrad.ai</a>' },
  { file: 'calligraphy-ugrad.html', id: 'calligraphy', brand: 'calligraphy.ugrad.ai', title: 'Calligraphy — μgrad lab', h2: '✒ Stroke paths', version: '0.3.0', storageKey: 'calligraphy-ugrad-games-v1', bcChannel: 'ugrad-calligraphy-board', hideBoardSize: true, exportNote: 'calligraphy stub', cmdMeta: 'Pressure + Bézier tensor.', blurb: 'Tablet / pencil vectors.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Stroke order + pressure curves.</p>`, footExtra: ' · <a href="https://calligraphy.ugrad.ai" target="_blank" rel="noopener">calligraphy.ugrad.ai</a>' },
  { file: 'robotics-ugrad.html', id: 'robotics', brand: 'robotics.ugrad.ai', title: 'Robotics — μgrad lab', h2: '⚙ Joint graph', version: '0.3.0', storageKey: 'robotics-ugrad-games-v1', bcChannel: 'ugrad-robotics-board', hideBoardSize: true, exportNote: 'robotics stub', cmdMeta: 'URDF / FK hooks.', blurb: '<a href="hexbench.html" style="color:inherit;font-weight:600">hexbench</a> hardware lane.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Joint graph + sim · kinematics viz.</p>`, footExtra: ' · <a href="https://robotics.ugrad.ai" target="_blank" rel="noopener">robotics.ugrad.ai</a>' },
  { file: 'cards-ugrad.html', id: 'cards', brand: 'cards.ugrad.ai', title: 'Cards / deck — μgrad lab', h2: '🂡 Deck entropy', version: '0.3.0', storageKey: 'cards-ugrad-games-v1', bcChannel: 'ugrad-cards-board', hideBoardSize: true, exportNote: 'cards stub', cmdMeta: 'Shuffle + hand-feature tensor.', blurb: 'Fisher–Yates · <a href="blackjack-ugrad.html" style="color:inherit;font-weight:600">blackjack</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Deck entropy + hand features (planned).</p>`, footExtra: ' · <a href="https://cards.ugrad.ai" target="_blank" rel="noopener">cards.ugrad.ai</a>' },
  { file: 'tarot-ugrad.html', id: 'tarot', brand: 'tarot.ugrad.ai', title: 'Tarot — μgrad lab', h2: '✦ Spreads', version: '0.3.0', storageKey: 'tarot-ugrad-games-v1', bcChannel: 'ugrad-tarot-board', hideBoardSize: true, exportNote: 'tarot stub', cmdMeta: 'Steno-hash deterministic draws.', blurb: 'Entertainment / design research.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Spread simulator + seeded draws.</p>`, footExtra: ' · <a href="https://tarot.ugrad.ai" target="_blank" rel="noopener">tarot.ugrad.ai</a>' },
  { file: 'cartomancy-ugrad.html', id: 'cartomancy', brand: 'cartomancy.ugrad.ai', title: 'Cartomancy — μgrad lab', h2: '♠ Narrative lanes', version: '0.3.0', storageKey: 'cartomancy-ugrad-games-v1', bcChannel: 'ugrad-cartomancy-board', hideBoardSize: true, exportNote: 'cartomancy stub', cmdMeta: 'DAC export on reads.', blurb: 'Playing-card lanes.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Narrative + prefix DAC export.</p>`, footExtra: ' · <a href="https://cartomancy.ugrad.ai" target="_blank" rel="noopener">cartomancy.ugrad.ai</a>' },
  { file: 'iching-ugrad.html', id: 'iching', brand: 'iching.ugrad.ai', title: 'I Ching — μgrad lab', h2: '☰ Hexagrams', version: '0.3.0', storageKey: 'iching-ugrad-games-v1', bcChannel: 'ugrad-iching-board', hideBoardSize: true, exportNote: 'iching stub', cmdMeta: 'Coin cast · line tensor.', blurb: 'Oracle lane · <a href="tarot-ugrad.html" style="color:inherit;font-weight:600">tarot</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Three-coin six-line cast · changing lines.</p>`, footExtra: ' · <a href="https://iching.ugrad.ai" target="_blank" rel="noopener">iching.ugrad.ai</a>' },
  { file: 'mahjong-ugrad.html', id: 'mahjong', brand: 'mahjong.ugrad.ai', title: 'Mahjong — μgrad lab', h2: '🀄 Wall + hand', version: '0.3.0', storageKey: 'mahjong-ugrad-games-v1', bcChannel: 'ugrad-mahjong-board', hideBoardSize: true, exportNote: 'mahjong stub', cmdMeta: '34×4 wall tensor · yaku.', blurb: '<a href="hanafuda-ugrad.html" style="color:inherit;font-weight:600">hanafuda</a> flower cards.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Draw/discard lab — yaku judge roadmap.</p>`, footExtra: ' · <a href="https://mahjong.ugrad.ai" target="_blank" rel="noopener">mahjong.ugrad.ai</a>' },
  { file: 'sports-field-ugrad.html', id: 'sportsfield', brand: 'sports.ugrad.ai', title: 'Sports field — μgrad lab', h2: '⚽ Pitch telemetry', version: '0.3.0', storageKey: 'sportsfield-ugrad-games-v1', bcChannel: 'ugrad-sportsfield-board', tensorDefault: 'pong-buckets', hideBoardSize: true, exportNote: 'sportsfield stub', cmdMeta: 'hexcast-stream hooks.', blurb: '<a href="hexcast.html" style="color:inherit;font-weight:600">hexcast</a> · <a href="pong-ugrad.html" style="color:inherit;font-weight:600">pong</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Pitch + ball telemetry → hexcast-stream.</p>`, footExtra: ' · <a href="https://pong.ugrad.ai" target="_blank" rel="noopener">pong.ugrad.ai</a>' },
  { file: 'blackjack-ugrad.html', id: 'blackjack', brand: 'blackjack.ugrad.ai', title: 'Blackjack — μgrad lab', h2: '♠ 21', version: '0.3.0', storageKey: 'blackjack-ugrad-games-v1', bcChannel: 'ugrad-blackjack-board', tensorDefault: 'gomoku-density', hideBoardSize: true, exportNote: 'blackjack stub', cmdMeta: 'Basic strategy tensor.', blurb: '<a href="cards-ugrad.html" style="color:inherit;font-weight:600">cards deck</a>.', center: `      <p style="margin:0;font:500 12px ui-sans-serif">Hit/stand vs dealer · soft 17 rule.</p>`, footExtra: ' · <a href="https://blackjack.ugrad.ai" target="_blank" rel="noopener">blackjack.ugrad.ai</a>' }
];

for (const g of GAMES) {
  if (SKIP_GENERATE.has(g.file)) {
    console.log('skip (hand-maintained)', g.file);
    continue;
  }
  const html = SHELL({
    ...g,
    refreshMs: 0
  });
  fs.writeFileSync(path.join(web, g.file), html, 'utf8');
  console.log('wrote', g.file);
}
