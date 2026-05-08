#!/bin/bash
# mac-cleanup-executor :: tests/test_source_priority_validation.sh  v1.0.0
# Tests for source/source_priority canonical validation (HIGH #2).
# Proves:
#   - validate/write reject mismatched source_priority for known sources
#   - build_event overrides wrong source_priority with canonical
#   - resolver demotes mismatched events — they cannot win arbitration
#   - RESOLVE_WARN emitted to stderr for each demoted event
#   - valid PHYSICAL still wins over MANIFEST_GATE
#   - replay streams raw events unchanged (mismatch demotion is resolve-time only)
# No cleanup scripts executed. No real files modified.
# Run from any directory: bash tests/test_source_priority_validation.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"
PY3="/usr/bin/python3"
HELPER="$SCRIPTS/_journal_helper.py"
RESOLVE="$SCRIPTS/_resolve_helper.py"

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/srcpri_validation_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

# Minimal valid StateEvent JSON for direct journal writes (bypasses cmd_write).
# Usage: _raw_event entity_id source source_priority asserted_at
_raw_event() {
  local eid="$1" src="$2" spri="$3" ts="$4"
  /bin/echo "{\"v\":1,\"event_id\":\"ev_${eid}_$$\",\"entity_id\":\"$eid\",\"entity_type\":\"PATH\",\"asserted_state\":\"EXISTS\",\"source\":\"$src\",\"source_priority\":$spri,\"gate_id\":null,\"evidence\":{\"manifest_path\":null,\"physical_check\":null,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]},\"asserted_at\":\"$ts\",\"ttl_seconds\":null}"
}

/bin/echo "══ test_source_priority_validation.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: validate — PHYSICAL with wrong source_priority=4 → rejected (exit 1)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: validate rejects PHYSICAL/source_priority=4"
T01_JSON='{"v":1,"event_id":"e1","entity_id":"eid1","entity_type":"PATH","asserted_state":"EXISTS","source":"PHYSICAL","source_priority":4,"gate_id":null,"evidence":{},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}'
T01_RC=0
"$PY3" "$HELPER" validate "$T01_JSON" >/dev/null 2>/dev/null || T01_RC=$?
[ "$T01_RC" -ne 0 ] \
  && _pass "T01: PHYSICAL/priority=4 rejected (rc=$T01_RC)" \
  || _fail "T01" "expected non-zero, got 0"

# ─────────────────────────────────────────────────────────────────────────────
# T02: validate — AGENT with source_priority=1 → rejected (exit 1)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: validate rejects AGENT/source_priority=1"
T02_JSON='{"v":1,"event_id":"e2","entity_id":"eid2","entity_type":"PATH","asserted_state":"EXISTS","source":"AGENT","source_priority":1,"gate_id":null,"evidence":{},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}'
T02_RC=0
"$PY3" "$HELPER" validate "$T02_JSON" >/dev/null 2>/dev/null || T02_RC=$?
[ "$T02_RC" -ne 0 ] \
  && _pass "T02: AGENT/priority=1 rejected (rc=$T02_RC)" \
  || _fail "T02" "expected non-zero, got 0"

# ─────────────────────────────────────────────────────────────────────────────
# T03: validate — PHYSICAL with correct source_priority=1 → accepted (exit 0)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: validate accepts PHYSICAL/source_priority=1"
T03_JSON='{"v":1,"event_id":"e3","entity_id":"eid3","entity_type":"PATH","asserted_state":"EXISTS","source":"PHYSICAL","source_priority":1,"gate_id":null,"evidence":{},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}'
T03_RC=0
"$PY3" "$HELPER" validate "$T03_JSON" >/dev/null 2>/dev/null || T03_RC=$?
[ "$T03_RC" -eq 0 ] \
  && _pass "T03: PHYSICAL/priority=1 accepted (rc=0)" \
  || _fail "T03" "expected 0, got $T03_RC"

# ─────────────────────────────────────────────────────────────────────────────
# T04: validate — unknown source with any priority → accepted (not in canonical map)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: validate accepts unknown source (not in canonical map)"
T04_JSON='{"v":1,"event_id":"e4","entity_id":"eid4","entity_type":"PATH","asserted_state":"EXISTS","source":"CUSTOM_SENSOR","source_priority":99,"gate_id":null,"evidence":{},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}'
T04_RC=0
"$PY3" "$HELPER" validate "$T04_JSON" >/dev/null 2>/dev/null || T04_RC=$?
[ "$T04_RC" -eq 0 ] \
  && _pass "T04: unknown source accepted (rc=0)" \
  || _fail "T04" "expected 0, got $T04_RC"

