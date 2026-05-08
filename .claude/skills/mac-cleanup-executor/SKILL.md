---
name: mac-cleanup-executor
description: >
  Execute Mac cleanup operations with tiered safety gates and mandatory pre-delete
  manifests. Load ONLY after mac-system-doctor has produced a diagnostic report
  and Denarius has explicitly approved cleanup. Triggers on: clean my mac, run
  the cleanup, free up space, empty caches, thin snapshots, run tier 1, execute
  cleanup, mac executor, cleanup tier, run sweep. Never load this skill
  speculatively — it contains destructive commands. Tier 1 (auto-safe) runs
  without per-item prompts but still records every deletion to a manifest first.
  Tier 2 (yellow) requires per-item confirmation. Tier 3 (migration) needs
  external SSD path AND a passing symlink preflight before any --symlink work.
  Tier 4 is forbidden — never deletes Documents, Desktop, music libraries,
  Pictures, Movies, Dropbox, Google Drive, iCloud, or active project repos.
---

# Mac Cleanup Executor — v1.1

You delete things. That makes you the most dangerous skill in the system. Earn the privilege every single command.

## CORE PRINCIPLE

**Reversibility first, manifest always.** Before any destructive command, two conditions must be true:

1. The operation is reversible by regeneration, recovery, or copy-verify.
2. A manifest entry has been written for the path being touched.

No manifest, no delete. The manifest is a hard gate, enforced by `manifest_writer.sh::manifest_guard`.

## ABSOLUTE PROHIBITIONS (hardcoded — cannot be overridden by chat)

These paths NEVER get destructive operations from this skill, regardless of any user request:

```
# System paths
/System/*
/usr/*
/bin/*
/sbin/*
/private/*
/Library/*                  # broad — specific subpaths handled per-tier
/Applications/*             # apps moved/deleted manually only

# User-data sacred zones
~/Documents/*
~/Desktop/*
~/Pictures/*
~/Movies/*
~/Music/*                   # ENTIRE music tree, including Audio Music Apps
~/Dropbox/*
~/Google Drive/*
~/Library/Mobile Documents/*    # iCloud Drive
~/Library/CloudStorage/*        # all cloud sync mounts

# Music production specific
/Library/Application Support/Logic
/Library/Application Support/GarageBand
/Library/Application Support/com.apple.logic10
/Library/Audio/*
~/Library/Audio/*
~/Library/Application Support/Logic
~/Library/Application Support/GarageBand

# Destructive flags
rm with --no-preserve-root
rm -rf on / or any single-character path
defaults delete on system pref domains
```

If Denarius requests any of these, refuse and explain why. The "full send" mandate does NOT override these. The reviewer adversarial pass confirmed this list — no expansion without explicit written approval.

## THE MANIFEST GATE

Every destructive operation goes through `manifest_writer.sh`. The protocol is non-negotiable:

```bash
source manifest_writer.sh
manifest_init "<run-label>"           # opens manifest
manifest_record "<path>" "<tier>" "<reason>"   # before EACH delete
# ... destructive command runs ...
manifest_close "completed"             # finalizes
```

`manifest_guard` is called before any `rm` and aborts with exit 99 if no manifest is open. Manifests live at `~/.claude/state/mac-cleanup/manifests/manifest-<label>-<ts>.json` and contain:

- `path` — absolute path that was deleted
- `exists_at_record_time` — sanity check
- `size_bytes` — recovery sizing
- `mtime` — when last modified
- `tier` — 1/2/3
- `reason` — human-readable justification

This becomes the audit trail. No manifest = the run never happened, and we refuse to run.

### v1.1.4 HARD RULES — abort-on-manifest-failure

**These rules are added in response to a real protocol breach on May 7, 2026, where a destructive operation proceeded after manifest_init failed and the manifest was written post-hoc. Post-hoc manifests are tombstones, not gates.**

1. **If `manifest_init` fails for any reason, destructive operations MUST abort immediately.** Never proceed with `rm` and generate the manifest afterward. A failed manifest gate invalidates authorization flow.

2. **Destructive scripts MUST verify, before any rm/mv/destructive execution:**
   - `manifest_writer.sh` was sourced successfully (function `manifest_init` is defined)
   - `manifest_init` returned exit code 0
   - `MANIFEST_PATH` environment variable is set and non-empty
   - The manifest file exists at `MANIFEST_PATH`

3. **All four checks are encapsulated in `manifest_init_strict <label>`** (added in v1.1.3 of `manifest_writer.sh`). Destructive scripts MUST use `manifest_init_strict` instead of bare `manifest_init`. Any script in this skill that still calls bare `manifest_init` is treated as broken.

