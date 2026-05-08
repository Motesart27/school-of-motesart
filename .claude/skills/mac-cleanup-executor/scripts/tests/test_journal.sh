#!/bin/bash
# mac-cleanup-executor :: tests/test_journal.sh  v1.0.0
# Test suite for journal.sh + _journal_helper.py
# Run from any directory: bash tests/test_journal.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILLS_SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SKILLS_SCRIPTS/journal.sh" 2>&1 || {
  /bin/echo "FATAL: could not source journal.sh" >&2
  exit 1
}

# ── Test framework ────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/jrn_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

# Canonical valid event (all required + nullable fields present)
_event() {
  local _eid="$1" _state="$2" _src="${3:-MANIFEST_GATE}" _spri="${4:-2}"
  local _ts
  _ts=$(/bin/date -u +"%Y-%m-%dT%H:%M:%SZ")
  /bin/echo "{\"v\":1,\"event_id\":\"${_ts}_${RANDOM}\",\"entity_id\":\"${_eid}\",\"entity_type\":\"PATH\",\"asserted_state\":\"${_state}\",\"source\":\"${_src}\",\"source_priority\":${_spri},\"gate_id\":null,\"evidence\":{\"manifest_path\":null,\"physical_check\":null,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]},\"asserted_at\":\"${_ts}\",\"ttl_seconds\":null}"
}

/bin/echo "══ test_journal.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: journal_init creates dir and exports env vars
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: journal_init"
T01="$TEST_ROOT/t01"
unset JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
journal_init "$T01" >/dev/null
[ -d "$T01" ] || _fail "T01" "dir not created"
[ -n "${JOURNAL_PATH:-}" ] || _fail "T01" "JOURNAL_PATH not set"
[ -n "${JOURNAL_LOCK:-}" ] || _fail "T01" "JOURNAL_LOCK not set"
[ "$JOURNAL_PATH" = "$T01/journal.ndjson" ] && _pass "T01: init sets JOURNAL_PATH" || _fail "T01" "wrong JOURNAL_PATH: $JOURNAL_PATH"

# ─────────────────────────────────────────────────────────────────────────────
# T02: journal_append writes exactly one valid JSON line
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: journal_append writes valid event"
T02="$TEST_ROOT/t02"
journal_init "$T02" >/dev/null
journal_append "$(_event "/path/a" "ABSENT")" >/dev/null
LINES=$(wc -l < "$T02/journal.ndjson" | tr -d ' ')
[ "$LINES" -eq 1 ] && _pass "T02: 1 line written" || _fail "T02" "expected 1 line, got $LINES"
/usr/bin/python3 -c "import json; json.loads(open('$T02/journal.ndjson').read())" 2>/dev/null \
  && _pass "T02: line is valid JSON" || _fail "T02" "line not valid JSON"

# ─────────────────────────────────────────────────────────────────────────────
# T03: journal_append rejects invalid JSON (exit non-zero, no write)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: journal_append rejects invalid JSON"
T03="$TEST_ROOT/t03"
journal_init "$T03" >/dev/null
journal_append "not { valid json" 2>/dev/null
RC=$?
[ "$RC" -ne 0 ] && _pass "T03: exited non-zero ($RC)" || _fail "T03" "expected non-zero exit"
[ ! -f "$T03/journal.ndjson" ] || [ "$(wc -l < "$T03/journal.ndjson" | tr -d ' ')" -eq 0 ] \
  && _pass "T03: nothing written" || _fail "T03" "journal was written despite invalid JSON"

# ─────────────────────────────────────────────────────────────────────────────
# T04: journal_append rejects event missing required fields
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: journal_append rejects missing required fields"
T04="$TEST_ROOT/t04"
journal_init "$T04" >/dev/null
journal_append '{"v":1,"entity_id":"/path"}' 2>/dev/null   # missing most required fields
RC=$?
[ "$RC" -ne 0 ] && _pass "T04: exited non-zero ($RC)" || _fail "T04" "expected non-zero exit for missing fields"