# ─────────────────────────────────────────────────────────────────────────────
# T05: build_event — PHYSICAL with wrong source_priority=9 → canonical=1 in output
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: build_event overrides PHYSICAL/priority=9 → canonical=1"
T05_OUT=$("$PY3" "$HELPER" build_event \
  "evid_t05" "eid_t05" "PATH" "EXISTS" \
  "PHYSICAL" "9" "null" \
  '{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]}' \
  "2026-01-01T00:00:00Z" 2>/dev/null)
T05_PRI=$(echo "$T05_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source_priority','MISSING'))" 2>/dev/null)
[ "$T05_PRI" = "1" ] \
  && _pass "T05: source_priority overridden to canonical=1 (was 9)" \
  || _fail "T05" "expected source_priority=1, got '$T05_PRI'"

# ─────────────────────────────────────────────────────────────────────────────
# T06: build_event — AGENT with correct priority=3 → output has priority=3
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: build_event keeps AGENT/priority=3 (already canonical)"
T06_OUT=$("$PY3" "$HELPER" build_event \
  "evid_t06" "eid_t06" "PATH" "EXISTS" \
  "AGENT" "3" "null" \
  '{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]}' \
  "2026-01-01T00:00:00Z" 2>/dev/null)
T06_PRI=$(echo "$T06_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source_priority','MISSING'))" 2>/dev/null)
[ "$T06_PRI" = "3" ] \
  && _pass "T06: source_priority=3 preserved (canonical correct)" \
  || _fail "T06" "expected source_priority=3, got '$T06_PRI'"

# ─────────────────────────────────────────────────────────────────────────────
# T07: build_event — unknown source with priority=99 → output uses 4 (canonical unknown)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: build_event maps unknown source/priority=99 → 4"
T07_OUT=$("$PY3" "$HELPER" build_event \
  "evid_t07" "eid_t07" "PATH" "EXISTS" \
  "UNKNOWN_SOURCE" "99" "null" \
  '{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]}' \
  "2026-01-01T00:00:00Z" 2>/dev/null)
T07_PRI=$(echo "$T07_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source_priority','MISSING'))" 2>/dev/null)
[ "$T07_PRI" = "4" ] \
  && _pass "T07: unknown source maps to priority=4 (was 99)" \
  || _fail "T07" "expected source_priority=4, got '$T07_PRI'"

# ─────────────────────────────────────────────────────────────────────────────
# T08: resolve — PHYSICAL/mismatch(stored as 4) vs MANIFEST_GATE/correct(2)
#       → MANIFEST_GATE wins (mismatch demoted to 4, loses to priority=2)
# Direct journal write bypasses cmd_write so we can inject mismatched event.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: resolve — PHYSICAL/mismatch=4 loses to MANIFEST_GATE/correct=2"
T08_JDIR="$TEST_ROOT/t08"
/bin/mkdir -p "$T08_JDIR"
T08_JOURNAL="$T08_JDIR/state.journal"
T08_EID="entity_t08"
# Physical with wrong priority (4 instead of 1) — injected directly, bypassing validation
_raw_event "$T08_EID" "PHYSICAL" 4 "2026-01-01T00:01:00Z" >> "$T08_JOURNAL"
# MANIFEST_GATE with correct priority 2 — later timestamp but lower (better) priority
_raw_event "$T08_EID" "MANIFEST_GATE" 2 "2026-01-01T00:02:00Z" >> "$T08_JOURNAL"
T08_OUT=$("$PY3" "$RESOLVE" resolve "$T08_JOURNAL" "$T08_EID" 2>/dev/null)
T08_SRC=$(echo "$T08_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source','?'))" 2>/dev/null)
[ "$T08_SRC" = "MANIFEST_GATE" ] \
  && _pass "T08: MANIFEST_GATE won over mismatched PHYSICAL" \
  || _fail "T08" "expected source=MANIFEST_GATE, got '$T08_SRC' (full: $T08_OUT)"

