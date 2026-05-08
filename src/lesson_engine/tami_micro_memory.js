/**
 * ============================================================
 * T.A.M.i MICRO-MEMORY v1.0
 * ============================================================
 *
 * Short-term teaching memory that tracks student behavior
 * patterns within a rolling time window during a lesson.
 *
 * This is what makes T.A.M.i teach like a human: remembering
 * that a student struggled with scale numbers 8 minutes ago
 * and adjusting strategy when the concept reappears.
 *
 * Three signal types:
 *   1. Struggle Patterns  — repeated mistakes on same concept
 *   2. Engagement Signals — response delays, replays, hesitation
 *   3. Breakthrough Events — moments where understanding clicks
 *
 * The intelligence layer reads from micro-memory to:
 *   - Enrich context sent to Claude (so AI responses are precise)
 *   - Detect patterns without needing Claude (saves API calls)
 *   - Choose teaching strategy based on recent behavior
 *
 * Memory is ephemeral — it lives only during the lesson.
 * Long-term memory goes to Airtable after lesson ends.
 *
 * Cost: $0 per lesson. Runs entirely in-browser.
 *
 * ============================================================
 */

class TAMiMicroMemory {

  /**
   * @param {Object} config
   * @param {number} config.windowMinutes - Rolling window size (default 10 min)
   * @param {number} config.maxEvents - Hard cap on stored events (prevents memory leaks)
   * @param {number} config.struggleThreshold - Mistakes on same concept to flag as pattern
   * @param {number} config.slowResponseMs - Response time considered "slow"
   * @param {number} config.hesitationMs - Pause before answering considered "hesitation"
   */
  constructor(config = {}) {
    this.config = {
      windowMinutes: config.windowMinutes || 10,
      maxEvents: config.maxEvents || 200,
      struggleThreshold: config.struggleThreshold || 2,
      slowResponseMs: config.slowResponseMs || 12000,
      hesitationMs: config.hesitationMs || 6000,
    };

    this.windowMs = this.config.windowMinutes * 60 * 1000;

    // ---- Event store (chronological) ----
    this._events = [];

    // ---- Indexed views (rebuilt on query, cached briefly) ----
    this._cache = {
      struggles: null,
      engagement: null,
      breakthroughs: null,
      lastRebuilt: 0,
      ttlMs: 2000,  // cache valid for 2 seconds
    };
  }

  // ============================================================
  // RECORDING
  // ============================================================

  /**
   * Record a mistake event.
   * @param {string} conceptId - The concept the mistake was on
   * @param {string} momentId - The moment where it happened
   * @param {Object} extra - Additional context (attempt count, etc.)
   */
  recordMistake(conceptId, momentId, extra = {}) {
    this._record({
      type: 'mistake',
      concept: conceptId,
      momentId,
      ...extra,
    });
  }

  /**
   * Record a correct answer.
   * @param {string} conceptId
   * @param {string} momentId
   * @param {Object} extra - e.g. { perfect: true, responseTimeMs: 2300 }
   */
  recordCorrect(conceptId, momentId, extra = {}) {
    this._record({
      type: 'correct',
      concept: conceptId,
      momentId,
      ...extra,
    });
  }

  /**
   * Record a breakthrough — the moment a student "gets it" after struggling.
   * Detected when: student had 2+ mistakes on a concept, then gets it right.
   * @param {string} conceptId
   * @param {string} momentId
   */
  recordBreakthrough(conceptId, momentId) {
    this._record({
      type: 'breakthrough',
      concept: conceptId,
      momentId,
    });
  }

  /**
   * Record a response time observation.
   * @param {string} momentId
   * @param {number} responseTimeMs - How long the student took to respond
   */
  recordResponseTime(momentId, responseTimeMs) {
    this._record({
      type: 'response_time',
      momentId,
      responseTimeMs,
      slow: responseTimeMs >= this.config.slowResponseMs,
      hesitant: responseTimeMs >= this.config.hesitationMs && responseTimeMs < this.config.slowResponseMs,
    });
  }

  /**
   * Record a replay request.
   * @param {string} momentId
   */
  recordReplay(momentId) {
    this._record({
      type: 'replay',
      momentId,
    });
  }

  /**
   * Record a confidence change.
   * @param {string} conceptId
   * @param {number} oldValue
   * @param {number} newValue
   */
  recordConfidenceChange(conceptId, oldValue, newValue) {
    this._record({
      type: 'confidence_change',
      concept: conceptId,
      oldValue,
      newValue,
      delta: newValue - oldValue,
    });
  }

