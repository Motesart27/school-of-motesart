#!/bin/bash
# mac-cleanup-executor :: tests/test_tier1_physical.sh  v1.0.0
# Targeted tests for PHYSICAL assertions added to tier1_sweep.sh v1.2.
# Covers: temp-file replay pattern (ABSENT deleted), partial rm (PRESENT survivor),
# Logs container PRESENT, mixed snapshot results (BEFORE_SNAPS/AFTER_SNAPS pattern).
# Run from any directory: bash tests/test_tier1_physical.sh

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
TEST_ROOT=$(mktemp -d /tmp/tier1_phys_test.XXXXXX)
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

# Helper: extract a field from the first matching journal line for a given entity
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

# Helper: extract field from last matching journal line for a given entity
_jfield_last() {
  local jpath="$1" entity="$2" field="$3"
  grep "\"entity_id\":\"$entity\"" "$jpath" 2>/dev/null | tail -1 | \
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

/bin/echo "══ test_tier1_physical.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: temp-file replay pattern — all 3 entries deleted → 3 ABSENT
# Simulates tier1_sweep.sh Caches/DerivedData/DeviceSupport sections:
#   find ... > tmpfile → manifest_record loop → rm -rf → manifest_assert_physical replay
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: temp-file replay — all 3 entries deleted → 3 ABSENT in journal"
_setup_test "t01"
manifest_init_strict "tier1_t01" >/dev/null 2>/dev/null

T01_CACHE_DIR="$TEST_ROOT/t01/Caches"
/bin/mkdir -p "$T01_CACHE_DIR/com.example.AppA"
/bin/mkdir -p "$T01_CACHE_DIR/com.example.AppB"
/bin/mkdir -p "$T01_CACHE_DIR/com.example.AppC"
/bin/echo "cached data" > "$T01_CACHE_DIR/com.example.AppA/data.bin"
/bin/echo "cached data" > "$T01_CACHE_DIR/com.example.AppB/data.bin"
/bin/echo "cached data" > "$T01_CACHE_DIR/com.example.AppC/data.bin"

# Simulate the exact temp-file pattern from tier1_sweep.sh section 2 (Caches)
manifest_guard >/dev/null 2>/dev/null
_t1_caches=$(mktemp)
find "$T01_CACHE_DIR" -mindepth 1 -maxdepth 1 2>/dev/null > "$_t1_caches"
while IFS= read -r entry; do
  manifest_record "$entry" "1" "User cache (regenerable)" >/dev/null 2>/dev/null
done < "$_t1_caches"

# Delete all entries
find "$T01_CACHE_DIR" -mindepth 1 -maxdepth 2 -exec rm -rf {} + 2>/dev/null

# Replay with PHYSICAL assertions
while IFS= read -r entry; do
  manifest_assert_physical "$entry" >/dev/null 2>/dev/null || true
done < "$_t1_caches"
rm -f "$_t1_caches"

# Collect results
T01_TOTAL=$(grep '"entity_type":"PATH"' "$JOURNAL_PATH" 2>/dev/null | \
  grep '"source":"PHYSICAL"' | wc -l | tr -d ' ')
T01_ABSENT=$(grep '"entity_type":"PATH"' "$JOURNAL_PATH" 2>/dev/null | \
  grep '"source":"PHYSICAL"' | \
  /usr/bin/python3 -c "
import sys, json
count = 0
for line in sys.stdin:
    line = line.strip()
    if line:
        ev = json.loads(line)
        if ev.get('asserted_state') == 'ABSENT':
            count += 1
print(count)
" 2>/dev/null)

[ "$T01_TOTAL" = "3" ] \
  && _pass "T01: 3 PHYSICAL PATH assertions written" \
  || _fail "T01" "expected 3 PHYSICAL events, got $T01_TOTAL"
[ "$T01_ABSENT" = "3" ] \
  && _pass "T01: all 3 entries ABSENT after rm" \
  || _fail "T01" "expected 3 ABSENT, got $T01_ABSENT"
/bin/echo "  [proof — temp-file replay all deleted: total=$T01_TOTAL absent=$T01_ABSENT]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T02: partial rm behavior — 2 of 3 entries deleted, 1 survives → 2 ABSENT + 1 PRESENT
# Verifies PHYSICAL assertions record actual disk truth regardless of rm outcome
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: partial rm — 2 deleted, 1 survives → 2 ABSENT + 1 PRESENT"
_setup_test "t02"
manifest_init_strict "tier1_t02" >/dev/null 2>/dev/null

T02_DIR="$TEST_ROOT/t02/Caches"
T02_A="$T02_DIR/com.example.Alpha"
T02_B="$T02_DIR/com.example.Beta"
T02_C="$T02_DIR/com.example.Gamma"
/bin/mkdir -p "$T02_A" "$T02_B" "$T02_C"
/bin/echo "data" > "$T02_A/f"
/bin/echo "data" > "$T02_B/f"
/bin/echo "data" > "$T02_C/f"

manifest_guard >/dev/null 2>/dev/null
_t2_caches=$(mktemp)
find "$T02_DIR" -mindepth 1 -maxdepth 1 2>/dev/null | sort > "$_t2_caches"
while IFS= read -r entry; do
  manifest_record "$entry" "1" "User cache (regenerable)" >/dev/null 2>/dev/null
done < "$_t2_caches"

# Delete only 2 of 3 (simulate partial rm failure / lock)
rm -rf "$T02_A" "$T02_B"
# T02_C intentionally left on disk

# Replay with PHYSICAL assertions — reflects actual disk truth
while IFS= read -r entry; do
  manifest_assert_physical "$entry" >/dev/null 2>/dev/null || true
done < "$_t2_caches"
rm -f "$_t2_caches"

T02_ABSENT_A=$(_jfield_last "$JOURNAL_PATH" "$T02_A" "asserted_state")
T02_ABSENT_B=$(_jfield_last "$JOURNAL_PATH" "$T02_B" "asserted_state")
T02_PRESENT_C=$(_jfield_last "$JOURNAL_PATH" "$T02_C" "asserted_state")
T02_SRC_C=$(_jfield_last "$JOURNAL_PATH" "$T02_C" "source")

[ "$T02_ABSENT_A" = "ABSENT" ] \
  && _pass "T02: Alpha (deleted) → ABSENT" \
  || _fail "T02" "Alpha: expected ABSENT, got '$T02_ABSENT_A'"
[ "$T02_ABSENT_B" = "ABSENT" ] \
  && _pass "T02: Beta (deleted) → ABSENT" \
  || _fail "T02" "Beta: expected ABSENT, got '$T02_ABSENT_B'"
[ "$T02_PRESENT_C" = "PRESENT" ] \
  && _pass "T02: Gamma (survived) → PRESENT" \
  || _fail "T02" "Gamma: expected PRESENT, got '$T02_PRESENT_C'"
[ "$T02_SRC_C" = "PHYSICAL" ] \
  && _pass "T02: survivor source=PHYSICAL (highest precedence)" \
  || _fail "T02" "survivor: expected PHYSICAL, got '$T02_SRC_C'"
/bin/echo "  [proof — partial rm: Alpha=$T02_ABSENT_A Beta=$T02_ABSENT_B Gamma=$T02_PRESENT_C source=$T02_SRC_C]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T03: Logs container PRESENT — files deleted inside container, dir itself stays
# Simulates tier1_sweep.sh section 3 (Logs):
#   manifest_record "container (file contents)"
#   find ... -type f -delete
#   manifest_assert_physical "$HOME/Library/Logs"  ← asserts PRESENT (dir lives)
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: Logs container — files deleted, container dir stays PRESENT"
_setup_test "t03"
manifest_init_strict "tier1_t03" >/dev/null 2>/dev/null

T03_LOGS="$TEST_ROOT/t03/Logs"
/bin/mkdir -p "$T03_LOGS/AppLogs" "$T03_LOGS/SystemLogs"
/bin/echo "log entry" > "$T03_LOGS/AppLogs/app.log"
/bin/echo "log entry" > "$T03_LOGS/SystemLogs/sys.log"
/bin/echo "log entry" > "$T03_LOGS/install.log"

manifest_guard >/dev/null 2>/dev/null
manifest_record "$T03_LOGS (file contents)" "1" "User log files (regenerable)" >/dev/null 2>/dev/null

# Delete files only (tier1_sweep.sh uses -type f -delete, not rm -rf on container)
find "$T03_LOGS" -type f -delete 2>/dev/null

# Assert container directory — must be PRESENT (dir still exists, only files gone)
manifest_assert_physical "$T03_LOGS" >/dev/null 2>/dev/null || true

T03_STATE=$(_jfield "$JOURNAL_PATH" "$T03_LOGS" "asserted_state")
T03_SRC=$(_jfield "$JOURNAL_PATH" "$T03_LOGS" "source")

# Verify files are actually gone but dir exists
T03_FILE_COUNT=$(find "$T03_LOGS" -type f 2>/dev/null | wc -l | tr -d ' ')

[ "$T03_STATE" = "PRESENT" ] \
  && _pass "T03: Logs container dir stays PRESENT after file deletion" \
  || _fail "T03" "expected PRESENT for container dir, got '$T03_STATE'"
[ "$T03_SRC" = "PHYSICAL" ] \
  && _pass "T03: source=PHYSICAL for container assertion" \
  || _fail "T03" "expected PHYSICAL, got '$T03_SRC'"
[ "$T03_FILE_COUNT" = "0" ] \
  && _pass "T03: files deleted (count=0), only container dir remains" \
  || _fail "T03" "expected 0 files, got $T03_FILE_COUNT"
/bin/echo "  [proof — Logs container PRESENT: state=$T03_STATE source=$T03_SRC files_remaining=$T03_FILE_COUNT dir=$T03_LOGS]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T04: mixed snapshot results — 4 pre-thin snaps: 2 ABSENT, 2 PRESENT
# Simulates tier1_sweep.sh section 10 (TM Snapshots) BEFORE_SNAPS/AFTER_SNAPS pattern
# Uses gate_assert directly with entity_type=SNAPSHOT — identical to production loop
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: mixed snapshot results — 4 pre-thin, 2 ABSENT, 2 PRESENT"
_setup_test "t04"
manifest_init_strict "tier1_t04" >/dev/null 2>/dev/null

# Mock BEFORE_SNAPS (4 snapshots before thinning)
BEFORE_SNAPS="com.apple.TimeMachine.2026-03-10-080000
com.apple.TimeMachine.2026-03-10-120000
com.apple.TimeMachine.2026-03-10-160000
com.apple.TimeMachine.2026-03-10-200000"

# Mock AFTER_SNAPS (only 2 survived — first two thinned)
AFTER_SNAPS="com.apple.TimeMachine.2026-03-10-160000
com.apple.TimeMachine.2026-03-10-200000"

# Simulate the exact loop from tier1_sweep.sh section 10
_esc_mp=$("$_MW_PRINTF" '%s' "${MANIFEST_PATH:-}" | "$_MW_SED" 's/\\/\\\\/g; s/"/\\"/g')
while IFS= read -r snap; do
  [ -z "$snap" ] && continue
  if echo "$AFTER_SNAPS" | grep -qF "$snap" 2>/dev/null; then
    _snap_state="PRESENT"
    _snap_check="true"
  else
    _snap_state="ABSENT"
    _snap_check="false"
  fi
  _snap_evidence="{\"manifest_path\":\"$_esc_mp\",\"physical_check\":$_snap_check,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]}"
  gate_assert "snapshot:$snap" "SNAPSHOT" "$_snap_state" "PHYSICAL" "$_snap_evidence" >/dev/null 2>/dev/null || true
done <<< "$BEFORE_SNAPS"

T04_TOTAL=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | wc -l | tr -d ' ')
T04_ABSENT=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | \
  /usr/bin/python3 -c "
import sys, json
count = 0
for line in sys.stdin:
    line = line.strip()
    if line:
        ev = json.loads(line)
        if ev.get('asserted_state') == 'ABSENT':
            count += 1
print(count)
" 2>/dev/null)
T04_PRESENT=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | \
  /usr/bin/python3 -c "
import sys, json
count = 0
for line in sys.stdin:
    line = line.strip()
    if line:
        ev = json.loads(line)
        if ev.get('asserted_state') == 'PRESENT':
            count += 1
print(count)
" 2>/dev/null)
T04_PHYS=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | \
  /usr/bin/python3 -c "
import sys, json
count = 0
for line in sys.stdin:
    line = line.strip()
    if line:
        ev = json.loads(line)
        if ev.get('source') == 'PHYSICAL':
            count += 1
print(count)
" 2>/dev/null)

# Per-snapshot checks
T04_S1=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-03-10-080000" "asserted_state")
T04_S2=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-03-10-120000" "asserted_state")
T04_S3=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-03-10-160000" "asserted_state")
T04_S4=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-03-10-200000" "asserted_state")

[ "$T04_TOTAL" = "4" ] \
  && _pass "T04: 4 SNAPSHOT events written (one per pre-thin snapshot)" \
  || _fail "T04" "expected 4 SNAPSHOT events, got $T04_TOTAL"
[ "$T04_ABSENT" = "2" ] \
  && _pass "T04: 2 ABSENT events (thinned snapshots)" \
  || _fail "T04" "expected 2 ABSENT, got $T04_ABSENT"
[ "$T04_PRESENT" = "2" ] \
  && _pass "T04: 2 PRESENT events (survived snapshots)" \
  || _fail "T04" "expected 2 PRESENT, got $T04_PRESENT"
[ "$T04_PHYS" = "4" ] \
  && _pass "T04: all 4 events have source=PHYSICAL" \
  || _fail "T04" "expected 4 PHYSICAL, got $T04_PHYS"
[ "$T04_S1" = "ABSENT" ] \
  && _pass "T04: snapshot 0800 → ABSENT (thinned)" \
  || _fail "T04" "0800: expected ABSENT, got '$T04_S1'"
[ "$T04_S2" = "ABSENT" ] \
  && _pass "T04: snapshot 1200 → ABSENT (thinned)" \
  || _fail "T04" "1200: expected ABSENT, got '$T04_S2'"
[ "$T04_S3" = "PRESENT" ] \
  && _pass "T04: snapshot 1600 → PRESENT (survived)" \
  || _fail "T04" "1600: expected PRESENT, got '$T04_S3'"
[ "$T04_S4" = "PRESENT" ] \
  && _pass "T04: snapshot 2000 → PRESENT (survived)" \
  || _fail "T04" "2000: expected PRESENT, got '$T04_S4'"
/bin/echo "  [proof — mixed snapshots: total=$T04_TOTAL absent=$T04_ABSENT present=$T04_PRESENT all_physical=$T04_PHYS]"
/bin/echo "  [proof — per-snap: 0800=$T04_S1 1200=$T04_S2 1600=$T04_S3 2000=$T04_S4]"
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
