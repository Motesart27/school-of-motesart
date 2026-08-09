/**
 * evidenceClient.js — M1 canonical evidence write path (PKG-FE · R1 remediated)
 *
 * Single client for POST /concept-state/{student_instrument_id}/practice-event
 * against the backend R1 contract @ 69147f5 (EvidenceEvent v1, schema_version 1).
 *
 * Rules (M1_SPEC + MYA M1 R1 frontend card):
 *  - Identity comes ONLY from the canonical learning-identity snapshot kept by
 *    AuthContext (GET /auth/learning-identity). No email lookups, no caller-
 *    injected instruments, no default_student. Unresolved / selection-pending
 *    identity → NO POST.
 *  - concept_id must be canonical T_* or R_* — never invented. Non-canonical → skip + warn.
 *  - assignment_id must be the canonical Airtable rec… record id — the
 *    Autonumber assignment_number NEVER links evidence or completion.
 *  - grade_band only when authoritative (lock package T_*); bandless events
 *    stay bandless — never a "3-5" default (backend R1: nullable).
 *  - 403 wrong_student → FAIL CLOSED (no queue, no identity substitution).
 *  - 409 selection_required → back to explicit instrument selection.
 *  - 409 duplicate_event_mismatch → surfaced as a CONTRACT FAILURE, never
 *    rewritten or replayed with changes.
 *  - 503 / network → retryable: queued in som_evidence_queue with the exact
 *    client_event_id and an immutable canonical payload; flush re-sends the
 *    same bytes. flushEvidenceQueue() runs on app start + login + 'online'.
 *  - Article XIII: NEVER surface raw numerics (accuracy/mastery/confidence/DPM)
 *    to the UI. This module returns constitutional tier language only.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'
const QUEUE_KEY = 'som_evidence_queue'
const IDENTITY_SNAPSHOT_KEY = 'som_learning_identity'
const REQUEST_TIMEOUT_MS = 15000
const MAX_QUEUE_LENGTH = 200
const CANONICAL_CONCEPT_RE = /^(T|R)_[A-Z0-9_]+$/
// Airtable record ids: 'rec' + 14 alphanumerics. The ONLY completion/evidence
// linkage key (M1 R1 fix 6). assignment_number (Autonumber) never identifies.
const CANONICAL_ASSIGNMENT_RE = /^rec[A-Za-z0-9]{14,}$/

// ─── identity ────────────────────────────────────────────────────────────────

/**
 * Learning identity from the AuthContext-maintained cache snapshot
 * (som_learning_identity). The snapshot mirrors GET /auth/learning-identity —
 * it is a convenience pointer, never authority; AuthContext re-validates it
 * against the backend on every login/boot (M1 R1 fixes 1–3, 14).
 *
 * Returns { student_instrument_id: string|null, resolved: boolean }.
 * resolved is true ONLY when the identity fetch settled AND an effective
 * instrument exists (canonical resolved id, or an explicit validated
 * selection). No default_student fallback — unresolved means no writes.
 */
export function getLearningIdentity() {
  try {
    const raw = localStorage.getItem(IDENTITY_SNAPSHOT_KEY)
    if (!raw) return { student_instrument_id: null, resolved: false }
    const snap = JSON.parse(raw)
    const si = snap?.ready === true ? (snap?.student_instrument_id || null) : null
    return { student_instrument_id: si, resolved: !!si }
  } catch {
    return { student_instrument_id: null, resolved: false }
  }
}

/** True only for a canonical Airtable rec… assignment id (never a number). */
export function isCanonicalAssignmentId(value) {
  return typeof value === 'string' && CANONICAL_ASSIGNMENT_RE.test(value)
}

/** Public helper: stable uuid for callers that pin one event per session. */
export function newClientEventId() {
  return makeClientEventId()
}

function makeClientEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // RFC4122-v4 shape fallback for very old WebViews
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ─── constitutional tier language (Article XIII) ─────────────────────────────

const TIER_MESSAGES = {
  mastered: 'Mastered — this one is locked in.',
  owned: 'Owned it — this one is yours.',
  almost_owned: 'Almost owned — one more clean pass.',
  developing: 'Solid — keep the beat steady.',
  practicing: 'Good work — keep practicing it.',
  not_ready: 'Not yet — back up and build it slow.',
  needs_replay: 'Not yet — run it again and lock the pattern.',
  mastery_ready: 'Owned it — ready for the next step.',
}

