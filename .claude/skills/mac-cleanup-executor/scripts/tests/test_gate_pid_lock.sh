#!/bin/bash
# mac-cleanup-executor :: tests/test_gate_pid_lock.sh  v1.0.0
# Tests for _gate_lock_helper.py v2 PID lock format.
# Proves: v2 JSON format written, v1 backward compat, malformed cleared,
# dead PID cleared, live PID blocked with Lock file: + rm recovery hint.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"
HELPER="$SCRIPTS/_gate_lock_helper.py"
PY3="/usr/bin/python3"

PASS=0; FAIL=0
TEST_ROOT=$(mktemp -d /tmp/mco_pidlock_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() { FAIL=$((FAIL+1)); /bin/echo "  FAIL  $1 — $2"; }

/bin/echo "══ test_gate_pid_lock.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: acquire creates v2 JSON lock with pid, created_at, host, cmd fields
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: acquire creates v2 JSON lock with required fields"
T01_LOCK="$TEST_ROOT/t01.lock"
"$PY3" "$HELPER" acquire "$T01_LOCK" "$$"
T01_RC=$?
[ "$T01_RC" -eq 0 ] \
  && _pass "T01: acquire exits 0" \
  || _fail "T01" "acquire failed (rc=$T01_RC)"
[ -f "$T01_LOCK" ] \
  && _pass "T01: lock file created" \
  || _fail "T01" "lock file not created"
T01_PID=$("$PY3" -c "import json,sys; d=json.loads(open(sys.argv[1]).read()); print(d['pid'])" "$T01_LOCK" 2>/dev/null || true)
[ "${T01_PID:-0}" = "$$" ] \
  && _pass "T01: lock JSON pid = current PID ($$)" \
  || _fail "T01" "lock JSON pid='$T01_PID' (expected $$)"
T01_CA=$("$PY3" -c "import json,sys; d=json.loads(open(sys.argv[1]).read()); print(d.get('created_at',''))" "$T01_LOCK" 2>/dev/null || true)
[[ "${T01_CA:-}" =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}T ]] \
  && _pass "T01: lock JSON created_at is ISO8601 timestamp" \
  || _fail "T01" "lock JSON created_at missing/malformed: '$T01_CA'"
T01_HOST=$("$PY3" -c "import json,sys; d=json.loads(open(sys.argv[1]).read()); print(d.get('host',''))" "$T01_LOCK" 2>/dev/null || true)
[ -n "${T01_HOST:-}" ] \
  && _pass "T01: lock JSON host field present" \
  || _fail "T01" "lock JSON host field empty"
T01_CMD=$("$PY3" -c "import json,sys; d=json.loads(open(sys.argv[1]).read()); print(d.get('cmd',''))" "$T01_LOCK" 2>/dev/null || true)
[ -n "${T01_CMD:-}" ] \
  && _pass "T01: lock JSON cmd field present" \
  || _fail "T01" "lock JSON cmd field empty"
# Clean up
"$PY3" "$HELPER" release "$T01_LOCK" "$$" >/dev/null 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# T02: v1 plain-int stale lock (dead PID) cleared — backward compat
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: v1 plain-int stale lock (dead PID) cleared automatically"
T02_DIR="$TEST_ROOT/t02"
/bin/mkdir -p "$T02_DIR"
( exit 0 ) &
T02_DEAD_PID=$!
wait "$T02_DEAD_PID" 2>/dev/null || true
# Write v1 format: plain integer PID
/bin/echo "$T02_DEAD_PID" > "$T02_DIR/gate.lock"
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR GATE_LOCK_PATH 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open "v1_stale_compat_test" "$T02_DIR" >/dev/null 2>/dev/null
  rc=$?
  gate_close >/dev/null 2>/dev/null
  exit $rc
)
T02_RC=$?
[ "$T02_RC" -eq 0 ] \
  && _pass "T02: gate_open clears v1 stale lock and succeeds" \
  || _fail "T02" "gate_open failed with v1 stale lock (rc=$T02_RC)"
