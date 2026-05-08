#!/bin/bash
# mac-cleanup-executor :: tests/test_thin_physical.sh  v1.0.0
# Targeted tests for snapshot PHYSICAL assertions in thin_snapshots.sh v1.2.
# Uses gate_assert directly with entity_type=SNAPSHOT — no tmutil required.
# Covers: ABSENT thinned snapshot, PRESENT survived snapshot, partial-success mix,
# PHYSICAL priority over MANIFEST_GATE, evidence payload correctness.
# Run from any directory: bash tests/test_thin_physical.sh

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
TEST_ROOT=$(mktemp -d /tmp/thin_phys_test.XXXXXX)
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

# Helper: build thin_snapshots evidence JSON matching the production pattern
_snap_evidence() {
  local manifest_path="$1" physical_check="$2"
  local esc_mp
  esc_mp=$(/usr/bin/printf '%s' "$manifest_path" | /usr/bin/sed 's/\\/\\\\/g; s/"/\\"/g')
  /bin/echo "{\"manifest_path\":\"$esc_mp\",\"physical_check\":$physical_check,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]}"
}

/bin/echo "══ test_thin_physical.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: thinned snapshot → gate_assert SNAPSHOT/PHYSICAL/ABSENT
# Simulates: snapshot not found in AFTER_SNAPS → assert ABSENT
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: thinned snapshot → SNAPSHOT/PHYSICAL state=ABSENT"
_setup_test "t01"
manifest_init_strict "thin_t01" >/dev/null 2>/dev/null

T01_SNAP="com.apple.TimeMachine.2026-01-15-120000"
T01_EID="snapshot:$T01_SNAP"
T01_EV=$(_snap_evidence "$MANIFEST_PATH" "false")
gate_assert "$T01_EID" "SNAPSHOT" "ABSENT" "PHYSICAL" "$T01_EV" >/dev/null 2>/dev/null

T01_STATE=$(_jfield "$JOURNAL_PATH" "$T01_EID" "asserted_state")
T01_SRC=$(_jfield "$JOURNAL_PATH" "$T01_EID" "source")
T01_ETYPE=$(_jfield "$JOURNAL_PATH" "$T01_EID" "entity_type")
T01_PRI=$(_jfield "$JOURNAL_PATH" "$T01_EID" "source_priority")

[ "$T01_STATE" = "ABSENT" ] \
  && _pass "T01: state=ABSENT for thinned snapshot" \
  || _fail "T01" "expected ABSENT, got '$T01_STATE'"
[ "$T01_SRC" = "PHYSICAL" ] \
  && _pass "T01: source=PHYSICAL" \
  || _fail "T01" "expected PHYSICAL, got '$T01_SRC'"
[ "$T01_ETYPE" = "SNAPSHOT" ] \
  && _pass "T01: entity_type=SNAPSHOT" \
  || _fail "T01" "expected SNAPSHOT, got '$T01_ETYPE'"
[ "$T01_PRI" = "1" ] \
  && _pass "T01: source_priority=1 (highest)" \
  || _fail "T01" "expected priority 1, got '$T01_PRI'"
/bin/echo "  [proof — ABSENT thinned snapshot: state=$T01_STATE source=$T01_SRC entity_type=$T01_ETYPE priority=$T01_PRI]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T02: survived snapshot → gate_assert SNAPSHOT/PHYSICAL/PRESENT
# Simulates: snapshot found in AFTER_SNAPS → assert PRESENT
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: survived snapshot → SNAPSHOT/PHYSICAL state=PRESENT"
_setup_test "t02"
manifest_init_strict "thin_t02" >/dev/null 2>/dev/null

T02_SNAP="com.apple.TimeMachine.2026-01-16-060000"
T02_EID="snapshot:$T02_SNAP"
T02_EV=$(_snap_evidence "$MANIFEST_PATH" "true")
gate_assert "$T02_EID" "SNAPSHOT" "PRESENT" "PHYSICAL" "$T02_EV" >/dev/null 2>/dev/null

T02_STATE=$(_jfield "$JOURNAL_PATH" "$T02_EID" "asserted_state")
T02_SRC=$(_jfield "$JOURNAL_PATH" "$T02_EID" "source")
T02_ETYPE=$(_jfield "$JOURNAL_PATH" "$T02_EID" "entity_type")

