#!/usr/bin/env python3
"""Emit workspace/ugrad-component-manifest.json from a uvspeed checkout (curated paths)."""
import json
import os
import sys

SKIP = (".push-tmp/", "target/", "__pycache__/", "tauri-dist/", "logs/", ".git/")


def main() -> None:
    root = os.environ.get("UVSPEED", os.path.join(os.path.dirname(__file__), "..", "workspace", "uvspeed"))
    root = os.path.abspath(root)
    if not os.path.isdir(root):
        print(f"error: not a directory: {root}", file=sys.stderr)
        sys.exit(1)
    paths: list[str] = []
    for dirpath, _, files in os.walk(root):
        if any(sp in dirpath for sp in SKIP):
            continue
        for f in files:
            if f == ".DS_Store":
                continue
            p = os.path.join(dirpath, f)
            rp = os.path.relpath(p, root).replace("\\", "/")
            if "ugrad" in rp.lower() or "/ugrad-cli/" in rp:
                paths.append(rp)
    paths = sorted(set(paths))
    out = os.path.join(os.path.dirname(__file__), "..", "workspace", "ugrad-component-manifest.json")
    out = os.path.abspath(out)
    meta = {
        "generated_from": root,
        "uvspeed_github": "https://github.com/qbitOS/uvspeed",
        "path_count": len(paths),
        "paths": paths,
    }
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    print(f"wrote {len(paths)} paths -> {out}")


if __name__ == "__main__":
    main()
