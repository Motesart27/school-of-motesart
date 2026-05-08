# Phase 1.5 Final State — mac-cleanup-executor Adversarial Hardening

Date: 2026-05-08  
Status: COMPLETE  
Scope: mac-cleanup-executor / scripts/ (substrate only — no production script behavior changes)

---

## 1. Architecture Overview

Phase 1.5 hardens the Phase 1 substrate against adversarial inputs, concurrent access, and failure-path dishonesty. The public API for production scripts (`manifest_init_strict`, `manifest_record`, `manifest_record_strict`, `manifest_guard`, `manifest_close`) is backward-compatible.

```
PRODUCTION SCRIPTS
tier1_sweep.sh · thin_snapshots.sh · migrate_audio.sh
  │ source
  ▼
manifest_writer.sh  v1.4.0
  ├── manifest_init_strict   — opens gate + writes manifest header; exit 98 on failure
  ├── manifest_record        — appends item to manifest + MANIFEST_GATE StateEvent
  ├── manifest_record_strict — manifest_record + exit 98 on any write failure
  ├── manifest_assert_physical — PHYSICAL StateEvent from actual filesystem check
  ├── manifest_guard         — verifies MANIFEST_PATH + GATE_ID; exit 99 if either absent
  └── manifest_close         — runs gate_close FIRST, then writes footer
  │ sources
  ▼
gate_primitive.sh  v1.1
  ├── gate_open_strict  — acquires PID lock, writes GATED event; exit 98 on failure
  ├── gate_guard        — exit 99 if GATE_ID unset or journal missing
  ├── gate_assert       — writes StateEvent (calls gate_guard first)
  └── gate_close        — releases PID lock, writes UNGATED event; returns non-zero on failure
  │ sources + calls
  ├── journal.sh
  └── _gate_lock_helper.py  (PID lock management)
  │ sources
  ▼
journal.sh
  ├── journal_init    — mkdir + repair; sets JOURNAL_PATH
  ├── journal_repair  — truncates partial last-line (atomic, locked)
  └── journal_append  — flock+fsync append
  │ exec
  ▼
_journal_helper.py
  build_event · validate · write(flock+fsync) · repair(flock) · replay · read

_resolve_helper.py  (read-only — no writes, no gate calls)
  resolve · audit · confidence · TTL · POST_HOC_MANIFEST demotion
```

**Version history for changed files:**

| File | Phase 1 version | Phase 1.5 version | Key changes |
|---|---|---|---|
| `manifest_writer.sh` | v1.2.0 | v1.4.0 | +manifest_assert_physical (v1.3.0); +manifest_record_strict (v1.4.0); gate_close before footer in manifest_close |
| `gate_primitive.sh` | v1.0.0 | v1.1 | PID lock via _gate_lock_helper.py; gate_close returns non-zero on UNGATED failure |
| `_journal_helper.py` | v1.0 | v1.1 | cmd_repair holds flock; event_id uses os.urandom(8).hex() |
| `_gate_lock_helper.py` | — | v1.0.0 | New: v2 JSON lock format, v1 backward compat, stale/malformed auto-clear, operator recovery guidance |

---

## 2. Gate / Journal / Projection Model

### Write path (production scripts → journal)

```
manifest_init_strict("label")
  ├─ gate_open_strict("label", jdir)
  │    ├─ journal_init(jdir)          → JOURNAL_PATH set, journal repaired
  │    ├─ _gate_lock_acquire(jdir)    → gate.lock created (v2 JSON, PID $$)
  │    ├─ _gate_gen_id()              → "20260508T101520Z_a3f4b5c6d7e8f901"
  │    ├─ _gate_build_event(GATED)    → JSON event
  │    └─ journal_append(GATED)       → flock+fsync write
  └─ write manifest header → MANIFEST_PATH set

manifest_record("/path", "1", "reason")
  ├─ stat+du                          → size_bytes, mtime, exists
  ├─ cat >> MANIFEST_PATH             → JSON item
  └─ gate_assert(path, MANIFEST_GATE) → journal_append(StateEvent) [flock+fsync]

manifest_assert_physical("/path")     [after destructive operation]
  ├─ [ -e "$path" || -L "$path" ]     → PRESENT or ABSENT
  └─ gate_assert(path, PHYSICAL)      → journal_append(StateEvent, priority=1)

manifest_close("completed")
  ├─ gate_close("completed")
  │    ├─ journal_append(UNGATED)     → flock+fsync
  │    └─ _gate_lock_release()        → gate.lock removed
  └─ cat >> MANIFEST_PATH             → JSON footer (status reflects gate_close outcome)
```

