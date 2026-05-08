#!/bin/bash
# mac-cleanup-executor :: gate_primitive.sh  v1.0.0
# Generalized gate primitive: open, guard, assert, close.
# Sources journal.sh — all writes go through the journal.
# Must be sourced, not executed.

if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  /bin/echo "ERROR: gate_primitive.sh must be sourced, not executed." >&2
  exit 1
fi

# ── Locate dependencies ───────────────────────────────────────────────────────

_GATE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
_GATE_PYTHON3="/usr/bin/python3"
_GATE_JOURNAL_HELPER="$_GATE_SCRIPT_DIR/_journal_helper.py"
_GATE_LOCK_HELPER="$_GATE_SCRIPT_DIR/_gate_lock_helper.py"

if [ ! -x "$_GATE_PYTHON3" ]; then
  /bin/echo "FATAL: gate_primitive.sh requires python3 at $_GATE_PYTHON3" >&2
  return 1
fi
if [ ! -f "$_GATE_JOURNAL_HELPER" ]; then
  /bin/echo "FATAL: gate_primitive.sh requires $_GATE_JOURNAL_HELPER" >&2
  return 1
fi
if [ ! -f "$_GATE_LOCK_HELPER" ]; then
  /bin/echo "FATAL: gate_primitive.sh requires $_GATE_LOCK_HELPER" >&2
  return 1
fi

# Source journal.sh — idempotent (skip if journal_append already defined)
if ! declare -F journal_append >/dev/null 2>&1; then
  if [ ! -f "$_GATE_SCRIPT_DIR/journal.sh" ]; then
    /bin/echo "FATAL: gate_primitive.sh requires journal.sh in $_GATE_SCRIPT_DIR" >&2
    return 1
  fi
  # shellcheck source=journal.sh
  source "$_GATE_SCRIPT_DIR/journal.sh" || {
    /bin/echo "FATAL: gate_primitive.sh could not source journal.sh" >&2
    return 1
  }
fi

# Default journal directory (same root as manifest side-cars)
_GATE_DEFAULT_JDIR="$HOME/.claude/state/mac-cleanup"

# ── Internal helpers ──────────────────────────────────────────────────────────

# Generate a time-ordered, collision-resistant gate ID
_gate_gen_id() {
  LC_ALL=C "$_GATE_PYTHON3" -c "
import os
from datetime import datetime, timezone
ts = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
print(f'{ts}_{os.urandom(8).hex()}')
" 2>/dev/null
}

# Map source string → source_priority integer
_gate_source_priority() {
  case "$1" in
    PHYSICAL)      /bin/echo 1 ;;
    MANIFEST_GATE) /bin/echo 2 ;;
    AGENT)         /bin/echo 3 ;;
    INFERRED)      /bin/echo 4 ;;
    *)             /bin/echo 4 ;;   # spec: UNKNOWN/other = 4
  esac
}

# Build a complete StateEvent JSON line via _journal_helper.py
# args: event_id entity_id entity_type asserted_state source source_priority gate_id evidence_json asserted_at
_gate_build_event() {
  LC_ALL=C "$_GATE_PYTHON3" "$_GATE_JOURNAL_HELPER" build_event "$@" 2>/dev/null
}

_GATE_NULL_EVIDENCE='{"manifest_path":null,"physical_check":null,"agent_id":null,"checksum":null,"breach_flags":[]}'

# ── _gate_lock_acquire <jdir> ─────────────────────────────────────────────────
# Atomically acquire a PID lock at <jdir>/gate.lock using the CALLING bash PID.
# Lock format v2: JSON with pid, created_at, host, cmd fields.
# Stale locks (dead PID or malformed content) are cleared automatically.
# Live locks emit FATAL with lock path and manual recovery command; return 1.
# Sets and exports GATE_LOCK_PATH on success.
# Called by gate_open before generating GATE_ID.
_gate_lock_acquire() {
  local _gla_jdir="${1:?_gate_lock_acquire requires journal dir}"
  local _gla_lock="$_gla_jdir/gate.lock"
  LC_ALL=C "$_GATE_PYTHON3" "$_GATE_LOCK_HELPER" acquire "$_gla_lock" "$$"
  local _gla_rc=$?
  if [ "$_gla_rc" -eq 0 ]; then
    export GATE_LOCK_PATH="$_gla_lock"
  fi
  return $_gla_rc
}

