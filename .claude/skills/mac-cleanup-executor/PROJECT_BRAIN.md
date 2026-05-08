# PROJECT_BRAIN — mac-cleanup-executor

Last updated: 2026-05-08  
Phase: **1.5 complete — adversarial hardening**  
Status: All 367 tests passing. No open regressions.

---

## 1. Phase History

### Phase 1 — Authoritative State Arbitration Layer (ASAL)
*Completed ~2026-05-07*

Added three new infrastructure layers beneath `manifest_writer.sh`. No production scripts modified.

- **journal.sh** + **_journal_helper.py**: append-only NDJSON event log; all I/O via Python for `fcntl.flock` + `fsync`
- **gate_primitive.sh**: gate lifecycle (open/guard/assert/close); exit codes 98/99; nested gate detection
- **resolve.sh** + **_resolve_helper.py**: read-only projection layer; priority matrix; TTL; conflict detection; confidence scoring
- **manifest_writer.sh** v1.2.0: delegation layer wiring gate + journal into the existing manifest API

Test totals at Phase 1 end: 168 assertions across 4 suites (test_journal, test_gate, test_manifest, test_resolve).

Full architectural record: `docs/phase1-checkpoint.md`

---

### Phase 1.5 — Adversarial Hardening
*Completed 2026-05-08*

Codex audit identified 6 HIGH issues + multiple MEDIUM/LOW gaps in the Phase 1 substrate.  
All critical and high-severity findings resolved. No new features.

#### Resolved HIGH/CRITICAL Findings

| Finding | Description | Fix | Verified by |
|---|---|---|---|
| **HIGH #1** | `physical_check` always `null` in MANIFEST_GATE events — no physical corroboration in StateEvents | Added `manifest_assert_physical` (v1.3.0); wired PHYSICAL assertions into tier1_sweep, thin_snapshots, migrate_audio | test_physical_writer.sh, test_thin_physical.sh, test_tier1_physical.sh |
| **HIGH #2** | `event_id` used `$RANDOM` (0–32767) — birthday collision at ~180 asserts per gate | Replaced with `os.urandom(8).hex()` in `_gate_build_event` — 16 hex chars, collision-free | test_gate.sh T10, test_source_priority_validation.sh |
| **HIGH #3** | `cmd_repair` in `_journal_helper.py` read/rewrote journal without holding `fcntl.flock` — concurrent write could interleave with repair | Added `flock(LOCK_EX, 5s timeout)` to `cmd_repair` matching `cmd_write`'s lock path | test_repair_locking.sh (5 tests: block proof, liveness proof, lock release on failure, replayable after repair, concurrent no-corruption) |
| **HIGH #4** | `manifest_close` wrote JSON footer claiming `"status": "completed"` BEFORE calling `gate_close` — if `gate_close` failed, manifest falsely claimed success | Reordered: `gate_close` runs first; on failure footer writes `"completed_with_gate_close_failure"`; `manifest_close` propagates non-zero rc | test_manifest_close_ordering.sh (13 tests) |
| **HIGH #5** | `manifest_record` returned 0 on write failure — caller had no signal to abort before destruction | Added `manifest_record_strict` (v1.4.0): exits 98 on any record failure, blocking the destructive step | test_record_strict.sh (13 tests) |
| **HIGH #6** | `gate.lock` stored only a plain PID integer — PID reuse made stale locks appear live; no operator recovery guidance on block | Extracted `_gate_lock_helper.py`: v2 JSON lock `{pid, created_at, host, cmd}`; backward-compat v1 read; stale/malformed auto-clear; live-lock prints `Lock file:` path + `rm` recovery command | test_gate_pid_lock.sh (20 tests: format proof, v1 compat, malformed clear, dead PID clear, live PID block with recovery hint) |

#### Additional Phase 1.5 Work

- **manifest_assert_physical**: Records PHYSICAL (source_priority=1) StateEvent from actual filesystem check. First path to HIGH confidence in projections.
- **exit trap pattern in migrate_audio.sh**: Ensures `manifest_close` fires on SIGTERM/SIGINT/ERR — tested in test_migrate_exit_trap.sh
- **replay `as_of` semantics hardened**: Explicit rejection of empty-string `as_of`; test_replay_as_of.sh covers 14 edge cases
- **source priority validation**: Cross-layer validation that priority integers match source string constants — test_source_priority_validation.sh

---

## 2. Architectural Overview

