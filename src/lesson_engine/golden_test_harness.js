/**
 * ============================================================
 * GOLDEN TEST HARNESS v2.0
 * ============================================================
 *
 * Runs canonical exercises from the perception spec (Section XXIV)
 * against the perception→state adapter and outputs a benchmark report.
 *
 * v2.0 CHANGES:
 *   - Real threshold-based benchmarks (not smoke checks)
 *   - Session scores validated against ownership_evidence_pack thresholds
 *   - State confidence direction validated (must increase for good play)
 *   - Ownership evidence pack pass/fail for qualifying exercises
 *   - Normalization layer validated (raw→0-1 conversion)
 *   - Session mode propagation tested
 *   - Protected field enforcement tested
 *
 * Purpose: One repeatable place to test pitch, timing, silence,
 * and note-event logic. This is NOT a unit test framework —
 * it's a musical benchmark harness.
 *
 * Usage:
 *   node golden_test_harness.js [--exercise GTE_SCALE_01] [--verbose]
 *
 * Governed by: sensing_perception_stack_spec.md, Sections XX, XXIV
 * ============================================================
 */

import THRESHOLDS from './perception_thresholds.json';
import TAGS_CONFIG from './perception_tags.json';
import {
  passesConfidenceGate,
  computeConfidence,
  aggregateSession,
  applyPerceptionToState,
  generateStoredEvidenceSummary,
  checkOwnershipEvidence,
  normalizePacketValue,
  assertAllowedWrite,
  CONFIDENCE_GATE,
  PROTECTED_FIELDS,
} from './perception_state_adapter.js';

// ============================================================
// GOLDEN TEST EXERCISES
// ============================================================

