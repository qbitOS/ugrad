#!/usr/bin/env python3
# beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
"""
μgrad training server — serves app + receives telemetry + tracks trajectory

Usage:
    uv run scripts/ugrad-server.py
    python3 scripts/ugrad-server.py

Opens browser to http://localhost:8400/ugrad-r0.html
Training telemetry logs to logs/ugrad-training.jsonl
"""

import http.server
import json
import os
import sys
import time
import webbrowser
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

PORT = 8400
WEB_DIR = Path(__file__).resolve().parent.parent / "web"
LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE = LOG_DIR / "ugrad-training.jsonl"

TRAJECTORY = {
    "R0": {"label": "beat micrograd cold", "target_ms": 50},
    "R1": {"label": "serve own inference", "target_ms": 5},
    "R2": {"label": "beat PyTorch small", "target_ms": 1},
    "R3": {"label": "tinygrad Metal parity", "target_ms": 0.1},
    "R4": {"label": "quantum 10min cycle", "target_ms": 0.01},
}

session_start = time.time()
telemetry_count = 0
best_ms = float("inf")
best_loss = float("inf")
best_acc = 0.0
current_gen = 0


class UgradHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        if self.path == "/api/status":
            return self._handle_status()
        super().do_GET()

    def _handle_status(self):
        tier = (
            "R0" if best_ms > 50
            else "R1" if best_ms > 5
            else "R2" if best_ms > 1
            else "R3" if best_ms > 0.1
            else "R4"
        )
        _bms = best_ms if best_ms != float("inf") else -1
        _blo = best_loss if best_loss != float("inf") else -1
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({
            "gen": current_gen,
            "best_ms": round(_bms, 4),
            "best_loss": round(_blo, 8),
            "best_acc": round(best_acc, 4),
            "tier": tier,
            "target": TRAJECTORY[tier],
            "telemetry_count": telemetry_count,
            "uptime_s": round(time.time() - session_start, 1),
            "log_file": str(LOG_FILE),
        }).encode())

    def do_POST(self):
        global telemetry_count, best_ms, best_loss, best_acc, current_gen

        if self.path == "/api/telemetry":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_error(400, "Bad JSON")
                return

            data["server_ts"] = datetime.now().isoformat()
            data["uptime_s"] = round(time.time() - session_start, 1)

            LOG_DIR.mkdir(exist_ok=True)
            with open(LOG_FILE, "a") as f:
                f.write(json.dumps(data) + "\n")

            telemetry_count += 1
            current_gen = data.get("gen", current_gen)
            ms = data.get("ms") or float("inf")
            loss = data.get("loss") if data.get("loss") is not None else float("inf")
            acc = data.get("acc") or 0

            if isinstance(ms, (int, float)) and ms < best_ms:
                best_ms = ms
            if isinstance(loss, (int, float)) and loss < best_loss:
                best_loss = loss
            if isinstance(acc, (int, float)) and acc > best_acc:
                best_acc = acc

            tier = (
                "R0" if best_ms > 50
                else "R1" if best_ms > 5
                else "R2" if best_ms > 1
                else "R3" if best_ms > 0.1
                else "R4"
            )
            target = TRAJECTORY[tier]

            if current_gen % 5 == 0 or current_gen <= 3:
                warm = "W" if data.get("warm") else "C"
                ds = data.get("data", "?")
                bar_pct = min(100, int((target["target_ms"] / max(best_ms, 0.001)) * 100))
                bar = "█" * (bar_pct // 5) + "░" * (20 - bar_pct // 5)
                print(
                    f"  G{current_gen:>4} {warm} "
                    f"{ms:>8.2f}ms  ep:{data.get('ep', '?'):>4}  "
                    f"loss:{loss:.6f}  acc:{acc * 100:>5.1f}%  "
                    f"{ds:<12} [{tier}] {bar} {bar_pct}%",
                    flush=True,
                )

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "ok": True,
                "gen": current_gen,
                "tier": tier,
                "best_ms": round(best_ms, 4),
                "target_ms": target["target_ms"],
                "total_records": telemetry_count,
            }).encode())
            return

        self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        try:
            msg = str(args[0]) if args else ""
            if "/api/" in msg:
                return
        except Exception:
            pass
        super().log_message(format, *args)


def main():
    os.chdir(WEB_DIR)

    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    ms = rec.get("ms")
                    loss = rec.get("loss")
                    acc = rec.get("acc")
                    if isinstance(ms, (int, float)) and ms < best_ms:
                        globals()["best_ms"] = ms
                    if isinstance(loss, (int, float)) and loss < best_loss:
                        globals()["best_loss"] = loss
                    if isinstance(acc, (int, float)) and acc > best_acc:
                        globals()["best_acc"] = acc
                    globals()["current_gen"] = max(
                        current_gen, rec.get("gen", 0) or 0
                    )
                    globals()["telemetry_count"] += 1
                except (json.JSONDecodeError, KeyError, TypeError):
                    pass

    http.server.HTTPServer.allow_reuse_address = True
    server = http.server.HTTPServer(("0.0.0.0", PORT), UgradHandler)

    tier = (
        "R0" if best_ms > 50
        else "R1" if best_ms > 5
        else "R2" if best_ms > 1
        else "R3" if best_ms > 0.1
        else "R4"
    )

    print()
    print("  ╔══════════════════════════════════════════════╗")
    print("  ║  μgrad training server                      ║")
    print("  ╠══════════════════════════════════════════════╣")
    print(f"  ║  http://localhost:{PORT}/ugrad-r0.html        ║")
    print(f"  ║  telemetry: /api/telemetry (POST)           ║")
    print(f"  ║  status:    /api/status (GET)               ║")
    print(f"  ║  log:       logs/ugrad-training.jsonl       ║")
    print(f"  ║  tier:      {tier} ({TRAJECTORY[tier]['label']:<25s})  ║" if tier != "R4" else f"  ║  tier:      {tier} ({TRAJECTORY[tier]['label']:<25s}) ║")
    if telemetry_count > 0:
        print(f"  ║  resumed:   G{current_gen}, {telemetry_count} records, {best_ms:.2f}ms best ║")
    print("  ╚══════════════════════════════════════════════╝")
    print()
    print("  Training telemetry will stream below:")
    print("  ─" * 24)
    sys.stdout.flush()

    url = f"http://localhost:{PORT}/ugrad-r0.html"
    print(f"  Open: {url}")
    if "--no-browser" not in sys.argv:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n  Stopped. G{current_gen}, {telemetry_count} records logged.")
        server.shutdown()


if __name__ == "__main__":
    main()
