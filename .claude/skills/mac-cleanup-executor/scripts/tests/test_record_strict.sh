#!/bin/bash
# mac-cleanup-executor :: tests/test_record_strict.sh  v1.0.1
# Targeted tests for manifest_record_strict (manifest_writer.sh v1.4.0).
# Proves: manifest_record failure exits 98, destructive sentinel NOT executed,
# tier1 loop pattern blocked, thin_snapshots loop pattern blocked,
# and successful path continues normally.
#
# Design notes:
#   - Uses ( ) subshells with output to temp files, NOT $() command substitution.
#     $() re-sources manifest_writer.sh in bash 3.2 which resets _MW_JDIR to the
#     home dir, causing lock conflicts between sequential tests.
#   - _setup_test sets _MW_JDIR to a per-test temp dir; ( ) subshells inherit it.
#   - T03 (success path) runs in the parent shell — no exit() call needed.
# Run from any directory: bash tests/test_record_strict.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
      MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true

source "$SCRIPTS/manifest_writer.sh" 2>&1 || {
  /bin/echo "FATAL: could not source manifest_writer.sh" >&2
  exit 1
}

# ── Test framework ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_MSGS=()
TEST_ROOT=$(mktemp -d /tmp/record_strict_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() {
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("FAIL [$1]: $2")
  /bin/echo "  FAIL  $1 — $2"
}

# _setup_test sets _MW_JDIR + MANIFEST_DIR to per-test temp dirs in parent shell.
# ( ) subshells inherit these values — no re-source needed.
_setup_test() {
  local tname="$1"
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  _MW_JDIR="$TEST_ROOT/$tname/journal"
  MANIFEST_DIR="$TEST_ROOT/$tname/manifests"
  /bin/mkdir -p "$MANIFEST_DIR"
}

/bin/echo "══ test_record_strict.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: manifest_record failure → exit 98, destructive sentinel NOT executed
# Forces manifest_record to return 1 by clearing MANIFEST_PATH after init.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: manifest_record failure → exit 98, sentinel blocked"
_setup_test "t01"

_T01_OUT=$(mktemp)
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "strict_t01" >/dev/null 2>/dev/null
  # Force manifest_record to fail: no MANIFEST_PATH
  MANIFEST_PATH=""
  manifest_record_strict "/some/path" "1" "test" >/dev/null 2>/dev/null
  # This sentinel must NOT be printed if exit 98 fired
  /bin/echo "DESTRUCTIVE_EXECUTED"
) >"$_T01_OUT" 2>/dev/null
T01_RC=$?
T01_OUT=$(cat "$_T01_OUT")
rm -f "$_T01_OUT"

[ "$T01_RC" -eq 98 ] \
  && _pass "T01: exit code 98 on manifest_record failure" \
  || _fail "T01" "expected exit 98, got $T01_RC"
[ "$T01_OUT" != "DESTRUCTIVE_EXECUTED" ] \
  && _pass "T01: destructive sentinel NOT executed (blocked by exit 98)" \
  || _fail "T01" "sentinel was executed — exit 98 did not fire"
/bin/echo "  [proof — forced failure: rc=$T01_RC sentinel='$T01_OUT' (empty=blocked)]"

# ─────────────────────────────────────────────────────────────────────────────
# T02: manifest_record failure → FATAL on stderr
# Captures stderr via temp file (bash 3.2: var=$(cmd) 2>&1 doesn't work).
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: manifest_record failure → FATAL message on stderr"
_setup_test "t02"

_T02_ERR=$(mktemp)
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "strict_t02" >/dev/null 2>/dev/null
  MANIFEST_PATH=""
  manifest_record_strict "/some/path" "1" "test" >/dev/null
) >/dev/null 2>"$_T02_ERR"
T02_RC=$?
T02_STDERR=$(cat "$_T02_ERR")
rm -f "$_T02_ERR"

echo "$T02_STDERR" | grep -qi "FATAL" \
  && _pass "T02: FATAL message emitted to stderr" \
  || _fail "T02" "expected FATAL in stderr, got: '$T02_STDERR'"
echo "$T02_STDERR" | grep -qi "manifest_record_strict" \
  && _pass "T02: stderr names manifest_record_strict" \
  || _fail "T02" "expected function name in stderr"
[ "$T02_RC" -eq 98 ] \
  && _pass "T02: exit 98 confirmed (stderr test)" \
  || _fail "T02" "expected 98, got $T02_RC"
/bin/echo "  [proof — FATAL stderr: rc=$T02_RC msg='$(echo "$T02_STDERR" | head -1)']"

# ─────────────────────────────────────────────────────────────────────────────
# T03: successful path — manifest_record_strict succeeds, execution continues
# Runs in PARENT SHELL (no subshell) to avoid exit() propagation.
# _setup_test isolates the gate in a per-test temp dir.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: successful manifest_record_strict → execution continues"
_setup_test "t03"

T03_FILE="$TEST_ROOT/t03/some_cache_dir"
/bin/mkdir -p "$T03_FILE"
/bin/echo "data" > "$T03_FILE/file.bin"

manifest_init_strict "strict_t03" >/dev/null 2>/dev/null
T03_INIT_RC=$?
T03_MRS_RC=99
if [ "$T03_INIT_RC" -eq 0 ]; then
  manifest_record_strict "$T03_FILE" "1" "cache dir" >/dev/null 2>/dev/null
  T03_MRS_RC=$?
