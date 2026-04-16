# Refreshing `site/` from uvspeed

**Source of truth:** [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) — `web/` tree.

From the **ugrad** repo root:

```bash
export UVSPEED="${UVSPEED:-$HOME/dev/projects/uvspeed}"
./scripts/sync-site-from-uvspeed.sh
```

This copies everything **ugrad-r0.html** loads at runtime (scripts, worker, WASM, calibrations, icons) into **`site/`**.

## Files synced (see `scripts/sync-site-from-uvspeed.sh`)

| Role | Files |
|------|--------|
| App shell | `ugrad-r0.html` |
| Gluelam stack | `quantum-prefixes.js`, `qbit-dac.js`, `qbit-steno.js`, `qbit-preflight.js`, `plan-corpus-indexer.js` |
| Workers / extra | `ugrad-worker.js`, `ugrad-sportsfield-ugrad-bridge.js`, `ugrad-lounge.js` |
| WASM (optional `tensor` / loadWasmMatmul) | `wasm/prefix_engine.js`, `wasm/prefix_engine_bg.wasm`, typings |
| Preflight calibrations | `calibrations/ibm_*.csv` |
| Icons | `icons/favicon.ico`, `favicon.png`, `icon-192.png`, `hexterm-512.png` |

**Not included** (open separately from full uvspeed `web/`): `ugrad-pad-lab.html`, other `ugrad-*.html` — add manual copies if you need them in this bundle.

If `web/wasm/` is empty, build in uvspeed: `bash scripts/build-wasm.sh`.

After syncing, **`CACHE_NAME` in `sw.js`** is bumped when this list changes so clients refetch (edit `site/sw.js` if you add assets manually).
