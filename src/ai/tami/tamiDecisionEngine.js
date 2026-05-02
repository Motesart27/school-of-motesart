import { TAMI_CONTEXTS } from './tamiSignalIntakeEngine.js'

export const TAMI_PRIORITIES = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  NONE: 'NONE'
}

export const TAMI_ACTIONS = {
  DELEGATE_TO_MOTESART: 'DELEGATE_TO_MOTESART',
  SURFACE_STRUGGLE: 'SURFACE_STRUGGLE',
  SURFACE_ATTENTION: 'SURFACE_ATTENTION',
  FAMILY_PROGRESS: 'FAMILY_PROGRESS',
  HOMEWORK_STATUS: 'HOMEWORK_STATUS',
  INTERVENTION_NEEDED: 'INTERVENTION_NEEDED',
  NOMINAL: 'NOMINAL'
}

export function runTamiDecisionEngine(signals = {}) {
  if (signals.contextType === TAMI_CONTEXTS.LESSON_MUSIC) {
    return {
      shouldRespond: false,
      action: TAMI_ACTIONS.DELEGATE_TO_MOTESART,
      priority: TAMI_PRIORITIES.NONE,
      reason: 'music_concept_question_inside_lesson'
    }
  }

  const scores = signals.derivedScores || {}
  const lowMotivation = scores.motivationRiskScore >= 65 || signals.dpm?.motivation <= 35 || signals.dpm?.overall <= 35
  const highErrors = scores.errorRiskScore >= 60 || scores.struggleLoadScore >= 50 || signals.errorCount >= 3 || signals.wrongStreak >= 2 || signals.strugglingCount >= 1
  const highHints = scores.hintLoadScore >= 70 || signals.hintCount >= 2 || signals.memorySnapshot?.engagement?.confusionCount >= 2

  if (lowMotivation && highErrors && highHints) {
    return {
      shouldRespond: true,
      action: TAMI_ACTIONS.INTERVENTION_NEEDED,
      priority: TAMI_PRIORITIES.P0,
      reason: 'low_motivation_high_error_high_hint'
    }
  }

  if ((highErrors && highHints) || signals.engagementTrend === 'disengaging') {
    return {
      shouldRespond: true,
      action: TAMI_ACTIONS.INTERVENTION_NEEDED,
      priority: TAMI_PRIORITIES.P1,
      reason: 'student_support_needed'
    }
  }

  const message = String(signals.userMessage || '').toLowerCase()
  if (/who is struggling/.test(message)) {
    return {
      shouldRespond: true,
      action: TAMI_ACTIONS.SURFACE_STRUGGLE,
      priority: signals.strugglingCount > 0 ? TAMI_PRIORITIES.P1 : TAMI_PRIORITIES.NONE,
      reason: 'teacher_struggle_query'
    }
  }

  if (/what needs attention|what's urgent|what is urgent|attention/.test(message)) {
    return {
      shouldRespond: true,
      action: TAMI_ACTIONS.SURFACE_ATTENTION,
      priority: highErrors || lowMotivation ? TAMI_PRIORITIES.P1 : TAMI_PRIORITIES.NONE,
      reason: 'operator_attention_query'
    }
  }

  if (/homework|assignment/.test(message)) {
    return {
      shouldRespond: true,
      action: TAMI_ACTIONS.HOMEWORK_STATUS,
      priority: TAMI_PRIORITIES.P2,
      reason: 'student_homework_query'
    }
  }

  if (/child|how did|progress/.test(message) || signals.contextType === TAMI_CONTEXTS.FAMILY_UPDATE) {
    return {
      shouldRespond: true,
      action: TAMI_ACTIONS.FAMILY_PROGRESS,
      priority: TAMI_PRIORITIES.P2,
      reason: 'family_progress_query'
    }
  }

  return {
    shouldRespond: true,
    action: TAMI_ACTIONS.NOMINAL,
    priority: TAMI_PRIORITIES.NONE,
    reason: 'nominal'
  }
}