const GOLDEN_EXERCISES = {

  // ── T_HALF_STEP ──────────────────────────────────────────

  GTE_HALF_01: {
    id: 'GTE_HALF_01', concept: 'T_HALF_STEP', name: 'Ascending adjacency',
    description: '10 ascending half steps starting from C4',
    events: generateHalfStepEvents('ascending', 10),
    expected: { pitch_events: 10, timing_events: 10, session_pitch_min: 0.70, session_timing_min: 0.60 },
  },

  GTE_HALF_02: {
    id: 'GTE_HALF_02', concept: 'T_HALF_STEP', name: 'Descending adjacency',
    description: '10 descending half steps from Bb4',
    events: generateHalfStepEvents('descending', 10),
    expected: { pitch_events: 10, timing_events: 10, session_pitch_min: 0.70, session_timing_min: 0.60 },
  },

  GTE_HALF_03: {
    id: 'GTE_HALF_03', concept: 'T_HALF_STEP', name: 'Squeeze point focus',
    description: 'E-F and B-C in 3 octaves (3→4 and 7→8)',
    events: generateSqueezeEvents(),
    expected: { pitch_events: 6, session_pitch_min: 0.50 },
  },

  // ── T_WHOLE_STEP ─────────────────────────────────────────

  GTE_WHOLE_01: {
    id: 'GTE_WHOLE_01', concept: 'T_WHOLE_STEP', name: 'Contrast drill',
    description: 'Alternating half/whole step pairs',
    events: generateContrastDrillEvents(),
    expected: { pitch_events: 20, session_pitch_min: 0.60 },
  },

  GTE_WHOLE_02: {
    id: 'GTE_WHOLE_02', concept: 'T_WHOLE_STEP', name: 'Whole-step chain',
    description: '8 consecutive whole steps from C4',
    events: generateWholeStepChainEvents(),
    expected: { pitch_events: 8, timing_events: 8, session_pitch_min: 0.60, session_timing_min: 0.60 },
  },

  // ── T_MAJOR_SCALE_PATTERN ────────────────────────────────

  GTE_SCALE_01: {
    id: 'GTE_SCALE_01', concept: 'T_MAJOR_SCALE_PATTERN', name: 'C major ascending',
    description: 'One octave ascending, quarter notes at 72 BPM',
    events: generateScaleEvents('C', 'ascending'),
    expected: { pitch_events: 8, timing_events: 8, silence_events: 1, session_pitch_min: 0.70, session_timing_min: 0.60, confidence_should_increase: true },
  },

  GTE_SCALE_02: {
    id: 'GTE_SCALE_02', concept: 'T_MAJOR_SCALE_PATTERN', name: 'C major descending',
    description: 'One octave descending',
    events: generateScaleEvents('C', 'descending'),
    expected: { pitch_events: 8, timing_events: 8, silence_events: 1, session_pitch_min: 0.70, session_timing_min: 0.60 },
  },

  GTE_SCALE_03: {
    id: 'GTE_SCALE_03', concept: 'T_MAJOR_SCALE_PATTERN', name: 'Transfer key (G major)',
    description: 'G major ascending — proves pattern transfers',
    events: generateScaleEvents('G', 'ascending'),
    expected: { pitch_events: 8, timing_events: 8, transfer: true, session_pitch_min: 0.70 },
  },

  GTE_SCALE_04: {
    id: 'GTE_SCALE_04', concept: 'T_MAJOR_SCALE_PATTERN', name: 'Full round trip',
    description: 'C major ascending + descending without pause',
    events: [...generateScaleEvents('C', 'ascending'), ...generateScaleEvents('C', 'descending')],
    expected: { pitch_events: 15, timing_events: 15, session_pitch_min: 0.70, session_timing_min: 0.60 },
  },

  // ── T_SCALE_DEGREES_MAJOR ────────────────────────────────

  GTE_DEG_01: {
    id: 'GTE_DEG_01', concept: 'T_SCALE_DEGREES_MAJOR', name: 'Call-response',
    description: 'T.A.M.i calls degree 1-8, student plays the note in C',
    events: generateCallResponseEvents(),
    expected: { response_events: 8, session_pitch_min: 0.40 },
  },

  GTE_DEG_02: {
    id: 'GTE_DEG_02', concept: 'T_SCALE_DEGREES_MAJOR', name: 'Home check',
    description: 'Play 1, then 4, then 5, then return to 1',
    events: generateHomeCheckEvents(),
    expected: { pitch_events: 4, session_pitch_min: 0.60 },
  },

  // ── T_MAJOR_3RD ──────────────────────────────────────────

  GTE_3RD_01: {
    id: 'GTE_3RD_01', concept: 'T_MAJOR_3RD', name: 'Bright/dark discrimination',
    description: 'Major 3rd vs minor 3rd — student identifies which is bright',
    events: generateDiscriminationEvents(),
    expected: { discrimination_events: 10, pass_rate_min: 0.70 },
  },

  GTE_3RD_02: {
    id: 'GTE_3RD_02', concept: 'T_MAJOR_3RD', name: 'Interval landing',
    description: 'Play C-E (major 3rd) then C-Eb (minor 3rd)',
    events: generateIntervalLandingEvents(),
    expected: { pitch_events: 4, session_pitch_min: 0.50 },
  },
};


// ============================================================
// SIMULATED PACKET GENERATORS
// ============================================================

function makePacket(source, metricName, value, confidence = 0.85, interpretation = null, severity = 'info') {
  return {
    metric_name: metricName, value, confidence,
    timestamp: new Date().toISOString(), source, severity,
    recommended_interpretation: interpretation,
  };
}

function generateHalfStepEvents(direction, count) {
  const packets = [];
  for (let i = 0; i < count; i++) {
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-8, 8), 0.88, 'pitch_confident'));
    packets.push(makePacket('timing_engine', 'onset_offset_ms', randomInRange(-25, 25), 0.85));
  }
  return packets;
}

function generateSqueezeEvents() {
  const packets = [];
  const squeezeNotes = ['E-F', 'B-C'];
  for (let octave = 3; octave <= 5; octave++) {
    for (const pair of squeezeNotes) {
      packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-12, 12), 0.82));
      packets.push(makePacket('timing_engine', 'onset_offset_ms', randomInRange(-30, 50), 0.80));
    }
  }
  return packets;
}

