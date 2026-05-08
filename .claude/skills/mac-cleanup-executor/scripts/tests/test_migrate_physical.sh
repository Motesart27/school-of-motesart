#!/bin/bash
# mac-cleanup-executor :: tests/test_migrate_physical.sh  v1.0.0
# Targeted tests for manifest_assert_physical integration in migrate_audio.sh.
# Covers: rsync dest PRESENT, rm source ABSENT, symlink PRESENT (live + dangling),
# and set -eu || true safety pattern.
# Run from any directory: bash tests/test_migrate_physical.sh

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
TEST_ROOT=$(mktemp -d /tmp/migrate_phys_test.XXXXXX)
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

/bin/echo "══ test_migrate_physical.sh ══"
/bin/echo ""

# ─────────────────────────────────────────────────────────────────────────────
# T01: rsync destination → manifest_assert_physical reports PRESENT
# Simulates: rsync -avh --progress "$SOURCE/" "$DEST/" && manifest_assert_physical "$DEST"
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T01: rsync dest → manifest_assert_physical reports PRESENT"
_setup_test "t01"
manifest_init_strict "migrate_t01" >/dev/null 2>/dev/null

T01_SRC="$TEST_ROOT/t01/SourceLibrary"
T01_DEST="$TEST_ROOT/t01/ssd/SourceLibrary"
/bin/mkdir -p "$T01_SRC" "$TEST_ROOT/t01/ssd"
/bin/echo "audio content" > "$T01_SRC/track1.wav"
/bin/echo "metadata" > "$T01_SRC/info.txt"

# Simulate rsync (cp -r equivalent) then assert
cp -r "$T01_SRC/." "$T01_DEST/"
manifest_assert_physical "$T01_DEST" >/dev/null 2>/dev/null

T01_STATE=$(_jfield "$JOURNAL_PATH" "$T01_DEST" "asserted_state")
T01_SRC_F=$(_jfield "$JOURNAL_PATH" "$T01_DEST" "source")
T01_PRI=$(_jfield "$JOURNAL_PATH" "$T01_DEST" "source_priority")

[ "$T01_STATE" = "PRESENT" ] \
  && _pass "T01: state=PRESENT after rsync to dest" \
  || _fail "T01" "expected PRESENT, got '$T01_STATE'"
[ "$T01_SRC_F" = "PHYSICAL" ] \
  && _pass "T01: source=PHYSICAL for dest assertion" \
  || _fail "T01" "expected PHYSICAL, got '$T01_SRC_F'"
[ "$T01_PRI" = "1" ] \
  && _pass "T01: source_priority=1 (highest) for PHYSICAL" \
  || _fail "T01" "expected priority 1, got '$T01_PRI'"
/bin/echo "  [proof — PRESENT after rsync: state=$T01_STATE source=$T01_SRC_F priority=$T01_PRI path=$T01_DEST]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T02: rm source → manifest_assert_physical reports ABSENT
# Simulates: rm -rf "$SOURCE" && manifest_assert_physical "$SOURCE"
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T02: rm source → manifest_assert_physical reports ABSENT"
_setup_test "t02"
manifest_init_strict "migrate_t02" >/dev/null 2>/dev/null

T02_SRC="$TEST_ROOT/t02/AudioLibrary"
/bin/mkdir -p "$T02_SRC"
/bin/echo "audio content" > "$T02_SRC/track1.wav"

# Simulate: manifest_record before delete, then rm, then assert
manifest_record "$T02_SRC" "3" "Migrated to SSD and verified" >/dev/null 2>/dev/null
rm -rf "$T02_SRC"
manifest_assert_physical "$T02_SRC" >/dev/null 2>/dev/null

T02_STATE=$(_jfield_last "$JOURNAL_PATH" "$T02_SRC" "asserted_state")
T02_SRC_F=$(_jfield_last "$JOURNAL_PATH" "$T02_SRC" "source")

[ "$T02_STATE" = "ABSENT" ] \
  && _pass "T02: state=ABSENT after rm source" \
  || _fail "T02" "expected ABSENT, got '$T02_STATE'"
[ "$T02_SRC_F" = "PHYSICAL" ] \
  && _pass "T02: source=PHYSICAL for source deletion assertion" \
  || _fail "T02" "expected PHYSICAL, got '$T02_SRC_F'"
/bin/echo "  [proof — ABSENT after delete: state=$T02_STATE source=$T02_SRC_F path=$T02_SRC]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T03a: live symlink → manifest_assert_physical reports PRESENT
# T03b: dangling symlink (target removed) → still PRESENT ([ -L ] catches it)
# Simulates: ln -s "$DEST" "$SOURCE" && manifest_assert_physical "$SOURCE"
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T03a: live symlink → manifest_assert_physical reports PRESENT"
_setup_test "t03"
manifest_init_strict "migrate_t03" >/dev/null 2>/dev/null

T03_REAL="$TEST_ROOT/t03/ssd/AudioLibrary"
T03_LINK="$TEST_ROOT/t03/AudioLibrary"
/bin/mkdir -p "$T03_REAL"
/bin/echo "audio" > "$T03_REAL/track.wav"