# ─────────────────────────────────────────────────────────────────────────────
# T09: resolve — AGENT/mismatch(stored as 1) vs MANIFEST_GATE/correct(2)
#       → MANIFEST_GATE wins (AGENT with priority=1 demoted to 4)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: resolve — AGENT/mismatch=1 loses to MANIFEST_GATE/correct=2"
T09_JDIR="$TEST_ROOT/t09"
/bin/mkdir -p "$T09_JDIR"
T09_JOURNAL="$T09_JDIR/state.journal"
T09_EID="entity_t09"
_raw_event "$T09_EID" "AGENT" 1 "2026-01-01T00:01:00Z" >> "$T09_JOURNAL"
_raw_event "$T09_EID" "MANIFEST_GATE" 2 "2026-01-01T00:02:00Z" >> "$T09_JOURNAL"
T09_OUT=$("$PY3" "$RESOLVE" resolve "$T09_JOURNAL" "$T09_EID" 2>/dev/null)
T09_SRC=$(echo "$T09_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source','?'))" 2>/dev/null)
[ "$T09_SRC" = "MANIFEST_GATE" ] \
  && _pass "T09: MANIFEST_GATE won over mismatched AGENT" \
  || _fail "T09" "expected source=MANIFEST_GATE, got '$T09_SRC'"

# ─────────────────────────────────────────────────────────────────────────────
# T10: resolve — valid PHYSICAL/correct(1) still wins over MANIFEST_GATE/correct(2)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: resolve — valid PHYSICAL/1 wins over MANIFEST_GATE/2"
T10_JDIR="$TEST_ROOT/t10"
/bin/mkdir -p "$T10_JDIR"
T10_JOURNAL="$T10_JDIR/state.journal"
T10_EID="entity_t10"
_raw_event "$T10_EID" "MANIFEST_GATE" 2 "2026-01-01T00:01:00Z" >> "$T10_JOURNAL"
_raw_event "$T10_EID" "PHYSICAL" 1 "2026-01-01T00:02:00Z" >> "$T10_JOURNAL"
T10_OUT=$("$PY3" "$RESOLVE" resolve "$T10_JOURNAL" "$T10_EID" 2>/dev/null)
T10_SRC=$(echo "$T10_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source','?'))" 2>/dev/null)
[ "$T10_SRC" = "PHYSICAL" ] \
  && _pass "T10: valid PHYSICAL/1 still wins over MANIFEST_GATE/2" \
  || _fail "T10" "expected source=PHYSICAL, got '$T10_SRC'"

# ─────────────────────────────────────────────────────────────────────────────
# T11: resolve — mismatch event emits RESOLVE_WARN to stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T11: resolve — RESOLVE_WARN emitted to stderr for mismatch"
T11_JDIR="$TEST_ROOT/t11"
/bin/mkdir -p "$T11_JDIR"
T11_JOURNAL="$T11_JDIR/state.journal"
T11_EID="entity_t11"
_raw_event "$T11_EID" "PHYSICAL" 4 "2026-01-01T00:01:00Z" >> "$T11_JOURNAL"
T11_STDERR=$(mktemp)
"$PY3" "$RESOLVE" resolve "$T11_JOURNAL" "$T11_EID" >/dev/null 2>"$T11_STDERR"
T11_WARN=$(grep -c "RESOLVE_WARN" "$T11_STDERR" 2>/dev/null || /bin/echo 0)
rm -f "$T11_STDERR"
[ "$T11_WARN" -ge 1 ] \
  && _pass "T11: RESOLVE_WARN emitted (found $T11_WARN)" \
  || _fail "T11" "no RESOLVE_WARN in stderr (count=$T11_WARN)"

# ─────────────────────────────────────────────────────────────────────────────
# T12: confidence — mismatched PHYSICAL/stored-as-4 → LOW (not HIGH)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T12: confidence — PHYSICAL/mismatch=4 → LOW"
T12_EVENTS='[{"v":1,"event_id":"e_t12","entity_id":"eid","entity_type":"PATH","asserted_state":"EXISTS","source":"PHYSICAL","source_priority":4,"gate_id":null,"evidence":{"breach_flags":[]},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}]'
T12_CONF=$("$PY3" "$RESOLVE" confidence "$T12_EVENTS" 2>/dev/null)
[ "$T12_CONF" = "LOW" ] \
  && _pass "T12: PHYSICAL/mismatch=4 → confidence=LOW" \
  || _fail "T12" "expected LOW, got '$T12_CONF'"

