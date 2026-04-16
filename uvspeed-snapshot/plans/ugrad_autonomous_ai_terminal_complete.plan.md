<!-- beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1} -->
---
name: "μgrad — Autonomous AI Terminal (Complete Plan)"
date: "2026-02-20"
version: "4.82"
status: "planning"
layer: "L0"
file: "web/micrograd-steno.html"
p_address: "P0.μgrad"
iteration: "R0 → R5"
dependencies: ["quantum-prefixes.js", "qbit-dac.js", "qbit-steno.js", "sw.js"]
---

# μgrad — Autonomous AI Terminal (Complete Plan)

> Comprehensive development plan synthesizing ALL project knowledge:
> 126 plans, 10 chat sessions, 40+ decisions, 8-layer Iron Line,
> .qbit codec, gluelam architecture, and quantum bridge integration.
> Every idea from every chat and every plan accounted for.

---

## Current State (R0 — BUILT)

| Metric | Value |
|--------|-------|
| File | `web/micrograd-steno.html` |
| Lines | 763 |
| Size | ~33 KB |
| Layer | L0 (Super Speed Terminal) |
| Speedup | 337x warm vs cold |
| Architecture | Any — default 2→4→4→1 |
| Datasets | xor, circle, spiral, moon |
| Commands | 14 (help, train, evolve, bench, arch, data, lr, epochs, gen, status, speed, steno, quantum, reset, clear) |
| Deps | quantum-prefixes.js, qbit-dac.js, qbit-steno.js |
| Steno | Weights encoded in whitespace, round-trip verified |
| Quantum | QASM 3.0 VQC export, Heron ISA gates |
| Persistence | localStorage (weights + full history) |
| Panel | Speed graph, decision boundary, loss curve, steno stats |

---

## Phase 1: ∅ Nuke Button + Steno Survival (30 min)

> Reference: nterminal.html ∅ button, qbit-steno.js extract/reinject, steno codec pajama mode

### What
Add the ∅ (nuke) button that clears ALL browser storage — but μgrad gets
SMARTER after clearing, not dumber. Knowledge survives via three channels:
1. **IndexedDB** (not cleared by simple localStorage.clear)
2. **Steno-encoded source** (weights baked into whitespace of own code)
3. **BroadcastChannel** pre-nuke snapshot to other tabs

### Why This Matters
- nterminal.html already has this button — μgrad needs parity
- Proves that intelligence can survive a full purge
- Core thesis: code that carries its own optimization history
- From steno codec decision: "every space carries signal" — even after clear

### Implementation
```
CMD: nuke
BUTTON: ∅ in header bar (right-aligned, next to theme toggle)

Pre-nuke sequence:
1. Snapshot STATE → IndexedDB('ugrad-vault', STATE)
2. Steno-encode weights into own source template (stenoEncode with extract/reinject)
3. BroadcastChannel('iron-line').postMessage({ type: 'ugrad-snapshot', state: STATE })
4. Clear: localStorage.clear(), sessionStorage.clear()
5. Cache API: caches.keys() → caches.delete() for each
6. Reload: location.reload(true)

Post-nuke boot:
1. Check IndexedDB('ugrad-vault') → restore if found
2. Check BroadcastChannel for snapshot response
3. If neither: start fresh G0 but log "clean slate — train to rebuild"
4. Track nuke count in IndexedDB — each nuke = learning event
```

### Ideas from Prior Work
- From `image_steganography_chat` plan: embed weights as LSB in favicon or panel canvas pixels
- From `qbit-steno-pad.html`: dual-pane view — show what survived vs what was cleared
- From `steno codec` decision: use `qbitCodec.extract()` before nuke, `qbitCodec.reinject()` after
- From `deploy toggle`: nuke = transition from "full" to "off" then back to "full"
- From `formatter survival`: same extract/reinject pattern works for nuke/restore

### Success Criteria
- [ ] ∅ button in header, styled like nterminal
- [ ] Pre-nuke IndexedDB vault save
- [ ] Post-nuke restore from IndexedDB
- [ ] Nuke count tracked — each nuke is a learning event
- [ ] BroadcastChannel snapshot before clear
- [ ] Log shows "restored from vault" or "clean slate"

---

## Phase 2: AI Commander Integration — Ollama Direct (45 min)

