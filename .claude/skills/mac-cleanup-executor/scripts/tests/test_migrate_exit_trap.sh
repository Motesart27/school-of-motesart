#!/bin/bash
# mac-cleanup-executor :: tests/test_migrate_exit_trap.sh  v1.0.0
# Tests for the EXIT trap in migrate_audio.sh v1.3 (CRITICAL #2).
# Proves: rsync/rm/ln failure always closes gate + releases lock.
# No real migration executed — all tests use synthetic data in temp dirs.
#
# Design notes:
#   - Uses ( ) subshells so exit 98/99 / set -eu do not kill the test runner.
#   - _setup_test sets _MW_JDIR per test; subshells inherit it.
#   - Trap pattern reproduced verbatim from migrate_audio.sh v1.3.
# Run from any directory: bash tests/test_migrate_exit_trap.sh

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
TEST_ROOT=$(mktemp -d /tmp/migrate_exit_trap_test.XXXXXX)
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
  _MW_JDIR="$TEST_ROOT/$tname/journal"
  MANIFEST_DIR="$TEST_ROOT/$tname/manifests"
  /bin/mkdir -p "$MANIFEST_DIR"
}

# _assert_gate_closed <tname> <desc>
# Checks: no stale gate.lock AND UNGATED event written to journal.
_assert_gate_closed() {
  local tname="$1" desc="$2"
  local jdir="$TEST_ROOT/$tname/journal"
  [ ! -f "$jdir/gate.lock" ] \
    && _pass "$desc: no stale gate.lock" \
    || _fail "$desc" "stale gate.lock at $jdir/gate.lock"
  grep -rl 'UNGATED' "$jdir/" >/dev/null 2>&1 \
    && _pass "$desc: UNGATED event in journal" \
    || _fail "$desc" "no UNGATED event in $jdir"
}

/bin/echo "══ test_migrate_exit_trap.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: rsync failure (set -eu) → EXIT trap fires → gate closed, no stale lock
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: rsync failure closes gate"
_setup_test "t01"

(
  set -eu
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "rsync_fail_t01" >/dev/null 2>&1

  _MIGRATE_STATUS="aborted"
  _migrate_exit_trap() {
    if [ -n "${GATE_ID:-}" ]; then
      manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
    fi
  }
  trap _migrate_exit_trap EXIT

  # Simulate rsync failure — set -eu exits, EXIT trap fires
  false
) >/dev/null 2>/dev/null
T01_RC=$?

[ "$T01_RC" -ne 0 ] \
  && _pass "T01: non-zero exit code (rc=$T01_RC)" \
  || _fail "T01" "expected non-zero, got 0"
_assert_gate_closed "t01" "T01"
/bin/echo "  [proof — rsync fail: rc=$T01_RC lock=$([ -f "$TEST_ROOT/t01/journal/gate.lock" ] && /bin/echo PRESENT || /bin/echo ABSENT)]"

# ─────────────────────────────────────────────────────────────────────────────
# T02: rm failure after _MIGRATE_STATUS="failed" → gate closed as failed
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: rm failure closes gate (status=failed)"
_setup_test "t02"

(
  set -eu
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "rm_fail_t02" >/dev/null 2>&1

  _MIGRATE_STATUS="aborted"
  _migrate_exit_trap() {
    if [ -n "${GATE_ID:-}" ]; then
      manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
    fi
  }
  trap _migrate_exit_trap EXIT

  # Destructive phase begins — mirrors migrate_audio.sh
  _MIGRATE_STATUS="failed"

  # Simulate rm failure — set -eu exits
  rm "$TEST_ROOT/nonexistent_path_rm_$$" 2>/dev/null
) >/dev/null 2>/dev/null
T02_RC=$?

[ "$T02_RC" -ne 0 ] \
  && _pass "T02: non-zero exit code (rc=$T02_RC)" \
  || _fail "T02" "expected non-zero, got 0"
_assert_gate_closed "t02" "T02"
/bin/echo "  [proof — rm fail: rc=$T02_RC lock=$([ -f "$TEST_ROOT/t02/journal/gate.lock" ] && /bin/echo PRESENT || /bin/echo ABSENT)]"

# ─────────────────────────────────────────────────────────────────────────────
# T03: ln -s failure (already in failed phase) → gate closed
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: ln -s failure closes gate"
_setup_test "t03"

(
  set -eu
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "ln_fail_t03" >/dev/null 2>&1

  _MIGRATE_STATUS="aborted"
  _migrate_exit_trap() {
    if [ -n "${GATE_ID:-}" ]; then
      manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
    fi
  }
  trap _migrate_exit_trap EXIT

  _MIGRATE_STATUS="failed"

  # Simulate ln failure: target parent does not exist — set -eu exits
  ln -s /nonexistent/source "$TEST_ROOT/nonexistent_dir_$$/link"
) >/dev/null 2>/dev/null
T03_RC=$?