[ ! -f "$T02_DIR/gate.lock" ] \
  && _pass "T02: lock file removed after gate_close" \
  || _fail "T02" "lock file still present after gate_close"

# ─────────────────────────────────────────────────────────────────────────────
# T03: malformed lock content cleared safely — gate opens
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: malformed lock content cleared safely"
T03_DIR="$TEST_ROOT/t03"
/bin/mkdir -p "$T03_DIR"
/bin/echo "not_a_pid_or_json" > "$T03_DIR/gate.lock"
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR GATE_LOCK_PATH 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open "malformed_lock_test" "$T03_DIR" >/dev/null 2>/dev/null
  rc=$?
  gate_close >/dev/null 2>/dev/null
  exit $rc
)
T03_RC=$?
[ "$T03_RC" -eq 0 ] \
  && _pass "T03: gate_open clears malformed lock and succeeds" \
  || _fail "T03" "gate_open failed with malformed lock (rc=$T03_RC)"

# ─────────────────────────────────────────────────────────────────────────────
# T04: v2 JSON dead PID cleared safely — gate opens
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: v2 JSON lock with dead PID cleared safely"
T04_DIR="$TEST_ROOT/t04"
/bin/mkdir -p "$T04_DIR"
( exit 0 ) &
T04_DEAD_PID=$!
wait "$T04_DEAD_PID" 2>/dev/null || true
# Write v2 format JSON with dead PID
"$PY3" -c "
import json, socket
from datetime import datetime, timezone
ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
print(json.dumps({'pid': $T04_DEAD_PID, 'created_at': ts, 'host': socket.gethostname(), 'cmd': 'dead-process'}))
" > "$T04_DIR/gate.lock"
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR GATE_LOCK_PATH 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open "v2_dead_pid_test" "$T04_DIR" >/dev/null 2>/dev/null
  rc=$?
  gate_close >/dev/null 2>/dev/null
  exit $rc
)
T04_RC=$?
[ "$T04_RC" -eq 0 ] \
  && _pass "T04: gate_open clears v2 lock with dead PID and succeeds" \
  || _fail "T04" "gate_open failed with v2 dead-PID lock (rc=$T04_RC)"

# ─────────────────────────────────────────────────────────────────────────────
# T05: live PID in v1 format blocks acquire — Lock file: and rm in stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: live PID in v1 lock blocks acquire with Lock file: and rm hint"
T05_DIR="$TEST_ROOT/t05"
/bin/mkdir -p "$T05_DIR"
T05_LOCK="$T05_DIR/gate.lock"
sleep 60 &
T05_LIVE_PID=$!
# Write v1 plain-int live PID
/bin/echo "$T05_LIVE_PID" > "$T05_LOCK"
T05_STDERR=$("$PY3" "$HELPER" acquire "$T05_LOCK" "$$" 2>&1 >/dev/null || true)
kill "$T05_LIVE_PID" 2>/dev/null; wait "$T05_LIVE_PID" 2>/dev/null || true
rm -f "$T05_LOCK"
echo "$T05_STDERR" | grep -q "Lock file:" \
  && _pass "T05: 'Lock file:' present in stderr on live v1 lock block" \
  || _fail "T05" "missing 'Lock file:' in stderr: $T05_STDERR"
echo "$T05_STDERR" | grep -q "rm " \
  && _pass "T05: 'rm ' recovery command present in stderr on live v1 lock block" \
  || _fail "T05" "missing 'rm ' recovery command in stderr: $T05_STDERR"

