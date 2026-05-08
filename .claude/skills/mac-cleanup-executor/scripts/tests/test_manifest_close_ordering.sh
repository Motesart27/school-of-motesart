#!/bin/bash
# mac-cleanup-executor :: tests/test_manifest_close_ordering.sh  v1.0.0
# Verifies manifest_close footer ordering: gate_close runs BEFORE footer write,
# so the footer accurately reflects whether the UNGATED event was recorded.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0; FAIL=0
TEST_ROOT=$(mktemp -d /tmp/mco_test.XXXXXX)
trap 'rm -rf "$TEST_ROOT"' EXIT

_pass() { PASS=$((PASS+1)); /bin/echo "  PASS  $1"; }
_fail() { FAIL=$((FAIL+1)); /bin/echo "  FAIL  $1 — $2"; }

/bin/echo "══ test_manifest_close_ordering.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: successful close — footer status = "completed", UNGATED in journal
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: successful close writes completed status and UNGATED event"
T01_DIR="$TEST_ROOT/t01"
T01_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T01_DIR/manifests"
  _MW_JDIR="$T01_DIR/journal"
  manifest_init_strict "success_test" >/dev/null 2>/dev/null
  SAVED_JP="$JOURNAL_PATH"
  SAVED_MP="$MANIFEST_PATH"
  manifest_close "completed" >/dev/null 2>/dev/null
  mc_rc=$?
  echo "mc_rc=$mc_rc"
  echo "saved_jp=$SAVED_JP"
  echo "saved_mp=$SAVED_MP"
) )
T01_RC=$(echo "$T01_RESULT"    | grep "^mc_rc="    | sed 's/mc_rc=//')
T01_JP=$(echo "$T01_RESULT"    | grep "^saved_jp=" | sed 's/saved_jp=//')
T01_MP=$(echo "$T01_RESULT"    | grep "^saved_mp=" | sed 's/saved_mp=//')

[ "${T01_RC:-1}" -eq 0 ] && _pass "T01: manifest_close returns 0 on success" \
  || _fail "T01" "manifest_close returned non-zero (rc=$T01_RC)"
grep -q '"status": "completed"' "${T01_MP:-/nonexistent}" 2>/dev/null \
  && _pass "T01: footer status = completed" \
  || _fail "T01" "footer does not contain status=completed in $(cat ${T01_MP:-/nonexistent} 2>/dev/null || echo '<missing>')"
grep -q '"asserted_state":"UNGATED"' "${T01_JP:-/nonexistent}" 2>/dev/null \
  && _pass "T01: UNGATED event in journal" \
  || _fail "T01" "UNGATED event missing from journal"
grep -qE '"completed_at": "20[0-9]{2}-' "${T01_MP:-/nonexistent}" 2>/dev/null \
  && _pass "T01: completed_at is non-null" \
  || _fail "T01" "completed_at is null or missing"

# ─────────────────────────────────────────────────────────────────────────────
# T02: failed gate_close — footer status = "completed_with_gate_close_failure"
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: failed gate_close writes completed_with_gate_close_failure in footer"
T02_DIR="$TEST_ROOT/t02"
T02_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T02_DIR/manifests"
  _MW_JDIR="$T02_DIR/journal"
  manifest_init_strict "fail_test" >/dev/null 2>/dev/null
  SAVED_MP="$MANIFEST_PATH"
  # Remove journal to force gate_close failure
  rm -f "$JOURNAL_PATH"
  manifest_close "completed" >/dev/null 2>/dev/null
  echo "saved_mp=$SAVED_MP"
) )
T02_MP=$(echo "$T02_RESULT" | grep "^saved_mp=" | sed 's/saved_mp=//')

grep -q '"status": "completed_with_gate_close_failure"' "${T02_MP:-/nonexistent}" 2>/dev/null \
  && _pass "T02: footer status = completed_with_gate_close_failure on gate_close failure" \
  || _fail "T02" "footer should not claim completed; got: $(grep '\"status\"' ${T02_MP:-/nonexistent} 2>/dev/null || echo '<no status line>')"
# Must NOT claim clean completed
grep -q '"status": "completed"$' "${T02_MP:-/nonexistent}" 2>/dev/null \
  && _fail "T02" "footer incorrectly claims clean completed status" \
  || _pass "T02: footer does not falsely claim clean completed"

# ─────────────────────────────────────────────────────────────────────────────
# T03: failed gate_close — manifest_close returns non-zero
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: failed gate_close — manifest_close returns non-zero"
T03_DIR="$TEST_ROOT/t03"
T03_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T03_DIR/manifests"
  _MW_JDIR="$T03_DIR/journal"
  manifest_init_strict "rc_test" >/dev/null 2>/dev/null
  rm -f "$JOURNAL_PATH"
  manifest_close "completed" >/dev/null 2>/dev/null
  echo "mc_rc=$?"
) )
T03_RC=$(echo "$T03_RESULT" | grep "^mc_rc=" | sed 's/mc_rc=//')
[ "${T03_RC:-0}" -ne 0 ] \
  && _pass "T03: manifest_close returns non-zero on gate_close failure" \
  || _fail "T03" "expected non-zero, got rc=$T03_RC"

