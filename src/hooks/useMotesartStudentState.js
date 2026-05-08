import { useCallback, useEffect, useMemo, useState } from 'react'

function buildInitialState({ ageBand, currentPhase, currentConcept, conceptConfig, wylSignals, dpmSignals }) {
  return {
    ageBand: ageBand || 'unknown',
    currentPhase: currentPhase || 'teach',
    currentConcept: currentConcept || null,
    recentConcepts: currentConcept ? [currentConcept] : [],
    confidenceLevel: 'unknown',
    masterySignals: [],
    confusionSignals: [],
    wylSignals: wylSignals || null,
    dpmSignals: dpmSignals || null,
    bloomLevel: conceptConfig?.bloomLevel || 'understand',
    zpdLevel: conceptConfig?.zpdLevel || 'guided',
    hintCount: 0,
    correctStreak: 0,
    incorrectStreak: 0,
    explanationAttempts: 0,
    lastStudentExplanation: '',
    lastMotesartMove: null,
    nextRecommendedMove: null
  }
}

export function useMotesartStudentState({
  ageBand,
  currentPhase,
  currentConcept,
  conceptConfig,
  wylSignals,
  dpmSignals
} = {}) {
  const initialState = useMemo(
    () => buildInitialState({ ageBand, currentPhase, currentConcept, conceptConfig, wylSignals, dpmSignals }),
    [ageBand, currentPhase, currentConcept, conceptConfig, wylSignals, dpmSignals]
  )

  const [state, setState] = useState(initialState)

  useEffect(() => {
    setState(prev => ({
      ...prev,
      ageBand: ageBand || prev.ageBand,
      currentPhase: currentPhase || prev.currentPhase,
      currentConcept: currentConcept || prev.currentConcept,
      recentConcepts: currentConcept && prev.recentConcepts[0] !== currentConcept
        ? [currentConcept, ...prev.recentConcepts.filter(item => item !== currentConcept)].slice(0, 5)
        : prev.recentConcepts,
      wylSignals: wylSignals || prev.wylSignals,
      dpmSignals: dpmSignals || prev.dpmSignals,
      bloomLevel: conceptConfig?.bloomLevel || prev.bloomLevel || 'understand',
      zpdLevel: conceptConfig?.zpdLevel || prev.zpdLevel || 'guided'
    }))
  }, [ageBand, currentPhase, currentConcept, conceptConfig, wylSignals, dpmSignals])

  const recordStudentSignal = useCallback((signal = {}) => {
    setState(prev => {
      const isCorrect = Boolean(signal.isCorrect)
      const confusionDetected = Boolean(signal.confusionDetected)
      const masteryDetected = Boolean(signal.masteryDetected)
      const nextCorrectStreak = isCorrect ? prev.correctStreak + 1 : 0
      const nextIncorrectStreak = isCorrect ? 0 : prev.incorrectStreak + 1
      const nextHintCount = confusionDetected ? prev.hintCount + 1 : prev.hintCount

      return {
        ...prev,
        correctStreak: nextCorrectStreak,
        incorrectStreak: nextIncorrectStreak,
        hintCount: nextHintCount,
        confusionSignals: confusionDetected
          ? [...prev.confusionSignals, { message: signal.studentMessage || '', at: Date.now() }].slice(-8)
          : prev.confusionSignals,
        masterySignals: masteryDetected || isCorrect
          ? [...prev.masterySignals, { message: signal.studentMessage || '', at: Date.now() }].slice(-8)
          : prev.masterySignals,
        confidenceLevel: masteryDetected || nextCorrectStreak >= 2
          ? 'high'
          : isCorrect
            ? 'building'
            : confusionDetected || nextIncorrectStreak >= 2
              ? 'low'
              : 'unknown',
        explanationAttempts: signal.studentMessage ? prev.explanationAttempts + 1 : prev.explanationAttempts,
        lastStudentExplanation: signal.studentMessage || prev.lastStudentExplanation,
        lastMotesartMove: signal.teachingMode || prev.lastMotesartMove,
        nextRecommendedMove: masteryDetected || nextCorrectStreak >= 2
          ? 'release'
          : confusionDetected || nextHintCount >= 2
            ? 'guide'
            : isCorrect
              ? 'confirm'
              : prev.nextRecommendedMove
      }
    })
  }, [])

  const resetConceptState = useCallback(() => {
    setState(initialState)
  }, [initialState])

  return {
    ...state,
    recordStudentSignal,
    resetConceptState
  }
}