# ─────────────────────────────────────────────────────────────────────────────
# T05: journal_append without journal_init fails
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: journal_append without journal_init"
unset JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
journal_append "$(_event "/x" "ABSENT")" 2>/dev/null
RC=$?
[ "$RC" -ne 0 ] && _pass "T05: exited non-zero ($RC)" || _fail "T05" "expected non-zero without init"
# Restore
journal_init "$T02" >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T06: journal_read returns only matching entity_id
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: journal_read filters by entity_id"
T06="$TEST_ROOT/t06"
journal_init "$T06" >/dev/null
journal_append "$(_event "/path/alpha" "ABSENT")" >/dev/null
journal_append "$(_event "/path/beta"  "PRESENT")" >/dev/null
journal_append "$(_event "/path/alpha" "PRESENT")" >/dev/null
journal_append "$(_event "/path/gamma" "ABSENT")" >/dev/null
A_COUNT=$(journal_read "/path/alpha" | wc -l | tr -d ' ')
B_COUNT=$(journal_read "/path/beta"  | wc -l | tr -d ' ')
G_COUNT=$(journal_read "/path/gamma" | wc -l | tr -d ' ')
[ "$A_COUNT" -eq 2 ] && _pass "T06: alpha=2 events" || _fail "T06" "alpha: expected 2, got $A_COUNT"
[ "$B_COUNT" -eq 1 ] && _pass "T06: beta=1 event"  || _fail "T06" "beta: expected 1, got $B_COUNT"
[ "$G_COUNT" -eq 1 ] && _pass "T06: gamma=1 event" || _fail "T06" "gamma: expected 1, got $G_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
# T07: journal_read since filter is inclusive
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: journal_read since filter"
T07="$TEST_ROOT/t07"
journal_init "$T07" >/dev/null
# Inject events with explicit timestamps
/bin/echo '{"v":1,"event_id":"e1","entity_id":"/since-test","entity_type":"PATH","asserted_state":"ABSENT","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-01-01T00:00:00Z","ttl_seconds":null}' >> "$T07/journal.ndjson"
/bin/echo '{"v":1,"event_id":"e2","entity_id":"/since-test","entity_type":"PATH","asserted_state":"PRESENT","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-06-01T00:00:00Z","ttl_seconds":null}' >> "$T07/journal.ndjson"
/bin/echo '{"v":1,"event_id":"e3","entity_id":"/since-test","entity_type":"PATH","asserted_state":"UNKNOWN","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-12-01T00:00:00Z","ttl_seconds":null}' >> "$T07/journal.ndjson"
ALL=$(journal_read "/since-test" | wc -l | tr -d ' ')
SINCE_JUN=$(journal_read "/since-test" "2026-06-01T00:00:00Z" | wc -l | tr -d ' ')
SINCE_DEC=$(journal_read "/since-test" "2026-12-01T00:00:00Z" | wc -l | tr -d ' ')
[ "$ALL" -eq 3 ] && _pass "T07: all 3 events without filter" || _fail "T07" "expected 3 without filter, got $ALL"
[ "$SINCE_JUN" -eq 2 ] && _pass "T07: since=Jun returns 2 (inclusive)" || _fail "T07" "since=Jun: expected 2, got $SINCE_JUN"
[ "$SINCE_DEC" -eq 1 ] && _pass "T07: since=Dec returns 1 (inclusive)" || _fail "T07" "since=Dec: expected 1, got $SINCE_DEC"

# ─────────────────────────────────────────────────────────────────────────────
# T08: journal_replay streams all events; as_of header present
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: journal_replay streams all events"
T08="$TEST_ROOT/t08"
journal_init "$T08" >/dev/null
for i in 1 2 3; do journal_append "$(_event "/replay/$i" "ABSENT")" >/dev/null; done
REPLAY_OUT=$(journal_replay "$T08/journal.ndjson" "2099-12-31T23:59:59Z")
RC=$?
REPLAY_EVENTS=$(echo "$REPLAY_OUT" | grep -c '"entity_id"' 2>/dev/null || echo 0)
REPLAY_HEADER=$(echo "$REPLAY_OUT" | grep -c '# replay as_of=' 2>/dev/null || echo 0)
[ "$RC" -eq 0 ]            && _pass "T08: exit 0" || _fail "T08" "exit $RC"
[ "$REPLAY_EVENTS" -eq 3 ] && _pass "T08: 3 events streamed" || _fail "T08" "expected 3 events, got $REPLAY_EVENTS"
[ "$REPLAY_HEADER" -ge 1 ] && _pass "T08: as_of header present" || _fail "T08" "as_of header missing"

# ─────────────────────────────────────────────────────────────────────────────
# T09: journal_replay requires as_of (rejects empty)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: journal_replay requires as_of"
journal_replay "$T08/journal.ndjson" 2>/dev/null
RC=$?
[ "$RC" -ne 0 ] && _pass "T09: rejected missing as_of (exit $RC)" || _fail "T09" "expected non-zero"