```
PRODUCTION SCRIPTS (tier1_sweep, thin_snapshots, migrate_audio)
  │ source
  ▼
manifest_writer.sh  v1.4.0  (delegation layer)
  manifest_init_strict / manifest_record_strict / manifest_assert_physical
  manifest_guard / manifest_close
  │ sources
  ▼
gate_primitive.sh  v1.1  (gate layer)
  gate_open_strict → journal_init → _gate_lock_acquire (PID lock)
  gate_assert → gate_guard → journal_append
  gate_close → journal_append(UNGATED) → _gate_lock_release
  │ sources
  ▼
journal.sh  (append-only journal)
  journal_init / journal_repair / journal_append / journal_replay
  │ exec
  ▼
_journal_helper.py  (Python I/O — flock+fsync)
  build_event / validate / write / repair / replay / read

_gate_lock_helper.py  (Python — PID lock management)
  acquire (O_EXCL atomic create, v2 JSON, stale/malformed auto-clear)
  release (PID verify, idempotent)

resolve.sh  (read-only projection — no writes)
  resolve / replay / audit / resolve_confidence
  │ exec
  ▼
_resolve_helper.py  (Python — resolution logic)
  resolve / audit / confidence / TTL / POST_HOC demotion
```

---

## 3. Authoritative Source Hierarchy

| Priority | Source | Confidence | Assigned by |
|---|---|---|---|
| 1 | `PHYSICAL` | HIGH | `manifest_assert_physical` or direct `gate_assert(..., "PHYSICAL", ...)` |
| 2 | `MANIFEST_GATE` | MEDIUM | `manifest_record` / `gate_assert` |
| 3 | `AGENT` | LOW | external agents via `gate_assert(..., "AGENT", ...)` |
| 4 | `INFERRED` | LOW | heuristic assertions |
| 3 (demoted) | `MANIFEST_GATE + POST_HOC_MANIFEST breach flag` | LOW | `_apply_post_hoc_demotion()` in resolve path |

Lower priority number wins in conflict. Same priority + same timestamp = UNCERTAIN.

---

## 4. Fail-Closed Semantics

| Exit code | Meaning | Trigger |
|---|---|---|
| 98 | Hard init failure | `gate_open_strict`/`manifest_init_strict` on any init failure; `manifest_record_strict` on write failure |
| 99 | Guard fired | `gate_guard`/`manifest_guard` with no active gate or missing journal |

Both codes are reserved and tested. A script that reaches a destructive operation without a live gate exits before touching the filesystem.

**gate_open_strict** post-open assertions (exits 98 if any fail):
1. `GATE_ID` non-empty
2. `JOURNAL_PATH` non-empty
3. Journal file exists at `JOURNAL_PATH`

**gate_guard** (called before every assert and before every destructive block):
1. `GATE_ID` non-empty
2. `JOURNAL_PATH` set AND `[ -f "$JOURNAL_PATH" ]`

---

## 5. PHYSICAL Corroboration Flow

```
manifest_record("/path", "1", "reason")          # MANIFEST_GATE assertion (priority 2)
  └─► gate_assert(path, MANIFEST_GATE)           # records pre-deletion state

[destructive operation: rm -rf "$path"]

manifest_assert_physical("/path")                # PHYSICAL assertion (priority 1)
  └─► gate_assert(path, PHYSICAL)               # records actual post-deletion state
      [[ -e "$path" || -L "$path" ]] → PRESENT|ABSENT

resolve("/path")
  └─► winner: PHYSICAL event (priority 1)
  └─► confidence: HIGH (PHYSICAL, no TTL expiry)
```

Before Phase 1.5: confidence ceiling was MEDIUM.  
After Phase 1.5: post-deletion PHYSICAL assertions yield HIGH confidence.  
Exception: virtual paths (`pip cache`, `docker images`, etc.) never have a physical filesystem entry — PHYSICAL assertions for these will always return ABSENT.

---

## 6. Replay / as_of Semantics

`replay(entity_id, as_of)` returns all StateEvents for `entity_id` with `asserted_at ≤ as_of`, ordered chronologically.

- Empty `as_of` → return 1 (no wall-clock access inside replay)
- `v > JOURNAL_MAX_SUPPORTED_SCHEMA` event → exit 2 (deterministic halt; events before unsupported version are still streamed)
- GATE lifecycle events (entity_type=GATE) are excluded from projection output — they are journal infrastructure

`resolve(entity_id, as_of)` applies the full priority matrix to the replay output:
1. Apply POST_HOC_MANIFEST demotion
2. Find winner (lowest source_priority; newer ts breaks ties at equal priority)
3. Check TTL
4. Compute confidence

---

## 7. PID Lock Model

**File**: `$HOME/.claude/state/mac-cleanup/gate.lock`  
**Manager**: `_gate_lock_helper.py` (acquire / release commands)

### v2 Lock Format (current)
```json
{"pid": 12345, "created_at": "2026-05-08T10:15:00Z", "host": "hostname", "cmd": "bash tier1_sweep.sh"}
```

### v1 Lock Format (legacy, read-only backward-compat)
```
12345
```

