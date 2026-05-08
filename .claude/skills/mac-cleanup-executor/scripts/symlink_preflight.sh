#!/bin/bash
# mac-cleanup-executor :: symlink_preflight.sh
# Proves a symlink from <source_dir> to <ssd_mount> survives basic operations
# BEFORE any actual migration commits to symlinking.
#
# Tests:
#   1. SSD is mounted and writable
#   2. Source path is in a symlink-safe location (not /System, not protected)
#   3. Test file written to SSD via target path is readable through a symlink
#       at a sibling test path
#   4. Symlink survives a typical "open file" pattern (read full bytes)
#   5. Symlink correctly resolves with realpath
#
# Usage: symlink_preflight.sh <source_path> <ssd_mount>
#   e.g. symlink_preflight.sh "/Library/Audio/Apple Loops" /Volumes/CreativeDrive

set -u

SOURCE="${1:?source path required}"
SSD="${2:?SSD mount path required}"

echo "── SYMLINK PREFLIGHT ──"
echo "  source: $SOURCE"
echo "  ssd:    $SSD"
echo ""

FAIL=0
fail() { echo "  ✗ $1"; FAIL=1; }
pass() { echo "  ✓ $1"; }

# Test 1: SSD mounted and writable
echo "[1/5] SSD mounted + writable..."
if [ ! -d "$SSD" ]; then
  fail "SSD not mounted at $SSD"
  echo "  Available volumes:"
  ls /Volumes/ 2>/dev/null | sed 's/^/    /'
  exit 1
fi
TESTWRITE="$SSD/.symlink_preflight_$$"
if echo "test" > "$TESTWRITE" 2>/dev/null; then
  pass "SSD is writable"
  rm -f "$TESTWRITE"
else
  fail "SSD not writable (read-only mount?)"
  exit 1
fi

# Test 2: Source not in protected location
echo "[2/5] Source path safety check..."
case "$SOURCE" in
  /System/*|/usr/*|/bin/*|/sbin/*|/private/*|/.vol/*)
    fail "Source is in a system-protected path. Symlinking refused."
    exit 2
    ;;
  /Volumes/*)
    fail "Source is already on an external volume. No need to migrate."
    exit 2
    ;;
  *)
    pass "Source path location is safe to symlink"
    ;;
esac

# Test 3: Source exists
echo "[3/5] Source existence check..."
if [ ! -e "$SOURCE" ]; then
  fail "Source does not exist: $SOURCE"
  exit 3
fi
if [ -L "$SOURCE" ]; then
  fail "Source is ALREADY a symlink. Resolve it first."
  ls -la "$SOURCE"
  exit 3
fi
pass "Source exists and is real (not already symlinked)"

# Test 4: Round-trip symlink read test
echo "[4/5] Round-trip symlink read test..."
TEST_REAL="$SSD/.preflight_real_$$"
TEST_LINK="$(dirname "$SOURCE")/.preflight_link_$$"

# Need sudo if source dir is /Library
if [[ "$(dirname "$SOURCE")" == /Library/* ]] || [[ "$(dirname "$SOURCE")" == /Applications/* ]]; then
  NEED_SUDO=1
else
  NEED_SUDO=0
fi

# Write a 1MB file to SSD
dd if=/dev/urandom of="$TEST_REAL" bs=1024 count=1024 2>/dev/null
EXPECTED_SUM=$(md5 -q "$TEST_REAL")

# Create a symlink in source's parent dir pointing to it
if [ "$NEED_SUDO" = "1" ]; then
  sudo ln -s "$TEST_REAL" "$TEST_LINK" 2>/dev/null
else
  ln -s "$TEST_REAL" "$TEST_LINK" 2>/dev/null
fi

# Read through the symlink and compare
if [ -f "$TEST_LINK" ]; then
  ACTUAL_SUM=$(md5 -q "$TEST_LINK" 2>/dev/null)
  if [ "$ACTUAL_SUM" = "$EXPECTED_SUM" ]; then
    pass "Symlink read returns identical bytes"
  else
    fail "Symlink read returned different bytes (FS issue)"
  fi
else
  fail "Symlink does not resolve to a readable file"
fi

# Cleanup test artifacts
if [ "$NEED_SUDO" = "1" ]; then
  sudo rm -f "$TEST_LINK" 2>/dev/null
else
  rm -f "$TEST_LINK" 2>/dev/null
fi
rm -f "$TEST_REAL" 2>/dev/null

# Test 5: realpath resolution
echo "[5/5] realpath resolution test..."
TEST_REAL2="$SSD/.preflight_real2_$$"
TEST_LINK2="$(dirname "$SOURCE")/.preflight_link2_$$"
mkdir -p "$TEST_REAL2"
if [ "$NEED_SUDO" = "1" ]; then
  sudo ln -s "$TEST_REAL2" "$TEST_LINK2" 2>/dev/null
else
  ln -s "$TEST_REAL2" "$TEST_LINK2" 2>/dev/null
fi
RESOLVED=$(/usr/bin/python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$TEST_LINK2" 2>/dev/null)
if [ "$RESOLVED" = "$TEST_REAL2" ]; then
  pass "realpath resolves symlink correctly"
else
  fail "realpath returned: $RESOLVED (expected $TEST_REAL2)"
fi
if [ "$NEED_SUDO" = "1" ]; then
  sudo rm -f "$TEST_LINK2" 2>/dev/null
  sudo rmdir "$TEST_REAL2" 2>/dev/null
else
  rm -f "$TEST_LINK2" 2>/dev/null
  rmdir "$TEST_REAL2" 2>/dev/null
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "═══ PREFLIGHT PASSED ═══"
  echo "Symlinks from $(dirname "$SOURCE") → $SSD are operationally sound."
  exit 0
else
  echo "═══ PREFLIGHT FAILED ═══"
  echo "Migration with --symlink is REFUSED for this path."
  echo "Use migrate_audio.sh WITHOUT --symlink flag (copy-only)."
  exit 1
fi
