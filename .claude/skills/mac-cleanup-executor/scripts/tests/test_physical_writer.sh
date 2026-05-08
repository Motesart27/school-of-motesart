#!/bin/bash
# mac-cleanup-executor :: tests/test_physical_writer.sh  v1.0.0
# Test suite for manifest_assert_physical (manifest_writer.sh v1.3.0).
# Covers: PRESENT/ABSENT detection, evidence payload, PHYSICAL priority,
# gate_guard fail-closed, journal failure handling, and integration patterns.
# Run from any directory: bash tests/test_physical_writer.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
      MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true

source "$SCRIPTS/manifest_writer.sh" 2>&1 || {
  /bin/echo "FATAL: could not source manifest_writer.sh" >&2
  exit 1
}

source "$SCRIPTS/resolve.sh" 2>&1 || {
  /bin/echo "FATAL: could not source resolve.sh" >&2
  exit 1
}

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/phys_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

_setup_test() {
  local tname="$1"
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  MANIFEST_DIR="$TEST_ROOT/$tname/manifests"
  _MW_JDIR="$TEST_ROOT/$tname/journal"
  /bin/mkdir -p "$MANIFEST_DIR"
}

# Helper: extract a field from the first matching journal line
_jfield() {
  local jpath="$1" entity="$2" field="$3"
  grep "\"entity_id\":\"$entity\"" "$jpath" 2>/dev/null | head -1 | \
    /usr/bin/python3 -c "
import sys, json
line = sys.stdin.read().strip()
if not line:
    print('')
else:
    ev = json.loads(line)
    val = ev.get('$field', ev.get('evidence', {}).get('$field', ''))
    print(val)
" 2>/dev/null
}

/bin/echo "══ test_physical_writer.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: manifest_assert_physical on existing path → state=PRESENT, source=PHYSICAL
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: manifest_assert_physical on existing path → PRESENT"
_setup_test "t01"
manifest_init_strict "phys_t01" >/dev/null 2>/dev/null
T01_FILE="$TEST_ROOT/t01/target_file"
touch "$T01_FILE"
manifest_assert_physical "$T01_FILE" >/dev/null 2>/dev/null
T01_STATE=$(_jfield "$JOURNAL_PATH" "$T01_FILE" "asserted_state")
T01_SRC=$(_jfield "$JOURNAL_PATH" "$T01_FILE" "source")
[ "$T01_STATE" = "PRESENT" ] \
  && _pass "T01: state=PRESENT for existing file" \
  || _fail "T01" "expected PRESENT, got '$T01_STATE'"
[ "$T01_SRC" = "PHYSICAL" ] \
  && _pass "T01: source=PHYSICAL" \
  || _fail "T01" "expected PHYSICAL, got '$T01_SRC'"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T02: manifest_assert_physical on nonexistent path → state=ABSENT, source=PHYSICAL
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: manifest_assert_physical on nonexistent path → ABSENT"
_setup_test "t02"
manifest_init_strict "phys_t02" >/dev/null 2>/dev/null
T02_PATH="$TEST_ROOT/t02/does_not_exist"
manifest_assert_physical "$T02_PATH" >/dev/null 2>/dev/null
T02_STATE=$(_jfield "$JOURNAL_PATH" "$T02_PATH" "asserted_state")
T02_SRC=$(_jfield "$JOURNAL_PATH" "$T02_PATH" "source")
[ "$T02_STATE" = "ABSENT" ] \
  && _pass "T02: state=ABSENT for nonexistent path" \
  || _fail "T02" "expected ABSENT, got '$T02_STATE'"
