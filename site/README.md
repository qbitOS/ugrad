# μgrad R0 — static site bundle

Forward-facing, **self-contained** copy of the μgrad R0 PWA and its shared `web/` dependencies from **[qbitOS/uvspeed](https://github.com/qbitOS/uvspeed)**.

Use this folder to:

- **Deploy** (GitHub Pages, Cloudflare Pages, any static host) without the full monorepo.
- **Iterate** alongside org docs in this repo while tracking upstream in uvspeed.
- **Diff** against `workspace/uvspeed/web/` after refreshing copies (see [SYNC.md](SYNC.md)).

## Entry points

| URL | Role |
|-----|------|
| [index.html](index.html) | Redirect / link shell → `ugrad-r0.html` |
| [ugrad-r0.html](ugrad-r0.html) | Main app (R0–R4 staircase, extensions) |
| [manifest.json](manifest.json) | PWA manifest (`start_url`: `ugrad-r0.html`) |
| [sw.js](sw.js) | Minimal offline cache for **this directory only** |

## Upstream

Canonical sources live under the uvspeed monorepo:

- `web/ugrad-r0.html` — line-for-line base (this copy patches `icons/` to live under `site/icons/`)
- `web/quantum-prefixes.js`, `qbit-dac.js`, `qbit-steno.js`, `qbit-preflight.js`, `plan-corpus-indexer.js`, `ugrad-worker.js`, `ugrad-sportsfield-ugrad-bridge.js`, `ugrad-lounge.js`
- `web/wasm/*` — prefix-engine JS + `prefix_engine_bg.wasm` (run `bash scripts/build-wasm.sh` in uvspeed if missing)
- `web/calibrations/ibm_*.csv`
- `icons/favicon.ico`, `favicon.png`, `icon-192.png`, `hexterm-512.png`

Refresh everything with **`../scripts/sync-site-from-uvspeed.sh`** (see [SYNC.md](SYNC.md)).

Full-tree development: use **`./scripts/link-uvspeed-workspace.sh`** → **`workspace/uvspeed`** (see [../WORKSPACE.md](../WORKSPACE.md)).

## Dev server

From this directory:

```bash
cd site && python3 -m http.server 8765
# open http://127.0.0.1:8765/ugrad-r0.html
```

Telemetry (`localhost:8400`) and quantum bridge (`ws://localhost:8086`) remain optional local-only features.
