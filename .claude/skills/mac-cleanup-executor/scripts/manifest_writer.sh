#!/bin/bash
# mac-cleanup-executor :: manifest_writer.sh
# v1.4.0 — manifest_record_strict: fail-closed pre-destruction record helper.
# All manifest functions now drive the gate primitive in tandem, setting
# GATE_ID and JOURNAL_PATH alongside MANIFEST_PATH.
# Backward-compatible: all existing callers work unchanged.
#
# Version history:
#   v1.1.0 — original
#   v1.1.1 — fixed USER + comma
#   v1.1.2 — fixed PATH dependency (absolute paths)
#   v1.1.3 — fixed BASH_SOURCE[0] unbound under set -u in zsh
#   v1.2.0 — delegation layer: gate_primitive.sh + journal.sh integration
#   v1.3.0 — manifest_assert_physical: PHYSICAL source assertions (priority 1)
#   v1.4.0 — manifest_record_strict: exit 98 if record fails before destruction

# Hard fail if invoked directly instead of sourced
# v1.1.3: ${BASH_SOURCE[0]:-} defaults to empty under set -u, preventing
#         "unbound variable" abort in zsh-spawned subshells.
if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  /bin/echo "ERROR: manifest_writer.sh must be sourced, not executed." >&2
  /bin/echo "       source ./manifest_writer.sh" >&2
  exit 1
fi

# ── Locate and source gate_primitive.sh ───────────────────────────────────────

_MW_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

if ! declare -F gate_guard >/dev/null 2>&1; then
  if [ ! -f "$_MW_SCRIPT_DIR/gate_primitive.sh" ]; then
    /bin/echo "FATAL: manifest_writer.sh requires gate_primitive.sh in $_MW_SCRIPT_DIR" >&2
    return 1
  fi
  # shellcheck source=gate_primitive.sh
  source "$_MW_SCRIPT_DIR/gate_primitive.sh" || {
    /bin/echo "FATAL: manifest_writer.sh could not source gate_primitive.sh" >&2
    return 1
  }
fi

# Journal directory (must match gate_primitive.sh _GATE_DEFAULT_JDIR)
_MW_JDIR="$HOME/.claude/state/mac-cleanup"

# ── Absolute-path utility wrappers ────────────────────────────────────────────
# Set once at source time. Falls back to PATH lookup on non-macOS.

_mw_resolve() {
  local cmd="$1"; local fallback="$2"
  if [ -x "$cmd" ]; then
    /bin/echo "$cmd"
  else
    command -v "$fallback" 2>/dev/null || /bin/echo "$fallback"
  fi
}

_MW_AWK=$(_mw_resolve "/usr/bin/awk" "awk")
_MW_SED=$(_mw_resolve "/usr/bin/sed" "sed")
_MW_CAT=$(_mw_resolve "/bin/cat" "cat")
_MW_DU=$(_mw_resolve "/usr/bin/du" "du")
_MW_STAT=$(_mw_resolve "/usr/bin/stat" "stat")
_MW_DATE=$(_mw_resolve "/bin/date" "date")
_MW_MKDIR=$(_mw_resolve "/bin/mkdir" "mkdir")
_MW_PRINTF=$(_mw_resolve "/usr/bin/printf" "printf")
_MW_ID=$(_mw_resolve "/usr/bin/id" "id")
_MW_HOSTNAME=$(_mw_resolve "/bin/hostname" "hostname")

MANIFEST_DIR="$HOME/.claude/state/mac-cleanup/manifests"
"$_MW_MKDIR" -p "$MANIFEST_DIR"

