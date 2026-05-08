/**
 * ============================================================
 * T.A.M.i STRATEGY RESOLVER v1.0
 * ============================================================
 *
 * Deterministic teaching strategy engine. Decides how to adapt
 * the lesson based on micro-memory patterns and WYL learning
 * style — WITHOUT calling Claude.
 *
 * The strategy resolver sits between the intelligence layer
 * and the AI bridge. When a detection fires, the resolver
 * tries to handle it deterministically first. Only when the
 * resolver cannot produce a confident strategy does the system
 * escalate to Claude.
 *
 * This is what keeps Claude calls to 5-7 per lesson instead
 * of 15+.
 *
 * Includes the Adaptive Difficulty Ladder:
 *   The lesson's difficulty profile (beginner/intermediate/advanced)
 *   shifts in real-time based on mastery signals. The resolver
 *   recommends difficulty changes, and the orchestrator applies
 *   them to pacing, visual hints, and auto-advance delays.
 *
 * Architecture:
 *   Detection fires
 *       │
 *       ▼
 *   Strategy Resolver
 *       │
 *       ├── deterministic strategy found? → apply directly
 *       │
 *       └── no confident strategy? → escalate to Claude
 *
 * ============================================================
 */

class TAMiStrategyResolver {

  constructor(config = {}) {
    // ── Teaching profile manager (optional — injected after construction) ──
    this.profileManager = null;

    this.config = {
      // Difficulty ladder thresholds
      promoteThreshold: 0.80,       // accuracy above this → consider promoting
      demoteThreshold: 0.45,        // accuracy below this → consider demoting
      streakToPromote: 5,           // consecutive correct to trigger promotion
      wrongsTodemote: 3,            // consecutive wrong to trigger demotion
      minMomentsBeforeShift: 5,     // don't shift too early in the lesson

      // Strategy confidence thresholds
      highConfidence: 0.85,         // above this = apply deterministically
      mediumConfidence: 0.6,        // above this = apply but log for review
      lowConfidence: 0.4,           // below this = escalate to Claude

      ...config,
    };

    // ---- Difficulty levels (ordered) ----
    this.DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

    // ---- Strategy → Visual Asset mapping ----
    // Maps concept + learning style to the best visual component.
    // This is the deterministic "Teaching Strategy Engine."
    this._visualStrategies = {
      // Concept: C_KEYBOARD
      'C_KEYBOARD': {
        visual: ['numbered_keyboard', 'keyboard_middle_c', 'keyboard_middle_c_arrow'],
        auditory: ['numbered_keyboard'],          // Still show keyboard but with audio cues
        pattern: ['numbered_keyboard'],
        repetition: ['keyboard_middle_c'],
      },

      // Concept: C_HALFWHOLE
      'C_HALFWHOLE': {
        visual: ['half_step_demo', 'half_step_animated_arrows', 'whole_step_demo'],
        auditory: ['half_step_demo'],
        pattern: ['scale_pattern_overlay', 'half_step_demo'],
        repetition: ['half_step_demo'],
      },

      // Concept: C_MAJSCALE
      'C_MAJSCALE': {
        visual: ['scale_pattern_overlay', 'cmaj_full_walkthrough'],
        auditory: ['cmaj_full_walkthrough'],
        pattern: ['scale_pattern_overlay'],
        repetition: ['cmaj_full_walkthrough'],
      },

      // Concept: C_CMAJOR
      'C_CMAJOR': {
        visual: ['cmaj_ascending_labeled', 'cmaj_full_walkthrough'],
        auditory: ['cmaj_ascending_labeled'],
        pattern: ['cmaj_ascending_labeled', 'scale_pattern_overlay'],
        repetition: ['cmaj_full_walkthrough', 'cmaj_ascending_labeled'],
      },

      // Concept: C_FINGERS
      'C_FINGERS': {
        visual: ['finger_map_numbered', 'finger_map_with_keyboard', 'finger_map_ghost_overlay'],
        auditory: ['finger_map_numbered'],
        pattern: ['finger_map_with_keyboard'],
        repetition: ['finger_map_slowmo', 'finger_map_ghost_overlay'],
      },

      // Concept: C_OCTAVE
      'C_OCTAVE': {
        visual: ['numbered_keyboard'],            // Show full range
        auditory: ['numbered_keyboard'],
        pattern: ['numbered_keyboard'],
        repetition: ['numbered_keyboard'],
      },
    };

    // ---- Deterministic encouragement templates ----
    // Indexed by detection type + context. These avoid calling Claude
    // for common teaching moments.
    this._encouragementTemplates = {
      struggle: {
        default: "Let's take a different angle on this. Watch closely.",
        visual: "Let me show you a picture that might help.",
        auditory: "Listen to this pattern one more time.",
        pattern: "Look at the pattern — see if you can spot the rule.",
        repetition: "Let's walk through it together, step by step.",
      },
      engagement: {
        default: "Still with me? No rush — we'll get there.",
        early: "We just started — give yourself a moment to settle in.",
        midlesson: "You're doing well. Let's switch it up a bit.",
        late: "Almost done — let's finish strong.",
      },
      milestone: {
        flow_state: "You're in the zone! Keep it going.",
        mastery: "You've got this one locked in. Nice work!",
        breakthrough: "That clicked! I could tell the moment it happened.",
        perfect: "Flawless. That was exactly right.",
      },
    };
  }

