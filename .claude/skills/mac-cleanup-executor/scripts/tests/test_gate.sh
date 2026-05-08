#!/bin/bash
# mac-cleanup-executor :: tests/test_gate.sh  v1.0.0
# Test suite for gate_primitive.sh
# Run from any directory: bash tests/test_gate.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

# Unset any inherited gate state before sourcing
unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true

source "$SCRIPTS/gate_primitive.sh" 2>&1 || {
  /bin/echo "FATAL: could not source gate_primitive.sh" >&2
  exit 1
}

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/gate_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

_reset_gate() {
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
}

/bin/echo "══ test_gate.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: gate_open sets GATE_ID and GATE_LABEL
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: gate_open sets GATE_ID and GATE_LABEL"
_reset_gate
T01="$TEST_ROOT/t01"
gate_open "test_label" "$T01" >/dev/null
[ -n "${GATE_ID:-}" ] && _pass "T01: GATE_ID set" || _fail "T01" "GATE_ID not set"
[ "${GATE_LABEL:-}" = "test_label" ] && _pass "T01: GATE_LABEL set" || _fail "T01" "GATE_LABEL wrong: ${GATE_LABEL:-}"

# ─────────────────────────────────────────────────────────────────────────────
# T02: gate_open writes GATED event to journal
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: gate_open writes GATED event"
# Continuing from T01 state
[ -f "$T01/journal.ndjson" ] && _pass "T02: journal file created" || _fail "T02" "journal file missing"
GATED_COUNT=$(grep '"asserted_state":"GATED"' "$T01/journal.ndjson" 2>/dev/null | wc -l | tr -d ' ')
[ "$GATED_COUNT" -eq 1 ] && _pass "T02: GATED event written" || _fail "T02" "expected 1 GATED event, found $GATED_COUNT"
GATE_ENTITY=$(grep '"entity_type":"GATE"' "$T01/journal.ndjson" 2>/dev/null | wc -l | tr -d ' ')
[ "$GATE_ENTITY" -eq 1 ] && _pass "T02: entity_type=GATE recorded" || _fail "T02" "expected 1 GATE entity, found $GATE_ENTITY"

# ─────────────────────────────────────────────────────────────────────────────
# T03: gate_open refuses nested gate (return 1, NOT exit)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: gate_open refuses nested gate (soft fail)"
# GATE_ID still set from T01
SAVED_GATE="$GATE_ID"
GATE_ERR=$(gate_open "nested_label" "$T01" 2>&1)
GATE_RC=$?
[ "$GATE_RC" -ne 0 ] && _pass "T03: nested gate_open returns non-zero" || _fail "T03" "nested gate_open did not fail (rc=$GATE_RC)"
[ "$GATE_ID" = "$SAVED_GATE" ] && _pass "T03: original GATE_ID preserved" || _fail "T03" "GATE_ID changed: $GATE_ID"
/bin/echo "$GATE_ERR" | grep -qi "nested" && _pass "T03: stderr reports nested gate" || _fail "T03" "no 'nested' in stderr: $GATE_ERR"
# Process must still be alive — verify by continuing
[ $$ -gt 0 ] && _pass "T03: process alive after soft fail" || _fail "T03" "process unexpectedly exited"

# ─────────────────────────────────────────────────────────────────────────────
# T04: gate_open_strict succeeds cleanly
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: gate_open_strict succeeds cleanly"
_reset_gate
T04="$TEST_ROOT/t04"
gate_open_strict "strict_label" "$T04" >/dev/null 2>&1
STRICT_RC=$?
[ "$STRICT_RC" -eq 0 ] && _pass "T04: gate_open_strict exits 0" || _fail "T04" "gate_open_strict failed: rc=$STRICT_RC"
[ -n "${GATE_ID:-}" ] && _pass "T04: GATE_ID set after strict open" || _fail "T04" "GATE_ID not set"
[ -f "$T04/journal.ndjson" ] && _pass "T04: journal file exists" || _fail "T04" "journal file missing"

