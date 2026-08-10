import React from 'react'
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { isCanonicalAssignmentId } from '../services/evidenceClient.js'

// SOM Mastery Intelligence Engine — governed gates (LIVE, preserved).
import MajorScalePatternGate from '../components/gate0/MajorScalePatternGate.jsx'
import FindHomeGate from '../components/gate0/FindHomeGate.jsx'
import SkipAndTogetherGate from '../components/gate0/SkipAndTogetherGate.jsx'

/**
 * PracticeChapterWrapper — M1 R2-FE.1 LEGACY LEARNING-AUTHORITY QUARANTINE.
 *
 * This wrapper previously loaded Converter Concept_State
 * (motesart-converter.netlify.app/api/concept-state/…) to pick a legacy
 * proof-loop chapter (FindIt/PlayIt/MoveIt/OwnIt + ScaleDegrees/HalfStep
 * families), whose runtime derived confidence/mastery in the browser, wrote
 * local Concept_State, POSTed evidence to Converter /api/practice-events and
 * asked Converter to recompute Concept_State. That entire system violated
 * Decision ① (Railway/SOM is the SOLE canonical learning-state authority;
 * Practice_Events is the canonical evidence ledger; Concept_State is the
 * canonical derived state; localStorage is cache only) and is DECOMMISSIONED
 * from live student runtime.
 *
 * What remains routable here:
 *
 *   1. Governed gates (unchanged behavior, evidence flag stays OFF):
 *        /practice/C_MAJOR_GATE_0
 *        /practice/C_MAJOR_GATE_FIND_HOME
 *        /practice/C_MAJOR_GATE_SKIP_TOGETHER
 *
 *   2. Every other conceptId redirects to canonical Practice Live:
 *        /practice/T_HALF_STEP  →  /practice-live?concept=T_HALF_STEP
 *      The concept id is passed through EXACTLY (no alias, no default
 *      substitution). Practice Live's canonical resolver renders supported
 *      concepts and FAILS CLOSED (student-safe "not ready" screen with
 *      Back to Homework) for anything unknown. A canonical rec… assignment_id
 *      query parameter is preserved across the redirect; malformed ones are
 *      dropped (assignment_number is never an identifier).
 *
 * ZERO Converter learning-state traffic originates here: no
 * /api/concept-state reads, no /api/practice-events writes, no recompute.
 */

export default function PracticeChapterWrapper() {
  const { conceptId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // ── Governed gates (LIVE) — network evidence remains OFF ──
  if (conceptId === 'C_MAJOR_GATE_0') {
    return <MajorScalePatternGate onGatePassed={(result) => {
      try {
        sessionStorage.setItem('gate0_result', JSON.stringify({
          gateId: 'C_MAJOR_GATE_0',
          concept: 'major_scale_pattern',
          completedAt: new Date().toISOString(),
          ...result,
        }))
      } catch (e) {
        // sessionStorage unavailable — safe to continue
      }
      navigate('/student')
    }} />
  }

  if (conceptId === 'C_MAJOR_GATE_FIND_HOME') {
    return <FindHomeGate onGatePassed={(result) => {
      try {
        sessionStorage.setItem('gate0_find_home_result', JSON.stringify({
          gateId: 'C_MAJOR_GATE_FIND_HOME',
          concept: 'find_home',
          completedAt: new Date().toISOString(),
          ...result,
        }))
      } catch (e) {}
      navigate('/student')
    }} />
  }

  if (conceptId === 'C_MAJOR_GATE_SKIP_TOGETHER') {
    return <SkipAndTogetherGate onGatePassed={(result) => {
      try {
        sessionStorage.setItem('gate1_skip_together_result', JSON.stringify({
          gateId: 'C_MAJOR_GATE_SKIP_TOGETHER',
          concept: 'skip_and_together',
          completedAt: new Date().toISOString(),
          ...result,
        }))
      } catch (e) {}
      navigate('/student')
    }} />
  }

  // ── Canonical practice — one authority, one surface ──
  // The concept id travels verbatim; Practice Live resolves it canonically or
  // fails closed. Only a canonical rec… assignment_id survives the redirect.
  const params = new URLSearchParams()
  params.set('concept', conceptId || '')
  const incoming = new URLSearchParams(location.search)
  const asgn = incoming.get('assignment_id')
  if (asgn && isCanonicalAssignmentId(asgn)) params.set('assignment_id', asgn)

  return <Navigate to={`/practice-live?${params.toString()}`} replace />
}