# ── _gate_lock_release ────────────────────────────────────────────────────────
# Release the PID lock at GATE_LOCK_PATH.
# Reads pid from lockfile (v1 plain-int or v2 JSON), verifies it matches $$.
# No-op if GATE_LOCK_PATH unset or lockfile already gone (idempotent).
# Returns non-zero and emits WARN if release fails; always unsets GATE_LOCK_PATH.
# Called by gate_close after unsetting gate vars.
_gate_lock_release() {
  if [ -z "${GATE_LOCK_PATH:-}" ]; then
    return 0
  fi
  LC_ALL=C "$_GATE_PYTHON3" "$_GATE_LOCK_HELPER" release "$GATE_LOCK_PATH" "$$"
  local _glr_rc=$?
  if [ "$_glr_rc" -ne 0 ]; then
    /bin/echo "WARN: _gate_lock_release failed for ${GATE_LOCK_PATH}" >&2
  fi
  unset GATE_LOCK_PATH
  return $_glr_rc
}

# ── gate_open <label> [journal_dir] ──────────────────────────────────────────
# Opens a gate session. Sets GATE_ID and GATE_LABEL. Writes GATED event.
# Soft fail (return 1) — use gate_open_strict for hard fail (exit 98).
# Returns 1 immediately on nested gate attempt; does NOT exit.
gate_open() {
  local _gop_label="${1:?gate_open requires a label}"
  local _gop_jdir="${2:-$_GATE_DEFAULT_JDIR}"

  # Nested gate: soft fail only (gate_open_strict escalates to exit 98)
  if [ -n "${GATE_ID:-}" ]; then
    /bin/echo "FATAL: gate_open: nested gate refused — GATE_ID already set: $GATE_ID" >&2
    return 1
  fi

  # Initialize journal if not already open
  if [ -z "${JOURNAL_PATH:-}" ]; then
    journal_init "$_gop_jdir" >/dev/null || {
      /bin/echo "FATAL: gate_open: journal_init failed" >&2
      return 1
    }
  fi

  # Acquire PID lock — blocks concurrent gate opens from other processes
  _gate_lock_acquire "$_gop_jdir" || {
    /bin/echo "FATAL: gate_open: could not acquire gate lock in $_gop_jdir" >&2
    return 1
  }

  # Generate gate ID
  local _gop_id
  _gop_id=$(_gate_gen_id)
  if [ -z "$_gop_id" ]; then
    /bin/echo "FATAL: gate_open: could not generate GATE_ID" >&2
    return 1
  fi

  # Build and write GATED event
  local _gop_ts _gop_event
  _gop_ts=$(/bin/date -u +"%Y-%m-%dT%H:%M:%SZ")
  _gop_event=$(_gate_build_event \
    "$_gop_id" "GATE/$_gop_label" "GATE" "GATED" \
    "MANIFEST_GATE" "2" "null" "$_GATE_NULL_EVIDENCE" "$_gop_ts")
  if [ -z "$_gop_event" ]; then
    /bin/echo "FATAL: gate_open: could not build GATED event" >&2
    return 1
  fi

  journal_append "$_gop_event" >/dev/null || {
    /bin/echo "FATAL: gate_open: could not write GATED event to journal" >&2
    return 1
  }

  export GATE_ID="$_gop_id"
  export GATE_LABEL="$_gop_label"
  /bin/echo "gate opened: $GATE_ID"
  return 0
}

# ── gate_open_strict <label> [journal_dir] ────────────────────────────────────
# Hard-fail gate open. exit 98 on ANY failure condition:
#   - nested gate detected
#   - gate_open returns non-zero
#   - GATE_ID empty after open
#   - JOURNAL_PATH empty after open
#   - journal file missing after open
gate_open_strict() {
  local _gos_label="${1:-}"
  if [ -z "$_gos_label" ]; then
    /bin/echo "FATAL: gate_open_strict requires a label" >&2
    exit 98
  fi
  local _gos_jdir="${2:-$_GATE_DEFAULT_JDIR}"

  # Nested gate — hard stop, no fallback
  if [ -n "${GATE_ID:-}" ]; then
    /bin/echo "FATAL: gate_open_strict: nested gate refused — GATE_ID already set: $GATE_ID" >&2
    exit 98
  fi

  # Call gate_open — any failure → exit 98
  gate_open "$_gos_label" "$_gos_jdir" || {
    /bin/echo "FATAL: gate_open_strict: gate_open failed. Fail-closed: exit 98." >&2
    exit 98
  }

  # Verify all four post-open conditions
  if [ -z "${GATE_ID:-}" ]; then
    /bin/echo "FATAL: gate_open_strict: GATE_ID empty after gate_open. Refusing." >&2
    exit 98
  fi
  if [ -z "${JOURNAL_PATH:-}" ]; then
    /bin/echo "FATAL: gate_open_strict: JOURNAL_PATH empty after gate_open. Refusing." >&2
    exit 98
  fi
  if [ ! -f "$JOURNAL_PATH" ]; then
    /bin/echo "FATAL: gate_open_strict: journal file missing at $JOURNAL_PATH. Refusing." >&2
    exit 98
  fi

  /bin/echo "gate verified: $GATE_ID"
}

