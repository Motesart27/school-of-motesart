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

// M1 R3.1-FE §I — plain substring containment let phrases proving only ONE
// side falsely satisfy the OTHER side's group whenever a bare skip signal
// (e.g. "note between") is itself a literal substring of a together signal's
// negated phrasing (e.g. "no note between"). "Together has no note between
// them." must FAIL (it never proves Skip) — but the bare "note between"
// substring sits right inside "no note between", so naive .includes() gave
// it credit for Skip too. A signal match is only counted when it is NOT
// immediately preceded by a negation word, unless the signal's own text
// already starts with that negation (so the together group's own "no note
// between" phrasing still matches normally). All occurrences are scanned —
// not just the first — so a real dual-proof answer ("Together has no note
// between them, while Skip has one note between.") still passes.
const NEGATION_WORDS = ['no', 'not', 'never']

function _precededByNegation(text, matchIndex) {
  const before = text.slice(0, matchIndex).trimEnd()
  const lastWord = (before.split(/\s+/).pop() || '').replace(/[^a-z']/g, '')
  return NEGATION_WORDS.includes(lastWord)
}

function _signalMatches(signal, text) {
  const sig = String(signal || '').toLowerCase()
  if (!sig) return false
  if (new RegExp(`^(${NEGATION_WORDS.join('|')})\\b`).test(sig)) {
    // The signal itself already asserts the negation (e.g. "no note
    // between") — plain containment is correct here.
    return text.includes(sig)
  }
  let idx = text.indexOf(sig)
  while (idx !== -1) {
    if (!_precededByNegation(text, idx)) return true
    idx = text.indexOf(sig, idx + 1)
  }
  return false
}

function _groupMatches(signalList, text) {
  return (Array.isArray(signalList) ? signalList : []).some(s => _signalMatches(s, text))
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
