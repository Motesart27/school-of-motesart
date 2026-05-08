#!/usr/bin/env bash
# test_repair_locking.sh  v1.1.0
# Tests that cmd_repair acquires the same flock used by cmd_write.
# Tests: T01–T05

set -u
PASS=0; FAIL=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$SCRIPT_DIR/.."
HELPER="$SCRIPTS/_journal_helper.py"
PY3="$(command -v python3)"

pass() { echo "PASS: $1"; ((PASS++)); }
fail() { echo "FAIL: $1 — $2"; ((FAIL++)); }

# Build a minimal valid event JSON
_ev() {
  local id="$1" state="$2" ts="$3"
  printf '{"v":1,"event_id":"%s","entity_id":"eid","entity_type":"ROOM","asserted_state":"%s","source":"AGENT","source_priority":3,"gate_id":null,"evidence":{},"asserted_at":"%s","ttl_seconds":null}' "$id" "$state" "$ts"
}

# ── T01: repair blocks while write holds the lock ─────────────────────────────
T="T01_repair_blocks_during_write_lock"
{
  TDIR=$(mktemp -d)
  J="$TDIR/journal.ndjson"
  LOCK="$J.lock"
  READY="$TDIR/lock_held"

  # Seed journal with CRLF so repair has actual rewrite work
  printf '%s\r\n' "$(_ev e1 OPEN 2026-01-01T00:00:00Z)" > "$J"

  # Lock holder: acquire lock, signal ready, hold for 4s
  "$PY3" - "$LOCK" "$READY" <<'PY' &
import fcntl, sys, time
lock_path, signal_file = sys.argv[1], sys.argv[2]
with open(lock_path, "w") as lfd:
    fcntl.flock(lfd, fcntl.LOCK_EX)
    open(signal_file, "w").close()  # signal lock is held
    time.sleep(4)
    fcntl.flock(lfd, fcntl.LOCK_UN)
PY
  HOLDER=$!

  # Wait up to 3s for holder to signal lock is held
  WAITED=0
  until [ -f "$READY" ] || [ "$WAITED" -ge 30 ]; do
    sleep 0.1
    WAITED=$((WAITED + 1))
  done

  if [ ! -f "$READY" ]; then
    wait "$HOLDER" 2>/dev/null
    rm -rf "$TDIR"
    fail "$T" "lock holder never signaled ready"
  else
    # Start repair in background — it should block on the lock
    "$PY3" "$HELPER" repair "$J" > /dev/null 2>&1 &
    REPAIR_PID=$!

    # After 0.5s repair must still be waiting
    sleep 0.5
    if kill -0 "$REPAIR_PID" 2>/dev/null; then STILL_RUNNING=1; else STILL_RUNNING=0; fi

    wait "$HOLDER" 2>/dev/null
    wait "$REPAIR_PID" 2>/dev/null
    rm -rf "$TDIR"

    if [ "$STILL_RUNNING" -eq 1 ]; then
      pass "$T"
    else
      fail "$T" "repair did not block (finished before lock was released)"
    fi
  fi
}

# ── T02: write blocks while repair holds the lock ─────────────────────────────
T="T02_write_blocks_during_repair_lock"
{
  TDIR=$(mktemp -d)
  J="$TDIR/journal.ndjson"
  LOCK="$J.lock"
  READY="$TDIR/lock_held"

  printf '%s\r\n' "$(_ev e1 OPEN 2026-01-01T00:00:00Z)" > "$J"

  # Simulate a slow repair by holding the lock file directly
  "$PY3" - "$LOCK" "$READY" <<'PY' &
import fcntl, sys, time
lock_path, signal_file = sys.argv[1], sys.argv[2]
with open(lock_path, "w") as lfd:
    fcntl.flock(lfd, fcntl.LOCK_EX)
    open(signal_file, "w").close()
    time.sleep(4)
    fcntl.flock(lfd, fcntl.LOCK_UN)
PY
  HOLDER=$!

  WAITED=0
  until [ -f "$READY" ] || [ "$WAITED" -ge 30 ]; do
    sleep 0.1
    WAITED=$((WAITED + 1))
  done

  if [ ! -f "$READY" ]; then
    wait "$HOLDER" 2>/dev/null
    rm -rf "$TDIR"
    fail "$T" "lock holder never signaled ready"
  else
    EV=$(_ev e2 CLOSED 2026-01-02T00:00:00Z)
    "$PY3" "$HELPER" write "$J" "$EV" > /dev/null 2>&1 &
    WRITE_PID=$!

    sleep 0.5
    if kill -0 "$WRITE_PID" 2>/dev/null; then STILL_RUNNING=1; else STILL_RUNNING=0; fi

    wait "$HOLDER" 2>/dev/null
    wait "$WRITE_PID" 2>/dev/null
    rm -rf "$TDIR"

    if [ "$STILL_RUNNING" -eq 1 ]; then
      pass "$T"
    else
      fail "$T" "write did not block (finished before lock was released)"
    fi
  fi
}

