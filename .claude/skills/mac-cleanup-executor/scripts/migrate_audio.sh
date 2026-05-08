#!/bin/bash
# mac-cleanup-executor :: migrate_audio.sh
# v1.3: EXIT trap — manifest_close always runs on exit (open-gate risk fix).
#
# Usage: migrate_audio.sh <source> <ssd_mount> [--symlink]

set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/manifest_writer.sh" ]; then
  echo "FATAL: manifest_writer.sh missing. Refusing to run." >&2
  exit 99
fi
# shellcheck source=manifest_writer.sh
source "$SCRIPT_DIR/manifest_writer.sh"

SOURCE="${1:?source path required}"
SSD="${2:?SSD mount path required}"
SYMLINK="${3:-}"

if [ ! -e "$SOURCE" ]; then
  echo "✗ Source does not exist: $SOURCE"
  exit 1
fi

if [ ! -d "$SSD" ]; then
  echo "✗ SSD not mounted: $SSD"
  echo "  Available volumes:"
  ls /Volumes/ 2>/dev/null
  exit 1
fi

# === PREFLIGHT GATE for --symlink ===
if [ "$SYMLINK" = "--symlink" ]; then
  echo "── Running symlink preflight ──"
  if ! bash "$SCRIPT_DIR/symlink_preflight.sh" "$SOURCE" "$SSD"; then
    echo ""
    echo "═══ ABORT ═══"
    echo "Symlink preflight failed. Re-run WITHOUT --symlink for copy-only."
    exit 1
  fi
  echo ""
fi

BASENAME=$(basename "$SOURCE")
DEST="$SSD/$BASENAME"

SRC_SIZE_KB=$(du -sk "$SOURCE" | awk '{print $1}')
SRC_SIZE_GB=$((SRC_SIZE_KB / 1024 / 1024))
SSD_FREE_KB=$(df -k "$SSD" | tail -1 | awk '{print $4}')
SSD_FREE_GB=$((SSD_FREE_KB / 1024 / 1024))

echo "── MIGRATION PLAN ──"
echo "  Source:    $SOURCE  (${SRC_SIZE_GB} GB)"
echo "  Dest:      $DEST"
echo "  SSD free:  ${SSD_FREE_GB} GB"
echo "  Symlink:   ${SYMLINK:-no}"
echo ""

if [ "$SRC_SIZE_KB" -gt "$SSD_FREE_KB" ]; then
  echo "✗ SSD does not have enough free space."
  exit 1
fi

read -p "Proceed with copy + verify + delete + symlink? (yes/no) " ANS
if [ "$ANS" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Open manifest now — copy phase doesn't need it but delete phase will
manifest_init_strict "migrate_${BASENAME//[^a-zA-Z0-9]/_}"

# EXIT trap — ensures manifest_close runs on any exit (set -eu, explicit, or signal).
# Status defaults to "aborted"; updated to "failed" before destructive ops, "completed" at end.
_MIGRATE_STATUS="aborted"
_migrate_exit_trap() {
  if [ -n "${GATE_ID:-}" ]; then
    manifest_close "$_MIGRATE_STATUS" >/dev/null 2>&1 || true
  fi
}
trap _migrate_exit_trap EXIT

# Step 1: Copy
echo ""
echo "[1/4] Copying with rsync..."
rsync -avh --progress "$SOURCE/" "$DEST/"
manifest_assert_physical "$DEST" || true

# Step 2: Verify with checksum sample
echo ""
echo "[2/4] Verifying (sampled checksums)..."
SAMPLE_OK=true
while IFS= read -r f; do
  rel="${f#$SOURCE/}"
  src_sum=$(md5 -q "$f" 2>/dev/null || echo MISSING)
  dst_sum=$(md5 -q "$DEST/$rel" 2>/dev/null || echo MISSING)
  if [ "$src_sum" != "$dst_sum" ]; then
    echo "  ✗ MISMATCH: $rel"
    SAMPLE_OK=false
  fi
done < <(find "$SOURCE" -type f 2>/dev/null | shuf | head -20)

if [ "$SAMPLE_OK" = "false" ]; then
  echo ""
  echo "✗ Checksum verification failed. Aborting before delete."
  manifest_close "aborted"
  exit 2
fi
echo "  ✓ Sample checksums match."

# Step 3: Delete source — only after verification
echo ""
echo "[3/4] Final confirmation before removing source..."
read -p "Verify looks good. Remove source $SOURCE? (yes/no) " ANS2
if [ "$ANS2" != "yes" ]; then
  echo "Source kept. Migration is COPY-ONLY."
  manifest_close "aborted"
  exit 0
fi

# Destructive phase begins — update status so EXIT trap closes as "failed" if anything aborts here
_MIGRATE_STATUS="failed"

# Record before delete
manifest_record "$SOURCE" "3" "Migrated to $DEST and verified"

if [[ "$SOURCE" == /Library/* ]] || [[ "$SOURCE" == /Applications/* ]]; then
  sudo rm -rf "$SOURCE"
else
  rm -rf "$SOURCE"
fi
echo "  ✓ Source removed."
manifest_assert_physical "$SOURCE" || true

# Step 4: Symlink (only if preflight passed earlier)
if [ "$SYMLINK" = "--symlink" ]; then
  echo ""
  echo "[4/4] Creating symlink..."
  if [[ "$SOURCE" == /Library/* ]]; then
    sudo ln -s "$DEST" "$SOURCE"
  else
    ln -s "$DEST" "$SOURCE"
  fi
  echo "  ✓ Symlink created: $SOURCE -> $DEST"
  manifest_record "symlink: $SOURCE -> $DEST" "3" "Symlink created post-migration"
else
  echo "[4/4] Symlink skipped (apps may not find library at original path)"
fi

_MIGRATE_STATUS="completed"
manifest_close "completed"

echo ""
echo "═══ MIGRATION COMPLETE ═══"
echo "Reclaimed: ${SRC_SIZE_GB} GB on internal disk"
echo "Manifest:  $MANIFEST_PATH"
