/**
 * ============================================================
 * T.A.M.i TEACHING STRATEGY PROFILES
 * ============================================================
 *
 * Named teaching personalities that control HOW Motesart teaches.
 * The Difficulty Ladder controls WHAT difficulty level, while
 * profiles control the teaching style — dialogue tone, visual
 * preference, pacing bias, and encouragement patterns.
 *
 * Profile Selection:
 *   1. Student's WYL (Way You Learn) sets the initial profile
 *   2. Engagement signals trigger dynamic profile switches
 *   3. Ladder rung adjustments can override the active profile
 *   4. The resolver queries the active profile to select actions
 *
 * Each profile defines:
 *   - name: Display label
 *   - personality: Teaching tone descriptor
 *   - reinforcementBias: Which WYL modes this profile emphasizes
 *   - visualPriority: How visuals are selected per rung
 *   - dialogueTemplates: Tone-specific overrides by situation
 *   - pacingBias: Timing offset multiplier (< 1 = faster, > 1 = slower)
 *   - escalationThreshold: When to call Claude (lower = more often)
 *
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════════
// PROFILE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TEACHING_PROFILES = {

  warm_encourager: {
    name: 'Warm Encourager',
    personality: 'Patient, supportive, affirming',
    description: 'Takes extra time, uses visuals heavily, celebrates small wins',

    // WYL emphasis — this profile leans visual + kinesthetic
    reinforcementBias: {
      primary: 'visual',
      secondary: 'kinesthetic',
    },

    // Which visuals to prefer at each ladder rung
    visualPriority: {
      1: 'finger_map_ghost_overlay',    // foundational: hand position overlay
      2: 'finger_map_with_keyboard',     // struggling: combined view
      3: 'numbered_keyboard',            // learning: standard keyboard
      4: 'scale_pattern_overlay',        // confident: pattern focus
      5: null,                           // challenge: no extra visual
    },

    // Dialogue overrides (keyed by situation)
    dialogueTemplates: {
      struggle: "No rush at all. Let's look at this a different way — I'll show you.",
      struggle_repeat: "Everyone needs a few tries. Let me walk you through it slowly.",
      engagement_drop: "Take a breath. You're doing better than you think.",
      milestone: "Look at that! You really got it. I'm proud of you.",
      milestone_mastery: "You've completely mastered this. That's incredible!",
      question_response: "Great question! Let me show you.",
      confusion: "That's totally okay. Let me explain it from scratch.",
      transition: "Nice work on that section. Ready for the next part?",
      challenge: "I think you're ready for something a bit harder. Let's try it.",
    },

    // Pacing: > 1.0 means slower (more time to absorb)
    pacingBias: 1.3,

    // Lower = escalates to Claude more readily (for personalized warmth)
    escalationThreshold: 0.5,

    // When to auto-switch AWAY from this profile
    switchAwayWhen: {
      rung_gte: 5,              // too advanced for warm encourager
      streak_gte: 6,             // student is crushing it
      engagement: 'engaged',     // only if they're fully engaged
    },
  },

  concise_direct: {
    name: 'Concise Direct',
    personality: 'Minimal, efficient, fast-paced',
    description: 'Brief explanations, fewer visuals, faster progression',

    reinforcementBias: {
      primary: 'readwrite',
      secondary: 'pattern',
    },

    visualPriority: {
      1: 'numbered_keyboard',
      2: 'scale_pattern_overlay',
      3: null,                           // learning: text-only at this point
      4: null,
      5: null,
    },

    dialogueTemplates: {
      struggle: "Let's try that again. Focus on the pattern.",
      struggle_repeat: "Different approach — watch the keys.",
      engagement_drop: "Quick check-in. Ready to keep going?",
      milestone: "Got it. Next.",
      milestone_mastery: "Mastered. Moving on.",
      question_response: "Good question. Here's the answer.",
      confusion: "Let me clarify quickly.",
      transition: "Next concept.",
      challenge: "Let's test your speed on this.",
    },

    pacingBias: 0.7,
    escalationThreshold: 0.3,

    switchAwayWhen: {
      rung_lte: 1,               // too foundational for direct approach
      confusion_gte: 2,          // student needs more support
      engagement: 'disengaging',
    },
  },

  kinesthetic_coach: {
    name: 'Kinesthetic Coach',
    personality: 'Active, hands-on, repetition-focused',
    description: 'Emphasizes finger placement, repetition, physical memory',

    reinforcementBias: {
      primary: 'kinesthetic',
      secondary: 'visual',
    },

    visualPriority: {
      1: 'finger_map_slowmo',
      2: 'finger_map_ghost_overlay',
      3: 'finger_map_with_keyboard',
      4: 'finger_map_numbered',
      5: null,
    },

    dialogueTemplates: {
      struggle: "Let's do it with your hands. Find the keys — I'll guide you.",
      struggle_repeat: "Muscle memory takes practice. Let's repeat that section.",
      engagement_drop: "Time to move your fingers. Play along with me.",
      milestone: "Your fingers are getting faster! Feel that?",
      milestone_mastery: "You're playing without looking. That's real progress.",
      question_response: "Good — now try it on the keys.",
      confusion: "Don't think about it — just place your fingers here.",
      transition: "Let's put those fingers to work on something new.",
      challenge: "Speed round. How fast can you play the scale?",
    },

    pacingBias: 1.1,
    escalationThreshold: 0.45,

    switchAwayWhen: {
      rung_gte: 5,
      engagement: 'disengaging',
    },
  },

  auditory_mentor: {
    name: 'Auditory Mentor',
    personality: 'Musical, rhythm-focused, ear training',
    description: 'Emphasizes sound patterns, plays sequences, musical context',

    reinforcementBias: {
      primary: 'auditory',
      secondary: 'pattern',
    },

    visualPriority: {
      1: 'numbered_keyboard',
      2: 'half_step_demo',
      3: 'cmaj_ascending_labeled',
      4: 'scale_pattern_overlay',
      5: null,
    },

    dialogueTemplates: {
      struggle: "Listen to the notes. Hear how they step up?",
      struggle_repeat: "Let me play it again — listen for the pattern.",
      engagement_drop: "Let's hear some music. Listen to this scale.",
      milestone: "Hear that? You nailed the sound. Beautiful.",
      milestone_mastery: "Your ear is incredible. You can hear the pattern now.",
      question_response: "Let's answer that with sound.",
      confusion: "Close your eyes and just listen.",
      transition: "New sounds coming up — keep your ears open.",
      challenge: "Can you play it back from memory? Let's find out.",
    },

    pacingBias: 1.0,
    escalationThreshold: 0.4,

    switchAwayWhen: {
      rung_lte: 1,
      confusion_gte: 3,
    },
  },
}


// ═══════════════════════════════════════════════════════════════
// PROFILE MANAGER
// ═══════════════════════════════════════════════════════════════

class TAMiProfileManager {

  constructor(config = {}) {
    this.config = {
      defaultProfile: 'warm_encourager',
      allowAutoSwitch: true,
      switchCooldownMs: 30000,   // min 30s between auto-switches
      ...config,
    }

    this._activeProfile = null
    this._profileHistory = []
    this._lastSwitchTime = 0
    this._overrideProfile = null  // manual override (from teacher/admin)
  }

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════

  /**
   * Set initial profile based on student's WYL learning style.
   * @param {Object} wylProfile - { visual, auditory, readwrite, kinesthetic }
   */
  initFromWYL(wylProfile) {
    if (!wylProfile) {
      this._setProfile(this.config.defaultProfile, 'default')
      return
    }

    // Find the dominant WYL mode
    const modes = [
      { mode: 'visual', score: wylProfile.visual || 0 },
      { mode: 'auditory', score: wylProfile.auditory || 0 },
      { mode: 'readwrite', score: wylProfile.readwrite || 0 },
      { mode: 'kinesthetic', score: wylProfile.kinesthetic || 0 },
    ]
    modes.sort((a, b) => b.score - a.score)
    const dominant = modes[0].mode

    // Map WYL dominant → profile
    const wylToProfile = {
      visual: 'warm_encourager',
      auditory: 'auditory_mentor',
      readwrite: 'concise_direct',
      kinesthetic: 'kinesthetic_coach',
    }

    this._setProfile(wylToProfile[dominant] || this.config.defaultProfile, `wyl_${dominant}`)
  }

  // ════════════════════════════════════════════════════════════
  // DYNAMIC SWITCHING
  // ════════════════════════════════════════════════════════════

  /**
   * Evaluate whether to switch profiles based on current signals.
   *
   * @param {Object} params
   * @param {number} params.rung - Current difficulty ladder rung
   * @param {string} params.engagement - 'engaged' | 'slowing' | 'disengaging'
   * @param {number} params.confusionCount - Confusion signals in window
   * @param {number} params.streak - Current correct streak
   * @param {number} params.confidence - Average confidence (0-100)
   * @param {string} params.lastOutcome - 'correct' | 'wrong' | 'timeout'
   *
   * @returns {Object|null} { switched, from, to, reason } or null if no switch
   */
  evaluateSwitch(params) {
    if (!this.config.allowAutoSwitch) return null
    if (this._overrideProfile) return null

    // Cooldown check
    if (Date.now() - this._lastSwitchTime < this.config.switchCooldownMs) return null

    const current = this.getActiveProfile()
    if (!current) return null

    const { rung, engagement, confusionCount, streak, confidence } = params
    const sw = current.switchAwayWhen || {}

    let shouldSwitch = false
    let reason = ''

    // Check current profile's switchAway conditions
    if (sw.rung_gte && rung >= sw.rung_gte) {
      shouldSwitch = true
      reason = `rung_${rung}_exceeds_${sw.rung_gte}`
    }
    if (sw.rung_lte && rung <= sw.rung_lte) {
      shouldSwitch = true
      reason = `rung_${rung}_below_${sw.rung_lte}`
    }
    if (sw.confusion_gte && confusionCount >= sw.confusion_gte) {
      shouldSwitch = true
      reason = `confusion_${confusionCount}_exceeds_${sw.confusion_gte}`
    }
    if (sw.streak_gte && streak >= sw.streak_gte && sw.engagement === engagement) {
      shouldSwitch = true
      reason = `streak_${streak}_with_${engagement}`
    }
    if (sw.engagement === engagement && !sw.streak_gte && !sw.rung_gte) {
      shouldSwitch = true
      reason = `engagement_${engagement}`
    }

    if (!shouldSwitch) return null

    // Pick the best replacement profile
    const newProfileId = this._selectReplacement(params)
    if (!newProfileId || newProfileId === this._activeProfile) return null

    const oldId = this._activeProfile
    this._setProfile(newProfileId, reason)

    return {
      switched: true,
      from: oldId,
      to: newProfileId,
      reason,
    }
  }

  /**
   * Select the best replacement profile based on current conditions.
   */
  _selectReplacement(params) {
    const { rung, engagement, confusionCount, confidence } = params

    // Student struggling + confused → warm encourager
    if (rung <= 2 || confusionCount >= 2 || engagement === 'disengaging') {
      return 'warm_encourager'
    }

    // Student excelling + engaged → concise direct
    if (rung >= 4 && engagement === 'engaged' && confidence >= 70) {
      return 'concise_direct'
    }

    // Mid-range → kinesthetic coach (hands-on helps mid-learners)
    if (rung === 3 && engagement === 'slowing') {
      return 'kinesthetic_coach'
    }

    // Disengaging at any level → auditory mentor (sound pulls attention)
    if (engagement === 'disengaging') {
      return 'auditory_mentor'
    }

    return null
  }

  // ════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════

  /** Get the full active profile object */
  getActiveProfile() {
    const id = this._overrideProfile || this._activeProfile
    return TEACHING_PROFILES[id] || TEACHING_PROFILES[this.config.defaultProfile] || null
  }

  /** Get the active profile ID */
  getActiveProfileId() {
    return this._overrideProfile || this._activeProfile || this.config.defaultProfile
  }

  /** Get dialogue for a situation, falling back to profile defaults */
  getDialogue(situation) {
    const profile = this.getActiveProfile()
    if (!profile) return null
    return profile.dialogueTemplates[situation] || null
  }

  /** Get visual priority for the current rung */
  getVisualForRung(rung) {
    const profile = this.getActiveProfile()
    if (!profile) return null
    return profile.visualPriority[rung] || null
  }

  /** Get reinforcement bias (primary WYL mode this profile emphasizes) */
  getReinforcementMode() {
    const profile = this.getActiveProfile()
    return profile?.reinforcementBias?.primary || 'visual'
  }

  /** Get pacing multiplier */
  getPacingBias() {
    const profile = this.getActiveProfile()
    return profile?.pacingBias || 1.0
  }

  /** Get escalation threshold */
  getEscalationThreshold() {
    const profile = this.getActiveProfile()
    return profile?.escalationThreshold || 0.4
  }

  /** Get profile switch history */
  getHistory() {
    return [...this._profileHistory]
  }

  /** Get snapshot for telemetry */
  getSnapshot() {
    const profile = this.getActiveProfile()
    return {
      activeProfileId: this.getActiveProfileId(),
      activeProfileName: profile?.name || 'Unknown',
      personality: profile?.personality || '',
      pacingBias: profile?.pacingBias || 1.0,
      reinforcementMode: this.getReinforcementMode(),
      switchCount: this._profileHistory.length,
      lastSwitch: this._profileHistory[this._profileHistory.length - 1] || null,
      override: this._overrideProfile,
    }
  }

  // ════════════════════════════════════════════════════════════
  // MANUAL OVERRIDE
  // ════════════════════════════════════════════════════════════

  /** Set a manual profile override (e.g., from teacher dashboard) */
  setOverride(profileId) {
    if (TEACHING_PROFILES[profileId]) {
      this._overrideProfile = profileId
      this._profileHistory.push({
        from: this._activeProfile,
        to: profileId,
        reason: 'manual_override',
        time: Date.now(),
      })
    }
  }

  /** Clear manual override, return to auto-selected profile */
  clearOverride() {
    this._overrideProfile = null
  }

  // ════════════════════════════════════════════════════════════
  // INTERNAL
  // ════════════════════════════════════════════════════════════

  _setProfile(profileId, reason) {
    const oldId = this._activeProfile
    this._activeProfile = profileId
    this._lastSwitchTime = Date.now()

    if (oldId && oldId !== profileId) {
      this._profileHistory.push({
        from: oldId,
        to: profileId,
        reason,
        time: Date.now(),
      })
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiProfileManager, TEACHING_PROFILES }
}
if (typeof window !== 'undefined') {
  window.TAMiProfileManager = TAMiProfileManager
  window.TEACHING_PROFILES = TEACHING_PROFILES
}
export { TAMiProfileManager, TEACHING_PROFILES }
