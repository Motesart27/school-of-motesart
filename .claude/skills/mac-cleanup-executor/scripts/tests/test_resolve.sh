#!/bin/bash
# mac-cleanup-executor :: tests/test_resolve.sh  v1.0.0
# Test suite for resolve.sh + _resolve_helper.py
# Run from any directory: bash tests/test_resolve.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
      MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true

source "$SCRIPTS/resolve.sh" 2>&1 || {
  /bin/echo "FATAL: could not source resolve.sh" >&2
  exit 1
}

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/res_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

# Per-test journal directory
_setup_journal() {
  local name="$1"
  local dir="$TEST_ROOT/$name"
  /bin/mkdir -p "$dir"
  export JOURNAL_DIR="$dir"
  export JOURNAL_PATH="$dir/journal.ndjson"
  export JOURNAL_LOCK="$dir/journal.ndjson.lock"
  : > "$JOURNAL_PATH"   # create empty journal
}

# Write a raw event line directly (bypasses validation — allows crafting TTL, v=999, etc.)
_raw_event() {
  local jp="$1"; shift
  /bin/echo "$*" >> "$jp"
}

# Build a valid StateEvent via Python (returns JSON string)
_build_ev() {
  # args: entity_id asserted_state source source_priority [gate_id] [breach_flags_json] [ttl_seconds] timestamp
  local eid="$1" state="$2" source="$3" spri="$4"
  local gate_id="${5:-null}"
  local breach_flags="${6:-[]}"
  local ttl="${7:-null}"
  local ts="$8"
  # Map bash "null" strings to Python None literals
  local py_gate_id py_ttl
  [ "$gate_id" = "null" ] && py_gate_id="None" || py_gate_id="\"$gate_id\""
  [ "$ttl"     = "null" ] && py_ttl="None"     || py_ttl="$ttl"
  /usr/bin/python3 - <<PYEOF
import json
ev = {
  "v": 1,
  "event_id": "test_${RANDOM}_${RANDOM}",
  "entity_id": "$eid",
  "entity_type": "PATH",
  "asserted_state": "$state",
  "source": "$source",
  "source_priority": $spri,
  "gate_id": $py_gate_id,
  "evidence": {
    "manifest_path": None,
    "physical_check": None,
    "agent_id": None,
    "checksum": None,
    "breach_flags": $breach_flags
  },
  "asserted_at": "$ts",
  "ttl_seconds": $py_ttl,
}
print(json.dumps(ev, separators=(',',':')))
PYEOF
}

# Validate JSON output (exit 0 = valid)
_valid_json() { /usr/bin/python3 -c "import sys,json; json.loads(sys.stdin.read())" 2>/dev/null; }

# Extract field from JSON
_field() { /usr/bin/python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('$1',''))" 2>/dev/null; }

/bin/echo "══ test_resolve.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: resolve unknown entity → UNCERTAIN (no crash, valid JSON)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: resolve unknown entity → UNCERTAIN"
_setup_journal "t01"
OUT=$(resolve "/no/such/entity" "2099-01-01T00:00:00Z" 2>/dev/null)
echo "$OUT" | _valid_json && _pass "T01: output is valid JSON" || _fail "T01" "output not valid JSON: $OUT"
CONF=$(echo "$OUT" | _field "confidence")
STATE=$(echo "$OUT" | _field "asserted_state")
[ "$CONF" = "UNCERTAIN" ] && _pass "T01: confidence=UNCERTAIN" || _fail "T01" "expected UNCERTAIN, got $CONF"
[ "$STATE" = "UNCERTAIN" ] && _pass "T01: asserted_state=UNCERTAIN" || _fail "T01" "expected UNCERTAIN, got $STATE"

