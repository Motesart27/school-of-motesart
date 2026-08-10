/**
 * practiceLiveEvidence.js — M1 R3-FE §B/§C.
 *
 * Practice Live's canonical evidence + analytics wiring:
 *
 *   Homework → Practice Live → canonical SOM/Railway Practice_Event
 *            → backend assignment completion.
 *
 * §B  The canonical `assignment_id` (Airtable rec… shape, validated by
 *     isCanonicalAssignmentId) is read from the launch URL ONCE, preserved
 *     for the whole session, and submitted VERBATIM with the canonical
 *     evidence event. It is never fabricated: free practice submits
 *     assignment_id = null (omitted). The evidence path is the existing SOM
 *     submitEvidenceEvent route — Practice Log is analytics, never a
 *     substitute for assignment evidence.
 *
 * §C  Academic identity comes EXCLUSIVELY from the canonical learning
 *     identity (resolved / explicitly-selected Student Instruments record —
 *     the same snapshot evidenceClient enforces). The local display user
 *     (`som_user`) is NEVER an academic identity authority; malformed or
 *     unresolved identity fails closed inside submitEvidenceEvent (no POST,
 *     no invented identity), and transient identity outages surface as the
 *     client's retryable states.
 */

import api from './api.js'
import {
  getLearningIdentity,
  isCanonicalAssignmentId,
  newClientEventId,
  submitEvidenceEvent,
} from './evidenceClient.js'

/** The canonical selected/resolved SI — null when unresolved (fail closed). */
export function getCanonicalSi() {
  return getLearningIdentity().student_instrument_id || null
}

/**
 * Read the canonical assignment id from a Practice Live launch URL.
 * Only the exact rec… shape survives; anything else → null (warn, never used).
 */
export function readAssignmentIdFromUrl(search) {
  try {
    const raw = new URLSearchParams(search ?? window.location.search).get('assignment_id')
    if (!raw) return null
    if (isCanonicalAssignmentId(raw)) return raw
    console.warn('[PracticeLive] Non-canonical assignment_id ignored (never fabricated, never substituted):', raw)
    return null
  } catch {
    return null
  }
}

/**
 * Submit the session's canonical Practice_Event via submitEvidenceEvent.
 *
 * trigger 'complete' → the theory lesson finished: result 'complete' and the
 * preserved assignment_id (if any) rides along so the backend completes the
 * homework. Any other trigger (partial end) submits WITHOUT the assignment
 * link — a partial session never completes homework and the assignment stays
 * open for a real completion.
 *
 * Returns the evidenceClient result ({ok/queued/failClosed/needsSelection…})
 * or {skipped:true, reason} when there is nothing canonical to submit.
 */
export async function submitPracticeLiveEvidence({
  conceptId,
  assignmentId = null,
  trigger = 'complete',
  stats = {},
  clientEventId = null,
}) {
  if (!conceptId) {
    return { skipped: true, reason: 'no_canonical_concept' }
  }
  const quiz = stats.quizCorrect || 0
  const practice = stats.practiceCorrect || 0
  const attempts = stats.attempts || quiz + practice
  if (trigger !== 'complete' && quiz + practice <= 0) {
    // Zero academic activity — no fabricated practice evidence.
    return { skipped: true, reason: 'no_session_activity' }
  }
  const completed = trigger === 'complete'
  const event = {
    client_event_id: clientEventId || newClientEventId(),
    concept_id: conceptId,
    source_activity: 'practice_live',
    activity_variant: completed ? 'lesson_complete' : 'session_partial',
    chapter: 'applied',
    result: completed ? 'complete' : (practice + quiz >= 2 ? 'ok' : 'hard'),
    notes_attempted: attempts,
    notes_correct: quiz + practice,
    mistake_tags: [],
    duration_min: Number(((stats.durationSec || 0) / 60).toFixed(2)),
    tempo_factor: 1,
    // §B — the EXACT canonical launch assignment id, only on completion.
    ...(completed && assignmentId && isCanonicalAssignmentId(assignmentId)
      ? { assignment_id: assignmentId }
      : {}),
  }
  return submitEvidenceEvent(event)
}

/**
 * Practice-log ANALYTICS write (coexists with evidence, never replaces it).
 * §C — associated with the canonical Student Instruments identity; without a
 * canonical SI the log is skipped entirely (no som_user fallback, no invented
 * identity).
 */
export async function logPracticeLiveSession({
  studentInstrumentId = null,
  conceptId = null,
  durationMin = 1,
  pieceName = null,
} = {}) {
  const si = studentInstrumentId || getCanonicalSi()
  if (!si) {
    console.warn('[PracticeLive] No canonical student instrument — practice-log analytics skipped (never som_user)')
    return { skipped: true, reason: 'no_canonical_identity' }
  }
  try {
    await api.logPracticeSession({
      student_id: si,
      concept_ids: conceptId || null,
      activity_type: 'live_practice',
      duration_min: durationMin < 1 ? 1 : durationMin,
      piece_name: pieceName,
    })
    return { ok: true }
  } catch (err) {
    console.error('[PracticeLive] practice-log analytics failed:', String(err))
    return { ok: false }
  }
}

// ─── §D — server-authoritative Concept_State read ────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'

/**
 * Read the canonical Concept_State snapshot from Railway, DISTINGUISHING a
 * successful read from an outage (M1 R3-FE §D — an outage must surface as
 * retryable, never as a fabricated phase and never as a stale-cache verdict).
 *
 * Returns:
 *   { ok: true,  state }              — canonical server snapshot (authority)
 *   { ok: false, retryable: true }    — outage / non-OK / no identity yet
 */
export async function fetchServerConceptState(conceptId) {
  const si = getCanonicalSi()
  if (!conceptId || !si) return { ok: false, retryable: true }
  const token = localStorage.getItem('som_token')
  try {
    const res = await fetch(
      `${API_URL}/concept-state/${encodeURIComponent(si)}/${encodeURIComponent(conceptId)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    if (!res.ok) return { ok: false, retryable: true, status: res.status }
    const state = await res.json()
    return { ok: true, state: state && typeof state === 'object' ? state : {} }
  } catch {
    return { ok: false, retryable: true }
  }
}