  // ============================================================
  // PRIMARY RESOLUTION
  // ============================================================

  /**
   * Attempt to resolve a detection deterministically.
   *
   * @param {Object} detection - From intelligence layer
   * @param {Object} stateSnapshot - From state manager's getState()
   * @param {Object} memorySnapshot - From micro-memory's getTeachingSnapshot()
   * @returns {Object} {
   *   resolved: boolean,       - true if handled without AI
   *   strategy: Object|null,   - the strategy to apply (if resolved)
   *   confidence: number,      - how confident the resolver is (0-1)
   *   escalate: boolean,       - true if Claude should be called
   *   reason: string           - why this decision was made
   * }
   */
  resolve(detection, stateSnapshot, memorySnapshot) {
    if (!detection) {
      return { resolved: false, strategy: null, confidence: 0, escalate: false, reason: 'no_detection' };
    }

    switch (detection.detection) {
      case 'struggle':
        return this._resolveStruggle(detection, stateSnapshot, memorySnapshot);
      case 'engagement_drop':
        return this._resolveEngagement(detection, stateSnapshot, memorySnapshot);
      case 'milestone':
        return this._resolveMilestone(detection, stateSnapshot, memorySnapshot);
      case 'lesson_complete':
        // Always escalate to Claude for personalized summary
        return { resolved: false, strategy: null, confidence: 0, escalate: true, reason: 'summary_needs_personalization' };
      default:
        return { resolved: false, strategy: null, confidence: 0, escalate: false, reason: 'unknown_detection' };
    }
  }

  // ============================================================
  // STRUGGLE RESOLUTION
  // ============================================================

