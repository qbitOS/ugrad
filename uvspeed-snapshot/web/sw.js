// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// Service Worker — Offline-first PWA cache for quantum notepad
// Phase 4.82 · Caches all 35 web apps + shared modules for full offline operation

const CACHE_NAME = 'uvspeed-v4.340';
const OFFLINE_URLS = [
    './',
    'quantum-notepad.html',
    'terminal.html',
    'terminal-manifest.json',
    'feed.html',
    'grid.html',
    'launcher.html',
    'sponsor.html',
    'brothernumsy.html',
    'hexcast.html',
    'hexcast-send.html',
    'hexcast-manifest.json',
    'kbatch.html',
    'blackwell.html',
    'questcast.html',
    'archflow.html',
    'jawta-audio.html',
    'github-dashboard.html',
    'research-lab.html',
    'hexbench.html',
    'numsy.html',
    'quantum-gutter.html',
    'freya.html',
    'freya-units.html',
    'freya-landing.html',
    'dither-landing.html',
    'iron-dispatch.html',
    'pong-base-box.html',
    'pong-base-box-uvqbit.html',
    'qpu-interactive-field.html',
    'interactive-pattern.html',
    'pad-grid.html',
    'pad-datatable.html',
    'qpu-depth-workbench.html',
    'qbitos-assets/Icon-iOS-ClearDark-1024x1024_1x-46179653-6b0a-45c2-b5fe-69ed037a5f3e.png',
    'qbitos-assets/Group_11-2-edeab60a-f02b-4cfe-a3b4-f68a41c57b1a.png',
    'qbitos-assets/Group_11-6_2-348c9369-6e7f-4168-9a4a-5a25232b0b92.png',
    'qbitos-assets/Group_11-6_3-a993f52e-4046-4610-a742-b970d75797ab.png',
    'qbitos-assets/Group_11-6_4-6e419efc-a44e-41b5-9c77-38675b7861be.png',
    'qbitos-assets/Group_11-2-cdf57ae2-77fe-4b25-892a-18b6868868cc.png',
    'qbitos-assets/Group_11-6_4-ab33f693-8d21-4582-9fc9-fb0b91be9e02.png',
    'qbitos-assets/Group_11-6_5-b0a626fd-e298-42b9-b228-2ade0552b719.png',
    'qbitos-assets/Group_11-6_6-6e53dabf-f41e-4ea2-8e6a-88b9ca09576d.png',
    'qbitos-assets/Group_11-5_1-9dcfc74d-791a-4446-ba6f-c25ff0d74af1.png',
    'history.html',
    'search.html',
    'flow/index.html',
    'flow/flow-manifest.json',
    'mueee.html',
    'mue.html',
    'codestral-chat.html',
    'qa.html',
    'uvqbit.html',
    'qbit-globe.html',
    'qbit-core-race.html',
    'gridlock.html',
    'notes.html',
    'throughline-lab.html',
    'qbit-search.html',
    'qbit-medical.html',
    'qbit-studio.html',
    'nterminal.html',
    'plan-viewer.html',
    'qbit-raw.html',
    'qbit-raw-v1.html',
    'qbit-raw-v2.html',
    'qbit-raw-v3.html',
    'quantum-prefixes.js',
    'uvspeed-icons.js',
    'vendor-icons.css',
    'search-icons.css',
    'mueee-icons.css',
    'ugrad-game-registry.js',
    'ugrad-corpus-export.js',
    'ugrad-go-ascii.js',
    'qbit-dac.js',
    'qbit-steno.js',
    'lab-markets-skyview.js',
    'isomorphic-export-facet.js',
    'spine-hub-catalog.js',
    'mueee-throughline-spine.js',
    'mueee-mu-context.js',
    'mueee-mistral-bridge.js',
    'compression-staging-lab.html',
    'pretext-justification/index.html',
    'pretext-justification/pretext.js',
    'pretext-justification/pretext-justification.css',
    'pretext-justification/pretext-justification-boot.js',
    'qbitos-assets/graph-stroke-ref.svg',
    'qbitos-assets/symphony-demo.mp4',
    'qbit-steno-term.html',
    'qbit-steno-pad.html',
    'micrograd-steno.html',
    'ugrad-r0.html',
    'ugrad-pad-lab.html',
    'ugrad-hub-live.css',
    'ugrad-hub-live.js',
    'go-ugrad.html',
    'go-ugrad-monitor.html',
    'hub-ugrad-monitor.html',
    'games-ugrad-hub.html',
    'games-ugrad-terminal.html',
    'qbitos-gameHUB/index.html',
    'qbitos-gameHUB/ATTRIBUTION.md',
    'raw-games-ugrad.html',
    'raw/feeds.json',
    'raw/go/leaderboard.json',
    'raw/digital-alphabet/leaderboard.json',
    'raw/corpus/sample-export.ndjson',
    'digital_alphabet.html',
    'da-terminal-leaderboard.js',
    'webgrid-ugrad.html',
    'gomoku-ugrad.html',
    'arena-ugrad.html',
    'sports-field-ugrad.html',
    'snake-ugrad.html',
    'mancala-ugrad.html',
    'backgammon-ugrad.html',
    'battleship-ugrad.html',
    'hanafuda-ugrad.html',
    'kobenhavn-ugrad.html',
    'chess-ugrad.html',
    'checkers-ugrad.html',
    'pong-ugrad.html',
    'cards-ugrad.html',
    'tarot-ugrad.html',
    'cartomancy-ugrad.html',
    'iching-ugrad.html',
    'mahjong-ugrad.html',
    'blackjack-ugrad.html',
    'ugrad-numsy-footer.css',
    'ugrad-numsy-footer.js',
    'ugrad-chess-lab.js',
    'ugrad-go-board-theme.css',
    'ugrad-game-presence.js',
    'ugrad-game-chrome.css',
    'ugrad-lab-shell.css',
    'ugrad-game-chrome.js',
    'kbatch-translate.js',
    'ugrad-kbatch-lang-bar.js',
    'ugrad-tensor-envs.js',
    'ugrad-parity-lab.css',
    'ugrad-parity-lab.js',
    'ugrad-sportsfield-pitch.css',
    'ugrad-sportsfield-presets.js',
    'ugrad-sportsfield-pitch.js',
    'ugrad-sportsfield-shot.js',
    'ugrad-sportsfield-broadcast.js',
    'ugrad-sportsfield-vision.js',
    'ugrad-webgrid-ttrpg.css',
    'ugrad-webgrid-ttrpg.js',
    'rubiks-ugrad.html',
    'cupstack-ugrad.html',
    'flashcards-ugrad.html',
    'mindmaze-ugrad.html',
    'memory-ugrad.html',
    'ugrad-memory-lab.css',
    'ugrad-memory-lab.js',
    'visualspeed-ugrad.html',
    'dexterity-ugrad.html',
    'math-ugrad.html',
    'language-ugrad.html',
    'typing-ugrad.html',
    'calligraphy-ugrad.html',
    'robotics-ugrad.html',
    'digital_alphabet.html',
    'glyph.html',
    'digital-alphabet-tabs.js',
    'uterm.html',
    'iron-browser.html',
    'plan-corpus-indexer.js',
    'history-search-engine.js',
    'search-transcript-pipelines.js',
    'search-spine-concepts.js',
    'search-drill-cluster.js',
    'search-staff-bar.css',
    'search-staff-bar.js',
    'manifest.json',
    '../icons/nyan-banner.png',
    '../icons/favicon.png',
    '../icons/favicon.ico',
    '../icons/icon-192.png',
    '../icons/hexterm-192.png',
    '../icons/hexterm-512.png',
    '../icons/hexterm-favicon.png',
    '../icons/ugrad-mu-icon-1024.png',
];

// Install — pre-cache core shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(OFFLINE_URLS).catch(() => {
                // Individual failures are OK — cache what we can (no console spam; optional assets may 404)
                return Promise.allSettled(OFFLINE_URLS.map((url) => cache.add(url).catch(() => undefined)));
            });
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network-first with cache fallback
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET, API calls, and cross-origin except CDN
    if (e.request.method !== 'GET') return;
    if (url.pathname.startsWith('/api/')) return;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Clone and cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Network failed — serve from cache
                return caches.match(e.request).then(cached => {
                    if (cached) return cached;
                    // For navigation requests, return the cached notepad
                    if (e.request.mode === 'navigate') {
                        return caches.match('quantum-notepad.html');
                    }
                    return new Response('Offline — cached version not available', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});

// Listen for skip-waiting message from clients (used by pull-to-refresh)
self.addEventListener('message', (e) => {
    if (e.data === 'skipWaiting') self.skipWaiting();
});
