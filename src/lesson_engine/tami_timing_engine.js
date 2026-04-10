/**
 * ============================================================
 * T.A.M.i PEDAGOGICAL TIMING ENGINE v1.0
 * ============================================================
 *
 * Controls WHEN T.A.M.i speaks, pauses, demonstrates, or waits
 * based on live student behavior. A real teacher doesn't fire
 * responses instantly — they read the room. This engine does
 * the same thing.
 *
 * The timing engine wraps every action from the strategy resolver
 * (or Claude) with a timing decision before it reaches the
 * orchestrator. It answers three questions:
 *
 *   1. Should we DELAY this action? (pause before speaking)
 *   2. Should we INTERRUPT the current wait? (student is stuck)
 *   3. How long should we HOLD after the action? (let it land)
 *
 * It reads from:
 *   - Micro-memory (response times, hesitation, engagement trend)
 *   - State manager (streaks, difficulty, learning style)
 *   - Current moment context (phase, concept, expected action)
 *
 * It does NOT generate teaching content. It only controls timing.
 *
 * Architecture:
 *   Strategy Resolver / Claude
 *              │
 *              ▼
 *     Timing Engine wraps action
 *              │
 *              ▼
 *     Orchestrator delivers with timing
 *
 * The orchestrator calls:
 *   timing.wrapAction(action, context) → { action, delay, hold, interrupt }
 *
 * Or for live wait decisions:
 *   timing.shouldInterrupt(context) → { interrupt, reason, suggestedAction }
 *   timing.evaluatePause(context) → milliseconds
 *
 * ============================================================
 */

class TAMiTimingEngine {

  constructor(config = {}) {
    this.config = {
      // ---- Base timing (ms) ----
      minDelay: 200,                   // never fire instantly — feels robotic
      maxDelay: 4000,                  // never wait more than 4s to act

      // ---- Pause profiles (ms) ----
      afterCorrect: 800,               // brief beat — let success register
      afterPerfect: 1200,              // slightly longer — celebrate the moment
      afterWrong: 1500,                // pause before correction — don't pile on
      afterWrongTwice: 2000,           // longer pause — give them space
      afterEncouragement: 1000,        // let encouragement land
      afterVisualSwitch: 1800,         // time to process new visual
      afterCelebration: 2200,          // let celebration animate fully
      afterDifficultyShift: 1500,      // brief reset before new pace
      afterExplanation: 2500,          // let explanation absorb
      beforeHint: 1200,               // pause before hint — don't jump in too fast
      phaseTransition: 1500,           // between teaching phases

      // ---- Interrupt thresholds ----
      interruptAfterMs: 15000,         // suggest interrupt after 15s silence
      gentleNudgeAfterMs: 8000,        // softer nudge after 8s
      maxWaitMs: 30000,                // force action after 30s

      // ---- Behavior multipliers ----
      hesitationMultiplier: 1.3,       // if student is hesitating, slow down
      flowMultiplier: 0.6,             // if in flow state, speed up
      struggleMultiplier: 1.4,         // if struggling, give more time
      disengagingMultiplier: 0.8,      // if disengaging, act sooner (re-engage)

      // ---- Learning style timing adjustments ----
      visualPauseBonus: 500,           // visual learners need time to look
      auditoryPauseBonus: 300,         // auditory learners process slightly faster
      kinestheticPauseBonus: 200,      // kinesthetic learners want to move
      patternPauseBonus: 600,          // pattern learners need time to analyze

      ...config,
    };

    // ---- Timing profiles by action source ----
    // These are the base delays before an action fires,
    // BEFORE behavior modifiers are applied.
    this._actionDelays = {
      dialogue_override: 1000,         // replacing dialogue — slight pause first
      encouragement_inject: 600,       // encouragement should feel responsive
      visual_switch: 800,              // switching visual needs a brief beat
      branch_suggestion: 500,          // branch decisions should feel quick
      lesson_summary: 1500,            // summary deserves a moment
      celebration: 400,                // celebrations should feel immediate
      difficulty_demote: 1000,         // pause before slowing down
      difficulty_promote: 800,         // pause before speeding up
    };

    // ---- Hold times by action type (how long to hold AFTER action) ----
    this._actionHolds = {
      dialogue_override: 2000,
      encouragement_inject: 1200,
      visual_switch: 2500,             // extra time to absorb new visual
      branch_suggestion: 800,
      lesson_summary: 3000,
      celebration: 2200,
      difficulty_demote: 1500,
      difficulty_promote: 1200,
    };
  }

