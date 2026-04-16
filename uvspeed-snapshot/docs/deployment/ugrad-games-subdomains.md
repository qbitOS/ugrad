# go.ugrad.ai · chess.ugrad.ai · … — μgrad game surfaces

Single repo serves all arenas from `web/`. Subdomains need a **Worker** (or redirect) the same way as [`glyph-subdomains.md`](./glyph-subdomains.md).

## Static files

| Host (example) | Entry HTML |
|----------------|------------|
| `go.ugrad.ai` | `web/go-ugrad.html` |
| `webgrid.ugrad.ai` | `web/webgrid-ugrad.html` |
| `games.ugrad.ai` | `web/games-ugrad-hub.html` |
| `raw.games.ugrad.ai` | `web/raw-games-ugrad.html` — mapped in `HOST_MAP` in [`ugrad-games-subdomain-worker.js`](../../cloudflare/ugrad-games-subdomain-worker.js) |
| `install.games.ugrad.ai` (optional) | `web/games-ugrad-terminal.html` — terminal install, npm `ugrad-cli`, benchmarks, sync |
| `chess.ugrad.ai` | `web/chess-ugrad.html` |
| `checkers.ugrad.ai` | `web/checkers-ugrad.html` |
| `pong.ugrad.ai` | `web/pong-ugrad.html` |
| `cards.ugrad.ai` | `web/cards-ugrad.html` |
| `tarot.ugrad.ai` | `web/tarot-ugrad.html` |
| `cartomancy.ugrad.ai` | `web/cartomancy-ugrad.html` |
| `iching.ugrad.ai` | `web/iching-ugrad.html` |
| `mahjong.ugrad.ai` | `web/mahjong-ugrad.html` |
| `blackjack.ugrad.ai` | `web/blackjack-ugrad.html` |

**Go** is the first **full** lab: 19×19 board, 9-cell tensor slice (same shape as `ugrad-r0` `Datasets.goboard`), training snapshots, `localStorage` games, JSON export, optional AI from trained MLP weights. μgrad arena pages (chess, checkers, pong, mahjong, I Ching, 21, etc.) are **playable shells** with shared `ugrad-numsy-footer` (Brother Numsy) + roadmap for heads / online play.

## Cloudflare Worker

Use [`cloudflare/ugrad-games-subdomain-worker.js`](../../cloudflare/ugrad-games-subdomain-worker.js).

1. DNS: CNAME each host → your Pages target (or attach Worker route only).
2. Worker env **`PAGES_WEB_ORIGIN`**: e.g. `https://qbitos.github.io/uvspeed/web`
3. Routes: one route per hostname `*.ugrad.ai/*` or separate routes per subdomain.

The worker maps **host → default path** when `pathname` is `/`, and proxies **`/quantum-prefixes.js`**, **`/sw.js`**, and other `web/` assets under `PAGES_WEB_ORIGIN`. Paths under **`/icons/`** resolve against the GitHub Pages **site root** (repo root on Pages), not `web/`, so `icons/favicon.png` keeps working.

## Offline

`sw.js` includes `go-ugrad.html`, `games-ugrad-hub.html`, and stub pages in the precache list (bump `CACHE_NAME` when adding games).

## See also

- **[Online roadmap](../ugrad-games-online-roadmap.md)** — leaderboards, live play, rankings, i18n/device matrix, phased delivery (DB + Workers + WebSocket). **§8 Server layer at a glance (setting prepare)** — architecture table, P0 API slice, GPU/QPU/auth notes for hub shells.

## IP & compliance (hub)

- **`games-ugrad-hub.html`** documents **original inline SVG** thumbnails only, generic rule names, and the **quantum stack** (`quantum-prefixes.js`, `qbit-dac.js`, `qbit-steno.js`, `sw.js`, presence, QUANTUM PREFIX LIVE SYNC). No third-party game art or trademarked logos in the hub.
- **Twisty cube** stub: user-facing copy uses **“cube puzzle”**; file remains `rubiks-ugrad.html` for stable URLs — not affiliated with third-party cube brands.
