/**
 * ============================================================
 * PERCEPTION → CONCEPT_STATE ADAPTER v2.0
 * ============================================================
 *
 * The only place perception modifies Concept_State.
 *
 * Input:  Perception packets (from Layer C — Interpretation)
 * Output: Allowed state writes to Concept_State fields
 *
 * This adapter enforces the State Write Contract
 * (sensing_perception_stack_spec.md, Section XXIII).
 *
 * ALLOWED WRITES:
 *   mistake_pattern, trend, confidence, recommended_strategy,
 *   next_action, evidence_summary, feel_mode_history
 *
 * PROTECTED (never written):
 *   curriculum order, pilot scope, mastery thresholds,
 *   registry definitions, teacher-facing concept names,
 *   ownership state definitions, feel mode stage definitions,
 *   diatonic chord map
 *
 * Governed by: sensing_perception_stack_spec.md
 * Reads from: perception_thresholds.json, perception_tags.json
 *
 * MODULE FORMAT: ES module (import/export) for Motesart-frontend repo.
 * Dual export at bottom for backward compatibility.
 * ============================================================
 */

import THRESHOLDS from './perception_thresholds.json';
import TAGS_CONFIG from './perception_tags.json';

// ============================================================
// METRIC NORMALIZATION LAYER (FIX #1)
// ============================================================
// Raw perception values (cents_offset, onset_offset_ms, etc.)
// MUST be converted to 0-1 quality scores before aggregation.
// The normalization rules come from perception_thresholds.json.

/**
 * Normalize an offset-based metric (cents_offset, onset_offset_ms, entry_after_rest_ms).
 * Returns 1.0 if within pass range, linear decay to 0.0 at fail boundary.
 *
 * @param {number} rawValue - The raw metric value
 * @param {Object} thresholdDef - { pass: {min, max}, fail_outside: number }
 * @returns {number} 0.0–1.0 quality score
 */
function normalizeOffset(rawValue, thresholdDef) {
  const absVal = Math.abs(rawValue);
  const passLimit = Math.abs(thresholdDef.pass.max);  // symmetric
  const failLimit = thresholdDef.fail_outside;

  if (absVal <= passLimit) return 1.0;
  if (absVal >= failLimit) return 0.0;
  // Linear decay between pass and fail
  return 1.0 - ((absVal - passLimit) / (failLimit - passLimit));
}

/**
 * Normalize a floor-based metric (pitch_stability, time_in_tune, etc.).
 * Returns 1.0 if at or above pass.min, 0.0 at or below fail_below.
 *
 * @param {number} rawValue - The raw metric value (already 0-1)
 * @param {Object} thresholdDef - { pass: {min}, fail_below: number }
 * @returns {number} 0.0–1.0 quality score
 */
function normalizeFloor(rawValue, thresholdDef) {
  if (rawValue >= thresholdDef.pass.min) return 1.0;
  if (rawValue <= thresholdDef.fail_below) return 0.0;
  return (rawValue - thresholdDef.fail_below) / (thresholdDef.pass.min - thresholdDef.fail_below);
}

/**
 * Normalize a boolean metric (rest_obeyed, correct_note).
 * @param {*} rawValue - truthy/falsy
 * @returns {number} 1.0 or 0.0
 */
function normalizeBoolean(rawValue) {
  return rawValue ? 1.0 : 0.0;
}

/**
 * METRIC NORMALIZATION DISPATCH TABLE
 * Maps metric_name → normalization function using threshold definitions.
 */
