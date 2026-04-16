# μgrad raw HTTP feeds (GitHub Pages)

Static JSON / NDJSON under `web/raw/` for **click-through** URLs and agents. They are **not** auto-synced from browsers: client-side truth remains `localStorage` and `BroadcastChannel` until **Worker + D1** (or similar) ingests events.

## Default canonical base (optional org site)

If you publish a **`ugrad.github.io`** site whose docroot maps to this repo’s `web/raw/`, then:

| Feed | URL |
|------|-----|
| Manifest | `https://ugrad.github.io/raw/feeds.json` |
| Go LB placeholder | `https://ugrad.github.io/raw/go/leaderboard.json` |
| Digital alphabet LB placeholder | `https://ugrad.github.io/raw/digital-alphabet/leaderboard.json` |
| Corpus sample line | `https://ugrad.github.io/raw/corpus/sample-export.ndjson` |

## This repo’s GitHub Pages (fornevercollective)

With default Pages layout, paths are under the repo URL, e.g.:

`https://qbitos.github.io/uvspeed/web/raw/feeds.json`

Open **`raw-games-ugrad.html`** — it lists **same-origin** and **`ugrad.github.io/raw`** links. Override base with query: `?feed_base=https://example.com/custom/raw`

## Compliance

Registry rows describe **demos/labs**, not a guarantee of third-party IP clearance or enterprise certification. See `docs/ugrad-enterprise-readiness.md`.