# ─────────────────────────────────────────────────────────────────────────────
# T10: journal_replay halts on unsupported schema version (exit 2)
#      partial output before halt must contain only pre-halt events
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: journal_replay halts on unsupported schema v"
T10="$TEST_ROOT/t10"
journal_init "$T10" >/dev/null
journal_append "$(_event "/before-halt" "ABSENT")" >/dev/null
# Inject v=99 event manually
/bin/echo '{"v":99,"event_id":"future","entity_id":"/future-schema","entity_type":"PATH","asserted_state":"ABSENT","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-05-07T20:00:00Z","ttl_seconds":null}' >> "$T10/journal.ndjson"
journal_append "$(_event "/after-halt" "ABSENT")" >/dev/null
REPLAY_OUT=$(journal_replay "$T10/journal.ndjson" "2099-12-31T23:59:59Z" 2>/dev/null)
RC=$?
PRE_HALT=$(echo "$REPLAY_OUT" | grep '"entity_id":"/before-halt"' 2>/dev/null | wc -l | tr -d ' ')
AFTER_HALT=$(echo "$REPLAY_OUT" | grep '"entity_id":"/after-halt"' 2>/dev/null | wc -l | tr -d ' ')
[ "$RC" -eq 2 ]       && _pass "T10: exit 2 (halted)" || _fail "T10" "expected exit 2, got $RC"
[ "$PRE_HALT" -eq 1 ] && _pass "T10: pre-halt event in output" || _fail "T10" "pre-halt event missing"
[ "$AFTER_HALT" -eq 0 ] && _pass "T10: post-halt event NOT in output" || _fail "T10" "post-halt event leaked into output"

# ─────────────────────────────────────────────────────────────────────────────
# T11: journal_replay skips malformed JSON (does NOT halt, logs to stderr)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T11: journal_replay skips malformed JSON (no halt)"
T11="$TEST_ROOT/t11"
journal_init "$T11" >/dev/null
journal_append "$(_event "/before-bad" "ABSENT")" >/dev/null
/usr/bin/printf 'this is {not valid json\n' >> "$T11/journal.ndjson"
journal_append "$(_event "/after-bad" "ABSENT")" >/dev/null
REPLAY_OUT=$(journal_replay "$T11/journal.ndjson" "2099-12-31T23:59:59Z" 2>/dev/null)
RC=$?
EVENTS=$(echo "$REPLAY_OUT" | grep -c '"entity_id"' 2>/dev/null || echo 0)
[ "$RC" -eq 0 ]        && _pass "T11: exit 0 (no halt on bad JSON)" || _fail "T11" "expected exit 0, got $RC"
[ "$EVENTS" -eq 2 ]    && _pass "T11: 2 valid events in output" || _fail "T11" "expected 2 events, got $EVENTS"

# ─────────────────────────────────────────────────────────────────────────────
# T12: journal_repair truncates partial last line; clean line preserved
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T12: journal_repair — partial last line"
T12="$TEST_ROOT/t12"
/bin/mkdir -p "$T12"
FULL_LINE='{"v":1,"event_id":"full1","entity_id":"/repair-test","entity_type":"PATH","asserted_state":"ABSENT","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-05-07T20:00:00Z","ttl_seconds":null}'
/bin/echo "$FULL_LINE" >> "$T12/journal.ndjson"
/usr/bin/printf '{"v":1,"event_id":"partial","entity_id":"/repair' >> "$T12/journal.ndjson"  # no closing }
PRE=$(wc -l < "$T12/journal.ndjson" | tr -d ' ')
journal_repair "$T12/journal.ndjson" 2>/dev/null
POST=$(wc -l < "$T12/journal.ndjson" | tr -d ' ')
[ "$POST" -eq 1 ] && _pass "T12: truncated to 1 clean line (was $PRE raw lines)" || _fail "T12" "expected 1 line after repair, got $POST"
VALID=$(/usr/bin/python3 -c "import json; json.loads(open('$T12/journal.ndjson').read().strip()); print('OK')" 2>/dev/null)
[ "$VALID" = "OK" ] && _pass "T12: remaining line is valid JSON" || _fail "T12" "remaining line not valid JSON"