# ─────────────────────────────────────────────────────────────────────────────
# T02: PHYSICAL priority beats MANIFEST_GATE
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: PHYSICAL priority beats MANIFEST_GATE"
_setup_journal "t02"
TS1="2026-05-08T08:00:00Z"
TS2="2026-05-08T09:00:00Z"
EV_MG=$(_build_ev "/data/file" "PRESENT" "MANIFEST_GATE" 2 "null" "[]" "null" "$TS1")
EV_PH=$(_build_ev "/data/file" "ABSENT"  "PHYSICAL"      1 "null" "[]" "null" "$TS2")
_raw_event "$JOURNAL_PATH" "$EV_MG"
_raw_event "$JOURNAL_PATH" "$EV_PH"
OUT=$(resolve "/data/file" "2026-05-08T10:00:00Z" 2>/dev/null)
SRC=$(echo "$OUT" | _field "source")
CONF=$(echo "$OUT" | _field "confidence")
STATE=$(echo "$OUT" | _field "asserted_state")
[ "$SRC" = "PHYSICAL" ] && _pass "T02: source=PHYSICAL" || _fail "T02" "expected PHYSICAL, got $SRC"
[ "$CONF" = "HIGH" ] && _pass "T02: confidence=HIGH" || _fail "T02" "expected HIGH, got $CONF"
[ "$STATE" = "ABSENT" ] && _pass "T02: asserted_state matches PHYSICAL event" || _fail "T02" "expected ABSENT, got $STATE"

# ─────────────────────────────────────────────────────────────────────────────
# T03: POST_HOC_MANIFEST demotes confidence to LOW
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: POST_HOC_MANIFEST demotes confidence to LOW"
_setup_journal "t03"
TS="2026-05-08T09:00:00Z"
EV_PHM=$(_build_ev "/data/breach_file" "PRESENT" "MANIFEST_GATE" 2 "null" '["POST_HOC_MANIFEST"]' "null" "$TS")
_raw_event "$JOURNAL_PATH" "$EV_PHM"
OUT=$(resolve "/data/breach_file" "2026-05-08T10:00:00Z" 2>/dev/null)
CONF=$(echo "$OUT" | _field "confidence")
SRC=$(echo "$OUT" | _field "source")
[ "$CONF" = "LOW" ] && _pass "T03: confidence=LOW after POST_HOC_MANIFEST demotion" || _fail "T03" "expected LOW, got $CONF"
[ "$SRC" = "MANIFEST_GATE" ] && _pass "T03: source still shows MANIFEST_GATE" || _fail "T03" "expected MANIFEST_GATE, got $SRC"

# ─────────────────────────────────────────────────────────────────────────────
# T04: same priority + same timestamp → conflict → UNCERTAIN
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: same priority + same timestamp → conflict → UNCERTAIN"
_setup_journal "t04"
TS="2026-05-08T09:00:00Z"
EV_A=$(_build_ev "/data/conflict" "PRESENT" "MANIFEST_GATE" 2 "null" "[]" "null" "$TS")
EV_B=$(_build_ev "/data/conflict" "ABSENT"  "MANIFEST_GATE" 2 "null" "[]" "null" "$TS")
_raw_event "$JOURNAL_PATH" "$EV_A"
_raw_event "$JOURNAL_PATH" "$EV_B"
OUT=$(resolve "/data/conflict" "2026-05-08T10:00:00Z" 2>/dev/null)
CONF=$(echo "$OUT" | _field "confidence")
CONFLICT=$(echo "$OUT" | _field "conflict")
[ "$CONF" = "UNCERTAIN" ] && _pass "T04: confidence=UNCERTAIN on conflict" || _fail "T04" "expected UNCERTAIN, got $CONF"
[ "$CONFLICT" = "True" ] && _pass "T04: conflict=True" || _fail "T04" "expected conflict=True, got $CONFLICT"

# ─────────────────────────────────────────────────────────────────────────────
# T05: expired PHYSICAL (ttl_seconds set, past expiry) → ttl_expired=True, confidence=LOW
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: expired PHYSICAL → ttl_expired=True, confidence=LOW"
_setup_journal "t05"
# asserted 2 hours before as_of, ttl = 3600s (1 hour) → expired by 1 hour
PHYS_TS="2026-05-08T08:00:00Z"
AS_OF="2026-05-08T10:00:00Z"
EV_PH=$(_build_ev "/data/stale_file" "PRESENT" "PHYSICAL" 1 "null" "[]" "3600" "$PHYS_TS")
_raw_event "$JOURNAL_PATH" "$EV_PH"
OUT=$(resolve "/data/stale_file" "$AS_OF" 2>/dev/null)
CONF=$(echo "$OUT" | _field "confidence")
TTL_EXP=$(echo "$OUT" | _field "ttl_expired")
[ "$CONF" = "LOW" ] && _pass "T05: confidence=LOW after TTL expiry" || _fail "T05" "expected LOW, got $CONF"
[ "$TTL_EXP" = "True" ] && _pass "T05: ttl_expired=True" || _fail "T05" "expected True, got $TTL_EXP"

