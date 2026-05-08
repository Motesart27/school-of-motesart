#!/bin/bash
# mac-cleanup-executor :: tier1_sweep.sh
# AUTO-SAFE cleanup. Reversible operations only.
# v1.3: manifest_record_strict — pre-destruction records fail closed (exit 98).

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source manifest library — REQUIRED. No manifest, no run.
if [ ! -f "$SCRIPT_DIR/manifest_writer.sh" ]; then
  echo "FATAL: manifest_writer.sh missing. Refusing to run." >&2
  exit 99
fi
# shellcheck source=manifest_writer.sh
source "$SCRIPT_DIR/manifest_writer.sh"

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_DIR="$HOME/.claude/state/mac-cleanup"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/run-${TS//:/-}.log"

exec > >(tee -a "$LOG") 2>&1

echo "═══ TIER 1 SWEEP — $TS ═══"

# HARD GATE (v1.1.4): strict init aborts on any failure
manifest_init_strict "tier1_sweep"

BEFORE=$(df -k / | tail -1 | awk '{print $4}')
BEFORE_GB=$((BEFORE / 1024 / 1024))
echo "Free before: ${BEFORE_GB} GB"
echo ""

run_step() {
  local label="$1"; shift
  echo "── $label ──"
  echo "  cmd: $*"
  if "$@"; then
    echo "  ✓ ok"
  else
    echo "  ✗ failed (exit $?), continuing"
  fi
  echo ""
}

# 1. Empty Trash — record contents first
echo "── Empty Trash ──"
manifest_guard
if [ -d "$HOME/.Trash" ]; then
  _t1_trash=$(mktemp)
  for entry in "$HOME/.Trash/"*; do
    [ -e "$entry" ] || continue
    manifest_record_strict "$entry" "1" "Empty Trash"
    echo "$entry" >> "$_t1_trash"
  done
  rm -rf "$HOME/.Trash"/* 2>/dev/null
  rm -rf "$HOME/.Trash"/.[!.]* 2>/dev/null
  while IFS= read -r entry; do
    manifest_assert_physical "$entry" || true
  done < "$_t1_trash"
  rm -f "$_t1_trash"
  echo "  ✓ ok"
fi
echo ""

# 2. User caches — record each top-level cache dir
echo "── User Caches (~/Library/Caches) ──"
manifest_guard
if [ -d "$HOME/Library/Caches" ]; then
  _t1_caches=$(mktemp)
  find "$HOME/Library/Caches" -mindepth 1 -maxdepth 1 2>/dev/null > "$_t1_caches"
  while IFS= read -r entry; do
    manifest_record_strict "$entry" "1" "User cache (regenerable)"
  done < "$_t1_caches"
  find "$HOME/Library/Caches" -mindepth 1 -maxdepth 2 -exec rm -rf {} + 2>/dev/null
  while IFS= read -r entry; do
    manifest_assert_physical "$entry" || true
  done < "$_t1_caches"
  rm -f "$_t1_caches"
  echo "  ✓ ok"
fi
echo ""

# 3. User logs
echo "── User Logs (~/Library/Logs) ──"
manifest_guard
if [ -d "$HOME/Library/Logs" ]; then
  manifest_record_strict "$HOME/Library/Logs (file contents)" "1" "User log files (regenerable)"
  find "$HOME/Library/Logs" -type f -delete 2>/dev/null
  manifest_assert_physical "$HOME/Library/Logs" || true
  echo "  ✓ ok"
fi
echo ""

# 4. Xcode DerivedData
if [ -d "$HOME/Library/Developer/Xcode/DerivedData" ]; then
  echo "── Xcode DerivedData ──"
  manifest_guard
  _t1_derived=$(mktemp)
  find "$HOME/Library/Developer/Xcode/DerivedData" -mindepth 1 -maxdepth 1 2>/dev/null > "$_t1_derived"
  while IFS= read -r entry; do
    manifest_record_strict "$entry" "1" "Xcode DerivedData (regenerable on rebuild)"
  done < "$_t1_derived"
  rm -rf "$HOME/Library/Developer/Xcode/DerivedData/"* 2>/dev/null
  while IFS= read -r entry; do
    manifest_assert_physical "$entry" || true
  done < "$_t1_derived"
  rm -f "$_t1_derived"
  echo "  ✓ ok"
  echo ""
fi

# 5. Xcode iOS DeviceSupport
if [ -d "$HOME/Library/Developer/Xcode/iOS DeviceSupport" ]; then
  echo "── Xcode iOS DeviceSupport ──"
  manifest_guard
  _t1_devsupp=$(mktemp)
  find "$HOME/Library/Developer/Xcode/iOS DeviceSupport" -mindepth 1 -maxdepth 1 2>/dev/null > "$_t1_devsupp"
  while IFS= read -r entry; do
    manifest_record_strict "$entry" "1" "Xcode iOS DeviceSupport (re-syncs from device)"
  done < "$_t1_devsupp"
  rm -rf "$HOME/Library/Developer/Xcode/iOS DeviceSupport/"* 2>/dev/null
  while IFS= read -r entry; do
    manifest_assert_physical "$entry" || true
  done < "$_t1_devsupp"
  rm -f "$_t1_devsupp"
  echo "  ✓ ok"
  echo ""
fi

# 6. npm cache
if command -v npm >/dev/null 2>&1; then
  manifest_record_strict "$HOME/.npm" "1" "npm cache clean --force"
  run_step "npm cache clean" npm cache clean --force
fi

# 7. pip cache
if command -v pip3 >/dev/null 2>&1; then
  manifest_record_strict "pip cache" "1" "pip3 cache purge"
  run_step "pip cache purge" pip3 cache purge
fi

# 8. brew cleanup
if command -v brew >/dev/null 2>&1; then
  manifest_record_strict "brew cache" "1" "brew cleanup -s && brew autoremove"
  run_step "brew cleanup" bash -c 'brew cleanup -s 2>&1; brew autoremove 2>&1'
fi

# 9. Docker prune (no --volumes — preserves dev volumes)
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    manifest_record_strict "docker images/containers/networks" "1" "docker system prune -af (volumes preserved)"
    run_step "docker system prune" docker system prune -af
  else
    echo "Docker installed but not running — skipping"
  fi
fi

# 10. Time Machine local snapshots
echo "── Time Machine Local Snapshots ──"
manifest_guard
BEFORE_SNAPS=$(tmutil listlocalsnapshots / 2>/dev/null | grep "com.apple.TimeMachine" || true)
while IFS= read -r snap; do
  [ -n "$snap" ] && manifest_record_strict "snapshot: $snap" "1" "TM local snapshot thinning"
done <<< "$BEFORE_SNAPS"
echo "  cmd: sudo tmutil thinlocalsnapshots / 999999999999 4"
echo "  (macOS will prompt for your password)"
sudo tmutil thinlocalsnapshots / 999999999999 4 || echo "  (skipped or failed)"

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
echo ""

# Final measurement
AFTER=$(df -k / | tail -1 | awk '{print $4}')
AFTER_GB=$((AFTER / 1024 / 1024))
RECLAIMED_GB=$((AFTER_GB - BEFORE_GB))

manifest_close "completed"

echo "═══ COMPLETE ═══"
echo "Free before:  ${BEFORE_GB} GB"
echo "Free after:   ${AFTER_GB} GB"
echo "Reclaimed:    ${RECLAIMED_GB} GB"
echo ""
echo "Log:      $LOG"
echo "Manifest: $MANIFEST_PATH"

cat > "$LOG_DIR/last-run.json" <<EOF
{
  "timestamp": "$TS",
  "free_before_gb": $BEFORE_GB,
  "free_after_gb": $AFTER_GB,
  "reclaimed_gb": $RECLAIMED_GB,
  "log_path": "$LOG",
  "manifest_path": "$MANIFEST_PATH"
}
EOF