function generateContrastDrillEvents() {
  const packets = [];
  for (let i = 0; i < 10; i++) {
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-10, 10), 0.85));
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-10, 10), 0.83));
  }
  return packets;
}

function generateWholeStepChainEvents() {
  const packets = [];
  for (let i = 0; i < 8; i++) {
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-10, 10), 0.86));
    packets.push(makePacket('timing_engine', 'onset_offset_ms', randomInRange(-20, 20), 0.88));
  }
  return packets;
}

function generateScaleEvents(key, direction) {
  const packets = [];
  for (let i = 0; i < 8; i++) {
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-8, 8), 0.87, 'pitch_confident'));
    packets.push(makePacket('timing_engine', 'onset_offset_ms', randomInRange(-25, 25), 0.86, 'timing_locked'));
  }
  packets.push(makePacket('silence_engine', 'rest_duration_accuracy', randomInRange(0.78, 0.95), 0.82, 'silence_respected'));
  return packets;
}

function generateCallResponseEvents() {
  const packets = [];
  for (let degree = 1; degree <= 8; degree++) {
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-12, 12), 0.80));
    packets.push(makePacket('timing_engine', 'onset_offset_ms', randomInRange(100, 400), 0.75));
  }
  return packets;
}

function generateHomeCheckEvents() {
  const degrees = [1, 4, 5, 1];
  const packets = [];
  for (const deg of degrees) {
    packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-10, 10), 0.85));
  }
  return packets;
}

function generateDiscriminationEvents() {
  const packets = [];
  for (let i = 0; i < 10; i++) {
    const correct = Math.random() > 0.15;
    packets.push(makePacket('note_event_engine', 'correct', correct, 0.90, correct ? null : 'pitch_drift', correct ? 'info' : 'warning'));
  }
  return packets;
}

function generateIntervalLandingEvents() {
  const packets = [];
  packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-8, 8), 0.88));
  packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-10, 10), 0.85));
  packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-8, 8), 0.87));
  packets.push(makePacket('pitch_engine', 'cents_offset', randomInRange(-12, 12), 0.82));
  return packets;
}

function randomInRange(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}


// ============================================================
// BENCHMARK RUNNER v2.0 — THRESHOLD-BASED
// ============================================================