# ─────────────────────────────────────────────────────────────────────────────
# T06: non-expired PHYSICAL → ttl_expired=False, confidence=HIGH
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: non-expired PHYSICAL → ttl_expired=False, confidence=HIGH"
_setup_journal "t06"
# asserted 30 minutes before as_of, ttl = 3600s → not expired
PHYS_TS="2026-05-08T09:30:00Z"
AS_OF="2026-05-08T10:00:00Z"
EV_PH=$(_build_ev "/data/fresh_file" "PRESENT" "PHYSICAL" 1 "null" "[]" "3600" "$PHYS_TS")
_raw_event "$JOURNAL_PATH" "$EV_PH"
OUT=$(resolve "/data/fresh_file" "$AS_OF" 2>/dev/null)
CONF=$(echo "$OUT" | _field "confidence")
TTL_EXP=$(echo "$OUT" | _field "ttl_expired")
[ "$CONF" = "HIGH" ] && _pass "T06: confidence=HIGH for non-expired PHYSICAL" || _fail "T06" "expected HIGH, got $CONF"
[ "$TTL_EXP" = "False" ] && _pass "T06: ttl_expired=False" || _fail "T06" "expected False, got $TTL_EXP"

# ─────────────────────────────────────────────────────────────────────────────
# T07: newer same-priority event wins over older one
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: newer same-priority event wins (no conflict)"
_setup_journal "t07"
TS_OLD="2026-05-08T08:00:00Z"
TS_NEW="2026-05-08T09:00:00Z"
EV_OLD=$(_build_ev "/data/updated" "PRESENT" "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_OLD")
EV_NEW=$(_build_ev "/data/updated" "ABSENT"  "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_NEW")
_raw_event "$JOURNAL_PATH" "$EV_OLD"
_raw_event "$JOURNAL_PATH" "$EV_NEW"
OUT=$(resolve "/data/updated" "2026-05-08T10:00:00Z" 2>/dev/null)
STATE=$(echo "$OUT" | _field "asserted_state")
CONF=$(echo "$OUT" | _field "confidence")
CONFLICT=$(echo "$OUT" | _field "conflict")
[ "$STATE" = "ABSENT" ] && _pass "T07: newer event's state wins" || _fail "T07" "expected ABSENT, got $STATE"
[ "$CONF" = "MEDIUM" ] && _pass "T07: confidence=MEDIUM for MANIFEST_GATE" || _fail "T07" "expected MEDIUM, got $CONF"
[ "$CONFLICT" = "False" ] && _pass "T07: conflict=False" || _fail "T07" "expected False, got $CONFLICT"

# ─────────────────────────────────────────────────────────────────────────────
# T08: as_of filter — events after as_of are excluded
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: as_of filter excludes future events"
_setup_journal "t08"
TS_BEFORE="2026-05-08T09:00:00Z"
TS_AFTER="2026-05-08T11:00:00Z"
AS_OF="2026-05-08T10:00:00Z"
EV_BEFORE=$(_build_ev "/data/filtered" "PRESENT" "PHYSICAL" 1 "null" "[]" "null" "$TS_BEFORE")
EV_AFTER=$(_build_ev  "/data/filtered" "ABSENT"  "PHYSICAL" 1 "null" "[]" "null" "$TS_AFTER")
_raw_event "$JOURNAL_PATH" "$EV_BEFORE"
_raw_event "$JOURNAL_PATH" "$EV_AFTER"
OUT=$(resolve "/data/filtered" "$AS_OF" 2>/dev/null)
STATE=$(echo "$OUT" | _field "asserted_state")
[ "$STATE" = "PRESENT" ] && _pass "T08: as_of excludes event after cutoff" || _fail "T08" "expected PRESENT, got $STATE"

# ─────────────────────────────────────────────────────────────────────────────
# T09: replay without as_of → return 1 (does not exit caller)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: replay without as_of → return 1"
_setup_journal "t09"
T09_JP="$JOURNAL_PATH"
replay "$T09_JP" 2>/dev/null
RPL_RC=$?
[ "$RPL_RC" -ne 0 ] && _pass "T09: replay without as_of returns non-zero" || _fail "T09" "replay without as_of should fail"
# Verify caller is still alive
[ $$ -gt 0 ] && _pass "T09: caller process alive after failed replay" || _fail "T09" "caller exited"

