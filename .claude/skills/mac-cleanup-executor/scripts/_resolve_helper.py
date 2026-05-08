#!/usr/bin/env python3
"""
mac-cleanup-executor :: _resolve_helper.py  v1.1.0
Called exclusively by resolve.sh. Not for direct use.

Commands:
  resolve  <journal_path> <entity_id> [as_of_iso]   → StateRecord JSON (exit 0)
  audit    <journal_path> <since> <until> <etype>    → stream filtered events
  confidence <events_json>                           → confidence string

Resolution rules:
  - Lower source_priority wins (PHYSICAL=1 > MANIFEST_GATE=2 > AGENT=3 > INFERRED=4)
  - Same priority: most recent asserted_at wins
  - Same priority + same timestamp: conflict → UNCERTAIN
  - No events: UNCERTAIN
  - POST_HOC_MANIFEST in evidence.breach_flags: demotes MANIFEST_GATE → priority 3
  - TTL expired (ttl_seconds not null, now > asserted_at+ttl): confidence → LOW
  - GATE lifecycle events (entity_type=GATE) are excluded from state projection

Malformed events: logged to stderr, NOT silently skipped. Processing continues.

Exit codes:
  0  success
  1  operational failure
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

# Canonical source → source_priority mapping (spec-defined, immutable).
CANONICAL_SOURCE_PRIORITY = {
    "PHYSICAL":      1,
    "MANIFEST_GATE": 2,
    "AGENT":         3,
    "INFERRED":      4,
}


# ── helpers ───────────────────────────────────────────────────────────────────

def _parse_iso(ts_str):
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


def _now_utc():
    return datetime.now(timezone.utc)


def _load_entity_events(path, entity_id, as_of=None):
    """
    Load events for entity_id from journal, optionally filtered by as_of (inclusive).
    Returns (events_list, malformed_count).
    Malformed lines are logged to stderr and NOT silently skipped.
    """
    events = []
    malformed = 0
    line_num = 0

    try:
        with open(path, 'r', errors='replace') as f:
            for raw in f:
                line_num += 1
                line = raw.rstrip('\r\n')
                if not line:
                    continue

                try:
                    ev = json.loads(line)
                except json.JSONDecodeError as exc:
                    malformed += 1
                    print(
                        f"RESOLVE_WARN line={line_num} reason=malformed_json: {exc}",
                        file=sys.stderr,
                    )
                    continue

                if ev.get('entity_id') != entity_id:
                    continue

                # as_of filter: exclude events newer than as_of
                if as_of:
                    ev_ts = ev.get('asserted_at', '')
                    if ev_ts > as_of:
                        continue

                events.append(ev)

    except OSError as exc:
        print(f"FATAL: resolve read failed: {exc}", file=sys.stderr)
        sys.exit(1)

    return events, malformed


def _apply_priority_mismatch_demotion(events):
    """
    If a known source carries a source_priority that does not match the canonical map,
    demote that event to priority=4 (worst) so it cannot win arbitration over
    correctly-formed events. Emits RESOLVE_WARN to stderr for each demoted event.
    Unknown source values (not in CANONICAL_SOURCE_PRIORITY) are left unchanged.
    Returns new list; does not mutate input events.
    """
    result = []
    for ev in events:
        src = ev.get('source', '')
        spri = ev.get('source_priority')
        canonical = CANONICAL_SOURCE_PRIORITY.get(src)
        if canonical is not None and spri != canonical:
            print(
                f"RESOLVE_WARN mismatch: source={src} source_priority={spri} expected={canonical}"
                f" — demoted to priority=4",
                file=sys.stderr,
            )
            ev = dict(ev)
            ev['source_priority'] = 4
            ev['_mismatch_demoted'] = True
        result.append(ev)
    return result


def _apply_post_hoc_demotion(events):
    """
    POST_HOC_MANIFEST breach flag demotes MANIFEST_GATE source_priority 2 → 3.
    Returns new list; does not mutate input events.
    """
    result = []
    for ev in events:
        evidence = ev.get('evidence') or {}
        breach_flags = evidence.get('breach_flags', []) if isinstance(evidence, dict) else []
        if 'POST_HOC_MANIFEST' in breach_flags and ev.get('source') == 'MANIFEST_GATE':
            ev = dict(ev)
            ev['source_priority'] = max(int(ev.get('source_priority', 2)), 3)
            ev['_post_hoc_demoted'] = True
        result.append(ev)
    return result


def _compute_confidence(winner, ttl_expired):
    """Map winning event + TTL status → confidence string."""
    if ttl_expired:
        return 'LOW'
    priority = winner.get('source_priority', 99)
    if priority == 1:
        return 'HIGH'
    elif priority == 2:
        return 'MEDIUM'
    else:
        return 'LOW'


def _resolve_winner(events):
    """
    Walk event list and find the winning event.
    Returns (winner, conflict_bool).
    Skips GATE lifecycle events (entity_type=GATE).
    """
    winner = None
    conflict = False

    for ev in events:
        if ev.get('entity_type') == 'GATE':
            continue

        if winner is None:
            winner = ev
            conflict = False
            continue

        ev_pri = int(ev.get('source_priority', 99))
        win_pri = int(winner.get('source_priority', 99))

        if ev_pri < win_pri:
            winner = ev
            conflict = False
        elif ev_pri == win_pri:
            ev_ts = ev.get('asserted_at', '')
            win_ts = winner.get('asserted_at', '')
            if ev_ts > win_ts:
                winner = ev
                conflict = False
            elif ev_ts == win_ts:
                conflict = True
            # ev_ts < win_ts → current winner stays, conflict state unchanged

    return winner, conflict


def _uncertain(entity_id, as_of, reason):
    """Build an UNCERTAIN StateRecord."""
    return {
        "entity_id": entity_id,
        "asserted_state": "UNCERTAIN",
        "source": None,
        "source_priority": None,
        "confidence": "UNCERTAIN",
        "asserted_at": None,
        "gate_id": None,
        "ttl_expired": False,
        "conflict": False,
        "as_of": as_of if as_of else "live",
        "reason": reason,
    }


# ── commands ──────────────────────────────────────────────────────────────────

def cmd_resolve(args):
    """
    resolve <journal_path> <entity_id> [as_of_iso]
    Outputs a single StateRecord JSON line.
    Unknown entity or empty journal → UNCERTAIN (exit 0).
    """
    if len(args) < 2:
        print("resolve requires journal_path and entity_id", file=sys.stderr)
        sys.exit(1)

    path = args[0]
    entity_id = args[1]
    as_of = args[2] if len(args) > 2 else None

    # Determine TTL check time
    check_time = _parse_iso(as_of) if as_of else _now_utc()

    if not os.path.exists(path):
        print(json.dumps(_uncertain(entity_id, as_of, "journal_path_not_found"), separators=(',', ':')))
        return

    events, _malformed = _load_entity_events(path, entity_id, as_of)

    if not events:
        print(json.dumps(_uncertain(entity_id, as_of, "no_events"), separators=(',', ':')))
        return

    # Apply priority mismatch demotion — corrupt events cannot win arbitration
    events = _apply_priority_mismatch_demotion(events)
    # Apply POST_HOC_MANIFEST demotion
    events = _apply_post_hoc_demotion(events)

    winner, conflict = _resolve_winner(events)

    if winner is None:
        print(json.dumps(_uncertain(entity_id, as_of, "no_state_events"), separators=(',', ':')))
        return

    if conflict:
        record = {
            "entity_id": entity_id,
            "asserted_state": "UNCERTAIN",
            "source": winner.get('source'),
            "source_priority": winner.get('source_priority'),
            "confidence": "UNCERTAIN",
            "asserted_at": winner.get('asserted_at'),
            "gate_id": winner.get('gate_id'),
            "ttl_expired": False,
            "conflict": True,
            "as_of": as_of if as_of else "live",
        }
        print(json.dumps(record, separators=(',', ':')))
        return

    # TTL check
    ttl_expired = False
    ttl_seconds = winner.get('ttl_seconds')
    if ttl_seconds is not None and check_time is not None:
        try:
            asserted_dt = _parse_iso(winner.get('asserted_at', ''))
            if asserted_dt and check_time > asserted_dt + timedelta(seconds=int(ttl_seconds)):
                ttl_expired = True
        except (TypeError, ValueError):
            pass

    confidence = _compute_confidence(winner, ttl_expired)

    record = {
        "entity_id": entity_id,
        "asserted_state": winner.get('asserted_state', 'UNKNOWN'),
        "source": winner.get('source'),
        "source_priority": winner.get('source_priority'),
        "confidence": confidence,
        "asserted_at": winner.get('asserted_at'),
        "gate_id": winner.get('gate_id'),
        "ttl_expired": ttl_expired,
        "conflict": False,
        "as_of": as_of if as_of else "live",
    }
    print(json.dumps(record, separators=(',', ':')))


def cmd_audit(args):
    """
    audit <journal_path> <since> <until> <entity_type>
    Empty string = no filter. Streams matching events.
    Malformed lines: logged to stderr, not halted.
    """
    if not args:
        print("audit requires journal_path", file=sys.stderr)
        sys.exit(1)

    path = args[0]
    since = args[1] if len(args) > 1 else ''
    until = args[2] if len(args) > 2 else ''
    entity_type = args[3] if len(args) > 3 else ''

    if not os.path.exists(path):
        sys.exit(0)

    line_num = 0
    try:
        with open(path, 'r', errors='replace') as f:
            for raw in f:
                line_num += 1
                line = raw.rstrip('\r\n')
                if not line:
                    continue

                try:
                    ev = json.loads(line)
                except json.JSONDecodeError as exc:
                    print(
                        f"AUDIT_WARN line={line_num} reason=malformed_json: {exc}",
                        file=sys.stderr,
                    )
                    continue

                ts = ev.get('asserted_at', '')
                if since and ts < since:
                    continue
                if until and ts > until:
                    continue
                if entity_type and ev.get('entity_type', '') != entity_type:
                    continue

                print(line, flush=True)

    except OSError as exc:
        print(f"FATAL: audit read failed: {exc}", file=sys.stderr)
        sys.exit(1)


def cmd_confidence(args):
    """
    confidence <events_json>
    events_json: JSON array of StateEvent objects.
    Returns one of: HIGH, MEDIUM, LOW, UNCERTAIN
    """
    if not args:
        print("confidence requires events_json", file=sys.stderr)
        sys.exit(1)

    try:
        events = json.loads(args[0])
    except json.JSONDecodeError as exc:
        print(f"FATAL: invalid events JSON: {exc}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(events, list):
        print("FATAL: events_json must be a JSON array", file=sys.stderr)
        sys.exit(1)

    if not events:
        print("UNCERTAIN")
        return

    events = _apply_priority_mismatch_demotion(events)
    events = _apply_post_hoc_demotion(events)
    winner, conflict = _resolve_winner(events)

    if winner is None or conflict:
        print("UNCERTAIN")
        return

    print(_compute_confidence(winner, False))


# ── dispatch ──────────────────────────────────────────────────────────────────

COMMANDS = {
    "resolve":    cmd_resolve,
    "audit":      cmd_audit,
    "confidence": cmd_confidence,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        cmds = ", ".join(COMMANDS)
        print(f"usage: {sys.argv[0]} <command> [args]\ncommands: {cmds}", file=sys.stderr)
        sys.exit(1)
    COMMANDS[sys.argv[1]](sys.argv[2:])