  _resolveStruggle(detection, state, memory) {
    // ── Profile-aware learning style selection ──
    // If a teaching profile is active, use its reinforcement bias
    // instead of (or in addition to) the raw WYL mode.
    const profileMode = this.profileManager?.getReinforcementMode?.() || null;
    const learningStyle = profileMode || state?.learningStyle?.reinforcementMode || 'pattern';
    const currentConcept = state?.currentMoment?.concepts?.[0] || null;
    const weakest = memory?.weakestConcept || null;
    const targetConcept = weakest?.concept || currentConcept;

    // ── Profile dialogue override ──
    // Check if the active profile has a specific struggle template
    const isRepeat = weakest && weakest.mistakeCount >= 2;
    const profileDialogue = this.profileManager?.getDialogue?.(isRepeat ? 'struggle_repeat' : 'struggle') || null;

    // ── Profile visual override ──
    // If the profile specifies a visual for the current ladder rung, prefer it
    const ladderRung = detection?.context?.ladderRung || 3;
    const profileVisual = this.profileManager?.getVisualForRung?.(ladderRung) || null;

    // Strategy 1: Switch visual for the struggling concept
    if (targetConcept && this._visualStrategies[targetConcept]) {
      const visuals = this._visualStrategies[targetConcept][learningStyle]
        || this._visualStrategies[targetConcept]['visual']
        || [];

      // Profile visual gets priority if it exists, otherwise use standard mapping
      const selectedVisual = profileVisual || visuals[0] || null;
      const allVisuals = profileVisual ? [profileVisual, ...visuals] : visuals;

      if (allVisuals.length > 0) {
        const encouragement = profileDialogue
          || this._encouragementTemplates.struggle[learningStyle]
          || this._encouragementTemplates.struggle.default;

        return {
          resolved: true,
          strategy: {
            type: 'visual_switch',
            action: 'dialogue_override',
            dialogue: encouragement,
            visualAsset: selectedVisual,
            alternateVisuals: allVisuals.slice(1),
            targetConcept,
            learningStyle,
            profileId: this.profileManager?.getActiveProfileId?.() || null,
            difficultyAdjustment: this._checkDemote(state, memory),
          },
          confidence: profileDialogue ? 0.9 : 0.85,  // higher confidence when profile-matched
          escalate: false,
          reason: `visual_switch_for_${targetConcept}_via_${learningStyle}${profileMode ? '_profile' : ''}`,
        };
      }
    }

    // Strategy 2: Difficulty demotion (no visual switch needed)
    const demote = this._checkDemote(state, memory);
    if (demote) {
      return {
        resolved: true,
        strategy: {
          type: 'difficulty_demote',
          action: 'encouragement_inject',
          dialogue: this._encouragementTemplates.struggle.default,
          difficultyAdjustment: demote,
        },
        confidence: 0.75,
        escalate: false,
        reason: 'difficulty_demotion',
      };
    }

    // Strategy 3: If the struggle is persistent (3+ mistakes same concept),
    // escalate to Claude for a creative rephrase
    if (weakest && weakest.mistakeCount >= 3) {
      return {
        resolved: false,
        strategy: null,
        confidence: 0.3,
        escalate: true,
        reason: 'persistent_struggle_needs_creative_response',
      };
    }

    // Default: use template encouragement
    return {
      resolved: true,
      strategy: {
        type: 'template_encouragement',
        action: 'encouragement_inject',
        dialogue: this._encouragementTemplates.struggle[learningStyle]
          || this._encouragementTemplates.struggle.default,
      },
      confidence: 0.65,
      escalate: false,
      reason: 'template_encouragement',
    };
  }

  // ============================================================
  // ENGAGEMENT RESOLUTION
  // ============================================================

  _resolveEngagement(detection, state, memory) {
    const momentsProcessed = state?.session?.momentsProcessed || 0;
    const engagement = memory?.engagement || {};

    // Determine lesson phase for template selection
    let phase = 'midlesson';
    if (momentsProcessed < 5) phase = 'early';
    else if (momentsProcessed > 20) phase = 'late';

    // ── Profile-aware engagement dialogue ──
    const profileDialogue = this.profileManager?.getDialogue?.('engagement_drop') || null;

    // Strategy 1: If student is disengaging AND struggling, slow pace
    if (engagement.trend === 'disengaging' && memory?.weakestConcept) {
      return {
        resolved: true,
        strategy: {
          type: 'pace_adjustment',
          action: 'encouragement_inject',
          dialogue: profileDialogue || this._encouragementTemplates.engagement[phase],
          paceAdjustment: 'slow',
          profileId: this.profileManager?.getActiveProfileId?.() || null,
          difficultyAdjustment: this._checkDemote(state, memory),
        },
        confidence: 0.80,
        escalate: false,
        reason: 'disengaging_with_struggle',
      };
    }

    // Strategy 2: Simple engagement drop (not struggling) — inject encouragement
    if (engagement.trend === 'slowing') {
      return {
        resolved: true,
        strategy: {
          type: 'gentle_prompt',
          action: 'encouragement_inject',
          dialogue: profileDialogue || this._encouragementTemplates.engagement[phase],
          profileId: this.profileManager?.getActiveProfileId?.() || null,
        },
        confidence: 0.75,
        escalate: false,
        reason: 'slowing_pace',
      };
    }

    // Strategy 3: Long inactivity — escalate to Claude for personalized re-engagement
    if (detection.reason === 'response_delay' && engagement.slowResponses >= 3) {
      return {
        resolved: false,
        strategy: null,
        confidence: 0.35,
        escalate: true,
        reason: 'extended_inactivity_needs_personalization',
      };
    }

    // Default template
    return {
      resolved: true,
      strategy: {
        type: 'template_encouragement',
        action: 'encouragement_inject',
        dialogue: this._encouragementTemplates.engagement.default,
      },
      confidence: 0.60,
      escalate: false,
      reason: 'default_engagement_template',
    };
  }

