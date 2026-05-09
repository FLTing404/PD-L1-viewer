#!/usr/bin/env python3
"""
Production-like launch: build then start Next.js (same as `pnpm build && pnpm start`).

Usage (from anywhere):
  python path/to/web-agent/start_prod.py

Requires pnpm (global or on PATH). On Windows, Python often cannot run bare `pnpm`
(only pnpm.cmd); this script resolves the real executable.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

WEB_AGENT_DIR = Path(__file__).resolve().parent


def resolve_pnpm() -> str | None:
    """Find pnpm executable. Windows: prefer pnpm.cmd; also check npm global folder."""
    for name in ("pnpm", "pnpm.cmd"):
        p = shutil.which(name)
        if p:
            return p

    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA")
        if appdata:
            for name in ("pnpm.cmd", "pnpm"):
                cand = Path(appdata) / "npm" / name
                if cand.is_file():
                    return str(cand)
        local = os.environ.get("LOCALAPPDATA")
        if local:
            for sub in (
                Path(local) / "npm" / "pnpm.cmd",
                Path(local) / "pnpm" / "pnpm.exe",
            ):
                if sub.is_file():
                    return str(sub)
    return None


def run_pnpm(args: list[str], *, cwd: Path) -> int:
    exe = resolve_pnpm()
    if not exe:
        print(
            "ERROR: pnpm not found. In PowerShell run: npm install -g pnpm\n"
            "  Then ensure your npm global dir is on PATH, or re-open the terminal.\n"
            "  (Global pnpm is often at: %APPDATA%\\npm\\pnpm.cmd)",
            file=sys.stderr,
        )
        return 127
    cmd = [exe, *args]
    print(f"[start_prod] using: {exe}")
    return subprocess.run(cmd, cwd=cwd, check=False).returncode


def main() -> None:
    print(f"[start_prod] cwd={WEB_AGENT_DIR}")

    print("[start_prod] running: pnpm build …")
    code = run_pnpm(["build"], cwd=WEB_AGENT_DIR)
    if code != 0:
        sys.exit(code)

    print("[start_prod] running: pnpm start …")
    code = run_pnpm(["start"], cwd=WEB_AGENT_DIR)
    if code != 0:
        sys.exit(code)


if __name__ == "__main__":
    main()
