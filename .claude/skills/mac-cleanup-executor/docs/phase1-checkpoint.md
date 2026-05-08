# Phase 1 Checkpoint — Authoritative State Arbitration Layer (ASAL)

Date: 2026-05-08  
Status: COMPLETE  
Scope: mac-cleanup-executor / scripts/

---

## 1. Architecture Summary

Phase 1 adds three new infrastructure layers beneath the existing `manifest_writer.sh`. No production scripts were modified.

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCTION SCRIPTS  (unchanged)                                │
│  tier1_sweep.sh  ·  thin_snapshots.sh  ·  migrate_audio.sh     │
└────────────────────────┬────────────────────────────────────────┘
                         │ source
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  manifest_writer.sh  v1.2.0  (delegation layer)                 │
│  Legacy API: manifest_init_strict, manifest_guard,              │
│              manifest_record, manifest_close                    │
│  New: drives gate + journal in tandem with MANIFEST_PATH        │
└────────┬───────────────────────────────────────────────────────-┘
         │ sources
         ▼
┌────────────────────────────────────────────────────────────────-┐
│  gate_primitive.sh  v1.0.0  (gate layer)                        │
│  gate_open · gate_open_strict · gate_guard                      │
│  gate_assert · gate_close                                       │
│  Exit codes: 98 = bad gate init  99 = guard fired               │
└────────┬───────────────────────────────────────────────────────-┘
         │ sources
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  journal.sh  v1.0.0  (append-only journal layer)                │
│  journal_init · journal_repair · journal_append                 │
│  journal_read · journal_replay                                  │
└────────┬───────────────────────────────────────────────────────-┘
         │ exec
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  _journal_helper.py  (Python subprocess — all I/O atomicity)    │
│  validate · write (flock+fsync) · read · replay                 │
│  repair · build_event                                           │
└─────────────────────────────────────────────────────────────────┘

                   (separate read-only path)

┌─────────────────────────────────────────────────────────────────┐
│  resolve.sh  v1.0.0  (projection layer — no writes)             │
│  resolve · replay · audit · resolve_confidence                  │
└────────┬───────────────────────────────────────────────────────-┘
         │ exec
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  _resolve_helper.py  (Python subprocess — resolution logic)     │
│  resolve · audit · confidence                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- `manifest_writer.sh` is the only file touched in the production call chain. All production callers (`tier1_sweep.sh`, `thin_snapshots.sh`, `migrate_audio.sh`) work unchanged.
- Gate and journal layers are sourced-only (never executed directly). `BASH_SOURCE[0]` guards enforce this.
- All journal I/O goes through Python to get `fcntl.flock` and `fsync`. Bash has neither natively on macOS.
- The projection layer (`resolve.sh` + `_resolve_helper.py`) is entirely read-only. It contains no `journal_append` calls and no `gate_open`/`gate_assert` calls.
- Resolution rules (priority matrix, conflict detection, TTL, POST_HOC_MANIFEST demotion) are implemented once in `_resolve_helper.py`. No shell script duplicates them.

---

## 2. Files Added / Changed

### Added (new files)

| File | Layer | Size | Description |
|---|---|---|---|
| `scripts/journal.sh` | Journal | 5,780 B | Shell wrappers: init, repair, append, read, replay |
| `scripts/_journal_helper.py` | Journal | 10,963 B | Python I/O: flock, fsync, validate, write, repair, replay, build_event |
| `scripts/gate_primitive.sh` | Gate | 8,803 B | gate_open, gate_open_strict, gate_guard, gate_assert, gate_close |
| `scripts/resolve.sh` | Projection | 4,535 B | resolve, replay, audit, resolve_confidence — sourced only |
| `scripts/_resolve_helper.py` | Projection | 11,357 B | Python: resolution rules, TTL, demotion, audit, confidence |
| `scripts/tests/test_journal.sh` | Tests | 26,602 B | 32 assertions — journal layer |
| `scripts/tests/test_gate.sh` | Tests | 21,850 B | 39 assertions — gate layer |
| `scripts/tests/test_manifest.sh` | Tests | 25,038 B | 51 assertions — manifest delegation |
| `scripts/tests/test_resolve.sh` | Tests | 27,054 B | 46 assertions — projection layer |