# Simulate: ln -s "$DEST" "$SOURCE"
ln -s "$T03_REAL" "$T03_LINK"
manifest_assert_physical "$T03_LINK" >/dev/null 2>/dev/null

T03A_STATE=$(_jfield "$JOURNAL_PATH" "$T03_LINK" "asserted_state")
T03A_SRC=$(_jfield "$JOURNAL_PATH" "$T03_LINK" "source")

[ "$T03A_STATE" = "PRESENT" ] \
  && _pass "T03a: live symlink state=PRESENT" \
  || _fail "T03a" "expected PRESENT for live symlink, got '$T03A_STATE'"
[ "$T03A_SRC" = "PHYSICAL" ] \
  && _pass "T03a: source=PHYSICAL for symlink assertion" \
  || _fail "T03a" "expected PHYSICAL, got '$T03A_SRC'"
/bin/echo "  [proof — live symlink PRESENT: state=$T03A_STATE source=$T03A_SRC link=$T03_LINK -> $T03_REAL]"

/bin/echo "T03b: dangling symlink → manifest_assert_physical still reports PRESENT"
# Remove the real target — symlink becomes dangling
rm -rf "$T03_REAL"
# Verify it's actually dangling: [ -e ] should return false, [ -L ] should return true
if [ ! -e "$T03_LINK" ] && [ -L "$T03_LINK" ]; then
  _pass "T03b: confirmed dangling symlink ([ -e ] false, [ -L ] true)"
else
  _fail "T03b" "test setup: symlink is not dangling as expected (e=$([ -e "$T03_LINK" ] && echo true || echo false), L=$([ -L "$T03_LINK" ] && echo true || echo false))"
fi

manifest_assert_physical "$T03_LINK" >/dev/null 2>/dev/null

T03B_STATE=$(_jfield_last "$JOURNAL_PATH" "$T03_LINK" "asserted_state")
T03B_SRC=$(_jfield_last "$JOURNAL_PATH" "$T03_LINK" "source")

[ "$T03B_STATE" = "PRESENT" ] \
  && _pass "T03b: dangling symlink state=PRESENT ([ -L ] catches it)" \
  || _fail "T03b" "expected PRESENT for dangling symlink, got '$T03B_STATE'"
[ "$T03B_SRC" = "PHYSICAL" ] \
  && _pass "T03b: source=PHYSICAL for dangling symlink assertion" \
  || _fail "T03b" "expected PHYSICAL, got '$T03B_SRC'"
/bin/echo "  [proof — dangling symlink PRESENT: state=$T03B_STATE source=$T03B_SRC ([ -L ] detected, target gone)]"
manifest_close >/dev/null 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# T04: set -eu || true safety — journal write failure does NOT abort the script
# Simulates set -eu in migrate_audio.sh: manifest_assert_physical "$path" || true
# ─────────────────────────────────────────────────────────────────────────────
/bin/echo "T04: set -eu || true — journal failure does not abort migration"
_setup_test "t04"

# Run inside a subshell with set -eu active, just like migrate_audio.sh
T04_RC=$(
  set -eu
  unset GATE_ID GATE_LABEL JOURNAL_PATH JOURNAL_LOCK JOURNAL_DIR \
        MANIFEST_PATH MANIFEST_FIRST_ITEM GATE_LOCK_PATH 2>/dev/null || true
  export MANIFEST_DIR="$TEST_ROOT/t04/manifests"
  export _MW_JDIR="$TEST_ROOT/t04/journal"
  source "$SCRIPTS/manifest_writer.sh" >/dev/null 2>/dev/null
  manifest_init_strict "migrate_t04_safety" >/dev/null 2>/dev/null

  T04_FILE="$TEST_ROOT/t04/audio_file"
  touch "$T04_FILE"

  # Make journal read-only to force write failure
  chmod 444 "$JOURNAL_PATH"

  # This is exactly the pattern in migrate_audio.sh — || true must neutralize the failure
  manifest_assert_physical "$T04_FILE" >/dev/null 2>/dev/null || true

  # Restore so manifest_close can succeed
  chmod 644 "$JOURNAL_PATH"
  manifest_close >/dev/null 2>/dev/null

  # Script continues — emit sentinel if we reach here
  /bin/echo "REACHED"
)
# Subshell rc
T04_SUBSHELL_RC=$?

[ "$T04_SUBSHELL_RC" -eq 0 ] \
  && _pass "T04: subshell exit 0 — set -eu did not abort on journal failure" \
  || _fail "T04" "subshell exited $T04_SUBSHELL_RC, expected 0"
[ "$T04_RC" = "REACHED" ] \
  && _pass "T04: execution continued past manifest_assert_physical failure" \
  || _fail "T04" "sentinel not reached — script aborted before end: '$T04_RC'"
/bin/echo "  [proof — || true safety: subshell_rc=$T04_SUBSHELL_RC sentinel='$T04_RC' (set -eu active throughout)]"

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