# ── manifest_init <run-label> ─────────────────────────────────────────────────
# Opens the gate (sets GATE_ID + JOURNAL_PATH), then writes the manifest file
# and sets MANIFEST_PATH. Fail-closed: if gate_open fails, returns 1 before
# writing any manifest file.
manifest_init() {
  local label="${1:-unlabeled}"

  /bin/echo "WARN: manifest_init called directly. Use manifest_init_strict for destructive scripts." >&2

  # DELEGATION: open gate first — sets GATE_ID + JOURNAL_PATH.
  # gate_open soft-fails nested gate (return 1); hard-fails if journal init
  # fails. Either way we return 1 here so manifest_init_strict catches it.
  gate_open "$label" "$_MW_JDIR" >/dev/null || {
    /bin/echo "FATAL: manifest_init: gate_open failed for label '$label'" >&2
    return 1
  }

  # Ensure manifest dir exists (handles MANIFEST_DIR overrides after source)
  "$_MW_MKDIR" -p "$MANIFEST_DIR" || {
    /bin/echo "FATAL: manifest_init: could not create $MANIFEST_DIR" >&2
    gate_close "failed" >/dev/null 2>/dev/null
    return 1
  }

  local ts
  ts=$("$_MW_DATE" -u +"%Y-%m-%dT%H:%M:%SZ")
  MANIFEST_PATH="$MANIFEST_DIR/manifest-${label}-${ts//:/-}.json"
  export MANIFEST_PATH

  local _user="${USER:-$("$_MW_ID" -un 2>/dev/null || /bin/echo unknown)}"
  local _host
  _host=$("$_MW_HOSTNAME" 2>/dev/null || /bin/echo unknown)

  "$_MW_CAT" > "$MANIFEST_PATH" <<EOF
{
  "schema_version": "1.0.3",
  "label": "$label",
  "started_at": "$ts",
  "host": "$_host",
  "user": "$_user",
  "completed_at": null,
  "status": "in_progress",
  "items": [
EOF
  export MANIFEST_FIRST_ITEM=1
  /bin/echo "manifest opened: $MANIFEST_PATH"
}

# ── manifest_record <path> <tier> <reason> ────────────────────────────────────
# Appends an item to the manifest JSON and records a StateEvent in the journal
# via gate_assert. gate_assert calls gate_guard first — exits 99 if no active
# gate, which is the correct fail-closed behavior: record must not be called
# before manifest_init.
manifest_record() {
  local path="$1"
  local tier="${2:-unspecified}"
  local reason="${3:-}"

  if [ -z "${MANIFEST_PATH:-}" ]; then
    /bin/echo "ERROR: manifest_record called without manifest_init" >&2
    return 1
  fi

  local size_bytes mtime exists
  if [ -e "$path" ]; then
    exists=true
    size_bytes=$("$_MW_DU" -sk "$path" 2>/dev/null | "$_MW_AWK" '{print $1 * 1024}')
    [ -z "$size_bytes" ] && size_bytes=0
    mtime=$("$_MW_STAT" -f "%Sm" -t "%Y-%m-%dT%H:%M:%SZ" "$path" 2>/dev/null || /bin/echo "unknown")
  else
    exists=false
    size_bytes=0
    mtime="unknown"
  fi

  # JSON-escape path and reason
  local esc_path esc_reason
  esc_path=$("$_MW_PRINTF" '%s' "$path" | "$_MW_SED" 's/\\/\\\\/g; s/"/\\"/g')
  esc_reason=$("$_MW_PRINTF" '%s' "$reason" | "$_MW_SED" 's/\\/\\\\/g; s/"/\\"/g')

  # Comma placement
  if [ "${MANIFEST_FIRST_ITEM:-0}" = "1" ]; then
    export MANIFEST_FIRST_ITEM=0
    "$_MW_CAT" >> "$MANIFEST_PATH" <<EOF
    {
      "path": "$esc_path",
      "exists_at_record_time": $exists,
      "size_bytes": $size_bytes,
      "mtime": "$mtime",
      "tier": "$tier",
      "reason": "$esc_reason"
    }
EOF
  else
    "$_MW_CAT" >> "$MANIFEST_PATH" <<EOF
    ,{
      "path": "$esc_path",
      "exists_at_record_time": $exists,
      "size_bytes": $size_bytes,
      "mtime": "$mtime",
      "tier": "$tier",
      "reason": "$esc_reason"
    }
EOF
  fi

  # DELEGATION: assert state in journal via gate_assert.
  # gate_assert calls gate_guard — exits 99 if no active gate (fail-closed).
  local _mw_state="PRESENT"
  [ "$exists" = "false" ] && _mw_state="ABSENT"
  local _esc_mp
  _esc_mp=$("$_MW_PRINTF" '%s' "${MANIFEST_PATH:-}" | "$_MW_SED" 's/\\/\\\\/g; s/"/\\"/g')
  local _mw_evidence="{\"manifest_path\":\"$_esc_mp\",\"physical_check\":$exists,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]}"
  gate_assert "$path" "PATH" "$_mw_state" "MANIFEST_GATE" "$_mw_evidence" >/dev/null
}

# ── manifest_close <status> ───────────────────────────────────────────────────
# Closes the gate (writes UNGATED event, unsets GATE_ID/GATE_LABEL) FIRST, then
# writes the JSON footer so the footer reflects the actual gate outcome.
# No-op if no active manifest. Returns non-zero if gate_close failed.
# On failure: footer status is "completed_with_gate_close_failure" (not the
# caller-supplied status), WARN is emitted to stderr, and non-zero is returned.
manifest_close() {
  local status="${1:-completed}"
  if [ -z "${MANIFEST_PATH:-}" ]; then
    return 0
  fi
  local ts
  ts=$("$_MW_DATE" -u +"%Y-%m-%dT%H:%M:%SZ")

  # ORDERING: close gate BEFORE writing footer so footer reflects real outcome.
  # gate_close always unsets GATE_ID + GATE_LABEL regardless of UNGATED write.
  local _mc_rc=0
  gate_close "$status" >/dev/null
  _mc_rc=$?
  if [ "$_mc_rc" -ne 0 ]; then
    /bin/echo "WARN: manifest_close: gate_close reported failure (UNGATED event may not be written)" >&2
    status="completed_with_gate_close_failure"
  fi

  "$_MW_CAT" >> "$MANIFEST_PATH" <<EOF
  ],
  "completed_at": "$ts",
  "status": "$status"
}
EOF
  /bin/echo "manifest closed: $MANIFEST_PATH (status=$status)"
  return $_mc_rc
}