### Modified

| File | Change | Version |
|---|---|---|
| `scripts/manifest_writer.sh` | Delegation layer: sources gate_primitive.sh; manifest_init drives gate_open; manifest_record drives gate_assert; manifest_close drives gate_close; manifest_init_strict verifies GATE_ID + JOURNAL_PATH | v1.1.3 → v1.2.0 |

### Unmodified (confirmed)

| File | MD5 |
|---|---|
| `scripts/tier1_sweep.sh` | `1229088fc414fb4570cde02bf1199029` |
| `scripts/thin_snapshots.sh` | `2ee9aa87e667bedd4300445e3a8549d5` |
| `scripts/migrate_audio.sh` | `bbd3fc602770d4f940a5f538f314596b` |
| `scripts/dry_run.sh` | unchanged |
| `scripts/symlink_preflight.sh` | unchanged |

---

## 3. Dependency Graph

```
tier1_sweep.sh ──────────────────────────────────────────────────┐
thin_snapshots.sh ───────────────────────────────────────────────┤
migrate_audio.sh ────────────────────────────────────────────────┤
                                                                  │ source
                                                                  ▼
                                                     manifest_writer.sh
                                                      │           │
                                              MANIFEST_PATH    source
                                            (legacy .json)        │
                                                                  ▼
                                                       gate_primitive.sh
                                                              │
                                                           source
                                                              │
                                             ┌────────────────▼──────────────────┐
                                             │           journal.sh               │
                                             │  (sourced by gate_primitive.sh     │
                                             │   and also by resolve.sh)          │
                                             └────────────────┬──────────────────┘
                                                              │ exec
                                                              ▼
                                                    _journal_helper.py
                                                 (validate, write/flock/fsync,
                                                  read, replay, repair,
                                                  build_event)

resolve.sh ──────────────┐
                         │ sources
                         ▼
                     journal.sh (for journal_replay only)
                         │ exec
                         ▼
                _journal_helper.py (replay command)

resolve.sh ──────────────────────────────────────────────────────┐
                                                                  │ exec
                                                                  ▼
                                                     _resolve_helper.py
                                                  (resolve, audit, confidence)
```

**Runtime dependency chain for a single `manifest_record` call:**

```
manifest_record(path, tier, reason)
  └─► manifest_writer.sh
        ├─► stat/du/printf/sed  (file inspection)
        ├─► cat >> MANIFEST_PATH  (manifest JSON append)
        └─► gate_assert(path, "PATH", state, "MANIFEST_GATE", evidence_json)
              └─► gate_primitive.sh
                    ├─► gate_guard()  [exit 99 if no GATE_ID]
                    ├─► _gate_build_event(...)
                    │     └─► /usr/bin/python3 _journal_helper.py build_event
                    └─► journal_append(event_json)
                          └─► /usr/bin/python3 _journal_helper.py write
                                ├─► fcntl.flock(LOCK_EX, timeout=5s)
                                ├─► json.loads (validate)
                                ├─► f.write(line + "\n")
                                ├─► f.flush() + os.fsync()
                                └─► fcntl.flock(LOCK_UN)
```

---

## 4. Event Flow Diagram

### Full gate lifecycle (happy path)

