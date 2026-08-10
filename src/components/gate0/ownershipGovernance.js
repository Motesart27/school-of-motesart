/**
 * ownershipGovernance.js — M1 R2-FE §F/§G Gate ownership resolution.
 *
 * §F  THE ownership question is DATA, not JSX: it is resolved from the lesson
 *     JSON as the unique `is_ownership_gate === true` question inside
 *     gate_steps.step_6_quiz_it.questions (G1_Q7 in L01_skip_and_together).
 *     Zero or multiple ownership questions = broken lesson data → callers
 *     receive null and must fail clearly. No component ever carries a second,
 *     divergent hardcoded signal list.
 *
 * §G  TWO-PROOF GOVERNANCE (ratified Gate 1 contract): Gate 1 certifies TWO
 *     canonical concepts — Together → T_HALF_STEP and Skip → T_WHOLE_STEP —
 *     with ONE ownership verdict, so the explanation must prove BOTH semantic
 *     sides. This is configuration-driven: the ownership question may carry
 *
 *         required_signal_groups: { skip: [...], together: [...] }
 *
 *     and the evaluator requires at least one match in EVERY group. A lesson
 *     without groups keeps the single acceptable_signals contract (one list,
 *     any match). Motesart language comes first in the lesson data; this file
 *     evaluates, it never defines vocabulary. Presentation/proof config only —
 *     no canonical concept ids are created, renamed, or aliased here.
 */

/**
 * Locate the unique ownership question in a gate lesson.
 * @returns the question object, or null when zero/multiple exist (broken data).
 */
export function resolveOwnershipQuestion(lesson) {
  const questions = lesson?.gate_steps?.step_6_quiz_it?.questions
  if (!Array.isArray(questions)) return null
  const owners = questions.filter(q => q && q.is_ownership_gate === true)
  if (owners.length !== 1) {
    console.error(
      `[GateOwnership] Lesson data must contain exactly ONE is_ownership_gate question — found ${owners.length}`
    )
    return null
  }
  return owners[0]
}

function _groupMatches(signalList, text) {
  return (Array.isArray(signalList) ? signalList : []).some(
    s => s && text.includes(String(s).toLowerCase())
  )
}

/**
 * Evaluate a student's ownership explanation against the ownership question.
 * With required_signal_groups: EVERY group must match (two-proof, §G).
 * Without groups: legacy single-list acceptable_signals (any match).
 */
export function ownershipExplanationPasses(question, rawAnswer) {
  const text = String(rawAnswer || '').toLowerCase()
  if (!question) return false
  const groups = question.required_signal_groups
  if (groups && typeof groups === 'object' && !Array.isArray(groups)
      && Object.keys(groups).length > 0) {
    return Object.values(groups).every(list => _groupMatches(list, text))
  }
  return _groupMatches(question.acceptable_signals, text)
}
