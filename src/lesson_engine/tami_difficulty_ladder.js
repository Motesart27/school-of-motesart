/**
 * ============================================================
 * T.A.M.i ADAPTIVE DIFFICULTY LADDER
 * ============================================================
 *
 * Controls lesson difficulty in real-time based on student
 * performance signals. The "ladder" has rungs that the student
 * moves up (advancing) or down (reinforcing) on:
 *
 *   Rung 5 — Challenge mode: accelerate, skip easy moments
 *   Rung 4 — Confident: normal pace, occasional stretch tasks
 *   Rung 3 — Learning: standard progression (default start)
 *   Rung 2 — Struggling: slow pace, extra visuals, repeat
 *   Rung 1 — Foundational: maximum support, micro-steps
 *
 * The ladder evaluates after EVERY moment outcome and emits
 * adjustment signals that the orchestrator/resolver consume.
 *
 * Inputs:
 *   - Concept confidence values (from engine state)
 *   - Engagement signals (from micro-memory)
 *   - Response accuracy (from moment outcomes)
 *   - Question frequency (from question handler)
 *   - Time-on-task (response times)
 *
 * Outputs:
 *   - Current rung per concept
 *   - Difficulty adjustment signals
 *   - Skip/repeat recommendations
 *   - Confidence delta multipliers
 *
 * ============================================================
 */

class TAMiDifficultyLadder {

  constructor(config = {}) {
    this.config = {
      defaultRung: 3,
      minRung: 1,
      maxRung: 5,

      // ── Promotion thresholds ──
      // How many consecutive correct answers to climb a rung
      streakToPromote: 3,
      // Minimum confidence to be eligible for promotion
      confidenceToPromote: 65,
      // Fast response bonus: if avg RT < this, add promotion weight
      fastResponseMs: 4000,

      // ── Demotion thresholds ──
      // How many mistakes in window to drop a rung
      mistakesToDemote: 2,
      // Confusion signals that trigger demotion
      confusionToDemote: 2,
      // Slow response threshold
      slowResponseMs: 12000,

      // ── Confidence multipliers by rung ──
      // These scale the engine's confidence deltas
      confidenceMultipliers: {
        1: 0.5,   // foundational — gains are slower but losses are capped
        2: 0.75,  // struggling — slightly below normal
        3: 1.0,   // learning — standard
        4: 1.2,   // confident — faster gains
        5: 1.5,   // challenge — fastest gains, but mistakes hurt more
      },

      // ── Timing adjustments by rung (ms added to base pacing) ──
      timingOffsets: {
        1: 2000,  // extra pause for foundational
        2: 1000,
        3: 0,
        4: -500,  // slightly faster
        5: -1000, // noticeably faster
      },

      ...config,
    }

    // ── Per-concept rung state ──
    // { conceptId: { rung, streak, mistakes, lastChange, history } }
    this._conceptRungs = {}

    // ── Global rung (weighted average across concepts) ──
    this._globalRung = this.config.defaultRung

    // ── Event history for analysis ──
    this._events = []
    this._maxEvents = 200
  }

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════

  /**
   * Initialize rungs for a set of concepts.
   * @param {string[]} conceptIds - e.g. ['C_KEYBOARD', 'C_HALFWHOLE', ...]
   * @param {Object} initialConfidence - e.g. { C_KEYBOARD: 50, ... }
   */
  init(conceptIds, initialConfidence = {}) {
    conceptIds.forEach(id => {
      const conf = initialConfidence[id] || 50
      // Map initial confidence to a starting rung
      let startRung = this.config.defaultRung
      if (conf >= 80) startRung = 4
      else if (conf >= 60) startRung = 3
      else if (conf < 30) startRung = 2

      this._conceptRungs[id] = {
        rung: startRung,
        streak: 0,        // consecutive correct
        mistakes: 0,       // mistakes in current window
        confusionCount: 0, // confusion signals in window
        lastChange: Date.now(),
        history: [{ rung: startRung, time: Date.now(), reason: 'init' }],
      }
    })

    this._recalcGlobal()
  }

  // ════════════════════════════════════════════════════════════
  // CORE: EVALUATE AFTER MOMENT
  // ════════════════════════════════════════════════════════════