/**
 * Translate an internal tier token into student-facing language.
 * Never returns numbers. Unknown tiers get a safe neutral line.
 */
export function tierMessage(tier) {
  if (!tier) return 'Progress saved — keep going.'
  const key = String(tier).toLowerCase()
  return TIER_MESSAGES[key] || 'Progress saved — keep going.'
}

/** Sanitize a backend response into UI-safe fields (tier language only). */
function toUiSafeResult(body) {
  const tier = body?.confidence_tier || body?.tier || null
  return {
    ok: true,
    queued: false,
    tier,
    tierLabel: tier ? String(tier).replace(/_/g, ' ') : null,
    message: tierMessage(tier),
    assignmentStatus: body?.assignment_status || null,
  }
}

// ─── grade band resolution (from lock package — never invented) ──────────────

let _gradeBandResolver = null
async function resolveGradeBand(conceptId) {
  if (!conceptId || !conceptId.startsWith('T_')) return null
  try {
    if (!_gradeBandResolver) {
      _gradeBandResolver = await import('../lesson_engine/lock_package_bridge_config.js')
    }
    const mod = _gradeBandResolver
    const profile = mod.PILOT_CONCEPT_PROFILES?.[conceptId]
    if (profile?.grade_band) return profile.grade_band
    const phaseId = mod.getPhaseForConcept?.(conceptId)
    if (phaseId && mod.PHASE_MAP?.[phaseId]?.grade_band) return mod.PHASE_MAP[phaseId].grade_band
  } catch {
    /* lock package unavailable — omit rather than invent */
  }
  return null
}

// ─── queue ───────────────────────────────────────────────────────────────────

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const q = raw ? JSON.parse(raw) : []
    return Array.isArray(q) ? q : []
  } catch {
    return []
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_LENGTH)))
  } catch (e) {
    console.warn('[EvidenceClient] Failed to persist retry queue:', e)
  }
}

function enqueue(studentInstrumentId, event) {
  const queue = readQueue()
  // client_event_id already fixed on the event — retries stay idempotent
  queue.push({ si: studentInstrumentId, event, queued_at: new Date().toISOString(), attempts: 0 })
  writeQueue(queue)
  console.info('[EvidenceClient] Evidence queued for retry:', event.client_event_id)
}

// ─── transport ───────────────────────────────────────────────────────────────

async function postEvidence(studentInstrumentId, event) {
  const token = localStorage.getItem('som_token')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(
      `${API_URL}/concept-state/${encodeURIComponent(studentInstrumentId)}/practice-event`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      }
    )
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

/** Statuses where a later retry can succeed (auth refresh / server recovery).
 *  503 (identity/evidence dependency down) is EXPLICITLY retryable — never a
 *  permanent verdict. 403/409 are NEVER here: 403 wrong_student fails closed
 *  (no retry under another identity) and 409s are contract signals. */
function isQueueableStatus(status) {
  return status === 401 || status === 408 || status === 429 || status >= 500
}

/** Read the backend error detail ('wrong_student', 'selection_required',
 *  'duplicate_event_mismatch', 'identity_unavailable_retryable', …). */
async function readDetail(res) {
  const body = await res.json().catch(() => ({}))
  return typeof body?.detail === 'string' ? body.detail : ''
}

/** 409 selection_required → hand control back to the explicit selection flow. */
function signalSelectionRequired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('som:selection-required'))
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Submit one EvidenceEvent v1. Fills client_event_id / schema_version /
 * event_timestamp when absent, resolves grade_band from the lock package when
 * possible, and NEVER returns raw numerics — only tier + labels.
 *
 * Returns:
 *   { ok:true,  queued:false, tier, tierLabel, message, assignmentStatus }
 *   { ok:false, queued:true,  message }   — stored in som_evidence_queue
 *   { ok:false, queued:false, message }   — rejected (non-canonical/identity/4xx)
 */
