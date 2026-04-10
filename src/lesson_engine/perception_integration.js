/**
 * perception_integration.js
 * Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
 * Bridges the live practice loop (MotesartLessonEngine) to the Perception Stack.
 *
 * Data flow:
 *   Engine  action:evaluated  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂº  perception_shim.evaluationToPackets()
 *                                        Ã¢ÂÂ
 *                                  packets accumulate per-concept
 *                                        Ã¢ÂÂ
 *   Engine  moment:exit / lesson:complete Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂº  aggregateSession() + applyPerceptionToState()
 *                                        Ã¢ÂÂ
 *                                  Concept_State updated  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂº  UI reads
 *
 * This is the ONLY place the live loop feeds the perception adapter.
 * The perception_state_adapter remains the ONLY place that writes to Concept_State.
 */

import { evaluationToPackets } from './perception_shim.js'
import {
  aggregateSession,
  applyPerceptionToState,
  computeConfidence,
  confidenceOut100,
  generateStoredEvidenceSummary,
} from './perception_state_adapter.js'
import {
  normalizeConceptId,
  isPilotConcept,
  PILOT_CONCEPT_IDS,
  getPhaseForConcept,
  FEEL_MODE_GATES,
} from './lock_package_bridge_config.js'

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Session packet accumulator
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

class PerceptionSession {
  constructor(studentId, sessionId) {
    this.studentId = studentId
    this.sessionId = sessionId || Date.now().toString(36)
    this.startedAt = Date.now()
    this.packets = []
    this.evalResults = []
    this.conceptsSeen = new Set()
  }

  addEvaluation(evalResult, conceptId) {
    const normalizedId = normalizeConceptId(conceptId)
    if (!normalizedId) return

    this.conceptsSeen.add(normalizedId)

    const packets = evaluationToPackets({
      correct: evalResult.correct,
      responseTimeMs: evalResult.responseTimeMs || 0,
      extra: {
        conceptId: normalizedId,
        momentId: evalResult.momentId,
        feelMode: evalResult.feelMode || null,
        attemptNumber: evalResult.attemptNumber || 1,
        ...(evalResult.extra || {}),
      },
    })

    packets.forEach(p => {
      p.conceptId = normalizedId
      p.sessionId = this.sessionId
      this.packets.push(p)
    })

    this.evalResults.push({ ...evalResult, conceptId: normalizedId })
  }

  getPacketsForConcept(conceptId) {
    const normalized = normalizeConceptId(conceptId)
    return this.packets.filter(p => p.conceptId === normalized)
  }
}

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// PerceptionIntegration Ã¢ÂÂ main bridge class
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

class PerceptionIntegration {
  /**
   * @param {object} options
   * @param {object} options.engine         - MotesartLessonEngine instance (EventEmitter)
   * @param {object} options.stateManager   - TAMiStateManager instance
   * @param {string} options.studentId      - current student ID
   * @param {function} [options.onStateUpdate]  - callback(conceptId, newState) after state changes
   * @param {function} [options.onError]        - callback(error) for graceful degradation
   */
  constructor({ engine, stateManager, studentId, onStateUpdate, onError }) {
    this.engine = engine
    this.stateManager = stateManager
    this.studentId = studentId
    this.onStateUpdate = onStateUpdate || (() => {})
    this.onError = onError || ((e) => console.warn('[PerceptionIntegration]', e))

    this.session = null
    this.conceptStates = {}

    this._handleEvaluated = this._handleEvaluated.bind(this)
    this._handleMomentExit = this._handleMomentExit.bind(this)
    this._handleLessonComplete = this._handleLessonComplete.bind(this)
    this._handleLessonStart = this._handleLessonStart.bind(this)
  }

  // Ã¢ÂÂÃ¢ÂÂ Lifecycle Ã¢ÂÂÃ¢ÂÂ

  attach() {
    this.engine.on('lesson:start', this._handleLessonStart)
    this.engine.on('action:evaluated', this._handleEvaluated)
    this.engine.on('moment:exit', this._handleMomentExit)
    this.engine.on('lesson:complete', this._handleLessonComplete)
  }

  detach() {
    this.engine.off('lesson:start', this._handleLessonStart)
    this.engine.off('action:evaluated', this._handleEvaluated)
    this.engine.off('moment:exit', this._handleMomentExit)
    this.engine.off('lesson:complete', this._handleLessonComplete)
  }