  /**
   * Evaluate difficulty adjustment after a moment outcome.
   *
   * @param {Object} params
   * @param {string} params.concept - Concept ID (e.g. 'C_KEYBOARD')
   * @param {string} params.outcome - 'correct' | 'perfect' | 'wrong' | 'partial' | 'timeout'
   * @param {number} params.confidence - Current confidence for this concept (0-100)
   * @param {number} params.responseTimeMs - How long the student took
   * @param {Object} params.engagement - Engagement signals from micro-memory
   * @param {number} params.questionCount - Questions asked about this concept
   *
   * @returns {Object} Adjustment signal:
   *   {
   *     concept, rung, previousRung, changed,
   *     action: 'promote' | 'demote' | 'hold',
   *     confidenceMultiplier,
   *     timingOffset,
   *     recommendation: 'skip_ahead' | 'repeat' | 'add_visual' | 'normal' | 'celebrate',
   *     reason
   *   }
   */
  evaluate(params) {
    const { concept, outcome, confidence, responseTimeMs, engagement, questionCount } = params

    // Ensure concept is tracked
    if (!this._conceptRungs[concept]) {
      this._conceptRungs[concept] = {
        rung: this.config.defaultRung, streak: 0, mistakes: 0,
        confusionCount: 0, lastChange: Date.now(),
        history: [{ rung: this.config.defaultRung, time: Date.now(), reason: 'auto_init' }],
      }
    }

    const state = this._conceptRungs[concept]
    const prevRung = state.rung

    // ── Record outcome ──
    this._recordEvent(concept, outcome, responseTimeMs)

    if (outcome === 'correct' || outcome === 'perfect') {
      state.streak++
      state.mistakes = Math.max(0, state.mistakes - 1) // decay mistakes
    } else if (outcome === 'wrong' || outcome === 'timeout') {
      state.streak = 0
      state.mistakes++
    } else if (outcome === 'partial') {
      // Partial doesn't reset streak but doesn't grow it much
      state.streak = Math.max(0, state.streak - 1)
    }

    // ── Track confusion from questions ──
    if (engagement?.confusionCount > state.confusionCount) {
      state.confusionCount = engagement.confusionCount
    }

    // ── Evaluate promotion ──
    let action = 'hold'
    let reason = 'steady'

    if (this._shouldPromote(state, confidence, responseTimeMs, engagement)) {
      state.rung = Math.min(this.config.maxRung, state.rung + 1)
      state.streak = 0 // reset after promotion
      state.mistakes = 0
      state.confusionCount = 0
      state.lastChange = Date.now()
      action = 'promote'
      reason = this._promotionReason(state, confidence, responseTimeMs)
      state.history.push({ rung: state.rung, time: Date.now(), reason })
    }
    // ── Evaluate demotion ──
    else if (this._shouldDemote(state, confidence, engagement)) {
      state.rung = Math.max(this.config.minRung, state.rung - 1)
      state.streak = 0
      state.mistakes = 0
      state.confusionCount = 0
      state.lastChange = Date.now()
      action = 'demote'
      reason = this._demotionReason(state, confidence, engagement)
      state.history.push({ rung: state.rung, time: Date.now(), reason })
    }

    this._recalcGlobal()

    // ── Build recommendation ──
    const recommendation = this._getRecommendation(state, action, confidence)

    return {
      concept,
      rung: state.rung,
      previousRung: prevRung,
      changed: state.rung !== prevRung,
      action,
      confidenceMultiplier: this.config.confidenceMultipliers[state.rung],
      timingOffset: this.config.timingOffsets[state.rung],
      recommendation,
      reason,
    }
  }

  // ════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════

  /** Get current rung for a concept */
  getRung(concept) {
    return this._conceptRungs[concept]?.rung || this.config.defaultRung
  }

  /** Get all concept rungs */
  getAllRungs() {
    const result = {}
    Object.entries(this._conceptRungs).forEach(([id, state]) => {
      result[id] = {
        rung: state.rung,
        streak: state.streak,
        mistakes: state.mistakes,
        lastChange: state.lastChange,
      }
    })
    return result
  }

  /** Get the global (average) rung */
  getGlobalRung() {
    return this._globalRung
  }

  /** Get confidence multiplier for a concept's current rung */
  getConfidenceMultiplier(concept) {
    const rung = this.getRung(concept)
    return this.config.confidenceMultipliers[rung]
  }

