/**
 * ============================================================
 * T.A.M.i STATE MANAGER v1.0
 * ============================================================
 *
 * Single source of truth for everything the AI intelligence
 * layer "knows" about the student during a lesson.
 *
 * Instead of the intelligence layer reading raw events and
 * maintaining its own scattered counters, it reads from this
 * unified state object. This keeps logic clean and expandable.
 *
 * The state manager composes data from:
 *   - Student profile (Airtable, loaded at lesson start)
 *   - Micro-memory (rolling behavior patterns)
 *   - Engine state (confidence, WYL, DPM)
 *   - Orchestrator metrics (engagement, streaks)
 *
 * Architecture:
 *   Engine State ──┐
 *   Micro-Memory ──┤──→ State Manager ──→ Intelligence Layer
 *   Student Profile┘                  ──→ Claude Context Assembly
 *
 * ============================================================
 */

class TAMiStateManager {

  /**
   * @param {Object} params
   * @param {TAMiMicroMemory} params.memory - The micro-memory instance
   * @param {Object} params.config
   */
  constructor({ memory, config = {} } = {}) {
    this.memory = memory || null;

    this.config = {
      confidenceFloor: config.confidenceFloor || 30,
      masteryThreshold: config.masteryThreshold || 75,
      ...config,
    };

    // ---- The unified state object ----
    this._state = {
      // Identity
      studentId: null,
      lessonId: null,

      // Rapport (persisted across lessons via Airtable)
      rapport: {
        stage: 'new',              // 'new' | 'building' | 'established' | 'trusted'
        lessonsCompleted: 0,
        lastLessonSummary: null,
      },

      // Performance (live during lesson)
      performance: {
        correctStreak: 0,
        wrongStreak: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalAttempts: 0,
        conceptConfidences: {},    // conceptId → number (0-100)
        masteredConcepts: [],      // conceptIds that crossed mastery threshold
        strugglingConcepts: [],    // from micro-memory
      },

      // Engagement (live during lesson)
      engagement: {
        avgResponseTimeMs: 0,
        slowResponses: 0,
        hesitations: 0,
        replays: 0,
        trend: 'engaged',          // 'engaged' | 'slowing' | 'disengaging'
        pace: 'normal',            // 'fast' | 'normal' | 'slow'
      },

      // Learning style (from WYL profile, updated during lesson)
      learningStyle: {
        dominant: null,            // 'visual' | 'auditory' | 'readwrite' | 'kinesthetic'
        visual: 25,
        auditory: 25,
        readwrite: 25,
        kinesthetic: 25,
        reinforcementMode: null,   // Derived: 'pattern' | 'repetition' | 'visual' | 'auditory'
        pacePreference: 'normal',  // 'slow' | 'normal' | 'fast'
      },

      // Current moment (updated each moment)
      currentMoment: {
        momentId: null,
        phase: null,
        concepts: [],
        expectedAction: null,
        dialogue: null,
      },

      // Teaching strategy (from micro-memory analysis)
      strategy: {
        recommendation: null,      // 'switch_visual' | 'slow_pace' | 'reinforce' | 'celebrate'
        reason: null,
        targetConcept: null,
        confidence: 0,
      },

      // Session meta
      session: {
        startTime: null,
        momentsProcessed: 0,
        aiCallsUsed: 0,
        aiCallsRemaining: 10,
        breakthroughCount: 0,
        phaseHistory: [],
      },
    };
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize state at lesson start.
   * @param {Object} params
   * @param {string} params.studentId
   * @param {string} params.lessonId
   * @param {Object} params.studentProfile - From Airtable
   * @param {Object} params.lessonData - The lesson JSON
   * @param {Object} params.wylProfile - WYL learning style data
   */
  initialize({ studentId, lessonId, studentProfile = {}, lessonData = {}, wylProfile = {} }) {
    // Identity
    this._state.studentId = studentId;
    this._state.lessonId = lessonId;

    // Rapport from stored profile
    this._state.rapport.stage = studentProfile.tami_rapport_stage || 'new';
    this._state.rapport.lessonsCompleted = studentProfile.lessons_completed || 0;
    this._state.rapport.lastLessonSummary = studentProfile.last_lesson_summary || null;

    // Initialize concept confidences
    this._state.performance.conceptConfidences = {};
    if (lessonData.concepts) {
      lessonData.concepts.forEach(c => {
        this._state.performance.conceptConfidences[c.id] = c.startConfidence || 50;
      });
    }

    // Restore concept mastery from stored profile
    if (studentProfile.concept_mastery) {
      try {
        const stored = typeof studentProfile.concept_mastery === 'string'
          ? JSON.parse(studentProfile.concept_mastery)
          : studentProfile.concept_mastery;
        Object.entries(stored).forEach(([id, val]) => {
          if (this._state.performance.conceptConfidences[id] !== undefined) {
            this._state.performance.conceptConfidences[id] = val;
          }
        });
      } catch (e) { /* ignore parse errors */ }
    }

    // WYL learning style
    if (wylProfile) {
      this._state.learningStyle.visual = wylProfile.visual || 25;
      this._state.learningStyle.auditory = wylProfile.auditory || 25;
      this._state.learningStyle.readwrite = wylProfile.readwrite || 25;
      this._state.learningStyle.kinesthetic = wylProfile.kinesthetic || 25;
      this._state.learningStyle.dominant = this._getDominantStyle();
      this._state.learningStyle.reinforcementMode = this._deriveReinforcementMode();
    }

    // Session
    this._state.session.startTime = Date.now();
    this._state.session.momentsProcessed = 0;
    this._state.session.aiCallsUsed = 0;
    this._state.session.breakthroughCount = 0;
    this._state.session.phaseHistory = [];

    // Reset performance counters
    this._state.performance.correctStreak = 0;
    this._state.performance.wrongStreak = 0;
    this._state.performance.totalCorrect = 0;
    this._state.performance.totalWrong = 0;
    this._state.performance.totalAttempts = 0;
    this._state.performance.masteredConcepts = [];
    this._state.performance.strugglingConcepts = [];

    // Reset memory
    if (this.memory) this.memory.reset();
  }

  // ============================================================
  // UPDATES (called by bridge/intelligence layer)
  // ============================================================

  /**
   * Update after a student response is evaluated.
   */
  updateEvaluation(outcome, moment) {
    this._state.performance.totalAttempts++;

    if (outcome === 'correct' || outcome === 'perfect') {
      this._state.performance.correctStreak++;
      this._state.performance.wrongStreak = 0;
      this._state.performance.totalCorrect++;

      // Record in memory and check for breakthroughs
      if (this.memory && moment.concepts?.length) {
        moment.concepts.forEach(cId => {
          this.memory.recordCorrect(cId, moment.id, { perfect: outcome === 'perfect' });
          if (this.memory.checkAndRecordBreakthrough(cId, moment.id)) {
            this._state.session.breakthroughCount++;
          }
        });
      }
    } else {
      this._state.performance.wrongStreak++;
      this._state.performance.correctStreak = 0;
      this._state.performance.totalWrong++;

      // Record mistake in memory
      if (this.memory && moment.concepts?.length) {
        moment.concepts.forEach(cId => {
          this.memory.recordMistake(cId, moment.id);
        });
      }
    }
  }

  /**
   * Update after a confidence change from the engine.
   */
  updateConfidence(conceptId, oldValue, newValue) {
    this._state.performance.conceptConfidences[conceptId] = newValue;

    // Check mastery
    if (newValue >= this.config.masteryThreshold && oldValue < this.config.masteryThreshold) {
      if (!this._state.performance.masteredConcepts.includes(conceptId)) {
        this._state.performance.masteredConcepts.push(conceptId);
      }
    }

    // Record in memory
    if (this.memory) {
      this.memory.recordConfidenceChange(conceptId, oldValue, newValue);
    }
  }

  /**
   * Update current moment context.
   */
  updateMoment(moment) {
    this._state.currentMoment = {
      momentId: moment.id,
      phase: moment.phase,
      concepts: moment.concepts || [],
      expectedAction: moment.expectedAction || null,
      dialogue: moment.dialogue?.text || null,
    };
    this._state.session.momentsProcessed++;

    // Track phase transitions
    const lastPhase = this._state.session.phaseHistory[this._state.session.phaseHistory.length - 1];
    if (moment.phase && moment.phase !== lastPhase) {
      this._state.session.phaseHistory.push(moment.phase);
      if (this.memory) {
        this.memory.recordPhaseTransition(lastPhase || 'none', moment.phase);
      }
    }
  }

  /**
   * Update WYL learning style from engine recalibration.
   */
  updateWYL(wylData) {
    if (wylData.visual !== undefined) this._state.learningStyle.visual = wylData.visual;
    if (wylData.auditory !== undefined) this._state.learningStyle.auditory = wylData.auditory;
    if (wylData.readwrite !== undefined) this._state.learningStyle.readwrite = wylData.readwrite;
    if (wylData.kinesthetic !== undefined) this._state.learningStyle.kinesthetic = wylData.kinesthetic;
    this._state.learningStyle.dominant = this._getDominantStyle();
    this._state.learningStyle.reinforcementMode = this._deriveReinforcementMode();
  }

  /**
   * Update response timing.
   */
  updateResponseTime(momentId, responseTimeMs) {
    if (this.memory) {
      this.memory.recordResponseTime(momentId, responseTimeMs);
    }
  }

  /**
   * Record a replay.
   */
  updateReplay(momentId) {
    if (this.memory) {
      this.memory.recordReplay(momentId);
    }
  }

  /**
   * Record a student question in micro-memory.
   * Called by the question handler integration in WYLPracticeLive.
   *
   * @param {string} text - The question text
   * @param {string} category - 'lesson_related' | 'music_related' | 'off_topic' | 'confusion'
   * @param {string|null} concept - Related concept (if any)
   */
  recordQuestion(text, category, concept = null) {
    if (this.memory) {
      this.memory.recordQuestion(text, category, concept);
    }
  }

  /**
   * Record an AI call.
   */
  recordAICall() {
    this._state.session.aiCallsUsed++;
    this._state.session.aiCallsRemaining = Math.max(0,
      this._state.session.aiCallsRemaining - 1);
  }

  // ============================================================
  // READS — PRIMARY ACCESSORS
  // ============================================================

  /**
   * Get the full state object (for intelligence layer).
   */
  getState() {
    // Refresh memory-derived fields before returning
    this._refreshFromMemory();
    return { ...this._state };
  }

  /**
   * Get a compact snapshot optimized for Claude context assembly.
   * This is Layer 2 + Layer 3 + Layer 4 combined.
   */
  getClaudeContext() {
    this._refreshFromMemory();

    return {
      // Student identity
      studentId: this._state.studentId,
      rapportStage: this._state.rapport.stage,

      // Performance summary
      correctStreak: this._state.performance.correctStreak,
      wrongStreak: this._state.performance.wrongStreak,
      accuracy: this._state.performance.totalAttempts > 0
        ? Math.round((this._state.performance.totalCorrect / this._state.performance.totalAttempts) * 100)
        : 0,

      // Concept state
      conceptConfidences: this._state.performance.conceptConfidences,
      masteredConcepts: this._state.performance.masteredConcepts,
      strugglingConcepts: this._state.performance.strugglingConcepts,

      // Engagement
      engagementTrend: this._state.engagement.trend,
      pace: this._state.engagement.pace,

      // Learning style
      dominantStyle: this._state.learningStyle.dominant,
      reinforcementMode: this._state.learningStyle.reinforcementMode,

      // Current moment
      currentMoment: this._state.currentMoment,

      // Strategy
      strategy: this._state.strategy,

      // Session meta
      momentsProcessed: this._state.session.momentsProcessed,
      aiCallsUsed: this._state.session.aiCallsUsed,
      breakthroughCount: this._state.session.breakthroughCount,
      lessonDurationMs: Date.now() - (this._state.session.startTime || Date.now()),
    };
  }

  /**
   * Get a minimal status for UI display.
   */
  getUIStatus() {
    return {
      correctStreak: this._state.performance.correctStreak,
      wrongStreak: this._state.performance.wrongStreak,
      engagementTrend: this._state.engagement.trend,
      masteredCount: this._state.performance.masteredConcepts.length,
      strugglingCount: this._state.performance.strugglingConcepts.length,
      breakthroughCount: this._state.session.breakthroughCount,
      strategy: this._state.strategy.recommendation,
    };
  }

  // ============================================================
  // EXPORT FOR AIRTABLE
  // ============================================================

  /**
   * Export state for long-term storage after lesson ends.
   */
  exportForStorage() {
    this._refreshFromMemory();

    return {
      studentId: this._state.studentId,
      lessonId: this._state.lessonId,
      completedAt: Date.now(),
      durationMs: Date.now() - (this._state.session.startTime || Date.now()),
      momentsProcessed: this._state.session.momentsProcessed,
      totalCorrect: this._state.performance.totalCorrect,
      totalWrong: this._state.performance.totalWrong,
      accuracy: this._state.performance.totalAttempts > 0
        ? Math.round((this._state.performance.totalCorrect / this._state.performance.totalAttempts) * 100)
        : 0,
      conceptMastery: JSON.stringify(this._state.performance.conceptConfidences),
      masteredConcepts: this._state.performance.masteredConcepts,
      rapportStage: this._state.rapport.stage,
      wylProfile: JSON.stringify({
        visual: this._state.learningStyle.visual,
        auditory: this._state.learningStyle.auditory,
        readwrite: this._state.learningStyle.readwrite,
        kinesthetic: this._state.learningStyle.kinesthetic,
        dominant: this._state.learningStyle.dominant,
      }),
      breakthroughCount: this._state.session.breakthroughCount,
      aiCallsUsed: this._state.session.aiCallsUsed,
      memoryExport: this.memory ? this.memory.exportForStorage() : null,
    };
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  /**
   * Refresh memory-derived fields in the state.
   */
  _refreshFromMemory() {
    if (!this.memory) return;

    // Engagement
    const engagement = this.memory.getEngagementSignals();
    this._state.engagement.avgResponseTimeMs = engagement.avgResponseTimeMs;
    this._state.engagement.slowResponses = engagement.slowResponses;
    this._state.engagement.hesitations = engagement.hesitations;
    this._state.engagement.replays = engagement.replays;
    this._state.engagement.trend = engagement.trend;
    this._state.engagement.pace = engagement.recentPace;

    // Struggling concepts
    this._state.performance.strugglingConcepts = this.memory
      .getStruggleConcepts()
      .filter(s => !s.resolved)
      .map(s => s.concept);

    // Strategy
    const rec = this.memory.getStrategyRecommendation();
    if (rec) {
      this._state.strategy.recommendation = rec.recommendation;
      this._state.strategy.reason = rec.reason;
      this._state.strategy.targetConcept = rec.concept;
      this._state.strategy.confidence = rec.confidence;
    } else {
      this._state.strategy.recommendation = null;
      this._state.strategy.reason = null;
      this._state.strategy.targetConcept = null;
      this._state.strategy.confidence = 0;
    }
  }

  /**
   * Get dominant WYL learning style.
   */
  _getDominantStyle() {
    const styles = this._state.learningStyle;
    const scores = {
      visual: styles.visual,
      auditory: styles.auditory,
      readwrite: styles.readwrite,
      kinesthetic: styles.kinesthetic,
    };
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Derive reinforcement mode from dominant learning style.
   * Maps WYL dominance to teaching approach.
   */
  _deriveReinforcementMode() {
    const dominant = this._state.learningStyle.dominant;
    const modeMap = {
      visual: 'visual',        // Use diagrams, keyboard highlights, color coding
      auditory: 'auditory',    // Use sound examples, singing, listening
      readwrite: 'pattern',    // Use patterns, sequences, written rules
      kinesthetic: 'repetition', // Use muscle memory, repeated practice, hands-on
    };
    return modeMap[dominant] || 'pattern';
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiStateManager };
} else if (typeof window !== 'undefined') {
  window.TAMiStateManager = TAMiStateManager;
}

export { TAMiStateManager };
