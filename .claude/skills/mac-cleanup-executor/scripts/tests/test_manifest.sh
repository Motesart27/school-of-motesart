#!/bin/bash
# mac-cleanup-executor :: tests/test_manifest.sh  v1.0.0
# Compatibility test suite for manifest_writer.sh v1.2.0 delegation layer.
# Verifies: all legacy functions work, MANIFEST_PATH + GATE_ID + JOURNAL_PATH
# all set, journal events written, backward-compat with production callers.
# Run from any directory: bash tests/test_manifest.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
      MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true

source "$SCRIPTS/manifest_writer.sh" 2>&1 || {
  /bin/echo "FATAL: could not source manifest_writer.sh" >&2
  exit 1
}

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/mw_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

# Reset all gate + manifest state and point to a per-test directory
_setup_test() {
  local tname="$1"
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  MANIFEST_DIR="$TEST_ROOT/$tname/manifests"
  _MW_JDIR="$TEST_ROOT/$tname/journal"
  /bin/mkdir -p "$MANIFEST_DIR"
}

/bin/echo "══ test_manifest.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: sourcing manifest_writer.sh also makes gate functions available
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: gate functions available after source"
declare -F gate_open >/dev/null 2>&1 && _pass "T01: gate_open defined" || _fail "T01" "gate_open not defined"
declare -F gate_guard >/dev/null 2>&1 && _pass "T01: gate_guard defined" || _fail "T01" "gate_guard not defined"
declare -F gate_assert >/dev/null 2>&1 && _pass "T01: gate_assert defined" || _fail "T01" "gate_assert not defined"
declare -F gate_close >/dev/null 2>&1 && _pass "T01: gate_close defined" || _fail "T01" "gate_close not defined"
declare -F journal_append >/dev/null 2>&1 && _pass "T01: journal_append defined" || _fail "T01" "journal_append not defined"

