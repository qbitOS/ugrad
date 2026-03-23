# μgrad — working paths (inside `workspace/uvspeed`)

All paths are relative to the **uvspeed** repo root.

## Core

| Path | Notes |
|------|------|
| `web/ugrad-r0.html` | R0–R4 staircase, extensions, Iron Line hooks |
| `web/micrograd-steno.html` | Legacy μgrad terminal |
| `npm/ugrad-cli/` | `npx` / `ugrad` CLI entry |

## qbit + docs

| Path | Notes |
|------|------|
| `qbit/ugrad/README.md` | μgrad index in qbit tree |
| `docs/ugrad-*.md` | Enterprise, roadmap, feeds, arena CLI |
| `docs/deployment/ugrad-games-subdomains.md` | Worker + DNS |

## Edge

| Path | Notes |
|------|------|
| `cloudflare/ugrad-games-subdomain-worker.js` | games.*.ugrad.ai routing |

## Web surface (glob)

`web/*ugrad*` — HTML/CSS/JS for games, labs, tensor envs, pad lab, webgrid, memory lab, etc. (see manifest JSON).