  loadStates(savedStates) {
    if (savedStates && typeof savedStates === 'object') {
      Object.entries(savedStates).forEach(([conceptId, state]) => {
        const normalized = normalizeConceptId(conceptId)
        if (normalized) {
          this.conceptStates[normalized] = { ...state }
        }
      })
    }
  }

  getConceptState(conceptId) {
    const normalized = normalizeConceptId(conceptId)
    return this.conceptStates[normalized] || this._defaultConceptState(normalized)
  }

  getAllStates() {
    return { ...this.conceptStates }
  }

  getPilotStates() {
    const result = {}
    PILOT_CONCEPT_IDS.forEach(id => {
      result[id] = this.conceptStates[id] || this._defaultConceptState(id)
    })
    return result
  }

  // Ã¢ÂÂÃ¢ÂÂ Engine event handlers Ã¢ÂÂÃ¢ÂÂ

  _handleLessonStart(data) {
    try {
      this.session = new PerceptionSession(
        this.studentId,
        data?.lessonId || null
      )
    } catch (e) {
      this.onError(e)
    }
  }

  _handleEvaluated(data) {
    try {
      if (!this.session) {
        this.session = new PerceptionSession(this.studentId)
      }

      const conceptId = data.conceptId
        || data.outcome?.conceptId
        || this._resolveConceptFromMoment(data.moment)

      if (!conceptId) {
        this.onError(new Error('No conceptId in action:evaluated payload'))
        return
      }

      const evalResult = {
        correct: data.outcome?.type === 'correct',
        responseTimeMs: data.responseTimeMs || data.outcome?.responseTimeMs || 0,
        momentId: data.moment,
        feelMode: data.feelMode || null,
        attemptNumber: data.attemptNumber || 1,
        extra: {
          visualHint: data.outcome?.visualHint,
          feedback: data.outcome?.feedback,
        },
      }

      this.session.addEvaluation(evalResult, conceptId)

      if (isPilotConcept(conceptId)) {
        this._microUpdate(conceptId)
      }
    } catch (e) {
      this.onError(e)
    }
  }

  _handleMomentExit(data) {
    try {
      if (!this.session) return
      const conceptId = data?.conceptId || this._resolveConceptFromMoment(data?.moment)
      if (conceptId && isPilotConcept(conceptId)) {
        this._flushConcept(conceptId)
      }
    } catch (e) {
      this.onError(e)
    }
  }

  _handleLessonComplete(data) {
    try {
      if (!this.session) return
      this._flushAllConcepts()
      this.session = null
    } catch (e) {
      this.onError(e)
    }
  }

  // Ã¢ÂÂÃ¢ÂÂ Perception pipeline Ã¢ÂÂÃ¢ÂÂ

  _microUpdate(conceptId) {
    const normalized = normalizeConceptId(conceptId)
    const packets = this.session.getPacketsForConcept(normalized)
    if (packets.length === 0) return

    const currentState = this.conceptStates[normalized] || this._defaultConceptState(normalized)
    const confidence = computeConfidence(packets)
    const existingConf = currentState.confidence || 0.5
    const blended = existingConf * 0.8 + confidence * 0.2

    currentState.confidence = blended
    currentState.last_updated = new Date().toISOString()
    this.conceptStates[normalized] = currentState
    this.onStateUpdate(normalized, currentState)
  }

  _flushConcept(conceptId) {
    const normalized = normalizeConceptId(conceptId)
    const packets = this.session.getPacketsForConcept(normalized)
    if (packets.length === 0) return

    const currentState = this.conceptStates[normalized] || this._defaultConceptState(normalized)

    // Step 1: Aggregate session packets
    const sessionAgg = aggregateSession(packets)

    // Step 2: Apply perception to Concept_State (ONLY authorized write path)
    const updatedState = applyPerceptionToState(currentState, sessionAgg, {
      conceptId: normalized,
      studentId: this.studentId,
      phase: getPhaseForConcept(normalized),
      isPilot: isPilotConcept(normalized),
    })

    // Step 3: Generate evidence summary
    updatedState.evidence_summary = generateStoredEvidenceSummary(
      updatedState.evidence_summary || [],
      sessionAgg
    )
    updatedState.last_updated = new Date().toISOString()

    // Step 4: Store
    this.conceptStates[normalized] = updatedState

    // Step 5: Sync confidence back to TAMiStateManager (0-100 scale)
    if (this.stateManager && typeof this.stateManager.updateConfidence === 'function') {
      this.stateManager.updateConfidence(
        normalized,
        confidenceOut100(updatedState.confidence)
      )
    }

    // Step 6: Notify UI
    this.onStateUpdate(normalized, updatedState)
  }