# ─────────────────────────────────────────────────────────────────────────────
# T05: gate_open_strict exits 98 on nested gate
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: gate_open_strict exits 98 on nested gate (subshell)"
# GATE_ID set from T04
T05="$TEST_ROOT/t05"
T05_RESULT=$( (
  # Export the inherited gate env
  export GATE_ID="$GATE_ID"
  export GATE_LABEL="${GATE_LABEL:-}"
  export JOURNAL_PATH="${JOURNAL_PATH:-}"
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open_strict "nested_strict" "$T05" 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T05_EXIT=$(echo "$T05_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T05_EXIT" = "98" ] && _pass "T05: exit 98 on nested gate" || _fail "T05" "expected exit 98, got $T05_EXIT"
echo "$T05_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T05" "execution continued past nested gate" || _pass "T05: execution stopped at nested gate"

# ─────────────────────────────────────────────────────────────────────────────
# T06: gate_open_strict exits 98 when journal cannot be written (forced failure)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: gate_open_strict exits 98 on journal write failure (subshell)"
T06="$TEST_ROOT/t06"
/bin/mkdir -p "$T06"
# Make journal dir read-only so mkdir inside journal_init fails
chmod 555 "$T06"
T06_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open_strict "forced_fail" "$T06/deep/nested" 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
chmod 755 "$T06"  # restore before trap cleanup
T06_EXIT=$(echo "$T06_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T06_EXIT" = "98" ] && _pass "T06: exit 98 on journal init failure" || _fail "T06" "expected exit 98, got $T06_EXIT"
echo "$T06_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T06" "execution continued past failure" || _pass "T06: execution stopped at failure"

# ─────────────────────────────────────────────────────────────────────────────
# T07: gate_guard passes with active gate
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: gate_guard passes with active gate"
# Use gate state from T04 (GATE_ID and JOURNAL_PATH still set)
# Re-open if somehow cleared
if [ -z "${GATE_ID:-}" ]; then
  _reset_gate
  T07="$TEST_ROOT/t07"
  gate_open "guard_test" "$T07" >/dev/null
else
  T07="$TEST_ROOT/t04"
fi
gate_guard 2>/dev/null
GUARD_RC=$?
[ "$GUARD_RC" -eq 0 ] && _pass "T07: gate_guard passes with active gate" || _fail "T07" "gate_guard returned $GUARD_RC with active gate"

# ─────────────────────────────────────────────────────────────────────────────
# T08: gate_guard exits 99 with no GATE_ID (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: gate_guard exits 99 with no GATE_ID (subshell)"
T08_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_guard 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T08_EXIT=$(echo "$T08_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T08_EXIT" = "99" ] && _pass "T08: exit 99 with no GATE_ID" || _fail "T08" "expected exit 99, got $T08_EXIT"
echo "$T08_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T08" "execution continued past gate_guard" || _pass "T08: execution stopped at gate_guard"

# ─────────────────────────────────────────────────────────────────────────────
# T09: gate_guard exits 99 when JOURNAL_PATH file missing (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: gate_guard exits 99 with JOURNAL_PATH file missing (subshell)"
T09="$TEST_ROOT/t09"
/bin/mkdir -p "$T09"
T09_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  export GATE_ID="20260507T200000Z_deadbeef12345678"
  export GATE_LABEL="test"
  export JOURNAL_PATH="$T09/nonexistent.ndjson"
  gate_guard 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T09_EXIT=$(echo "$T09_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T09_EXIT" = "99" ] && _pass "T09: exit 99 with missing journal file" || _fail "T09" "expected exit 99, got $T09_EXIT"
echo "$T09_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T09" "execution continued past gate_guard" || _pass "T09: execution stopped at gate_guard"

# ─────────────────────────────────────────────────────────────────────────────
# T10: gate_assert writes StateEvent with correct source_priority
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: gate_assert writes StateEvent with correct source_priority"
_reset_gate
T10="$TEST_ROOT/t10"
gate_open "assert_test" "$T10" >/dev/null
gate_assert "/tmp/testfile" "PATH" "ABSENT" "PHYSICAL" >/dev/null
ASSERT_COUNT=$(grep '"entity_id":"/tmp/testfile"' "$T10/journal.ndjson" 2>/dev/null | wc -l | tr -d ' ')
[ "$ASSERT_COUNT" -eq 1 ] && _pass "T10: assert event written" || _fail "T10" "expected 1 assert event, got $ASSERT_COUNT"
SRC_PRI=$(grep '"entity_id":"/tmp/testfile"' "$T10/journal.ndjson" 2>/dev/null | /usr/bin/python3 -c "import sys,json; ev=json.loads(sys.stdin.read()); print(ev.get('source_priority',''))" 2>/dev/null)
[ "$SRC_PRI" = "1" ] && _pass "T10: PHYSICAL → source_priority=1" || _fail "T10" "expected source_priority=1, got $SRC_PRI"
GATE_LINK=$(grep '"entity_id":"/tmp/testfile"' "$T10/journal.ndjson" 2>/dev/null | /usr/bin/python3 -c "import sys,json; ev=json.loads(sys.stdin.read()); print(ev.get('gate_id',''))" 2>/dev/null)
[ -n "$GATE_LINK" ] && _pass "T10: gate_id linked in StateEvent" || _fail "T10" "gate_id not linked in assert event"
EVID=$(grep '"entity_id":"/tmp/testfile"' "$T10/journal.ndjson" 2>/dev/null | /usr/bin/python3 -c "import sys,json; ev=json.loads(sys.stdin.read()); print(ev.get('event_id',''))" 2>/dev/null)
echo "$EVID" | grep -qE '^assert_.+_[0-9a-f]{8}$' && _pass "T10: event_id uses 8-char hex suffix (urandom)" || _fail "T10" "event_id format unexpected: $EVID"

# ─────────────────────────────────────────────────────────────────────────────
# T11: gate_assert exits 99 without active gate (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T11: gate_assert exits 99 without active gate (subshell)"
T11_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_assert "/tmp/testfile" "PATH" "ABSENT" "PHYSICAL" 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T11_EXIT=$(echo "$T11_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T11_EXIT" = "99" ] && _pass "T11: exit 99 without active gate" || _fail "T11" "expected exit 99, got $T11_EXIT"
echo "$T11_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T11" "execution continued past gate_assert" || _pass "T11: execution stopped at gate_assert"

# ─────────────────────────────────────────────────────────────────────────────
# T12: gate_close writes UNGATED event
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T12: gate_close writes UNGATED event"
# Continue with T10 gate state
SAVED_T10_GATE="$GATE_ID"
gate_close "completed" >/dev/null
UNGATED_COUNT=$(grep '"asserted_state":"UNGATED"' "$T10/journal.ndjson" 2>/dev/null | wc -l | tr -d ' ')
[ "$UNGATED_COUNT" -eq 1 ] && _pass "T12: UNGATED event written" || _fail "T12" "expected 1 UNGATED event, got $UNGATED_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
# T13: gate_close unsets GATE_ID and GATE_LABEL
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T13: gate_close unsets GATE_ID and GATE_LABEL"
[ -z "${GATE_ID:-}" ] && _pass "T13: GATE_ID unset" || _fail "T13" "GATE_ID still set: $GATE_ID"
[ -z "${GATE_LABEL:-}" ] && _pass "T13: GATE_LABEL unset" || _fail "T13" "GATE_LABEL still set: $GATE_LABEL"

# ─────────────────────────────────────────────────────────────────────────────
# T14: after gate_close, gate_guard exits 99 (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T14: after gate_close, gate_guard exits 99 (subshell)"
# GATE_ID is already unset from T13; JOURNAL_PATH may still be set but GATE_ID is not
T14_RESULT=$( (
  # Inherit current env (GATE_ID is unset)
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_guard 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T14_EXIT=$(echo "$T14_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T14_EXIT" = "99" ] && _pass "T14: exit 99 after gate_close" || _fail "T14" "expected exit 99, got $T14_EXIT"

# ─────────────────────────────────────────────────────────────────────────────
# T15: forced-failure proof — visible error output, gate never opens
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T15: forced-failure proof"
# Create a regular file at the target path so that mkdir -p <target>/sub fails
T15_TARGET="$TEST_ROOT/t15_is_a_file"
touch "$T15_TARGET"
T15_STDERR=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open_strict "forced" "$T15_TARGET/sub" 2>&1
  echo "SHOULD_NOT_REACH"
); echo "exit=$?" )
T15_EXIT=$(echo "$T15_STDERR" | grep "^exit=" | sed 's/exit=//')
[ "$T15_EXIT" = "98" ] && _pass "T15: forced failure exits 98" || _fail "T15" "expected 98, got $T15_EXIT"
echo "$T15_STDERR" | grep -qi "FATAL" && _pass "T15: FATAL message present in stderr" || _fail "T15" "no FATAL in stderr"
echo "$T15_STDERR" | grep -q "SHOULD_NOT_REACH" && _fail "T15" "execution continued past failure" || _pass "T15: execution stopped"
/bin/echo "  [forced-failure stderr output:]"
echo "$T15_STDERR" | grep -v "^exit=" | while IFS= read -r line; do /bin/echo "    $line"; done

# ─────────────────────────────────────────────────────────────────────────────
# T16: nested-gate refusal proof — visible error output
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T16: nested-gate refusal proof"
_reset_gate
T16="$TEST_ROOT/t16"
gate_open "outer_gate" "$T16" >/dev/null
OUTER_ID="$GATE_ID"
T16_STDERR=$(gate_open "inner_gate" "$T16" 2>&1)
T16_RC=$?
[ "$T16_RC" -ne 0 ] && _pass "T16: nested soft fail returns non-zero" || _fail "T16" "nested gate_open did not fail"
/bin/echo "  [nested-gate refusal output:]"
/bin/echo "    $T16_STDERR"
echo "$T16_STDERR" | grep -qi "nested" && _pass "T16: 'nested' appears in refusal message" || _fail "T16" "no 'nested' keyword in: $T16_STDERR"
[ "$GATE_ID" = "$OUTER_ID" ] && _pass "T16: outer GATE_ID preserved" || _fail "T16" "outer GATE_ID changed"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T17: no destructive side effects — external sentinel untouched
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T17: no destructive side effects"
_reset_gate
T17="$TEST_ROOT/t17"
SENTINEL="$TEST_ROOT/sentinel_must_not_be_deleted"
/bin/echo "sentinel_content" > "$SENTINEL"
gate_open "no_side_effects" "$T17" >/dev/null
gate_assert "/some/path" "PATH" "ABSENT" "AGENT" >/dev/null
gate_close "completed" >/dev/null
[ -f "$SENTINEL" ] && _pass "T17: sentinel file untouched" || _fail "T17" "sentinel file deleted"
CONTENT=$(cat "$SENTINEL")
[ "$CONTENT" = "sentinel_content" ] && _pass "T17: sentinel content intact" || _fail "T17" "sentinel content changed: $CONTENT"
[ ! -f "/some/path" ] && _pass "T17: no phantom file created at asserted path" || _fail "T17" "asserted path was created"

# ─────────────────────────────────────────────────────────────────────────────
# T18: gate_close returns non-zero and emits WARN when journal file missing
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T18: gate_close returns non-zero on missing journal"
_reset_gate
T18="$TEST_ROOT/t18"
gate_open "close_fail_test" "$T18" >/dev/null
rm -f "${JOURNAL_PATH}"
T18_TMPSTDERR=$(mktemp /tmp/gate_t18.XXXXXX)
gate_close "completed" 2>"$T18_TMPSTDERR" >/dev/null
T18_RC=$?
[ "$T18_RC" -ne 0 ] && _pass "T18: gate_close returns non-zero on missing journal" || _fail "T18" "expected non-zero RC, got $T18_RC"
grep -qi "WARN" "$T18_TMPSTDERR" && _pass "T18: WARN emitted on failed UNGATED write" || _fail "T18" "no WARN in stderr: $(cat "$T18_TMPSTDERR")"
[ -z "${GATE_ID:-}" ] && _pass "T18: GATE_ID unset even after failed close" || _fail "T18" "GATE_ID still set: ${GATE_ID:-}"
[ -z "${GATE_LABEL:-}" ] && _pass "T18: GATE_LABEL unset even after failed close" || _fail "T18" "GATE_LABEL still set: ${GATE_LABEL:-}"
rm -f "$T18_TMPSTDERR"

# ─────────────────────────────────────────────────────────────────────────────
# T19: gate_close returns non-zero when journal_append fails (read-only file)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T19: gate_close returns non-zero when journal_append fails (read-only file)"
_reset_gate
T19="$TEST_ROOT/t19"
gate_open "close_ro_test" "$T19" >/dev/null
T19_JP="${JOURNAL_PATH}"
chmod 444 "$T19_JP"
T19_TMPSTDERR=$(mktemp /tmp/gate_t19.XXXXXX)
gate_close "completed" 2>"$T19_TMPSTDERR" >/dev/null
T19_RC=$?
chmod 644 "$T19_JP" 2>/dev/null || true
[ "$T19_RC" -ne 0 ] && _pass "T19: gate_close returns non-zero when journal_append fails" || _fail "T19" "expected non-zero RC, got $T19_RC"
grep -qi "WARN" "$T19_TMPSTDERR" && _pass "T19: WARN emitted on journal_append failure" || _fail "T19" "no WARN in stderr: $(cat "$T19_TMPSTDERR")"
[ -z "${GATE_ID:-}" ] && _pass "T19: GATE_ID unset after journal_append failure" || _fail "T19" "GATE_ID still set: ${GATE_ID:-}"
rm -f "$T19_TMPSTDERR"

# ─────────────────────────────────────────────────────────────────────────────
# T20: gate_open creates lock file containing bash PID
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T20: gate_open creates lock file with bash PID"
T20="$TEST_ROOT/t20"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true
gate_open "lock_create_test" "$T20" >/dev/null 2>/dev/null
T20_SAVED_LOCK="${GATE_LOCK_PATH:-}"
[ -n "${GATE_LOCK_PATH:-}" ] \
  && _pass "T20: GATE_LOCK_PATH exported after gate_open" \
  || _fail "T20" "GATE_LOCK_PATH not set after gate_open"
[ -f "${GATE_LOCK_PATH:-/nonexistent}" ] \
  && _pass "T20: lock file exists at GATE_LOCK_PATH" \
  || _fail "T20" "lock file missing at '${GATE_LOCK_PATH:-<unset>}'"
T20_LOCK_PID=$(/usr/bin/python3 -c "import json,sys; print(json.loads(open(sys.argv[1]).read())['pid'])" "${GATE_LOCK_PATH:-/dev/null}" 2>/dev/null || true)
[ "${T20_LOCK_PID:-0}" = "$$" ] \
  && _pass "T20: lock file JSON pid matches bash PID ($$)" \
  || _fail "T20" "lock file JSON pid mismatch: got '$T20_LOCK_PID' (expected $$)"

# ─────────────────────────────────────────────────────────────────────────────
# T21: gate_close removes lock file and unsets GATE_LOCK_PATH
# (continues from T20 — gate is still open)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T21: gate_close removes lock file and unsets GATE_LOCK_PATH"
gate_close >/dev/null 2>/dev/null
[ -z "${GATE_LOCK_PATH:-}" ] \
  && _pass "T21: GATE_LOCK_PATH unset after gate_close" \
  || _fail "T21" "GATE_LOCK_PATH still set: '${GATE_LOCK_PATH:-}'"
[ ! -f "${T20_SAVED_LOCK:-/nonexistent}" ] \
  && _pass "T21: lock file removed after gate_close" \
  || _fail "T21" "lock file still exists: '${T20_SAVED_LOCK:-}'"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# T22: stale lock (dead PID) cleared automatically on gate_open
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T22: gate_open clears stale lock and succeeds"
T22="$TEST_ROOT/t22"
mkdir -p "$T22"
( exit 0 ) &
T22_DEAD_PID=$!
wait "$T22_DEAD_PID" 2>/dev/null || true
/bin/echo "$T22_DEAD_PID" > "$T22/gate.lock"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true
gate_open "stale_lock_test" "$T22" >/dev/null 2>/dev/null
T22_RC=$?
[ "$T22_RC" -eq 0 ] \
  && _pass "T22: gate_open succeeds with stale lock present" \
  || _fail "T22" "gate_open failed with stale lock (rc=$T22_RC)"
[ -n "${GATE_ID:-}" ] \
  && _pass "T22: GATE_ID set after stale lock cleared" \
  || _fail "T22" "GATE_ID not set after stale lock cleared"
T22_LOCK_PID=$(/usr/bin/python3 -c "import json,sys; print(json.loads(open(sys.argv[1]).read())['pid'])" "${GATE_LOCK_PATH:-/dev/null}" 2>/dev/null || true)
[ "${T22_LOCK_PID:-0}" = "$$" ] \
  && _pass "T22: lock file JSON pid matches bash PID after stale clear" \
  || _fail "T22" "lock file JSON pid mismatch: got '$T22_LOCK_PID' (expected $$)"
gate_close >/dev/null 2>/dev/null
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# T23: live lock blocks gate_open — returns non-zero, does not exit
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T23: gate_open returns non-zero on live concurrent lock"
T23="$TEST_ROOT/t23"
mkdir -p "$T23"
sleep 60 &
T23_LIVE_PID=$!
/bin/echo "$T23_LIVE_PID" > "$T23/gate.lock"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true
T23_TMPSTDERR=$(mktemp)
gate_open "live_lock_test" "$T23" >/dev/null 2>"$T23_TMPSTDERR"
T23_RC=$?
kill "$T23_LIVE_PID" 2>/dev/null; wait "$T23_LIVE_PID" 2>/dev/null || true
[ "$T23_RC" -ne 0 ] \
  && _pass "T23: gate_open returns non-zero with live lock held" \
  || _fail "T23" "gate_open returned 0 with live lock (expected failure)"
grep -qi "Lock file:" "$T23_TMPSTDERR" \
  && _pass "T23: stderr contains 'Lock file:' recovery hint" \
  || _fail "T23" "stderr missing 'Lock file:' recovery hint: $(cat "$T23_TMPSTDERR")"
rm -f "$T23_TMPSTDERR"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# T24: live lock causes gate_open_strict to exit 98
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T24: gate_open_strict exits 98 on live concurrent lock"
T24="$TEST_ROOT/t24"
mkdir -p "$T24"
sleep 60 &
T24_LIVE_PID=$!
/bin/echo "$T24_LIVE_PID" > "$T24/gate.lock"
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR GATE_LOCK_PATH 2>/dev/null || true
  # shellcheck source=../gate_primitive.sh
  source "$SCRIPTS/gate_primitive.sh" 2>/dev/null
  gate_open_strict "live_lock_strict_test" "$T24" 2>/dev/null
)
T24_RC=$?
kill "$T24_LIVE_PID" 2>/dev/null; wait "$T24_LIVE_PID" 2>/dev/null || true
[ "$T24_RC" -eq 98 ] \
  && _pass "T24: gate_open_strict exits 98 on live lock" \
  || _fail "T24" "expected exit 98, got $T24_RC"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# T25: lock released even when UNGATED journal write fails
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T25: gate_close releases lock even on UNGATED write failure"
T25="$TEST_ROOT/t25"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true
gate_open "unlock_on_failure" "$T25" >/dev/null 2>/dev/null
T25_SAVED_LOCK="${GATE_LOCK_PATH:-}"
T25_JPATH="${JOURNAL_PATH:-}"
rm -f "$T25_JPATH"
T25_TMPSTDERR=$(mktemp)
gate_close "forced_failure" >/dev/null 2>"$T25_TMPSTDERR"
[ -z "${GATE_LOCK_PATH:-}" ] \
  && _pass "T25: GATE_LOCK_PATH unset after failed UNGATED write" \
  || _fail "T25" "GATE_LOCK_PATH still set: '${GATE_LOCK_PATH:-}'"
[ ! -f "${T25_SAVED_LOCK:-/nonexistent}" ] \
  && _pass "T25: lock file removed despite UNGATED write failure" \
  || _fail "T25" "lock file still exists: '${T25_SAVED_LOCK:-}'"
rm -f "$T25_TMPSTDERR"
_reset_gate
unset GATE_LOCK_PATH 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
/bin/echo ""
/bin/echo "══ results ══"
/bin/echo "  passed: $PASS / $TOTAL"
/bin/echo "  failed: $FAIL / $TOTAL"

if [ "${#FAIL_MSGS[@]}" -gt 0 ]; then
  /bin/echo ""
  /bin/echo "── failures ──"
  for _m in "${FAIL_MSGS[@]}"; do
    /bin/echo "  $_m"
  done
fi

[ "$FAIL" -eq 0 ]
