# μgrad arena CLI (kbatch + HexTerm)

Primary entry points for listing/opening μgrad arena HTML shells and tensor hooks — **not** uterm (L0 terminal stays training-focused until arenas stabilize).

### zsh / Terminal.app (`command not found: ugrad`)

`ugrad` is **not** a POSIX binary. From a Mac shell use **`npm/ugrad-cli`** to open the PWA, then type commands in **HexTerm**:

```bash
cd /path/to/uvspeed
npx ugrad-cli open        # → terminal.html
npx ugrad-cli raw         # → raw-games-ugrad.html
```

Or open GitHub Pages: `https://qbitos.github.io/uvspeed/web/terminal.html`

**Install page (hub toolbar):** `games-ugrad-terminal.html` — linked from **games-ugrad-hub** header as **terminal install** (`npx ugrad-cli`, benchmarks, sync).

**npm / uv-style shorthand:** after `ugrad games` (the “index”), run **`ugrad <id>`** to open an arena — e.g. **`ugrad go`** opens the Go board (`go-ugrad.html`). Same as **`ugrad open go`**. Full tensor evolution / `pathlanes` / `preflight` text pipelines stay on **kbatch**.

## Registry

`web/ugrad-game-registry.js` defines `window.UgradGameRegistry` with:

- **`GAMES`** — id, `file`, title, lane, `channels[]`, flags
- **`find(query)`** / **`open(query, opts)`** — resolves id; emits **`BroadcastChannel('ugrad-cli')`** `{ type: 'open-game', ... }`, then opens the file
- **`trainTensor(env, steps)`** → **`ugrad-tensor-train`**
- **`trainUgrad(dataset)`** → **`ugrad-training`**

## kbatch terminal

| Command | Action |
|--------|--------|
| `ugrad games` | List all arenas from the registry |
| `ugrad <id>` | Open arena (e.g. `ugrad go` → Go board) |
| `ugrad open <id>` | Same as `ugrad <id>` |
| `ugrad tensor send [env] [steps]` | Dispatch `ugrad-tensor-train` (default env `go-board`, steps `80`) |
| `ugrad tensor …` | *(existing)* tensor evolution packet |

Existing **`ugrad pathlanes`** / **`ugrad preflight`** unchanged.

## HexTerm (`terminal.html`)

| Command | Action |
|--------|--------|
| `ugrad games` | List arenas |
| `ugrad <id>` | Open arena (e.g. `ugrad go`) |
| `ugrad open <id>` | Same |
| `ugrad help` | Short help |
| `arena` or `games` | List arenas |
| `arena <id>` | Open (e.g. `arena go`) |
| `arena open <id>` | Same as kbatch `ugrad open` |
| `arena tensor send <env> [steps]` | Tensor train dispatch |
| `goboard watch` / `goboard off` | ASCII Go board (**live** via `ugrad-go-board` — enable **Broadcast** in `go-ugrad.html`) |

**Corpus export:** `games-ugrad-hub.html` → **Export corpus snapshot (JSONL)** (`ugrad-corpus-export.js`). See **`docs/ugrad-enterprise-readiness.md`** for Worker/D1 scale-up.

## Other apps

- **FreyaUnits** (`freya.html`): **μ Arenas** tab — mathjs statistics on the registry (`mean`, `std`, … on `sessionCounts` / `channelCounts`), Plotly lane bar chart, per-game session counts via `ugrad-game-presence.js` (same-origin tab heartbeats). Footer still links **kbatch** / **HexTerm** for opening games.
- **games-ugrad-hub.html**: toasts on **`ugrad-cli`** `open-game` when another tab opens an arena.

## Verify shells

```bash
nu scripts/ugrad-arena-audit.nu
```

## Server / live devices

Training from the browser uses **`BroadcastChannel`** to tabs running μgrad (e.g. `ugrad-r0.html`). A server can mirror the same channel names over WebSocket; the registry names are the stable contract.