  /**
   * Record a phase transition.
   * @param {string} fromPhase
   * @param {string} toPhase
   */
  recordPhaseTransition(fromPhase, toPhase) {
    this._record({
      type: 'phase_transition',
      fromPhase,
      toPhase,
    });
  }

  /**
   * Record a student question.
   * Questions feed into confusion detection and engagement signals.
   * Repeated questions about the same concept bias the strategy
   * resolver toward visual reinforcement automatically.
   *
   * @param {string} text - The question text
   * @param {string} category - 'lesson_related' | 'music_related' | 'off_topic' | 'confusion'
   * @param {string|null} concept - The concept the question relates to (if any)
   */
  recordQuestion(text, category, concept = null) {
    this._record({
      type: 'question',
      text: text.substring(0, 200), // truncate for memory efficiency
      category,
      concept,
    });
  }

  /**
   * Internal: add event and clean up.
   */
  _record(event) {
    event.time = Date.now();
    this._events.push(event);
    this._invalidateCache();
    this._cleanup();
  }

  // ============================================================
  // QUERYING — STRUGGLE PATTERNS
  // ============================================================

  /**
   * Get all concepts the student is currently struggling with.
   * A concept is "struggling" if the student made >= threshold mistakes
   * within the memory window AND hasn't had a breakthrough since.
   *
   * @returns {Object[]} Array of { concept, mistakeCount, lastMistakeAge, hasBreakthrough }
   */
  getStruggleConcepts() {
    if (this._cacheValid('struggles')) return this._cache.struggles;

    const now = Date.now();
    const windowEvents = this._getWindowEvents();

    // Count mistakes per concept
    const conceptMistakes = {};
    const conceptBreakthroughs = new Set();

    windowEvents.forEach(e => {
      if (e.type === 'mistake') {
        if (!conceptMistakes[e.concept]) {
          conceptMistakes[e.concept] = { count: 0, lastTime: 0, moments: [] };
        }
        conceptMistakes[e.concept].count++;
        conceptMistakes[e.concept].lastTime = Math.max(conceptMistakes[e.concept].lastTime, e.time);
        if (!conceptMistakes[e.concept].moments.includes(e.momentId)) {
          conceptMistakes[e.concept].moments.push(e.momentId);
        }
      }
      if (e.type === 'breakthrough') {
        conceptBreakthroughs.add(e.concept);
      }
    });

    // Filter to struggling concepts
    const struggles = [];
    Object.entries(conceptMistakes).forEach(([concept, data]) => {
      if (data.count >= this.config.struggleThreshold) {
        struggles.push({
          concept,
          mistakeCount: data.count,
          lastMistakeAgeMs: now - data.lastTime,
          momentsAffected: data.moments.length,
          hasBreakthrough: conceptBreakthroughs.has(concept),
          resolved: conceptBreakthroughs.has(concept),
        });
      }
    });

    // Sort: unresolved first, then by mistake count descending
    struggles.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return b.mistakeCount - a.mistakeCount;
    });

    this._cache.struggles = struggles;
    return struggles;
  }

  /**
   * Check if a specific concept is currently a struggle.
   * @param {string} conceptId
   * @returns {boolean}
   */
  isStrugglingWith(conceptId) {
    return this.getStruggleConcepts().some(s => s.concept === conceptId && !s.resolved);
  }

  /**
   * Get the student's weakest concept right now.
   * @returns {Object|null} The struggle entry with the most mistakes, or null
   */
  getWeakestConcept() {
    const struggles = this.getStruggleConcepts().filter(s => !s.resolved);
    return struggles.length > 0 ? struggles[0] : null;
  }

  // ============================================================
  // QUERYING — ENGAGEMENT SIGNALS
  // ============================================================

  /**
   * Get engagement signal summary from recent behavior.
   *
   * @returns {Object} {
   *   slowResponses: number,
   *   hesitations: number,
   *   replays: number,
   *   avgResponseTimeMs: number,
   *   trend: 'engaged' | 'slowing' | 'disengaging',
   *   recentPace: 'fast' | 'normal' | 'slow'
   * }
   */
  getEngagementSignals() {
    if (this._cacheValid('engagement')) return this._cache.engagement;

    const windowEvents = this._getWindowEvents();
    const responseTimes = windowEvents.filter(e => e.type === 'response_time');
    const replays = windowEvents.filter(e => e.type === 'replay');

    const slowCount = responseTimes.filter(e => e.slow).length;
    const hesitantCount = responseTimes.filter(e => e.hesitant).length;
    const times = responseTimes.map(e => e.responseTimeMs);
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    // Trend: compare first half vs second half of response times
    let trend = 'engaged';
    if (times.length >= 4) {
      const mid = Math.floor(times.length / 2);
      const firstHalf = times.slice(0, mid);
      const secondHalf = times.slice(mid);
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (avgSecond > avgFirst * 1.5) trend = 'disengaging';
      else if (avgSecond > avgFirst * 1.2) trend = 'slowing';
    }

    // Recent pace from last 3 responses
    let recentPace = 'normal';
    if (times.length >= 2) {
      const recent = times.slice(-3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (recentAvg < 3000) recentPace = 'fast';
      else if (recentAvg > this.config.slowResponseMs) recentPace = 'slow';
    }

    // Question signals — repeated questions indicate confusion
    const questions = windowEvents.filter(e => e.type === 'question');
    const confusionQuestions = questions.filter(e => e.category === 'confusion' || e.category === 'lesson_related');
    const questionConcepts = {};
    questions.forEach(q => {
      if (q.concept) {
        questionConcepts[q.concept] = (questionConcepts[q.concept] || 0) + 1;
      }
    });

    // Questions bias trend toward 'slowing' if frequent
    if (questions.length >= 3 && trend === 'engaged') trend = 'slowing';
    if (confusionQuestions.length >= 2 && trend === 'slowing') trend = 'disengaging';

    const signals = {
      slowResponses: slowCount,
      hesitations: hesitantCount,
      replays: replays.length,
      avgResponseTimeMs: Math.round(avgTime),
      trend,
      recentPace,
      totalResponses: responseTimes.length,
      // Question signals
      questionCount: questions.length,
      confusionCount: confusionQuestions.length,
      questionConcepts,  // { conceptId: count } — repeated concept questions
    };

    this._cache.engagement = signals;
    return signals;
  }

  // ============================================================
  // QUERYING — BREAKTHROUGHS
  // ============================================================

  /**
   * Get all breakthrough events in the current window.
   * @returns {Object[]} Array of { concept, momentId, ageMs }
   */
  getBreakthroughs() {
    if (this._cacheValid('breakthroughs')) return this._cache.breakthroughs;

    const now = Date.now();
    const breakthroughs = this._getWindowEvents()
      .filter(e => e.type === 'breakthrough')
      .map(e => ({
        concept: e.concept,
        momentId: e.momentId,
        ageMs: now - e.time,
        timestamp: e.time,
      }));

    this._cache.breakthroughs = breakthroughs;
    return breakthroughs;
  }

  /**
   * Check if a concept had a recent breakthrough.
   * @param {string} conceptId
   * @returns {boolean}
   */
  hadBreakthrough(conceptId) {
    return this.getBreakthroughs().some(b => b.concept === conceptId);
  }

  // ============================================================
  // QUERYING — COMPOSITE ANALYSIS
  // ============================================================

  /**
   * Get a full teaching context snapshot for the intelligence layer.
   * This is the primary method the intelligence layer calls when
   * assembling context for a Claude API call.
   *
   * @returns {Object} Complete memory snapshot
   */
  getTeachingSnapshot() {
    return {
      struggles: this.getStruggleConcepts(),
      weakestConcept: this.getWeakestConcept(),
      engagement: this.getEngagementSignals(),
      breakthroughs: this.getBreakthroughs(),
      recentMistakes: this._getRecentByType('mistake', 5),
      recentCorrect: this._getRecentByType('correct', 5),
      recentQuestions: this._getRecentByType('question', 5),
      eventCount: this._getWindowEvents().length,
      windowMinutes: this.config.windowMinutes,
      timestamp: Date.now(),
    };
  }

  /**
   * Determine if the student needs a strategy change based on
   * memory patterns. Returns a recommendation without calling Claude.
   *
   * @returns {Object|null} { recommendation, reason, concept, confidence }
   *   recommendation: 'switch_visual' | 'slow_pace' | 'reinforce' | 'celebrate' | null
   */
  getStrategyRecommendation() {
    const struggles = this.getStruggleConcepts().filter(s => !s.resolved);
    const engagement = this.getEngagementSignals();
    const breakthroughs = this.getBreakthroughs();

    // Priority 1: Student struggling AND disengaging → slow down
    if (struggles.length > 0 && engagement.trend === 'disengaging') {
      return {
        recommendation: 'slow_pace',
        reason: 'struggling_and_disengaging',
        concept: struggles[0].concept,
        confidence: 0.9,
      };
    }

    // Priority 2: Same concept failing repeatedly → switch teaching mode
    const heavyStruggle = struggles.find(s => s.mistakeCount >= 3);
    if (heavyStruggle) {
      return {
        recommendation: 'switch_visual',
        reason: 'repeated_concept_failure',
        concept: heavyStruggle.concept,
        confidence: 0.85,
      };
    }

    // Priority 3: Recent breakthrough → celebrate and reinforce
    if (breakthroughs.length > 0) {
      const latestBreakthrough = breakthroughs[breakthroughs.length - 1];
      if (latestBreakthrough.ageMs < 60000) { // within last minute
        return {
          recommendation: 'celebrate',
          reason: 'recent_breakthrough',
          concept: latestBreakthrough.concept,
          confidence: 0.8,
        };
      }
    }

    // Priority 4: Student slowing down → reinforce
    if (engagement.trend === 'slowing' && engagement.slowResponses >= 2) {
      return {
        recommendation: 'reinforce',
        reason: 'pace_slowing',
        concept: struggles.length > 0 ? struggles[0].concept : null,
        confidence: 0.7,
      };
    }

    return null;
  }

  // ============================================================
  // AUTO-BREAKTHROUGH DETECTION
  // ============================================================

  /**
   * Call this after every correct answer. Automatically detects
   * breakthroughs: correct answer on a concept that was previously
   * struggling.
   *
   * @param {string} conceptId
   * @param {string} momentId
   * @returns {boolean} true if a breakthrough was detected
   */
  checkAndRecordBreakthrough(conceptId, momentId) {
    if (this.isStrugglingWith(conceptId)) {
      this.recordBreakthrough(conceptId, momentId);
      return true;
    }
    return false;
  }

  // ============================================================
  // EXPORT FOR LONG-TERM MEMORY
  // ============================================================

  /**
   * Export a summary suitable for storing in Airtable after lesson ends.
   * This becomes the student's long-term memory for next lesson.
   *
   * @returns {Object} Compact summary for Airtable storage
   */
  exportForStorage() {
    const struggles = this.getStruggleConcepts();
    const engagement = this.getEngagementSignals();
    const breakthroughs = this.getBreakthroughs();

    return {
      exportedAt: Date.now(),
      totalEvents: this._events.length,
      conceptStruggles: struggles.map(s => ({
        concept: s.concept,
        mistakes: s.mistakeCount,
        resolved: s.resolved,
      })),
      breakthroughConcepts: breakthroughs.map(b => b.concept),
      engagementSummary: {
        avgResponseTimeMs: engagement.avgResponseTimeMs,
        trend: engagement.trend,
        replays: engagement.replays,
        pace: engagement.recentPace,
      },
      strategyRecommendation: this.getStrategyRecommendation(),
    };
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  /**
   * Get events within the rolling window.
   */
  _getWindowEvents() {
    const cutoff = Date.now() - this.windowMs;
    return this._events.filter(e => e.time >= cutoff);
  }

  /**
   * Get most recent N events of a given type.
   */
  _getRecentByType(type, n = 5) {
    return this._getWindowEvents()
      .filter(e => e.type === type)
      .slice(-n)
      .map(e => ({ ...e, ageMs: Date.now() - e.time }));
  }

  /**
   * Remove events outside the window + enforce max cap.
   */
  _cleanup() {
    const cutoff = Date.now() - this.windowMs;
    this._events = this._events.filter(e => e.time >= cutoff);

    // Hard cap
    if (this._events.length > this.config.maxEvents) {
      this._events = this._events.slice(-this.config.maxEvents);
    }
  }

  /**
   * Invalidate the query cache.
   */
  _invalidateCache() {
    this._cache.struggles = null;
    this._cache.engagement = null;
    this._cache.breakthroughs = null;
    this._cache.lastRebuilt = 0;
  }

  /**
   * Check if a cached query result is still valid.
   */
  _cacheValid(key) {
    return this._cache[key] !== null &&
           (Date.now() - this._cache.lastRebuilt) < this._cache.ttlMs;
  }

  /**
   * Reset all memory (for testing or lesson restart).
   */
  reset() {
    this._events = [];
    this._invalidateCache();
  }

  /**
   * Get raw event count (for debugging).
   */
  getEventCount() {
    return this._events.length;
  }

  /**
   * Get full event log (for debugging).
   */
  getEventLog() {
    return [...this._events];
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiMicroMemory };
} else if (typeof window !== 'undefined') {
  window.TAMiMicroMemory = TAMiMicroMemory;
}

export { TAMiMicroMemory };