# ─────────────────────────────────────────────────────────────────────────────
# T02: manifest_init sets MANIFEST_PATH, GATE_ID, and JOURNAL_PATH
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: manifest_init sets all three env vars"
_setup_test "t02"
manifest_init "test_init" >/dev/null 2>/dev/null
[ -n "${MANIFEST_PATH:-}" ] && _pass "T02: MANIFEST_PATH set" || _fail "T02" "MANIFEST_PATH not set"
[ -n "${GATE_ID:-}" ] && _pass "T02: GATE_ID set" || _fail "T02" "GATE_ID not set"
[ -n "${JOURNAL_PATH:-}" ] && _pass "T02: JOURNAL_PATH set" || _fail "T02" "JOURNAL_PATH not set"
[ -f "${MANIFEST_PATH:-/nonexistent}" ] && _pass "T02: manifest file created" || _fail "T02" "manifest file missing"
[ -f "${JOURNAL_PATH:-/nonexistent}" ] && _pass "T02: journal file created" || _fail "T02" "journal file missing"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T03: manifest_init_strict verifies all three vars; prints both gate lines
# manifest_init_strict must run in main shell (not subshell) so exports propagate.
# Capture output via temp file redirect.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: manifest_init_strict sets and verifies all three vars"
_setup_test "t03"
T03_OUT="$TEST_ROOT/t03_out.txt"
manifest_init_strict "test_strict" >"$T03_OUT" 2>&1
STRICT_RC=$?
STRICT_OUT=$(cat "$T03_OUT")
[ "$STRICT_RC" -eq 0 ] && _pass "T03: manifest_init_strict exits 0" || _fail "T03" "manifest_init_strict failed: rc=$STRICT_RC"
[ -n "${MANIFEST_PATH:-}" ] && _pass "T03: MANIFEST_PATH set after strict" || _fail "T03" "MANIFEST_PATH not set"
[ -n "${GATE_ID:-}" ] && _pass "T03: GATE_ID set after strict" || _fail "T03" "GATE_ID not set"
[ -n "${JOURNAL_PATH:-}" ] && _pass "T03: JOURNAL_PATH set after strict" || _fail "T03" "JOURNAL_PATH not set"
echo "$STRICT_OUT" | grep -q "manifest gate verified" && _pass "T03: manifest gate verified line present" || _fail "T03" "no manifest gate verified line in: $STRICT_OUT"
echo "$STRICT_OUT" | grep -q "journal gate verified" && _pass "T03: journal gate verified line present" || _fail "T03" "no journal gate verified line"
echo "$STRICT_OUT" | grep -q "GATE_ID=" && _pass "T03: GATE_ID in verification output" || _fail "T03" "GATE_ID not shown in output"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T04: manifest_guard passes with active manifest + gate
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: manifest_guard passes with active manifest + gate"
_setup_test "t04"
manifest_init_strict "guard_test" >/dev/null 2>/dev/null
manifest_guard 2>/dev/null
GUARD_RC=$?
[ "$GUARD_RC" -eq 0 ] && _pass "T04: manifest_guard passes" || _fail "T04" "manifest_guard failed: rc=$GUARD_RC"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T05: manifest_guard exits 99 with no MANIFEST_PATH (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: manifest_guard exits 99 with no MANIFEST_PATH (subshell)"
T05_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  manifest_guard 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T05_EXIT=$(echo "$T05_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T05_EXIT" = "99" ] && _pass "T05: exit 99 with no MANIFEST_PATH" || _fail "T05" "expected 99, got $T05_EXIT"
echo "$T05_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T05" "execution continued" || _pass "T05: execution stopped"

# ─────────────────────────────────────────────────────────────────────────────
# T06: manifest_guard exits 99 with MANIFEST_PATH set but no GATE_ID (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: manifest_guard exits 99 with MANIFEST_PATH but no GATE_ID (subshell)"
T06_MF="$TEST_ROOT/t06_fake_manifest.json"
/bin/echo '{}' > "$T06_MF"
T06_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  export MANIFEST_PATH="$T06_MF"
  manifest_guard 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T06_EXIT=$(echo "$T06_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T06_EXIT" = "99" ] && _pass "T06: exit 99 with MANIFEST_PATH but no GATE_ID" || _fail "T06" "expected 99, got $T06_EXIT"
echo "$T06_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T06" "execution continued" || _pass "T06: execution stopped"

# ─────────────────────────────────────────────────────────────────────────────
# T07: manifest_record writes JSON item AND journal StateEvent
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: manifest_record writes JSON item and journal StateEvent"
_setup_test "t07"
manifest_init_strict "record_test" >/dev/null 2>/dev/null
T07_MP="$MANIFEST_PATH"
T07_JP="$JOURNAL_PATH"
manifest_record "/tmp/testpath_absent" "1" "test reason" >/dev/null
# JSON item written
MANIFEST_LINES=$(grep -c "testpath_absent" "${T07_MP:-/nonexistent}" 2>/dev/null || /bin/echo 0)
[ "$MANIFEST_LINES" -ge 1 ] && _pass "T07: manifest JSON item written" || _fail "T07" "path not found in manifest JSON"
# Journal StateEvent written
JOURNAL_LINES=$(grep '"entity_id":"/tmp/testpath_absent"' "${T07_JP:-/nonexistent}" 2>/dev/null | wc -l | tr -d ' ')
[ "$JOURNAL_LINES" -eq 1 ] && _pass "T07: journal StateEvent written" || _fail "T07" "StateEvent not in journal (found $JOURNAL_LINES)"
# source=MANIFEST_GATE, priority=2
SRC=$(/usr/bin/python3 -c "
import json
for line in open('${T07_JP}'):
    try:
        ev = json.loads(line)
        if ev.get('entity_id') == '/tmp/testpath_absent':
            print(ev.get('source',''), ev.get('source_priority',''))
    except: pass
" 2>/dev/null)
echo "$SRC" | grep -q "MANIFEST_GATE" && _pass "T07: source=MANIFEST_GATE" || _fail "T07" "wrong source: $SRC"
echo "$SRC" | grep -q "2" && _pass "T07: source_priority=2" || _fail "T07" "wrong priority: $SRC"
# evidence.manifest_path populated
EVID=$(/usr/bin/python3 -c "
import json
for line in open('${T07_JP}'):
    try:
        ev = json.loads(line)
        if ev.get('entity_id') == '/tmp/testpath_absent':
            print(ev.get('evidence',{}).get('manifest_path',''))
    except: pass
" 2>/dev/null)
[ -n "$EVID" ] && _pass "T07: evidence.manifest_path populated" || _fail "T07" "evidence.manifest_path empty"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T08: manifest_record maps ABSENT/PRESENT state correctly
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: manifest_record maps ABSENT/PRESENT state correctly"
_setup_test "t08"
T08_EXISTING="$TEST_ROOT/t08_existing_file.txt"
/bin/echo "content" > "$T08_EXISTING"
manifest_init_strict "state_test" >/dev/null 2>/dev/null
T08_JP="$JOURNAL_PATH"
manifest_record "$T08_EXISTING" "1" "existing" >/dev/null
manifest_record "/nonexistent/path/nowhere" "1" "absent" >/dev/null
PRESENT_STATE=$(/usr/bin/python3 -c "
import json
for line in open('${T08_JP}'):
    try:
        ev = json.loads(line)
        if ev.get('entity_id') == '$T08_EXISTING':
            print(ev.get('asserted_state',''))
    except: pass
" 2>/dev/null)
ABSENT_STATE=$(/usr/bin/python3 -c "
import json
for line in open('${T08_JP}'):
    try:
        ev = json.loads(line)
        if ev.get('entity_id') == '/nonexistent/path/nowhere':
            print(ev.get('asserted_state',''))
    except: pass
" 2>/dev/null)
[ "$PRESENT_STATE" = "PRESENT" ] && _pass "T08: existing file → state=PRESENT" || _fail "T08" "expected PRESENT, got '$PRESENT_STATE'"
[ "$ABSENT_STATE" = "ABSENT" ] && _pass "T08: nonexistent path → state=ABSENT" || _fail "T08" "expected ABSENT, got '$ABSENT_STATE'"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T09: manifest_close writes JSON footer AND UNGATED event; unsets GATE_ID
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: manifest_close writes JSON footer and UNGATED event"
_setup_test "t09"
manifest_init_strict "close_test" >/dev/null 2>/dev/null
SAVED_JP="${JOURNAL_PATH:-}"
SAVED_MP="${MANIFEST_PATH:-}"
manifest_close "completed" >/dev/null
# JSON has completed_at (non-null)
COMPLETED=$(grep '"completed_at"' "${SAVED_MP:-/nonexistent}" 2>/dev/null | grep -v null | wc -l | tr -d ' ')
[ "$COMPLETED" -ge 1 ] && _pass "T09: manifest JSON has completed_at" || _fail "T09" "no non-null completed_at in manifest"
# status = completed
STATUS=$(grep '"status": "completed"' "${SAVED_MP:-/nonexistent}" 2>/dev/null | wc -l | tr -d ' ')
[ "$STATUS" -ge 1 ] && _pass "T09: manifest JSON status=completed" || _fail "T09" "status not completed in manifest"
# UNGATED event in journal
UNGATED=$(grep '"asserted_state":"UNGATED"' "${SAVED_JP:-/nonexistent}" 2>/dev/null | wc -l | tr -d ' ')
[ "$UNGATED" -ge 1 ] && _pass "T09: UNGATED event in journal" || _fail "T09" "no UNGATED event"
# GATE_ID + GATE_LABEL unset
[ -z "${GATE_ID:-}" ] && _pass "T09: GATE_ID unset after close" || _fail "T09" "GATE_ID still set: $GATE_ID"
[ -z "${GATE_LABEL:-}" ] && _pass "T09: GATE_LABEL unset after close" || _fail "T09" "GATE_LABEL still set: $GATE_LABEL"

# ─────────────────────────────────────────────────────────────────────────────
# T10: manifest_init_strict exits 98 on nested gate (subshell)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: manifest_init_strict exits 98 on nested gate (subshell)"
_setup_test "t10"
manifest_init_strict "outer" >/dev/null 2>/dev/null
OUTER_GATE_ID="$GATE_ID"
OUTER_JP="$JOURNAL_PATH"
T10_RESULT=$( (
  export GATE_ID="$OUTER_GATE_ID"
  export GATE_LABEL="outer"
  export JOURNAL_PATH="$OUTER_JP"
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  manifest_init_strict "inner" 2>/dev/null
  echo "SHOULD_NOT_REACH"
); echo "subshell_exit=$?" )
T10_EXIT=$(echo "$T10_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T10_EXIT" = "98" ] && _pass "T10: exit 98 on nested manifest_init_strict" || _fail "T10" "expected 98, got $T10_EXIT"
echo "$T10_RESULT" | grep -q "SHOULD_NOT_REACH" && _fail "T10" "execution continued" || _pass "T10: execution stopped"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T11: env var proof — MANIFEST_PATH + GATE_ID + JOURNAL_PATH all active
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T11: env var proof — all three vars active simultaneously"
_setup_test "t11"
manifest_init_strict "env_proof" >/dev/null 2>/dev/null
T11_GATE_ID="${GATE_ID:-}"
T11_MANIFEST_PATH="${MANIFEST_PATH:-}"
T11_JOURNAL_PATH="${JOURNAL_PATH:-}"
/bin/echo "  MANIFEST_PATH = $T11_MANIFEST_PATH"
/bin/echo "  GATE_ID       = $T11_GATE_ID"
/bin/echo "  JOURNAL_PATH  = $T11_JOURNAL_PATH"
[ -n "$T11_MANIFEST_PATH" ] && [ -f "$T11_MANIFEST_PATH" ] && _pass "T11: MANIFEST_PATH set and file exists" || _fail "T11" "MANIFEST_PATH missing"
[ -n "$T11_GATE_ID" ] && _pass "T11: GATE_ID set" || _fail "T11" "GATE_ID empty"
[ -n "$T11_JOURNAL_PATH" ] && [ -f "$T11_JOURNAL_PATH" ] && _pass "T11: JOURNAL_PATH set and file exists" || _fail "T11" "JOURNAL_PATH missing"
echo "$T11_GATE_ID" | grep -qE '^[0-9]{8}T[0-9]{6}Z_[0-9a-f]{16}$' \
  && _pass "T11: GATE_ID format correct" || _fail "T11" "GATE_ID format wrong: $T11_GATE_ID"
manifest_guard 2>/dev/null && _pass "T11: manifest_guard passes during active gate" || _fail "T11" "manifest_guard failed"
gate_close >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T12: full lifecycle — init_strict → guard → record × 2 → close → verify
# Uses isolated journal dir; event count must be exactly 4.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T12: full lifecycle test"
_setup_test "t12"
manifest_init_strict "lifecycle" >/dev/null 2>/dev/null
T12_MP="$MANIFEST_PATH"
T12_JP="$JOURNAL_PATH"
manifest_guard >/dev/null 2>/dev/null
manifest_record "/fake/path/a" "2" "lifecycle test a" >/dev/null
manifest_record "/fake/path/b" "2" "lifecycle test b" >/dev/null
manifest_close "completed" >/dev/null
# Both paths in manifest JSON
PA=$(grep -c "path/a" "$T12_MP" 2>/dev/null || /bin/echo 0)
PB=$(grep -c "path/b" "$T12_MP" 2>/dev/null || /bin/echo 0)
[ "$PA" -ge 1 ] && _pass "T12: path/a in manifest JSON" || _fail "T12" "path/a missing from manifest"
[ "$PB" -ge 1 ] && _pass "T12: path/b in manifest JSON" || _fail "T12" "path/b missing from manifest"
# Both paths in journal
JA=$(grep '"entity_id":"/fake/path/a"' "$T12_JP" 2>/dev/null | wc -l | tr -d ' ')
JB=$(grep '"entity_id":"/fake/path/b"' "$T12_JP" 2>/dev/null | wc -l | tr -d ' ')
[ "$JA" -eq 1 ] && _pass "T12: path/a StateEvent in journal" || _fail "T12" "path/a journal event count=$JA"
[ "$JB" -eq 1 ] && _pass "T12: path/b StateEvent in journal" || _fail "T12" "path/b journal event count=$JB"
# Isolated journal: GATED + 2 asserts + UNGATED = 4 events
TOTAL_EVENTS=$(grep '"v":1' "$T12_JP" 2>/dev/null | wc -l | tr -d ' ')
[ "$TOTAL_EVENTS" -eq 4 ] && _pass "T12: journal has 4 events (GATED + 2 asserts + UNGATED)" || _fail "T12" "expected 4 journal events, got $TOTAL_EVENTS"
# Manifest JSON is valid
/usr/bin/python3 -c "import json; json.load(open('$T12_MP'))" 2>/dev/null \
  && _pass "T12: manifest JSON is valid" || _fail "T12" "manifest JSON parse failed"

# ─────────────────────────────────────────────────────────────────────────────
# T13: compat — tier1_sweep.sh sourcing pattern (source + init_strict + guard + record + close)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T13: compat check — tier1_sweep.sh sourcing pattern"
T13_JDIR="$TEST_ROOT/t13/journal"
T13_MDIR="$TEST_ROOT/t13/manifests"
T13_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T13_MDIR"
  _MW_JDIR="$T13_JDIR"
  manifest_init_strict "tier1_compat" 2>/dev/null
  manifest_guard 2>/dev/null
  manifest_record "/fake/trash/item" "1" "Empty Trash" 2>/dev/null
  manifest_close "completed" 2>/dev/null
  echo "rc=0"
); echo "subshell_exit=$?" )
T13_EXIT=$(echo "$T13_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
T13_RC=$(echo "$T13_RESULT" | grep "^rc=" | sed 's/rc=//')
[ "$T13_EXIT" = "0" ] && _pass "T13: tier1_sweep pattern exits 0" || _fail "T13" "pattern exited $T13_EXIT"
[ "$T13_RC" = "0" ] && _pass "T13: tier1_sweep pattern completed" || _fail "T13" "pattern did not complete"

# ─────────────────────────────────────────────────────────────────────────────
# T14: compat — thin_snapshots.sh sourcing pattern
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T14: compat check — thin_snapshots.sh sourcing pattern"
T14_JDIR="$TEST_ROOT/t14/journal"
T14_MDIR="$TEST_ROOT/t14/manifests"
T14_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T14_MDIR"
  _MW_JDIR="$T14_JDIR"
  manifest_init_strict "thin_compat" 2>/dev/null
  manifest_guard 2>/dev/null
  manifest_record "snapshot: com.apple.TimeMachine.2026-05-07" "1" "TM local snapshot" 2>/dev/null
  manifest_close "completed" 2>/dev/null
  echo "rc=0"
); echo "subshell_exit=$?" )
T14_EXIT=$(echo "$T14_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T14_EXIT" = "0" ] && _pass "T14: thin_snapshots pattern exits 0" || _fail "T14" "pattern exited $T14_EXIT"

# ─────────────────────────────────────────────────────────────────────────────
# T15: compat — migrate_audio.sh sourcing pattern
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T15: compat check — migrate_audio.sh sourcing pattern"
T15_JDIR="$TEST_ROOT/t15/journal"
T15_MDIR="$TEST_ROOT/t15/manifests"
T15_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T15_MDIR"
  _MW_JDIR="$T15_JDIR"
  manifest_init_strict "migrate_compat" 2>/dev/null
  manifest_guard 2>/dev/null
  manifest_record "/fake/Music/sample.wav" "2" "audio migration to SSD" 2>/dev/null
  manifest_close "completed" 2>/dev/null
  echo "rc=0"
); echo "subshell_exit=$?" )
T15_EXIT=$(echo "$T15_RESULT" | grep "subshell_exit=" | sed 's/subshell_exit=//')
[ "$T15_EXIT" = "0" ] && _pass "T15: migrate_audio pattern exits 0" || _fail "T15" "pattern exited $T15_EXIT"