# ── gate_guard ────────────────────────────────────────────────────────────────
# Must be called before any destructive operation.
# exit 99 if GATE_ID not set, or journal file missing.
gate_guard() {
  if [ -z "${GATE_ID:-}" ]; then
    /bin/echo "FATAL: gate_guard: no active gate (GATE_ID not set). Destructive operation refused." >&2
    exit 99
  fi
  if [ -z "${JOURNAL_PATH:-}" ] || [ ! -f "${JOURNAL_PATH}" ]; then
    /bin/echo "FATAL: gate_guard: journal file missing at ${JOURNAL_PATH:-<unset>}. Refusing." >&2
    exit 99
  fi
}

# ── gate_assert <entity_id> [entity_type] [state] [source] [evidence_json] ───
# Records a StateEvent for an entity under the current gate.
# Calls gate_guard first — exits 99 if no active gate.
# evidence_json must be a valid JSON object or use the default null-evidence.
gate_assert() {
  local _ga_eid="${1:?gate_assert requires entity_id}"
  local _ga_etype="${2:-PATH}"
  local _ga_state="${3:-UNKNOWN}"
  local _ga_source="${4:-MANIFEST_GATE}"
  local _ga_evidence="${5:-$_GATE_NULL_EVIDENCE}"

  gate_guard  # exits 99 if no active gate — intentional hard stop

  local _ga_spri
  _ga_spri=$(_gate_source_priority "$_ga_source")

  local _ga_ts _ga_evid _ga_event
  _ga_ts=$(/bin/date -u +"%Y-%m-%dT%H:%M:%SZ")
  _ga_evid="assert_${GATE_ID}_$(LC_ALL=C "$_GATE_PYTHON3" -c 'import os; print(os.urandom(4).hex())')"
  _ga_event=$(_gate_build_event \
    "$_ga_evid" "$_ga_eid" "$_ga_etype" "$_ga_state" \
    "$_ga_source" "$_ga_spri" "$GATE_ID" "$_ga_evidence" "$_ga_ts")
  if [ -z "$_ga_event" ]; then
    /bin/echo "FATAL: gate_assert: could not build event for $_ga_eid" >&2
    return 1
  fi

  journal_append "$_ga_event" >/dev/null || {
    /bin/echo "FATAL: gate_assert: write failed for $_ga_eid" >&2
    return 1
  }
}

# ── gate_close [status] ───────────────────────────────────────────────────────
# Writes UNGATED event, unsets GATE_ID and GATE_LABEL.
# No-op if no active gate. Always unsets gate vars; returns non-zero if
# UNGATED event could not be written (surfaces WARN, does not exit).
gate_close() {
  local _gc_status="${1:-completed}"
  local _gc_rc=0

  if [ -z "${GATE_ID:-}" ]; then
    return 0  # no active gate — silent no-op
  fi

  local _gc_ts _gc_event
  _gc_ts=$(/bin/date -u +"%Y-%m-%dT%H:%M:%SZ")
  _gc_event=$(_gate_build_event \
    "${GATE_ID}_close" "GATE/${GATE_LABEL:-closed}" "GATE" "UNGATED" \
    "MANIFEST_GATE" "2" "$GATE_ID" "$_GATE_NULL_EVIDENCE" "$_gc_ts" 2>/dev/null)

  local _gc_closed_id="$GATE_ID"

  # Write UNGATED event — always unset gate vars, but surface any failure
  if [ -z "$_gc_event" ]; then
    /bin/echo "WARN: gate_close: could not build UNGATED event for $_gc_closed_id" >&2
    _gc_rc=1
  elif [ -z "${JOURNAL_PATH:-}" ] || [ ! -f "${JOURNAL_PATH}" ]; then
    /bin/echo "WARN: gate_close: journal unavailable at '${JOURNAL_PATH:-<unset>}' — UNGATED event not written for $_gc_closed_id" >&2
    _gc_rc=1
  else
    journal_append "$_gc_event" >/dev/null || {
      /bin/echo "WARN: gate_close: journal_append failed for UNGATED event (gate=$_gc_closed_id)" >&2
      _gc_rc=1
    }
  fi

  unset GATE_ID
  unset GATE_LABEL
  _gate_lock_release || _gc_rc=1
  /bin/echo "gate closed: $_gc_closed_id (status=$_gc_status)"
  return $_gc_rc
}
