#!/bin/bash
# mac-cleanup-executor :: resolve.sh  v1.0.0
# Read-only projection engine. No journal writes. No gate calls.
# Sources journal.sh for journal_replay only.
# Must be sourced, not executed.

if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  /bin/echo "ERROR: resolve.sh must be sourced, not executed." >&2
  exit 1
fi

# ── Locate dependencies ───────────────────────────────────────────────────────

_RES_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
_RES_PYTHON3="/usr/bin/python3"
_RES_HELPER="$_RES_SCRIPT_DIR/_resolve_helper.py"

if [ ! -x "$_RES_PYTHON3" ]; then
  /bin/echo "FATAL: resolve.sh requires python3 at $_RES_PYTHON3" >&2
  return 1
fi
if [ ! -f "$_RES_HELPER" ]; then
  /bin/echo "FATAL: resolve.sh requires $_RES_HELPER" >&2
  return 1
fi

# Source journal.sh (idempotent) — needed for journal_replay
if ! declare -F journal_replay >/dev/null 2>&1; then
  if [ ! -f "$_RES_SCRIPT_DIR/journal.sh" ]; then
    /bin/echo "FATAL: resolve.sh requires journal.sh in $_RES_SCRIPT_DIR" >&2
    return 1
  fi
  # shellcheck source=journal.sh
  source "$_RES_SCRIPT_DIR/journal.sh" || {
    /bin/echo "FATAL: resolve.sh could not source journal.sh" >&2
    return 1
  }
fi

# ── resolve <entity_id> [as_of_iso8601] ──────────────────────────────────────
# Returns a StateRecord JSON line on stdout.
# JOURNAL_PATH must be set (via journal_init or gate_open).
# Unknown entity → UNCERTAIN (exit 0, JSON output, never crashes).
# Missing JOURNAL_PATH or missing journal file → return 1.
# TTL logic lives here only — no other layer checks TTL.
# If as_of is absent, TTL is checked against wall clock.
resolve() {
  local _res_eid="${1:?resolve requires entity_id}"
  local _res_as_of="${2:-}"

  if [ -z "${JOURNAL_PATH:-}" ] || [ ! -f "${JOURNAL_PATH}" ]; then
    /bin/echo "FATAL: resolve: JOURNAL_PATH not set or file absent at '${JOURNAL_PATH:-<unset>}'" >&2
    return 1
  fi

  if [ -n "$_res_as_of" ]; then
    LC_ALL=C "$_RES_PYTHON3" "$_RES_HELPER" resolve "$JOURNAL_PATH" "$_res_eid" "$_res_as_of"
  else
    LC_ALL=C "$_RES_PYTHON3" "$_RES_HELPER" resolve "$JOURNAL_PATH" "$_res_eid"
  fi
}

# ── replay <journal_path> <as_of_iso8601> ────────────────────────────────────
# Streams all events from journal_path up to as_of. as_of is REQUIRED.
# No wall clock reads. No journal writes. No gate calls.
# Delegates to journal_replay.
# exit 0 = complete stream; exit 2 = halted on unsupported schema version.
# Missing as_of → return 1 (not exit — must not kill caller's shell).
replay() {
  if [ -z "${1:-}" ]; then
    /bin/echo "FATAL: replay requires journal path" >&2
    return 1
  fi
  if [ $# -lt 2 ] || [ -z "${2:-}" ]; then
    /bin/echo "FATAL: replay: as_of is required — no wall clock reads permitted" >&2
    return 1
  fi
  local _rpl_path="$1"
  local _rpl_as_of="$2"

  # Delegate to journal_replay — all replay semantics live there
  journal_replay "$_rpl_path" "$_rpl_as_of"
  return $?
}

# ── audit [since] [until] [entity_type] ──────────────────────────────────────
# Streams events from JOURNAL_PATH matching all provided filters.
# All three parameters are optional; empty string = no filter.
# JOURNAL_PATH must be set.
# Malformed events: logged to stderr, not silently skipped, processing continues.
audit() {
  local _aud_since="${1:-}"
  local _aud_until="${2:-}"
  local _aud_etype="${3:-}"

  if [ -z "${JOURNAL_PATH:-}" ] || [ ! -f "${JOURNAL_PATH}" ]; then
    /bin/echo "FATAL: audit: JOURNAL_PATH not set or file absent at '${JOURNAL_PATH:-<unset>}'" >&2
    return 1
  fi

  LC_ALL=C "$_RES_PYTHON3" "$_RES_HELPER" audit \
    "$JOURNAL_PATH" "$_aud_since" "$_aud_until" "$_aud_etype"
}

# ── resolve_confidence <events_json> ─────────────────────────────────────────
# Computes confidence from a JSON array of StateEvents.
# Outputs one of: HIGH, MEDIUM, LOW, UNCERTAIN
# Does not require JOURNAL_PATH — operates on supplied events only.
resolve_confidence() {
  local _rc_events="${1:?resolve_confidence requires events JSON array}"
  LC_ALL=C "$_RES_PYTHON3" "$_RES_HELPER" confidence "$_rc_events"
}