  // ============================================================
  // MILESTONE RESOLUTION
  // ============================================================

  _resolveMilestone(detection, state, memory) {
    const reasons = detection.reasons || [];

    // ── Profile-aware milestone dialogue ──
    const profileMastery = this.profileManager?.getDialogue?.('milestone_mastery') || null;
    const profileMilestone = this.profileManager?.getDialogue?.('milestone') || null;

    // Milestone with mastery → deterministic celebration
    if (reasons.includes('mastery_achieved')) {
      const concept = state?.currentMoment?.concepts?.[0] || 'this concept';
      return {
        resolved: true,
        strategy: {
          type: 'celebration',
          action: 'encouragement_inject',
          dialogue: profileMastery || this._encouragementTemplates.milestone.mastery,
          celebration: 'mastery_achieved',
          profileId: this.profileManager?.getActiveProfileId?.() || null,
          difficultyAdjustment: this._checkPromote(state, memory),
        },
        confidence: 0.90,
        escalate: false,
        reason: 'mastery_celebration',
      };
    }

    // Flow state → keep momentum, maybe promote difficulty
    if (reasons.includes('flow_state')) {
      const promote = this._checkPromote(state, memory);
      return {
        resolved: true,
        strategy: {
          type: 'flow_maintenance',
          action: 'encouragement_inject',
          dialogue: profileMilestone || this._encouragementTemplates.milestone.flow_state,
          celebration: promote ? 'level_up' : 'streak',
          profileId: this.profileManager?.getActiveProfileId?.() || null,
          difficultyAdjustment: promote,
        },
        confidence: 0.85,
        escalate: false,
        reason: promote ? 'flow_state_with_promotion' : 'flow_state_maintenance',
      };
    }

    // Breakthrough → always celebrate, sometimes escalate for personalization
    if (memory?.breakthroughs?.length > 0) {
      const recentBreakthrough = memory.breakthroughs[memory.breakthroughs.length - 1];
      if (recentBreakthrough.ageMs < 30000) {
        // Very recent breakthrough — deterministic celebration
        return {
          resolved: true,
          strategy: {
            type: 'breakthrough_celebration',
            action: 'encouragement_inject',
            dialogue: this._encouragementTemplates.milestone.breakthrough,
            celebration: 'breakthrough',
          },
          confidence: 0.90,
          escalate: false,
          reason: 'recent_breakthrough_celebration',
        };
      }
    }

    // Default milestone
    return {
      resolved: true,
      strategy: {
        type: 'template_celebration',
        action: 'encouragement_inject',
        dialogue: this._encouragementTemplates.milestone.flow_state,
        celebration: 'generic',
      },
      confidence: 0.70,
      escalate: false,
      reason: 'generic_milestone',
    };
  }

  // ============================================================
  // ADAPTIVE DIFFICULTY LADDER
  // ============================================================

  /**
   * Check if the student should be promoted to a harder difficulty.
   *
   * Triggers:
   *   - Sustained high accuracy (>80%)
   *   - Long correct streak (5+)
   *   - Multiple concepts mastered
   *
   * @returns {Object|null} Difficulty adjustment or null
   */
  _checkPromote(state, memory) {
    if (!state) return null;

    const momentsProcessed = state.session?.momentsProcessed || 0;
    if (momentsProcessed < this.config.minMomentsBeforeShift) return null;

    const performance = state.performance || {};
    const accuracy = performance.totalAttempts > 0
      ? performance.totalCorrect / performance.totalAttempts
      : 0;

    const shouldPromote =
      (accuracy >= this.config.promoteThreshold && performance.totalAttempts >= 5) ||
      (performance.correctStreak >= this.config.streakToPromote);

    if (!shouldPromote) return null;

    // Determine current and next level
    // (The orchestrator tracks the current difficulty; we just recommend)
    return {
      direction: 'promote',
      reason: accuracy >= this.config.promoteThreshold ? 'high_accuracy' : 'correct_streak',
      accuracy: Math.round(accuracy * 100),
      streak: performance.correctStreak,
      effects: {
        pacing: 'faster',
        visualHints: 'reduce',
        autoAdvanceDelay: 'shorter',
      },
    };
  }

