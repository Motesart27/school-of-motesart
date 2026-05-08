/**
 * ============================================================
 * PERCEPTION SHIM v1.0
 * ============================================================
 *
 * Temporary bridge that converts the existing evaluation data
 * (correct/wrong from tami_state_manager.js) into perception
 * packets that the perception_state_adapter can consume.
 *
 * WHY THIS EXISTS:
 *   The perception adapter expects packets from a real audio
 *   perception pipeline (pitch_engine, timing_engine, etc.).
 *   That pipeline doesn't exist yet. But the existing lesson
 *   engine already produces evaluation results (correct/wrong,
 *   response times, concept attempts). This shim converts
 *   those results into perception-compatible packets so the
 *   adapter can run NOW, before the audio pipeline is built.
 *
 * WHEN TO REMOVE:
 *   When real Signal Capture → Musical Analysis → Interpretation
 *   layers are deployed and producing actual perception packets.
 *   At that point, bypass this shim entirely.
 *
 * Governed by: sensing_perception_stack_spec.md
 * ============================================================
 */

import { computeConfidence } from './perception_state_adapter.js';


/**
 * Convert a single evaluation result (from tami_state_manager.updateEvaluation)
 * into an array of perception packets.
 *
 * @param {Object} evalResult
 * @param {boolean} evalResult.correct - Was the answer correct
 * @param {string}  evalResult.conceptId - Which concept was tested
 * @param {number}  evalResult.responseTimeMs - How long the student took (ms)
 * @param {string}  evalResult.momentPhase - Current lesson phase
 * @param {Object}  [evalResult.extra] - Optional extra data
 * @returns {Array} Array of perception packets
 */
export function evaluationToPackets(evalResult) {
  const packets = [];
  const ts = new Date().toISOString();

  // Base confidence — fixed at 0.75 since we have no real signal quality.
  // This is above the solo gate (0.50) but below the classroom gate (0.65 → won't count there).
  const confidence = computeConfidence({
    baseSignalQuality: 0.75,
    calibrationFactor: 1.0,
    durationFactor: 1.0,
    noisePenalty: 1.0,
    sourceBonus: 1.0,
  });

  // 1. Note correctness → note_event_engine packet
  packets.push({
    metric_name: 'correct',
    value: !!evalResult.correct,
    confidence,
    timestamp: ts,
    source: 'note_event_engine',
    severity: evalResult.correct ? 'info' : 'warning',
    recommended_interpretation: evalResult.correct ? 'pitch_confident' : 'pitch_drift',
  });

  // 2. Response time → timing_engine packet (convert ms to onset offset estimate)
  if (typeof evalResult.responseTimeMs === 'number') {
    // Treat fast responses (< 2s) as on-time, slower as late
    const idealResponseMs = 2000;
    const offsetMs = evalResult.responseTimeMs - idealResponseMs;
    const clampedOffset = Math.max(-80, Math.min(80, offsetMs / 10)); // scale down

    packets.push({
      metric_name: 'onset_offset_ms',
      value: clampedOffset,
      confidence: confidence * 0.9, // slightly less confident for derived timing
      timestamp: ts,
      source: 'timing_engine',
      severity: Math.abs(clampedOffset) <= 30 ? 'info' : 'warning',
      recommended_interpretation: clampedOffset > 30 ? 'late_entry' : (clampedOffset < -30 ? 'rushed_entry' : 'timing_locked'),
    });
  }

  // 3. If extra engagement data exists
  if (evalResult.extra?.hesitation) {
    packets.push({
      metric_name: 'engagement_sustained',
      value: 0,
      confidence: 0.60,
      timestamp: ts,
      source: 'engagement_module',
      severity: 'warning',
      recommended_interpretation: 'engagement_drop',
    });
  }

  return packets;
}


/**
 * Convert a batch of evaluation results (e.g., from a full session)
 * into a flat array of perception packets ready for aggregateSession().
 *
 * @param {Array} evalResults - Array of evaluation result objects
 * @returns {Array} Flat array of perception packets
 */
export function sessionToPackets(evalResults) {
  const allPackets = [];
  for (const result of evalResults) {
    allPackets.push(...evaluationToPackets(result));
  }
  return allPackets;
}


/**
 * One-shot helper: evaluate + aggregate + apply in one call.
 * Use this from the lesson orchestrator to get updated state.
 *
 * @param {Array} evalResults - Array of evaluation results from this session
 * @param {Object} currentState - Current Concept_State
 * @param {Object} options - Options for applyPerceptionToState
 * @returns {Object} { packets, aggregation, updatedState }
 */
export async function processSessionEvaluations(evalResults, currentState, options = {}) {
  // Dynamic import to avoid circular deps at module load
  const { aggregateSession, applyPerceptionToState } = await import('./perception_state_adapter.js');

  const packets = sessionToPackets(evalResults);
  const aggregation = aggregateSession(packets, options.sessionMode || 'solo');
  const updatedState = applyPerceptionToState(currentState, aggregation, {
    ...options,
    rawPackets: packets,
  });

  return { packets, aggregation, updatedState };
}


export default {
  evaluationToPackets,
  sessionToPackets,
  processSessionEvaluations,
};