> Reference: quantum_bridge_server.py /api/ai/*, nterminal.html Ollama integration,
> local_ai_architecture_strategy plans, L2 Commander layer

### What
Wire μgrad directly to Ollama for natural language control. The `ai` command
sends prompts to local LLMs that can analyze training results, suggest
hyperparameters, explain what the model learned, and make training decisions.

### Why This Matters
- L2 Commander layer exists but has no AI brain yet
- nterminal.html proves the pattern: direct fetch to Ollama on localhost:11434
- From chat decision: "Agent dispatch · corpus · decisions" at L2
- quantum_bridge_server.py already has `/api/ai/generate`, `/api/ai/models`
- μgrad becomes the FIRST app to actually think about its own training

### Implementation
```
CMD: ai <prompt>       — ask Ollama about training state
CMD: ai suggest        — "what should I train next?"
CMD: ai explain        — "what did the model learn?"
CMD: ai optimize       — "suggest better hyperparameters"
CMD: ai models         — list available Ollama models

Default model: qwen2.5-coder:1.5b (fast, code-aware)
Fallback: any available model via /api/tags

Context injection:
  System prompt includes:
  - Current STATE (gen, arch, dataset, lr, epochs)
  - Last 5 generation records (ms, epochs, loss, acc)
  - Steno stats (bits hidden, utilization)
  - Available commands list
  
AI response parsing:
  - If response contains a command (train, evolve, arch, data, etc.) → offer to execute
  - Highlight suggested values in yellow
  - Log AI reasoning in dim text
```

### Ideas from Prior Work
- From `lark_design_with_cursor_agents` plan: CursorAgentService pattern — dispatch to multiple models
- From `chat-corpus-commander.mdc`: L2 Commander loads chat-corpus.json for decisions
- From `unified_quantum_development_platform` plan: MCP, TinyGrad quantum notebooks, agent workflows
- From `mcp_server_integration` plan: MCP catalog browser for external tools
- From `local_ai_architecture_strategy`: Electron multi-window, MCP server, Ollama model picker
- From quantum-commands.mdc: bridge server at :8085 has `/api/ai/generate`
- From `recalibrate_idiot_check` plan: AI-quantum readiness assessment loop
- From `qbit-search.html`: inline prompt pattern — type question, get AI answer in terminal

### AI Context Window (what μgrad tells the AI)
```json
{
  "role": "μgrad iterative AI training terminal",
  "generation": "G12",
  "architecture": "2→16→16→1",
  "dataset": "spiral (100 samples)",
  "history_last_5": [...],
  "speedup": "337x",
  "steno_bits": 1520,
  "available_commands": ["train","evolve","bench","arch","data","lr","epochs","quantum"],
  "iron_line_layer": "L0",
  "capabilities": ["autograd","steno","quantum_export","generational_learning"]
}
```

### Success Criteria
- [ ] `ai` command connects to Ollama localhost:11434
- [ ] `ai suggest` returns actionable hyperparameter advice
- [ ] `ai explain` describes what the model learned from weights/loss curves
- [ ] `ai models` lists available models
- [ ] Context injection includes full STATE
- [ ] Fallback message if Ollama not running
- [ ] Response parsing highlights commands

---

## Phase 3: `ai auto` — Autonomous Iteration Loop (45 min)

> Reference: generational learning, evolve command, plan-corpus AI growth,
> prefix_pipeline_product_plan (self-optimizing AI tier)

### What
Enable μgrad to iterate AUTONOMOUSLY — the AI trains, analyzes results,
adjusts hyperparameters, changes architecture, switches datasets, and
evolves without human intervention. The terminal becomes a living system.

### Why This Matters
- From user: "so I don't have to run a script, it just knows"
- From prefix pipeline product plan: "self-optimizing AI" is tier 8 of 10
- From user: "ai could be iterating on it the rest of today"
- This is where μgrad stops being a tool and becomes an agent

### Implementation
```
CMD: ai auto            — start autonomous loop
CMD: ai auto stop       — stop autonomous loop
CMD: ai auto status     — show auto-loop state

Auto-loop cycle (every ~5 seconds):
1. OBSERVE: Read current STATE (gen, loss, acc, speed, steno)
2. THINK: Send state to Ollama with decision prompt:
   "Given this training history, what should μgrad do next?
    Options: train, evolve N, change arch to X, switch data to Y,
    adjust lr to Z, run quantum, benchmark, or stop."
3. DECIDE: Parse AI response into a command
4. ACT: Execute the command
5. RECORD: Log the decision and result
6. REPEAT: Unless AI says "stop" or loss < target

Decision history:
  STATE.decisions = [
    { gen: 12, action: "evolve 5", reason: "loss plateau, need more generations", result: "loss dropped 40%" },
    { gen: 17, action: "arch 2,32,32,1", reason: "underfitting spiral data", result: "acc 94% → 98%" },
    ...
  ]

Guardrails:
  - Max 100 generations per auto session
  - Max 5 minutes wall time
  - Stop if loss < 1e-6 (solved)
  - Stop if 10 consecutive generations show no improvement
  - User can interrupt with any command
```

### Ideas from Prior Work
- From `cursor_ide_usage_watch_dashboard` plan: track real-time metrics, auto-react
- From `worldcontextcontrailai` plan: agent-batch pipeline that ingests, processes, generates
- From `plan_corpus_ai_growth` plan: plans as first-class training data
- From `db_leverage_transformers_perspective` plan: transformer-based pattern matching
- From `rhythm_pattern_recognition` plan: pattern detection → auto-response
- From Iron Line: each stage has a timing budget — auto loop respects budgets
- From qbitOS unified master plan: L2 Commander = "Agent dispatch · corpus · decisions"
- From chat-corpus decisions: "race agents on corpus" — μgrad races itself

### Auto-Loop State Machine
```
IDLE → OBSERVING → THINKING → DECIDING → ACTING → RECORDING → OBSERVING
  ↑                                                              │
  └──────────────── STOP (user/guardrail/solved) ←──────────────┘
```

### Success Criteria
- [ ] `ai auto` starts autonomous training loop
- [ ] Each cycle: observe → think → decide → act → record
- [ ] Decision history stored in STATE.decisions
- [ ] Guardrails prevent runaway (time, generations, plateau)
- [ ] User can interrupt with any command
- [ ] AI adjusts hyperparameters based on results
- [ ] Terminal shows AI reasoning in real-time

---

## Phase 4: Computational Maturity Levels (30 min)

> Reference: user request for "child/teen/adult/elder" computational levels,
> iron line 8-layer stack, 59-language coverage

### What
Map μgrad's progress to developmental stages based on what it has learned,
how fast it runs, and what capabilities it has unlocked. Each level gates
new features and reflects genuine computational sophistication.

### Why This Matters
- User asked: "how fast would it spin up to child/teen/adult/senior/elder?"
- Provides a clear progress metric beyond raw loss/accuracy
- Each level unlocks new terminal commands and capabilities
- Ties into the R0→R5 release strategy

### Maturity Levels
```
LEVEL 0 — SEED (G0)
  State: No training, random weights
  Capability: Can forward-pass, that's it
  Speed: N/A
  Unlock: train, help, status
  Display: ○○○○○○○○ (all empty)

LEVEL 1 — INFANT (G1-G3, loss > 0.1)
  State: First cold training, basic convergence
  Capability: Can learn XOR, basic patterns
  Speed: >10ms per generation
  Unlock: evolve, bench, data
  Display: ●○○○○○○○

LEVEL 2 — CHILD (G4-G10, loss < 0.1, 1 dataset)
  State: Warm starts working, early stopping active
  Capability: Generational learning proven, steno encoding
  Speed: <5ms warm
  Unlock: arch, steno, quantum
  Display: ●●○○○○○○

LEVEL 3 — TEEN (G10-G30, loss < 0.01, 2+ datasets)
  State: Multiple datasets mastered, architecture explored
  Capability: Cross-dataset transfer intuition
  Speed: <1ms warm, 50x+ speedup
  Unlock: ai, quantum export
  Display: ●●●○○○○○

LEVEL 4 — YOUNG ADULT (G30-G100, all 4 datasets, 100x+ speedup)
  State: All datasets converged, optimal architectures found
  Capability: Steno-primed weight injection reliable
  Speed: <0.5ms warm, 100x+ speedup
  Unlock: ai auto, nuke survival
  Display: ●●●●○○○○

LEVEL 5 — ADULT (G100+, auto-loop decisions > 20, IBM quantum submitted)
  State: AI-driven optimization, quantum circuit generated
  Capability: Autonomous training, QPU integration
  Speed: <0.3ms warm, 200x+ speedup
  Unlock: multi-model AI, iron line broadcast
  Display: ●●●●●○○○

LEVEL 6 — SENIOR (all datasets < 1e-6, VQC optimized, nuke survived 3x)
  State: Near-perfect convergence, quantum-classical hybrid
  Capability: Full pipeline integration, survives purges
  Speed: <0.2ms warm, 300x+ speedup
  Unlock: tinygrad bridge, cross-tab teaching
  Display: ●●●●●●○○

LEVEL 7 — ELDER (multi-session, cross-tab, autonomous for >1hr)
  State: Long-running autonomous agent, teaches other tabs
  Capability: Full Iron Line participant, cortical loop ready
  Speed: theoretical minimum, 500x+ speedup
  Unlock: everything — μgrad is mature
  Display: ●●●●●●●○

LEVEL 8 — QUANTUM ELDER (IBM QPU results integrated back)
  State: Classical-quantum feedback loop closed
  Capability: Real QPU data improves classical training
  Speed: quantum-assisted convergence
  Unlock: cortical tether, BCI readiness
  Display: ●●●●●●●●
```

### Ideas from Prior Work
- From `de_extinction` concept: 21 organisms × 8 revival targets = staged capability unlock
- From `cortical_loop`: 24ms round-trip = Level 8 target
- From `cryostat_interactive_overhaul`: staged zoom/reveal = maturity visualization
- From `kbatch-expansion-plan`: capsules unlock by category = same pattern
- From `gold_standard`: 10 languages, 20 files = gold standard μgrad should match
- From `59-language coverage`: Level 7+ should classify code in all 59 languages
- From Iron Line layers: maturity maps to which layers μgrad can participate in
- From `prefix_pipeline_product_plan`: 10-tier speed spectrum = maturity analog

### Display
```
Header badge: ●●●○○○○○ TEEN (G18)
Panel section: MATURITY with progress bar and next-level requirements
Boot message: "μgrad restored at TEEN level — 2 more datasets to YOUNG ADULT"
```

### Success Criteria
- [ ] 9 maturity levels defined with clear thresholds
- [ ] Level computed from STATE on every generation
- [ ] Header badge shows filled/empty circles
- [ ] Panel section shows current level + next requirements
- [ ] Commands gated by level (dim + "unlock at LEVEL X")
- [ ] Level persists in STATE and IndexedDB vault

---

## Phase 5: Web Worker — Background Training (30 min)

> Reference: browser frame budget 16ms, training can take 30ms+,
> Iron Line timing budgets

### What
Move the training computation to a Web Worker so the UI stays responsive
during evolve/benchmark/auto loops. The main thread handles rendering
and input; the worker handles math.

### Why This Matters
- Cold training on spiral/moon can take 30-50ms — blocks the UI thread
- `evolve 100` currently freezes the tab
- `ai auto` loop needs responsive input for interrupts
- Iron Line budget: 16ms per frame at 60fps — training must not steal frames
- From `custom_terminal_options` plan: "Warp-level UX" requires zero jank

### Implementation
```
File: inline Worker via Blob URL (single-file constraint)

Worker receives:
  { cmd: 'train', arch, weights, data, epochs, lr, earlyStop }

Worker returns:
  { weights, losses, ms, epochs, accuracy }

Main thread:
  - Sends training request
  - Shows spinner/progress in panel
  - Receives result
  - Updates STATE and UI
  - Never blocks on math

Fallback: If Worker creation fails, run inline (current behavior)
```

### Ideas from Prior Work
- From `hexcast_codec_engine` plan: WebCodecs uses Workers for encode/decode
- From `rhythm_pattern_recognition` plan: DSP in Worker, UI on main thread
- From `qbit-raw.html`: speed = no DOM churn, no animation, no blocking
- From speed-stack.json: "browser_frame: 16666μs — 60fps vsync" is the budget
- From `lark_os_quantum_3d` plan: Python terminal in WebAssembly — similar offload pattern

### Success Criteria
- [ ] Training runs in Web Worker (Blob URL, inline)
- [ ] UI remains responsive during evolve 100+
- [ ] Progress updates via postMessage
- [ ] Graceful fallback if Workers unavailable
- [ ] No performance regression vs inline

---

## Phase 6: Iron Line Integration (30 min)

> Reference: speed-stack.json, BroadcastChannel('iron-line'),
> qbit-search.html speed/loop/pipeline commands

### What
Wire μgrad into the Iron Line pipeline as a first-class L0 participant.
Broadcast training events, respond to pipeline queries, run system-wide
speed tests, and contribute to global steno statistics.

### Why This Matters
- μgrad is listed in L0 of the architecture flowchart but doesn't broadcast yet
- qbit-search.html already does pipeline/speed/loop — μgrad should respond
- From speed-stack.json: μgrad entry exists but no telemetry flows yet
- Cross-app communication is a core project decision

### Implementation
```
BroadcastChannel('iron-line'):

EMIT on train/evolve:
  { type: 'ugrad-gen', gen, ms, epochs, loss, acc, speedup, arch, dataset, ts }

EMIT on quantum:
  { type: 'ugrad-quantum', gen, qubits, gates, qasm_length, ts }

RESPOND TO:
  { type: 'speed-test' } → run speed() and broadcast results
  { type: 'pipeline-query' } → report current state
  { type: 'steno-query' } → report steno utilization

CMD: pipeline   — show Iron Line status from all tabs
CMD: broadcast  — force broadcast current state
CMD: tether     — show connection status to other L0-L7 apps
```

### Ideas from Prior Work
- From `qbit-search.html`: `speed` command runs 6 benchmarks, broadcasts to iron-line
- From `speed-stack.json`: 10-stage pipeline, μgrad is stage "train" at L0
- From `qbit-steno-term.html`: 3-column output = gutter|content|metadata
- From `plan_corpus_ai_growth`: BroadcastChannel('plan-corpus') pattern
- From `hexcast-stream`: video frame broadcast = same BroadcastChannel pattern
- From `history-search`: search engine ready/state sync = same pattern
- From `quantum-prefixes`: state sync across all 38 apps
- From `cortical_loop`: data flows through ALL layers with steno metadata
- From `uvspeed_cross-project_integration` plan: ChartGPU, Day tools all on bus

### Speed Test Integration
```
CMD: speed iron  — run Iron Line speed battery:
  1. Forward pass timing (μs/sample)
  2. Backward pass timing (μs/sample)
  3. Steno encode/decode (μs/op)
  4. BroadcastChannel latency (μs)
  5. IndexedDB read/write (μs)
  6. Worker postMessage round-trip (μs)
  7. Quantum circuit generation (μs)
  Total ops/ms across all tests
```

### Success Criteria
- [ ] BroadcastChannel('iron-line') emitter on every generation
- [ ] Responds to speed-test, pipeline-query, steno-query messages
- [ ] `pipeline` command shows cross-tab status
- [ ] `speed iron` runs full L0 benchmark battery
- [ ] Telemetry visible in qbit-search.html when running alongside

---

## Phase 7: Multi-Model Intelligence + Bridge Server (30 min)

> Reference: quantum_bridge_server.py, local_ai_architecture_strategy,
> unified_quantum_development_platform, mcp_server_integration

### What
Extend the AI integration from Phase 2 to support MULTIPLE models and
the full bridge server ecosystem. μgrad can dispatch to different models
for different tasks: fast model for hyperparameter tuning, code model for
architecture suggestions, reasoning model for explaining convergence.

### Why This Matters
- Bridge server at :8085 already has multi-model routes
- From `local_ai_architecture_strategy`: Ollama model picker, tinygrad inference
- 59 languages indexed means μgrad can reason about code in any language
- From `lark_design_with_cursor_agents`: CursorAgentService = multi-model dispatch

### Implementation
```
CMD: ai model <name>     — switch active model
CMD: ai race <prompt>    — send to multiple models, show all answers
CMD: ai bridge           — connect to bridge server at :8085

Model routing:
  hyperparameters → qwen2.5-coder:1.5b (fast)
  architecture    → codellama:7b (code-aware)
  explanation     → llama3.2:3b (reasoning)
  quantum         → custom prompt to any model

Bridge server routes:
  POST /api/ai/generate   — single model inference
  GET  /api/ai/models     — available models
  POST /api/prefix        — prefix classification via server
  POST /api/security/scan — security audit of generated code
```

### Ideas from Prior Work
- From `recalibrate_idiot_check` plan: agnostic AI-quantum readiness via multiple models
- From `unified_quantum_development_platform`: MCP + TinyGrad + IBM/NVIDIA quantum
- From `mcp_server_integration`: MCP catalog browser for external tools
- From `cursor_ide_usage_watch_dashboard`: real-time metrics from multiple sources
- From chat-corpus-commander: "race agents on corpus" = race models
- From `qbit-search.html`: DAC commands already use bridge
- From `Ollama integration` in nterminal: direct fetch pattern proven

### Success Criteria
- [ ] `ai model` switches between available Ollama models
- [ ] `ai race` dispatches to multiple models in parallel
- [ ] `ai bridge` connects to quantum_bridge_server.py
- [ ] Model routing: different tasks → different models
- [ ] Fallback chain: Ollama direct → bridge server → offline

---

## Phase 8: DAC + Full Codec Integration (20 min)

> Reference: qbit-dac.js, unified .qbit codec, DAC+ features,
> prefix-autocomplete.mdc (80%+ coverage target)

### What
Wire the full DAC (Dimensional Addressing Classification) and .qbit codec
into μgrad's code output. Every line of generated code, every weight dump,
every QASM circuit gets proper prefix classification, DAC tracks, stripes,
and complexity scoring.

### Why This Matters
- From cursor rules: all apps must have 80%+ prefix coverage
- μgrad generates code (weight dumps, QASM) but doesn't classify it yet
- DAC tracks/stripes provide visual debugging of training state
- From `prefix_pipeline_product_plan`: DCA is the product
- From qbitOS unified master plan: DAC is the data backbone

### Implementation
```
CMD: dac           — show DAC classification of μgrad source
CMD: dac weights   — classify weight dump with DAC
CMD: dac qasm      — classify generated QASM with DAC
CMD: prefix        — show prefix coverage stats
CMD: gaps          — show missing prefix categories, suggest fills

Integration:
  - All L() log output includes DAC track marker in gutter
  - Weight dumps are prefix-classified (1: variable)
  - QASM output is prefix-classified (qasm language rules)
  - Panel shows DAC stripe visualization
  - Export includes quantum gutter metadata (project decision)

Prefix target: 80%+ classified lines in micrograd-steno.html
Current estimate: ~60% (engine code is well-classified,
  HTML/CSS less so — gap fill needed)
```

### Ideas from Prior Work
- From `multi-language_prefix_alignment` plan: align all languages to 11 symbols
- From `cross-language_test_verification` plan: verify all 34→59 languages
- From `prefix-autocomplete.mdc`: target 80%+, use MCP `uvspeed_prefix_gaps`
- From `qbit-steno-term.html`: 3-column gutter|content|metadata display
- From `qbit-steno-pad.html`: dual-pane Channel A/B for code + decoded metadata
- From project decision: "All saved/exported files MUST contain quantum gutter prefixes"

### Success Criteria
- [ ] `dac` command shows full DAC analysis of μgrad
- [ ] `prefix` command shows coverage percentage
- [ ] `gaps` command identifies missing categories
- [ ] Exported files include quantum gutter header
- [ ] Panel shows DAC stripe visualization
- [ ] Target: 80%+ prefix coverage in source

---

## Phase 9: Advanced Datasets + Real-World Training (45 min)

> Reference: R2 iteration ladder, MNIST/CIFAR,
> cross-language test verification, kbatch expansion

### What
Expand beyond 4 toy datasets to real-world training tasks that prove
μgrad's generational learning works at scale. This is what makes R2
"the world starts asking questions."

### Why This Matters
- R2 = "MNIST digits (784→128→10), CIFAR features" — industry benchmark
- From user: "make the world of AI ask questions"
- 4 toy datasets prove the concept; real data proves the product
- Steno capacity scales with model size — bigger models = more hidden data

### Datasets to Add
```
TIER 1 — Toy (BUILT):
  xor (4), circle (100), spiral (100), moon (100)

TIER 2 — Synthetic Complex:
  gaussian (2-class Gaussian blobs, configurable separation)
  checkerboard (2D grid pattern, tests sharp boundaries)
  concentric (3+ concentric rings, tests radial patterns)
  swiss_roll (3D projected to 2D, tests manifold learning)

TIER 3 — Real Features (R2):
  mnist_features (PCA-reduced MNIST to 16 dims, 10 classes)
  iris (4→3, classic ML benchmark)
  wine (13→3, real-world classification)
  digits_8x8 (sklearn-style 8x8 digit images)

TIER 4 — Generated Sequences (R3):
  fibonacci (sequence prediction)
  primes (primality classification)
  binary_add (addition via neural network)
  regex (simple pattern matching)
```

### Ideas from Prior Work
- From `kbatch-expansion-plan`: 15 keyboard layouts × 121 capsules = structured data
- From `search_context_intelligence` plan: 14 connectors fetch real-world data
- From `history_timeline_and_readme` plan: universal timeline = sequential data
- From `rhythm_pattern_recognition` plan: audio/MIDI patterns = time-series training
- From `db_leverage_transformers_perspective`: transformer embeddings as training signal
- From `worldcontextcontrailai` plan: world context = real-world features
- From `hexcast_codec_engine`: video frames as training data (future)
- From speed-stack.json: "steno capacity scales with model size"

### Success Criteria
- [ ] 8+ new datasets in Tier 2-3
- [ ] `data` command lists all available datasets
- [ ] Generational learning works on larger datasets
- [ ] Steno encoding scales (more weights = more hidden bits)
- [ ] Benchmark: μgrad warm vs cold on iris/wine/digits

---

## Phase 10: tinygrad Bridge (R3) (1 hr)

> Reference: tinygrad integration in architecture flowchart,
> ~/tinygrad (LOCAL, Metal backend), R3 iteration ladder

### What
Bridge μgrad's learned weights to tinygrad's Metal-accelerated ML runtime.
μgrad trains fast in the browser → exports weights → tinygrad loads them
for GPU-accelerated inference/fine-tuning on M4 Metal.

### Why This Matters
- From architecture flowchart: tinygrad has 161K lines, 775K whitespace bytes
- "Steno capacity: 350 KB hidden payload" in tinygrad source
- R3 = "tinygrad reads its own steno → auto-optimizes kernels"
- M4 Metal GPU = real hardware acceleration path
- From user: "speed tests on the Meta Waterworth line"

### Implementation
```
CMD: export tinygrad   — export weights as tinygrad-compatible Python
CMD: import tinygrad   — load weights from tinygrad training run

Export format:
  import numpy as np
  from tinygrad.tensor import Tensor
  # μgrad G42 — spiral — 2→16→16→1 — 337x speedup
  weights = Tensor(np.array([...]))  # steno-encoded whitespace

Bridge flow:
  μgrad (browser) → WebSocket → bridge server → tinygrad (Python)
  tinygrad (Python) → WebSocket → bridge server → μgrad (browser)

Steno integration:
  tinygrad source files are steno-encoded with μgrad training metadata:
  - Tensor operation classification
  - Metal shader dispatch hints
  - Optimization flag suggestions
  - Execution trace breadcrumbs
  - Kernel launch parameters
```

### Ideas from Prior Work
- From architecture flowchart: full tinygrad steno capacity analysis already done
- From `local_ai_architecture_strategy`: tinygrad inference = local ML path
- From `uvspeed_cross-project_integration`: bridge ChartGPU/Day tools = same pattern
- From `db_leverage_transformers_perspective`: transformer embeddings bridge
- From quantum_bridge_server.py: WebSocket + REST API infrastructure exists
- From Ollama integration: local model serving pattern

### Success Criteria
- [ ] `export tinygrad` generates valid Python with μgrad weights
- [ ] Weights include steno-encoded training metadata
- [ ] tinygrad can load and run inference with exported weights
- [ ] Metal acceleration confirmed on M4
- [ ] Round-trip: μgrad → tinygrad → μgrad weight transfer

---

## Phase 11: Quantum Feedback Loop (R4-R5) (1 hr)

> Reference: ibm_quantum_test.py, QASM 3.0 VQC, quantum command,
> uvQbit app, cryostat interactive, quantum fingerprint product

### What
Close the loop: μgrad trains → generates QASM → submits to IBM QPU →
gets results → feeds back into classical training. Real quantum-classical
hybrid optimization.

### Why This Matters
- `quantum` command already generates QASM 3.0 VQC
- ibm_quantum_test.py already submits to Heron QPUs
- From `quantum_fingerprint_product` plan: Q-sphere from code, backed by real QPU data
- R4 = "Quantum circuit optimization hints steno-encoded"
- R5 = "Self-modifying code at quantum speed"

### Implementation
```
CMD: quantum submit    — submit VQC to IBM Quantum via bridge
CMD: quantum results   — fetch and display QPU results
CMD: quantum feedback  — use QPU results to adjust training
CMD: quantum sim       — run circuit locally via statevector sim

Feedback loop:
  1. Train classical model (μgrad)
  2. Export weights → QASM VQC (quantum command)
  3. Submit to IBM Quantum (ibm_quantum_test.py via bridge)
  4. Receive measurement results (bitstring counts)
  5. Interpret results as optimization hints:
     - Most frequent bitstring → weight direction bias
     - Entropy of results → convergence confidence
     - QPU noise → regularization factor
  6. Feed back into next generation
  7. Track quantum generations separately

Quantum state in STATE:
  STATE.quantum = {
    circuits_generated: 12,
    circuits_submitted: 3,
    qpu_results: [...],
    last_backend: 'ibm_torino',
    total_shots: 12000,
    quantum_speedup: null  // measured once we have enough data
  }
```

### Ideas from Prior Work
- From `cryostat_interactive_overhaul` plan: interactive stage explorer visualization
- From `cryostat_layers_+_compute_topology` plan: Browser→CDN→GPU→QPU topology
- From `quantum_xyz_planner_system` plan: gamified quantum navigation
- From `quantumcubepass2` plan: quantum-cube XYZ viewer
- From `uvqbit_experience_overhaul` plan: 6-act cinematic workspace
- From `act_vi_quantum_spatial` plan: living field fed by QPU calibration
- From `campfire_tonality_+_voice` plan: audio feedback from circuit operations
- From `luvukid0`: 51-char encoding, two Marrakesh runs = proven QPU submission
- From `ibm_quantum_test.py`: Heron ISA mapping, IAM auth, job polling
- From `procedural_hardware_textures` plan: visual hardware representation

### Success Criteria
- [ ] `quantum submit` sends QASM to IBM via bridge server
- [ ] `quantum results` displays measurement bitstrings
- [ ] `quantum feedback` uses QPU results to bias next generation
- [ ] `quantum sim` runs local statevector simulation
- [ ] Quantum generation count tracked in STATE
- [ ] Panel shows quantum circuit visualization

---

## Phase 12: Full Terminal Feature Parity (30 min)

> Reference: qbit-raw.html v3, qbit-search.html, nterminal.html,
> qbit-steno-term.html

### What
Bring μgrad's terminal UI to parity with the best features across all
project terminals. Layer bar, command palette, clickable output, keyboard
shortcuts, night watch mode.

### Why This Matters
- qbit-raw v3 has layer bar, command palette, ⌘K, ⌘1-8 shortcuts
- qbit-search has canvas rendering, zero DOM churn
- qbit-steno-term has 3-column layout
- nterminal has ∅ button, Ollama chat, beautiful styling
- μgrad should be the BEST terminal, combining all innovations

### Features to Add
```
FROM qbit-raw v3:
  - Layer bar: ⚡0 ⬡1 ⌘2 ◈3 ◉4 ◆5 ⬢6 ◎7 — clickable L0-L7 navigation
  - Command palette: ⌘K fuzzy search through all commands
  - ⌘1-8 layer hop keyboard shortcuts
  - PageUp/Down scroll through history
  - Clickable .cmd spans — cyan text auto-executes on click

FROM qbit-search:
  - DAC command: show DAC analysis inline
  - Codec command: encode/decode test
  - Pipeline visualization with timing bars

FROM nterminal:
  - ∅ nuke button (Phase 1)
  - Chat mode (Phase 2 AI)
  - Beautiful retro styling

FROM qbit-steno-term:
  - 3-column output option: gutter | content | metadata
  - .steno file save/load

FROM qbit-steno-pad:
  - Dual-pane mode: code + decoded metadata side by side

NEW for μgrad:
  - Training progress bar during evolve
  - Live loss/accuracy in prompt: μgrad[G12 0.001]>
  - Tab completion for commands and arguments
  - Multi-line input for complex prompts (Shift+Enter)
```

### Success Criteria
- [ ] Layer bar in header
- [ ] ⌘K command palette
- [ ] Keyboard shortcuts (⌘1-8, PageUp/Down)
- [ ] Clickable command output
- [ ] Live status in prompt
- [ ] Tab completion
- [ ] Training progress bar

---

## Phase 13: Cross-Tab Teaching + Multi-Instance (30 min)

> Reference: BroadcastChannel patterns, local_ai_architecture_strategy (multi-window),
> cortical loop return path

### What
Multiple μgrad tabs can run simultaneously, each training on different
datasets/architectures, and TEACH each other via BroadcastChannel. The
best weights from any tab get shared to all others.

### Why This Matters
- From `local_ai_architecture_strategy`: "QubesOS-style multi-instance"
- BroadcastChannel already used for quantum-prefixes sync
- Parallel exploration: Tab A trains spiral, Tab B trains moon, best weights shared
- From `cortical_loop`: "return path carries full routing history"
- This is distributed learning in the browser

### Implementation
```
BroadcastChannel('ugrad-swarm'):

EMIT after each generation:
  { type: 'gen-complete', gen, loss, acc, arch, dataset, weights, ts, tabId }

RECEIVE from other tabs:
  If incoming loss < our best loss on same dataset:
    → Offer to adopt those weights
    → Or auto-adopt if ai auto is running

CMD: swarm          — show all active μgrad tabs and their states
CMD: swarm teach    — broadcast current best weights to all tabs
CMD: swarm adopt    — adopt best weights from swarm
CMD: swarm race     — all tabs start training simultaneously

Swarm state in panel:
  SWARM (3 tabs)
  Tab A: G45 spiral 0.0001 98.5% ← best
  Tab B: G23 moon   0.0032 95.0%
  Tab C: G12 xor    0.0000 100%
```

### Ideas from Prior Work
- From `multi-stream_feed_windows` plan: master/feed layout, BroadcastChannel hub
- From `hexcast-stream`: video frame broadcast between tabs
- From `floating_vr_keyboard` plan: draggable floating components
- From `youtube_multi-feed_security_viewer` plan: multi-feed grid = multi-instance
- From chat decision: "race agents on corpus" = race tabs
- From `quantum-prefixes` sync: proven cross-tab state sharing

### Success Criteria
- [ ] BroadcastChannel('ugrad-swarm') for cross-tab communication
- [ ] `swarm` command shows all active tabs
- [ ] Weight sharing between tabs
- [ ] Auto-adopt best weights in ai auto mode
- [ ] `swarm race` starts parallel training

---

## Phase 14: Meta Waterworth Line Speed Tests (20 min)

> Reference: user request, speed-stack.json, Iron Line benchmarks

### What
Benchmark μgrad against theoretical performance limits of Meta's AI
infrastructure. Not running ON Meta hardware (yet), but measuring
how μgrad's speed compares to published throughput numbers.

### Why This Matters
- User asked: "run speed tests on the Meta Waterworth line"
- Waterworth = Meta's next-gen AI data center infrastructure
- Comparing browser autograd to datacenter inference = perspective
- Shows where browser speed is competitive and where it's not

### Implementation
```
CMD: speed meta   — compare μgrad metrics to Meta infrastructure benchmarks

Output:
  META WATERWORTH COMPARISON
  ─────────────────────────────────────────
  Operation          μgrad       Meta Est.    Ratio
  forward/sample     25μs        0.1μs        250x behind
  backward/sample    80μs        0.3μs        267x behind
  steno encode       18ns        N/A          ∞ (unique)
  warm speedup       337x        ~1x          337x ahead
  weight persistence steno       checkpoint   different paradigm

  KEY INSIGHT: μgrad's advantage isn't raw speed — it's that
  each generation makes the next one faster. Meta starts cold
  every time. μgrad remembers.
```

### Success Criteria
- [ ] `speed meta` shows comparison table
- [ ] Published Meta throughput numbers as reference
- [ ] Highlights μgrad's unique advantages (steno, generational)
- [ ] Honest about where datacenter hardware wins

---

## Phase 15: Extension + PWA Install (20 min)

> Reference: qpu-pwa-ide-deploy_pipeline, browser extension history-search,
> uvspeed_decisive_build_path

### What
Make μgrad installable as a standalone PWA and optionally as a browser
extension panel. The extension provides a mini training terminal in any tab.

### Why This Matters
- From `qpu-pwa-ide-deploy_pipeline`: "PWA one-click export"
- From `uvspeed_decisive_build_path`: "PWA install → install.sh"
- Extension already exists for history-search — μgrad can be a panel
- PWA = runs offline, own window, app icon

### Implementation
```
PWA manifest:
  name: "μgrad"
  short_name: "μgrad"
  description: "Iterative AI training terminal"
  display: "standalone"
  theme_color: "#020408"
  icons: [μgrad icon set]

Service worker (sw.js):
  Already includes micrograd-steno.html in cache
  Add: offline training capability
  Add: background sync for Iron Line broadcasts

Extension panel (future):
  - Mini training widget in browser sidebar
  - Shows current gen, loss, speed
  - One-click train/evolve buttons
  - Syncs with main μgrad tab via BroadcastChannel
```

### Success Criteria
- [ ] PWA manifest in micrograd-steno.html
- [ ] Install prompt works in Chrome/Edge
- [ ] Runs offline after install
- [ ] sw.js caches all dependencies

---

## Cross-Cutting Concerns

### Single-File Constraint
μgrad MUST remain a single HTML file. All features inline. Deps are only:
- quantum-prefixes.js (shared module — required)
- qbit-dac.js (shared module — required)
- qbit-steno.js (shared module — required)
- sw.js (service worker — standard)

### Chunked Writing
Current: 763 lines. Expected final: ~1500-2000 lines.
Must use chunked write strategy:
1. Skeleton + placeholder markers
2. StrReplace to fill sections (<800 lines each)
3. Never write >500 lines in one shot

### Prefix Coverage
Target: 80%+ classified lines.
After each phase, run prefix audit and fill gaps.
Use MCP `uvspeed_prefix_gaps` if available.

### Export Compliance
All exports (weights, QASM, training history, steno dumps) MUST include:
- `# beyondBINARY quantum-prefixed` header
- Quantum gutter metadata
- DAC classification of exported content
- Steno encoding where applicable

### Version Sync
After implementation, run:
```bash
bash scripts/version-sync.sh set 4.83  # or next version
nu scripts/pre.nu inspect micrograd-steno  # health check
```

---

## Implementation Priority & Timing

| Phase | Time | Priority | Depends On |
|-------|------|----------|------------|
| 1. ∅ Nuke + Survival | 30 min | P0 | — |
| 2. AI Commander | 45 min | P0 | — |
| 3. AI Auto Loop | 45 min | P1 | Phase 2 |
| 4. Maturity Levels | 30 min | P1 | — |
| 5. Web Worker | 30 min | P1 | — |
| 6. Iron Line | 30 min | P1 | — |
| 7. Multi-Model | 30 min | P2 | Phase 2 |
| 8. DAC + Codec | 20 min | P2 | — |
| 9. Advanced Datasets | 45 min | P2 | Phase 5 (Worker) |
| 10. tinygrad Bridge | 1 hr | P3 (R3) | Phase 7 |
| 11. Quantum Feedback | 1 hr | P3 (R4-R5) | Phase 10 |
| 12. Terminal Features | 30 min | P2 | — |
| 13. Cross-Tab Teaching | 30 min | P2 | Phase 6 |
| 14. Meta Speed Tests | 20 min | P2 | Phase 6 |
| 15. PWA Install | 20 min | P3 | — |

**Total estimated: ~9 hours for all 15 phases**
**MVP (Phases 1-6): ~3.5 hours**
**R2-ready (add 7-9, 12): ~6 hours**
**R3+ (add 10-15): ~9 hours**

---

## Iteration Ladder (Updated with All Phases)

```
R0  BUILT ◄── YOU ARE HERE
├── Phases 0: Current μgrad (763 lines, 14 commands, 337x speedup)
├── RELEASE: "Self-optimizing code: weights that live in whitespace"

R1  IN PROGRESS
├── Phase 1: ∅ Nuke + Steno Survival
├── Phase 2: AI Commander (Ollama)
├── Phase 3: AI Auto Loop
├── Phase 4: Maturity Levels
├── Phase 5: Web Worker
├── Phase 6: Iron Line Integration
├── RELEASE: "Your code remembers what it learned — and decides what to learn next"

R2  WORLD NOTICES ◄── TARGET
├── Phase 7: Multi-Model Intelligence
├── Phase 8: DAC + Full Codec
├── Phase 9: Advanced Datasets (MNIST/iris/wine)
├── Phase 12: Terminal Feature Parity
├── Phase 13: Cross-Tab Teaching
├── Phase 14: Meta Speed Tests
├── RELEASE: "μgrad: autograd that ships its own optimizer"
│   npm package + pip wheel + arXiv preprint
│   Side-by-side: μgrad warm vs PyTorch cold

R3  INDUSTRY ASKS
├── Phase 10: tinygrad Bridge
├── Phase 15: PWA Install
├── RELEASE: "Zero-waste source code: every space carries signal"
│   tinygrad PR + GPU benchmark

R4  QUANTUM HYBRID
├── Phase 11: Quantum Feedback Loop
├── RELEASE: "The .qbit codec: code that optimizes itself"

R5  CORTICAL
├── Neuralink integration (future)
├── 24ms round-trip (future)
├── RELEASE: "Code that thinks — and remembers thinking"
```

---

## Knowledge Sources Synthesized

This plan incorporates ideas from:

| Source | Count | Key Contributions |
|--------|-------|-------------------|
| Plan files | 126 | Architecture, features, integrations |
| Chat sessions | 10 | Decisions, user requirements, technical discoveries |
| Cursor rules | 11 | Auto-tasks, conventions, quality gates |
| Architecture docs | 2 | Layer stack, speed junctions, codec pipeline |
| Speed stack | 1 | Timing budgets, pipeline stages |
| Chat corpus | 1 | 40+ decisions, 7 key concepts, artifacts |

**Every idea from every chat and every plan accounted for.**