fi
manifest_close >/dev/null 2>/dev/null

[ "$T03_INIT_RC" -eq 0 ] \
  && _pass "T03: manifest_init_strict succeeded (pre-condition)" \
  || _fail "T03" "manifest_init_strict failed — test invalid (rc=$T03_INIT_RC)"
[ "$T03_MRS_RC" -eq 0 ] \
  && _pass "T03: manifest_record_strict returns 0 on success" \
  || _fail "T03" "expected 0 from manifest_record_strict, got $T03_MRS_RC"
[ "$T03_MRS_RC" -ne 98 ] \
  && _pass "T03: execution NOT aborted (no exit 98)" \
  || _fail "T03" "exit 98 fired on a successful manifest_record"
/bin/echo "  [proof — success path: init_rc=$T03_INIT_RC record_rc=$T03_MRS_RC (0=continued)]"

# ─────────────────────────────────────────────────────────────────────────────
# T04: tier1_sweep loop pattern — failure mid-loop blocks rm sentinel
# Simulates tier1_sweep.sh sections 2/4/5: iterate entries from temp file,
# call manifest_record_strict per entry, rm -rf follows the loop.
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: tier1_sweep loop pattern — mid-loop failure blocks rm"
_setup_test "t04"

T04_DIR="$TEST_ROOT/t04/Caches"
T04_A="$T04_DIR/com.app.Alpha"
T04_B="$T04_DIR/com.app.Beta"
T04_C="$T04_DIR/com.app.Gamma"
/bin/mkdir -p "$T04_A" "$T04_B" "$T04_C"

_T04_LIST=$(mktemp)
/bin/echo "$T04_A" > "$_T04_LIST"
/bin/echo "$T04_B" >> "$_T04_LIST"
/bin/echo "$T04_C" >> "$_T04_LIST"

_T04_OUT=$(mktemp)
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "strict_t04" >/dev/null 2>/dev/null

  _ENTRY_COUNT=0
  while IFS= read -r entry; do
    _ENTRY_COUNT=$((_ENTRY_COUNT + 1))
    if [ "$_ENTRY_COUNT" -eq 2 ]; then
      MANIFEST_PATH=""  # force failure on second entry
    fi
    manifest_record_strict "$entry" "1" "User cache (regenerable)" >/dev/null 2>/dev/null
  done < "$_T04_LIST"

  # rm sentinel — must NOT execute if loop aborted at entry 2
  /bin/echo "RM_EXECUTED"
) >"$_T04_OUT" 2>/dev/null
T04_RC=$?
T04_OUT=$(cat "$_T04_OUT")
rm -f "$_T04_OUT" "$_T04_LIST"

[ "$T04_RC" -eq 98 ] \
  && _pass "T04: exit 98 on mid-loop manifest_record failure" \
  || _fail "T04" "expected 98, got $T04_RC"
[ "$T04_OUT" != "RM_EXECUTED" ] \
  && _pass "T04: rm sentinel NOT executed (blocked)" \
  || _fail "T04" "rm sentinel was executed — loop did not abort"
[ -d "$T04_A" ] \
  && _pass "T04: Alpha still present (rm was blocked before it ran)" \
  || _fail "T04" "Alpha was deleted — rm ran before exit 98"
/bin/echo "  [proof — loop block: rc=$T04_RC rm_sentinel='$T04_OUT' alpha_exists=$([ -d "$T04_A" ] && echo true || echo false)]"

# ─────────────────────────────────────────────────────────────────────────────
# T05: thin_snapshots loop pattern — snap-loop failure blocks tmutil sentinel
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: thin_snapshots loop pattern — snap-loop failure blocks tmutil"
_setup_test "t05"

_T05_OUT=$(mktemp)
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "strict_t05" >/dev/null 2>/dev/null

  # Force failure before the loop starts
  MANIFEST_PATH=""

  BEFORE_SNAPS="com.apple.TimeMachine.2026-05-01-060000
com.apple.TimeMachine.2026-05-01-120000
com.apple.TimeMachine.2026-05-01-180000"

  while IFS= read -r snap; do
    [ -n "$snap" ] && manifest_record_strict "snapshot: $snap" "1" "TM local snapshot — thinned by tmutil" >/dev/null 2>/dev/null
  done <<< "$BEFORE_SNAPS"

  # tmutil sentinel — must NOT be reached
  /bin/echo "TMUTIL_EXECUTED"
) >"$_T05_OUT" 2>/dev/null
T05_RC=$?
T05_OUT=$(cat "$_T05_OUT")
rm -f "$_T05_OUT"

[ "$T05_RC" -eq 98 ] \
  && _pass "T05: exit 98 blocks tmutil (thin_snapshots pattern)" \
  || _fail "T05" "expected 98, got $T05_RC"
[ "$T05_OUT" != "TMUTIL_EXECUTED" ] \
  && _pass "T05: tmutil sentinel NOT executed" \
  || _fail "T05" "tmutil sentinel was executed — snap-loop did not abort"
/bin/echo "  [proof — snap-loop block: rc=$T05_RC tmutil_sentinel='$T05_OUT']"

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
