#!/bin/bash
# mac-cleanup-executor :: tests/test_replay_as_of.sh  v1.0.0
# Tests for replay as_of correctness (HIGH #1).
# Proves:
#   - post-as_of event is excluded
#   - pre-as_of event is included
#   - exact as_of timestamp event is included (asserted_at == as_of)
#   - malformed asserted_at reports REPLAY_ERROR deterministically
#   - missing asserted_at reports REPLAY_ERROR deterministically
#   - replay without as_of still fails (empty and missing)
#   - replay consistency: same input always produces same output
# No cleanup scripts executed. No real files modified.
# Run from any directory: bash tests/test_replay_as_of.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"
PY3="/usr/bin/python3"
HELPER="$SCRIPTS/_journal_helper.py"

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/replay_as_of_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

# Write a minimal valid v=1 event with a specific asserted_at directly to a journal.
# Usage: _append_event <journal_path> <entity_id> <asserted_at>
_append_event() {
  local jpath="$1" eid="$2" ts="$3"
  /bin/echo "{\"v\":1,\"event_id\":\"ev_${eid}_$$\",\"entity_id\":\"$eid\",\"entity_type\":\"PATH\",\"asserted_state\":\"EXISTS\",\"source\":\"MANIFEST_GATE\",\"source_priority\":2,\"gate_id\":null,\"evidence\":{\"manifest_path\":null,\"physical_check\":null,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]},\"asserted_at\":\"$ts\",\"ttl_seconds\":null}" >> "$jpath"
}

# Write an event with a deliberately malformed asserted_at.
_append_event_bad_ts() {
  local jpath="$1" eid="$2" bad_ts="$3"
  /bin/echo "{\"v\":1,\"event_id\":\"ev_bad_${eid}_$$\",\"entity_id\":\"$eid\",\"entity_type\":\"PATH\",\"asserted_state\":\"EXISTS\",\"source\":\"MANIFEST_GATE\",\"source_priority\":2,\"gate_id\":null,\"evidence\":{\"manifest_path\":null,\"physical_check\":null,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]},\"asserted_at\":\"$bad_ts\",\"ttl_seconds\":null}" >> "$jpath"
}

# Write an event with asserted_at omitted entirely.
_append_event_no_ts() {
  local jpath="$1" eid="$2"
  /bin/echo "{\"v\":1,\"event_id\":\"ev_nots_${eid}_$$\",\"entity_id\":\"$eid\",\"entity_type\":\"PATH\",\"asserted_state\":\"EXISTS\",\"source\":\"MANIFEST_GATE\",\"source_priority\":2,\"gate_id\":null,\"evidence\":{\"manifest_path\":null,\"physical_check\":null,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]},\"ttl_seconds\":null}" >> "$jpath"
}

/bin/echo "══ test_replay_as_of.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: pre-as_of event is included
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: pre-as_of event included"
T01_J="$TEST_ROOT/t01.journal"
_append_event "$T01_J" "eid_t01" "2026-01-01T09:00:00Z"
T01_OUT=$("$PY3" "$HELPER" replay "$T01_J" "2026-01-01T12:00:00Z" 1 2>/dev/null | grep -v '^#')
T01_COUNT=$(echo "$T01_OUT" | grep -c '"eid_t01"' 2>/dev/null || /bin/echo 0)
[ "$T01_COUNT" -ge 1 ] \
  && _pass "T01: pre-as_of event present in output (count=$T01_COUNT)" \
  || _fail "T01" "expected event in output, found $T01_COUNT lines matching eid_t01"

# ─────────────────────────────────────────────────────────────────────────────
# T02: post-as_of event is excluded
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: post-as_of event excluded"
T02_J="$TEST_ROOT/t02.journal"
_append_event "$T02_J" "eid_t02" "2026-01-02T09:00:00Z"
T02_OUT=$("$PY3" "$HELPER" replay "$T02_J" "2026-01-01T12:00:00Z" 1 2>/dev/null | grep -v '^#')
T02_COUNT=$(echo "$T02_OUT" | grep -c '"eid_t02"' 2>/dev/null); T02_COUNT=${T02_COUNT:-0}
[ "$T02_COUNT" -eq 0 ] \
  && _pass "T02: post-as_of event absent from output (count=$T02_COUNT)" \
  || _fail "T02" "expected 0 matching events, found $T02_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
