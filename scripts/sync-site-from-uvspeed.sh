#!/usr/bin/env bash
# Copy μgrad R0 and every static asset it loads from a local uvspeed checkout into site/
# Usage: ./scripts/sync-site-from-uvspeed.sh
# Override: UVSPEED=~/path/to/uvspeed ./scripts/sync-site-from-uvspeed.sh
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$REPO_ROOT/site"
DEFAULT_UVSPEED="$(cd "$REPO_ROOT/.." && pwd)/uvspeed"
UVSPEED="${UVSPEED:-$DEFAULT_UVSPEED}"

if [[ ! -d "$UVSPEED/web" ]]; then
  echo "error: uvspeed web/ not found at: $UVSPEED" >&2
  echo "  Set UVSPEED to your uvspeed checkout (e.g. export UVSPEED=$HOME/dev/projects/uvspeed)." >&2
  exit 1
fi

mkdir -p "$SITE/icons" "$SITE/calibrations" "$SITE/wasm"

# ugrad-r0.html script[src] + ugrad-worker + lounge tail + sfLive bridge
ASSETS=(
  ugrad-r0.html
  quantum-prefixes.js
  qbit-dac.js
  qbit-steno.js
  qbit-preflight.js
  plan-corpus-indexer.js
  ugrad-worker.js
  ugrad-sportsfield-ugrad-bridge.js
  ugrad-lounge.js
)

for f in "${ASSETS[@]}"; do
  if [[ ! -f "$UVSPEED/web/$f" ]]; then
    echo "error: missing source $UVSPEED/web/$f" >&2
    exit 1
  fi
  cp "$UVSPEED/web/$f" "$SITE/$f"
done

# Rust→WASM bundle (tensor loadWasmMatmul → import('./wasm/prefix_engine.js'))
shopt -s nullglob
copied_wasm=0
for f in "$UVSPEED/web/wasm"/*; do
  cp "$f" "$SITE/wasm/$(basename "$f")"
  copied_wasm=$((copied_wasm + 1))
done
shopt -u nullglob
if [[ "$copied_wasm" -eq 0 ]]; then
  echo "warn: no files in $UVSPEED/web/wasm — run: bash scripts/build-wasm.sh (in uvspeed)" >&2
fi

if compgen -G "$UVSPEED/web/calibrations/ibm_*.csv" > /dev/null; then
  cp "$UVSPEED/web/calibrations/"ibm_*.csv "$SITE/calibrations/"
fi

for f in favicon.ico favicon.png icon-192.png hexterm-512.png; do
  if [[ -f "$UVSPEED/icons/$f" ]]; then
    cp "$UVSPEED/icons/$f" "$SITE/icons/$f"
  else
    echo "warn: missing $UVSPEED/icons/$f" >&2
  fi
done

# Flat site layout: favicon next to HTML (uvspeed uses ../icons/)
if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' 's|href="../icons/favicon.ico"|href="icons/favicon.ico"|' "$SITE/ugrad-r0.html"
else
  sed -i 's|href="../icons/favicon.ico"|href="icons/favicon.ico"|' "$SITE/ugrad-r0.html"
fi

echo "ok: synced $SITE from $UVSPEED"
echo "  ($copied_wasm wasm files, ${#ASSETS[@]} top-level assets)"
echo "  bump CACHE_NAME in site/sw.js so clients refetch after changes"