# ─────────────────────────────────────────────────────────────────────────────
# T13: journal_repair — clean file is NOT modified
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T13: journal_repair — clean file unchanged"
T13="$TEST_ROOT/t13"
journal_init "$T13" >/dev/null
journal_append "$(_event "/clean" "PRESENT")" >/dev/null
BEFORE=$(/bin/cat "$T13/journal.ndjson")
journal_repair "$T13/journal.ndjson" 2>/dev/null
AFTER=$(/bin/cat "$T13/journal.ndjson")
[ "$BEFORE" = "$AFTER" ] && _pass "T13: clean file unchanged" || _fail "T13" "file modified unexpectedly"

# ─────────────────────────────────────────────────────────────────────────────
# T14: journal_repair — empty file is a no-op
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T14: journal_repair — empty file"
T14="$TEST_ROOT/t14"
/bin/mkdir -p "$T14"
/usr/bin/touch "$T14/journal.ndjson"
journal_repair "$T14/journal.ndjson" 2>/dev/null
RC=$?
SZ=$(/usr/bin/stat -f%z "$T14/journal.ndjson")
[ "$RC" -eq 0 ] && _pass "T14: exit 0" || _fail "T14" "expected exit 0, got $RC"
[ "$SZ" -eq 0 ] && _pass "T14: file still empty" || _fail "T14" "file grew unexpectedly ($SZ bytes)"

# ─────────────────────────────────────────────────────────────────────────────
# T15: CRLF normalization
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T15: journal_repair — CRLF normalization"
T15="$TEST_ROOT/t15"
/bin/mkdir -p "$T15"
CRLF_LINE='{"v":1,"event_id":"crlf1","entity_id":"/crlf-test","entity_type":"PATH","asserted_state":"PRESENT","source":"PHYSICAL","source_priority":1,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-05-07T20:00:00Z","ttl_seconds":null}'
/usr/bin/printf '%s\r\n' "$CRLF_LINE" >> "$T15/journal.ndjson"
journal_repair "$T15/journal.ndjson" 2>/dev/null
# Check no \r remains
CR_COUNT=$(LC_ALL=C /usr/bin/od -An -tx1 "$T15/journal.ndjson" | LC_ALL=C /usr/bin/grep ' 0d' 2>/dev/null | wc -l | tr -d ' ')
[ "$CR_COUNT" -eq 0 ] && _pass "T15: no CR bytes after repair" || _fail "T15" "CR bytes still present ($CR_COUNT)"
VALID=$(/usr/bin/python3 -c "import json; json.loads(open('$T15/journal.ndjson').read().strip()); print('OK')" 2>/dev/null)
[ "$VALID" = "OK" ] && _pass "T15: file valid JSON after CRLF normalization" || _fail "T15" "invalid JSON after repair"

# ─────────────────────────────────────────────────────────────────────────────
# T16: POST_HOC_MANIFEST breach flag survives write → read round-trip
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T16: POST_HOC_MANIFEST breach flag round-trip"
T16="$TEST_ROOT/t16"
journal_init "$T16" >/dev/null
BREACH_EVENT='{"v":1,"event_id":"breach001","entity_id":"/Downloads/mac-schedule-keeper","entity_type":"PATH","asserted_state":"ABSENT","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":["POST_HOC_MANIFEST"]},"asserted_at":"2026-05-07T19:36:57Z","ttl_seconds":null}'
journal_append "$BREACH_EVENT" >/dev/null
FLAG=$(journal_read "/Downloads/mac-schedule-keeper" | \
  /usr/bin/python3 -c "import json,sys; e=json.loads(sys.stdin.readline()); print(e['evidence']['breach_flags'][0])" 2>/dev/null)
[ "$FLAG" = "POST_HOC_MANIFEST" ] && _pass "T16: POST_HOC_MANIFEST preserved" || _fail "T16" "got: '$FLAG'"

# ─────────────────────────────────────────────────────────────────────────────
# T17: Concurrent appends — 20 parallel writers, all lines valid, no corruption
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T17: concurrent appends (20 parallel writers)"
T17="$TEST_ROOT/t17"
journal_init "$T17" >/dev/null
HELPER="$SKILLS_SCRIPTS/_journal_helper.py"
JPATH="$T17/journal.ndjson"

