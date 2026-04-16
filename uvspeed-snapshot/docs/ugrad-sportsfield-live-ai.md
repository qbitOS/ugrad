# Sports field · live AI & broadcast context (μgrad)

This note ties **`web/sports-field-ugrad.html`** + **`hexcast-stream`** to how **professional** soccer and live events handle **predictive** and **visual** layers—without implying uvspeed ships vendor models or licensed feeds.

## Live predictive analysis (broadcast / data providers)

Top-tier leagues and vendors combine **high-frequency tracking** (often tens of Hz on players and ball) with **learned models** to produce:

| Idea | Typical role | uvspeed analog |
|------|----------------|----------------|
| **Goal / danger probability** | Near–real-time estimates of scoring threat from sequences | `ugrad-sportsfield-shot.js` **xG-style** heuristic + **goal-mouth** ray on the 105×68 m grid |
| **Win / draw / loss** dynamics | Probabilities updated as state changes | Not implemented—would need match state from a feed |
| **Positional forecasting** | Passing / movement likelihood from trajectories | **Sky view** trail + **flock** overlay (`ugrad-sportsfield-broadcast.js`) as a **toy** vector field |
| **Momentum / intensity** | Segments “hot” periods for graphics | Could extend `shotAnalysis` + rolling speed stats on `hexcast-stream` |

Providers often cited in industry coverage include **AWS** sports analytics stacks, **Genius Sports**, **Sportradar**, **Second Spectrum** (tracking density varies by league contract). uvspeed does **not** integrate those APIs; it exposes **channels** so *your* bridge can inject **`sportsfield-telemetry`**.

## “Dangerous attack” vs normal play (computer vision framing)

In full **computer-vision** pipelines, a **danger** score is usually built from **spatial** and **temporal** cues, for example:

1. **Ball–goal geometry** — depth into the final third / penalty area, angle to goal.
2. **Pressure / density** — defenders between ball and goal; free space for a shot.
3. **Ball velocity & control proxies** — acceleration toward goal, stable possession.
4. **Keeper geometry** — shooter vs goal line vs keeper position (when available).

Our **browser** stack approximates **(1)** and **(3)** with **meters + velocity** on a **2D** pitch; **(2)** and **(4)** need **multi-agent** positions (players + GK), which are **not** in the default grid—add them via your telemetry JSON or a future layer.

## Projection mapping vs DOM pitch

**Projection mapping** on real pitches/courts uses **calibrated** projectors, **media servers**, and **warp/blend** to paint video onto grass or ice—see [Projection mapping basics (Quince Imaging)](https://www.quinceimaging.com/projection-mapping-basics/) for hardware, software (e.g. Ventuz, MadMapper, Resolume, TouchDesigner), and venue tradeoffs.

The μgrad **sports field** page is a **coarse** **HTML/SVG** grid for **logic + telemetry**, not a substitute for **stadium** pixel calibration. The useful parallel is **storytelling**: both systems align **graphics** to a **known pitch coordinate system**—ours is **FIFA 105×68** meters and **IFAB** markings in **SVG**.

## Wire-up summary

| Transport | Purpose |
|-----------|---------|
| `BroadcastChannel('hexcast-stream')` | `sportsfield-ball`, `sportsfield-telemetry` |
| `BroadcastChannel('kbatch-transcript')` | kbatch teleprompter / DCA tail in sidebar |
| `SportsfieldPitch.applyExternalBallState` | Push tracker samples from JSON or native bridge |

For **live predictions** at production quality, plan an **offline or edge** CV/track pipeline → **JSON** or **WebSocket** → same telemetry shape; keep the **PWA** as the **control room** and **μgrad** training front-end.
