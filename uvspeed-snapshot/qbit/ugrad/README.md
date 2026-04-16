# μgrad — Autograd AI Terminal

In-browser AI training engine. Scalar autograd → tensors → Adam → transformers → GPT. Built from scratch, zero dependencies, runs at 60fps.

## R-Level Staircase

| R | Name | Lines | Status |
|---|------|-------|--------|
| R0 | micrograd | ~800 | BUILT — scalar autograd, MLP, backprop |
| R1 | microtorch | ~400 | BUILT — Tensor class, Float32Array matmul |
| R2 | minitorch | ~300 | BUILT — Adam optimizer, cross-entropy |
| R3 | μtorch | ~200 | BUILT — Embedding, LayerNorm, attention ops |
| R4 | μformer | ~300 | BUILT — Transformer blocks, MiniGPT, char generation |
| R5 | μcortical | — | PLANNED — Cortical loop, Neuralink decode, 24ms |
| R6 | μorganoid | — | PLANNED — DNA parenthood cycle, organoid feedback |

## Source

| File | Lines | Location |
|------|-------|----------|
| ugrad-r0.html | 2,284 | `web/ugrad-r0.html` |
| micrograd-steno.html | — | `web/micrograd-steno.html` (legacy v1) |

## 78 Training Datasets

**19 base datasets:**
xor, linear, circle, gaussian, moon, rings, donut, spiral, checkerboard,
iris, swissroll, grid, symmetry, tictactoe, maze, rubiks, network, goboard, chess

**59 code-language datasets** (dynamically generated):
One dataset per supported language — trains the network to recognize code structure patterns.

## 18 Extensions (`UGRAD.extend()`)

Each extension adds a capability to the terminal via `UGRAD.extend()`:

| Extension | What it adds |
|-----------|-------------|
| voice | Voice input, speech recognition (Web Speech API) |
| quantum | VQC, QASM export, Heron ISA, Nighthawk R1 |
| preflight | QASM preflight, calibration, system directory, qubit health |
| scan | 9-modality scan pipeline (photogrammetry → .qbit) |
| ping | IANA→DNS→CDN→proxy speed calibration |
| freya | Physics constants, unit conversion, scientific notation |
| idiot | Benchmark ladder, QPU fleet |
| corpus | Plan corpus, decisions, broadcast sync |
| contrail | Contrail shorthand, symbol learning, kbatch bridge |
| languages | 59-lang classification, code prefix datasets |
| stereo | Stereo audio, panned channels, TTS |
| air-gap | Morse TX/RX, optical, BLE, NFC, mesh |
| bridge | Quantum bridge, WebSocket, biometric overlay |
| visual-stego | LSB encode/decode, qbit barcode, video watermark |
| prompter | Teleprompter, dual-context, TTS pacing |
| cortical | R5 cortical loop, sensor bridge, 24ms target |
| persona | Voice of intelligence, persona from code, vocal synthesis |
| webgrid | Adaptive mesh, cross-channel learning |

## BroadcastChannels (9)

`iron-line`, `quantum-loopback`, `quantum-prefixes`, `hexterm`,
`kbatch-training`, `ugrad-training`, `plan-corpus`, `qbit-preflight`, `qbit-search-mesh`

## Generational Learning

```
G1: Cold start (random weights)     → train → extract weights
G2: Warm start (G1 weights)         → train → extract weights (337x faster)
Gn: Accumulated learning            → weights persist via steno encoding
```

Each generation's weights are steno-encoded into Unicode whitespace — the training history is the DNA of the model.

## Iron Line Layer

**L0 — Super Speed Terminal** | Budget: 1.3ms boot, 18ns/record