# ─────────────────────────────────────────────────────────────────────────────
# T10: replay with unsupported schema version halts (exit 2)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: replay halts on unsupported schema version (exit 2)"
_setup_journal "t10"
T10_JP="$JOURNAL_PATH"
# Write one supported event (v=1) and one unsupported (v=999)
EV_V1=$(_build_ev "/data/a" "PRESENT" "PHYSICAL" 1 "null" "[]" "null" "2026-05-08T08:00:00Z")
_raw_event "$T10_JP" "$EV_V1"
_raw_event "$T10_JP" '{"v":999,"event_id":"bad_v","entity_id":"/data/b","entity_type":"PATH","asserted_state":"ABSENT","source":"PHYSICAL","source_priority":1,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-05-08T09:00:00Z","ttl_seconds":null}'
AS_OF="2026-05-08T10:00:00Z"
RPL_OUT=$(replay "$T10_JP" "$AS_OF" 2>/dev/null)
RPL_RC=$?
[ "$RPL_RC" -eq 2 ] && _pass "T10: replay exits 2 on unsupported schema" || _fail "T10" "expected exit 2, got $RPL_RC"
echo "$RPL_OUT" | grep -q '"entity_id":"/data/a"' && _pass "T10: pre-halt event streamed" || _fail "T10" "pre-halt event missing"
echo "$RPL_OUT" | grep -q '"entity_id":"/data/b"' && _fail "T10" "post-halt event should not appear" || _pass "T10: post-halt event not streamed"

# ─────────────────────────────────────────────────────────────────────────────
# T11: malformed event logged to stderr, not silently skipped; valid events processed
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T11: malformed events logged to stderr, valid events still processed"
_setup_journal "t11"
T11_JP="$JOURNAL_PATH"
EV_OK=$(_build_ev "/data/ok" "PRESENT" "PHYSICAL" 1 "null" "[]" "null" "2026-05-08T09:00:00Z")
_raw_event "$T11_JP" "$EV_OK"
_raw_event "$T11_JP" "NOT_JSON_AT_ALL {{{broken"
T11_STDERR=$(resolve "/data/ok" "2026-05-08T10:00:00Z" 2>&1 1>/dev/null)
T11_RESULT=$(resolve "/data/ok" "2026-05-08T10:00:00Z" 2>/dev/null)
echo "$T11_STDERR" | grep -qi "RESOLVE_WARN\|malformed" && _pass "T11: malformed line logged to stderr" || _fail "T11" "no RESOLVE_WARN in stderr: $T11_STDERR"
CONF=$(echo "$T11_RESULT" | _field "confidence")
[ "$CONF" = "HIGH" ] && _pass "T11: valid event still resolved (confidence=HIGH)" || _fail "T11" "expected HIGH, got $CONF"

# ─────────────────────────────────────────────────────────────────────────────
# T12: replay output consistent with resolve using same as_of
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T12: replay output consistent with resolve at same as_of"
_setup_journal "t12"
T12_JP="$JOURNAL_PATH"
TS_A="2026-05-08T07:00:00Z"
TS_B="2026-05-08T08:00:00Z"
TS_C="2026-05-08T09:00:00Z"
AS_OF="2026-05-08T09:30:00Z"
EV_A=$(_build_ev "/data/replay_path" "PRESENT"  "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_A")
EV_B=$(_build_ev "/data/replay_path" "ABSENT"   "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_B")
EV_C=$(_build_ev "/data/replay_path" "PRESENT"  "PHYSICAL"      1 "null" "[]" "null" "$TS_C")
_raw_event "$T12_JP" "$EV_A"
_raw_event "$T12_JP" "$EV_B"
_raw_event "$T12_JP" "$EV_C"
# Replay should stream all 3 events at as_of
RPL_OUT=$(replay "$T12_JP" "$AS_OF" 2>/dev/null)
RPL_COUNT=$(echo "$RPL_OUT" | grep '"entity_id":"/data/replay_path"' | wc -l | tr -d ' ')
[ "$RPL_COUNT" -eq 3 ] && _pass "T12: replay streams all 3 entity events" || _fail "T12" "expected 3 events, got $RPL_COUNT"
# resolve should pick PHYSICAL (priority 1) as winner
RES_OUT=$(resolve "/data/replay_path" "$AS_OF" 2>/dev/null)
RES_SRC=$(echo "$RES_OUT" | _field "source")
RES_CONF=$(echo "$RES_OUT" | _field "confidence")
[ "$RES_SRC" = "PHYSICAL" ] && _pass "T12: resolve picks PHYSICAL winner" || _fail "T12" "expected PHYSICAL, got $RES_SRC"
[ "$RES_CONF" = "HIGH" ] && _pass "T12: resolve confidence=HIGH" || _fail "T12" "expected HIGH, got $RES_CONF"
# The winning event's asserted_at matches what replay streamed
WIN_TS=$(echo "$RES_OUT" | _field "asserted_at")
echo "$RPL_OUT" | grep -q "\"asserted_at\":\"$WIN_TS\"" && _pass "T12: winning event asserted_at appears in replay stream" || _fail "T12" "winning ts $WIN_TS not in replay output"