# ─────────────────────────────────────────────────────────────────────────────
# T16: manifest_close returns non-zero and emits WARN on gate_close failure
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T16: manifest_close propagates non-zero from gate_close on journal failure"
T16_JDIR="$TEST_ROOT/t16/journal"
T16_MDIR="$TEST_ROOT/t16/manifests"
T16_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T16_MDIR"
  _MW_JDIR="$T16_JDIR"
  manifest_init_strict "close_fail" 2>/dev/null
  rm -f "$JOURNAL_PATH"
  mc_stderr=$(manifest_close "completed" 2>&1 >/dev/null)
  mc_rc=$?
  echo "mc_rc=$mc_rc"
  echo "mc_stderr=$mc_stderr"
); echo "subshell_exit=$?" )
T16_MC_RC=$(echo "$T16_RESULT" | grep "^mc_rc=" | sed 's/mc_rc=//')
T16_MC_STDERR=$(echo "$T16_RESULT" | grep "^mc_stderr=" | sed 's/mc_stderr=//')
[ "${T16_MC_RC:-0}" -ne 0 ] 2>/dev/null && _pass "T16: manifest_close returns non-zero on gate_close failure" || _fail "T16" "expected non-zero from manifest_close, got '${T16_MC_RC:-}'"
echo "$T16_MC_STDERR" | grep -qi "WARN" && _pass "T16: manifest_close emits WARN on gate_close failure" || _fail "T16" "no WARN from manifest_close: $T16_MC_STDERR"