  // ============================================================
  // PRIMARY API: WRAP ACTION WITH TIMING
  // ============================================================

  /**
   * Wrap a teaching action with timing metadata.
   * Called by the bridge before delivering to the orchestrator.
   *
   * @param {Object} action - From resolver or Claude (source, type, dialogue, etc.)
   * @param {Object} context
   * @param {Object} context.state - From stateManager.getState()
   * @param {Object} context.memory - From microMemory.getTeachingSnapshot()
   * @param {Object} context.moment - Current moment data
   * @param {string} context.lastOutcome - 'correct'|'wrong'|'perfect'|'timeout'|null
   * @returns {Object} {
   *   action: Object,         - the original action (unchanged)
   *   delayMs: number,        - ms to wait BEFORE delivering the action
   *   holdMs: number,         - ms to hold AFTER the action (before next moment)
   *   timing: Object          - full timing metadata for debugging
   * }
   */
  wrapAction(action, context = {}) {
    if (!action) {
      return { action: null, delayMs: 0, holdMs: 0, timing: { reason: 'no_action' } };
    }

    const state = context.state || {};
    const memory = context.memory || {};
    const moment = context.moment || {};
    const lastOutcome = context.lastOutcome || null;

    // ---- Step 1: Base delay for this action type ----
    const actionType = action.strategyType || action.type || 'encouragement_inject';
    let baseDelay = this._actionDelays[actionType] || 600;
    let baseHold = this._actionHolds[actionType] || 1200;

    // ---- Step 2: Outcome-based adjustment ----
    if (lastOutcome === 'wrong' || lastOutcome === 'failed') {
      baseDelay = Math.max(baseDelay, this.config.afterWrong);
    } else if (lastOutcome === 'perfect') {
      baseHold = Math.max(baseHold, this.config.afterPerfect);
    }

    // ---- Step 3: Behavior multiplier ----
    const multiplier = this._getBehaviorMultiplier(state, memory);

    // ---- Step 4: Learning style adjustment ----
    const styleBonus = this._getLearningStyleBonus(state);

    // ---- Step 5: Special cases ----
    let specialDelay = 0;
    let specialHold = 0;

    // Visual switch gets extra hold for processing
    if (action.visualAsset) {
      specialHold += this.config.afterVisualSwitch;
    }

    // Celebration actions get quick delay but long hold
    if (action.celebration) {
      baseDelay = Math.min(baseDelay, this.config.minDelay + 200);
      specialHold += this.config.afterCelebration - baseHold;
    }

    // Difficulty adjustments need a reset beat
    if (action.difficultyAdjustment) {
      specialDelay += this.config.afterDifficultyShift;
    }

    // ---- Step 6: Calculate final timing ----
    const delayMs = this._clampDelay(
      Math.round((baseDelay + specialDelay + styleBonus) * multiplier)
    );
    const holdMs = Math.round(
      Math.max(0, (baseHold + specialHold) * multiplier)
    );

    return {
      action,
      delayMs,
      holdMs,
      timing: {
        actionType,
        baseDelay,
        baseHold,
        multiplier: Math.round(multiplier * 100) / 100,
        styleBonus,
        specialDelay,
        specialHold,
        lastOutcome,
        reason: this._explainTiming(action, multiplier, lastOutcome),
      },
    };
  }

  // ============================================================
  // EVALUATE PAUSE: How long to wait at a given moment
  // ============================================================

