#!/usr/bin/env python3
"""
refresh_canary.py — manual canary updater for a static site
"""
from __future__ import annotations
import json
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys

CANARY_PATH = Path("canary/canary.json")
TOKEN_LEN = 16

def iso_now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")

def new_token(n=TOKEN_LEN):
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(n))

def run(cmd:list[str], check=True):
    return subprocess.run(cmd, check=check)

def main():
    if not CANARY_PATH.exists():
        print(f"error: {CANARY_PATH} not found. run from your repo root.", file=sys.stderr)
        sys.exit(1)

    with CANARY_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["last_update"] = iso_now_utc()
    data["token"] = new_token()
    data["window_days"] = int(data.get("window_days", 14))

    with CANARY_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    # stage, commit, push
    run(["git", "add", str(CANARY_PATH)])
    res = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], check=True, capture_output=True, text=True)
    branch = res.stdout.strip()
    msg = f"canary: refresh {data['last_update']} token {data['token']}"
    run(["git", "commit", "-m", msg])
    run(["git", "push", "origin", branch])

    print("ok ✓")
    print(f"updated {CANARY_PATH}")
    print(f"last_update: {data['last_update']}")
    print(f"token:       {data['token']}")
    print(f"window_days: {data['window_days']}")

if __name__ == "__main__":
    main()
