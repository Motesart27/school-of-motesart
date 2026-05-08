#!/bin/bash
# mac-cleanup-executor :: journal.sh  v1.0.0
# Append-only event journal.
# Locking: Python fcntl.flock (macOS has no flock CLI).
# fsync: performed inside _journal_helper.py after every write.
# Repair: called by journal_init on the active journal before accepting writes.
#
# Must be sourced, not executed.
if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  /bin/echo "ERROR: journal.sh must be sourced, not executed." >&2
  exit 1
fi

# ── Locate helper ─────────────────────────────────────────────────────────────

_JRN_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
_JRN_HELPER="$_JRN_SCRIPT_DIR/_journal_helper.py"
_JRN_PYTHON3="/usr/bin/python3"

# Fail-fast: required tools
if [ ! -x "$_JRN_PYTHON3" ]; then
  /bin/echo "FATAL: journal.sh requires python3 at $_JRN_PYTHON3" >&2
  return 1
fi
if [ ! -f "$_JRN_HELPER" ]; then
  /bin/echo "FATAL: journal.sh requires $_JRN_HELPER" >&2
  return 1
fi

# Schema constants (exported so subshells inherit)
export JOURNAL_SCHEMA_VERSION=1
export JOURNAL_MAX_SUPPORTED_SCHEMA=1

# ── journal_init <dir> ────────────────────────────────────────────────────────
# Opens the journal in <dir>. Runs repair before accepting any writes.
# Sets JOURNAL_DIR, JOURNAL_PATH, JOURNAL_LOCK.
journal_init() {
  local _jrn_dir="${1:?journal_init requires a directory}"
  export JOURNAL_DIR="$_jrn_dir"
  export JOURNAL_PATH="$_jrn_dir/journal.ndjson"
  export JOURNAL_LOCK="$_jrn_dir/journal.ndjson.lock"

  /bin/mkdir -p "$_jrn_dir" || {
    /bin/echo "FATAL: journal_init could not create $_jrn_dir" >&2
    return 1
  }

  # Repair before first write — catches partial lines from prior crash
  journal_repair "$JOURNAL_PATH" || return 1
  /bin/echo "journal opened: $JOURNAL_PATH"
}

# ── journal_repair <path> ─────────────────────────────────────────────────────
# Validates last line; truncates partial write; normalizes CRLF.
# Logs repairs to stderr. No-op if file does not exist.
# Never silently swallows errors — returns non-zero on failure.
journal_repair() {
  local _jrn_rpath="${1:?journal_repair requires a path}"
  [ ! -f "$_jrn_rpath" ] && return 0

  local _jrn_msg
  _jrn_msg=$(LC_ALL=C "$_JRN_PYTHON3" "$_JRN_HELPER" repair "$_jrn_rpath" 2>&1)
  local _jrn_rc=$?
  if [ "$_jrn_rc" -ne 0 ]; then
    /bin/echo "FATAL: journal_repair failed: $_jrn_msg" >&2
    return 1
  fi
  [ -n "$_jrn_msg" ] && /bin/echo "JOURNAL REPAIR: $_jrn_msg" >&2
  return 0
}

# ── journal_append <event_json> ───────────────────────────────────────────────
# Validates JSON, acquires fcntl.flock, writes line, fsyncs, releases lock.
# Fail-closed: any failure exits non-zero. Never silently skips.
journal_append() {
  local _jrn_event="${1:?journal_append requires event JSON}"

  if [ -z "${JOURNAL_PATH:-}" ]; then
    /bin/echo "FATAL: journal_append called without journal_init" >&2
    return 1
  fi

  # Validate before acquiring lock — fast-fail on bad JSON
  LC_ALL=C "$_JRN_PYTHON3" "$_JRN_HELPER" validate "$_jrn_event" 2>/dev/null || {
    /bin/echo "FATAL: journal_append received invalid JSON" >&2
    return 1
  }

  # fcntl.flock + write + fsync — all inside the helper (5s timeout, then exit 1)
  LC_ALL=C "$_JRN_PYTHON3" "$_JRN_HELPER" write "$JOURNAL_PATH" "$_jrn_event"
  local _jrn_rc=$?
  if [ "$_jrn_rc" -ne 0 ]; then
    /bin/echo "FATAL: journal_append write failed (exit $_jrn_rc)" >&2
    return "$_jrn_rc"
  fi
  return 0
}

# ── journal_read <entity_id> [since_iso8601] ─────────────────────────────────
# Streams matching events to stdout (one JSON object per line).
# LC_ALL=C for deterministic byte-order comparison.
# since filter is inclusive (asserted_at >= since).
journal_read() {
  local _jrn_eid="${1:?journal_read requires entity_id}"
  local _jrn_since="${2:-}"

  if [ -z "${JOURNAL_PATH:-}" ]; then
    /bin/echo "FATAL: journal_read called without journal_init" >&2
    return 1
  fi
  [ ! -f "$JOURNAL_PATH" ] && return 0

  LC_ALL=C "$_JRN_PYTHON3" "$_JRN_HELPER" read "$JOURNAL_PATH" "$_jrn_eid" "$_jrn_since"
}

# ── journal_replay <path> <as_of_iso8601> ────────────────────────────────────
# Streams ALL events from <path> to stdout.
# as_of is REQUIRED — no wall clock reads inside replay(). Rejected if absent.
# Malformed JSON lines: logged to stderr, skipped (do not halt).
# Unsupported schema version: HALT, exit 2 (deterministic, not an error).
# Output includes a "# replay as_of=<ts>" header line for verification.
journal_replay() {
  # ${N:?} exits the sourced shell — use explicit guards that return instead
  if [ -z "${1:-}" ]; then
    /bin/echo "FATAL: journal_replay requires journal path" >&2
    return 1
  fi
  if [ $# -lt 2 ] || [ -z "${2:-}" ]; then
    /bin/echo "FATAL: journal_replay requires as_of ISO8601 timestamp — no wall clock reads permitted" >&2
    return 1
  fi
  local _jrn_rpath="$1"
  local _jrn_as_of="$2"

  [ ! -f "$_jrn_rpath" ] && {
    /bin/echo "FATAL: journal_replay: path not found: $_jrn_rpath" >&2
    return 1
  }

  LC_ALL=C "$_JRN_PYTHON3" "$_JRN_HELPER" replay \
    "$_jrn_rpath" "$_jrn_as_of" "$JOURNAL_MAX_SUPPORTED_SCHEMA"
  # exit 0 = complete; exit 2 = halted on unsupported schema version
  return $?
}
