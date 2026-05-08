/**
 * ============================================================
 * LOCK PACKAGE BRIDGE CONFIG v1.1
 * ============================================================
 * 
 * READ-ONLY bridge between the Motesart Curriculum Lock Package
 * and the frontend lesson engine / converter system.
 * 
 * This file does NOT replace tami_strategy_resolver.js.
 * This file does NOT write to lock package files.
 * This file does NOT carry full registry payloads.
 * This file does NOT duplicate engine threshold logic.
 * 
 * It exposes a small, derived subset:
 *   - conceptIdMap           (old C_ -> canonical T_ mapping)
 *   - pilotConceptProfiles   (5 pilot concepts with full intelligence)
 *   - phaseMap               (fast phase lookup)
 *   - sourceAnchors          (Number System source rules)
 *   - converterRules         (read-time enforcement for converter)
 *   - feelModeGates          (Feel Mode gate metadata)
 *   - masteryThresholds      (derived from engine, not duplicated)
 *   - getClaudePromptContext  (prompt context helper)
 *   - buildEvidenceSummary   (Concept_State evidence string builder)
 *   - smokeTest              (5-point verification)
 * 
 * Architecture rules:
 *   1. This file is EXPLICITLY read-only
 *   2. Pilot concepts (5) = full intelligence
 *   3. Non-pilot concepts = lookup/display only
 *   4. Converter consumes derived subset, not raw lock package
 *   5. No resolver rewrite, no lesson JSON migration, no Python changes
 *   6. Thresholds derive from Concept State Engine, not duplicated
 *   7. Non-pilot mistake_tags normalized to [] (not empty string)
 * 
 * @module lock_package_bridge_config
 * @version 1.1.0
 * @readonly
 */

// ============================================================
// VERSION METADATA
// ============================================================
export const BRIDGE_VERSION = '1.1.0';
export const LOCK_PACKAGE_VERSION = '1.0.0';
export const PILOT_SCOPE_COUNT = 5;


// ============================================================
// SECTION 1: CONCEPT STATE ENGINE THRESHOLDS (single source)
// ============================================================
/**
 * These thresholds are the canonical values from the Concept State Engine.
 * The bridge references them — it does not redefine them.
 * If the engine changes, update HERE ONLY.
 */
export const ENGINE_THRESHOLDS = {
  mastered_min: 0.85,
  mastery_ready: 0.75,
  trend_improving_delta: 0.08,
  trend_declining_delta: -0.08,
};


// ============================================================
// SECTION 2: CONCEPT ID MAP (old C_ -> canonical T_)
// ============================================================
export const CONCEPT_ID_MAP = {
  // === RESOLVER CONCEPTS (existing in tami_strategy_resolver.js) ===
  'C_KEYBOARD':      'T_KEYBOARD_LAYOUT',
  'C_HALFWHOLE':     'T_HALF_STEP',
  'C_MAJSCALE':      'T_MAJOR_SCALE_PATTERN',
  'C_CMAJOR':        'T_C_MAJOR_SCALE',
  'C_FINGERS':       'T_FINGER_NUMBERING',
  'C_OCTAVE':        'T_OCTAVE_RECOGNITION',

  // === ADDITIONAL PILOT CONCEPTS (not yet in resolver) ===
  'C_WHOLE_STEP':        'T_WHOLE_STEP',
  'C_SCALE_DEGREES':     'T_SCALE_DEGREES_MAJOR',
  'C_MAJOR_3RD':         'T_MAJOR_3RD',

  // === NON-PILOT FORWARD DECLARATIONS ===
  'C_SHARP_FLAT':        'T_SHARP_FLAT_NAMES',
  'C_INTERVAL':          'T_INTERVAL_RECOGNITION',
  'C_CHORD_TRIAD':       'T_CHORD_TRIAD_STRUCTURE',
  'C_CHORD_QUALITY':     'T_CHORD_QUALITY',
  'C_GMAJOR':            'T_G_MAJOR_SCALE',
  'C_FMAJOR':            'T_F_MAJOR_SCALE',
  'C_DMAJOR':            'T_D_MAJOR_SCALE',
  'C_AMINOR':            'T_A_MINOR_SCALE',
  'C_KEY_SIGNATURE':     'T_KEY_SIGNATURE_READING',
  'C_TIME_SIGNATURE':    'T_TIME_SIGNATURE_BASICS',
  'C_NOTE_VALUES':       'T_NOTE_VALUE_DURATION',
  'C_REST_VALUES':       'T_REST_VALUE_DURATION',
  'C_DYNAMICS':          'T_DYNAMIC_MARKINGS',
  'C_TEMPO':             'T_TEMPO_MARKINGS',
  'C_REPEAT_SIGNS':      'T_REPEAT_NAVIGATION',
  'C_STAFF_READING':     'T_STAFF_LINE_SPACE_READING',
  'C_TREBLE_CLEF':       'T_TREBLE_CLEF_NOTES',
  'C_BASS_CLEF':         'T_BASS_CLEF_NOTES',
  'C_SAME_DIFFERENT':    'T_SAME_DIFFERENT',
  'C_STEP_SKIP':         'T_STEP_SKIP',
  'C_HARMONY_BASIC':     'T_HARMONY_BASIC',
  'C_MELODIC_INTERVALS': 'T_MELODIC_INTERVALS_CONTEXT',
};

