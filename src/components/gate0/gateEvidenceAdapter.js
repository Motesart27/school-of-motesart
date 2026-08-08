/**
 * gateEvidenceAdapter.js — Gate 0/1/2 canonical-evidence seam (PKG-FE)
 *
 * FEATURE-HELD under M1_SPEC Amendment 4: gate → canonical evidence writes are
 * NOT enabled in this package. This module is the flag-gated-OFF seam only:
 *
 *   - VITE_GATE_EVIDENCE=1  → adapter maps a gate result onto an EvidenceEvent
 *     draft and hands it to evidenceClient (future enable package).
 *   - flag absent/other     → adapter returns { held: true } and makes NO
 *     network calls. Default state for this package.
 *
 * sessionStorage behavior in the gate components is unchanged — the adapter
 * runs alongside it, never instead of it.
 *
 * Canonical rule: gates whose concept has no canonical T_* id yet are skipped
 * with a log — concept IDs are never invented.
 */

export const GATE_EVIDENCE_ENABLED = import.meta.env.VITE_GATE_EVIDENCE === '1'

// Canonical concept mapping for gate surfaces. null = no canonical T_* id
// assigned in the lock package yet → evidence must be skipped, never invented.
const GATE_CANONICAL_CONCEPTS = {
  major_scale_pattern: 'T_MAJOR_SCALE_PATTERN',
  find_home: null,
  skip_and_together: null,
}

/**
 * Shared gate-result construction (extracted from the three gate components).
 * Field order matches the legacy inline objects so sessionStorage payloads
 * stay byte-compatible.
 */
export function buildGateResult({ gateId, concept, executionScore, ownershipPassed, feelCheckData, confidenceScore }) {
  return {
    ...(gateId !== undefined ? { gateId } : {}),
    ...(concept !== undefined ? { concept } : {}),
    completedAt: new Date().toISOString(),
    executionScore,
    ownershipPassed,
    ...(feelCheckData !== undefined ? { feelCheckData } : {}),
    ...(confidenceScore !== undefined ? { confidenceScore } : {}),
  }
}

/**
 * The evidence seam. Fire-and-forget from gate completion sites.
 * Returns a status object; performs NO network I/O while the flag is OFF.
 */
export async function gateEvidenceAdapter(result) {
  if (!GATE_EVIDENCE_ENABLED) {
    console.info('[GateEvidence] Seam held (Amendment 4) — no evidence write:', result?.concept)
    return { submitted: false, held: true, reason: 'feature_held_amendment_4' }
  }

  const canonical = result?.concept ? GATE_CANONICAL_CONCEPTS[result.concept] || null : null
  if (!canonical) {
    console.warn('[GateEvidence] No canonical T_* concept for gate — evidence skipped:', result?.concept)
    return { submitted: false, held: false, reason: 'no_canonical_concept' }
  }

  const draft = {
    concept_id: canonical,
    chapter: 'gate0',
    source_activity: 'mastery_gate',
    activity_variant: result.concept,
    result: 'pass',
    proof: {
      ownership_passed: !!result.ownershipPassed,
      no_look: !!(result.feelCheckData && (result.feelCheckData.no_look ?? result.feelCheckData.noLook)),
      feel_check: !!result.feelCheckData,
    },
  }

  // Dynamic import keeps evidenceClient completely out of gate bundles' side
  // effects while the flag is OFF.
  const { submitEvidenceEvent } = await import('../../services/evidenceClient.js')
  const res = await submitEvidenceEvent(draft)
  return { submitted: !!res.ok, queued: !!res.queued, reason: res.ok ? 'submitted' : (res.queued ? 'queued' : 'rejected'), draft }
}

export default { GATE_EVIDENCE_ENABLED, buildGateResult, gateEvidenceAdapter }
