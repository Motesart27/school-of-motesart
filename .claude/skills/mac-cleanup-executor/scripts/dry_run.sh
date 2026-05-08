#!/bin/bash
# mac-cleanup-executor :: dry_run.sh
# Prints every command Tier 1 would run, with sizes, without touching anything.

echo "═══ TIER 1 DRY RUN ═══"
echo "(Nothing below will execute. Read-only preview.)"
echo ""

dry() {
  local label="$1"; shift
  printf "  %-35s would run: %s\n" "$label" "$*"
}

estimate() {
  local label="$1"; local path="$2"
  if [ -e "$path" ]; then
    SIZE=$(du -sh "$path" 2>/dev/null | awk '{print $1}')
    printf "  %-35s ~%s\n" "$label" "$SIZE"
  fi
}

echo "── ESTIMATED RECLAIM PER ITEM ──"
estimate "Trash"                      "$HOME/.Trash"
estimate "User Caches"                "$HOME/Library/Caches"
estimate "User Logs"                  "$HOME/Library/Logs"
estimate "Xcode DerivedData"          "$HOME/Library/Developer/Xcode/DerivedData"
estimate "Xcode iOS DeviceSupport"    "$HOME/Library/Developer/Xcode/iOS DeviceSupport"
estimate "npm cache"                  "$HOME/.npm"
estimate "pip cache"                  "$HOME/.cache/pip"

SNAPSHOTS=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c "com.apple.TimeMachine")
echo "  TM snapshots                       count: $SNAPSHOTS"

echo ""
echo "── COMMANDS THAT WOULD RUN ──"
dry "Empty Trash"             'rm -rf ~/.Trash/*'
dry "User Caches"             'find ~/Library/Caches -mindepth 1 -maxdepth 2 -exec rm -rf {} +'
dry "User Logs"               'find ~/Library/Logs -type f -delete'
dry "Xcode DerivedData"       'rm -rf ~/Library/Developer/Xcode/DerivedData/*'
dry "Xcode iOS DeviceSupport" 'rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/*'
dry "npm cache"               'npm cache clean --force'
dry "pip cache"               'pip3 cache purge'
dry "brew cleanup"            'brew cleanup -s && brew autoremove'
dry "docker prune"            'docker system prune -af'
dry "TM snapshots"            'sudo tmutil thinlocalsnapshots / 999999999999 4'
echo ""
echo "Run tier1_sweep.sh to actually execute."