export const REVERSE_ID_MAP = Object.fromEntries(
  Object.entries(CONCEPT_ID_MAP).map(([k, v]) => [v, k])
);

// ============================================================
// SECTION 3: PILOT vs NON-PILOT BOUNDARY (canonical 5)
// ============================================================
/**
 * The registry defines exactly 5 build-first pilot concepts.
 * These have full mistake_tags_expected, resolver strategy potential,
 * Feel Mode gates, and full intelligence.
 * 
 * Non-pilot concepts: lookup/display only.
 * Their mistake_tags_expected may be empty — normalized to [].
 */
export const PILOT_CONCEPT_IDS = [
  'T_HALF_STEP',
  'T_WHOLE_STEP',
  'T_MAJOR_SCALE_PATTERN',
  'T_SCALE_DEGREES_MAJOR',
  'T_MAJOR_3RD',
];

export const NON_PILOT_CONCEPT_IDS = [
  'T_KEYBOARD_LAYOUT',
  'T_C_MAJOR_SCALE',
  'T_FINGER_NUMBERING',
  'T_OCTAVE_RECOGNITION',
  'T_SHARP_FLAT_NAMES',
  'T_INTERVAL_RECOGNITION',
  'T_CHORD_TRIAD_STRUCTURE',
  'T_CHORD_QUALITY',
  'T_G_MAJOR_SCALE',
  'T_F_MAJOR_SCALE',
  'T_D_MAJOR_SCALE',
  'T_A_MINOR_SCALE',
  'T_KEY_SIGNATURE_READING',
  'T_TIME_SIGNATURE_BASICS',
  'T_NOTE_VALUE_DURATION',
  'T_REST_VALUE_DURATION',
  'T_DYNAMIC_MARKINGS',
  'T_TEMPO_MARKINGS',
  'T_REPEAT_NAVIGATION',
  'T_STAFF_LINE_SPACE_READING',
  'T_TREBLE_CLEF_NOTES',
  'T_BASS_CLEF_NOTES',
  'T_SAME_DIFFERENT',
  'T_STEP_SKIP',
  'T_HARMONY_BASIC',
  'T_MELODIC_INTERVALS_CONTEXT',
];

export function isPilotConcept(conceptId) {
  const canonical = normalizeConceptId(conceptId);
  return PILOT_CONCEPT_IDS.includes(canonical);
}


// ============================================================
// SECTION 4: PILOT CONCEPT PROFILES (canonical 5 only)
// ============================================================
/**
 * Full intelligence profiles for the 5 pilot concepts.
 * Mastery thresholds derive from ENGINE_THRESHOLDS — not hardcoded separately.
 */
