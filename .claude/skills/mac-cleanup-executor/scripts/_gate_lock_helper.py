#!/usr/bin/env python3
"""
mac-cleanup-executor :: _gate_lock_helper.py  v1.0.0
Called exclusively by gate_primitive.sh. Not for direct use.

Lock file format v2 (new):
  {"pid": <int>, "created_at": "<ISO8601Z>", "host": "<str>", "cmd": "<str>"}

Lock file format v1 (legacy, read-only backward-compat):
  <plain integer PID>

Commands:
  acquire <lockfile> <pid>   atomic acquire; exit 0=acquired 1=blocked 2=hard error
  release <lockfile> <pid>   verify PID and remove;  exit 0=released 1=error

Exit codes:
  0  success
  1  blocked by live lock OR release PID mismatch
  2  hard error (create failed, permission error on re-create)
"""

import json
import os
import socket
import subprocess
import sys
from datetime import datetime, timezone


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_cmd(pid):
    """Return the command string for pid, truncated to 120 chars."""
    try:
        r = subprocess.run(
            ["ps", "-p", str(pid), "-o", "command="],
            capture_output=True, text=True, timeout=2,
        )
        return (r.stdout.strip() or "<unknown>")[:120]
    except Exception:
        return "<unknown>"


def _get_host():
    try:
        return socket.gethostname()
    except Exception:
        return "<unknown>"


def _new_content(pid):
    """Build v2 JSON lock content for pid."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return json.dumps({
        "pid": pid,
        "created_at": ts,
        "host": _get_host(),
        "cmd": _get_cmd(pid),
    }) + "\n"


def _try_create(path, pid):
    """Atomically create lockfile; raises FileExistsError if already exists."""
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    os.write(fd, _new_content(pid).encode())
    os.close(fd)


def _read_lock(path):
    """
    Parse lockfile. Returns (pid: int, meta: dict).
    - v1 (plain int): returns (pid, {})
    - v2 (JSON):      returns (pid, full_dict)
    Raises ValueError for malformed content.
    """
    with open(path, "r") as f:
        content = f.read().strip()
    # v1: plain integer
    try:
        return int(content), {}
    except ValueError:
        pass
    # v2: JSON object with "pid" key
    try:
        data = json.loads(content)
        return int(data["pid"]), data
    except Exception:
        raise ValueError(f"malformed lock content: {content[:80]!r}")


def _is_process_live(pid):
    """Return True if the process exists (even if owned by another user)."""
    try:
        os.kill(pid, 0)
        return True          # success: process exists
    except ProcessLookupError:
        return False         # ESRCH: no such process
    except PermissionError:
        return True          # EPERM: exists, different owner
    except OSError:
        return False         # unexpected; treat as gone


def _format_age(meta):
    """Return human-readable age string from meta dict created_at field."""
    ca = meta.get("created_at", "")
    if not ca:
        return "age unknown"
    try:
        s = ca if not ca.endswith("Z") else ca[:-1] + "+00:00"
        created = datetime.fromisoformat(s)
        secs = int((datetime.now(timezone.utc) - created).total_seconds())
        if secs < 60:
            return f"{secs}s old"
        elif secs < 3600:
            return f"{secs // 60}m old"
        else:
            return f"{secs // 3600}h{(secs % 3600) // 60}m old"
    except Exception:
        return "age unknown"


# ── commands ──────────────────────────────────────────────────────────────────

def cmd_acquire(args):
    """
    acquire <lockfile> <pid>
    Atomically creates lockfile with v2 JSON content.
    Clears stale (dead PID or malformed) locks automatically.
    Blocks live locks: prints diagnostic + recovery command, exit 1.
    """
    if len(args) < 2:
        print("acquire requires lockfile and pid", file=sys.stderr)
        sys.exit(2)
    lockfile, pid = args[0], int(args[1])

    # First attempt: create atomically
    try:
        _try_create(lockfile, pid)
        sys.exit(0)
    except FileExistsError:
        pass
    except OSError as e:
        print(f"FATAL: gate lock create failed: {e}", file=sys.stderr)
        sys.exit(2)

    # Lock exists — determine if stale or live
    try:
        held_pid, meta = _read_lock(lockfile)
        live = _is_process_live(held_pid)
    except ValueError:
        # Malformed content — treat as stale, clear it
        held_pid, meta, live = None, {}, False

    if not live:
        # Stale (dead PID or malformed): clear and re-acquire
        try:
            os.unlink(lockfile)
        except OSError:
            pass
        try:
            _try_create(lockfile, pid)
            sys.exit(0)
        except OSError as e:
            print(f"FATAL: gate lock re-create failed: {e}", file=sys.stderr)
            sys.exit(2)
    else:
        # Live lock — full diagnostic with operator recovery guidance
        age = _format_age(meta)
        host = meta.get("host", "<unknown>")
        cmd = meta.get("cmd", "<unknown>")
        print(
            f"FATAL: gate lock held by PID {held_pid} ({age}, host={host})",
            file=sys.stderr,
        )
        print(f"       cmd: {cmd}", file=sys.stderr)
        print(f"       Lock file: {lockfile}", file=sys.stderr)
        print(f"       To recover if process is gone: rm {lockfile}", file=sys.stderr)
        sys.exit(1)


def cmd_release(args):
    """
    release <lockfile> <pid>
    Reads lockfile (v1 or v2), verifies PID matches, removes file.
    """
    if len(args) < 2:
        print("release requires lockfile and pid", file=sys.stderr)
        sys.exit(1)
    lockfile, expected_pid = args[0], int(args[1])

    try:
        held_pid, _meta = _read_lock(lockfile)
        if held_pid != expected_pid:
            print(
                f"WARN: gate lock held by PID {held_pid}, not {expected_pid}"
                " — not removing",
                file=sys.stderr,
            )
            sys.exit(1)
        os.unlink(lockfile)
        sys.exit(0)
    except FileNotFoundError:
        sys.exit(0)  # already gone — idempotent success
    except (ValueError, OSError) as e:
        print(f"WARN: gate lock release failed: {e}", file=sys.stderr)
        sys.exit(1)


# ── dispatch ──────────────────────────────────────────────────────────────────

COMMANDS = {
    "acquire": cmd_acquire,
    "release": cmd_release,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        cmds = ", ".join(COMMANDS)
        print(f"usage: {sys.argv[0]} <command> [args]\ncommands: {cmds}", file=sys.stderr)
        sys.exit(2)
    COMMANDS[sys.argv[1]](sys.argv[2:])