  /**
   * Determine how long to pause before the next teaching moment.
   * Called by the orchestrator between moments.
   *
   * @param {Object} context
   * @param {string} context.phase - Current lesson phase
   * @param {string} context.previousPhase - Previous phase (for transitions)
   * @param {Object} context.state - From stateManager
   * @param {Object} context.memory - From microMemory
   * @returns {number} Milliseconds to pause
   */
  evaluatePause(context = {}) {
    const { phase, previousPhase, state, memory } = context;

    // Phase transition pause
    if (phase && previousPhase && phase !== previousPhase) {
      const multiplier = this._getBehaviorMultiplier(state, memory);
      return Math.round(this.config.phaseTransition * multiplier);
    }

    // Default inter-moment pause based on engagement
    const engagement = memory?.engagement || {};

    if (engagement.trend === 'disengaging') {
      // Student is drifting — shorter pause, get their attention
      return Math.round(this.config.minDelay * this.config.disengagingMultiplier);
    }

    if (engagement.recentPace === 'fast') {
      // Student is flying — keep momentum
      return Math.round(400 * this.config.flowMultiplier);
    }

    if (engagement.recentPace === 'slow') {
      // Student is taking their time — respect that
      return Math.round(800 * this.config.hesitationMultiplier);
    }

    // Neutral pace
    return 600;
  }

  // ============================================================
  // SHOULD INTERRUPT: Is the student stuck?
  // ============================================================

  /**
   * Determine if T.A.M.i should interrupt a waiting period.
   * Called periodically while the orchestrator waits for student input.
   *
   * @param {Object} context
   * @param {number} context.waitingMs - How long we've been waiting
   * @param {Object} context.state - From stateManager
   * @param {Object} context.memory - From microMemory
   * @param {Object} context.moment - Current moment
   * @returns {Object} {
   *   interrupt: boolean,
   *   type: 'none'|'gentle_nudge'|'hint'|'rephrase'|'skip',
   *   reason: string,
   *   suggestedDialogue: string|null,
   *   delayMs: number
   * }
   */
  shouldInterrupt(context = {}) {
    const { waitingMs = 0, state, memory, moment } = context;
    const engagement = memory?.engagement || {};
    const performance = state?.performance || {};

    // Not waiting long enough — no interrupt
    if (waitingMs < this.config.gentleNudgeAfterMs) {
      return { interrupt: false, type: 'none', reason: 'still_within_normal_wait', suggestedDialogue: null, delayMs: 0 };
    }

    // Force action after max wait
    if (waitingMs >= this.config.maxWaitMs) {
      return {
        interrupt: true,
        type: 'skip',
        reason: 'max_wait_exceeded',
        suggestedDialogue: "No worries — let's move on and come back to this.",
        delayMs: 0,
      };
    }

    // Gentle nudge zone (8-15s)
    if (waitingMs >= this.config.gentleNudgeAfterMs && waitingMs < this.config.interruptAfterMs) {
      // If student was struggling, give a nudge earlier
      if (performance.wrongStreak >= 2 || engagement.trend === 'disengaging') {
        return {
          interrupt: true,
          type: 'gentle_nudge',
          reason: 'struggling_student_needs_encouragement',
          suggestedDialogue: "Take your time. There's no wrong way to start.",
          delayMs: this.config.beforeHint,
        };
      }

      // Otherwise, just wait — they might be thinking
      return { interrupt: false, type: 'none', reason: 'student_may_be_thinking', suggestedDialogue: null, delayMs: 0 };
    }

    // Interrupt zone (15-30s)
    if (waitingMs >= this.config.interruptAfterMs) {
      // Struggling student — offer help
      if (performance.wrongStreak >= 1) {
        return {
          interrupt: true,
          type: 'hint',
          reason: 'extended_wait_with_struggle_history',
          suggestedDialogue: "Want me to show you a different way to think about this?",
          delayMs: this.config.beforeHint,
        };
      }

      // Not struggling, just slow — gentle prompt
      return {
        interrupt: true,
        type: 'gentle_nudge',
        reason: 'extended_silence',
        suggestedDialogue: "Still thinking? No rush at all.",
        delayMs: 300,
      };
    }

    return { interrupt: false, type: 'none', reason: 'no_interrupt_needed', suggestedDialogue: null, delayMs: 0 };
  }

