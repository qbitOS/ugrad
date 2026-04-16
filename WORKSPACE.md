# μgrad workspace — all working components in one tree

This folder is the **qbitOS/ugrad** org repo. **Runnable μgrad code** lives in the **[qbitOS/uvspeed](https://github.com/qbitOS/uvspeed)** monorepo (shared `web/` modules, CLI, qbit docs, Workers).

## One-place layout

1. Clone or keep this repo at e.g. `/Volumes/qbitOS/00.dev/ugrad`.
2. **Link** the monorepo next to it (default `../uvspeed`) or set `UVSPEED`:

   ```bash
   ./scripts/link-uvspeed-workspace.sh
   ```

3. After linking you have:

   ```
   ugrad/
     workspace/
       uvspeed/   → symlink to full uvspeed checkout
       README.md
       ugrad-paths.md
       ugrad-component-manifest.json
   ```

   **Everything** you need to edit μgrad PWAs, CLI, scripts, and docs appears under **`workspace/uvspeed/`** (same as opening uvspeed directly).

## Why a symlink

`web/ugrad-r0.html` and sibling `*ugrad*` files **load** `quantum-prefixes.js`, `qbit-dac.js`, `sw.js`, etc. from the **same** `web/` tree. Copying only `*ugrad*` files into this repo breaks those imports. The full monorepo link is the supported working surface.

## Deployable copy (`site/`)

For **static hosting** without the full tree, this repo includes **`site/`** — a curated copy of R0 plus those shared modules, calibration CSVs, icons, a μgrad-specific `manifest.json`, and a minimal `sw.js`. Refresh from your uvspeed checkout with **`./scripts/sync-site-from-uvspeed.sh`**. See **[site/README.md](site/README.md)**.

## Regenerate manifest

With `workspace/uvspeed` linked (or set `UVSPEED` to a checkout):

```bash
UVSPEED="${HOME}/dev/projects/uvspeed" python3 scripts/generate-ugrad-manifest.py
```