# ─────────────────────────────────────────────────────────────────────────────
# T17: no silent success — manifest_close failure propagates to control flow
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T17: no silent success — manifest_close failure propagates to caller"
T17_JDIR="$TEST_ROOT/t17/journal"
T17_MDIR="$TEST_ROOT/t17/manifests"
T17_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T17_MDIR"
  _MW_JDIR="$T17_JDIR"
  manifest_init_strict "silent_fail" 2>/dev/null
  rm -f "$JOURNAL_PATH"
  manifest_close "completed" 2>/dev/null && echo "OUTCOME=SUCCESS" || echo "OUTCOME=FAILURE"
); echo "subshell_exit=$?" )
T17_OUTCOME=$(echo "$T17_RESULT" | grep "^OUTCOME=" | sed 's/OUTCOME=//')
[ "$T17_OUTCOME" = "FAILURE" ] && _pass "T17: manifest_close non-zero propagates via || (no silent success)" || _fail "T17" "expected FAILURE from || chain, got '$T17_OUTCOME'"

# ─────────────────────────────────────────────────────────────────────────────
# T18: manifest_init emits deprecation WARN on stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T18: manifest_init emits deprecation WARN on stderr"
T18_JDIR="$TEST_ROOT/t18/journal"
T18_MDIR="$TEST_ROOT/t18/manifests"
T18_STDERR=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T18_MDIR"
  _MW_JDIR="$T18_JDIR"
  manifest_init "deprecation_test" 2>&1 >/dev/null
) )
echo "$T18_STDERR" | grep -q "WARN: manifest_init called directly" \
  && _pass "T18: manifest_init emits deprecation WARN on stderr" \
  || _fail "T18" "expected deprecation WARN, got: $T18_STDERR"

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