  /**
   * Check if the student should be demoted to an easier difficulty.
   *
   * Triggers:
   *   - Sustained low accuracy (<45%)
   *   - Long wrong streak (3+)
   *   - Multiple concepts struggling
   *
   * @returns {Object|null} Difficulty adjustment or null
   */
  _checkDemote(state, memory) {
    if (!state) return null;

    const momentsProcessed = state.session?.momentsProcessed || 0;
    if (momentsProcessed < this.config.minMomentsBeforeShift) return null;

    const performance = state.performance || {};
    const accuracy = performance.totalAttempts > 0
      ? performance.totalCorrect / performance.totalAttempts
      : 1;  // default to 1 to avoid false demotions

    const strugglingCount = performance.strugglingConcepts?.length || 0;

    const shouldDemote =
      (accuracy <= this.config.demoteThreshold && performance.totalAttempts >= 4) ||
      (performance.wrongStreak >= this.config.wrongsTodemote) ||
      (strugglingCount >= 2);

    if (!shouldDemote) return null;

    return {
      direction: 'demote',
      reason: performance.wrongStreak >= this.config.wrongsTodemote
        ? 'wrong_streak'
        : accuracy <= this.config.demoteThreshold
          ? 'low_accuracy'
          : 'multiple_struggling_concepts',
      accuracy: Math.round(accuracy * 100),
      strugglingConcepts: performance.strugglingConcepts || [],
      effects: {
        pacing: 'slower',
        visualHints: 'increase',
        autoAdvanceDelay: 'longer',
        patternOverlay: true,
      },
    };
  }

  // ============================================================
  // VISUAL ASSET SELECTION
  // ============================================================

  /**
   * Get the best visual asset for a concept + learning style.
   * Used by the orchestrator when the strategy says "switch visual."
   *
   * @param {string} conceptId
   * @param {string} reinforcementMode - 'visual' | 'auditory' | 'pattern' | 'repetition'
   * @returns {string[]} Array of visual asset IDs, ordered by relevance
   */
  getVisualsForConcept(conceptId, reinforcementMode = 'visual') {
    const strategies = this._visualStrategies[conceptId];
    if (!strategies) return [];
    return strategies[reinforcementMode] || strategies['visual'] || [];
  }

  // ============================================================
  // TEMPLATE ACCESS
  // ============================================================

  /**
   * Get an encouragement message for a detection type.
   * @param {string} detectionType - 'struggle' | 'engagement' | 'milestone'
   * @param {string} subtype - The specific variant
   * @returns {string}
   */
  getEncouragement(detectionType, subtype = 'default') {
    const templates = this._encouragementTemplates[detectionType];
    if (!templates) return "You're doing great — keep going!";
    return templates[subtype] || templates['default'] || "You're doing great — keep going!";
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Analyze how many detections were resolved deterministically
   * vs escalated to Claude. Useful for tuning.
   *
   * @param {Object[]} resolutionLog - Array of resolve() results
   * @returns {Object} { total, resolved, escalated, avgConfidence }
   */
  static analyzeResolutions(resolutionLog) {
    if (!resolutionLog.length) return { total: 0, resolved: 0, escalated: 0, avgConfidence: 0 };

    const resolved = resolutionLog.filter(r => r.resolved).length;
    const escalated = resolutionLog.filter(r => r.escalate).length;
    const avgConf = resolutionLog.reduce((sum, r) => sum + r.confidence, 0) / resolutionLog.length;

    return {
      total: resolutionLog.length,
      resolved,
      escalated,
      resolutionRate: Math.round((resolved / resolutionLog.length) * 100),
      avgConfidence: Math.round(avgConf * 100),
    };
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiStrategyResolver };
} else if (typeof window !== 'undefined') {
  window.TAMiStrategyResolver = TAMiStrategyResolver;
}

export { TAMiStrategyResolver };