const NORMALIZERS = {
  // Pitch engine
  cents_offset:       (v) => normalizeOffset(v, THRESHOLDS.pitch.cents_offset),
  pitch_stability:    (v) => normalizeFloor(v, THRESHOLDS.pitch.pitch_stability),
  time_in_tune:       (v) => normalizeFloor(v, THRESHOLDS.pitch.time_in_tune),

  // Timing engine
  onset_offset_ms:    (v) => normalizeOffset(v, THRESHOLDS.timing.onset_offset_ms),
  duration_accuracy:  (v) => normalizeFloor(v, THRESHOLDS.timing.duration_accuracy),
  pulse_stability:    (v) => normalizeFloor(v, THRESHOLDS.timing.pulse_stability),
  subdivision_accuracy: (v) => normalizeFloor(v, THRESHOLDS.timing.subdivision_accuracy),

  // Silence engine
  rest_obeyed:              (v) => normalizeBoolean(v),
  rest_duration_accuracy:   (v) => normalizeFloor(v, THRESHOLDS.silence.rest_duration_accuracy),
  entry_after_rest_ms:      (v) => normalizeOffset(v, THRESHOLDS.silence.entry_after_rest_ms),
  release_cleanliness:      (v) => normalizeFloor(v, THRESHOLDS.silence.release_cleanliness),

  // Note event engine
  correct:                  (v) => normalizeBoolean(v),
  velocity_variance:        (v) => {
    const t = THRESHOLDS.note_event.velocity_variance;
    if (v <= t.pass.max) return 1.0;
    if (v >= t.fail_above) return 0.0;
    return 1.0 - ((v - t.pass.max) / (t.fail_above - t.pass.max));
  },
};

/**
 * Normalize a single packet's value into a 0-1 quality score.
 * If no normalizer exists for the metric, passes through as-is
 * (assumes value is already 0-1).
 *
 * @param {Object} packet - Perception packet with metric_name and value
 * @returns {number} Normalized 0.0–1.0 quality score
 */
function normalizePacketValue(packet) {
  const fn = NORMALIZERS[packet.metric_name];
  if (fn && typeof packet.value === 'number') {
    return fn(packet.value);
  }
  if (typeof packet.value === 'boolean') {
    return packet.value ? 1.0 : 0.0;
  }
  // Already a 0-1 score or unknown metric — pass through
  return typeof packet.value === 'number' ? packet.value : 0;
}


// ============================================================
// CONFIDENCE SCALE BRIDGE
// ============================================================
// tami_state_manager.js uses 0-100 confidence.
// This adapter works in 0-1. These helpers convert at the boundary.

function confidenceIn(value) {
  if (typeof value !== 'number') return 0;
  return value > 1 ? value / 100 : value;
}

function confidenceOut100(value) {
  return Math.round((value || 0) * 100);
}


// ============================================================
// CONFIDENCE GATE
// ============================================================

const CONFIDENCE_GATE = {
  solo: THRESHOLDS.confidence_gate.default,       // 0.50
  classroom: THRESHOLDS.confidence_gate.classroom_mode,  // 0.65
};

/**
 * Gate a perception packet. Returns true if the packet
 * should be forwarded to the decision layer.
 */
function passesConfidenceGate(packet, sessionMode = 'solo') {
  const gate = CONFIDENCE_GATE[sessionMode] || CONFIDENCE_GATE.solo;
  return packet.confidence >= gate;
}


// ============================================================
// CONFIDENCE PROVENANCE
// ============================================================

/**
 * Compute packet confidence from signal factors.
 * See spec Section XXV for the formula.
 *
 * @param {Object} factors
 * @param {number} factors.baseSignalQuality  - 0.0–1.0
 * @param {number} factors.calibrationFactor  - 0.7–1.0
 * @param {number} factors.durationFactor     - 0.5–1.0
 * @param {number} factors.noisePenalty       - 0.5–1.0
 * @param {number} factors.sourceBonus        - 1.0 or 1.15
 * @returns {number} confidence 0.0–1.0 (capped at 1.0)
 */
function computeConfidence({
  baseSignalQuality = 0.5,
  calibrationFactor = 1.0,
  durationFactor = 1.0,
  noisePenalty = 1.0,
  sourceBonus = 1.0,
} = {}) {
  const raw = baseSignalQuality * calibrationFactor * durationFactor * noisePenalty * sourceBonus;
  return Math.min(1.0, Math.max(0.0, raw));
}


// ============================================================
// SESSION AGGREGATION
// ============================================================