export async function submitEvidenceEvent(event) {
  if (!event || typeof event !== 'object') {
    console.warn('[EvidenceClient] submitEvidenceEvent called without an event')
    return { ok: false, queued: false, message: 'Nothing to save yet.' }
  }

  // Canonical concept guard — no invented concept IDs (M1 constraint)
  const conceptId = event.concept_id
  if (!conceptId || !CANONICAL_CONCEPT_RE.test(conceptId)) {
    console.warn('[EvidenceClient] Non-canonical concept_id — evidence skipped:', conceptId)
    return { ok: false, queued: false, message: 'Progress noted for this activity.' }
  }

  // Identity guard — canonical identity ONLY (M1 R1 fix 4). The instrument
  // comes exclusively from the resolved/explicitly-selected learning identity;
  // callers cannot inject one. Unresolved or selection-pending → NO POST.
  const identity = getLearningIdentity()
  const si = identity.student_instrument_id
  if (!si) {
    console.warn('[EvidenceClient] No canonical student_instrument_id (unresolved or selection pending) — evidence NOT posted')
    return { ok: false, queued: false, message: 'Sign in to save your practice progress.' }
  }

  // Canonical assignment linkage guard (fix 6): only a real Airtable rec… id
  // may link evidence to homework. A numeric/legacy identifier is dropped with
  // a warning — never sent, never treated as completion identity.
  const { student_instrument_id: _omit, assignment_id: rawAssignmentId, ...rest } = event
  const fullEvent = {
    schema_version: 1,
    client_event_id: rest.client_event_id || makeClientEventId(),
    event_timestamp: rest.event_timestamp || new Date().toISOString(),
    ...rest,
  }
  if (rawAssignmentId !== undefined && rawAssignmentId !== null && rawAssignmentId !== '') {
    if (isCanonicalAssignmentId(rawAssignmentId)) {
      fullEvent.assignment_id = rawAssignmentId
    } else {
      console.warn('[EvidenceClient] Non-canonical assignment identifier — evidence sent WITHOUT homework linkage:', rawAssignmentId)
    }
  }
  if (!fullEvent.grade_band) {
    // grade_band resolves from the lock package for T_* only. R_* concepts have
    // no authoritative band source → the field stays ABSENT (backend R1 §9:
    // nullable; a bandless event persists no band). Never a "3-5" default.
    const band = await resolveGradeBand(conceptId)
    if (band) fullEvent.grade_band = band
  }

  try {
    const res = await postEvidence(si, fullEvent)
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      return toUiSafeResult(body)
    }
    if (res.status === 403) {
      // Wrong-student — FAIL CLOSED (fix 4): no queue, no retry, and NEVER a
      // silent retry under another identity.
      console.error('[EvidenceClient] 403 wrong_student — evidence refused, failing closed (no retry, no identity substitution)')
      return { ok: false, queued: false, failClosed: true, message: 'Not saved — this sign-in does not match this student’s records.' }
    }
    if (res.status === 409) {
      const detail = await readDetail(res)
      if (detail === 'selection_required') {
        console.warn('[EvidenceClient] 409 selection_required — returning to explicit instrument selection')
        signalSelectionRequired()
        return { ok: false, queued: false, needsSelection: true, message: 'Pick your instrument to save your practice.' }
      }
      if (detail === 'duplicate_event_mismatch') {
        // Contract failure: a retry may never differ from the persisted event.
        // Surfaced loudly — never rewritten, never replayed with mutations.
        console.error('[EvidenceClient] CONTRACT FAILURE 409 duplicate_event_mismatch — a queued/retried event no longer matches its persisted canonical row. Event:', fullEvent.client_event_id)
        return { ok: false, queued: false, contractMismatch: true, message: 'Progress noted for this activity.' }
      }
      console.warn('[EvidenceClient] Evidence rejected (409):', detail)
      return { ok: false, queued: false, message: 'Progress noted for this activity.' }
    }
    if (isQueueableStatus(res.status)) {
      // 503 identity/evidence dependency failure and friends — retryable,
      // offline-safe, same client_event_id on every retry.
      enqueue(si, fullEvent)
      return { ok: false, queued: true, message: 'Saved — will sync when you are back online.' }
    }
    const errBody = await res.json().catch(() => ({}))
    console.warn(`[EvidenceClient] Evidence rejected (${res.status}):`, errBody?.detail || errBody)
    return { ok: false, queued: false, message: 'Progress noted for this activity.' }
  } catch (err) {
    // Network failure / timeout — queue for retry
    enqueue(si, fullEvent)
    console.info('[EvidenceClient] Network unavailable — evidence queued:', err?.message)
    return { ok: false, queued: true, message: 'Saved — will sync when you are back online.' }
  }
}

