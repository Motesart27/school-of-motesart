import { TAMI_ACTIONS } from './tamiDecisionEngine.js'

function listValue(items, fallback = 'none flagged') {
  if (!Array.isArray(items) || items.length === 0) return fallback
  return items.slice(0, 3).join(', ')
}

export function formTamiOutput({ decision, signals } = {}) {
  const action = decision?.action
  const struggling = signals?.stateSnapshot?.performance?.strugglingConcepts || []
  const mastered = signals?.stateSnapshot?.performance?.masteredConcepts || []
  const dpm = signals?.dpm || {}

  if (action === TAMI_ACTIONS.DELEGATE_TO_MOTESART) {
    return {
      responseText: '',
      speechText: '',
      tags: ['Motesart'],
      shouldDeliver: false
    }
  }

  if (action === TAMI_ACTIONS.INTERVENTION_NEEDED) {
    const level = decision.priority === 'P0' ? 'Immediate intervention needed.' : 'Attention needed.'
    return {
      responseText: `${level} Motivation ${dpm.motivation ?? 0}%, errors are elevated, and hints are high.`,
      speechText: `${level} Motivation is low, errors are elevated, and hints are high.`,
      tags: [decision.priority, 'Intervention'],
      shouldDeliver: true
    }
  }

  if (action === TAMI_ACTIONS.SURFACE_STRUGGLE) {
    return {
      responseText: struggling.length > 0
        ? `Students are struggling with: ${listValue(struggling)}.`
        : 'No active struggle pattern is flagged right now.',
      speechText: struggling.length > 0
        ? `Current struggle pattern: ${listValue(struggling)}.`
        : 'No active struggle pattern is flagged right now.',
      tags: ['Teacher', 'Struggle'],
      shouldDeliver: true
    }
  }

  if (action === TAMI_ACTIONS.SURFACE_ATTENTION) {
    return {
      responseText: decision.priority === 'NONE'
        ? 'All signals nominal. No intervention needed.'
        : `Attention needed: ${decision.reason}. DPM is ${dpm.overall ?? 0}%.`,
      speechText: decision.priority === 'NONE'
        ? 'All signals nominal. No intervention needed.'
        : 'Attention needed. Student support signals are elevated.',
      tags: ['Admin', 'Attention'],
      shouldDeliver: true
    }
  }

  if (action === TAMI_ACTIONS.HOMEWORK_STATUS) {
    return {
      responseText: 'I can check homework status from the school layer. Stay in the lesson; Motesart will handle the concept work.',
      speechText: 'I can check homework status from the school layer.',
      tags: ['Homework'],
      shouldDeliver: true
    }
  }

  if (action === TAMI_ACTIONS.FAMILY_PROGRESS) {
    return {
      responseText: `Progress snapshot: mastered ${mastered.length}, struggling ${struggling.length}, DPM ${dpm.overall ?? 0}%.`,
      speechText: `Progress snapshot: mastered ${mastered.length}, struggling ${struggling.length}.`,
      tags: ['Parent', 'Progress'],
      shouldDeliver: true
    }
  }

  return {
    responseText: 'All signals nominal. No intervention needed.',
    speechText: 'All signals nominal. No intervention needed.',
    tags: ['Nominal'],
    shouldDeliver: true
  }
}