```
manifest_init_strict("label")
  │
  ├─► gate_open("label", jdir)
  │     ├─► journal_init(jdir)
  │     │     ├─► mkdir -p jdir
  │     │     ├─► journal_repair(journal.ndjson)  ← truncate partial last-line
  │     │     └─► sets JOURNAL_PATH, JOURNAL_DIR, JOURNAL_LOCK
  │     ├─► _gate_gen_id()  → "20260508T101520Z_06767332f0b5ee3c"
  │     ├─► _gate_build_event(GATED, entity_type=GATE)
  │     ├─► journal_append(GATED event)  ← flock+fsync
  │     └─► export GATE_ID="...", GATE_LABEL="label"
  │
  ├─► write manifest header → export MANIFEST_PATH
  └─► verify MANIFEST_PATH file + GATE_ID + JOURNAL_PATH file  [exit 98 if any missing]

                        JOURNAL: [GATED event]

manifest_record("/path/to/file", "1", "reason")
  ├─► stat+du → size_bytes, mtime, exists
  ├─► cat >> MANIFEST_PATH  (JSON item)
  └─► gate_assert("/path/to/file", "PATH", "PRESENT"|"ABSENT", "MANIFEST_GATE", evidence)
        ├─► gate_guard()  [exit 99 if GATE_ID unset]
        ├─► _gate_build_event(StateEvent)
        └─► journal_append(StateEvent)

                        JOURNAL: [GATED, ASSERT_1]

manifest_record("/path/to/other", ...)
  └─► gate_assert(...)  → journal_append(StateEvent)

                        JOURNAL: [GATED, ASSERT_1, ASSERT_2]

manifest_close("completed")
  ├─► cat >> MANIFEST_PATH  (JSON footer: completed_at, status)
  └─► gate_close("completed")
        ├─► _gate_build_event(UNGATED, entity_type=GATE)
        ├─► journal_append(UNGATED event)
        └─► unset GATE_ID, GATE_LABEL

                        JOURNAL: [GATED, ASSERT_1, ASSERT_2, UNGATED]
```

### Projection query (read-only, any time after events exist)

```
resolve("/path/to/file", "2026-05-08T12:00:00Z")
  │
  └─► _resolve_helper.py resolve JOURNAL_PATH entity_id as_of
        ├─► _load_entity_events(path, entity_id, as_of)
        │     filter: entity_id matches + asserted_at <= as_of
        │     skips GATE lifecycle events (entity_type=GATE)
        ├─► _apply_post_hoc_demotion(events)
        │     POST_HOC_MANIFEST in breach_flags + source=MANIFEST_GATE
        │     → source_priority max(current, 3)
        ├─► _resolve_winner(events)
        │     lower source_priority wins
        │     same priority → newer asserted_at wins
        │     same priority + same ts → conflict=True
        ├─► TTL check (asserted_at + ttl_seconds vs check_time)
        └─► _compute_confidence(winner, ttl_expired)
              → HIGH (PHYSICAL, no expiry)
              → MEDIUM (MANIFEST_GATE, no expiry)
              → LOW (AGENT/INFERRED/demoted/TTL expired)
              → UNCERTAIN (conflict or no events)

Output: StateRecord JSON
{
  "entity_id": "/path/to/file",
  "asserted_state": "PRESENT",
  "source": "MANIFEST_GATE",
  "source_priority": 2,
  "confidence": "MEDIUM",
  "asserted_at": "2026-05-08T10:15:20Z",
  "gate_id": "20260508T101520Z_...",
  "ttl_expired": false,
  "conflict": false,
  "as_of": "2026-05-08T12:00:00Z"
}
```

### Failure paths

```
gate_open_strict("label")
  ├── GATE_ID already set? → exit 98 (nested gate — hard stop)
  ├── journal_init fails (e.g., mkdir permission denied)? → exit 98
  ├── GATE_ID empty after open? → exit 98
  └── JOURNAL_PATH file missing after open? → exit 98

gate_guard()  [called by gate_assert and manifest_guard]
  ├── GATE_ID unset? → exit 99
  └── JOURNAL_PATH file missing? → exit 99

resolve() without JOURNAL_PATH set → return 1 (not exit — safe for sourced callers)
replay() without as_of → return 1 (not exit — safe for sourced callers)
replay() with v > JOURNAL_MAX_SUPPORTED_SCHEMA → exit 2 (deterministic halt)
```

---

## 5. Gate / Journal / Projection Interaction Map