# ── manifest_guard ────────────────────────────────────────────────────────────
# Must be called before any destructive operation.
# Checks both MANIFEST_PATH (legacy) and GATE_ID (new). exit 99 on either.
manifest_guard() {
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "${MANIFEST_PATH}" ]; then
    /bin/echo "FATAL: destructive operation attempted without active manifest." >&2
    /bin/echo "       Call manifest_init before any deletion." >&2
    exit 99
  fi
  # DELEGATION: also verify active gate (exits 99 if GATE_ID unset or journal missing)
  gate_guard
}

# ── manifest_assert_physical <path> ──────────────────────────────────────────
# Records a PHYSICAL StateEvent for <path> in the journal via gate_assert.
# State is auto-determined from the filesystem: PRESENT if the path exists
# (including dangling symlinks via [ -L ]), ABSENT if it does not.
# source=PHYSICAL, source_priority=1 — outranks all MANIFEST_GATE assertions.
# gate_assert internally calls gate_guard → exits 99 if no active gate.
# Returns non-zero and emits WARN if journal write fails; does NOT exit.
manifest_assert_physical() {
  local _map_path="${1:?manifest_assert_physical requires path}"

  # [ -e ] follows symlinks; [ -L ] catches dangling symlinks
  local _map_state _map_check
  if [ -e "$_map_path" ] || [ -L "$_map_path" ]; then
    _map_state="PRESENT"
    _map_check=true
  else
    _map_state="ABSENT"
    _map_check=false
  fi

  # Build evidence — physical_check encodes the actual filesystem result
  local _esc_mp
  _esc_mp=$("$_MW_PRINTF" '%s' "${MANIFEST_PATH:-}" | "$_MW_SED" 's/\\/\\\\/g; s/"/\\"/g')
  local _map_evidence="{\"manifest_path\":\"$_esc_mp\",\"physical_check\":$_map_check,\"agent_id\":null,\"checksum\":null,\"breach_flags\":[]}"

  # Delegate to gate_assert — gate_guard fires (exit 99) if no active gate
  gate_assert "$_map_path" "PATH" "$_map_state" "PHYSICAL" "$_map_evidence" >/dev/null || {
    /bin/echo "WARN: manifest_assert_physical: gate_assert failed for $_map_path" >&2
    return 1
  }
}

# ── manifest_record_strict <path> <tier> <reason> ────────────────────────────
# Fail-closed wrapper around manifest_record. If manifest_record returns
# non-zero for any reason, exits 98 immediately — blocking any destructive
# operation that follows. Use this instead of bare manifest_record for every
# call that precedes an rm, find -delete, or tmutil invocation.
manifest_record_strict() {
  manifest_record "$@" || {
    /bin/echo "FATAL: manifest_record_strict: manifest_record failed for '${1:-}'" >&2
    /bin/echo "       Destructive operation blocked. Manifest integrity required." >&2
    exit 98
  }
}

# ── manifest_init_strict <run-label> ─────────────────────────────────────────
# v1.2.0: wraps manifest_init (which now also calls gate_open) with hard abort
# on any failure. Verifies MANIFEST_PATH + GATE_ID + JOURNAL_PATH after init.
# Destructive scripts MUST use this instead of bare manifest_init.
manifest_init_strict() {
  local label="${1:?manifest_init_strict requires a label}"

  # Verify the writer was sourced
  if ! declare -F manifest_init >/dev/null; then
    /bin/echo "FATAL: manifest_writer.sh not sourced. Refusing destructive run." >&2
    exit 98
  fi

  # Try init (manifest_init now calls gate_open before writing manifest file)
  manifest_init "$label" || {
    /bin/echo "FATAL: manifest_init failed. Refusing destructive run." >&2
    /bin/echo "       Per v1.2.0 rule: a failed gate invalidates authorization." >&2
    exit 98
  }

  # Verify MANIFEST_PATH was set and file exists (legacy check)
  if [ -z "${MANIFEST_PATH:-}" ]; then
    /bin/echo "FATAL: manifest_init returned 0 but MANIFEST_PATH is empty. Refusing." >&2
    exit 98
  fi
  if [ ! -f "$MANIFEST_PATH" ]; then
    /bin/echo "FATAL: manifest file does not exist at $MANIFEST_PATH. Refusing." >&2
    exit 98
  fi

  # Verify GATE_ID and JOURNAL_PATH (new — delegation layer)
  if [ -z "${GATE_ID:-}" ]; then
    /bin/echo "FATAL: manifest_init returned 0 but GATE_ID is empty. Refusing." >&2
    exit 98
  fi
  if [ -z "${JOURNAL_PATH:-}" ] || [ ! -f "${JOURNAL_PATH}" ]; then
    /bin/echo "FATAL: journal file missing at ${JOURNAL_PATH:-<unset>}. Refusing." >&2
    exit 98
  fi

  /bin/echo "manifest gate verified: $MANIFEST_PATH"
  /bin/echo "journal gate verified:  $JOURNAL_PATH (GATE_ID=${GATE_ID})"
}