export const PILOT_CONCEPT_PROFILES = {
  'T_HALF_STEP': {
    motesart_id: 'SOM-HS-001',
    motesart_language: 'The Half Step - Next-Door Neighbors',
    grade_band: 'K-2',
    primary_tool: 'half_step_demo',
    fast_phase: 'PHASE_1_FOUNDATIONS',
    feel_mode_gate: {
      entry_condition: 'none',
      exit_mastery: ENGINE_THRESHOLDS.mastered_min,
      requires_audio: true,
      feel_first: true,
    },
    mastery_threshold: {
      accuracy: ENGINE_THRESHOLDS.mastered_min,
      mastery_ready: ENGINE_THRESHOLDS.mastery_ready,
      consecutive_correct: 5,
      min_attempts: 10,
    },
    mistake_tags_expected: ['wrong_direction', 'skipped_key', 'whole_instead_of_half'],
    resolver_legacy_id: 'C_HALFWHOLE',
    intelligence_level: 'full',
  },

  'T_WHOLE_STEP': {
    motesart_id: 'SOM-WS-002',
    motesart_language: 'The Whole Step - Skip One Neighbor',
    grade_band: 'K-2',
    primary_tool: 'whole_step_demo',
    fast_phase: 'PHASE_1_FOUNDATIONS',
    feel_mode_gate: {
      entry_condition: 'T_HALF_STEP.mastery >= ' + ENGINE_THRESHOLDS.mastered_min,
      exit_mastery: ENGINE_THRESHOLDS.mastered_min,
      requires_audio: true,
      feel_first: true,
    },
    mastery_threshold: {
      accuracy: ENGINE_THRESHOLDS.mastered_min,
      mastery_ready: ENGINE_THRESHOLDS.mastery_ready,
      consecutive_correct: 5,
      min_attempts: 10,
    },
    mistake_tags_expected: ['half_instead_of_whole', 'wrong_direction', 'skipped_two'],
    resolver_legacy_id: 'C_WHOLE_STEP',
    intelligence_level: 'full',
  },

  'T_MAJOR_SCALE_PATTERN': {
    motesart_id: 'SOM-MSP-003',
    motesart_language: 'The Scale Road - W-W-H-W-W-W-H',
    grade_band: '1-3',
    primary_tool: 'scale_pattern_overlay',
    fast_phase: 'PHASE_2_PATTERNS',
    feel_mode_gate: {
      entry_condition: 'T_WHOLE_STEP.mastery >= ' + ENGINE_THRESHOLDS.mastered_min,
      exit_mastery: ENGINE_THRESHOLDS.mastered_min,
      requires_audio: true,
      feel_first: false,
    },
    mastery_threshold: {
      accuracy: ENGINE_THRESHOLDS.mastered_min,
      mastery_ready: ENGINE_THRESHOLDS.mastery_ready,
      consecutive_correct: 5,
      min_attempts: 12,
    },
    mistake_tags_expected: ['pattern_break_at_3_4', 'pattern_break_at_7_1', 'wrong_interval_type'],
    resolver_legacy_id: 'C_MAJSCALE',
    intelligence_level: 'full',
  },

  'T_SCALE_DEGREES_MAJOR': {
    motesart_id: 'SOM-SD-004',
    motesart_language: 'Scale Degrees - The Number Names',
    grade_band: '1-3',
    primary_tool: 'scale_degree_overlay',
    fast_phase: 'PHASE_2_PATTERNS',
    feel_mode_gate: {
      entry_condition: 'T_MAJOR_SCALE_PATTERN.mastery >= ' + ENGINE_THRESHOLDS.mastered_min,
      exit_mastery: ENGINE_THRESHOLDS.mastered_min,
      requires_audio: false,
      feel_first: false,
    },
    mastery_threshold: {
      accuracy: ENGINE_THRESHOLDS.mastered_min,
      mastery_ready: ENGINE_THRESHOLDS.mastery_ready,
      consecutive_correct: 5,
      min_attempts: 12,
    },
    mistake_tags_expected: ['wrong_degree_number', 'off_by_one', 'confused_with_interval'],
    resolver_legacy_id: 'C_SCALE_DEGREES',
    intelligence_level: 'full',
  },

  'T_MAJOR_3RD': {
    motesart_id: 'SOM-M3-005',
    motesart_language: 'The Major 3rd - The Sunshine Interval',
    grade_band: '2-4',
    primary_tool: 'interval_demo',
    fast_phase: 'PHASE_3_INTERVALS',
    feel_mode_gate: {
      entry_condition: 'T_SCALE_DEGREES_MAJOR.mastery >= ' + ENGINE_THRESHOLDS.mastered_min,
      exit_mastery: ENGINE_THRESHOLDS.mastered_min,
      requires_audio: true,
      feel_first: true,
    },
    mastery_threshold: {
      accuracy: ENGINE_THRESHOLDS.mastered_min,
      mastery_ready: ENGINE_THRESHOLDS.mastery_ready,
      consecutive_correct: 5,
      min_attempts: 10,
    },
    mistake_tags_expected: ['minor_instead_of_major', 'wrong_interval_size', 'counted_from_wrong_note'],
    resolver_legacy_id: 'C_MAJOR_3RD',
    intelligence_level: 'full',
  },
};