let _flushing = false

/**
 * Drain the retry queue once. REGRESSION LOCK (M1 R1 fix 13):
 *   · each queued item keeps its exact client_event_id
 *   · the queued canonical payload is NEVER mutated after first submission —
 *     the flush POSTs item.event exactly as enqueued (only the wrapper's
 *     attempts counter changes, never the event)
 *   · 409 duplicate_event_mismatch is surfaced as a CONTRACT FAILURE — the
 *     event is never rewritten or replayed with changes
 *   · 403 wrong_student fails closed — dropped loudly, never retried under
 *     another identity
 *   · network/5xx/408/429/401 stay queued for the next flush (retryable)
 */
export async function flushEvidenceQueue() {
  if (_flushing) return { flushed: 0, remaining: readQueue().length, contractFailures: [] }
  const queue = readQueue()
  if (!queue.length) return { flushed: 0, remaining: 0, contractFailures: [] }
  _flushing = true
  let flushed = 0
  const keep = []
  const contractFailures = []
  try {
    for (const item of queue) {
      if (!item?.event || !item?.si) continue
      try {
        const res = await postEvidence(item.si, item.event)
        if (res.ok) {
          flushed += 1
        } else if (res.status === 403) {
          console.error(
            '[EvidenceClient] CONTRACT: 403 wrong_student on queued event — failing closed, dropped (no identity substitution):',
            item.event.client_event_id
          )
          contractFailures.push({ client_event_id: item.event.client_event_id, reason: 'wrong_student' })
        } else if (res.status === 409) {
          const detail = await readDetail(res)
          if (detail === 'duplicate_event_mismatch') {
            console.error(
              '[EvidenceClient] CONTRACT FAILURE: 409 duplicate_event_mismatch on queued event — surfaced, NOT rewritten/replayed:',
              item.event.client_event_id
            )
            contractFailures.push({ client_event_id: item.event.client_event_id, reason: 'duplicate_event_mismatch' })
          } else if (detail === 'selection_required') {
            console.error(
              '[EvidenceClient] CONTRACT: 409 selection_required on queued event — dropped (a pinned event may not change identity); returning to selection:',
              item.event.client_event_id
            )
            contractFailures.push({ client_event_id: item.event.client_event_id, reason: 'selection_required' })
            signalSelectionRequired()
          } else {
            console.warn(`[EvidenceClient] Dropping rejected queued event (409 ${detail}):`, item.event.client_event_id)
          }
        } else if (isQueueableStatus(res.status)) {
          keep.push({ ...item, attempts: (item.attempts || 0) + 1 })
        } else {
          console.warn(
            `[EvidenceClient] Dropping permanently rejected queued event (${res.status}):`,
            item.event.client_event_id
          )
        }
      } catch {
        keep.push({ ...item, attempts: (item.attempts || 0) + 1 })
      }
    }
  } finally {
    writeQueue(keep)
    _flushing = false
  }
  if (flushed) console.info(`[EvidenceClient] Flushed ${flushed} queued evidence event(s)`)
  return { flushed, remaining: keep.length, contractFailures }
}

/**
 * Read-through canonical state: GET /concept-state/{si}/{concept_id}.
 * Returns the raw canonical state object (caller decides caching) or null.
 * UI layers must translate through tierMessage — never render raw numerics.
 */
export async function fetchConceptState(conceptId, studentInstrumentId) {
  if (!conceptId || !CANONICAL_CONCEPT_RE.test(conceptId)) return null
  const si = studentInstrumentId || getLearningIdentity().student_instrument_id
  if (!si) return null
  const token = localStorage.getItem('som_token')
  try {
    const res = await fetch(
      `${API_URL}/concept-state/${encodeURIComponent(si)}/${encodeURIComponent(conceptId)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Flush automatically whenever connectivity returns (app start + login flushes
// are wired in AuthContext). Guarded so module re-evaluation never double-binds.
if (typeof window !== 'undefined' && !window.__somEvidenceOnlineBound) {
  window.__somEvidenceOnlineBound = true
  window.addEventListener('online', () => {
    flushEvidenceQueue()
  })
}

export default {
  submitEvidenceEvent,
  flushEvidenceQueue,
  fetchConceptState,
  getLearningIdentity,
  isCanonicalAssignmentId,
  tierMessage,
}
