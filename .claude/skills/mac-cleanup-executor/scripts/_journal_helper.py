#!/usr/bin/env python3
"""
mac-cleanup-executor :: _journal_helper.py  v1.1.0
Called exclusively by journal.sh. Not for direct use.

Commands:
  validate  <json>                          exit 0=valid 1=invalid
  write     <journal_path> <json>           fcntl.flock + append + fsync
  repair    <journal_path>                  truncate partial last line; CRLF normalize
  read      <journal_path> <entity_id> [since_iso]  stream matching events
  replay    <journal_path> <as_of_iso> <max_v>      stream all; halt on unsupported v (exit 2)

Exit codes:
  0  success
  1  operational failure
  2  replay halted on unsupported schema version
"""

import fcntl
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone

REQUIRED_FIELDS = {
    "v", "event_id", "entity_id", "entity_type",
    "asserted_state", "source", "source_priority", "asserted_at",
}
NULLABLE_PRESENT_FIELDS = {"gate_id", "evidence", "ttl_seconds"}

# Canonical source → source_priority mapping (spec-defined, immutable).
# Caller-supplied source_priority values are OVERRIDDEN on build and REJECTED on validate/write.
CANONICAL_SOURCE_PRIORITY = {
    "PHYSICAL":      1,
    "MANIFEST_GATE": 2,
    "AGENT":         3,
    "INFERRED":      4,
}
_CANONICAL_UNKNOWN_PRIORITY = 4


def _canonical_priority(source):
    """Return canonical source_priority for source. Unknown sources → 4."""
    return CANONICAL_SOURCE_PRIORITY.get(source, _CANONICAL_UNKNOWN_PRIORITY)


def _check_priority_mapping(ev):
    """
    Validate source/source_priority consistency against canonical map.
    Returns True if consistent. Prints WARN to stderr and returns False on mismatch.
    Unknown source values (not in CANONICAL_SOURCE_PRIORITY) always pass.
    """
    src = ev.get('source', '')
    spri = ev.get('source_priority')
    canonical = CANONICAL_SOURCE_PRIORITY.get(src)
    if canonical is not None and spri != canonical:
        print(
            f"WARN: source_priority={spri} does not match canonical {canonical} for source={src}",
            file=sys.stderr,
        )
        return False
    return True


# ── helpers ───────────────────────────────────────────────────────────────────

def _parse_json_strict(raw, label="event"):
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"FATAL: invalid JSON in {label}: {exc}", file=sys.stderr)
        return None


def _validate_required(ev):
    missing = REQUIRED_FIELDS - ev.keys()
    if missing:
        print(f"FATAL: missing required fields: {sorted(missing)}", file=sys.stderr)
        return False
    nullable_missing = NULLABLE_PRESENT_FIELDS - ev.keys()
    if nullable_missing:
        print(f"FATAL: nullable-but-required fields absent: {sorted(nullable_missing)}", file=sys.stderr)
        return False
    return True


# ── commands ──────────────────────────────────────────────────────────────────

def cmd_validate(args):
    if not args:
        print("validate requires json argument", file=sys.stderr)
        sys.exit(1)
    ev = _parse_json_strict(args[0])
    if ev is None:
        sys.exit(1)
    if not _validate_required(ev):
        sys.exit(1)
    if not _check_priority_mapping(ev):
        sys.exit(1)
    # Reject breaking-change marker fields
    for key in ev:
        if key.startswith("!"):
            print(f"FATAL: breaking-change field '{key}' encountered", file=sys.stderr)
            sys.exit(1)
    sys.exit(0)