[ "$T03_RC" -ne 0 ] \
  && _pass "T03: non-zero exit code (rc=$T03_RC)" \
  || _fail "T03" "expected non-zero, got 0"
_assert_gate_closed "t03" "T03"
/bin/echo "  [proof — ln fail: rc=$T03_RC lock=$([ -f "$TEST_ROOT/t03/journal/gate.lock" ] && /bin/echo PRESENT || /bin/echo ABSENT)]"

# ─────────────────────────────────────────────────────────────────────────────
# T04: no stale gate.lock — re-entry after failure succeeds (lock was released)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: re-entry after failure succeeds (no stale lock)"
_setup_test "t04"

# First run — fail without explicit manifest_close
(
  set -eu
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "fail_t04" >/dev/null 2>&1

  _MIGRATE_STATUS="aborted"
  _migrate_exit_trap() {
    if [ -n "${GATE_ID:-}" ]; then
      manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
    fi
  }
  trap _migrate_exit_trap EXIT

  false  # EXIT trap fires → lock released
) >/dev/null 2>/dev/null

T04_LOCK="$TEST_ROOT/t04/journal/gate.lock"
[ ! -f "$T04_LOCK" ] \
  && _pass "T04: gate.lock absent after failure" \
  || _fail "T04" "stale gate.lock after failure"

# Second run — open and close normally in same journal dir
_T04_OUT=$(mktemp)
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "reopen_t04" >/dev/null 2>&1
  manifest_close "completed" >/dev/null 2>&1
  /bin/echo "REOPEN_OK"
) >"$_T04_OUT" 2>/dev/null
T04_REOPEN_RC=$?
T04_REOPEN_OUT=$(cat "$_T04_OUT"); rm -f "$_T04_OUT"

[ "$T04_REOPEN_RC" -eq 0 ] \
  && _pass "T04: re-entry rc=0 (no lock conflict)" \
  || _fail "T04" "re-entry failed (rc=$T04_REOPEN_RC) — stale lock?"
[ "$T04_REOPEN_OUT" = "REOPEN_OK" ] \
  && _pass "T04: gate re-opened and closed normally" \
  || _fail "T04" "re-open did not reach close marker"
/bin/echo "  [proof — re-entry: first_lock=$([ -f "$T04_LOCK" ] && /bin/echo PRESENT || /bin/echo ABSENT) reopen_rc=$T04_REOPEN_RC reopen_out='$T04_REOPEN_OUT']"

# ─────────────────────────────────────────────────────────────────────────────
# T05: successful path — explicit close fires, EXIT trap is no-op (GATE_ID unset)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: successful path closes as completed"
_setup_test "t05"

_T05_OUT=$(mktemp)
(
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "success_t05" >/dev/null 2>&1

  _MIGRATE_STATUS="aborted"
  _migrate_exit_trap() {
    if [ -n "${GATE_ID:-}" ]; then
      manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
    fi
  }
  trap _migrate_exit_trap EXIT

  # Simulate successful completion path (mirrors migrate_audio.sh)
  _MIGRATE_STATUS="completed"
  manifest_close "completed" >/dev/null 2>&1
  /bin/echo "COMPLETED_OK"
) >"$_T05_OUT" 2>/dev/null
T05_RC=$?
T05_OUT=$(cat "$_T05_OUT"); rm -f "$_T05_OUT"

[ "$T05_RC" -eq 0 ] \
  && _pass "T05: exit 0 on successful path" \
  || _fail "T05" "expected 0, got $T05_RC"
[ "$T05_OUT" = "COMPLETED_OK" ] \
  && _pass "T05: execution reached completion marker" \
  || _fail "T05" "did not reach COMPLETED_OK"
_assert_gate_closed "t05" "T05"
/bin/echo "  [proof — success path: rc=$T05_RC marker='$T05_OUT' lock=$([ -f "$TEST_ROOT/t05/journal/gate.lock" ] && /bin/echo PRESENT || /bin/echo ABSENT)]"

# ─────────────────────────────────────────────────────────────────────────────
# T06: exit code preservation — trap does not clobber the failing command's rc
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: exit code preserved through EXIT trap"
_setup_test "t06"

(
  set -eu
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  manifest_init_strict "exit_code_t06" >/dev/null 2>&1

  _MIGRATE_STATUS="aborted"
  _migrate_exit_trap() {
    if [ -n "${GATE_ID:-}" ]; then
      manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
    fi
  }
  trap _migrate_exit_trap EXIT

  # Exit with a specific code to verify preservation
  exit 23
) >/dev/null 2>/dev/null
T06_RC=$?

[ "$T06_RC" -eq 23 ] \
  && _pass "T06: exit code 23 preserved (trap did not clobber it)" \
  || _fail "T06" "expected 23, got $T06_RC"
_assert_gate_closed "t06" "T06"
/bin/echo "  [proof — exit code: rc=$T06_RC lock=$([ -f "$TEST_ROOT/t06/journal/gate.lock" ] && /bin/echo PRESENT || /bin/echo ABSENT)]"

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