```
                WRITE PATH                          READ PATH
                (production scripts)                (audit / verification tools)

  manifest_init_strict                               resolve(entity_id, [as_of])
        │                                                     │
        ▼                                                     ▼
    gate_open ──────────────────────────────────► JOURNAL_PATH (set by gate_open)
        │                                                     │
        ▼                                                     ▼
  journal_init ───────────────────────────────► _resolve_helper.py
  journal_repair                                  (no writes, no gate calls)
        │
        ▼
  JOURNAL_PATH = $HOME/.claude/state/mac-cleanup/journal.ndjson

  gate_assert ──────────────────────────► journal_append ──► _journal_helper.py
    source_priority via _gate_source_priority()       flock + write + fsync

  gate_close ───────────────────────────► journal_append (UNGATED) ──► unset GATE_ID

                     JOURNAL (NDJSON, append-only, fsynced)
                     ├── {v:1, entity_type:GATE, asserted_state:GATED, ...}
                     ├── {v:1, entity_type:PATH, source:MANIFEST_GATE, ...}
                     ├── {v:1, entity_type:PATH, source:MANIFEST_GATE, ...}
                     └── {v:1, entity_type:GATE, asserted_state:UNGATED, ...}
                                          │
                                          │  (read by)
                              ┌───────────┼─────────────────┐
                              ▼           ▼                  ▼
                           resolve()   replay()           audit()
                           winner +    stream to          filter by
                           StateRecord as_of cutoff       since/until/etype
```

**Env var ownership:**

| Variable | Set by | Cleared by | Used by |
|---|---|---|---|
| `GATE_ID` | `gate_open` | `gate_close` | `gate_guard`, `gate_assert`, `manifest_init_strict` verify |
| `GATE_LABEL` | `gate_open` | `gate_close` | `gate_close` (UNGATED event entity_id) |
| `JOURNAL_PATH` | `journal_init` | never (persists for process lifetime) | `gate_guard`, `journal_append`, `resolve` |
| `JOURNAL_DIR` | `journal_init` | never | `journal_init` only |
| `JOURNAL_LOCK` | `journal_init` | never | `_journal_helper.py` (not used directly by shell) |
| `MANIFEST_PATH` | `manifest_init` | `manifest_close` (sets to empty implicitly via unset) | `manifest_guard`, `manifest_record` |
| `MANIFEST_FIRST_ITEM` | `manifest_init` | `manifest_record` (sets to 0) | `manifest_record` |

---

## 6. Infrastructure-Enforced Guarantees

These properties are enforced by code, not convention. They cannot be bypassed without modifying the infrastructure files.

1. **No destructive operation without active gate.** `gate_guard()` exits 99 if `GATE_ID` is unset or `JOURNAL_PATH` file is absent. Every `gate_assert` call (and thus every `manifest_record`) calls `gate_guard` first. `manifest_guard` also calls `gate_guard` directly.

2. **No nested gate.** `gate_open` returns 1 (soft). `gate_open_strict` and `manifest_init_strict` exit 98 if `GATE_ID` is already set.

3. **No journal without a live file.** `gate_guard` verifies `[ -f "$JOURNAL_PATH" ]`. If the file disappears mid-run, the next guard call halts.

4. **Journal writes are atomic with respect to concurrent bash processes.** `_journal_helper.py write` acquires `fcntl.flock(LOCK_EX)` with a 5-second timeout before writing. Concurrent appends do not interleave.

5. **Journal writes are durable.** `f.flush()` + `os.fsync(fd)` is called on every write before releasing the lock.

6. **Journal is repaired before first write after restart.** `journal_init` calls `journal_repair` before accepting any appends. Partial last-lines from prior crashes are truncated.

7. **Projection is read-only.** `resolve.sh` and `_resolve_helper.py` contain no `journal_append`, `gate_open`, `gate_assert`, or any write operation. Verified by code review and `T15` (journal mtime/size/linecount unchanged after resolve + audit).

8. **PHYSICAL beats MANIFEST_GATE beats AGENT beats INFERRED.** Source priority matrix is hardcoded in `_gate_source_priority()` (gate layer) and `_compute_confidence()` (resolve layer): PHYSICAL=1, MANIFEST_GATE=2, AGENT=3, INFERRED=4.

9. **POST_HOC_MANIFEST breach flag demotes MANIFEST_GATE to AGENT priority.** `_apply_post_hoc_demotion()` in `_resolve_helper.py` promotes `source_priority` to `max(current, 3)` when `POST_HOC_MANIFEST` is in `evidence.breach_flags`.

10. **Conflict (same priority + same timestamp) resolves to UNCERTAIN.** Not silently dropped — the StateRecord includes `"conflict": true`.

11. **TTL expiry downgrades confidence, not state.** `ttl_expired=True` sets `confidence=LOW` but preserves `asserted_state`. The entity is still known to have been in that state; the information is stale.