  /** Get timing offset for a concept's current rung */
  getTimingOffset(concept) {
    const rung = this.getRung(concept)
    return this.config.timingOffsets[rung]
  }

  /** Should the orchestrator skip ahead for this concept? */
  shouldSkip(concept, confidence) {
    const rung = this.getRung(concept)
    return rung >= 5 && confidence >= 85
  }

  /** Should the orchestrator repeat/reinforce this concept? */
  shouldRepeat(concept, confidence) {
    const rung = this.getRung(concept)
    return rung <= 2 && confidence < 40
  }

  /** Get a snapshot for telemetry/debug */
  getSnapshot() {
    return {
      globalRung: this._globalRung,
      concepts: this.getAllRungs(),
      recentEvents: this._events.slice(-10),
      timestamp: Date.now(),
    }
  }

  // ════════════════════════════════════════════════════════════
  // INTERNAL: PROMOTION / DEMOTION LOGIC
  // ════════════════════════════════════════════════════════════

  _shouldPromote(state, confidence, responseTimeMs, engagement) {
    // Already at max
    if (state.rung >= this.config.maxRung) return false

    // Need minimum streak
    if (state.streak < this.config.streakToPromote) return false

    // Need minimum confidence
    if (confidence < this.config.confidenceToPromote) return false

    // Engagement must not be declining
    if (engagement?.trend === 'disengaging') return false

    // Bonus: fast responses accelerate promotion
    if (responseTimeMs && responseTimeMs < this.config.fastResponseMs && state.streak >= 2) {
      return true
    }

    return true
  }

  _shouldDemote(state, confidence, engagement) {
    // Already at min
    if (state.rung <= this.config.minRung) return false

    // Too many mistakes
    if (state.mistakes >= this.config.mistakesToDemote) return true

    // Too many confusion signals
    if (state.confusionCount >= this.config.confusionToDemote) return true

    // Confidence dropped below threshold for current rung
    const rungMinConfidence = { 5: 70, 4: 50, 3: 30, 2: 15, 1: 0 }
    if (confidence < (rungMinConfidence[state.rung] || 0)) return true

    // Engagement is tanking
    if (engagement?.trend === 'disengaging' && state.mistakes >= 1) return true

    return false
  }

  _promotionReason(state, confidence, responseTimeMs) {
    if (responseTimeMs && responseTimeMs < this.config.fastResponseMs) {
      return `fast_and_accurate_streak_${state.streak}`
    }
    return `streak_${state.streak}_conf_${Math.round(confidence)}`
  }

  _demotionReason(state, confidence, engagement) {
    if (state.mistakes >= this.config.mistakesToDemote) return `mistakes_${state.mistakes}`
    if (state.confusionCount >= this.config.confusionToDemote) return `confusion_${state.confusionCount}`
    if (engagement?.trend === 'disengaging') return 'disengaging'
    return `low_confidence_${Math.round(confidence)}`
  }

  _getRecommendation(state, action, confidence) {
    if (action === 'promote' && state.rung >= 5) return 'skip_ahead'
    if (action === 'promote') return 'celebrate'
    if (action === 'demote' && state.rung <= 2) return 'add_visual'
    if (action === 'demote') return 'repeat'
    if (state.rung <= 2 && confidence < 35) return 'add_visual'
    return 'normal'
  }

  _recalcGlobal() {
    const entries = Object.values(this._conceptRungs)
    if (entries.length === 0) {
      this._globalRung = this.config.defaultRung
      return
    }
    const sum = entries.reduce((acc, s) => acc + s.rung, 0)
    this._globalRung = Math.round(sum / entries.length * 10) / 10
  }

  _recordEvent(concept, outcome, responseTimeMs) {
    this._events.push({
      concept, outcome, responseTimeMs,
      time: Date.now(),
      rung: this._conceptRungs[concept]?.rung,
    })
    if (this._events.length > this._maxEvents) {
      this._events = this._events.slice(-this._maxEvents)
    }
  }
}

// ── Triple export pattern ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiDifficultyLadder }
}
if (typeof window !== 'undefined') {
  window.TAMiDifficultyLadder = TAMiDifficultyLadder
}
export { TAMiDifficultyLadder }
