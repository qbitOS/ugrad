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

## Regenerate manifest

With `workspace/uvspeed` linked (or set `UVSPEED` to a checkout):

```bash
UVSPEED="${HOME}/dev/projects/uvspeed" python3 scripts/generate-ugrad-manifest.py
```
