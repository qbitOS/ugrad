# μgrad games — online DB, leaderboard, live play, rankings & accreditation

This document sketches **how to grow** `*.ugrad.ai` from static PWAs + `localStorage` into a **networked arena**: durable game records, leaderboards, cross-user play/training, concurrency, and **optional** institutional hooks.

> **Scope:** Architecture and phased delivery. “Major accreditation” in the legal sense (degrees, CE credits) is **out of band** for a game server; this doc covers **technical identity + attestations** you can wire to real programs.

---

## 1. Growing a database + leaderboard

### 1.1 What to store (per game / per user)

| Entity | Examples |
|--------|----------|
| **User** | opaque id, display name, locale, rating per ruleset |
| **Game record** | rules version (`go-ugrad` capture+s suicide, etc.), moves JSON, result, timestamps, device class |
| **Leaderboard row** | game id, metric (Elo, win %, puzzle streak), period (daily / weekly / all-time) |

**Go** moves should stay compatible with existing export (`go-ugrad-position.json`) and extend with `serverId`, `opponentId`, `rules`.

### 1.2 Backend options (fits Cloudflare-heavy stack)

| Layer | Use case |
|-------|----------|
| **D1** (SQLite) or **Postgres** (Neon, Supabase) | Relational: users, games, ratings history, clubs |
| **KV / Durable Objects** | Fast leaderboards, presence, match rooms |
| **R2** | SGF / JSON exports, replay blobs |
| **Worker** (already used for subdomains) | API routes: submit game, fetch ladder, WebSocket upgrade |

Start minimal: **POST /v1/games** with signed JWT + **GET /v1/leaderboard?game=go&period=week**.

---

## 2. Language / keyboard / device support (all hub games)

Apply **uniformly** to every `*-ugrad.html` shell:

| Area | Practice |
|------|----------|
| **i18n** | `lang` on `<html>`, externalize strings → JSON bundles; `dir="rtl"` when adding Arabic/Hebrew |
| **Keyboard** | All actions reachable without pointer; visible focus rings; shortcuts documented (e.g. `Pass`, `Undo`) |
| **Input** | `inputmode` where numeric; don’t steal focus from screen readers during play |
| **Touch** | `touch-action` on boards (already on `go-ugrad` SVG); min 44×44 px hit targets for toolbars |
| **Gamepad** | `navigator.getGamepads()` + mapping table for future “arcade” modes |
| **Motion** | Respect `prefers-reduced-motion` for animations |
| **Assistive** | `aria-label` on SVG boards, live regions for move log |

**Implementation path:** shared `web/ugrad-games-a11y.js` (optional) + CSS tokens in `quantum-theme.css` for focus-visible.

---

## 3. Compete / train / learn with other `*.ugrad.ai` users (online)

### 3.1 Transport

- **WebSocket** (or **WebRTC data channel** after signaling) for move relay.
- **Server authoritative** rules: client sends *intent* (`{x,y,color}`), server runs same `applyMoveWithCapture` logic (Rust/WASM port later) and broadcasts state.

### 3.2 Identity (lightweight)

- **Anonymous** session id in cookie + optional **OAuth** (GitHub / Google) via Worker.
- **No shared secret in client**: HMAC or JWT issued by Worker after login.

### 3.3 Training / learning

- **Shared positions**: upload JSON to server; link in lobby (“study this export”).
- **Spectator URLs**: read-only WebSocket room.
- **μgrad bridge**: Iron Line / `quantum-prefixes` `broadcastState` stays **local**; online layer duplicates minimal state to server for matchmaking only.

---

## 4. Live mode: multiple games + CPU / GPU / QPU

### 4.1 Parallel games in the browser

- **One tab per game** is simplest; **SharedWorker** or **BroadcastChannel** (already in stack) to sync “session” metadata.
- **Web Workers** for heavy engines (chess, future Go MCTS) so UI thread stays 60fps.
- **Cap detection**: `navigator.hardwareConcurrency`, `navigator.gpu` (WebGPU), optional WASM feature flags; **adaptive** max concurrent live games (e.g. 1–4).