### Acquire logic
1. `O_EXCL` atomic create — succeeds → acquired
2. File exists → read v1 or v2 (malformed → treat as stale)
3. `os.kill(pid, 0)` — `ProcessLookupError` → dead (stale); `PermissionError` → alive (different owner); success → alive
4. Dead/malformed → `unlink` + re-`O_EXCL` create
5. Live → print FATAL diagnostic + recovery `rm` command, exit 1

### Live-lock diagnostic (stderr)
```
FATAL: gate lock held by PID 12345 (4m old, host=Denarius-Mac)
       cmd: bash tier1_sweep.sh
       Lock file: /Users/Denarius Motes/.claude/state/mac-cleanup/gate.lock
       To recover if process is gone: rm /Users/Denarius Motes/.claude/state/mac-cleanup/gate.lock
```

### Release logic
- Read lock (v1 or v2), verify PID = caller's `$$`
- `unlink` on match; WARN + exit 1 on mismatch; exit 0 on already-gone (idempotent)

---

## 8. Current Enforcement Guarantees

These are enforced by code, not convention. Cannot be bypassed without modifying infrastructure files.

1. **No destructive op without active gate** — `gate_guard` exits 99 if GATE_ID unset or journal missing
2. **No nested gate** — `gate_open_strict`/`manifest_init_strict` exit 98 if GATE_ID already set
3. **No manifest record without open gate** — `gate_assert` calls `gate_guard` first
4. **Journal writes are atomic** — `flock(LOCK_EX, 5s timeout)` before write in `cmd_write`
5. **Journal repairs are atomic** — `flock(LOCK_EX, 5s timeout)` before rewrite in `cmd_repair`
6. **Journal writes are durable** — `flush + fsync` on every write before lock release
7. **Journal repaired before first write** — `journal_init` calls `journal_repair` before any appends
8. **Projection is read-only** — `resolve.sh` / `_resolve_helper.py` contain zero write operations (verified T15 in test_resolve.sh: journal mtime/size/linecount unchanged after resolve)
9. **PHYSICAL beats all** — source_priority=1 hardcoded in `_gate_source_priority()` and resolve layer
10. **POST_HOC demotion is automatic** — `_apply_post_hoc_demotion()` in every resolve call
11. **Conflict = UNCERTAIN** — same priority + same timestamp never silently resolves
12. **GATE events excluded from projection** — `entity_type == "GATE"` events filtered in `_resolve_winner()`
13. **Record failures block destruction** — `manifest_record_strict` exits 98 on any write failure
14. **Footer reflects actual gate outcome** — `manifest_close` runs `gate_close` first; footer status degrades to `completed_with_gate_close_failure` if UNGATED event write fails
15. **Concurrent gate protection** — `gate.lock` PID file prevents two processes from holding simultaneous gates
16. **Stale locks auto-clear** — dead PID or malformed content cleared on acquire with no operator action
17. **Event IDs collision-resistant** — `os.urandom(8).hex()` in `_gate_build_event`; `os.urandom(4).hex()` suffix in `gate_assert`

---

## 9. Convention-Enforced Surfaces (Not Infrastructure-Enforced)

These require correct usage by callers. Not currently enforced by the infrastructure.

1. **`manifest_record` must be called BEFORE the destructive operation.** No ordering check exists. A post-deletion call records the wrong state.

2. **`manifest_guard` must be called before every destructive block.** Production scripts do this. New destructive paths added without a guard call are undetected.

3. **`manifest_init_strict` (not bare `manifest_init`) for production scripts.** Bare `manifest_init` issues a WARN but does not exit.

4. **Virtual paths are asserted by name, not filesystem.** `tier1_sweep.sh` asserts `"pip cache"`, `"brew cache"`, `"docker images"`, etc. These always resolve ABSENT from PHYSICAL checks. Correct by convention — MANIFEST_GATE is the appropriate source for these.

5. **`dry_run.sh` and `symlink_preflight.sh` are not journal-integrated.** Runs leave no journal trace.

6. **Multi-process serialization is only at gate-open time.** The PID lock prevents concurrent `gate_open` calls. Post-`gate_open` journal writes from independent processes (if one opened without the lock) are individually atomic but not sequenced at the gate level.

7. **`journal_read()` is implemented but unused.** No production script or test calls it.

---

## 10. Remaining Long-Horizon Risks