  // ============================================================
  // SCHEDULE ACTION: Queue with precise timing
  // ============================================================

  /**
   * Schedule an action for delivery after a delay.
   * Returns a cancellable handle.
   *
   * @param {Function} deliverFn - Function to call when timer fires
   * @param {number} delayMs - Milliseconds to wait
   * @returns {Object} { cancel: Function, scheduledAt: number, firesAt: number }
   */
  scheduleAction(deliverFn, delayMs) {
    const scheduledAt = Date.now();
    const firesAt = scheduledAt + delayMs;

    const timerId = setTimeout(() => {
      deliverFn();
    }, delayMs);

    return {
      cancel: () => clearTimeout(timerId),
      scheduledAt,
      firesAt,
      delayMs,
    };
  }

  // ============================================================
  // BEHAVIOR MULTIPLIER
  // ============================================================

  /**
   * Calculate a timing multiplier based on student behavior.
   * < 1.0 means speed up (flow state, engaged)
   * > 1.0 means slow down (struggling, hesitating)
   *
   * @returns {number} Multiplier (0.5 - 2.0)
   */
  _getBehaviorMultiplier(state, memory) {
    const engagement = memory?.engagement || {};
    const performance = state?.performance || {};

    let multiplier = 1.0;

    // Flow state → speed up
    if (performance.correctStreak >= 5 && engagement.trend === 'engaged') {
      multiplier *= this.config.flowMultiplier;
    }

    // Struggling → slow down
    if (performance.wrongStreak >= 2) {
      multiplier *= this.config.struggleMultiplier;
    }

    // Hesitating (slow responses) → give more time
    if (engagement.recentPace === 'slow') {
      multiplier *= this.config.hesitationMultiplier;
    }

    // Disengaging → act sooner to re-engage
    if (engagement.trend === 'disengaging') {
      multiplier *= this.config.disengagingMultiplier;
    }

    // Clamp to reasonable range
    return Math.max(0.5, Math.min(2.0, multiplier));
  }

  // ============================================================
  // LEARNING STYLE TIMING BONUS
  // ============================================================

  /**
   * Visual learners need more time to process diagrams.
   * Pattern learners need time to analyze.
   * Auditory and kinesthetic learners process faster.
   */
  _getLearningStyleBonus(state) {
    const mode = state?.learningStyle?.reinforcementMode;

    switch (mode) {
      case 'visual':     return this.config.visualPauseBonus;
      case 'pattern':    return this.config.patternPauseBonus;
      case 'auditory':   return this.config.auditoryPauseBonus;
      case 'repetition': return this.config.kinestheticPauseBonus;
      default:           return 0;
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  _clampDelay(ms) {
    return Math.max(this.config.minDelay, Math.min(this.config.maxDelay, ms));
  }

  _explainTiming(action, multiplier, lastOutcome) {
    const parts = [];
    if (multiplier < 0.8) parts.push('flow_speedup');
    if (multiplier > 1.2) parts.push('struggle_slowdown');
    if (action.celebration) parts.push('celebration_timing');
    if (action.visualAsset) parts.push('visual_processing_time');
    if (action.difficultyAdjustment) parts.push('difficulty_shift_pause');
    if (lastOutcome === 'wrong') parts.push('post_error_pause');
    if (lastOutcome === 'perfect') parts.push('post_perfect_hold');
    return parts.length > 0 ? parts.join('+') : 'standard_timing';
  }

  /**
   * Get timing configuration for debugging.
   */
  getConfig() {
    return { ...this.config };
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiTimingEngine };
} else if (typeof window !== 'undefined') {
  window.TAMiTimingEngine = TAMiTimingEngine;
}

export { TAMiTimingEngine };