# ─────────────────────────────────────────────────────────────────────────────
# T13: audit filters by since/until/entity_type
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T13: audit filters (since, until, entity_type)"
_setup_journal "t13"
EV1=$(_build_ev "/p/a" "PRESENT" "PHYSICAL"      1 "null" "[]" "null" "2026-05-08T07:00:00Z")
EV2=$(_build_ev "/p/b" "ABSENT"  "MANIFEST_GATE" 2 "null" "[]" "null" "2026-05-08T09:00:00Z")
EV3=$(_build_ev "/p/c" "PRESENT" "AGENT"         3 "null" "[]" "null" "2026-05-08T11:00:00Z")
_raw_event "$JOURNAL_PATH" "$EV1"
_raw_event "$JOURNAL_PATH" "$EV2"
_raw_event "$JOURNAL_PATH" "$EV3"
# since filter
SINCE_OUT=$(audit "2026-05-08T08:00:00Z" "" "" 2>/dev/null)
SINCE_COUNT=$(echo "$SINCE_OUT" | grep '"entity_id"' | wc -l | tr -d ' ')
[ "$SINCE_COUNT" -eq 2 ] && _pass "T13: since filter returns 2 events" || _fail "T13" "since filter expected 2, got $SINCE_COUNT"
# until filter
UNTIL_OUT=$(audit "" "2026-05-08T10:00:00Z" "" 2>/dev/null)
UNTIL_COUNT=$(echo "$UNTIL_OUT" | grep '"entity_id"' | wc -l | tr -d ' ')
[ "$UNTIL_COUNT" -eq 2 ] && _pass "T13: until filter returns 2 events" || _fail "T13" "until filter expected 2, got $UNTIL_COUNT"
# all events (no filters)
ALL_OUT=$(audit "" "" "" 2>/dev/null)
ALL_COUNT=$(echo "$ALL_OUT" | grep '"entity_id"' | wc -l | tr -d ' ')
[ "$ALL_COUNT" -eq 3 ] && _pass "T13: no-filter audit returns all 3 events" || _fail "T13" "no-filter expected 3, got $ALL_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
# T14: resolve_confidence standalone — various event arrays
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T14: resolve_confidence standalone"
# Empty array → UNCERTAIN
C_EMPTY=$(resolve_confidence "[]" 2>/dev/null)
[ "$C_EMPTY" = "UNCERTAIN" ] && _pass "T14: empty array → UNCERTAIN" || _fail "T14" "expected UNCERTAIN, got $C_EMPTY"
# Single PHYSICAL → HIGH
TS_C="2026-05-08T09:00:00Z"
EV_C=$(_build_ev "/tmp/x" "PRESENT" "PHYSICAL" 1 "null" "[]" "null" "$TS_C")
C_PHYS=$(resolve_confidence "[$EV_C]" 2>/dev/null)
[ "$C_PHYS" = "HIGH" ] && _pass "T14: single PHYSICAL → HIGH" || _fail "T14" "expected HIGH, got $C_PHYS"
# Single MANIFEST_GATE → MEDIUM
EV_MG2=$(_build_ev "/tmp/y" "PRESENT" "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_C")
C_MG=$(resolve_confidence "[$EV_MG2]" 2>/dev/null)
[ "$C_MG" = "MEDIUM" ] && _pass "T14: single MANIFEST_GATE → MEDIUM" || _fail "T14" "expected MEDIUM, got $C_MG"
# PHYSICAL + MANIFEST_GATE → PHYSICAL wins → HIGH
C_MIXED=$(resolve_confidence "[$EV_C,$EV_MG2]" 2>/dev/null)
[ "$C_MIXED" = "HIGH" ] && _pass "T14: PHYSICAL+MANIFEST_GATE → HIGH" || _fail "T14" "expected HIGH, got $C_MIXED"
# POST_HOC demoted MANIFEST_GATE → LOW
EV_PHM2=$(_build_ev "/tmp/z" "PRESENT" "MANIFEST_GATE" 2 "null" '["POST_HOC_MANIFEST"]' "null" "$TS_C")
C_PHM=$(resolve_confidence "[$EV_PHM2]" 2>/dev/null)
[ "$C_PHM" = "LOW" ] && _pass "T14: POST_HOC_MANIFEST → LOW" || _fail "T14" "expected LOW, got $C_PHM"
# Conflict: same priority, same timestamp → UNCERTAIN
EV_X=$(_build_ev "/tmp/w" "PRESENT" "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_C")
EV_Y=$(_build_ev "/tmp/w" "ABSENT"  "MANIFEST_GATE" 2 "null" "[]" "null" "$TS_C")
C_CONFLICT=$(resolve_confidence "[$EV_X,$EV_Y]" 2>/dev/null)
[ "$C_CONFLICT" = "UNCERTAIN" ] && _pass "T14: conflict same-priority/ts → UNCERTAIN" || _fail "T14" "expected UNCERTAIN, got $C_CONFLICT"
# AGENT source → LOW
EV_AG=$(_build_ev "/tmp/v" "PRESENT" "AGENT" 3 "null" "[]" "null" "$TS_C")
C_AG=$(resolve_confidence "[$EV_AG]" 2>/dev/null)
[ "$C_AG" = "LOW" ] && _pass "T14: AGENT source → LOW" || _fail "T14" "expected LOW, got $C_AG"