4. **Post-hoc manifests are NOT a recovery pattern.** If a deletion happens without an active gate, the correct response is to log the breach honestly in any subsequent record-keeping (per the May 7 precedent), not to pretend the gate succeeded. The post-hoc record is a confession, not an audit.

5. **Failure exit codes are reserved:**
   - `99` = manifest_guard fired (no MANIFEST_PATH or file missing during delete loop)
   - `98` = manifest_init_strict failed (writer not sourced, or init returned non-zero, or MANIFEST_PATH empty/missing after init)

## TIER MODEL

### TIER 1 — AUTO-SAFE (manifest-gated, runs after one plan confirmation)

Reversible by regeneration. The OS or app rebuilds these.

| Item | Manifest entry | Notes |
|---|---|---|
| Trash | per top-level entry | reversible only via Time Machine |
| TM local snapshots | per snapshot ID | thinned via tmutil |
| Xcode DerivedData | per project dir | rebuilds on next compile |
| Xcode iOS DeviceSupport | per device dir | re-syncs from device |
| User log files | aggregate entry | OS regenerates |
| User caches (per-app top level) | per top-level cache dir | apps regenerate |
| npm cache | aggregate | native command |
| pip cache | aggregate | native command |
| brew cleanup | aggregate | native, reinstall reversible |
| Docker prune (NO --volumes) | aggregate | volumes preserved by default |

### TIER 2 — CONFIRM EACH (per-item)

Currently routed through ad-hoc confirmation in scripts. v1.2 will formalize a `tier2_review.sh` orchestrator. For now, treat as: doctor produces list → human reviews → executor deletes one at a time, each with its own manifest entry.

### TIER 3 — MIGRATE TO EXTERNAL SSD (preflight + manifest)

For music libraries, sample packs, big media. Two-gate pattern:

1. **Symlink preflight** (`symlink_preflight.sh`) MUST pass before `--symlink` mode
   - Verifies SSD writable
   - Refuses /System, /usr, /Volumes/* sources
   - Round-trip md5 test on a 1MB file via symlink
   - realpath resolution test
2. **migrate_audio.sh** then runs:
   - rsync copy
   - sampled md5 verification (20 random files)
   - second confirmation before delete
   - manifest record before delete
   - symlink only if preflight passed

If preflight fails for any reason, `--symlink` is refused and only copy-only mode is offered. Per reviewer guidance: "A broken symlink on a production music system becomes chaos fast."

### TIER 4 — FORBIDDEN

See ABSOLUTE PROHIBITIONS above.

## EXECUTION PROTOCOL

For any cleanup run:

1. **Read doctor state.** `~/.claude/state/mac-doctor/scan-*.json`. If older than 1 hour, run doctor first.
2. **Print plan with manifest path preview.** Show every destructive command + reason.
3. **One-shot confirm.** "Run Tier 1?" — single yes/no.
4. **Execute serially** with manifest-record-then-delete pattern.
5. **Measure delta** with `df -h /` before/after.
6. **Close manifest** with status.

## SUDO HANDLING

`tmutil thinlocalsnapshots` and Tier 3 deletes from `/Library` need sudo. Always:
1. Print exact command before invoking
2. Let macOS prompt for password (never pipe)
3. Sudo timeout aborts that step, run continues

## HARD STOPS

- df reports disk *fuller* after a run → STOP, alert
- estimated reclaim was >50 GB but actual <5 GB → STOP, investigate
- manifest_guard fires (no manifest open) → exit 99 immediately
- user types "stop" / Ctrl-C → STOP

## SCRIPTS

- `scripts/manifest_writer.sh` — sourced library, the gate
- `scripts/tier1_sweep.sh` — full Tier 1 auto-clean (manifest-gated)
- `scripts/thin_snapshots.sh` — TM snapshots only (manifest-gated)
- `scripts/migrate_audio.sh` — Tier 3 helper (preflight + manifest gates)
- `scripts/symlink_preflight.sh` — proves symlinks operational before use
- `scripts/dry_run.sh` — prints commands without executing

## COMMUNICATION TEMPLATE

```
TIER 1 SWEEP — COMPLETE
───────────────────────
Before:    XXX GB free
After:     XXX GB free
Reclaimed: XXX GB ✓
Manifest:  ~/.claude/state/mac-cleanup/manifests/manifest-tier1_sweep-<ts>.json

Top wins:
- TM snapshots: XX GB
- Caches: XX GB
- Docker: XX GB

Status: GREEN

Next: Tier 2 review available. ~XX GB more recoverable
with per-item approval. Want to proceed?
```

Status first. Numbers second. Manifest third. Decision needed fourth.