12. **GATE lifecycle events are excluded from state projection.** `_resolve_winner()` skips events where `entity_type == "GATE"`. GATED/UNGATED events are journal infrastructure, not entity state.

13. **Malformed journal events are logged, not swallowed.** `RESOLVE_WARN` (resolve path) and `AUDIT_WARN` (audit path) are written to stderr. Processing continues on valid events.

14. **Replay without `as_of` is rejected.** `replay()` returns 1 (not exit) if `as_of` is absent. No wall clock reads permitted inside replay.

15. **Replay halts deterministically on unsupported schema version.** Exit code 2 from `_journal_helper.py replay` propagates through `journal_replay` → `resolve.sh replay()`. Events before the unsupported-version event are streamed; events at and after are not.

---

## 7. Convention-Enforced Surfaces (Not Infrastructure-Enforced)

These properties depend on correct usage by callers. They are not currently enforced by the infrastructure.

1. **Production scripts must call `manifest_init_strict`, not bare `manifest_init`.** `manifest_init` succeeds with softer failure behavior. `manifest_init_strict` is the fail-closed entry point. Nothing prevents a caller from using the bare version.

2. **`manifest_record` must be called before the destructive operation, not after.** The StateEvent records state at assertion time. If called after deletion, the event records the post-deletion state, not the pre-deletion state. No ordering check exists.

3. **`manifest_guard` must be called before every destructive block.** Production scripts already do this, but there is no automated check that every destructive path is guarded. A new destructive path added to a production script without a `manifest_guard` call would be undetected.

4. **`evidence.physical_check` is always `null` in current MANIFEST_GATE events.** The manifest_record function captures `exists_at_record_time` in the JSON side-car but does not propagate it to the StateEvent `evidence.physical_check` field. Physical verification at assertion time is convention (check the manifest JSON), not infrastructure (not in the StateEvent).

5. **All current StateEvents are source=MANIFEST_GATE (priority 2).** No production script currently writes a PHYSICAL (priority 1) StateEvent. PHYSICAL assertions require a separate post-deletion verification step not yet implemented. All current resolutions return at most MEDIUM confidence.

6. **Virtual paths (`"pip cache"`, `"brew cache"`, `"docker images/containers/networks"`) are asserted by `tier1_sweep.sh`.** These are not real filesystem paths. They will always resolve as ABSENT from any PHYSICAL check. This is a caller convention, not an infrastructure problem.

7. **`dry_run.sh` and `symlink_preflight.sh` are not journal-integrated.** These scripts do not source `manifest_writer.sh` and write no events. Runs of these scripts leave no journal trace.

8. **The `journal_read()` function is implemented but unused.** No production script or test calls `journal_read`. It is available for future per-entity streaming but has no caller today.

9. **Multi-process concurrent gate protection is by convention.** The nested gate check (GATE_ID already set) only protects within a single shell process. Two independent shell processes (e.g., two concurrent runs of `tier1_sweep.sh`) both write to `$HOME/.claude/state/mac-cleanup/journal.ndjson`. Journal writes are individually atomic via flock, but the gate lifecycle (GATED → asserts → UNGATED) across two concurrent processes will interleave in the journal with no session boundary protection.

10. **`gate_close` UNGATED write failure is silent.** If `journal_append` fails during `gate_close`, the failure is logged to stderr but `gate_close` returns 0. A journal missing its UNGATED event is technically open-ended.

---

## 8. Known Limitations

1. **Second-resolution timestamps.** `gate_assert` uses `/bin/date -u +"%Y-%m-%dT%H:%M:%SZ"` (1-second precision). Two asserts for the same entity at the same source priority within the same second will trigger conflict detection if their states differ.

2. **Journal grows unbounded.** There is no rotation, compaction, or archival. A long-running system will accumulate all historical events indefinitely. `resolve()` scans the full journal file on every call (O(N) with N = total events across all entities).

3. **Python interpreter hard-dependency.** All journal and projection operations require `/usr/bin/python3`. No shell fallback. macOS ships Python 3 via Xcode Command Line Tools; if unavailable (e.g., fresh system, update in progress), the entire system fails at source time.

