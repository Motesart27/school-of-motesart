/**
 * ============================================================
 * T.A.M.i INTELLIGENCE LAYER v1.0
 * ============================================================
 *
 * The decision engine that determines WHEN Claude should be
 * called and WHAT context it receives. This is NOT the teacher.
 * The deterministic lesson engine is the teacher.
 *
 * This layer detects three states (v1.0):
 *   1. Struggle — repeated wrong answers, low confidence
 *   2. Engagement Drop — long delays, replays, inactivity
 *   3. Milestone — mastery achieved, lesson complete, streaks
 *
 * When a state is detected, the intelligence layer:
 *   1. Decides if AI enhancement is warranted
 *   2. Assembles a 4-layer context prompt
 *   3. Passes the request to the bridge for backend delivery
 *   4. Merges the validated response into the deterministic flow
 *   5. Falls back gracefully if Claude fails or times out
 *
 * Architecture:
 *   Engine Events → Intelligence Layer → Bridge → Backend → Claude
 *                                     ↓
 *                              (or deterministic fallback)
 *
 * v1.1: Now integrates with StateManager and MicroMemory.
 *   - State manager is the single source of truth for student state
 *   - Micro-memory provides pattern detection (struggle, engagement, breakthroughs)
 *   - Context assembly pulls from state manager's getClaudeContext()
 *   - Strategy recommendations come from micro-memory analysis
 *
 * ============================================================
 */

class TAMiIntelligenceLayer {

  /**
   * @param {Object} config
   * @param {TAMiStateManager} config.stateManager - Optional state manager instance
   */
  constructor(config = {}) {
    // ---- Configuration ----
    this.config = {
      // Struggle detection
      wrongCountThreshold: 2,       // wrongTwice triggers struggle
      confidenceFloor: 30,          // below this = struggle
      confidenceDrop: 15,           // single-moment drop this big = struggle

      // Engagement detection
      responseDelayMs: 15000,       // 15s without response = concern
      replayThreshold: 3,           // 3+ replays on same moment = disengaged
      inactivityMs: 30000,          // 30s total silence = engagement drop

      // Milestone detection
      masteryThreshold: 75,         // confidence >= this = mastered
      streakLength: 5,              // 5 correct in a row = flow state
      perfectThreshold: 90,         // confidence >= this = perfect

      // AI call limits
      maxCallsPerLesson: 10,        // hard cap on Claude calls
      cooldownMs: 20000,            // minimum time between AI calls
      aiTimeoutMs: 8000,            // max wait for Claude response

      // Deterministic fallback messages
      fallbackMessages: {
        struggle: "Let's try that one more time. Take it slow — you've got this.",
        engagement: "Still with me? No rush — take your time.",
        milestone: "Great work! You're really getting the hang of this.",
        summary: "Nice session! Keep practicing what we covered today."
      },

      ...config
    };

    // ---- State Manager & Memory Integration ----
    // If a state manager is provided, the intelligence layer delegates
    // state tracking to it. Otherwise, it uses its own internal state.
    this.stateManager = config.stateManager || null;

    // ---- Internal State ----
    this._state = {
      // Lesson context (set on lesson start)
      lessonId: null,
      studentId: null,
      studentProfile: null,         // Layer 2: from Airtable
      ambassadorPrompt: null,       // Layer 1: from Ambassador Framework MASTER

      // Running counters
      aiCallCount: 0,
      lastAiCallTime: 0,
      wrongStreak: 0,
      correctStreak: 0,
      replayCount: 0,
      lastResponseTime: Date.now(),
      momentsProcessed: 0,

      // Per-concept tracking
      conceptHistory: {},           // conceptId → { attempts, correct, wrong, confidence }

      // Detection flags (prevent duplicate triggers)
      activeDetections: new Set(),  // 'struggle', 'engagement', 'milestone'

      // Moment context (updated each moment)
      currentMoment: null,
      currentPhase: null,
      lastOutcome: null,

      // Session accumulator for lesson summary
      sessionEvents: [],
    };

    // ---- Event emitter (lightweight) ----
    this._listeners = {};
  }