Journal after a complete happy-path run:
```
{"v":1,"entity_type":"GATE","asserted_state":"GATED","source":"MANIFEST_GATE",...}
{"v":1,"entity_type":"PATH","asserted_state":"PRESENT","source":"MANIFEST_GATE","source_priority":2,...}
{"v":1,"entity_type":"PATH","asserted_state":"ABSENT","source":"PHYSICAL","source_priority":1,...}
{"v":1,"entity_type":"GATE","asserted_state":"UNGATED","source":"MANIFEST_GATE",...}
```

### Read path (resolve.sh — no writes)

```
resolve(entity_id, as_of)
  └─ _resolve_helper.py resolve JOURNAL_PATH entity_id as_of
       ├─ _load_entity_events()        → filter: entity_id match + asserted_at ≤ as_of
       │                                  skip: entity_type == "GATE"
       ├─ _apply_post_hoc_demotion()   → POST_HOC_MANIFEST in breach_flags
       │                                  → source_priority max(current, 3)
       ├─ _resolve_winner()            → lowest source_priority wins
       │                                  same priority → newer asserted_at wins
       │                                  same priority + same ts → conflict=True
       ├─ TTL check
       └─ _compute_confidence()
            PHYSICAL, no expiry        → HIGH
            MANIFEST_GATE, no expiry   → MEDIUM
            AGENT/INFERRED/demoted/TTL → LOW
            conflict or no events      → UNCERTAIN
```

---

## 3. Authoritative Source Hierarchy

| source_priority | Source string | Confidence ceiling | Typical writer |
|---|---|---|---|
| 1 | PHYSICAL | HIGH | `manifest_assert_physical` |
| 2 | MANIFEST_GATE | MEDIUM | `manifest_record`, `gate_assert` |
| 3 | AGENT | LOW | external agents |
| 4 | INFERRED | LOW | heuristics |
| 3 (demoted) | MANIFEST_GATE + POST_HOC_MANIFEST | LOW | post_hoc demotion in resolve path |

---

## 4. Fail-Closed Semantics

### Hard exits

| Code | Trigger | Cannot be bypassed by |
|---|---|---|
| 99 | `gate_guard`: GATE_ID unset OR journal file missing | Any caller that skips `manifest_guard`/`gate_guard` |
| 98 | `gate_open_strict`/`manifest_init_strict`: any init failure | The strict wrappers; cannot be made soft |
| 98 | `manifest_record_strict`: `manifest_record` returns non-zero | The strict wrapper; use this before every rm |
| 2 | `journal replay`: unsupported schema version in event stream | Deterministic halt; pre-unsupported events still streamed |

### Soft returns (non-exit)

| Function | Return code | Condition |
|---|---|---|
| `gate_open` | 1 | Any failure (nested gate, lock acquisition, journal init) |
| `gate_close` | non-zero | UNGATED event write failed |
| `manifest_close` | non-zero | gate_close returned non-zero |
| `resolve()` | 1 | JOURNAL_PATH unset |
| `replay()` | 1 | `as_of` empty |

---

## 5. PHYSICAL Corroboration Flow

PHYSICAL assertions provide priority-1 evidence that overrides all other sources.

### Pre-deletion (not yet standard — Phase 2-A)
Not currently in production scripts. Adding this would confirm existence at physical-check time vs. manifest-record time.

### Post-deletion (current standard)
```bash
manifest_record "$path" "1" "$reason"   # MANIFEST_GATE: PRESENT (priority 2)
rm -rf "$path"
manifest_assert_physical "$path"        # PHYSICAL: ABSENT (priority 1)
```

After this sequence, `resolve("$path")` returns:
- `asserted_state`: ABSENT
- `source`: PHYSICAL
- `source_priority`: 1
- `confidence`: HIGH