4. **`gate_assert` event_id uniqueness.** Event IDs use the pattern `assert_${GATE_ID}_${RANDOM}`. `$RANDOM` produces 0–32767. Within a single gate session with many asserts, collision probability is non-negligible (birthday paradox at ~180 asserts). Does not affect correctness (resolution does not depend on event_id uniqueness) but reduces audit trace quality.

5. **Manifest JSON and journal are separate durability surfaces.** If a process is killed between `manifest_record` calls, the manifest JSON may be incomplete (missing `]` footer, invalid JSON). The journal will have the corresponding StateEvents. There is no cross-check that both are consistent with each other, and `journal_repair` does not repair manifest files.

6. **`resolve()` uses wall clock when `as_of` is absent.** This is intentional for live projection but means two successive calls to `resolve(entity_id)` with no `as_of` will use slightly different check times. For TTL boundary cases, results may differ between calls.

---

## 9. Unresolved Risks

**R1 — Multi-process gate interleaving (MEDIUM)**  
Two independent shell processes can open gates simultaneously, both writing to the same journal. Individual writes are atomic; the gate lifecycle is not. A post-hoc `resolve()` will see events from both gates interleaved. If both gates write for the same entity_id at the same source priority within the same second, conflict detection fires. Otherwise, the later-timestamped event wins. No data is lost, but audit traces are ambiguous.  
Mitigation needed: per-run subdirectory journals, or a process-level lock at the journal directory.

**R2 — Subshell export isolation (LOW, documented)**  
If a future caller wraps `manifest_init_strict` or `gate_open_strict` in `$(...)`, the exported env vars (GATE_ID, JOURNAL_PATH) will not reach the parent shell. The test suite documents this pattern with a temp-file redirect workaround. The risk is a future developer writing `OUT=$(manifest_init_strict "label")` and receiving a gate that silently fails to propagate.

**R3 — Incomplete gate close on crash (LOW)**  
If a production script is killed (SIGKILL, OOM) between `manifest_record` and `manifest_close`, the journal has GATED + N StateEvents but no UNGATED. The manifest JSON also has no footer. Future `journal_init` will repair any partial last-line but cannot close the open gate session. A projection query will see all the asserted events correctly, but the gate session will appear open-ended in audit queries.

**R4 — No PHYSICAL source writers (CURRENT GAP)**  
All confidence ceilings are MEDIUM. The infrastructure supports PHYSICAL (priority 1) assertions and HIGH confidence, but no code currently writes them. A post-deletion `resolve()` on any entity will return at most MEDIUM confidence. This is not a risk so much as a capability gap that limits the value of the arbitration layer until Phase 1.5 or Phase 2.

**R5 — Python version assumptions (LOW)**  
`_journal_helper.py` and `_resolve_helper.py` use `datetime.fromisoformat()` (Python 3.7+) and `json.loads()` with `errors='replace'` open mode. macOS ships Python 3.9+ via Xcode CLT. Risk is low but not zero on edge-case system configurations.

---

## 10. Recommended Phase 1.5 Scope

Targeted fixes to upgrade convention-enforced properties to infrastructure-enforced properties. No new features.

1. **Wire `physical_check` into `gate_assert` evidence.** When `manifest_record` calls `gate_assert`, pass `exists_at_record_time` as `evidence.physical_check`. Eliminates the discrepancy between manifest JSON and StateEvent evidence.

2. **Strengthen event_id uniqueness.** Replace `${RANDOM}` in `_gate_build_event` with `uuid.uuid4().hex[:8]` (8 hex chars via Python). Maintains readability, eliminates birthday-paradox risk at scale.

3. **Propagate `gate_close` UNGATED write failure.** Return non-zero from `gate_close` if `journal_append` for the UNGATED event fails. Update callers (`manifest_close`) to handle the non-zero return.

4. **Add process-level concurrent gate protection.** Create a PID lockfile at `_GATE_DEFAULT_JDIR/gate.lock`. `gate_open` acquires it; `gate_close` releases it. Prevents concurrent multi-process gate interleaving without requiring per-run subdirectory journals.

5. **Enforce `manifest_init_strict` (not bare `manifest_init`) at the source level.** Alias or stub out bare `manifest_init` to emit a deprecation warning if called from a non-test context.

---