# T03: exact as_of timestamp event is included (asserted_at == as_of)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: exact as_of timestamp event included"
T03_J="$TEST_ROOT/t03.journal"
_append_event "$T03_J" "eid_t03" "2026-01-01T12:00:00Z"
T03_OUT=$("$PY3" "$HELPER" replay "$T03_J" "2026-01-01T12:00:00Z" 1 2>/dev/null | grep -v '^#')
T03_COUNT=$(echo "$T03_OUT" | grep -c '"eid_t03"' 2>/dev/null || /bin/echo 0)
[ "$T03_COUNT" -ge 1 ] \
  && _pass "T03: exact as_of timestamp event included (count=$T03_COUNT)" \
  || _fail "T03" "expected event with asserted_at==as_of, found $T03_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
# T04: malformed asserted_at emits REPLAY_ERROR to stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: malformed asserted_at → REPLAY_ERROR"
T04_J="$TEST_ROOT/t04.journal"
_append_event_bad_ts "$T04_J" "eid_t04" "not-a-date"
T04_STDERR=$(mktemp)
"$PY3" "$HELPER" replay "$T04_J" "2026-01-01T12:00:00Z" 1 >/dev/null 2>"$T04_STDERR"
T04_ERR=$(grep -c "REPLAY_ERROR" "$T04_STDERR" 2>/dev/null || /bin/echo 0)
T04_REASON=$(grep "REPLAY_ERROR" "$T04_STDERR" | grep -c "malformed_asserted_at" 2>/dev/null || /bin/echo 0)
rm -f "$T04_STDERR"
[ "$T04_ERR" -ge 1 ] \
  && _pass "T04: REPLAY_ERROR emitted for malformed asserted_at" \
  || _fail "T04" "expected REPLAY_ERROR, found 0"
[ "$T04_REASON" -ge 1 ] \
  && _pass "T04: reason=malformed_asserted_at in error" \
  || _fail "T04" "REPLAY_ERROR did not include reason=malformed_asserted_at"

# ─────────────────────────────────────────────────────────────────────────────
# T05: missing asserted_at emits REPLAY_ERROR to stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: missing asserted_at → REPLAY_ERROR"
T05_J="$TEST_ROOT/t05.journal"
_append_event_no_ts "$T05_J" "eid_t05"
T05_STDERR=$(mktemp)
"$PY3" "$HELPER" replay "$T05_J" "2026-01-01T12:00:00Z" 1 >/dev/null 2>"$T05_STDERR"
T05_ERR=$(grep -c "REPLAY_ERROR" "$T05_STDERR" 2>/dev/null || /bin/echo 0)
rm -f "$T05_STDERR"
[ "$T05_ERR" -ge 1 ] \
  && _pass "T05: REPLAY_ERROR emitted for missing asserted_at" \
  || _fail "T05" "expected REPLAY_ERROR, found 0"

# Prove the malformed event does NOT appear in stdout (excluded, not silently passed through)
T05_J2="$TEST_ROOT/t05b.journal"
_append_event_no_ts "$T05_J2" "eid_t05b"
T05_STDOUT=$("$PY3" "$HELPER" replay "$T05_J2" "2026-01-01T12:00:00Z" 1 2>/dev/null | grep -v '^#')
T05_IN_OUT=$(echo "$T05_STDOUT" | grep -c '"eid_t05b"' 2>/dev/null); T05_IN_OUT=${T05_IN_OUT:-0}
[ "$T05_IN_OUT" -eq 0 ] \
  && _pass "T05: malformed event excluded from stdout (not silently passed)" \
  || _fail "T05" "malformed event appeared in stdout ($T05_IN_OUT lines)"

# ─────────────────────────────────────────────────────────────────────────────
# T06: replay with empty as_of fails
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: replay with empty as_of fails"
T06_J="$TEST_ROOT/t06.journal"
_append_event "$T06_J" "eid_t06" "2026-01-01T09:00:00Z"
T06_RC=0
"$PY3" "$HELPER" replay "$T06_J" "" 1 >/dev/null 2>/dev/null || T06_RC=$?
[ "$T06_RC" -ne 0 ] \
  && _pass "T06: empty as_of fails (rc=$T06_RC)" \
  || _fail "T06" "expected non-zero, got 0"

# ─────────────────────────────────────────────────────────────────────────────
# T07: replay with too few args fails
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: replay with only 1 arg fails"
T07_J="$TEST_ROOT/t07.journal"
_append_event "$T07_J" "eid_t07" "2026-01-01T09:00:00Z"
T07_RC=0
"$PY3" "$HELPER" replay "$T07_J" >/dev/null 2>/dev/null || T07_RC=$?
[ "$T07_RC" -ne 0 ] \
  && _pass "T07: replay with 1 arg fails (rc=$T07_RC)" \
  || _fail "T07" "expected non-zero, got 0"

