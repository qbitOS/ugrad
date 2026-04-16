#!/usr/bin/env bash
# ugrad-evolve.sh — Distillation Loop (Gemini -> Local SmolLM2/Qwen)
# 1. Generate 9-cell ternary tensor heuristics using Gemini 1.5 Flash (Free Cloud)
# 2. Store in local JSONL for training
# 3. Verify with local Qwen (Offline Auditor)
# 4. (Manual Step) Trigger Tinygrad training on the resulting dataset

set -euo pipefail

# Config
DATA_DIR="/Volumes/qbitOS/03.models/training_data"
mkdir -p "$DATA_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$DATA_DIR/ugrad_distill_$TIMESTAMP.jsonl"

echo "⚛ UGRAD Distillation — Starting Evolution Loop"
echo "  [1/3] Generating synthetic Go/Chess/Checkers heuristics with Gemini..."

PROMPT="Generate 100 random 3x3 ternary tensor patterns ({-1, 0, 1}) for Go board heuristics.
Each pattern must include a 'label' (0 or 1) based on center control and diagonal threats.
Output in JSONL format: {\"input\": [-1,0,1,...], \"label\": 0/1}"

# Using mods with the new gemini alias
mods --model flash "$PROMPT" > "$OUTPUT_FILE"

echo "  ✓ Generated synthetic data: $OUTPUT_FILE"
echo "  [2/3] Verifying data quality with local Qwen auditor..."

# Use local Qwen to cross-check labels for common patterns
AUDIT_PROMPT="Check the following JSONL data for consistency with Go board heuristics.
Output ONLY a JSON summary of the audit (accuracy, suspicious_rows)."

cat "$OUTPUT_FILE" | mods --model qwen "$AUDIT_PROMPT"

echo "  ✓ Audit complete. Data ready for local training on /Volumes/qbitOS."
echo "  [3/3] To train: uv run python -m tinygrad.train --data $OUTPUT_FILE"
echo "⚛ Done — Local model evolution in progress."