  _flushAllConcepts() {
    if (!this.session) return
    this.session.conceptsSeen.forEach(conceptId => {
      this._flushConcept(conceptId)
    })
  }

  // Ã¢ÂÂÃ¢ÂÂ Helpers Ã¢ÂÂÃ¢ÂÂ

  _resolveConceptFromMoment(momentOrId) {
    if (!momentOrId) return null

    // 1. If moment is an object, try structured fields first
    if (typeof momentOrId === 'object') {
      // Direct conceptId field
      if (momentOrId.conceptId) return normalizeConceptId(momentOrId.conceptId)

      // Concepts array (lesson JSON format: concepts: [{id: "C_MAJSCALE"}, ...])
      if (Array.isArray(momentOrId.concepts) && momentOrId.concepts.length > 0) {
        const first = momentOrId.concepts[0]
        const cid = typeof first === 'string' ? first : (first.id || first.concept_id)
        if (cid) return normalizeConceptId(cid)
      }

      // ConfidenceImpact keys (lesson JSON: confidenceImpact: {"C_MAJSCALE": {...}})
      if (momentOrId.confidenceImpact && typeof momentOrId.confidenceImpact === 'object') {
        const keys = Object.keys(momentOrId.confidenceImpact)
        if (keys.length > 0) return normalizeConceptId(keys[0])
      }

      // Fall through to string matching on moment.id
      if (momentOrId.id) return this._resolveConceptFromMoment(momentOrId.id)
    }

    // 2. String-based keyword matching (fallback for moment IDs)
    if (typeof momentOrId === 'string') {
      const lower = momentOrId.toLowerCase()
      if (lower.includes('halfstep') || lower.includes('half_step')) return 'T_HALF_STEP'
      if (lower.includes('wholestep') || lower.includes('whole_step')) return 'T_WHOLE_STEP'
      if (lower.includes('major_scale_pattern') || lower.includes('majorscale') || lower.includes('majscale')) return 'T_MAJOR_SCALE_PATTERN'
      if (lower.includes('scale_degree') || lower.includes('scaledegree')) return 'T_SCALE_DEGREES_MAJOR'
      if (lower.includes('major_3rd') || lower.includes('major3rd') || lower.includes('majorthird')) return 'T_MAJOR_3RD'
    }

    return null
  }

  _defaultConceptState(conceptId) {
    return {
      concept_id: conceptId,
      ownership_state: 'introduced',
      confidence: 0.5,
      confidence_display: 50,
      confidence_previous: null,
      attempts: 0,
      correct_streak: 0,
      last_attempt_at: null,
      last_updated: null,
      feel_mode_progress: {
        A: { passed: false, accuracy: 0, attempts: 0 },
        B: { passed: false, accuracy: 0, attempts: 0 },
        C: { passed: false, accuracy: 0, attempts: 0 },
      },
      // Teacher-facing fields (populated by applyPerceptionToState)
      trend: 'stable',
      mastery_ready: false,
      mistake_pattern: null,
      next_action: null,
      recommended_strategy: null,
      evidence_summary: null,
      perception_events: 0,
      // Internal tracking
      _rolling_history: [],
      _rolling_avg: null,
      phase: getPhaseForConcept(conceptId) || null,
    }
  }

  exportForStorage() {
    return {
      studentId: this.studentId,
      exportedAt: new Date().toISOString(),
      conceptStates: { ...this.conceptStates },
    }
  }
}


// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Factory function for easy wiring
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

/**
 * Create and attach a PerceptionIntegration instance.
 *
 * Usage in a React component or game page:
 *
 *   import { createPerceptionBridge } from './perception_integration.js'
 *
 *   const bridge = createPerceptionBridge({
 *     engine: lessonEngine,
 *     stateManager: tamiState,
 *     studentId: user.id,
 *     onStateUpdate: (conceptId, state) => {
 *       setConceptStates(prev => ({ ...prev, [conceptId]: state }))
 *     },
 *   })
 *
 *   bridge.loadStates(savedConceptStates)
 *
 *   // Cleanup:
 *   bridge.detach()
 *   const toSave = bridge.exportForStorage()
 */
function createPerceptionBridge(options) {
  const bridge = new PerceptionIntegration(options)
  bridge.attach()
  return bridge
}


export { PerceptionIntegration, PerceptionSession, createPerceptionBridge }
