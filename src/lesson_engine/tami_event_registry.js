/**
 * ============================================================
 * T.A.M.i EVENT REGISTRY v1.0
 * ============================================================
 *
 * Single source of truth for all event names exchanged between
 * the Lesson Engine, Orchestrator, Intelligence Layer, and Bridge.
 *
 * Import this everywhere. Never hardcode event strings.
 *
 * ============================================================
 */

const TAMI_EVENTS = {

  // ---- Engine Events (emitted by MotesartLessonEngine) ----
  // These already exist in the engine. Listed here for reference
  // so the intelligence layer can subscribe to them.

  MOMENT_ENTER:        'moment:enter',
  MOMENT_EXIT:         'moment:exit',
  DIALOGUE_START:      'dialogue:start',
  DIALOGUE_END:        'dialogue:end',
  VISUAL_RENDER:       'visual:render',
  VISUAL_CLEAR:        'visual:clear',
  SOUND_PLAY:          'sound:play',
  ACTION_WAITING:      'action:waiting',
  ACTION_RECEIVED:     'action:received',
  ACTION_EVALUATED:    'action:evaluated',
  CONFIDENCE_UPDATE:   'confidence:update',
  WYL_UPDATE:          'wyl:update',
  WYL_ADAPT:           'wyl:adapt',
  DPM_UPDATE:          'dpm:update',
  BRANCH_RESOLVE:      'branch:resolve',
  TELEMETRY_LOG:       'telemetry:log',
  GAME_TRIGGER:        'game:trigger',
  GAME_COMPLETE:       'game:complete',
  LESSON_START:        'lesson:start',
  LESSON_COMPLETE:     'lesson:complete',
  LESSON_PAUSED:       'lesson:paused',
  LESSON_RESUMED:      'lesson:resumed',
  STATE_CHANGE:        'state:change',
  DEBUG_LOG:           'debug:log',
  ERROR:               'error',

  // ---- T.A.M.i Intelligence Events (new) ----
  // Emitted by the intelligence layer when it detects states
  // that may warrant AI enhancement.

  TAMI_STRUGGLE_DETECTED:     'tami:struggle_detected',
  TAMI_ENGAGEMENT_DROP:       'tami:engagement_drop',
  TAMI_MILESTONE_REACHED:     'tami:milestone_reached',
  TAMI_AI_REQUEST:            'tami:ai_request',
  TAMI_AI_RESPONSE:           'tami:ai_response',
  TAMI_AI_FALLBACK:           'tami:ai_fallback',
  TAMI_AI_ERROR:              'tami:ai_error',
  TAMI_DIALOGUE_OVERRIDE:     'tami:dialogue_override',
  TAMI_BRANCH_SUGGESTION:     'tami:branch_suggestion',
  TAMI_ENCOURAGEMENT_INJECT:  'tami:encouragement_inject',
  TAMI_LESSON_SUMMARY:        'tami:lesson_summary',

  // ---- Bridge Events (coordination) ----
  // Emitted by the bridge to coordinate between the intelligence
  // layer and the orchestrator/UI.

  BRIDGE_CONNECTED:     'bridge:connected',
  BRIDGE_DISCONNECTED:  'bridge:disconnected',
  BRIDGE_AI_PENDING:    'bridge:ai_pending',
  BRIDGE_AI_COMPLETE:   'bridge:ai_complete',
};

/**
 * Event categories — useful for filtering in debug/telemetry
 */
const EVENT_CATEGORIES = {
  ENGINE:       ['moment:enter', 'moment:exit', 'dialogue:start', 'dialogue:end',
                 'visual:render', 'visual:clear', 'sound:play', 'action:waiting',
                 'action:received', 'action:evaluated', 'confidence:update',
                 'wyl:update', 'wyl:adapt', 'dpm:update', 'branch:resolve',
                 'telemetry:log', 'game:trigger', 'game:complete',
                 'lesson:start', 'lesson:complete', 'lesson:paused', 'lesson:resumed'],
  TAMI:         ['tami:struggle_detected', 'tami:engagement_drop', 'tami:milestone_reached',
                 'tami:ai_request', 'tami:ai_response', 'tami:ai_fallback', 'tami:ai_error',
                 'tami:dialogue_override', 'tami:branch_suggestion',
                 'tami:encouragement_inject', 'tami:lesson_summary'],
  BRIDGE:       ['bridge:connected', 'bridge:disconnected', 'bridge:ai_pending', 'bridge:ai_complete'],
  SYSTEM:       ['state:change', 'debug:log', 'error'],
};

/**
 * AI trigger events — only these events can cause a Claude API call.
 * Everything else is handled deterministically.
 */
const AI_TRIGGER_EVENTS = [
  'tami:struggle_detected',
  'tami:engagement_drop',
  'tami:milestone_reached',
  'lesson:complete',
];

/**
 * Required fields for the T.A.M.i AI response contract.
 * See tami_response_contract.js for full validation.
 */
const TAMI_RESPONSE_FIELDS = [
  'role',
  'message',
  'focus_area',
  'next_action',
  'tone_tag',
  'rapport_stage',
  'confidence_flag',
  'delivery_timing',
  'objective_alignment',
];

// ---- Exports ----
// Works in browser (window), Node.js (module.exports), and ES modules (export)

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMI_EVENTS, EVENT_CATEGORIES, AI_TRIGGER_EVENTS, TAMI_RESPONSE_FIELDS };
} else if (typeof window !== 'undefined') {
  window.TAMI_EVENTS = TAMI_EVENTS;
  window.EVENT_CATEGORIES = EVENT_CATEGORIES;
  window.AI_TRIGGER_EVENTS = AI_TRIGGER_EVENTS;
  window.TAMI_RESPONSE_FIELDS = TAMI_RESPONSE_FIELDS;
}

export { TAMI_EVENTS, EVENT_CATEGORIES, AI_TRIGGER_EVENTS, TAMI_RESPONSE_FIELDS };