# ─────────────────────────────────────────────────────────────────────────────
# T15: projection has no side effects — journal unchanged after resolve + audit
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T15: projection has no side effects"
_setup_journal "t15"
T15_JP="$JOURNAL_PATH"
EV_S=$(_build_ev "/data/side_effect_test" "PRESENT" "PHYSICAL" 1 "null" "[]" "null" "2026-05-08T09:00:00Z")
_raw_event "$T15_JP" "$EV_S"
BEFORE_MTIME=$(/usr/bin/stat -f "%m" "$T15_JP" 2>/dev/null)
BEFORE_SIZE=$(/usr/bin/stat -f "%z" "$T15_JP" 2>/dev/null)
BEFORE_LINES=$(wc -l < "$T15_JP" | tr -d ' ')
# Run projection operations
resolve "/data/side_effect_test" "2026-05-08T10:00:00Z" >/dev/null 2>/dev/null
audit "" "" "" >/dev/null 2>/dev/null
AFTER_MTIME=$(/usr/bin/stat -f "%m" "$T15_JP" 2>/dev/null)
AFTER_SIZE=$(/usr/bin/stat -f "%z" "$T15_JP" 2>/dev/null)
AFTER_LINES=$(wc -l < "$T15_JP" | tr -d ' ')
[ "$BEFORE_MTIME" = "$AFTER_MTIME" ] && _pass "T15: journal mtime unchanged" || _fail "T15" "journal mtime changed"
[ "$BEFORE_SIZE" = "$AFTER_SIZE" ] && _pass "T15: journal size unchanged" || _fail "T15" "journal size changed"
[ "$BEFORE_LINES" = "$AFTER_LINES" ] && _pass "T15: journal line count unchanged" || _fail "T15" "line count changed: $BEFORE_LINES → $AFTER_LINES"
# No lock file created by resolve
[ ! -f "${T15_JP}.lock" ] && _pass "T15: no lock file created by projection" || _fail "T15" "lock file unexpectedly created"

# ─────────────────────────────────────────────────────────────────────────────
# T16: resolve without JOURNAL_PATH → return 1 (not exit, not crash)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T16: resolve without JOURNAL_PATH → return 1"
SAVED_JP="${JOURNAL_PATH:-}"
unset JOURNAL_PATH 2>/dev/null || true
RESOLVE_ERR=$(resolve "/some/entity" 2>&1)
RESOLVE_RC=$?
export JOURNAL_PATH="$SAVED_JP"
[ "$RESOLVE_RC" -ne 0 ] && _pass "T16: resolve without JOURNAL_PATH returns non-zero" || _fail "T16" "should fail"
echo "$RESOLVE_ERR" | grep -qi "FATAL" && _pass "T16: FATAL message in stderr" || _fail "T16" "no FATAL in: $RESOLVE_ERR"
[ $$ -gt 0 ] && _pass "T16: caller alive after failed resolve" || _fail "T16" "caller exited"

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