[ "$T02_SRC" = "PHYSICAL" ] \
  && _pass "T02: source=PHYSICAL" \
  || _fail "T02" "expected PHYSICAL, got '$T02_SRC'"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T03: evidence.physical_check=true for PRESENT, false for ABSENT
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: evidence.physical_check=true/false matches filesystem state"
_setup_test "t03"
manifest_init_strict "phys_t03" >/dev/null 2>/dev/null
T03_EXIST="$TEST_ROOT/t03/exists"
T03_GONE="$TEST_ROOT/t03/gone"
touch "$T03_EXIST"
manifest_assert_physical "$T03_EXIST" >/dev/null 2>/dev/null
manifest_assert_physical "$T03_GONE" >/dev/null 2>/dev/null
T03_CHECK_T=$(grep "\"entity_id\":\"$T03_EXIST\"" "$JOURNAL_PATH" 2>/dev/null | head -1 | \
  /usr/bin/python3 -c "
import sys, json
ev = json.loads(sys.stdin.read().strip())
print(ev.get('evidence', {}).get('physical_check', ''))
" 2>/dev/null)
T03_CHECK_F=$(grep "\"entity_id\":\"$T03_GONE\"" "$JOURNAL_PATH" 2>/dev/null | head -1 | \
  /usr/bin/python3 -c "
import sys, json
ev = json.loads(sys.stdin.read().strip())
print(ev.get('evidence', {}).get('physical_check', ''))
" 2>/dev/null)
[ "$T03_CHECK_T" = "True" ] \
  && _pass "T03: physical_check=true for PRESENT path" \
  || _fail "T03" "expected True, got '$T03_CHECK_T'"
[ "$T03_CHECK_F" = "False" ] \
  && _pass "T03: physical_check=false for ABSENT path" \
  || _fail "T03" "expected False, got '$T03_CHECK_F'"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T04: PHYSICAL (priority 1) beats MANIFEST_GATE (priority 2) in resolve
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: PHYSICAL outranks MANIFEST_GATE in resolve"
_setup_test "t04"
manifest_init_strict "phys_t04" >/dev/null 2>/dev/null
T04_PATH="$TEST_ROOT/t04/contested_path"
# First: MANIFEST_GATE asserts ABSENT (higher-number priority = lower precedence)
gate_assert "$T04_PATH" "PATH" "ABSENT" "MANIFEST_GATE" "$_GATE_NULL_EVIDENCE" >/dev/null 2>/dev/null
# Then: PHYSICAL asserts PRESENT (path now exists, priority 1 wins)
touch "$T04_PATH"
manifest_assert_physical "$T04_PATH" >/dev/null 2>/dev/null
T04_OUT=$(resolve "$T04_PATH" 2>/dev/null)
T04_STATE=$(echo "$T04_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('asserted_state',''))" 2>/dev/null)
T04_SRC=$(echo "$T04_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('source',''))" 2>/dev/null)
T04_CONF=$(echo "$T04_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('confidence',''))" 2>/dev/null)
[ "$T04_STATE" = "PRESENT" ] \
  && _pass "T04: PHYSICAL PRESENT beats MANIFEST_GATE ABSENT" \
  || _fail "T04" "expected PRESENT, got '$T04_STATE'"
[ "$T04_SRC" = "PHYSICAL" ] \
  && _pass "T04: resolve reports source=PHYSICAL" \
  || _fail "T04" "expected PHYSICAL, got '$T04_SRC'"
[ "$T04_CONF" = "HIGH" ] \
  && _pass "T04: confidence=HIGH for PHYSICAL" \
  || _fail "T04" "expected HIGH, got '$T04_CONF'"
/bin/echo "  [proof — PHYSICAL priority 1 over MANIFEST_GATE priority 2: state=$T04_STATE source=$T04_SRC confidence=$T04_CONF]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T05: manifest_assert_physical without active gate → exit 99 (gate_guard fires)
# Run in subshell so exit doesn't kill test suite.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: manifest_assert_physical exits 99 without active gate"
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_assert_physical "/tmp/any_path_t05" 2>/dev/null
)
T05_RC=$?
[ "$T05_RC" -eq 99 ] \
  && _pass "T05: exit 99 without active gate (gate_guard fires)" \
  || _fail "T05" "expected exit 99, got $T05_RC"
/bin/echo "  [proof — gate_guard exited $T05_RC without touching the filesystem]"

# ─────────────────────────────────────────────────────────────────────────────
# T06: journal write fails (read-only) → WARN on stderr, non-zero RC, no exit
# Uses chmod 444 so gate_guard passes (file exists) but journal_append fails.
# Runs in main shell to verify the process does NOT exit.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: manifest_assert_physical emits WARN on journal write failure (no exit)"
_setup_test "t06"
manifest_init_strict "phys_t06" >/dev/null 2>/dev/null
T06_FILE="$TEST_ROOT/t06/target"
touch "$T06_FILE"
chmod 444 "$JOURNAL_PATH"
T06_TMPSTDERR=$(mktemp)
manifest_assert_physical "$T06_FILE" >/dev/null 2>"$T06_TMPSTDERR"
T06_RC=$?
chmod 644 "$JOURNAL_PATH"
grep -qi "WARN" "$T06_TMPSTDERR" \
  && _pass "T06: WARN emitted on journal write failure" \
  || _fail "T06" "no WARN in stderr: $(cat "$T06_TMPSTDERR")"
[ "$T06_RC" -ne 0 ] \
  && _pass "T06: non-zero RC on journal write failure" \
  || _fail "T06" "expected non-zero RC, got $T06_RC"
_pass "T06: process alive after journal write failure (no exit)"
rm -f "$T06_TMPSTDERR"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T07: two PHYSICAL assertions for same path — both written, resolve returns PHYSICAL
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: two sequential PHYSICAL assertions — both written, resolve returns PHYSICAL"
_setup_test "t07"
manifest_init_strict "phys_t07" >/dev/null 2>/dev/null
T07_PATH="$TEST_ROOT/t07/flip_flop"
touch "$T07_PATH"
manifest_assert_physical "$T07_PATH" >/dev/null 2>/dev/null
rm -f "$T07_PATH"
manifest_assert_physical "$T07_PATH" >/dev/null 2>/dev/null
T07_COUNT=$(grep "\"entity_id\":\"$T07_PATH\"" "$JOURNAL_PATH" 2>/dev/null | wc -l | tr -d ' ')
[ "$T07_COUNT" -eq 2 ] \
  && _pass "T07: two PHYSICAL events written for same path" \
  || _fail "T07" "expected 2 PHYSICAL events, got $T07_COUNT"
T07_OUT=$(resolve "$T07_PATH" 2>/dev/null)
T07_SRC=$(echo "$T07_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('source',''))" 2>/dev/null)
T07_CONF=$(echo "$T07_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('confidence',''))" 2>/dev/null)
[ "$T07_SRC" = "PHYSICAL" ] \
  && _pass "T07: winning event source=PHYSICAL" \
  || _fail "T07" "expected PHYSICAL source, got '$T07_SRC'"
[ -n "$T07_CONF" ] \
  && _pass "T07: resolve produces valid confidence ($T07_CONF)" \
  || _fail "T07" "resolve returned empty confidence"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T08: tier1 integration pattern — manifest_record then rm then assert_physical
# PHYSICAL ABSENT wins over MANIFEST_GATE PRESENT in resolve
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T08: tier1 pattern — PHYSICAL ABSENT wins after rm over MANIFEST_GATE PRESENT"
_setup_test "t08"
manifest_init_strict "phys_t08" >/dev/null 2>/dev/null
T08_PATH="$TEST_ROOT/t08/target_file"
touch "$T08_PATH"
manifest_record "$T08_PATH" "1" "tier1 target" >/dev/null 2>/dev/null
rm -f "$T08_PATH"
manifest_assert_physical "$T08_PATH" >/dev/null 2>/dev/null
T08_OUT=$(resolve "$T08_PATH" 2>/dev/null)
T08_STATE=$(echo "$T08_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('asserted_state',''))" 2>/dev/null)
T08_SRC=$(echo "$T08_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('source',''))" 2>/dev/null)
[ "$T08_STATE" = "ABSENT" ] \
  && _pass "T08: PHYSICAL ABSENT wins over MANIFEST_GATE PRESENT" \
  || _fail "T08" "expected ABSENT, got '$T08_STATE'"
[ "$T08_SRC" = "PHYSICAL" ] \
  && _pass "T08: resolve source=PHYSICAL (tier1 pattern verified)" \
  || _fail "T08" "expected PHYSICAL, got '$T08_SRC'"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T09: migrate pattern — assert PRESENT at dest after copy, ABSENT at source after delete
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T09: migrate pattern — PRESENT at dest, ABSENT at source"
_setup_test "t09"
manifest_init_strict "phys_t09" >/dev/null 2>/dev/null
T09_SRC="$TEST_ROOT/t09/source_dir"
T09_DEST="$TEST_ROOT/t09/dest_dir"
mkdir -p "$T09_SRC"
/bin/echo "test content" > "$T09_SRC/file.txt"
cp -r "$T09_SRC/." "$T09_DEST/"
manifest_assert_physical "$T09_DEST" >/dev/null 2>/dev/null
T09_DEST_STATE=$(_jfield "$JOURNAL_PATH" "$T09_DEST" "asserted_state")
[ "$T09_DEST_STATE" = "PRESENT" ] \
  && _pass "T09: dest PRESENT after copy" \
  || _fail "T09" "dest state wrong: '$T09_DEST_STATE'"
rm -rf "$T09_SRC"
manifest_assert_physical "$T09_SRC" >/dev/null 2>/dev/null
T09_SRC_STATE=$(_jfield "$JOURNAL_PATH" "$T09_SRC" "asserted_state")
[ "$T09_SRC_STATE" = "ABSENT" ] \
  && _pass "T09: source ABSENT after delete" \
  || _fail "T09" "source state wrong: '$T09_SRC_STATE'"
T09_COUNT=$(grep '"source":"PHYSICAL"' "$JOURNAL_PATH" 2>/dev/null | wc -l | tr -d ' ')
[ "$T09_COUNT" -eq 2 ] \
  && _pass "T09: two PHYSICAL events in journal (migrate pattern)" \
  || _fail "T09" "expected 2 PHYSICAL events, got $T09_COUNT"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T10: snapshot pattern — gate_assert called directly with SNAPSHOT entity type
# Verifies PHYSICAL source_priority=1 for non-PATH entity types
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T10: snapshot pattern — gate_assert directly with SNAPSHOT entity type"
_setup_test "t10"
manifest_init_strict "phys_t10" >/dev/null 2>/dev/null
T10_SNAP="snapshot:com.apple.TimeMachine.2026-01-01-120000"
T10_EVIDENCE='{"manifest_path":null,"physical_check":false,"agent_id":null,"checksum":null,"breach_flags":[]}'
gate_assert "$T10_SNAP" "SNAPSHOT" "ABSENT" "PHYSICAL" "$T10_EVIDENCE" >/dev/null 2>/dev/null
T10_LINE=$(grep "TimeMachine.2026-01-01-120000" "$JOURNAL_PATH" 2>/dev/null | head -1)
T10_SRC=$(echo "$T10_LINE" | /usr/bin/python3 -c \
  "import sys,json; ev=json.loads(sys.stdin.read().strip()); print(ev.get('source',''))" 2>/dev/null)
T10_PRI=$(echo "$T10_LINE" | /usr/bin/python3 -c \
  "import sys,json; ev=json.loads(sys.stdin.read().strip()); print(ev.get('source_priority',''))" 2>/dev/null)
T10_ETYPE=$(echo "$T10_LINE" | /usr/bin/python3 -c \
  "import sys,json; ev=json.loads(sys.stdin.read().strip()); print(ev.get('entity_type',''))" 2>/dev/null)
T10_STATE=$(echo "$T10_LINE" | /usr/bin/python3 -c \
  "import sys,json; ev=json.loads(sys.stdin.read().strip()); print(ev.get('asserted_state',''))" 2>/dev/null)
[ "$T10_SRC" = "PHYSICAL" ] \
  && _pass "T10: source=PHYSICAL for SNAPSHOT entity" \
  || _fail "T10" "expected PHYSICAL, got '$T10_SRC'"
[ "$T10_PRI" = "1" ] \
  && _pass "T10: source_priority=1 (highest) for PHYSICAL" \
  || _fail "T10" "expected priority 1, got '$T10_PRI'"
[ "$T10_ETYPE" = "SNAPSHOT" ] \
  && _pass "T10: entity_type=SNAPSHOT preserved" \
  || _fail "T10" "expected SNAPSHOT, got '$T10_ETYPE'"
[ "$T10_STATE" = "ABSENT" ] \
  && _pass "T10: state=ABSENT for thinned snapshot" \
  || _fail "T10" "expected ABSENT, got '$T10_STATE'"
manifest_close >/dev/null 2>/dev/null

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
