#!/usr/bin/env python3
"""
refresh_canary.py — SSH-only canary updater
"""
from __future__ import annotations
import json
import secrets
import string
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

CANARY_PATH = Path("canary/canary.json")
TOKEN_LEN = 16

def iso_now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")

def new_token(n=TOKEN_LEN):
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(n))

def sh(args, check=True, capture=False):
    return subprocess.run(args, check=check, text=True, capture_output=capture)

def ensure_ssh_remote():
    try:
        url = sh(["git", "remote", "get-url", "origin"], capture=True).stdout.strip()
    except subprocess.CalledProcessError:
        print("error: no git remote named 'origin' found.", file=sys.stderr)
        sys.exit(1)
    if url.startswith("https://"):
        print("error: origin is HTTPS; this tool only pushes over SSH.", file=sys.stderr)
        print("hint: switch to SSH:\n  git remote set-url origin git@github.com:<USER>/<REPO>.git", file=sys.stderr)
        sys.exit(2)

def current_branch():
    return sh(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture=True).stdout.strip()

def main():
    ensure_ssh_remote()

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

    sh(["git", "add", str(CANARY_PATH)])
    branch = current_branch()
    msg = f"canary: refresh {data['last_update']} token {data['token']}"
    sh(["git", "commit", "-m", msg])
    sh(["git", "push", "origin", branch])

    print("ok ✓ pushed over SSH")
    print(f"last_update: {data['last_update']}")
    print(f"token:       {data['token']}")
    print(f"window_days: {data['window_days']}")
    print(f"branch:      {branch}")

if __name__ == "__main__":
    main()