# ─────────────────────────────────────────────────────────────────────────────
# T04: failed gate_close — WARN emitted to stderr
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: failed gate_close — WARN emitted to stderr"
T04_DIR="$TEST_ROOT/t04"
T04_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T04_DIR/manifests"
  _MW_JDIR="$T04_DIR/journal"
  manifest_init_strict "warn_test" >/dev/null 2>/dev/null
  rm -f "$JOURNAL_PATH"
  STDERR_OUT=$(manifest_close "completed" 2>&1 >/dev/null)
  echo "stderr=$STDERR_OUT"
) )
T04_STDERR=$(echo "$T04_RESULT" | grep "^stderr=" | sed 's/stderr=//')
echo "$T04_STDERR" | grep -qi "WARN" \
  && _pass "T04: WARN emitted to stderr on gate_close failure" \
  || _fail "T04" "no WARN in stderr: $T04_STDERR"

# ─────────────────────────────────────────────────────────────────────────────
# T05: failed gate_close — GATE_ID and GATE_LABEL are still unset
# gate_close always cleans up gate vars even when UNGATED write fails
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: gate env vars cleaned up even when gate_close fails"
T05_DIR="$TEST_ROOT/t05"
T05_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T05_DIR/manifests"
  _MW_JDIR="$T05_DIR/journal"
  manifest_init_strict "env_clean_test" >/dev/null 2>/dev/null
  rm -f "$JOURNAL_PATH"
  manifest_close "completed" >/dev/null 2>/dev/null
  echo "gate_id=${GATE_ID:-<unset>}"
  echo "gate_label=${GATE_LABEL:-<unset>}"
  echo "manifest_path=${MANIFEST_PATH:-<unset>}"
) )
T05_GID=$(echo "$T05_RESULT"    | grep "^gate_id="      | sed 's/gate_id=//')
T05_GLABEL=$(echo "$T05_RESULT" | grep "^gate_label="   | sed 's/gate_label=//')
[ "$T05_GID"    = "<unset>" ] && _pass "T05: GATE_ID unset after failed close"    || _fail "T05" "GATE_ID still set: $T05_GID"
[ "$T05_GLABEL" = "<unset>" ] && _pass "T05: GATE_LABEL unset after failed close" || _fail "T05" "GATE_LABEL still set: $T05_GLABEL"

# ─────────────────────────────────────────────────────────────────────────────
# T06: failed gate_close — manifest file still exists and is valid JSON
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T06: manifest file preserved and valid after failed gate_close"
T06_DIR="$TEST_ROOT/t06"
T06_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T06_DIR/manifests"
  _MW_JDIR="$T06_DIR/journal"
  manifest_init_strict "json_valid_test" >/dev/null 2>/dev/null
  SAVED_MP="$MANIFEST_PATH"
  rm -f "$JOURNAL_PATH"
  manifest_close "completed" >/dev/null 2>/dev/null
  echo "saved_mp=$SAVED_MP"
) )
T06_MP=$(echo "$T06_RESULT" | grep "^saved_mp=" | sed 's/saved_mp=//')
[ -f "${T06_MP:-/nonexistent}" ] \
  && _pass "T06: manifest file exists after failed close" \
  || _fail "T06" "manifest file missing after failed close"
python3 -c "import json,sys; json.load(open(sys.argv[1]))" "${T06_MP:-/nonexistent}" 2>/dev/null \
  && _pass "T06: manifest file is valid JSON after failed close" \
  || _fail "T06" "manifest file is invalid JSON: $(cat ${T06_MP:-/nonexistent} 2>/dev/null | head -5)"

# ─────────────────────────────────────────────────────────────────────────────
# T07: ordering proof — footer written AFTER gate_close
# Inject a gate_close that leaves a marker; verify marker appears BEFORE footer
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T07: ordering proof — gate_close runs before footer write"
T07_DIR="$TEST_ROOT/t07"
T07_RESULT=$( (
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM 2>/dev/null || true
  source "$SCRIPTS/manifest_writer.sh" 2>/dev/null
  MANIFEST_DIR="$T07_DIR/manifests"
  _MW_JDIR="$T07_DIR/journal"
  manifest_init_strict "order_test" >/dev/null 2>/dev/null
  SAVED_MP="$MANIFEST_PATH"
  # Override gate_close to append a marker line to the manifest
  gate_close() {
    /bin/echo "  ,\"gate_close_marker\": true" >> "$SAVED_MP"
    return 0
  }
  manifest_close "completed" >/dev/null 2>/dev/null
  echo "saved_mp=$SAVED_MP"
) )
T07_MP=$(echo "$T07_RESULT" | grep "^saved_mp=" | sed 's/saved_mp=//')
# If gate_close ran first, the marker line appears before the "status" line
if [ -f "${T07_MP:-/nonexistent}" ]; then
  MARKER_LINE=$(grep -n "gate_close_marker" "$T07_MP" 2>/dev/null | head -1 | cut -d: -f1)
  # Use the LAST "status" line — the footer; the init header also has "status": "in_progress"
  STATUS_LINE=$(grep -n '"status"'           "$T07_MP" 2>/dev/null | tail -1 | cut -d: -f1)
  if [ -n "$MARKER_LINE" ] && [ -n "$STATUS_LINE" ] && [ "$MARKER_LINE" -lt "$STATUS_LINE" ]; then
    _pass "T07: gate_close marker appears before footer status line (line $MARKER_LINE < $STATUS_LINE)"
  else
    _fail "T07" "ordering wrong: gate_close_marker line=$MARKER_LINE status line=$STATUS_LINE"
  fi
else
  _fail "T07" "manifest file missing: $T07_MP"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
/bin/echo ""
/bin/echo "══ results ══"
/bin/echo "  passed: $PASS / $TOTAL"
/bin/echo "  failed: $FAIL / $TOTAL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