## 11. Recommended Phase 2 Scope

New capabilities building on the Phase 1 foundation.

1. **PHYSICAL source writers.** After each destructive operation in production scripts, call `gate_assert(path, "PATH", "ABSENT", "PHYSICAL", ...)` to write a priority-1 event. This is the only way to achieve HIGH confidence in projections.

2. **`verify(entity_id)` command.** Compare current filesystem state against latest MANIFEST_GATE assertion via `resolve()`. Write a PHYSICAL StateEvent reflecting actual current state. Surface discrepancies as `POST_HOC_MANIFEST` breach flags.

3. **`rollback(gate_id)` command.** Replay journal to a specific gate session. List all entities asserted during that gate, their states before the gate opened, and which are now different. Produce a shell script to restore original state where possible.

4. **Journal rotation and compaction.** Cap journal at N MB or N events. Write a snapshot event (all entities → latest resolved state), then start a new journal file. Retain old journals for full-history audit.

5. **`resolve()` integration in production scripts pre-deletion.** Before deleting an entity, call `resolve(entity_id)`. Require confidence ≥ MEDIUM before proceeding. Abort with exit 99 if confidence is UNCERTAIN.

6. **Audit CLI.** Thin wrapper over `resolve.sh audit()` for human operators. `mac-cleanup-audit --since 2026-05-01 --entity-type PATH` etc.

---

## 12. Rollback Strategy

Phase 1 is designed for zero-impact rollback. Only one file in the production call chain was modified.

### Single-file rollback

Restore `manifest_writer.sh` to v1.1.3 (the last pre-delegation version). This is the only file that connects the production scripts to the new infrastructure.

```bash
# Option A: restore from git (if v1.1.3 was committed)
git checkout <v1.1.3-commit> -- scripts/manifest_writer.sh

# Option B: manual restore
# Replace manifest_writer.sh with the pre-v1.2.0 content
# Key diff: remove the gate_primitive.sh source block (lines 28-38),
#           remove the _MW_JDIR variable,
#           remove gate_open/gate_close/gate_assert calls from
#           manifest_init, manifest_record, manifest_close,
#           remove the GATE_ID and JOURNAL_PATH checks from
#           manifest_init_strict.
```

### What rollback does NOT require

- Touching `tier1_sweep.sh`, `thin_snapshots.sh`, or `migrate_audio.sh`
- Deleting `gate_primitive.sh`, `journal.sh`, `_journal_helper.py`, `resolve.sh`, or `_resolve_helper.py`
- Deleting `tests/test_*.sh`
- Clearing `$HOME/.claude/state/mac-cleanup/`

### What rollback changes

- `manifest_init_strict` no longer verifies GATE_ID or JOURNAL_PATH
- `manifest_record` no longer calls `gate_assert` (no journal StateEvents written)
- `manifest_close` no longer calls `gate_close` (no UNGATED events written)
- `manifest_guard` no longer calls `gate_guard` (only MANIFEST_PATH check remains)
- No journal entries are written by any production script

### Post-rollback state

The existing journal at `$HOME/.claude/state/mac-cleanup/journal.ndjson` is left intact. Previously-written events remain readable via `resolve.sh` (if it is still sourced). Production scripts behave identically to their pre-Phase-1 behavior.

### Rollback verification

```bash
# After restoring manifest_writer.sh to v1.1.3:
bash -n scripts/manifest_writer.sh                      # syntax check
bash -c 'source scripts/manifest_writer.sh; declare -F manifest_init_strict'  # function exists
bash tests/test_manifest.sh                             # compat tests T13-T15 must pass
```

---

## 13. Test Suite Status at Checkpoint

| Suite | Assertions | Passed | Failed |
|---|---|---|---|
| `tests/test_journal.sh` | 32 | 32 | 0 |
| `tests/test_gate.sh` | 39 | 39 | 0 |
| `tests/test_manifest.sh` | 51 | 51 | 0 |
| `tests/test_resolve.sh` | 46 | 46 | 0 |
| **Total** | **168** | **168** | **0** |

All syntax checks (`bash -n`) pass for all `.sh` files in `scripts/` and `scripts/tests/`.

---

*End of Phase 1 Checkpoint — 2026-05-08*