  // ============================================================
  // EVENT SYSTEM (mirrors engine pattern)
  // ============================================================

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => {
        try { cb(data); } catch (err) { console.error(`[TAMi] Event error [${event}]:`, err); }
      });
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize with lesson context. Called once at lesson start.
   *
   * @param {Object} params
   * @param {string} params.lessonId
   * @param {string} params.studentId
   * @param {Object} params.studentProfile  - Layer 2 data from Airtable
   * @param {string} params.ambassadorPrompt - Layer 1 system prompt
   * @param {Object} params.lessonData      - The full lesson JSON
   */
  initialize({ lessonId, studentId, studentProfile, ambassadorPrompt, lessonData }) {
    this._state.lessonId = lessonId;
    this._state.studentId = studentId;
    this._state.studentProfile = studentProfile || {};
    this._state.ambassadorPrompt = ambassadorPrompt || '';

    // Reset counters
    this._state.aiCallCount = 0;
    this._state.lastAiCallTime = 0;
    this._state.wrongStreak = 0;
    this._state.correctStreak = 0;
    this._state.replayCount = 0;
    this._state.lastResponseTime = Date.now();
    this._state.momentsProcessed = 0;
    this._state.activeDetections.clear();
    this._state.sessionEvents = [];

    // Initialize concept tracking from lesson data
    this._state.conceptHistory = {};
    if (lessonData?.concepts) {
      lessonData.concepts.forEach(c => {
        this._state.conceptHistory[c.id] = {
          attempts: 0,
          correct: 0,
          wrong: 0,
          confidence: c.startConfidence || 50,
          masteryReached: false
        };
      });
    }

    // Initialize state manager if present
    if (this.stateManager) {
      this.stateManager.initialize({
        studentId,
        lessonId,
        studentProfile: studentProfile || {},
        lessonData: lessonData || {},
        wylProfile: studentProfile?.wyl_profile || {},
      });
    }

    this.emit('tami:initialized', { lessonId, studentId });
  }

  // ============================================================
  // SIGNAL PROCESSORS
  // These are called by the bridge when engine events fire.
  // Each one updates internal state and checks for detections.
  // ============================================================

  /**
   * Process a moment entering. Updates current context.
   */
  processMomentEnter(moment, engineState) {
    this._state.currentMoment = moment;
    this._state.currentPhase = moment.phase;
    this._state.momentsProcessed++;
    this._state.lastResponseTime = Date.now();

    // Feed state manager
    if (this.stateManager) {
      this.stateManager.updateMoment(moment);
    }

    // Log for session summary
    this._state.sessionEvents.push({
      type: 'moment_enter',
      momentId: moment.id,
      phase: moment.phase,
      timestamp: Date.now()
    });
  }

  /**
   * Process a student response evaluation.
   * This is the primary trigger for struggle and milestone detection.
   *
   * @param {Object} evaluation
   * @param {string} evaluation.outcome - 'correct' | 'wrong' | 'perfect' | 'timeout'
   * @param {Object} evaluation.moment  - The moment that was evaluated
   * @param {Object} evaluation.engineState - Current engine state
   * @returns {Object|null} Detection result, or null if no detection
   */
  processEvaluation({ outcome, moment, engineState }) {
    const result = { type: outcome, momentId: moment.id };

    // Update streaks
    if (outcome === 'correct' || outcome === 'perfect') {
      this._state.correctStreak++;
      this._state.wrongStreak = 0;
    } else if (outcome === 'wrong' || outcome === 'timeout') {
      this._state.wrongStreak++;
      this._state.correctStreak = 0;
    }

    // Update concept history
    if (moment.concepts?.length) {
      moment.concepts.forEach(conceptId => {
        const ch = this._state.conceptHistory[conceptId];
        if (ch) {
          ch.attempts++;
          if (outcome === 'correct' || outcome === 'perfect') ch.correct++;
          else ch.wrong++;
        }
      });
    }

    // Update last outcome
    this._state.lastOutcome = outcome;

    // Feed state manager (handles memory recording + breakthrough detection)
    if (this.stateManager) {
      this.stateManager.updateEvaluation(outcome, moment);
    }

    // Log for session summary
    this._state.sessionEvents.push({
      type: 'evaluation',
      momentId: moment.id,
      outcome,
      wrongStreak: this._state.wrongStreak,
      correctStreak: this._state.correctStreak,
      timestamp: Date.now()
    });

    // ---- DETECTION: Struggle ----
    const struggleResult = this._detectStruggle(moment, engineState);
    if (struggleResult) return struggleResult;

    // ---- DETECTION: Milestone ----
    const milestoneResult = this._detectMilestone(moment, engineState);
    if (milestoneResult) return milestoneResult;

    return null;
  }

  /**
   * Process a confidence update from the engine.
   */
  processConfidenceUpdate({ concept, oldValue, newValue, delta }) {
    // Update local tracking
    const ch = this._state.conceptHistory[concept];
    if (ch) {
      ch.confidence = newValue;
    }

    // Feed state manager
    if (this.stateManager) {
      this.stateManager.updateConfidence(concept, oldValue, newValue);
    }

    // Large negative drop = struggle signal
    if (delta < -this.config.confidenceDrop) {
      return this._detectStruggle(this._state.currentMoment, null, {
        reason: 'confidence_drop',
        concept,
        drop: Math.abs(delta),
        newValue
      });
    }

    // Crossed mastery threshold = milestone
    if (newValue >= this.config.masteryThreshold && oldValue < this.config.masteryThreshold) {
      if (ch && !ch.masteryReached) {
        ch.masteryReached = true;
        return this._detectMilestone(this._state.currentMoment, null, {
          reason: 'mastery_achieved',
          concept,
          confidence: newValue
        });
      }
    }

    return null;
  }

  /**
   * Process a branch resolution. Tracks wrongTwice escalations.
   */
  processBranchResolve({ from, outcome, to, attemptCount }) {
    if (outcome === 'wrongTwice') {
      this._state.sessionEvents.push({
        type: 'wrongTwice',
        fromMoment: from,
        toMoment: to,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process a replay request. Tracks engagement signals.
   */
  processReplay(momentId) {
    this._state.replayCount++;

    // Check engagement
    if (this._state.replayCount >= this.config.replayThreshold) {
      return this._detectEngagementDrop({
        reason: 'excessive_replays',
        replayCount: this._state.replayCount,
        momentId
      });
    }
    return null;
  }

  /**
   * Process a response delay signal (called by bridge on timer).
   */
  processResponseDelay() {
    const elapsed = Date.now() - this._state.lastResponseTime;
    if (elapsed >= this.config.responseDelayMs) {
      return this._detectEngagementDrop({
        reason: 'response_delay',
        delayMs: elapsed,
        momentId: this._state.currentMoment?.id
      });
    }
    return null;
  }

  /**
   * Process lesson completion. Always triggers AI for summary.
   */
  processLessonComplete(engineState) {
    return {
      detection: 'lesson_complete',
      aiNeeded: this._canCallAI(),
      context: this._assembleSummaryContext(engineState),
      fallback: {
        message: this.config.fallbackMessages.summary,
        action: 'show_results'
      }
    };
  }

  // ============================================================
  // DETECTION ENGINES
  // ============================================================

  /**
   * Detect struggle state.
   * Triggers: wrongTwice, confidence floor, large confidence drop
   */
  _detectStruggle(moment, engineState, extra = {}) {
    const reasons = [];

    // Check wrong streak
    if (this._state.wrongStreak >= this.config.wrongCountThreshold) {
      reasons.push('wrong_streak');
    }

    // Check confidence floor
    if (moment?.concepts?.length) {
      moment.concepts.forEach(cId => {
        const ch = this._state.conceptHistory[cId];
        if (ch && ch.confidence <= this.config.confidenceFloor) {
          reasons.push(`low_confidence:${cId}`);
        }
      });
    }

    // Check explicit extra reasons
    if (extra.reason) {
      reasons.push(extra.reason);
    }

    if (reasons.length === 0) return null;

    // Prevent duplicate struggle detection within cooldown
    if (this._state.activeDetections.has('struggle')) return null;
    this._state.activeDetections.add('struggle');

    // Auto-clear after cooldown
    setTimeout(() => this._state.activeDetections.delete('struggle'), this.config.cooldownMs);

    const detection = {
      detection: 'struggle',
      reasons,
      aiNeeded: this._canCallAI(),
      context: this._assembleContext('struggle', moment, extra),
      fallback: {
        message: this.config.fallbackMessages.struggle,
        action: 'replay_moment'
      }
    };

    // Log
    this._state.sessionEvents.push({
      type: 'detection',
      detection: 'struggle',
      reasons,
      aiCalled: detection.aiNeeded,
      timestamp: Date.now()
    });

    this.emit('tami:struggle_detected', detection);
    return detection;
  }

  /**
   * Detect engagement drop.
   * Triggers: long delay, excessive replays, inactivity
   */
  _detectEngagementDrop(extra = {}) {
    // Prevent duplicate
    if (this._state.activeDetections.has('engagement')) return null;
    this._state.activeDetections.add('engagement');
    setTimeout(() => this._state.activeDetections.delete('engagement'), this.config.cooldownMs);

    const detection = {
      detection: 'engagement_drop',
      reason: extra.reason || 'unknown',
      aiNeeded: this._canCallAI(),
      context: this._assembleContext('engagement', this._state.currentMoment, extra),
      fallback: {
        message: this.config.fallbackMessages.engagement,
        action: 'gentle_prompt'
      }
    };

    this._state.sessionEvents.push({
      type: 'detection',
      detection: 'engagement_drop',
      reason: extra.reason,
      aiCalled: detection.aiNeeded,
      timestamp: Date.now()
    });

    this.emit('tami:engagement_drop', detection);
    return detection;
  }

  /**
   * Detect milestone state.
   * Triggers: mastery achieved, correct streak, perfect answers
   */
  _detectMilestone(moment, engineState, extra = {}) {
    const reasons = [];

    // Correct streak
    if (this._state.correctStreak >= this.config.streakLength) {
      reasons.push('flow_state');
    }

    // Mastery from extra
    if (extra.reason === 'mastery_achieved') {
      reasons.push('mastery_achieved');
    }

    if (reasons.length === 0) return null;

    // Prevent duplicate
    if (this._state.activeDetections.has('milestone')) return null;
    this._state.activeDetections.add('milestone');
    setTimeout(() => this._state.activeDetections.delete('milestone'), this.config.cooldownMs);

    const detection = {
      detection: 'milestone',
      reasons,
      aiNeeded: this._canCallAI(),
      context: this._assembleContext('milestone', moment, extra),
      fallback: {
        message: this.config.fallbackMessages.milestone,
        action: 'celebrate'
      }
    };

    this._state.sessionEvents.push({
      type: 'detection',
      detection: 'milestone',
      reasons,
      aiCalled: detection.aiNeeded,
      timestamp: Date.now()
    });

    this.emit('tami:milestone_reached', detection);
    return detection;
  }

  // ============================================================
  // AI CALL GATING
  // ============================================================

  /**
   * Check if we're allowed to make a Claude API call right now.
   * Enforces: max calls, cooldown, lesson state.
   */
  _canCallAI() {
    // Hard limit
    if (this._state.aiCallCount >= this.config.maxCallsPerLesson) {
      return false;
    }

    // Cooldown
    const elapsed = Date.now() - this._state.lastAiCallTime;
    if (elapsed < this.config.cooldownMs && this._state.aiCallCount > 0) {
      return false;
    }

    return true;
  }

  /**
   * Record that an AI call was made. Called by bridge after sending.
   */
  recordAICall() {
    this._state.aiCallCount++;
    this._state.lastAiCallTime = Date.now();
    if (this.stateManager) {
      this.stateManager.recordAICall();
    }
  }

  // ============================================================
  // CONTEXT ASSEMBLY (4-Layer Prompt)
  // ============================================================

  /**
   * Assemble the 4-layer context for a Claude API call.
   *
   * Layer 1: Ambassador Framework (fixed identity + teaching rules)
   * Layer 2: Student Profile (from Airtable — learning style, history, rapport)
   * Layer 3: Live Lesson State (confidence, WYL, DPM, phase, progress)
   * Layer 4: Current Moment Context (what just happened, what the student did)
   *
   * @param {string} detectionType - 'struggle' | 'engagement' | 'milestone' | 'summary'
   * @param {Object} moment - Current moment object
   * @param {Object} extra - Additional context specific to the detection
   * @returns {Object} Structured context for the backend
   */
  _assembleContext(detectionType, moment, extra = {}) {
    // If state manager is available, use its rich context
    const enrichedContext = this.stateManager
      ? this.stateManager.getClaudeContext()
      : null;

    return {
      // Meta
      requestType: detectionType,
      timestamp: Date.now(),

      // Layer 1: Ambassador identity (sent as system prompt by backend)
      // Not included in the payload — backend holds this.

      // Layer 2: Student Profile
      studentProfile: enrichedContext ? {
        studentId: enrichedContext.studentId,
        rapportStage: enrichedContext.rapportStage,
        dominantLearningStyle: enrichedContext.dominantStyle,
        reinforcementMode: enrichedContext.reinforcementMode,
      } : {
        studentId: this._state.studentId,
        wylProfile: this._state.studentProfile.wyl_profile || null,
        rapportStage: this._state.studentProfile.tami_rapport_stage || 'new',
        lessonHistory: this._state.studentProfile.last_lesson_summary || null,
        conceptMastery: this._state.studentProfile.concept_mastery || null,
      },

      // Layer 3: Live Lesson State
      lessonState: enrichedContext ? {
        lessonId: this._state.lessonId,
        currentPhase: this._state.currentPhase,
        momentsProcessed: enrichedContext.momentsProcessed,
        wrongStreak: enrichedContext.wrongStreak,
        correctStreak: enrichedContext.correctStreak,
        accuracy: enrichedContext.accuracy,
        conceptConfidences: enrichedContext.conceptConfidences,
        masteredConcepts: enrichedContext.masteredConcepts,
        strugglingConcepts: enrichedContext.strugglingConcepts,
        engagementTrend: enrichedContext.engagementTrend,
        pace: enrichedContext.pace,
        aiCallsUsed: enrichedContext.aiCallsUsed,
        breakthroughCount: enrichedContext.breakthroughCount,
      } : {
        lessonId: this._state.lessonId,
        currentPhase: this._state.currentPhase,
        momentsProcessed: this._state.momentsProcessed,
        wrongStreak: this._state.wrongStreak,
        correctStreak: this._state.correctStreak,
        replayCount: this._state.replayCount,
        conceptConfidences: this._getConceptSnapshot(),
        aiCallsUsed: this._state.aiCallCount,
      },

      // Layer 4: Current Moment Context
      momentContext: {
        momentId: moment?.id || null,
        phase: moment?.phase || null,
        concepts: moment?.concepts || [],
        dialogue: moment?.dialogue?.text || null,
        expectedAction: moment?.expectedAction || null,
        lastOutcome: this._state.lastOutcome,
        detectionReasons: extra.reason ? [extra.reason] : (extra.reasons || []),
      },

      // Layer 5: Micro-Memory Teaching Snapshot (new)
      // This is what makes Claude's responses precise — it knows
      // the student's recent behavior patterns, not just the current moment.
      teachingMemory: enrichedContext ? {
        strategy: enrichedContext.strategy,
        strugglingConcepts: enrichedContext.strugglingConcepts,
        breakthroughCount: enrichedContext.breakthroughCount,
      } : null,
    };
  }

  /**
   * Assemble summary context at lesson end.
   */
  _assembleSummaryContext(engineState) {
    return {
      requestType: 'summary',
      timestamp: Date.now(),

      studentProfile: {
        studentId: this._state.studentId,
        rapportStage: this._state.studentProfile.tami_rapport_stage || 'new',
      },

      lessonSummary: {
        lessonId: this._state.lessonId,
        totalMoments: this._state.momentsProcessed,
        aiCallsUsed: this._state.aiCallCount,
        conceptFinal: this._getConceptSnapshot(),
        sessionEvents: this._state.sessionEvents,
        detections: this._state.sessionEvents.filter(e => e.type === 'detection'),
        wrongTwiceCount: this._state.sessionEvents.filter(e => e.type === 'wrongTwice').length,
      },
    };
  }

  /**
   * Get a snapshot of all concept confidences.
   */
  _getConceptSnapshot() {
    const snapshot = {};
    Object.entries(this._state.conceptHistory).forEach(([id, data]) => {
      snapshot[id] = {
        confidence: data.confidence,
        attempts: data.attempts,
        correct: data.correct,
        wrong: data.wrong,
        mastered: data.masteryReached,
      };
    });
    return snapshot;
  }

  // ============================================================
  // RESPONSE MERGING
  // ============================================================

  /**
   * Merge a validated AI response into the deterministic flow.
   * Returns an action object the bridge/orchestrator can execute.
   *
   * @param {Object} aiResponse - Validated response from Claude (contract-compliant)
   * @param {Object} detection  - The original detection that triggered the call
   * @returns {Object} Action to execute
   */
  mergeResponse(aiResponse, detection) {
    const action = {
      source: 'ai',
      detectionType: detection.detection,
      timestamp: Date.now(),
    };

    // Determine what the AI response should do
    switch (aiResponse.next_action) {

      case 'rephrase':
        // Override the next moment's dialogue with AI-generated text
        action.type = 'dialogue_override';
        action.dialogue = aiResponse.message;
        action.toneTag = aiResponse.tone_tag;
        action.timing = aiResponse.delivery_timing;
        break;

      case 'encourage':
        // Inject an encouragement beat (no lesson flow change)
        action.type = 'encouragement_inject';
        action.dialogue = aiResponse.message;
        action.toneTag = aiResponse.tone_tag;
        action.timing = aiResponse.delivery_timing;
        break;

      case 'skip_ahead':
        // Student has mastered this — suggest skipping
        action.type = 'branch_suggestion';
        action.suggestion = 'skip';
        action.dialogue = aiResponse.message;
        break;

      case 'slow_down':
        // Student is struggling — suggest replay or easier path
        action.type = 'branch_suggestion';
        action.suggestion = 'replay';
        action.dialogue = aiResponse.message;
        break;

      case 'summarize':
        // Lesson summary
        action.type = 'lesson_summary';
        action.dialogue = aiResponse.message;
        action.focusArea = aiResponse.focus_area;
        break;

      default:
        // Unknown action — use message as encouragement
        action.type = 'encouragement_inject';
        action.dialogue = aiResponse.message;
        action.toneTag = aiResponse.tone_tag || 'warm';
        break;
    }

    this.emit('tami:ai_response', action);
    return action;
  }

  /**
   * When AI fails or times out, return the deterministic fallback.
   */
  getFallback(detection) {
    const action = {
      source: 'fallback',
      detectionType: detection.detection,
      dialogue: detection.fallback.message,
      actionHint: detection.fallback.action,
      timestamp: Date.now(),
    };

    this.emit('tami:ai_fallback', action);
    return action;
  }

  // ============================================================
  // STATE ACCESSORS
  // ============================================================

  /**
   * Get the full internal state (for debugging / telemetry).
   */
  getState() {
    return {
      ...this._state,
      activeDetections: Array.from(this._state.activeDetections),
      canCallAI: this._canCallAI(),
    };
  }

  /**
   * Get a compact status for UI display.
   */
  getStatus() {
    return {
      aiCallsUsed: this._state.aiCallCount,
      aiCallsRemaining: this.config.maxCallsPerLesson - this._state.aiCallCount,
      wrongStreak: this._state.wrongStreak,
      correctStreak: this._state.correctStreak,
      activeDetections: Array.from(this._state.activeDetections),
    };
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiIntelligenceLayer };
} else if (typeof window !== 'undefined') {
  window.TAMiIntelligenceLayer = TAMiIntelligenceLayer;
}

export { TAMiIntelligenceLayer };
