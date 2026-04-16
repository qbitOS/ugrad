// beyondBINARY quantum-prefixed | ugrad site bundle | service worker
// Offline cache for site/ — refresh via scripts/sync-site-from-uvspeed.sh
const CACHE_NAME = 'ugrad-r0-site-v2';
const SHELL = [
  './',
  'index.html',
  'ugrad-r0.html',
  'quantum-prefixes.js',
  'qbit-dac.js',
  'qbit-steno.js',
  'qbit-preflight.js',
  'plan-corpus-indexer.js',
  'ugrad-worker.js',
  'ugrad-sportsfield-ugrad-bridge.js',
  'ugrad-lounge.js',
  'wasm/prefix_engine.js',
  'wasm/prefix_engine_bg.wasm',
  'manifest.json',
  'icons/favicon.ico',
  'icons/favicon.png',
  'icons/icon-192.png',
  'icons/hexterm-512.png',
  'calibrations/ibm_torino.csv',
  'calibrations/ibm_marrakesh.csv',
  'calibrations/ibm_fez.csv',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL).catch(() =>
        Promise.allSettled(SHELL.map((url) => cache.add(url).catch(() => undefined)))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') {
            return caches.match('ugrad-r0.html');
          }
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
      )
  );
});
