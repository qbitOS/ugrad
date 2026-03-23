# uvspeed workspace (linked monorepo)

μgrad **apps and tooling** live inside the **[qbitOS/uvspeed](https://github.com/qbitOS/uvspeed)** monorepo. PWAs under `web/` share `quantum-prefixes.js`, `qbit-dac.js`, `sw.js`, etc., so this folder holds a **symlink** to a full checkout — not a partial copy.

## Link

From the repo root:

```bash
./scripts/link-uvspeed-workspace.sh
```

By default `workspace/uvspeed` → `../uvspeed` (sibling of this repo). Override:

```bash
UVSPEED="${HOME}/dev/projects/uvspeed" ./scripts/link-uvspeed-workspace.sh
```

## After linking

| Path | Role |
|------|------|
| `workspace/uvspeed/web/ugrad-r0.html` | Canonical R0 μgrad terminal |
| `workspace/uvspeed/web/*ugrad*` | Games, labs, arenas, shared `ugrad-*.js` |
| `workspace/uvspeed/npm/ugrad-cli/` | npm CLI for ugrad |
| `workspace/uvspeed/qbit/ugrad/` | qbit doc index for μgrad |
| `workspace/uvspeed/docs/ugrad-*.md` | ugrad-specific docs |
| `workspace/uvspeed/cloudflare/ugrad-games-subdomain-worker.js` | Edge routing for games subdomains |

See **[ugrad-paths.md](ugrad-paths.md)** and **[ugrad-component-manifest.json](ugrad-component-manifest.json)**.

## Dev server

Run static server and open from **`workspace/uvspeed/web/`** (see uvspeed `README` / `scripts/`).

The symlink is **gitignored**; each machine runs `./scripts/link-uvspeed-workspace.sh` after clone.