# ─────────────────────────────────────────────────────────────────────────────
# T08: malformed as_of timestamp fails
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: malformed as_of fails"
T08_J="$TEST_ROOT/t08.journal"
_append_event "$T08_J" "eid_t08" "2026-01-01T09:00:00Z"
T08_RC=0
"$PY3" "$HELPER" replay "$T08_J" "not-a-timestamp" 1 >/dev/null 2>/dev/null || T08_RC=$?
[ "$T08_RC" -ne 0 ] \
  && _pass "T08: malformed as_of fails (rc=$T08_RC)" \
  || _fail "T08" "expected non-zero, got 0"

# ─────────────────────────────────────────────────────────────────────────────
# T09: multiple events — only pre-as_of events in output, count verified
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: multiple events — only pre-as_of events in output"
T09_J="$TEST_ROOT/t09.journal"
_append_event "$T09_J" "eid_t09_a" "2026-01-01T08:00:00Z"   # before
_append_event "$T09_J" "eid_t09_b" "2026-01-01T10:00:00Z"   # before
_append_event "$T09_J" "eid_t09_c" "2026-01-01T12:00:00Z"   # exact (included)
_append_event "$T09_J" "eid_t09_d" "2026-01-01T14:00:00Z"   # after (excluded)
_append_event "$T09_J" "eid_t09_e" "2026-01-02T00:00:00Z"   # after (excluded)
T09_AS_OF="2026-01-01T12:00:00Z"
T09_OUT=$("$PY3" "$HELPER" replay "$T09_J" "$T09_AS_OF" 1 2>/dev/null | grep -v '^#')
T09_COUNT=$(echo "$T09_OUT" | grep -c '"entity_id"' 2>/dev/null || /bin/echo 0)
[ "$T09_COUNT" -eq 3 ] \
  && _pass "T09: exactly 3 events in output (a,b,c included; d,e excluded)" \
  || _fail "T09" "expected 3 events, got $T09_COUNT"
T09_HAS_D=$(echo "$T09_OUT" | grep -c '"eid_t09_d"' 2>/dev/null); T09_HAS_D=${T09_HAS_D:-0}
T09_HAS_E=$(echo "$T09_OUT" | grep -c '"eid_t09_e"' 2>/dev/null); T09_HAS_E=${T09_HAS_E:-0}
[ "$T09_HAS_D" -eq 0 ] && [ "$T09_HAS_E" -eq 0 ] \
  && _pass "T09: post-as_of events d and e absent from output" \
  || _fail "T09" "post-as_of events leaked into output (d=$T09_HAS_D e=$T09_HAS_E)"
/bin/echo "  [proof — as_of=$T09_AS_OF: included=3 excluded=2 (d=$T09_HAS_D e=$T09_HAS_E)]"

# ─────────────────────────────────────────────────────────────────────────────
# T10: consistency — same input twice produces identical output
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: consistency — two identical runs produce identical stdout"
T10_J="$TEST_ROOT/t10.journal"
_append_event "$T10_J" "eid_t10_x" "2026-01-01T09:00:00Z"
_append_event "$T10_J" "eid_t10_y" "2026-01-01T11:00:00Z"
_append_event "$T10_J" "eid_t10_z" "2026-01-01T15:00:00Z"
T10_AS_OF="2026-01-01T12:00:00Z"
T10_RUN1=$("$PY3" "$HELPER" replay "$T10_J" "$T10_AS_OF" 1 2>/dev/null | grep -v '^#')
T10_RUN2=$("$PY3" "$HELPER" replay "$T10_J" "$T10_AS_OF" 1 2>/dev/null | grep -v '^#')
[ "$T10_RUN1" = "$T10_RUN2" ] \
  && _pass "T10: two replay runs produce identical output" \
  || _fail "T10" "replay output not deterministic between runs"

# ─────────────────────────────────────────────────────────────────────────────
# T11: header comment contains the as_of value
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T11: replay header comment contains as_of value"
T11_J="$TEST_ROOT/t11.journal"
_append_event "$T11_J" "eid_t11" "2026-01-01T09:00:00Z"
T11_HEADER=$("$PY3" "$HELPER" replay "$T11_J" "2026-01-01T12:00:00Z" 1 2>/dev/null | head -1)
echo "$T11_HEADER" | grep -q "2026-01-01T12:00:00Z" \
  && _pass "T11: header contains as_of timestamp" \
  || _fail "T11" "header '$T11_HEADER' does not contain as_of"

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