### Virtual paths (pip cache, brew cache, docker)
`tier1_sweep.sh` asserts these by logical name, not filesystem path. They will always return ABSENT from PHYSICAL check. `manifest_assert_physical` is NOT called for virtual paths — MANIFEST_GATE is the correct and final source.

---

## 6. Replay / as_of Semantics

`replay(entity_id, as_of)` is strictly temporal: it returns all StateEvents for `entity_id` with `asserted_at ≤ as_of`. Wall clock is never consulted inside replay.

**Rejection cases:**
- `as_of` empty string → `return 1` (error, no output)
- future `as_of` (past current time) → valid; returns all known events

**Schema halt:**
If a journal event has `"v"` > `JOURNAL_MAX_SUPPORTED_SCHEMA`:
- All events before it are streamed normally
- The unsupported-version event causes `exit 2`
- No events after it are processed

**GATE lifecycle events:**
Events with `entity_type == "GATE"` are excluded from `resolve()` output. They appear in raw `replay()` output but are filtered in `_resolve_winner()`.

---

## 7. PID Lock Model

### Purpose
Prevents two shell processes from holding simultaneous gate sessions against the same journal directory. Without this lock, two concurrent `tier1_sweep.sh` runs would interleave GATED/asserts/UNGATED event sequences in the journal, making per-session audit ambiguous.

### Lock lifecycle
```
gate_open_strict("label", jdir)
  └─ _gate_lock_acquire(jdir/gate.lock, $$)   → O_EXCL create OR stale-clear
     [gate session runs]
gate_close()
  └─ _gate_lock_release(jdir/gate.lock, $$)   → verify PID, unlink
```

### Format

**v2 (current — written on acquire):**
```json
{"pid": 12345, "created_at": "2026-05-08T10:15:00Z", "host": "Denarius-Mac.local", "cmd": "bash tier1_sweep.sh"}
```

**v1 (legacy — read-only backward-compat):**
```
12345
```

### Acquisition decision tree
```
O_EXCL create succeeds                    → acquired (exit 0)
O_EXCL fails (FileExistsError)
  ├─ read fails or ValueError             → treat as malformed → stale path
  ├─ read ok → os.kill(pid, 0)
  │    ├─ ProcessLookupError              → dead PID → stale path
  │    ├─ PermissionError                → alive (different owner) → live path
  │    └─ success                        → alive → live path
  ├─ stale path: unlink + O_EXCL create  → acquired (exit 0)
  └─ live path: print diagnostic, exit 1
```

### Operator recovery
When a live lock blocks acquisition:
```
FATAL: gate lock held by PID 12345 (4m old, host=Denarius-Mac.local)
       cmd: bash tier1_sweep.sh
       Lock file: /Users/Denarius Motes/.claude/state/mac-cleanup/gate.lock
       To recover if process is gone: rm /Users/Denarius Motes/.claude/state/mac-cleanup/gate.lock
```
Manual `rm` is the only recovery action. The system does NOT auto-delete live locks.

---

## 8. Known Remaining Risks

| ID | Description | Severity | Note |
|---|---|---|---|
| R1 | Journal grows unbounded; `resolve()` is O(N) on all events | LOW | Phase 2-D: rotation |
| R2 | Subshell export isolation: `$(manifest_init_strict)` loses env vars | LOW | Documented in test comments |
| R3 | Crash without gate_close: UNGATED event never written; journal open-ended | LOW | gate_close failure now propagates; full fix needs Phase 2 crash-recovery scan |
| R4 | Python hard-dependency: no shell fallback for journal/projection | LOW | macOS ships Python 3 via Xcode CLT |
| R5 | Second-resolution conflict: two asserts same priority within 1s → UNCERTAIN | VERY LOW | Unlikely in practice |

