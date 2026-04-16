# μgrad arenas — enterprise / LLM-agent readiness

Target: **high-volume** event streams (e.g. **50k–200k+ requests/day** to inference or telemetry APIs) without losing **DAC / quantum gutter / Iron Line / steno / contrail** context for researchers (search, history, Freya, kbatch, HexTerm, external LLMs).

## What is ready in-repo (static + BroadcastChannel)

| Piece | Role |
|--------|------|
| **`ugrad-corpus-export.js`** | Browser-side **NDJSON** snapshot: meta line + registry snapshot + `localStorage` presence keys + optional **`UgradCorpusLog`** append-only rows |
| **`raw-games-ugrad.html`** | **Apache-style** HTML table + `pre` blocks for registry / presence / corpus / Digital alphabet LB (deploy as **`raw.games.ugrad.ai`**) |
| **`npm/ugrad-cli`** | **`npx ugrad-cli open`** — opens `terminal.html` from zsh (μgrad commands still run **in HexTerm**, not in shell) |
| **Hub “Export corpus snapshot (JSONL)”** | One-click download for offline analysis / batch upload |
| **`ugrad-go-ascii.js` + HexTerm `goboard watch`** | **ASCII Go** in terminal, **live-synced** to `go-ugrad.html` via **`BroadcastChannel('ugrad-go-board')`** (`go-ugrad-state`) |
| **`go-ugrad.html` broadcast** | Authoritative move list + clocks for mirror / terminal / monitor |

## IP / “enterprise launch” reality check

The **registry** on `raw-games-ugrad.html` lists **web demos and labs**, not products that have been **individually cleared** for third-party IP, a11y, or regional compliance. Treat public demos as **R&D / research** until you run your own legal + product review. **Durable, global** leaderboards and audit trails still require **Worker + D1** (or equivalent), not static Pages JSON alone.

## What is not ready (required for global scale)

| Gap | Mitigation |
|-----|------------|
| **No durable server log** | **Worker + D1 / queue** (or Postgres) ingesting NDJSON or JSON POSTs; partition by `gameId` + `tenant` |
| **Browser `localStorage` caps** | Ship events to server with **retry + batch**; cap client buffer (see `MAX` in `ugrad-corpus-export.js`) |
| **PII / consent** | Policy gate before export; hash `source` ids in shared logs |
| **Rate limits** | Per-API-key quotas on Worker; sample high-frequency `go-ugrad-state` (e.g. 1 Hz max) |

## Suggested ingestion shape (extend NDJSON)

Each line should remain **JSON** with stable `type` and optional **`quantumGutter`** / **`dac`** / **`ironLine`** / **`steno`** blobs as game shells implement them — aligned with **§8** in `docs/ugrad-games-online-roadmap.md`.

## Agent-facing surface

- **List / open**: `ugrad games`, `ugrad <id>` (kbatch + HexTerm)
- **Live Go ASCII**: `goboard watch` + **Broadcast** on in `go-ugrad.html`
- **Corpus pull**: hub **Export corpus snapshot (JSONL)** + future **`POST /v1/events`**