# ── T03: lock released after repair failure (read-only journal) ───────────────
T="T03_lock_released_after_repair_failure"
{
  TDIR=$(mktemp -d)
  J="$TDIR/journal.ndjson"

  # Write CRLF so repair tries to rewrite, then make it read-only
  printf '%s\r\n' "$(_ev e1 OPEN 2026-01-01T00:00:00Z)" > "$J"
  chmod 444 "$J"

  # Repair should fail (can't rewrite read-only file) but release lock
  "$PY3" "$HELPER" repair "$J" > /dev/null 2>&1
  REPAIR_RC=$?

  chmod 644 "$J"  # restore for write

  # Write must succeed — proves lock was released on failure exit
  EV=$(_ev e2 CLOSED 2026-01-02T00:00:00Z)
  "$PY3" "$HELPER" write "$J" "$EV" > /dev/null 2>&1
  WRITE_RC=$?

  rm -rf "$TDIR"

  if [ "$WRITE_RC" -eq 0 ]; then
    pass "$T"
  else
    fail "$T" "write failed (exit=$WRITE_RC) after repair failure — lock may not have been released"
  fi
}

# ── T04: repaired journal remains replayable ──────────────────────────────────
T="T04_repaired_journal_replayable"
{
  TDIR=$(mktemp -d)
  J="$TDIR/journal.ndjson"

  # Two complete events, then a partial last line (no trailing newline)
  printf '%s\n' "$(_ev e1 OPEN  2026-01-01T00:00:00Z)" > "$J"
  printf '%s\n' "$(_ev e2 CLOSED 2026-01-02T00:00:00Z)" >> "$J"
  printf '{"v":1,"event_id":"e3","entity_id":"eid"' >> "$J"

  # Repair should truncate the partial line and report it
  REPAIR_OUT=$("$PY3" "$HELPER" repair "$J" 2>/dev/null)

  # Replay must succeed and return exactly 2 complete events
  REPLAY_OUT=$("$PY3" "$HELPER" replay "$J" "2099-12-31T23:59:59Z" 1 2>/dev/null)
  EVENT_COUNT=$(echo "$REPLAY_OUT" | grep -c '"event_id"' || true)
  EVENT_COUNT=${EVENT_COUNT:-0}

  rm -rf "$TDIR"

  if echo "$REPAIR_OUT" | grep -q "partial_line_truncated" && [ "$EVENT_COUNT" -eq 2 ]; then
    pass "$T"
  else
    fail "$T" "repair_out='$REPAIR_OUT' event_count=$EVENT_COUNT (expected partial_line_truncated + 2 events)"
  fi
}

# ── T05: concurrent appends + repair produce no interleaved/corrupt lines ─────
# The invariant: flock serializes all write and repair operations so no two
# processes interleave file I/O.  We start from a clean journal and verify
# that every line is valid JSON after 5 concurrent writers + 1 repair finish.
T="T05_concurrent_append_repair_no_corruption"
{
  TDIR=$(mktemp -d)
  J="$TDIR/journal.ndjson"

  # Start with a clean journal — repair on a correct file is a no-op rewrite
  printf '%s\n' "$(_ev e0 OPEN 2026-01-01T00:00:00Z)" > "$J"

  # Concurrent: 1 repair + 5 writes; flock must prevent any interleaving
  "$PY3" "$HELPER" repair "$J" > /dev/null 2>&1 &
  "$PY3" "$HELPER" write "$J" "$(_ev c1 OPEN 2026-02-15T00:00:00Z)" > /dev/null 2>&1 &
  "$PY3" "$HELPER" write "$J" "$(_ev c2 OPEN 2026-03-15T00:00:00Z)" > /dev/null 2>&1 &
  "$PY3" "$HELPER" write "$J" "$(_ev c3 OPEN 2026-04-15T00:00:00Z)" > /dev/null 2>&1 &
  "$PY3" "$HELPER" write "$J" "$(_ev c4 OPEN 2026-05-15T00:00:00Z)" > /dev/null 2>&1 &
  "$PY3" "$HELPER" write "$J" "$(_ev c5 OPEN 2026-06-15T00:00:00Z)" > /dev/null 2>&1 &

  wait 2>/dev/null

  # Every non-empty line must be valid JSON (no interleaved partial writes)
  CORRUPT=0
  LINE_COUNT=0
  if [ -f "$J" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      LINE_COUNT=$((LINE_COUNT + 1))
      "$PY3" -c "import json,sys; json.loads(sys.argv[1])" "$line" 2>/dev/null || { CORRUPT=1; break; }
    done < "$J"
  else
    CORRUPT=1
  fi

  rm -rf "$TDIR"

  if [ "$CORRUPT" -eq 0 ] && [ "$LINE_COUNT" -ge 1 ]; then
    pass "$T"
  else
    fail "$T" "corrupt=$CORRUPT line_count=$LINE_COUNT after concurrent repair+5 appends"
  fi
}

# ── summary ───────────────────────────────────────────────────────────────────
echo ""
echo "test_repair_locking: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