function runBenchmark(exerciseId = null, verbose = false) {
  const exercises = exerciseId
    ? { [exerciseId]: GOLDEN_EXERCISES[exerciseId] }
    : GOLDEN_EXERCISES;

  if (exerciseId && !GOLDEN_EXERCISES[exerciseId]) {
    console.error(`Unknown exercise: ${exerciseId}`);
    console.error(`Available: ${Object.keys(GOLDEN_EXERCISES).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  let passCount = 0;
  let failCount = 0;

  console.log('═══════════════════════════════════════════════════');
  console.log('  T.A.M.i PERCEPTION — GOLDEN TEST BENCHMARK v2.0');
  console.log('═══════════════════════════════════════════════════\n');

  for (const [id, exercise] of Object.entries(exercises)) {
    const result = runSingleExercise(exercise, verbose);
    results.push(result);
    if (result.passed) passCount++;
    else failCount++;
  }

  console.log('\n───────────────────────────────────────────────────');
  console.log('  NORMALIZATION LAYER VALIDATION');
  console.log('───────────────────────────────────────────────────');
  const normResults = runNormalizationTests(verbose);

  console.log('\n───────────────────────────────────────────────────');
  console.log('  SESSION MODE VALIDATION');
  console.log('───────────────────────────────────────────────────');
  const modeResults = runSessionModeTests(verbose);

  console.log('\n───────────────────────────────────────────────────');
  console.log('  PROTECTED FIELD ENFORCEMENT');
  console.log('───────────────────────────────────────────────────');
  const protectedResults = runProtectedFieldTests(verbose);

  console.log('\n───────────────────────────────────────────────────');
  console.log('  STATE WRITE INTEGRATION');
  console.log('───────────────────────────────────────────────────');
  const stateResults = runStateWriteTests(exercises, verbose);

  const totalInfra = normResults.passed + modeResults.passed + protectedResults.passed + stateResults.passed;
  const totalInfraFail = normResults.failed + modeResults.failed + protectedResults.failed + stateResults.failed;

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Exercise benchmarks:   ${passCount} passed, ${failCount} failed (of ${results.length})`);
  console.log(`  Infrastructure tests:  ${totalInfra} passed, ${totalInfraFail} failed`);
  console.log(`  Overall pass rate:     ${Math.round(((passCount + totalInfra) / (results.length + totalInfra + totalInfraFail)) * 100)}%`);
  console.log('');

  const byConcept = {};
  for (const r of results) {
    if (!byConcept[r.concept]) byConcept[r.concept] = { pass: 0, fail: 0 };
    if (r.passed) byConcept[r.concept].pass++;
    else byConcept[r.concept].fail++;
  }
  console.log('  Per-concept:');
  for (const [concept, counts] of Object.entries(byConcept)) {
    const status = counts.fail === 0 ? '✅' : '❌';
    console.log(`    ${status} ${concept}: ${counts.pass} passed, ${counts.fail} failed`);
  }

  console.log('\n═══════════════════════════════════════════════════\n');
  return { passCount, failCount, results, normResults, modeResults, protectedResults, stateResults };
}

function runSingleExercise(exercise, verbose) {
  const packets = exercise.events;
  const gatedPackets = packets.filter(p => passesConfidenceGate(p));
  const checks = [];

  const pitchPackets = gatedPackets.filter(p => p.source === 'pitch_engine');
  const timingPackets = gatedPackets.filter(p => p.source === 'timing_engine');
  const silencePackets = gatedPackets.filter(p => p.source === 'silence_engine');

  if (exercise.expected.pitch_events) {
    const match = pitchPackets.length >= exercise.expected.pitch_events;
    checks.push({ check: 'pitch_events', expected: `>=${exercise.expected.pitch_events}`, actual: pitchPackets.length, passed: match });
  }
  if (exercise.expected.timing_events) {
    const match = timingPackets.length >= exercise.expected.timing_events;
    checks.push({ check: 'timing_events', expected: `>=${exercise.expected.timing_events}`, actual: timingPackets.length, passed: match });
  }
  if (exercise.expected.silence_events) {
    const match = silencePackets.length >= exercise.expected.silence_events;
    checks.push({ check: 'silence_events', expected: `>=${exercise.expected.silence_events}`, actual: silencePackets.length, passed: match });
  }

  const gateRate = gatedPackets.length / (packets.length || 1);
  checks.push({ check: 'confidence_gate_rate', expected: '>0.8', actual: gateRate.toFixed(2), passed: gateRate > 0.8 });

  const agg = aggregateSession(packets, 'solo');

  if (exercise.expected.session_pitch_min) {
    const passed = agg.session_pitch_score >= exercise.expected.session_pitch_min;
    checks.push({ check: 'session_pitch_score', expected: `>=${exercise.expected.session_pitch_min}`, actual: agg.session_pitch_score, passed });
  }
  if (exercise.expected.session_timing_min) {
    const passed = agg.session_timing_score >= exercise.expected.session_timing_min;
    checks.push({ check: 'session_timing_score', expected: `>=${exercise.expected.session_timing_min}`, actual: agg.session_timing_score, passed });
  }
  if (exercise.expected.pass_rate_min) {
    const passed = agg.pass_rate >= exercise.expected.pass_rate_min;
    checks.push({ check: 'pass_rate', expected: `>=${exercise.expected.pass_rate_min}`, actual: agg.pass_rate, passed });
  }

  checks.push({ check: 'aggregation_valid', expected: 'total_events > 0', actual: agg.total_events, passed: agg.total_events > 0 });

  const scoresInRange = [agg.session_pitch_score, agg.session_timing_score, agg.session_silence_score, agg.session_stability_score].every(s => s >= 0 && s <= 1);
  checks.push({ check: 'scores_in_0_1_range', expected: 'all 0-1', actual: `pitch:${agg.session_pitch_score} timing:${agg.session_timing_score} silence:${agg.session_silence_score} stab:${agg.session_stability_score}`, passed: scoresInRange });

  if (exercise.expected.confidence_should_increase) {
    const mockState = { concept_id: exercise.concept, ownership_status: 'practicing', confidence: 0.50, attempts: 5, perception_events: 0 };
    const updated = applyPerceptionToState(mockState, agg, { conceptId: exercise.concept, sessionMode: 'solo', rawPackets: packets });
    const increased = updated.confidence > mockState.confidence;
    checks.push({ check: 'confidence_direction', expected: 'increase from 0.50', actual: `${mockState.confidence} → ${updated.confidence}`, passed: increased });
  }

  const allPassed = checks.every(c => c.passed);
  const icon = allPassed ? '✅' : '❌';
  console.log(`${icon} ${exercise.id} — ${exercise.name} (${exercise.concept})`);
  if (verbose || !allPassed) {
    for (const c of checks) {
      const ci = c.passed ? '  ✓' : '  ✗';
      console.log(`   ${ci} ${c.check}: expected ${c.expected}, got ${c.actual}`);
    }
  }

  return { id: exercise.id, concept: exercise.concept, name: exercise.name, passed: allPassed, checks, aggregation: agg };
}


// ============================================================
// NORMALIZATION LAYER TESTS
// ============================================================

function runNormalizationTests(verbose) {
  let passed = 0;
  let failed = 0;

  const tests = [
    { metric: 'cents_offset', source: 'pitch_engine', value: 0,   expected_min: 0.99, expected_max: 1.01, label: 'perfect pitch → 1.0' },
    { metric: 'cents_offset', source: 'pitch_engine', value: 10,  expected_min: 0.99, expected_max: 1.01, label: 'pass boundary → 1.0' },
    { metric: 'cents_offset', source: 'pitch_engine', value: -10, expected_min: 0.99, expected_max: 1.01, label: 'negative pass → 1.0' },
    { metric: 'cents_offset', source: 'pitch_engine', value: 25,  expected_min: -0.01, expected_max: 0.01, label: 'fail boundary → 0.0' },
    { metric: 'cents_offset', source: 'pitch_engine', value: 17,  expected_min: 0.40, expected_max: 0.60, label: 'midpoint → ~0.5' },
    { metric: 'onset_offset_ms', source: 'timing_engine', value: 0,    expected_min: 0.99, expected_max: 1.01, label: 'perfect timing → 1.0' },
    { metric: 'onset_offset_ms', source: 'timing_engine', value: 30,   expected_min: 0.99, expected_max: 1.01, label: 'pass boundary → 1.0' },
    { metric: 'onset_offset_ms', source: 'timing_engine', value: 80,   expected_min: -0.01, expected_max: 0.01, label: 'fail boundary → 0.0' },
    { metric: 'onset_offset_ms', source: 'timing_engine', value: 55,   expected_min: 0.40, expected_max: 0.60, label: 'midpoint → ~0.5' },
    { metric: 'rest_duration_accuracy', source: 'silence_engine', value: 0.90, expected_min: 0.99, expected_max: 1.01, label: 'good rest → 1.0' },
    { metric: 'rest_duration_accuracy', source: 'silence_engine', value: 0.50, expected_min: -0.01, expected_max: 0.01, label: 'bad rest → 0.0' },
    { metric: 'rest_duration_accuracy', source: 'silence_engine', value: 0.70, expected_min: 0.40, expected_max: 0.60, label: 'midpoint rest → ~0.5' },
    { metric: 'correct', source: 'note_event_engine', value: true,  expected_min: 0.99, expected_max: 1.01, label: 'correct → 1.0' },
    { metric: 'correct', source: 'note_event_engine', value: false, expected_min: -0.01, expected_max: 0.01, label: 'incorrect → 0.0' },
  ];

  for (const t of tests) {
    const packet = { metric_name: t.metric, value: t.value, source: t.source, confidence: 0.9 };
    const normalized = normalizePacketValue(packet);
    const ok = normalized >= t.expected_min && normalized <= t.expected_max;
    if (ok) passed++; else failed++;
    const icon = ok ? '✅' : '❌';
    if (verbose || !ok) {
      console.log(`  ${icon} ${t.label}: ${normalized.toFixed(3)} (expected ${t.expected_min}–${t.expected_max})`);
    }
  }

  console.log(`  → ${passed} passed, ${failed} failed`);
  return { passed, failed };
}


// ============================================================
// SESSION MODE TESTS
// ============================================================

function runSessionModeTests(verbose) {
  let passed = 0;
  let failed = 0;

  const borderlinePackets = [
    makePacket('pitch_engine', 'cents_offset', 5, 0.55),
    makePacket('pitch_engine', 'cents_offset', -3, 0.58),
    makePacket('pitch_engine', 'cents_offset', 7, 0.62),
    makePacket('timing_engine', 'onset_offset_ms', 10, 0.60),
  ];

  const soloAgg = aggregateSession(borderlinePackets, 'solo');
  const soloOk = soloAgg.total_events === 4;
  if (soloOk) passed++; else failed++;
  console.log(`  ${soloOk ? '✅' : '❌'} Solo mode: ${soloAgg.total_events} events pass gate (expected 4)`);

  const classroomAgg = aggregateSession(borderlinePackets, 'classroom');
  const classroomOk = classroomAgg.total_events === 0;
  if (classroomOk) passed++; else failed++;
  console.log(`  ${classroomOk ? '✅' : '❌'} Classroom mode: ${classroomAgg.total_events} events pass gate (expected 0)`);

  const modeTracked = soloAgg.session_mode === 'solo' && classroomAgg.session_mode === 'classroom';
  if (modeTracked) passed++; else failed++;
  console.log(`  ${modeTracked ? '✅' : '❌'} Session mode tracked in output: solo=${soloAgg.session_mode}, classroom=${classroomAgg.session_mode}`);

  console.log(`  → ${passed} passed, ${failed} failed`);
  return { passed, failed };
}


// ============================================================
// PROTECTED FIELD ENFORCEMENT TESTS
// ============================================================

function runProtectedFieldTests(verbose) {
  let passed = 0;
  let failed = 0;

  const allowedFields = ['confidence', 'trend', 'mistake_pattern', 'evidence_summary'];
  for (const field of allowedFields) {
    try {
      assertAllowedWrite(field);
      passed++;
      if (verbose) console.log(`  ✅ Allowed write: ${field}`);
    } catch (e) {
      failed++;
      console.log(`  ❌ Wrongly blocked allowed field: ${field}`);
    }
  }

  const protectedFields = ['curriculum_order', 'pilot_scope', 'diatonic_chord_map'];
  for (const field of protectedFields) {
    try {
      assertAllowedWrite(field);
      failed++;
      console.log(`  ❌ Failed to block protected field: ${field}`);
    } catch (e) {
      passed++;
      if (verbose) console.log(`  ✅ Blocked write to: ${field}`);
    }
  }

  console.log(`  → ${passed} passed, ${failed} failed`);
  return { passed, failed };
}


// ============================================================
// STATE WRITE INTEGRATION TESTS
// ============================================================

function runStateWriteTests(exercises, verbose) {
  let passed = 0;
  let failed = 0;

  const scalePackets = [
    ...(exercises.GTE_SCALE_01 ? exercises.GTE_SCALE_01.events : []),
    ...(exercises.GTE_SCALE_02 ? exercises.GTE_SCALE_02.events : []),
  ];
  const agg = aggregateSession(scalePackets, 'solo');

  const mockState = {
    concept_id: 'T_MAJOR_SCALE_PATTERN', ownership_status: 'practicing',
    confidence: 0.50, confidence_display: '50%', trend: 'stable',
    attempts: 5, perception_events: 30, mistake_pattern: null,
    feel_mode_history: { A_passed: false, B_passed: false, C_passed: false },
  };

  const updated = applyPerceptionToState(mockState, agg, {
    conceptId: 'T_MAJOR_SCALE_PATTERN', sessionMode: 'solo', rawPackets: scalePackets,
  });

  const attemptsOk = updated.attempts === 6;
  if (attemptsOk) passed++; else failed++;
  console.log(`  ${attemptsOk ? '✅' : '❌'} Attempts: ${mockState.attempts} → ${updated.attempts} (expected 6, one session increment)`);

  const eventsOk = updated.perception_events === (30 + agg.total_events);
  if (eventsOk) passed++; else failed++;
  console.log(`  ${eventsOk ? '✅' : '❌'} Perception events: ${mockState.perception_events} → ${updated.perception_events} (expected ${30 + agg.total_events})`);

  const confOk = updated.confidence >= 0 && updated.confidence <= 1;
  if (confOk) passed++; else failed++;
  console.log(`  ${confOk ? '✅' : '❌'} Confidence in range: ${updated.confidence}`);

  const confUpOk = updated.confidence > mockState.confidence;
  if (confUpOk) passed++; else failed++;
  console.log(`  ${confUpOk ? '✅' : '❌'} Confidence increased: ${mockState.confidence} → ${updated.confidence}`);

  const trendOk = ['improving', 'declining', 'stable'].includes(updated.trend);
  if (trendOk) passed++; else failed++;
  console.log(`  ${trendOk ? '✅' : '❌'} Trend valid: ${updated.trend}`);

  const rollingOk = Array.isArray(updated._rolling_history) && updated._rolling_history.length > 0;
  if (rollingOk) passed++; else failed++;
  console.log(`  ${rollingOk ? '✅' : '❌'} Rolling history persisted: ${JSON.stringify(updated._rolling_history)}`);

  const evidenceOk = typeof updated.evidence_summary === 'string' && updated.evidence_summary.includes('pitch:');
  if (evidenceOk) passed++; else failed++;
  console.log(`  ${evidenceOk ? '✅' : '❌'} Evidence summary with perception: ${updated.evidence_summary.substring(0, 80)}...`);

  const masteryOk = updated.mastery_ready === false;
  if (masteryOk) passed++; else failed++;
  console.log(`  ${masteryOk ? '✅' : '❌'} Mastery ready correctly false: ${updated.mastery_ready}`);

  const auditOk = Array.isArray(updated._write_audit) && updated._write_audit.length > 0;
  if (auditOk) passed++; else failed++;
  console.log(`  ${auditOk ? '✅' : '❌'} Write audit trail: ${updated._write_audit.length} entries`);

  const ownershipPack = checkOwnershipEvidence(updated, agg, { conceptId: 'T_MAJOR_SCALE_PATTERN' });
  const ownershipOk = ownershipPack === null;
  if (ownershipOk) passed++; else failed++;
  console.log(`  ${ownershipOk ? '✅' : '❌'} Ownership pack correctly null (no Feel Mode A/B): ${ownershipPack === null}`);

  console.log(`  → ${passed} passed, ${failed} failed`);
  return { passed, failed };
}


// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
if (args.length > 0 || process.argv[1]?.includes('golden_test_harness')) {
  const verbose = args.includes('--verbose') || args.includes('-v');
  const exerciseFlag = args.indexOf('--exercise');
  const exerciseId = exerciseFlag >= 0 ? args[exerciseFlag + 1] : null;
  runBenchmark(exerciseId, verbose);
}

export { GOLDEN_EXERCISES, runBenchmark };