// ============================================================
// SECTION 5: PHASE MAP (fast phase lookup)
// ============================================================
export const PHASE_MAP = {
  'PHASE_1_FOUNDATIONS': {
    label: 'Foundations',
    description: 'Half steps, whole steps, keyboard geography, finger identity',
    grade_band: 'K-2',
    concepts: ['T_HALF_STEP', 'T_WHOLE_STEP', 'T_KEYBOARD_LAYOUT', 'T_FINGER_NUMBERING', 'T_OCTAVE_RECOGNITION'],
    prerequisite_phase: null,
  },
  'PHASE_2_PATTERNS': {
    label: 'Patterns',
    description: 'Scale structure, major scale construction, scale degree names',
    grade_band: '1-3',
    concepts: ['T_MAJOR_SCALE_PATTERN', 'T_SCALE_DEGREES_MAJOR', 'T_C_MAJOR_SCALE'],
    prerequisite_phase: 'PHASE_1_FOUNDATIONS',
  },
  'PHASE_3_INTERVALS': {
    label: 'Intervals',
    description: 'Major 3rd, interval recognition, melodic context',
    grade_band: '2-4',
    concepts: ['T_MAJOR_3RD', 'T_INTERVAL_RECOGNITION', 'T_MELODIC_INTERVALS_CONTEXT'],
    prerequisite_phase: 'PHASE_2_PATTERNS',
  },
  'PHASE_4_KEYS': {
    label: 'Keys & Signatures',
    description: 'Multiple major keys, key signatures, transposition',
    grade_band: '2-5',
    concepts: ['T_G_MAJOR_SCALE', 'T_F_MAJOR_SCALE', 'T_D_MAJOR_SCALE', 'T_A_MINOR_SCALE', 'T_KEY_SIGNATURE_READING', 'T_SHARP_FLAT_NAMES'],
    prerequisite_phase: 'PHASE_2_PATTERNS',
  },
  'PHASE_5_HARMONY': {
    label: 'Harmony & Chords',
    description: 'Triads, chord quality, harmonic function',
    grade_band: '3-8',
    concepts: ['T_CHORD_TRIAD_STRUCTURE', 'T_CHORD_QUALITY', 'T_HARMONY_BASIC'],
    prerequisite_phase: 'PHASE_3_INTERVALS',
  },
  'PHASE_6_NOTATION': {
    label: 'Notation & Literacy',
    description: 'Staff reading, clefs, note/rest values, dynamics, tempo, repeats',
    grade_band: '2-8',
    concepts: ['T_STAFF_LINE_SPACE_READING', 'T_TREBLE_CLEF_NOTES', 'T_BASS_CLEF_NOTES', 'T_TIME_SIGNATURE_BASICS', 'T_NOTE_VALUE_DURATION', 'T_REST_VALUE_DURATION', 'T_DYNAMIC_MARKINGS', 'T_TEMPO_MARKINGS', 'T_REPEAT_NAVIGATION'],
    prerequisite_phase: 'PHASE_2_PATTERNS',
  },
};