[ "$T02_STATE" = "PRESENT" ] \
  && _pass "T02: state=PRESENT for survived snapshot" \
  || _fail "T02" "expected PRESENT, got '$T02_STATE'"
[ "$T02_SRC" = "PHYSICAL" ] \
  && _pass "T02: source=PHYSICAL for survived snapshot" \
  || _fail "T02" "expected PHYSICAL, got '$T02_SRC'"
[ "$T02_ETYPE" = "SNAPSHOT" ] \
  && _pass "T02: entity_type=SNAPSHOT preserved" \
  || _fail "T02" "expected SNAPSHOT, got '$T02_ETYPE'"
/bin/echo "  [proof — PRESENT survived snapshot: state=$T02_STATE source=$T02_SRC entity_type=$T02_ETYPE]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T03: partial success — 3 pre-thin snapshots, 1 removed, 2 survived
# Simulates natural tmutil behavior: some snapshots may persist
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03: partial success — 3 pre-thin snapshots, 1 thinned, 2 survived"
_setup_test "t03"
manifest_init_strict "thin_t03" >/dev/null 2>/dev/null

# Mock pre-thin list
BEFORE_SNAPS="com.apple.TimeMachine.2026-02-01-080000
com.apple.TimeMachine.2026-02-01-120000
com.apple.TimeMachine.2026-02-01-160000"

# Mock post-thin list: first snapshot removed, two survived
AFTER_SNAPS="com.apple.TimeMachine.2026-02-01-120000
com.apple.TimeMachine.2026-02-01-160000"

# Simulate the exact loop from thin_snapshots.sh v1.2
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