# ─────────────────────────────────────────────────────────────────────────────
# T13: confidence — valid PHYSICAL/source_priority=1 → HIGH
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T13: confidence — valid PHYSICAL/1 → HIGH"
T13_EVENTS='[{"v":1,"event_id":"e_t13","entity_id":"eid","entity_type":"PATH","asserted_state":"EXISTS","source":"PHYSICAL","source_priority":1,"gate_id":null,"evidence":{"breach_flags":[]},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}]'
T13_CONF=$("$PY3" "$RESOLVE" confidence "$T13_EVENTS" 2>/dev/null)
[ "$T13_CONF" = "HIGH" ] \
  && _pass "T13: valid PHYSICAL/1 → confidence=HIGH" \
  || _fail "T13" "expected HIGH, got '$T13_CONF'"

# ─────────────────────────────────────────────────────────────────────────────
# T14: confidence — MANIFEST_GATE/source_priority=2 → MEDIUM
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T14: confidence — MANIFEST_GATE/2 → MEDIUM"
T14_EVENTS='[{"v":1,"event_id":"e_t14","entity_id":"eid","entity_type":"PATH","asserted_state":"EXISTS","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"breach_flags":[]},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}]'
T14_CONF=$("$PY3" "$RESOLVE" confidence "$T14_EVENTS" 2>/dev/null)
[ "$T14_CONF" = "MEDIUM" ] \
  && _pass "T14: MANIFEST_GATE/2 → confidence=MEDIUM" \
  || _fail "T14" "expected MEDIUM, got '$T14_CONF'"

# ─────────────────────────────────────────────────────────────────────────────
# T15: replay — streams raw events unchanged; mismatch demotion is resolve-time only
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T15: replay — streams raw mismatch event unchanged"
T15_JDIR="$TEST_ROOT/t15"
/bin/mkdir -p "$T15_JDIR"
T15_JOURNAL="$T15_JDIR/state.journal"
T15_EID="entity_t15"
T15_RAW=$(_raw_event "$T15_EID" "PHYSICAL" 4 "2026-01-01T00:01:00Z")
echo "$T15_RAW" >> "$T15_JOURNAL"
T15_OUT=$("$PY3" "$HELPER" replay "$T15_JOURNAL" "2026-12-31T00:00:00Z" 1 2>/dev/null | grep -v '^#')
T15_PRI=$(echo "$T15_OUT" | "$PY3" -c "import json,sys; d=json.load(sys.stdin); print(d.get('source_priority','MISSING'))" 2>/dev/null)
[ "$T15_PRI" = "4" ] \
  && _pass "T15: replay streams raw source_priority=4 (demotion is resolve-time)" \
  || _fail "T15" "expected raw source_priority=4, got '$T15_PRI'"

# ─────────────────────────────────────────────────────────────────────────────
# T16: write cmd — mismatched event rejected (exit 1)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T16: write cmd rejects MANIFEST_GATE/wrong_priority=3"
T16_JDIR="$TEST_ROOT/t16"
/bin/mkdir -p "$T16_JDIR"
T16_JOURNAL="$T16_JDIR/state.journal"
T16_JSON='{"v":1,"event_id":"e_t16","entity_id":"eid_t16","entity_type":"PATH","asserted_state":"EXISTS","source":"MANIFEST_GATE","source_priority":3,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}'
T16_RC=0
"$PY3" "$HELPER" write "$T16_JOURNAL" "$T16_JSON" >/dev/null 2>/dev/null || T16_RC=$?
[ "$T16_RC" -ne 0 ] \
  && _pass "T16: MANIFEST_GATE/priority=3 write rejected (rc=$T16_RC)" \
  || _fail "T16" "expected non-zero, got 0"

# ─────────────────────────────────────────────────────────────────────────────
# T17: write cmd — correct event accepted, appended to journal
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T17: write cmd accepts MANIFEST_GATE/correct_priority=2"
T17_JDIR="$TEST_ROOT/t17"
/bin/mkdir -p "$T17_JDIR"
T17_JOURNAL="$T17_JDIR/state.journal"
T17_JSON='{"v":1,"event_id":"e_t17","entity_id":"eid_t17","entity_type":"PATH","asserted_state":"EXISTS","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}'
T17_RC=0
"$PY3" "$HELPER" write "$T17_JOURNAL" "$T17_JSON" >/dev/null 2>/dev/null || T17_RC=$?
[ "$T17_RC" -eq 0 ] && [ -f "$T17_JOURNAL" ] && [ -s "$T17_JOURNAL" ] \
  && _pass "T17: correct event written to journal (rc=0)" \
  || _fail "T17" "expected rc=0 and non-empty journal, got rc=$T17_RC"

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