export function getPhaseForConcept(conceptId) {
  const canonical = normalizeConceptId(conceptId);
  for (const [phaseId, phase] of Object.entries(PHASE_MAP)) {
    if (phase.concepts.includes(canonical)) return phaseId;
  }
  return null;
}


// ============================================================
// SECTION 6: NUMBER SYSTEM SOURCE ANCHORS
// ============================================================
export const SOURCE_ANCHORS = {
  'C': { home_number: 1, scale: [1, 2, 3, 4, 5, 6, 7], chromatic: ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'] },
  'G': { home_number: 1, scale: [1, 2, 3, 4, 5, 6, 7], chromatic: ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'] },
  'F': { home_number: 1, scale: [1, 2, 3, 4, 5, 6, 7], chromatic: ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'] },
  'D': { home_number: 1, scale: [1, 2, 3, 4, 5, 6, 7], chromatic: ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'] },
  'A_MINOR': { home_number: 6, scale: [6, 7, 1, 2, 3, 4, 5], chromatic: ['6', '6½', '7', '1', '1½', '2', '2½', '3', '4', '4½', '5', '5½'] },
};

export const NUMBER_SYSTEM_RULES = {
  tonic_is_always_1: true,
  half_number_suffix: '½',
  forbidden_halves: ['3½', '7½'],
  valid_chromatic_range: ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'],
  minor_key_home: 6,
};


// ============================================================
// SECTION 7: FEEL MODE GATES (derived from pilot profiles)
// ============================================================
export const FEEL_MODE_GATES = {};
for (const [id, profile] of Object.entries(PILOT_CONCEPT_PROFILES)) {
  FEEL_MODE_GATES[id] = profile.feel_mode_gate;
}


// ============================================================
// SECTION 8: MASTERY THRESHOLDS (derived, not duplicated)
// ============================================================
/**
 * Mastery thresholds are derived from ENGINE_THRESHOLDS + pilot profiles.
 * For pilot concepts: profile-specific config.
 * For non-pilot concepts: ENGINE_THRESHOLDS defaults only.
 */
export const MASTERY_THRESHOLDS = {};
for (const [id, profile] of Object.entries(PILOT_CONCEPT_PROFILES)) {
  MASTERY_THRESHOLDS[id] = profile.mastery_threshold;
}
// Default for any non-pilot concept
MASTERY_THRESHOLDS._default = {
  accuracy: ENGINE_THRESHOLDS.mastered_min,
  mastery_ready: ENGINE_THRESHOLDS.mastery_ready,
  consecutive_correct: 5,
  min_attempts: 10,
};

// ============================================================
// SECTION 9: CONVERTER RULES (read-time enforcement)
// ============================================================
export const CONVERTER_RULES = {
  accepted_formats: {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tiff'],
    document: ['pdf'],
    music: ['midi', 'mid', 'musicxml', 'mxl'],
    text: ['txt', 'chord', 'chopro'],
  },

  compliance_modes: {
    'quick':      { requires_compliance: false, requires_standards: false, audience: 'general' },
    'curriculum':  { requires_compliance: false, requires_standards: true,  audience: 'educator' },
    'compliance':  { requires_compliance: true,  requires_standards: true,  audience: 'school_admin' },
  },

  getIntelligenceLevel(conceptId) {
    const canonical = normalizeConceptId(conceptId);
    if (PILOT_CONCEPT_IDS.includes(canonical)) return 'full';
    if (NON_PILOT_CONCEPT_IDS.includes(canonical)) return 'lookup';
    return 'unknown';
  },

  isAcceptedFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return Object.values(this.accepted_formats).flat().includes(ext);
  },

  requiresCompliance(mode) {
    const config = this.compliance_modes[mode];
    return config ? config.requires_compliance : false;
  },

  requiresStandards(mode) {
    const config = this.compliance_modes[mode];
    return config ? config.requires_standards : false;
  },
};


// ============================================================
// SECTION 10: ID NORMALIZATION (read-time enforcement)
// ============================================================
export function normalizeConceptId(id) {
  if (!id || typeof id !== 'string') return id;
  if (id.startsWith('T_') && Object.values(CONCEPT_ID_MAP).includes(id)) return id;
  if (id.startsWith('C_') && CONCEPT_ID_MAP[id]) return CONCEPT_ID_MAP[id];
  const upper = id.toUpperCase();
  const withT = 'T_' + upper;
  if (Object.values(CONCEPT_ID_MAP).includes(withT)) return withT;
  const withC = 'C_' + upper;
  if (CONCEPT_ID_MAP[withC]) return CONCEPT_ID_MAP[withC];
  return id;
}

export function validateConceptId(id) {
  const canonical = normalizeConceptId(id);
  const isPilot = PILOT_CONCEPT_IDS.includes(canonical);
  const isNonPilot = NON_PILOT_CONCEPT_IDS.includes(canonical);
  const valid = isPilot || isNonPilot;
  return {
    valid,
    canonical: valid ? canonical : null,
    intelligence_level: isPilot ? 'full' : (isNonPilot ? 'lookup' : 'unknown'),
    is_pilot: isPilot,
    mistake_tags_ready: isPilot,
    original_input: id,
  };
}


// ============================================================
// SECTION 11: EVIDENCE SUMMARY (explicit Concept_State field)
// ============================================================
/**
 * Builds a compact, readable evidence string from Concept_State data.
 * Used by: converter, dashboard, teacher views, compliance reports.
 * 
 * Input: a Concept_State object with fields:
 *   { confidence, status, trend, mastery_ready, attempts, mistake_tags }
 * 
 * Output: string like:
 *   "18 attempts - 72% confidence - improving - descending_errors, hint_dependent"
 */
export function buildEvidenceSummary(conceptState) {
  if (!conceptState) return 'No data';

  const parts = [];

  if (conceptState.attempts != null) {
    parts.push(conceptState.attempts + ' attempts');
  }

  if (conceptState.confidence != null) {
    parts.push(Math.round(conceptState.confidence * 100) + '% confidence');
  }

  if (conceptState.trend) {
    parts.push(conceptState.trend);
  }

  if (conceptState.mastery_ready) {
    parts.push('mastery-ready');
  }

  if (conceptState.status) {
    parts.push(conceptState.status);
  }

  // Append active mistake tags if present
  if (Array.isArray(conceptState.mistake_tags) && conceptState.mistake_tags.length > 0) {
    parts.push(conceptState.mistake_tags.join(', '));
  }

  return parts.join(' \u00b7 ') || 'No data';
}

// ============================================================
// SECTION 12: CLAUDE PROMPT CONTEXT HELPER
// ============================================================
export function getClaudePromptContext(conceptId, mode = 'quick') {
  const validation = validateConceptId(conceptId);
  const phase = getPhaseForConcept(conceptId);
  const phaseInfo = phase ? PHASE_MAP[phase] : null;

  const context = {
    concept: {
      id: validation.canonical,
      is_pilot: validation.is_pilot,
      intelligence_level: validation.intelligence_level,
      mistake_tags_ready: validation.mistake_tags_ready,
    },
    phase: phase ? {
      id: phase,
      label: phaseInfo.label,
      grade_band: phaseInfo.grade_band,
    } : null,
    mode: {
      name: mode,
      requires_compliance: CONVERTER_RULES.requiresCompliance(mode),
      requires_standards: CONVERTER_RULES.requiresStandards(mode),
      audience: CONVERTER_RULES.compliance_modes[mode]?.audience || 'general',
    },
    number_system: NUMBER_SYSTEM_RULES,
    engine_thresholds: ENGINE_THRESHOLDS,
  };

  if (validation.is_pilot && PILOT_CONCEPT_PROFILES[validation.canonical]) {
    const profile = PILOT_CONCEPT_PROFILES[validation.canonical];
    context.concept.motesart_id = profile.motesart_id;
    context.concept.motesart_language = profile.motesart_language;
    context.concept.primary_tool = profile.primary_tool;
    context.concept.feel_mode_gate = profile.feel_mode_gate;
    context.concept.mastery_threshold = profile.mastery_threshold;
    context.concept.mistake_tags_expected = profile.mistake_tags_expected;
  }

  return context;
}


// ============================================================
// SECTION 13: SMOKE TESTS (5-point verification)
// ============================================================
/**
 * Run 5 smoke tests to verify bridge config integrity.
 * Call smokeTest() in Node or browser console.
 * Returns { passed: boolean, results: [...] }
 */
export function smokeTest() {
  const results = [];

  // Test 1: resolveConceptId C_ -> T_
  const t1 = normalizeConceptId('C_HALFWHOLE');
  results.push({
    test: 'C_HALFWHOLE -> T_HALF_STEP',
    passed: t1 === 'T_HALF_STEP',
    got: t1,
  });

  // Test 2: reverse map works
  const t2 = REVERSE_ID_MAP['T_MAJOR_SCALE_PATTERN'];
  results.push({
    test: 'reverse T_MAJOR_SCALE_PATTERN -> C_MAJSCALE',
    passed: t2 === 'C_MAJSCALE',
    got: t2,
  });

  // Test 3: all pilot concepts return intelligence_level "full"
  const t3 = PILOT_CONCEPT_IDS.every(id => {
    const v = validateConceptId(id);
    return v.intelligence_level === 'full' && v.is_pilot === true;
  });
  results.push({
    test: 'all ' + PILOT_SCOPE_COUNT + ' pilot concepts -> intelligence_level: full',
    passed: t3 && PILOT_CONCEPT_IDS.length === PILOT_SCOPE_COUNT,
    got: 'pilot_count=' + PILOT_CONCEPT_IDS.length + ', all_full=' + t3,
  });

  // Test 4: non-pilot concepts return lookup only
  const sampleNonPilot = validateConceptId('T_KEYBOARD_LAYOUT');
  results.push({
    test: 'T_KEYBOARD_LAYOUT (non-pilot) -> intelligence_level: lookup',
    passed: sampleNonPilot.intelligence_level === 'lookup' && !sampleNonPilot.is_pilot,
    got: sampleNonPilot.intelligence_level,
  });

  // Test 5: getClaudePromptContext returns engine thresholds
  const t5 = getClaudePromptContext('T_HALF_STEP', 'curriculum');
  const thresholdsMatch = t5.engine_thresholds.mastered_min === ENGINE_THRESHOLDS.mastered_min
    && t5.engine_thresholds.mastery_ready === ENGINE_THRESHOLDS.mastery_ready;
  const phasePresent = t5.phase && t5.phase.id === 'PHASE_1_FOUNDATIONS';
  const modeCorrect = t5.mode.requires_standards === true;
  results.push({
    test: 'getClaudePromptContext(T_HALF_STEP, curriculum) has correct thresholds/phase/mode',
    passed: thresholdsMatch && phasePresent && modeCorrect,
    got: 'thresholds=' + thresholdsMatch + ', phase=' + phasePresent + ', mode=' + modeCorrect,
  });

  const allPassed = results.every(r => r.passed);
  return { passed: allPassed, results };
}


// ============================================================
// SECTION 14: BRIDGE SUMMARY
// ============================================================
export function getBridgeSummary() {
  return {
    bridge_version: BRIDGE_VERSION,
    lock_package_version: LOCK_PACKAGE_VERSION,
    pilot_scope_count: PILOT_SCOPE_COUNT,
    readonly: true,
    pilot_concepts: PILOT_CONCEPT_IDS.length,
    non_pilot_concepts: NON_PILOT_CONCEPT_IDS.length,
    total_concepts: PILOT_CONCEPT_IDS.length + NON_PILOT_CONCEPT_IDS.length,
    phases: Object.keys(PHASE_MAP).length,
    source_anchors: Object.keys(SOURCE_ANCHORS).length,
    feel_mode_gates: Object.keys(FEEL_MODE_GATES).length,
    mastery_thresholds: Object.keys(MASTERY_THRESHOLDS).length - 1, // exclude _default
    engine_thresholds: ENGINE_THRESHOLDS,
  };
}


// ============================================================
// MODULE EXPORTS
// ============================================================

