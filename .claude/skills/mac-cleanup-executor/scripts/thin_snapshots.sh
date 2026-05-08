#!/bin/bash
# mac-cleanup-executor :: thin_snapshots.sh
# v1.3: manifest_record_strict — pre-destruction snapshot records fail closed.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/manifest_writer.sh" ]; then
  echo "FATAL: manifest_writer.sh missing. Refusing to run." >&2
  exit 99
fi
# shellcheck source=manifest_writer.sh
source "$SCRIPT_DIR/manifest_writer.sh"

echo "── TM SNAPSHOT THIN ──"
manifest_init_strict "thin_snapshots"

BEFORE=$(df -k / | tail -1 | awk '{print $4}')
BEFORE_GB=$((BEFORE / 1024 / 1024))

COUNT=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c "com.apple.TimeMachine")
echo "Snapshots present: $COUNT"
echo "Free before: ${BEFORE_GB} GB"
echo ""

if [ "$COUNT" -eq 0 ]; then
  echo "No snapshots to thin."
  manifest_close "completed"
  exit 0
fi

# Capture pre-thin snapshot list (reused for record loop and post-thin comparison)
BEFORE_SNAPS=$(tmutil listlocalsnapshots / 2>/dev/null | grep "com.apple.TimeMachine" || true)

# Record each snapshot before thinning
manifest_guard
while IFS= read -r snap; do
  [ -n "$snap" ] && manifest_record_strict "snapshot: $snap" "1" "TM local snapshot — thinned by tmutil"
done <<< "$BEFORE_SNAPS"

echo "Running: sudo tmutil thinlocalsnapshots / 999999999999 4"
echo "(macOS will prompt for your password)"
echo ""

if sudo tmutil thinlocalsnapshots / 999999999999 4; then
  STATUS="completed"
else
  STATUS="failed"
fi

AFTER=$(df -k / | tail -1 | awk '{print $4}')
AFTER_GB=$((AFTER / 1024 / 1024))
RECLAIMED=$((AFTER_GB - BEFORE_GB))

# Capture post-thin snapshot list and assert PHYSICAL state for each pre-thin snapshot.
# Snapshots are not filesystem paths — use gate_assert directly with entity_type=SNAPSHOT.
# Partial success is natural: tmutil may leave some snapshots behind.
AFTER_SNAPS=$(tmutil listlocalsnapshots / 2>/dev/null | grep "com.apple.TimeMachine" || true)
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
  gate_assert "snapshot:$snap" "SNAPSHOT" "$_snap_state" "PHYSICAL" "$_snap_evidence" >/dev/null || true
done <<< "$BEFORE_SNAPS"

REMAINING=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c "com.apple.TimeMachine")

manifest_close "$STATUS"

echo ""
echo "── RESULT ──"
echo "Free before:    ${BEFORE_GB} GB"
echo "Free after:     ${AFTER_GB} GB"
echo "Reclaimed:      ${RECLAIMED} GB"
echo "Snapshots left: $REMAINING"
echo "Manifest:       $MANIFEST_PATH"