for i in $(seq 1 20); do
  (
    TS=$(/bin/date -u +"%Y-%m-%dT%H:%M:%SZ")
    EVT="{\"v\":1,\"event_id\":\"concurrent_${i}_${RANDOM}\",\"entity_id\":\"/concurrent/${i}\",\"entity_type\":\"PATH\",\"asserted_state\":\"ABSENT\",\"source\":\"MANIFEST_GATE\",\"source_priority\":2,\"gate_id\":null,\"evidence\":{\"manifest_path\":null,\"physical_check\":null,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]},\"asserted_at\":\"${TS}\",\"ttl_seconds\":null}"
    LC_ALL=C /usr/bin/python3 "$HELPER" write "$JPATH" "$EVT" 2>/dev/null
  ) &
done
wait

TOTAL=$(wc -l < "$T17/journal.ndjson" | tr -d ' ')
VALID=0
while IFS= read -r _ln; do
  [ -z "$_ln" ] && continue
  /usr/bin/python3 -c "import json,sys; json.loads(sys.argv[1])" "$_ln" 2>/dev/null && VALID=$((VALID+1))
done < "$T17/journal.ndjson"

[ "$TOTAL" -eq 20 ] && _pass "T17: 20 lines written" || _fail "T17" "expected 20 lines, got $TOTAL"
[ "$VALID" -eq 20 ] && _pass "T17: all 20 lines are valid JSON (no interleaving)" || _fail "T17" "$VALID/20 valid — corruption detected"

# ─────────────────────────────────────────────────────────────────────────────
# REPAIR-PATH DEMONSTRATION
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo ""
/bin/echo "── Repair-path demonstration ──"
T_DEMO="$TEST_ROOT/repair_demo"
/bin/mkdir -p "$T_DEMO"
GOOD='{"v":1,"event_id":"demo_good","entity_id":"/demo/path","entity_type":"PATH","asserted_state":"ABSENT","source":"MANIFEST_GATE","source_priority":2,"gate_id":null,"evidence":{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]},"asserted_at":"2026-05-07T20:00:00Z","ttl_seconds":null}'
/bin/echo "$GOOD" >> "$T_DEMO/journal.ndjson"
/usr/bin/printf '{"v":1,"event_id":"crash_partial","entity_id":"/demo/path' >> "$T_DEMO/journal.ndjson"

SIZE_BEFORE=$(/usr/bin/stat -f%z "$T_DEMO/journal.ndjson")
LINES_BEFORE=$(wc -l < "$T_DEMO/journal.ndjson" | tr -d ' ')
LAST_BYTES=$(tail -c 40 "$T_DEMO/journal.ndjson" 2>/dev/null | /usr/bin/od -An -c | head -1 | sed 's/^[[:space:]]*//')

/bin/echo "  state before repair: ${SIZE_BEFORE} bytes, ${LINES_BEFORE} newline(s)"
/bin/echo "  last 40 bytes:  $LAST_BYTES"

journal_repair "$T_DEMO/journal.ndjson"

SIZE_AFTER=$(/usr/bin/stat -f%z "$T_DEMO/journal.ndjson")
LINES_AFTER=$(wc -l < "$T_DEMO/journal.ndjson" | tr -d ' ')
STILL_VALID=$(/usr/bin/python3 -c "import json; json.loads(open('$T_DEMO/journal.ndjson').read().strip()); print('YES')" 2>/dev/null || echo NO)

/bin/echo "  state after repair:  ${SIZE_AFTER} bytes, ${LINES_AFTER} line(s)"
/bin/echo "  remaining line valid JSON: $STILL_VALID"

# ─────────────────────────────────────────────────────────────────────────────
# CONCURRENT APPEND PROOF (visible output)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo ""
/bin/echo "── Concurrent append proof (T17 journal) ──"
/bin/echo "  Total lines: $TOTAL"
/bin/echo "  Valid JSON:  $VALID"
/bin/echo "  Corruption:  $( [ "$VALID" -eq "$TOTAL" ] && echo NONE || echo "DETECTED — $((TOTAL-VALID)) invalid lines" )"

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo ""
/bin/echo "══ RESULTS ══"
/bin/echo "  PASS: $PASS"
/bin/echo "  FAIL: $FAIL"
/bin/echo ""

if [ "${#FAIL_MSGS[@]}" -gt 0 ]; then
  /bin/echo "Failures:"
  for _msg in "${FAIL_MSGS[@]}"; do
    /bin/echo "  $_msg"
  done
  /bin/echo ""
fi

[ "$FAIL" -eq 0 ] && /bin/echo "ALL TESTS PASSED" || /bin/echo "FAILED: $FAIL test(s)"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
