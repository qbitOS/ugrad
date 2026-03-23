#!/usr/bin/env bash
# Create workspace/uvspeed → local uvspeed monorepo (symlink). Required for μgrad PWAs:
# they load quantum-prefixes.js, qbit-dac.js, etc. from the same web/ tree.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_TARGET="$(cd "$REPO_ROOT/.." && pwd)/uvspeed"
TARGET="${UVSPEED:-$DEFAULT_TARGET}"
LINK="$REPO_ROOT/workspace/uvspeed"
mkdir -p "$REPO_ROOT/workspace"
if [[ ! -d "$TARGET" ]]; then
  echo "error: uvspeed monorepo not found at: $TARGET" >&2
  echo "  Set UVSPEED to your qbitOS/uvspeed checkout." >&2
  exit 1
fi
rm -f "$LINK"
ln -sfn "$TARGET" "$LINK"
echo "ok: $LINK -> $TARGET"