| ID | Risk | Severity | Status | Mitigation path |
|---|---|---|---|---|
| **R1** | Journal grows unbounded — no rotation or compaction; `resolve()` is O(N) on total events | LOW | Open | Phase 2: snapshot event + journal rotation |
| **R2** | Subshell export isolation — `$(manifest_init_strict)` won't propagate GATE_ID to parent | LOW | Open | Documentation only; pattern is in test comments |
| **R3** | Incomplete gate on crash (SIGKILL/OOM) — UNGATED event never written; manifest has no footer | LOW | Partially mitigated | gate_close failure now propagates; full fix requires Phase 2 crash-recovery scan |
| **R4** | Python hard-dependency — no shell fallback; failure at source time if `/usr/bin/python3` absent | LOW | Open | macOS ships Python 3 via Xcode CLT; acceptable risk |
| **R5** | Second-resolution timestamp conflicts — two asserts at same priority within 1s → UNCERTAIN | VERY LOW | Open | Unlikely in practice; Phase 2 sub-second timestamps if needed |
| **R6** | Virtual path PHYSICAL assertions — pip/brew/docker paths always ABSENT from filesystem | KNOWN DESIGN | Accepted | Convention: MANIFEST_GATE is correct source for virtual paths |

Previously open risk **R1 (multi-process gate interleaving)** is now CLOSED by the PID lock (HIGH #6).  
Previously open risk **R4 (no PHYSICAL writers)** is now CLOSED by `manifest_assert_physical` + production script integration (HIGH #1).

---

## 11. Test Suite Inventory

| Suite | Description | Assertions |
|---|---|---|
| `tests/test_journal.sh` | journal layer: init, repair, append, flock, replay, concurrent | 32 |
| `tests/test_gate.sh` | gate layer: open/guard/assert/close, locking, stale-lock, live-lock | 60 |
| `tests/test_gate_pid_lock.sh` | PID lock helper: v2 format, v1 compat, malformed, dead/live PID, release | 20 |
| `tests/test_manifest.sh` | manifest delegation layer: init_strict, record, close, guard | 55 |
| `tests/test_manifest_close_ordering.sh` | footer ordering, gate_close failure propagation, env cleanup | 13 |
| `tests/test_record_strict.sh` | manifest_record_strict: exit 98 on failure, success pass-through | 13 |
| `tests/test_physical_writer.sh` | manifest_assert_physical: PHYSICAL events, ABSENT state, evidence | 25 |
| `tests/test_resolve.sh` | projection layer: resolve, replay, audit, confidence, TTL, conflict | 46 |
| `tests/test_replay_as_of.sh` | replay semantics: empty as_of, future as_of, schema halt | 14 |
| `tests/test_source_priority_validation.sh` | priority integers match source string constants cross-layer | 17 |
| `tests/test_repair_locking.sh` | repair flock: blocks write, write blocks repair, no corruption | 5 |
| `tests/test_thin_physical.sh` | thin_snapshots.sh PHYSICAL integration | 19 |
| `tests/test_tier1_physical.sh` | tier1_sweep.sh PHYSICAL integration | 17 |
| `tests/test_migrate_exit_trap.sh` | migrate_audio.sh exit trap: manifest_close fires on SIGTERM/INT/ERR | 19 |
| `tests/test_migrate_physical.sh` | migrate_audio.sh PHYSICAL assertion after copy-verify | 12 |
| **Total** | | **367 / 367** |

---

## 12. Phase 2 Recommended Entry Points

Listed in priority order. Each is independent and can be taken in any order.

### P2-A: PHYSICAL assertions for pre-deletion state
Currently, `manifest_assert_physical` is called AFTER deletion to confirm ABSENT. Adding a PHYSICAL assert BEFORE deletion (to confirm the file exists at physical check time) closes the gap between manifest record time and actual deletion. This eliminates the case where an entity was deleted externally between `manifest_record` and the destructive operation.

### P2-B: `verify(entity_id)` command
Compares current filesystem state against the latest journal assertion via `resolve()`. If the resolved state is PRESENT but the filesystem shows ABSENT (or vice versa), writes a PHYSICAL StateEvent with a `POST_HOC_MANIFEST` breach flag. Surfaces as LOW confidence on next `resolve()`.

### P2-C: `rollback(gate_id)` command
Replays journal to a specific gate session. Lists all entities asserted during that gate and their pre-gate states. Produces a shell script to restore what is recoverable (e.g., from Trash or Time Machine). Requires a PHYSICAL pre-deletion assertion (P2-A) to have value.

### P2-D: Journal rotation and compaction
Cap journal at N MB or N events. Write a snapshot event (all entities → latest resolved state), then start a new journal file. Retain old journals for full-history queries. Required before long-term production use.

### P2-E: `resolve()` gate in production scripts
Before each deletion, call `resolve(entity_id)`. If confidence is UNCERTAIN, abort that item (not the entire run). If confidence is LOW or MEDIUM, proceed with a WARN logged. This prevents operating on entities whose state is disputed or unknown.

### P2-F: Audit CLI
Thin wrapper over `resolve.sh audit()` for human operators. `mac-cleanup-audit --since 2026-05-01 --entity-type PATH --confidence HIGH`. Useful for post-run review and incident investigation.

---

*Phase 1.5 complete — 2026-05-08*