### 4.2 QPU path

- Reuse existing **preflight / calibration** story (`qbit-preflight.js`): queue **circuit jobs**; **never** block gameplay on QPU latency—show “quantum verify pending” async.

### 4.3 Succession (turn-based / async)

- **Correspondence** mode: moves stored server-side; push via **Web Push** (service worker) when opponent moves.

---

## 5. Ranking systems

| System | When |
|--------|------|
| **Elo** | Simple two-player zero-sum; easy to explain |
| **Glicko-2** | Better with irregular play and newcomers |
| **Provisional** | First N games high K; decay inactive |

Store **per ruleset** (`go-19-capture-v1`) so rule changes don’t corrupt ladders.

---

## 6. Affiliations & “accreditation” (technical)

| Goal | Mechanism |
|------|-----------|
| **Club / school tag** | `organization_id` on user; admin invites |
| **Institutional SSO** | SAML / OIDC via same Worker (Cloudflare Access or custom) |
| **Verifiable credential** (advanced) | W3C VC JSON-LD issued by partner LMS; store **hash** only on your DB |

**Disclaimer:** In-app badges are **not** legal accreditation; partner with accredited bodies for real credit pathways.

---

## 7. Suggested delivery phases

1. **P0** — Serverless DB + anonymous submit + read-only leaderboard API.
2. **P1** — Auth + user profiles + Elo.
3. **P2** — WebSocket rooms + server-validated Go moves.
4. **P3** — Correspondence + push; clubs/teams.
5. **P4** — Institutional SSO + optional VC hashes.

---

## 8. Server layer at a glance (setting prepare)

**Yes — but it needs a server layer** (not static Pages alone). Today the games are **static PWAs** + `localStorage` / JSON export. To grow a **database**, **leaderboards**, **live play** vs other `*.ugrad.ai` users, and **rankings**, you add **services** next to your existing Cloudflare Worker path:

| Piece | Role |
|-------|------|
| **DB** (e.g. D1, Neon, Supabase) | Users, games, moves, results, rating history |
| **KV / Durable Objects** | Fast ladders, presence, match rooms |
| **Worker + WebSocket** | Matchmaking, **authoritative move validation** (same rules as `go-ugrad`), sync |
| **Auth** | OAuth (GitHub/Google) or anonymous + upgrade |
| **Ranking** | Elo or **Glicko-2**, **per ruleset** (`go-19-capture-v2`, etc.) so rule changes don’t corrupt ladders |

**GPU / CPU / QPU:** Browsers can run multiple games with **Web Workers** + adaptive caps (`hardwareConcurrency`, WebGPU). **QPU** should stay **async** (queue + preflight), never blocking live play.

**Language / keyboard / device:** Cross-cutting — **i18n** bundles, `dir`, focus/shortcuts, touch targets, gamepad, `prefers-reduced-motion`. The checklist in **§2** applies to every hub shell.

**“Major affiliations / accreditation”:** Real accreditation is **legal/programmatic** (universities, federations). In software you can support **org SSO** (SAML/OIDC), club/team ids, and optionally **hashes** of verifiable credentials — **in-app badges ≠ legal accreditation** (see **§6**).

**Smallest vertical slice (P0):** `POST /v1/games` + `GET /v1/leaderboard` on a Worker with **D1**, still using the existing **JSON export shape** from `go-ugrad` (extend with `serverId`, `rulesVersion`).

---

## 9. Repo touchpoints

- Static routing: [`docs/deployment/ugrad-games-subdomains.md`](./deployment/ugrad-games-subdomains.md)
- Worker: [`cloudflare/ugrad-games-subdomain-worker.js`](../cloudflare/ugrad-games-subdomain-worker.js)
- Local state today: `go-ugrad` `localStorage` + JSON export

---

## 10. References (external)

- [Rules of Go](https://en.wikipedia.org/wiki/Rules_of_Go) — rule versions for rated play  
- [Go equipment](https://en.wikipedia.org/wiki/Go_equipment) — presentation only; rules are separate
