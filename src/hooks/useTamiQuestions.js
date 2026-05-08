/**
 * ============================================================
 * useTamiQuestions — Custom hook for T.A.M.i question handling
 * ============================================================
 *
 * Encapsulates all student-question logic:
 *   - Lazy-loads TAMiQuestionHandler
 *   - Detects & classifies questions (lesson, music, off-topic, confusion)
 *   - Records in micro-memory for confusion tracking
 *   - Logs to engine telemetry
 *   - Delivers responses through the timing engine
 *   - Escalates to Claude when needed
 *
 * Usage:
 *   const { initQuestionHandler, handleStudentQuestion, questionHistory }
 *     = useTamiQuestions({ engineRef, tamiStackRef, bridgeRef, setCoaching, setCurrentVisual })
 *
 * ============================================================
 */

import { useRef, useCallback } from 'react'
import useTamiIntelligence from './useTamiIntelligence.js'

export default function useTamiQuestions({
  engineRef,
  tamiStackRef,
  bridgeRef,
  setCoaching,
  setCurrentVisual,
  getCurrentMoment,
  inputResolver,
  handleStudentInput,
}) {
  const questionHandlerRef = useRef(null)
  const questionHistoryRef = useRef([])
  const { evaluateTamiIntelligence } = useTamiIntelligence()

  // ── Lazy init (called during lesson setup) ──
  const initQuestionHandler = useCallback(async () => {
    try {
      const { TAMiQuestionHandler } = await import('../lesson_engine/tami_question_handler.js')
      const handler = new TAMiQuestionHandler()
      questionHandlerRef.current = handler
      return handler
    } catch (err) {
      console.warn('[useTamiQuestions] Failed to load handler:', err.message)
      return null
    }
  }, [])

  // ── Main handler ──
  const handleStudentQuestion = useCallback((text) => {
    if (!questionHandlerRef.current) return

    const moment = getCurrentMoment?.() || null
    const currentConcept = moment?.concepts?.[0] || null
    const currentPhase = moment?.phase || null
    const momentIndex = engineRef.current?.state?.momentHistory?.length || 0
    const stateSnapshot = tamiStackRef.current?.stateManager?.getState?.() || null
    const memorySnapshot = tamiStackRef.current?.memory?.getTeachingSnapshot?.() || null
    let userRole = 'student'
    try {
      const storedUser = JSON.parse(localStorage.getItem('som_user') || 'null')
      userRole = storedUser?.role || userRole
    } catch {}

    const intelligenceResult = evaluateTamiIntelligence({
      userMessage: text,
      role: userRole,
      routeContext: {
        pathname: window.location.pathname,
        component: 'useTamiQuestions'
      },
      lessonContext: {
        inLesson: true,
        currentConcept,
        currentPhase,
        momentIndex
      },
      stateSnapshot,
      memorySnapshot,
      questionHandler: questionHandlerRef.current,
      hintCount: memorySnapshot?.engagement?.confusionCount || 0,
      errorCount: stateSnapshot?.performance?.totalWrong || 0
    })

    if (
      intelligenceResult.output.shouldDeliver &&
      !['NOMINAL', 'DELEGATE_TO_MOTESART'].includes(intelligenceResult.decision.action)
    ) {
      setCoaching({
        message: intelligenceResult.output.responseText,
        speaking: false,
        tags: ['T.A.M.i', ...(intelligenceResult.output.tags || [])],
      })
      return
    }

    const result = questionHandlerRef.current.detect(text, {
      currentConcept,
      currentPhase,
      momentIndex,
    })

    if (result && result.isQuestion) {
      console.log('[Question Handler]', result.category, result.confidence)
      questionHistoryRef.current.push({ text, category: result.category, timestamp: Date.now() })

      // ── 1. Record in micro-memory for confusion tracking ──
      if (tamiStackRef.current?.stateManager) {
        tamiStackRef.current.stateManager.recordQuestion(
          text, result.category, result.concept || currentConcept
        )
      }

      // ── 2. Log to engine telemetry ──
      if (engineRef.current) {
        const m = engineRef.current.getCurrentMoment()
        engineRef.current.logTelemetry(m || { id: 'question', phase: currentPhase }, {
          type: 'student_question',
          question: text.substring(0, 200),
          category: result.category,
          concept: result.concept,
          confidence: result.confidence,
          hasVisual: !!result.visual,
          escalated: false,
        })
      }

      // ── 3. Deliver response through timing engine ──
      const deliverAnswer = () => {
        const tags = [result.category === 'lesson_related' ? 'Lesson Q&A' : 'Question',
                      result.concept || currentConcept].filter(Boolean)
        setCoaching({ message: result.response, speaking: false, tags })

        if (result.visual) {
          setCurrentVisual({ component: result.visual, props: { mode: 'question_response' } })
        }
      }

      if (tamiStackRef.current?.timingEngine) {
        const pauseMs = tamiStackRef.current.timingEngine.evaluatePause({
          moment: engineRef.current?.getCurrentMoment() || null,
          lastOutcome: 'question',
        })
        const delay = Math.max(400, Math.min(1200, pauseMs))

        setCoaching(prev => ({ ...prev, speaking: true }))
        setTimeout(() => {
          setCoaching(prev => ({ ...prev, speaking: false }))
          deliverAnswer()
        }, delay)
      } else {
        deliverAnswer()
      }

      // ── 4. Escalation check ──
      if (questionHandlerRef.current.shouldEscalate(text, questionHistoryRef.current)) {
        console.log('[Question Handler] Escalating to Claude for personalized response')
        if (engineRef.current) {
          const m = engineRef.current.getCurrentMoment()
          engineRef.current.logTelemetry(m || { id: 'question_escalation', phase: currentPhase }, {
            type: 'question_escalation',
            question: text.substring(0, 200),
            category: result.category,
            questionCount: questionHistoryRef.current.length,
          })
        }
        if (bridgeRef.current && bridgeRef.current._connected) {
          bridgeRef.current._handleDetection({
            detection: 'student_question',
            aiNeeded: true,
            reasons: ['student_asked_question', result.category],
            context: {
              question: text,
              category: result.category,
              currentConcept,
              questionCount: questionHistoryRef.current.length,
            },
          })
        }
      }
    } else {
      // Not a question — pass through to normal input or acknowledge
      if (inputResolver?.resolve) {
        handleStudentInput?.({ type: 'verbal', value: text, timestamp: Date.now() })
      } else {
        setCoaching({
          message: "I hear you! Let's keep going with the lesson.",
          speaking: false,
          tags: [],
        })
      }
    }
  }, [engineRef, tamiStackRef, bridgeRef, setCoaching, setCurrentVisual,
      getCurrentMoment, inputResolver, handleStudentInput, evaluateTamiIntelligence])

  return {
    initQuestionHandler,
    handleStudentQuestion,
    questionHandlerRef,
    questionHistory: questionHistoryRef,
  }
}