# ─────────────────────────────────────────────────────────────────────────────
# T06: live PID in v2 format blocks acquire — Lock file:, age, host, cmd in stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: live PID in v2 lock blocks acquire with full diagnostic in stderr"
T06_DIR="$TEST_ROOT/t06"
/bin/mkdir -p "$T06_DIR"
T06_LOCK="$T06_DIR/gate.lock"
sleep 60 &
T06_LIVE_PID=$!
# Write v2 JSON with live PID
"$PY3" -c "
import json, socket
from datetime import datetime, timezone
ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
print(json.dumps({'pid': $T06_LIVE_PID, 'created_at': ts, 'host': socket.gethostname(), 'cmd': 'sleep 60'}))
" > "$T06_LOCK"
T06_STDERR=$("$PY3" "$HELPER" acquire "$T06_LOCK" "$$" 2>&1 >/dev/null || true)
kill "$T06_LIVE_PID" 2>/dev/null; wait "$T06_LIVE_PID" 2>/dev/null || true
rm -f "$T06_LOCK"
echo "$T06_STDERR" | grep -q "Lock file:" \
  && _pass "T06: 'Lock file:' present in stderr on live v2 lock block" \
  || _fail "T06" "missing 'Lock file:' in stderr: $T06_STDERR"
echo "$T06_STDERR" | grep -q "rm " \
  && _pass "T06: 'rm ' recovery command present in stderr on live v2 lock block" \
  || _fail "T06" "missing 'rm ' in stderr: $T06_STDERR"
echo "$T06_STDERR" | grep -qE "[0-9]+[smh].*old|age unknown" \
  && _pass "T06: age field present in live v2 lock diagnostic" \
  || _fail "T06" "age field missing in stderr: $T06_STDERR"

# ─────────────────────────────────────────────────────────────────────────────
# T07: release verifies PID and removes v2 lock
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: release verifies PID and removes v2 lock"
T07_LOCK="$TEST_ROOT/t07.lock"
"$PY3" "$HELPER" acquire "$T07_LOCK" "$$" >/dev/null 2>/dev/null
[ -f "$T07_LOCK" ] || { _fail "T07" "acquire failed — lock not created"; }
"$PY3" "$HELPER" release "$T07_LOCK" "$$"
T07_RC=$?
[ "$T07_RC" -eq 0 ] \
  && _pass "T07: release exits 0" \
  || _fail "T07" "release failed (rc=$T07_RC)"
[ ! -f "$T07_LOCK" ] \
  && _pass "T07: lock file removed by release" \
  || _fail "T07" "lock file still present after release"

# ─────────────────────────────────────────────────────────────────────────────
# T08: release is idempotent — no-op when lock already gone
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: release is idempotent when lock already gone"
T08_LOCK="$TEST_ROOT/t08.lock"
# Lock does not exist — release must still exit 0
"$PY3" "$HELPER" release "$T08_LOCK" "$$"
T08_RC=$?
[ "$T08_RC" -eq 0 ] \
  && _pass "T08: release exits 0 when lock already gone" \
  || _fail "T08" "release returned non-zero on missing lock (rc=$T08_RC)"

# ─────────────────────────────────────────────────────────────────────────────
# T09: release with wrong PID does not remove lock
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: release with wrong PID does not remove lock"
T09_LOCK="$TEST_ROOT/t09.lock"
"$PY3" "$HELPER" acquire "$T09_LOCK" "$$" >/dev/null 2>/dev/null
# Try to release with a different PID
WRONG_PID=$(( $$ + 99999 ))
"$PY3" "$HELPER" release "$T09_LOCK" "$WRONG_PID" >/dev/null 2>/dev/null
T09_RC=$?
[ "$T09_RC" -ne 0 ] \
  && _pass "T09: release with wrong PID returns non-zero" \
  || _fail "T09" "release with wrong PID returned 0 (should have refused)"
[ -f "$T09_LOCK" ] \
  && _pass "T09: lock file preserved when wrong PID provided" \
  || _fail "T09" "lock file removed despite wrong PID — should not have been touched"
# Clean up
"$PY3" "$HELPER" release "$T09_LOCK" "$$" >/dev/null 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
/bin/echo ""
/bin/echo "══ results ══"
/bin/echo "  passed: $PASS / $TOTAL"
/bin/echo "  failed: $FAIL / $TOTAL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