# Verify: 3 SNAPSHOT events total, correct per-snap states
T03_TOTAL=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | wc -l | tr -d ' ')
T03_ABSENT=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | \
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
T03_PRESENT=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | \
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
T03_PHYS=$(grep '"entity_type":"SNAPSHOT"' "$JOURNAL_PATH" 2>/dev/null | \
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

# Verify per-snapshot states
T03_SNAP1_STATE=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-02-01-080000" "asserted_state")
T03_SNAP2_STATE=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-02-01-120000" "asserted_state")
T03_SNAP3_STATE=$(_jfield "$JOURNAL_PATH" "snapshot:com.apple.TimeMachine.2026-02-01-160000" "asserted_state")

[ "$T03_TOTAL" = "3" ] \
  && _pass "T03: 3 SNAPSHOT events written (one per pre-thin snapshot)" \
  || _fail "T03" "expected 3 SNAPSHOT events, got $T03_TOTAL"
[ "$T03_ABSENT" = "1" ] \
  && _pass "T03: 1 ABSENT event (thinned snapshot)" \
  || _fail "T03" "expected 1 ABSENT, got $T03_ABSENT"
[ "$T03_PRESENT" = "2" ] \
  && _pass "T03: 2 PRESENT events (survived snapshots)" \
  || _fail "T03" "expected 2 PRESENT, got $T03_PRESENT"
[ "$T03_PHYS" = "3" ] \
  && _pass "T03: all 3 events have source=PHYSICAL" \
  || _fail "T03" "expected 3 PHYSICAL sources, got $T03_PHYS"
[ "$T03_SNAP1_STATE" = "ABSENT" ] \
  && _pass "T03: first snapshot (0800) correctly ABSENT" \
  || _fail "T03" "first snapshot: expected ABSENT, got '$T03_SNAP1_STATE'"
[ "$T03_SNAP2_STATE" = "PRESENT" ] \
  && _pass "T03: second snapshot (1200) correctly PRESENT" \
  || _fail "T03" "second snapshot: expected PRESENT, got '$T03_SNAP2_STATE'"
[ "$T03_SNAP3_STATE" = "PRESENT" ] \
  && _pass "T03: third snapshot (1600) correctly PRESENT" \
  || _fail "T03" "third snapshot: expected PRESENT, got '$T03_SNAP3_STATE'"
/bin/echo "  [proof — partial success: total=$T03_TOTAL absent=$T03_ABSENT present=$T03_PRESENT all_physical=$T03_PHYS]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T04: PHYSICAL priority for SNAPSHOT — PHYSICAL ABSENT beats MANIFEST_GATE PRESENT
# Verifies the gate_assert priority routing for entity_type=SNAPSHOT
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: PHYSICAL ABSENT beats MANIFEST_GATE PRESENT for SNAPSHOT entity"
_setup_test "t04"
manifest_init_strict "thin_t04" >/dev/null 2>/dev/null

T04_SNAP="com.apple.TimeMachine.2026-03-01-090000"
T04_EID="snapshot:$T04_SNAP"
NULL_EV='{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]}'

# MANIFEST_GATE records the snapshot as PRESENT (logged before thinning)
gate_assert "$T04_EID" "SNAPSHOT" "PRESENT" "MANIFEST_GATE" "$NULL_EV" >/dev/null 2>/dev/null
# PHYSICAL asserts ABSENT (confirmed removed by post-thin list comparison)
T04_EV=$(_snap_evidence "$MANIFEST_PATH" "false")
gate_assert "$T04_EID" "SNAPSHOT" "ABSENT" "PHYSICAL" "$T04_EV" >/dev/null 2>/dev/null

T04_OUT=$(resolve "$T04_EID" 2>/dev/null)
T04_STATE=$(echo "$T04_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('asserted_state',''))" 2>/dev/null)
T04_SRC=$(echo "$T04_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('source',''))" 2>/dev/null)
T04_CONF=$(echo "$T04_OUT" | /usr/bin/python3 -c \
  "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('confidence',''))" 2>/dev/null)

[ "$T04_STATE" = "ABSENT" ] \
  && _pass "T04: PHYSICAL ABSENT wins over MANIFEST_GATE PRESENT for SNAPSHOT" \
  || _fail "T04" "expected ABSENT, got '$T04_STATE'"
[ "$T04_SRC" = "PHYSICAL" ] \
  && _pass "T04: resolve reports source=PHYSICAL" \
  || _fail "T04" "expected PHYSICAL, got '$T04_SRC'"
[ "$T04_CONF" = "HIGH" ] \
  && _pass "T04: confidence=HIGH for PHYSICAL SNAPSHOT" \
  || _fail "T04" "expected HIGH, got '$T04_CONF'"
/bin/echo "  [proof — PHYSICAL priority for SNAPSHOT: state=$T04_STATE source=$T04_SRC confidence=$T04_CONF]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T05: evidence payload — physical_check=false for ABSENT, true for PRESENT
# Verifies the evidence JSON written by thin_snapshots.sh assertion loop
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T05: evidence payload — physical_check matches ABSENT/PRESENT state"
_setup_test "t05"
manifest_init_strict "thin_t05" >/dev/null 2>/dev/null

T05_GONE="snapshot:com.apple.TimeMachine.2026-04-01-000000"
T05_LIVE="snapshot:com.apple.TimeMachine.2026-04-01-060000"

EV_ABSENT=$(_snap_evidence "$MANIFEST_PATH" "false")
EV_PRESENT=$(_snap_evidence "$MANIFEST_PATH" "true")

gate_assert "$T05_GONE" "SNAPSHOT" "ABSENT"  "PHYSICAL" "$EV_ABSENT"  >/dev/null 2>/dev/null
gate_assert "$T05_LIVE" "SNAPSHOT" "PRESENT" "PHYSICAL" "$EV_PRESENT" >/dev/null 2>/dev/null

T05_CHECK_GONE=$(grep "\"entity_id\":\"$T05_GONE\"" "$JOURNAL_PATH" 2>/dev/null | head -1 | \
  /usr/bin/python3 -c "
import sys, json
ev = json.loads(sys.stdin.read().strip())
print(ev.get('evidence', {}).get('physical_check', ''))
" 2>/dev/null)
T05_CHECK_LIVE=$(grep "\"entity_id\":\"$T05_LIVE\"" "$JOURNAL_PATH" 2>/dev/null | head -1 | \
  /usr/bin/python3 -c "
import sys, json
ev = json.loads(sys.stdin.read().strip())
print(ev.get('evidence', {}).get('physical_check', ''))
" 2>/dev/null)

[ "$T05_CHECK_GONE" = "False" ] \
  && _pass "T05: evidence.physical_check=false for ABSENT snapshot" \
  || _fail "T05" "expected False, got '$T05_CHECK_GONE'"
[ "$T05_CHECK_LIVE" = "True" ] \
  && _pass "T05: evidence.physical_check=true for PRESENT snapshot" \
  || _fail "T05" "expected True, got '$T05_CHECK_LIVE'"
/bin/echo "  [proof — evidence payload: absent_check=$T05_CHECK_GONE present_check=$T05_CHECK_LIVE]"
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
