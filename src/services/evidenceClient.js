/**
 * evidenceClient.js — M1 canonical evidence write path (PKG-FE)
 *
 * Single client for POST /concept-state/{student_instrument_id}/practice-event
 * against the frozen M1 backend contract (EvidenceEvent v1, schema_version 1).
 *
 * Rules (M1_SPEC amended 2026-08-08, MYA Amendments 1–4):
 *  - concept_id must be canonical T_* or R_* — never invented. Non-canonical → skip + warn.
 *  - No 'default_student' fallbacks anywhere. No identity → no evidence.
 *  - Article XIII: NEVER surface raw numerics (accuracy/mastery/confidence/DPM)
 *    to the UI. This module returns constitutional tier language only.
 *  - Offline / queueable failures push to the som_evidence_queue localStorage
 *    retry queue. flushEvidenceQueue() runs on app start + login + 'online'.
 *  - client_event_id is preserved across retries → backend idempotent 200.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'
const QUEUE_KEY = 'som_evidence_queue'
const REQUEST_TIMEOUT_MS = 15000
const MAX_QUEUE_LENGTH = 200
const CANONICAL_CONCEPT_RE = /^(T|R)_[A-Z0-9_]+$/

// ─── identity ────────────────────────────────────────────────────────────────

/**
 * Learning identity from the persisted som_user (set by AuthContext).
 * Returns { student_instrument_id: string|null, resolved: boolean }.
 * NO default_student fallback — unresolved identity means no evidence writes.
 */
export function getLearningIdentity() {
  try {
    const raw = localStorage.getItem('som_user')
    if (!raw) return { student_instrument_id: null, resolved: false }
    const user = JSON.parse(raw)
    const si = user?.student_instrument_id || null
    return { student_instrument_id: si, resolved: !!si }
  } catch {
    return { student_instrument_id: null, resolved: false }
  }
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

/** Statuses where a later retry can succeed (auth refresh / server recovery). */
function isQueueableStatus(status) {
  return status === 401 || status === 408 || status === 429 || status >= 500
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

  // Identity guard — no default_student fallbacks in the M1 path
  const identity = getLearningIdentity()
  const si = event.student_instrument_id || identity.student_instrument_id
  if (!si) {
    console.warn('[EvidenceClient] No student_instrument_id resolved — evidence skipped (sign in required)')
    return { ok: false, queued: false, message: 'Sign in to save your practice progress.' }
  }

  const { student_instrument_id: _omit, ...rest } = event
  const fullEvent = {
    schema_version: 1,
    client_event_id: rest.client_event_id || makeClientEventId(),
    event_timestamp: rest.event_timestamp || new Date().toISOString(),
    ...rest,
  }
  if (!fullEvent.grade_band) {
    const band = await resolveGradeBand(conceptId)
    if (band) fullEvent.grade_band = band
  }

  try {
    const res = await postEvidence(si, fullEvent)
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      return toUiSafeResult(body)
    }
    if (isQueueableStatus(res.status)) {
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
 * Drain the retry queue once. Preserves each item's original client_event_id so
 * the backend can dedupe (idempotent 200). Permanent 4xx rejections are dropped
 * with a warning; network/5xx/401 failures stay queued for the next flush.
 */
export async function flushEvidenceQueue() {
  if (_flushing) return { flushed: 0, remaining: readQueue().length }
  const queue = readQueue()
  if (!queue.length) return { flushed: 0, remaining: 0 }
  _flushing = true
  let flushed = 0
  const keep = []
  try {
    for (const item of queue) {
      if (!item?.event || !item?.si) continue
      try {
        const res = await postEvidence(item.si, item.event)
        if (res.ok) {
          flushed += 1
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
  return { flushed, remaining: keep.length }
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
  tierMessage,
}