/**
 * Aggregate an array of perception packets into session scores.
 * See spec Section XIII.
 *
 * All raw metric values are NORMALIZED to 0-1 quality scores
 * before averaging. The normalization rules are defined by
 * perception_thresholds.json and the NORMALIZERS dispatch table.
 *
 * @param {Array} packets - Array of perception packets from one session
 * @param {string} sessionMode - 'solo' or 'classroom' (FIX #2)
 * @returns {Object} Session aggregation object
 */
function aggregateSession(packets, sessionMode = 'solo') {
  const gate = CONFIDENCE_GATE[sessionMode] || CONFIDENCE_GATE.solo;
  const validPackets = packets.filter(p => p.confidence >= gate);

  const bySource = {
    pitch_engine: [],
    timing_engine: [],
    silence_engine: [],
    note_event_engine: [],
    engagement_module: [],
    mechanics_module: [],
    midi_module: [],
  };

  for (const p of validPackets) {
    if (bySource[p.source]) {
      bySource[p.source].push(p);
    }
  }

  // Session scores — all computed from NORMALIZED 0-1 quality values
  const sessionPitchScore = normalizedMeanScore(bySource.pitch_engine);
  const sessionTimingScore = normalizedMeanScore(bySource.timing_engine);
  const sessionSilenceScore = normalizedMeanScore(bySource.silence_engine);
  const sessionStabilityScore = weightedMean([
    { value: normalizedPitchStability(bySource.pitch_engine), weight: 0.33 },
    { value: normalizedPulseStability(bySource.timing_engine), weight: 0.33 },
    { value: normalizedReleaseScore(bySource.silence_engine), weight: 0.34 },
  ]);

  // Tag analysis
  const tagCounts = {};
  for (const p of validPackets) {
    if (p.recommended_interpretation) {
      const tag = p.recommended_interpretation;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const dominantErrorPattern = findDominantError(sortedTags);
  const bestRecoveryPattern = findBestRecovery(validPackets);

  return {
    session_pitch_score: round(sessionPitchScore),
    session_timing_score: round(sessionTimingScore),
    session_silence_score: round(sessionSilenceScore),
    session_stability_score: round(sessionStabilityScore),
    dominant_error_pattern: dominantErrorPattern,
    best_recovery_pattern: bestRecoveryPattern,
    total_events: validPackets.length,
    pass_rate: round(computePassRate(validPackets)),
    perception_confidence: round(meanConfidence(validPackets)),
    tag_counts: tagCounts,
    session_mode: sessionMode,
  };
}


// ============================================================
// CONCEPT_STATE WRITE ADAPTER
// ============================================================

// Protected fields — adapter will reject writes to these
const PROTECTED_FIELDS = new Set([
  'curriculum_order',
  'pilot_scope',
  'mastery_threshold',
  'registry_definition',
  'concept_name',
  'ownership_state_definition',
  'feel_mode_definition',
  'diatonic_chord_map',
]);

// Allowed write fields — the State Write Contract (spec Section XXIII)
const ALLOWED_WRITE_FIELDS = new Set([
  'mistake_pattern', 'trend', 'confidence', 'confidence_display',
  'recommended_strategy', 'next_action', 'evidence_summary',
  'feel_mode_history', 'attempts', 'perception_events',
  'last_attempt_date', 'mastery_ready', 'ownership_confirmed',
  '_rolling_avg', '_rolling_history', '_write_audit',
]);

/**
 * FIX #4: Enforce State Write Contract.
 * Throws in dev/test, logs violation in prod.
 *
 * @param {string} fieldName - Field being written
 * @throws {Error} In non-production environments if field is protected
 */
function assertAllowedWrite(fieldName) {
  if (PROTECTED_FIELDS.has(fieldName)) {
    const msg = `PERCEPTION WRITE VIOLATION: attempted write to protected field "${fieldName}"`;
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      console.error(`[AUDIT] ${msg}`);
      return false;
    }
    throw new Error(msg);
  }
  if (!ALLOWED_WRITE_FIELDS.has(fieldName)) {
    const msg = `PERCEPTION WRITE WARNING: field "${fieldName}" not in allowed write list`;
    console.warn(`[AUDIT] ${msg}`);
  }
  return true;
}

/**
 * Apply session perception results to a Concept_State object.
 * This is the ONLY entry point for perception → state writes.
 *
 * Enforces the State Write Contract (spec Section XXIII).
 * All writes pass through assertAllowedWrite().
 *
 * CONFIDENCE BRIDGE: Accepts 0-100 OR 0-1 confidence from
 * tami_state_manager.js. Internally works 0-1. Returns both
 * state.confidence (0-1) and state.confidence_0_100 (0-100).
 *
 * @param {Object} currentState - Current Concept_State for this concept
 * @param {Object} sessionAggregation - Output of aggregateSession()
 * @param {Object} options
 * @param {string} options.conceptId - The concept being updated
 * @param {string} options.sessionMode - 'solo' or 'classroom'
 * @param {Array}  options.rawPackets - Original packets (for positive feedback)
 * @returns {Object} Updated Concept_State (new object, does not mutate input)
 */
function applyPerceptionToState(currentState, sessionAggregation, options = {}) {
  // Confidence bridge: normalize incoming 0-100 → 0-1
  const normalized = { ...currentState };
  if (normalized.confidence > 1) {
    normalized.confidence = confidenceIn(normalized.confidence);
  }

  const state = { ...normalized };
  const agg = sessionAggregation;
  const ema = THRESHOLDS.session_aggregation;
  const audit = [];  // Write audit trail

  function safeWrite(field, value) {
    assertAllowedWrite(field);
    state[field] = value;
    audit.push({ field, timestamp: new Date().toISOString() });
  }

  // 1. Confidence — EMA blend (0.3 new / 0.7 existing)
  if (typeof agg.session_pitch_score === 'number') {
    const compositeScore = weightedMean([
      { value: agg.session_pitch_score, weight: 0.35 },
      { value: agg.session_timing_score, weight: 0.30 },
      { value: agg.session_silence_score, weight: 0.15 },
      { value: agg.session_stability_score, weight: 0.20 },
    ]);
    const existingConfidence = state.confidence || 0;
    let newConfidence = round(
      ema.ema_weight_new * compositeScore + ema.ema_weight_existing * existingConfidence
    );

    // Wire positive feedback into main pipe
    if (options.rawPackets && options.rawPackets.length > 0) {
      const boostedConfidence = applyPositiveFeedback({ confidence: newConfidence }, options.rawPackets);
      newConfidence = round(boostedConfidence);
    }

    safeWrite('confidence', newConfidence);
    safeWrite('confidence_display', `${Math.round(newConfidence * 100)}%`);
  }

  // 2. Trend — compare session vs PERSISTED rolling average
  const rollingHistory = state._rolling_history || [];
  const currentConfidence = state.confidence || 0;
  const updatedHistory = [...rollingHistory, currentConfidence].slice(-3);
  safeWrite('_rolling_history', updatedHistory);
  const rollingAvg = updatedHistory.length > 0
    ? updatedHistory.reduce((a, b) => a + b, 0) / updatedHistory.length
    : currentConfidence;
  safeWrite('_rolling_avg', round(rollingAvg));

  const delta = currentConfidence - rollingAvg;
  if (delta >= ema.trend_improving_delta) {
    safeWrite('trend', 'improving');
  } else if (delta <= ema.trend_declining_delta) {
    safeWrite('trend', 'declining');
  } else {
    safeWrite('trend', 'stable');
  }

  // 3. Mistake pattern — update with dominant error
  if (agg.dominant_error_pattern) {
    safeWrite('mistake_pattern', agg.dominant_error_pattern);
  }

  // 4. Recommended strategy — based on dominant tags
  safeWrite('recommended_strategy', deriveStrategy(agg));

  // 5. Next action — based on state + perception
  safeWrite('next_action', deriveNextAction(state, agg, options));

  // 6. Evidence summary — STORED, not derived at read-time
  safeWrite('evidence_summary', generateStoredEvidenceSummary(state, agg));

  // 7. FIX #3: Separate concept attempts from perception events
  safeWrite('attempts', (currentState.attempts || 0) + 1);
  safeWrite('perception_events', (currentState.perception_events || 0) + (agg.total_events || 0));

  // 8. Last attempt date
  safeWrite('last_attempt_date', new Date().toISOString());

  // 9. Separate mastery_ready (soft flag) from ownership_confirmed (hard)
  safeWrite('mastery_ready', (
    (state.confidence || 0) >= THRESHOLDS.ownership_evidence_pack.perception_confidence_min &&
    (state.attempts || 0) >= THRESHOLDS.ownership_evidence_pack.min_attempts &&
    (state.ownership_status === 'accurate_without_support' || state.ownership_status === 'owned')
  ));

  // 10. Write audit trail
  safeWrite('_write_audit', audit);

  // Confidence bridge: also provide 0-100 for tami_state_manager consumers
  state.confidence_0_100 = confidenceOut100(state.confidence);

  return state;
}


// ============================================================
// EVIDENCE SUMMARY — STORED FIELD
// ============================================================

function generateStoredEvidenceSummary(state, sessionAggregation = null) {
  const status = state.ownership_status || state.status || 'introduced';
  const confidence = state.confidence_display || `${Math.round((state.confidence || 0) * 100)}%`;
  const trend = state.trend || 'stable';
  const pattern = state.mistake_pattern || 'no pattern';
  const nextAction = state.next_action || 'continue current';

  if (sessionAggregation && typeof sessionAggregation.session_pitch_score === 'number') {
    const pitch = `${Math.round(sessionAggregation.session_pitch_score * 100)}%`;
    const timing = `${Math.round(sessionAggregation.session_timing_score * 100)}%`;
    const silence = `${Math.round(sessionAggregation.session_silence_score * 100)}%`;
    return `${status} | ${confidence} | trend: ${trend} | ${pattern} | pitch: ${pitch} | timing: ${timing} | silence: ${silence} | next: ${nextAction}`;
  }

  return `${status} | ${confidence} | trend: ${trend} | ${pattern} | next: ${nextAction}`;
}


// ============================================================
// OWNERSHIP EVIDENCE PACK
// ============================================================

function checkOwnershipEvidence(state, sessionAggregation, options = {}) {
  const pack = THRESHOLDS.ownership_evidence_pack;
  const agg = sessionAggregation;

  const checks = {
    session_pitch_score: agg.session_pitch_score >= pack.session_pitch_score_min,
    session_timing_score: agg.session_timing_score >= pack.session_timing_score_min,
    session_silence_score: agg.session_silence_score >= pack.session_silence_score_min,
    session_stability_score: agg.session_stability_score >= pack.session_stability_score_min,
    critical_tags: countCriticalTags(agg) <= pack.critical_tags_max,
    perception_confidence: agg.perception_confidence >= pack.perception_confidence_min,
    transfer_attempt: !!options.transferKey,
    feel_mode_A: state.feel_mode_history?.A_passed === true,
    feel_mode_B: state.feel_mode_history?.B_passed === true,
    feel_mode_C: true,
    min_attempts: (state.attempts || 0) >= pack.min_attempts,
  };

  const allPassed = Object.values(checks).every(v => v === true);

  if (!allPassed) return null;

  return {
    concept_id: options.conceptId,
    student_id: state.student_id,
    ownership_date: new Date().toISOString(),
    evidence: {
      session_pitch_score: agg.session_pitch_score,
      session_timing_score: agg.session_timing_score,
      session_silence_score: agg.session_silence_score,
      session_stability_score: agg.session_stability_score,
      critical_tags: [],
      perception_confidence: agg.perception_confidence,
      transfer_key: options.transferKey,
      transfer_exercise: options.transferExercise,
      feel_mode_A_date: state.feel_mode_history?.A_date || null,
      feel_mode_B_date: state.feel_mode_history?.B_date || null,
      feel_mode_C_date: new Date().toISOString(),
      total_attempts: state.attempts,
    },
    verified_by: 'perception_stack_v2',
    constitution_law: 'Law 05: Ownership Before Mastery',
  };
}


// ============================================================
// INTERVENTION ESCALATION
// ============================================================

function checkEscalation(escalationState) {
  const e = escalationState;

  if (e.consecutiveLowConfidence >= 3) {
    return { action: 'suppress', reason: 'Low-confidence packets — suggest recalibration' };
  }
  if (e.sessionMinutes >= 15 && e.correctionCount > 0) {
    return { action: 'encourage', reason: 'Session fatigue guard — positive mode only' };
  }
  if (e.consecutivePassAfterCorrection >= 2) {
    return { action: 'encourage', reason: 'Recovery detected — specific encouragement' };
  }
  if (e.sameConceptFailures >= 3) {
    return { action: 'simplify', reason: 'Repeated failure — slow tempo or reduce complexity' };
  }
  if (e.consecutiveCorrections >= 2) {
    return { action: 'switch_strategy', reason: 'Max corrections reached — switch approach' };
  }
  return { action: 'correct', reason: 'Within escalation limits' };
}


// ============================================================
// POSITIVE FEEDBACK LOGIC
// ============================================================

function applyPositiveFeedback(state, packets) {
  let confidenceBoost = 0;

  const pitchConfident = consecutiveCount(packets, 'pitch_confident');
  if (pitchConfident >= 3) {
    confidenceBoost += 0.02 * Math.floor(pitchConfident / 3);
  }

  const timingLocked = packets.filter(p => p.recommended_interpretation === 'timing_locked').length;
  confidenceBoost += timingLocked * 0.02;

  const silenceRespected = packets.filter(p => p.recommended_interpretation === 'silence_respected').length;
  confidenceBoost += silenceRespected * 0.01;

  return Math.min(1.0, (state.confidence || 0) + confidenceBoost);
}

const POSITIVE_TAGS = new Set([
  'pitch_confident', 'timing_locked', 'silence_respected',
  'posture_good', 'engaged',
]);

function isPositiveTag(tag) {
  return POSITIVE_TAGS.has(tag);
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function round(n, decimals = 2) {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function normalizedMeanScore(packets) {
  if (!packets.length) return 0;
  const passable = packets.filter(p => typeof p.value === 'number' || typeof p.value === 'boolean');
  if (!passable.length) return 0;
  return passable.reduce((sum, p) => sum + normalizePacketValue(p), 0) / passable.length;
}

function meanScore(packets) {
  return normalizedMeanScore(packets);
}

function meanConfidence(packets) {
  if (!packets.length) return 0;
  return packets.reduce((sum, p) => sum + (p.confidence || 0), 0) / packets.length;
}

function weightedMean(items) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((sum, i) => sum + i.value * i.weight, 0) / totalWeight;
}

function normalizedPitchStability(pitchPackets) {
  const stab = pitchPackets.filter(p => p.metric_name === 'pitch_stability');
  return stab.length ? normalizedMeanScore(stab) : 0;
}

function normalizedPulseStability(timingPackets) {
  const stab = timingPackets.filter(p => p.metric_name === 'pulse_stability');
  return stab.length ? normalizedMeanScore(stab) : 0;
}

function normalizedReleaseScore(silencePackets) {
  const rel = silencePackets.filter(p => p.metric_name === 'release_cleanliness');
  return rel.length ? normalizedMeanScore(rel) : 0;
}

function computePassRate(packets) {
  if (!packets.length) return 0;
  const passed = packets.filter(p => p.severity === 'info').length;
  return passed / packets.length;
}

function countCriticalTags(agg) {
  if (!agg.tag_counts) return 0;
  const criticalTags = getAllTagsBySeverity('critical');
  return Object.entries(agg.tag_counts)
    .filter(([tag]) => criticalTags.has(tag))
    .reduce((sum, [, count]) => sum + count, 0);
}

function getAllTagsBySeverity(severity) {
  const result = new Set();
  for (const category of Object.values(TAGS_CONFIG.tags)) {
    for (const tag of category) {
      if (tag.severity === severity) result.add(tag.tag);
    }
  }
  return result;
}

function findDominantError(sortedTags) {
  const errorTags = sortedTags.filter(([tag]) => !POSITIVE_TAGS.has(tag));
  return errorTags.length ? `${errorTags[0][0]} (${errorTags[0][1]} events)` : 'no errors';
}

function findBestRecovery(packets) {
  const tagTimeline = {};
  for (const p of packets) {
    const tag = p.recommended_interpretation;
    if (!tag) continue;
    if (!tagTimeline[tag]) tagTimeline[tag] = [];
    tagTimeline[tag].push(p.severity);
  }
  for (const [tag, severities] of Object.entries(tagTimeline)) {
    const hadError = severities.some(s => s === 'warning' || s === 'critical');
    const endedClean = severities.slice(-3).every(s => s === 'info');
    if (hadError && endedClean) return tag;
  }
  return null;
}

function consecutiveCount(packets, tagName) {
  let max = 0;
  let current = 0;
  for (const p of packets) {
    if (p.recommended_interpretation === tagName) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

function deriveStrategy(agg) {
  if (!agg.dominant_error_pattern || agg.dominant_error_pattern === 'no errors') {
    return 'continue_current';
  }
  const pattern = agg.dominant_error_pattern.split(' (')[0];
  const strategyMap = {
    'flat_landing': 'pitch_correction_drill',
    'sharp_landing': 'pitch_correction_drill',
    'unstable_hold': 'sustained_tone_practice',
    'rushed_entry': 'metronome_slow_practice',
    'late_entry': 'metronome_slow_practice',
    'timing_drag': 'tempo_awareness_drill',
    'timing_rush': 'tempo_awareness_drill',
    'pulse_unstable': 'body_pulse_exercise',
    'silence_missed': 'rest_awareness_drill',
    'rest_clipped': 'rest_awareness_drill',
    'early_reentry': 'breathing_exercise',
    'phrase_cramped': 'phrase_spacing_practice',
    'dirty_release': 'release_control_drill',
    'collapsed_wrist': 'posture_check',
    'flat_fingers': 'finger_curl_exercise',
    'engagement_drop': 'switch_activity',
  };
  return strategyMap[pattern] || 'review_and_reinforce';
}

function deriveNextAction(state, agg, options = {}) {
  if (state.ownership_status === 'accurate_with_support') {
    if (agg.session_pitch_score >= 0.85 && agg.session_timing_score >= 0.85) {
      return 'Feel Mode B gate — without support';
    }
  }
  if (state.ownership_status === 'accurate_without_support') {
    if (agg.session_stability_score >= 0.80 && agg.session_silence_score >= 0.80) {
      return 'Feel Mode C gate — transfer & ownership';
    }
  }

  const strategy = deriveStrategy(agg);
  if (strategy !== 'continue_current') {
    return strategy;
  }
  return 'continue current';
}


// ============================================================
// ES MODULE EXPORTS
// ============================================================

export {
  // Core
  passesConfidenceGate,
  computeConfidence,
  aggregateSession,
  applyPerceptionToState,
  generateStoredEvidenceSummary,

  // Normalization
  normalizePacketValue,
  normalizeOffset,
  normalizeFloor,
  normalizeBoolean,
  NORMALIZERS,

  // Confidence bridge
  confidenceIn,
  confidenceOut100,

  // Ownership
  checkOwnershipEvidence,

  // Escalation
  checkEscalation,

  // Write contract
  assertAllowedWrite,

  // Positive feedback
  applyPositiveFeedback,
  isPositiveTag,

  // Constants
  CONFIDENCE_GATE,
  PROTECTED_FIELDS,
  ALLOWED_WRITE_FIELDS,
  POSITIVE_TAGS,
};

// Default export for convenience
export default {
  passesConfidenceGate,
  computeConfidence,
  aggregateSession,
  applyPerceptionToState,
  generateStoredEvidenceSummary,
  normalizePacketValue,
  confidenceIn,
  confidenceOut100,
  checkOwnershipEvidence,
  checkEscalation,
  assertAllowedWrite,
  applyPositiveFeedback,
  isPositiveTag,
  CONFIDENCE_GATE,
  PROTECTED_FIELDS,
  ALLOWED_WRITE_FIELDS,
  POSITIVE_TAGS,
};