def cmd_write(args):
    if len(args) < 2:
        print("write requires journal_path and event_json", file=sys.stderr)
        sys.exit(1)
    path, line = args[0], args[1]

    ev = _parse_json_strict(line, label="write")
    if ev is None:
        sys.exit(1)
    if not _validate_required(ev):
        sys.exit(1)
    if not _check_priority_mapping(ev):
        sys.exit(1)

    lock_path = path + ".lock"

    def _timeout_handler(sig, frame):
        raise TimeoutError("journal lock timeout after 5s")

    old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(5)
    try:
        with open(lock_path, "w") as lfd:
            fcntl.flock(lfd, fcntl.LOCK_EX)   # blocks until acquired or SIGALRM
            signal.alarm(0)                    # cancel timeout once lock is held
            try:
                with open(path, "a") as jfd:
                    jfd.write(line + "\n")
                    jfd.flush()
                    os.fsync(jfd.fileno())
            finally:
                fcntl.flock(lfd, fcntl.LOCK_UN)
    except TimeoutError as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        sys.exit(1)
    except OSError as exc:
        print(f"FATAL: write failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def cmd_repair(args):
    if not args:
        print("repair requires journal_path", file=sys.stderr)
        sys.exit(1)
    path = args[0]

    if not os.path.exists(path):
        sys.exit(0)

    lock_path = path + ".lock"

    def _timeout_handler(sig, frame):
        raise TimeoutError("journal repair lock timeout after 5s")

    old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(5)
    try:
        with open(lock_path, "w") as lfd:
            fcntl.flock(lfd, fcntl.LOCK_EX)   # blocks until acquired or SIGALRM
            signal.alarm(0)                    # cancel timeout once lock is held
            try:
                try:
                    with open(path, "rb") as f:
                        content = f.read()
                except OSError as exc:
                    print(f"FATAL: repair could not read {path}: {exc}", file=sys.stderr)
                    sys.exit(1)

                if not content:
                    return  # empty; nothing to repair

                # Normalize CRLF → LF
                normalized = content.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
                crlf_fixed = normalized != content
                content = normalized

                # Detect partial last line (file does not end with \n)
                truncate_to = len(content)
                partial_fixed = False

                if not content.endswith(b"\n"):
                    last_nl = content.rfind(b"\n")
                    truncate_to = last_nl + 1 if last_nl != -1 else 0
                    partial_fixed = True

                if crlf_fixed or partial_fixed:
                    final = content[:truncate_to]
                    try:
                        with open(path, "wb") as f:
                            f.write(final)
                            f.flush()
                            os.fsync(f.fileno())
                    except OSError as exc:
                        print(f"FATAL: repair could not rewrite {path}: {exc}", file=sys.stderr)
                        sys.exit(1)
                    parts = []
                    if crlf_fixed:
                        parts.append("crlf_normalized")
                    if partial_fixed:
                        parts.append(f"partial_line_truncated_to_byte={truncate_to}")
                    print(" ".join(parts))
            finally:
                fcntl.flock(lfd, fcntl.LOCK_UN)
    except TimeoutError as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        sys.exit(1)
    except OSError as exc:
        print(f"FATAL: repair lock failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def cmd_read(args):
    if len(args) < 2:
        print("read requires journal_path and entity_id", file=sys.stderr)
        sys.exit(1)
    path, entity_id = args[0], args[1]
    since = args[2] if len(args) > 2 else ""

    if not os.path.exists(path):
        sys.exit(0)

    try:
        with open(path, "r", errors="replace") as f:
            for raw in f:
                line = raw.rstrip("\r\n")
                if not line:
                    continue
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if ev.get("entity_id") != entity_id:
                    continue
                if since and ev.get("asserted_at", "") < since:
                    continue
                print(line)
    except OSError as exc:
        print(f"FATAL: read failed: {exc}", file=sys.stderr)
        sys.exit(1)


def _parse_iso_replay(ts_str):
    """Parse ISO8601 UTC string to aware datetime. Returns None on failure."""
    if not ts_str:
        return None
    try:
        s = ts_str.strip()
        if s.endswith('Z'):
            s = s[:-1] + '+00:00'
        return datetime.fromisoformat(s)
    except (ValueError, AttributeError):
        return None


def cmd_replay(args):
    if len(args) < 3:
        print("replay requires journal_path, as_of, max_schema_version", file=sys.stderr)
        sys.exit(1)
    path, as_of = args[0], args[1]

    # as_of must be a parseable ISO8601 timestamp — replay without it must fail.
    as_of_dt = _parse_iso_replay(as_of)
    if as_of_dt is None:
        print(f"FATAL: replay as_of is missing or malformed: '{as_of}'", file=sys.stderr)
        sys.exit(1)

    try:
        max_v = int(args[2])
    except ValueError:
        print(f"FATAL: max_schema_version must be integer, got: {args[2]}", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(path):
        print(f"FATAL: replay path not found: {path}", file=sys.stderr)
        sys.exit(1)

    print(f"# replay as_of={as_of}", flush=True)

    line_num = 0
    try:
        with open(path, "r", errors="replace") as f:
            for raw in f:
                line_num += 1
                line = raw.rstrip("\r\n")
                if not line or line.startswith("#"):
                    continue

                # Parse JSON
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    print(
                        f"REPLAY_ERROR line={line_num} reason=malformed_json",
                        file=sys.stderr,
                    )
                    continue  # log, skip, continue

                # Schema version check — HALT on unsupported
                v = ev.get("v")
                if v is None:
                    print(
                        f"REPLAY_ERROR line={line_num} reason=missing_v_field",
                        file=sys.stderr,
                    )
                    continue

                try:
                    v_int = int(v)
                except (TypeError, ValueError):
                    print(
                        f"REPLAY_ERROR line={line_num} reason=invalid_v_field v={v}",
                        file=sys.stderr,
                    )
                    continue

                if v_int > max_v:
                    print(
                        f"REPLAY_HALT line={line_num} v={v_int} max_supported={max_v}",
                        file=sys.stderr,
                    )
                    sys.exit(2)  # deterministic halt

                # as_of filter: exclude events asserted after as_of
                ev_at = ev.get("asserted_at", "")
                ev_dt = _parse_iso_replay(ev_at)
                if ev_dt is None:
                    print(
                        f"REPLAY_ERROR line={line_num} reason=malformed_asserted_at"
                        f" asserted_at={ev_at!r}",
                        file=sys.stderr,
                    )
                    continue  # cannot determine position; skip deterministically

                if ev_dt > as_of_dt:
                    continue  # post-as_of: excluded from replay window

                print(line, flush=True)

    except OSError as exc:
        print(f"FATAL: replay read failed: {exc}", file=sys.stderr)
        sys.exit(1)


# ── build_event (used by gate_primitive.sh) ───────────────────────────────────

def cmd_build_event(args):
    """
    build_event <event_id> <entity_id> <entity_type> <asserted_state>
                <source> <source_priority> <gate_id|null> <evidence_json> <asserted_at>
    Outputs a complete StateEvent JSON line. Does not validate; caller (journal_append) validates.
    """
    if len(args) < 9:
        print(f"build_event requires 9 args, got {len(args)}", file=sys.stderr)
        sys.exit(1)

    event_id, entity_id, entity_type, asserted_state = args[0:4]
    source, source_priority_str, gate_id_str, evidence_json, asserted_at = args[4:9]

    try:
        source_priority = int(source_priority_str)
    except ValueError:
        print(f"FATAL: source_priority must be integer, got: {source_priority_str}", file=sys.stderr)
        sys.exit(1)

    # Enforce canonical priority — caller-supplied source_priority is ignored for known sources
    canonical_pri = _canonical_priority(source)
    if source_priority != canonical_pri:
        print(
            f"WARN: build_event: source_priority {source_priority} overridden with canonical {canonical_pri} for source={source}",
            file=sys.stderr,
        )
        source_priority = canonical_pri

    gate_id = None if gate_id_str == "null" else gate_id_str

    try:
        evidence = json.loads(evidence_json)
    except json.JSONDecodeError as exc:
        print(f"FATAL: invalid evidence JSON: {exc}", file=sys.stderr)
        sys.exit(1)

    event = {
        "v": 1,
        "event_id": event_id,
        "entity_id": entity_id,
        "entity_type": entity_type,
        "asserted_state": asserted_state,
        "source": source,
        "source_priority": source_priority,
        "gate_id": gate_id,
        "evidence": evidence,
        "asserted_at": asserted_at,
        "ttl_seconds": None,
    }
    print(json.dumps(event, separators=(",", ":")))


# ── dispatch ──────────────────────────────────────────────────────────────────

COMMANDS = {
    "validate":    cmd_validate,
    "write":       cmd_write,
    "repair":      cmd_repair,
    "read":        cmd_read,
    "replay":      cmd_replay,
    "build_event": cmd_build_event,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        cmds = ", ".join(COMMANDS)
        print(f"usage: {sys.argv[0]} <command> [args]\ncommands: {cmds}", file=sys.stderr)
        sys.exit(1)
    COMMANDS[sys.argv[1]](sys.argv[2:])