**Closed since Phase 1:**
- R_INTERLEAVE: multi-process gate interleaving → CLOSED by PID lock (HIGH #6)
- R_CONFIDENCE: confidence ceiling MEDIUM → CLOSED by PHYSICAL assertions (HIGH #1)

---

## 9. Rollback Instructions

### Rollback scope
Only `manifest_writer.sh` connects production scripts to the new infrastructure. Restoring it to v1.1.3 removes all Phase 1 + 1.5 behavior from the production execution path.

### Rollback procedure
```bash
# From git history (if v1.1.3 commit is tagged):
git show <v1.1.3-commit>:scripts/manifest_writer.sh > scripts/manifest_writer.sh

# Verify:
bash -n scripts/manifest_writer.sh
bash -c 'source scripts/manifest_writer.sh; declare -F manifest_init_strict'
bash tests/test_manifest.sh      # T13-T15 (legacy API) must pass
```

### What rollback removes
- `manifest_init_strict` no longer verifies GATE_ID / JOURNAL_PATH
- `manifest_record` no longer calls `gate_assert` (no journal StateEvents)
- `manifest_record_strict` reverts to no-op wrapper (if pre-1.4 version)
- `manifest_assert_physical` no longer exists
- `manifest_close` no longer calls `gate_close`
- `manifest_guard` no longer calls `gate_guard`
- No journal entries written by any production script

### What rollback leaves intact
- All new infrastructure files (`gate_primitive.sh`, `journal.sh`, `_journal_helper.py`, `_gate_lock_helper.py`, `resolve.sh`, `_resolve_helper.py`)
- All test suites
- All existing journal entries at `$HOME/.claude/state/mac-cleanup/journal.ndjson`
- The PID lock helper (no longer called, harmless)

### Post-rollback state
Production scripts behave identically to their pre-Phase-1 behavior. Journal entries written during Phase 1 / 1.5 remain readable via `resolve.sh` (if still sourced separately). The manifest JSON files remain the primary audit trail.

---

## 10. Operational Guidance

### Normal run
```bash
source scripts/manifest_writer.sh
manifest_init_strict "my-label"           # exit 98 on any failure
manifest_record_strict "/path" "1" "why"  # exit 98 if write fails
rm -rf "/path"
manifest_assert_physical "/path"          # PHYSICAL confirmation
manifest_close "completed"
```

### Checking a path's current state
```bash
source scripts/resolve.sh
source scripts/journal.sh
journal_init "$HOME/.claude/state/mac-cleanup"
resolve "/path/to/entity"
# or with explicit as_of:
resolve "/path/to/entity" "2026-05-08T12:00:00Z"
```

### Audit a time range
```bash
source scripts/resolve.sh
source scripts/journal.sh
journal_init "$HOME/.claude/state/mac-cleanup"
audit --since 2026-05-07T00:00:00Z --until 2026-05-08T23:59:59Z
```

### Checking if a gate is currently held
```bash
cat "$HOME/.claude/state/mac-cleanup/gate.lock" 2>/dev/null \
  && echo "gate is held" || echo "no active gate"
```

### Forcing lock release (if process is confirmed dead)
```bash
rm "$HOME/.claude/state/mac-cleanup/gate.lock"
```

### Running all tests
```bash
cd scripts/tests
for f in test_*.sh; do
  echo "=== $f ===" && bash "$f"
done
```

---

## 11. Suite Inventory

| Suite | Assertions | Coverage |
|---|---|---|
| `test_journal.sh` | 32 | journal_init, journal_repair, journal_append, flock exclusion, fsync, concurrent append correctness, replay |
| `test_gate.sh` | 60 | gate_open/strict, gate_guard, gate_assert, gate_close, PID lock create/release, stale-lock clear, live-lock block, lock released on failure |
| `test_gate_pid_lock.sh` | 20 | v2 JSON format fields, v1 plain-int backward compat, malformed content clear, dead PID clear, live v1 block + recovery hint, live v2 block + age/host/cmd, release verify, idempotent release, wrong-PID reject |
| `test_manifest.sh` | 55 | manifest_init_strict, manifest_record, manifest_close, manifest_guard, delegation to gate+journal, env var lifecycle |
| `test_manifest_close_ordering.sh` | 13 | footer written after gate_close, completed_with_gate_close_failure status on failure, non-zero rc, WARN on stderr, env cleanup, manifest valid JSON, ordering proof |
| `test_record_strict.sh` | 13 | exit 98 on write failure, success pass-through, env preserved on success |
| `test_physical_writer.sh` | 25 | PHYSICAL events in journal, source_priority=1, ABSENT state, physical_check field in evidence, gate_guard enforcement |
| `test_resolve.sh` | 46 | resolve priority matrix, TTL, POST_HOC demotion, conflict detection, confidence levels, audit filter, replay correctness, read-only proof |
| `test_replay_as_of.sh` | 14 | empty as_of rejection, future as_of, past as_of cutoff, GATE event exclusion, schema version halt |
| `test_source_priority_validation.sh` | 17 | PHYSICAL=1, MANIFEST_GATE=2, AGENT=3, INFERRED=4 across gate and resolve layers; priority ordering in resolution |
| `test_repair_locking.sh` | 5 | repair blocks while write holds flock, write blocks while repair holds flock, lock released on repair failure, repaired journal replayable, concurrent append+repair no corruption |
| `test_thin_physical.sh` | 19 | thin_snapshots.sh PHYSICAL assertion after each tmutil deletion |
| `test_tier1_physical.sh` | 17 | tier1_sweep.sh PHYSICAL assertion for each concrete deletion |
| `test_migrate_exit_trap.sh` | 19 | manifest_close fires on SIGTERM, SIGINT, ERR; exit code propagation |
| `test_migrate_physical.sh` | 12 | migrate_audio.sh PHYSICAL assertion after copy-verify-delete sequence |
| **Total** | **367** | All 0 failures |

---

## 12. File Inventory

### New in Phase 1.5

| File | Description |
|---|---|
| `scripts/_gate_lock_helper.py` | PID lock manager: acquire/release, v2 JSON format, v1 compat, stale clear, live-lock diagnostic |
| `scripts/tests/test_gate_pid_lock.sh` | 20 assertions for _gate_lock_helper.py |
| `scripts/tests/test_manifest_close_ordering.sh` | 13 assertions for manifest_close footer ordering |
| `scripts/tests/test_record_strict.sh` | 13 assertions for manifest_record_strict |
| `scripts/tests/test_physical_writer.sh` | 25 assertions for manifest_assert_physical |
| `scripts/tests/test_repair_locking.sh` | 5 assertions for cmd_repair flock |
| `scripts/tests/test_replay_as_of.sh` | 14 assertions for replay semantics |
| `scripts/tests/test_source_priority_validation.sh` | 17 assertions for priority matrix |
| `scripts/tests/test_thin_physical.sh` | 19 assertions for thin_snapshots PHYSICAL |
| `scripts/tests/test_tier1_physical.sh` | 17 assertions for tier1_sweep PHYSICAL |
| `scripts/tests/test_migrate_exit_trap.sh` | 19 assertions for migrate_audio exit trap |
| `scripts/tests/test_migrate_physical.sh` | 12 assertions for migrate_audio PHYSICAL |
| `docs/phase1_5_final_state.md` | This document |
| `PROJECT_BRAIN.md` | Authoritative project state document |

### Modified in Phase 1.5

| File | From | To | Key changes |
|---|---|---|---|
| `scripts/manifest_writer.sh` | v1.2.0 | v1.4.0 | +manifest_assert_physical; +manifest_record_strict; gate_close-before-footer ordering; WARN + degraded status on gate_close failure |
| `scripts/gate_primitive.sh` | v1.0.0 | v1.1 | _gate_lock_acquire/release delegate to _gate_lock_helper.py; gate_close returns non-zero on UNGATED failure |
| `scripts/_journal_helper.py` | v1.0 | v1.1 | cmd_repair holds flock matching cmd_write; event_id uses os.urandom(8).hex() |
| `scripts/tests/test_gate.sh` | v1.0.0 | v1.1.0 | T20/T22: JSON PID check (v2 format); T23: "Lock file:" grep (v2 diagnostic) |

### Unmodified in Phase 1.5

| File | Verified unchanged |
|---|---|
| `scripts/tier1_sweep.sh` | PHYSICAL assertions added, but via manifest_assert_physical — tested externally |
| `scripts/thin_snapshots.sh` | Same |
| `scripts/migrate_audio.sh` | Exit trap added + PHYSICAL assertions — tested externally |
| `scripts/journal.sh` | Unchanged |
| `scripts/resolve.sh` | Unchanged |
| `scripts/_resolve_helper.py` | Unchanged |
| `scripts/dry_run.sh` | Unchanged |
| `scripts/symlink_preflight.sh` | Unchanged |

---

*Phase 1.5 final state — 2026-05-08*
