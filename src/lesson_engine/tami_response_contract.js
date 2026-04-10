/**
 * ============================================================
 * T.A.M.i RESPONSE CONTRACT v1.0
 * ============================================================
 *
 * Strict schema validator for Claude API responses before they
 * enter the lesson engine. LLMs can hallucinate fields, return
 * wrong types, or produce malformed JSON. This file catches all
 * of that.
 *
 * Every Claude response MUST pass this validator before the
 * intelligence layer's mergeResponse() processes it.
 *
 * Required response shape (from Motesart_COWORK_Handoff.md):
 * {
 *   role:                string  — 'assistant' | 'encourager' | 'explainer' | 'summarizer'
 *   message:             string  — The actual text Claude generates
 *   focus_area:          string  — Concept or skill being addressed
 *   next_action:         string  — 'rephrase' | 'encourage' | 'skip_ahead' | 'slow_down' | 'summarize' | 'none'
 *   tone_tag:            string  — 'warm' | 'excited' | 'calm' | 'serious' | 'playful'
 *   rapport_stage:       string  — 'new' | 'building' | 'established' | 'trusted'
 *   confidence_flag:     string  — 'rising' | 'stable' | 'falling' | 'critical'
 *   delivery_timing:     string  — 'immediate' | 'after_pause' | 'after_celebration'
 *   objective_alignment: string  — Which lesson goal this response serves
 * }
 *
 * ============================================================
 */

class TAMiResponseContract {

  constructor() {
    // ---- Valid enum values ----
    this.VALID_ROLES = ['assistant', 'encourager', 'explainer', 'summarizer'];
    this.VALID_ACTIONS = ['rephrase', 'encourage', 'skip_ahead', 'slow_down', 'summarize', 'none'];
    this.VALID_TONES = ['warm', 'excited', 'calm', 'serious', 'playful'];
    this.VALID_RAPPORT = ['new', 'building', 'established', 'trusted'];
    this.VALID_CONFIDENCE_FLAGS = ['rising', 'stable', 'falling', 'critical'];
    this.VALID_TIMING = ['immediate', 'after_pause', 'after_celebration'];

    // ---- Content safety limits ----
    this.MAX_MESSAGE_LENGTH = 500;   // Characters. Motesart speaks concisely.
    this.MIN_MESSAGE_LENGTH = 5;     // Must say something meaningful.
  }

  // ============================================================
  // PRIMARY VALIDATION
  // ============================================================

  /**
   * Validate a Claude API response against the contract.
   *
   * @param {Object|string} response - Raw response from Claude (may be string JSON)
   * @returns {Object} { valid: boolean, data: Object|null, errors: string[], warnings: string[] }
   */
  validate(response) {
    const result = {
      valid: true,
      data: null,
      errors: [],
      warnings: [],
    };

    // ---- Step 1: Parse if string ----
    let parsed;
    if (typeof response === 'string') {
      try {
        parsed = JSON.parse(response);
      } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1]);
          } catch (e2) {
            result.valid = false;
            result.errors.push(`Response is not valid JSON: ${e.message}`);
            return result;
          }
        } else {
          result.valid = false;
          result.errors.push(`Response is not valid JSON and no code block found: ${e.message}`);
          return result;
        }
      }
    } else if (typeof response === 'object' && response !== null) {
      parsed = response;
    } else {
      result.valid = false;
      result.errors.push(`Response must be an object or JSON string, got: ${typeof response}`);
      return result;
    }

    // ---- Step 2: Required fields ----
    const requiredFields = [
      'role', 'message', 'focus_area', 'next_action',
      'tone_tag', 'rapport_stage', 'confidence_flag',
      'delivery_timing', 'objective_alignment'
    ];

    requiredFields.forEach(field => {
      if (!(field in parsed)) {
        result.errors.push(`Missing required field: "${field}"`);
      }
    });

    // If any required fields missing, stop here
    if (result.errors.length > 0) {
      result.valid = false;
      return result;
    }

    // ---- Step 3: Type checks ----
    requiredFields.forEach(field => {
      if (typeof parsed[field] !== 'string') {
        result.errors.push(`Field "${field}" must be a string, got: ${typeof parsed[field]}`);
      }
    });

    if (result.errors.length > 0) {
      result.valid = false;
      return result;
    }

    // ---- Step 4: Enum validation ----
    this._checkEnum(parsed, 'role', this.VALID_ROLES, result);
    this._checkEnum(parsed, 'next_action', this.VALID_ACTIONS, result);
    this._checkEnum(parsed, 'tone_tag', this.VALID_TONES, result);
    this._checkEnum(parsed, 'rapport_stage', this.VALID_RAPPORT, result);
    this._checkEnum(parsed, 'confidence_flag', this.VALID_CONFIDENCE_FLAGS, result);
    this._checkEnum(parsed, 'delivery_timing', this.VALID_TIMING, result);

    // ---- Step 5: Message content checks ----
    if (parsed.message.length > this.MAX_MESSAGE_LENGTH) {
      result.warnings.push(
        `Message is ${parsed.message.length} chars (max ${this.MAX_MESSAGE_LENGTH}). Will be truncated.`
      );
      parsed.message = parsed.message.substring(0, this.MAX_MESSAGE_LENGTH);
    }

    if (parsed.message.length < this.MIN_MESSAGE_LENGTH) {
      result.errors.push(`Message is too short (${parsed.message.length} chars, min ${this.MIN_MESSAGE_LENGTH}).`);
    }

    // ---- Step 6: Safety checks ----
    // No student names should appear (privacy)
    // No references to being an AI / LLM (breaks Motesart persona)
    const unsafePatterns = [
      /\bI(?:'m| am) an? (?:AI|language model|LLM|chatbot|assistant)\b/i,
      /\bClaude\b/i,
      /\bAnthrop/i,
      /\bas an AI\b/i,
    ];

    unsafePatterns.forEach(pattern => {
      if (pattern.test(parsed.message)) {
        result.warnings.push(
          `Message contains AI self-reference matching: ${pattern}. This breaks the Motesart persona.`
        );
      }
    });

    // ---- Step 7: focus_area and objective_alignment are free-text ----
    // No strict validation, but warn if empty
    if (parsed.focus_area.trim() === '') {
      result.warnings.push('focus_area is empty.');
    }
    if (parsed.objective_alignment.trim() === '') {
      result.warnings.push('objective_alignment is empty.');
    }

    // ---- Result ----
    if (result.errors.length > 0) {
      result.valid = false;
    } else {
      result.data = parsed;
    }

    return result;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Check if a field value is in the allowed enum set.
   * Errors make the response invalid; warnings are logged but allowed.
   */
  _checkEnum(obj, field, validValues, result) {
    if (!validValues.includes(obj[field])) {
      // Try to fuzzy-match (case-insensitive)
      const lower = obj[field].toLowerCase().trim();
      const match = validValues.find(v => v === lower);
      if (match) {
        // Auto-fix case
        obj[field] = match;
        result.warnings.push(`Field "${field}" had wrong case "${obj[field]}", auto-corrected to "${match}".`);
      } else {
        result.errors.push(
          `Invalid "${field}": "${obj[field]}". Must be one of: ${validValues.join(', ')}`
        );
      }
    }
  }

  /**
   * Create a minimal valid response for testing.
   */
  static createTestResponse(overrides = {}) {
    return {
      role: 'encourager',
      message: "You're doing great — keep going!",
      focus_area: 'C_MAJSCALE',
      next_action: 'encourage',
      tone_tag: 'warm',
      rapport_stage: 'building',
      confidence_flag: 'stable',
      delivery_timing: 'immediate',
      objective_alignment: 'Build student confidence with C major scale',
      ...overrides
    };
  }

  /**
   * Create the prompt instruction that tells Claude what shape to return.
   * This is sent as part of the system prompt by the backend.
   */
  static getResponseSchemaPrompt() {
    return `You MUST respond with a single JSON object. No explanation, no markdown, no extra text — ONLY the JSON object.

Required fields:
{
  "role": "assistant" | "encourager" | "explainer" | "summarizer",
  "message": "Your response text (max 500 chars, speak as Motesart the piano coach — never mention AI or Claude)",
  "focus_area": "The concept or skill this response addresses (e.g. C_MAJSCALE, C_FINGERS)",
  "next_action": "rephrase" | "encourage" | "skip_ahead" | "slow_down" | "summarize" | "none",
  "tone_tag": "warm" | "excited" | "calm" | "serious" | "playful",
  "rapport_stage": "new" | "building" | "established" | "trusted",
  "confidence_flag": "rising" | "stable" | "falling" | "critical",
  "delivery_timing": "immediate" | "after_pause" | "after_celebration",
  "objective_alignment": "Which lesson goal this response serves"
}

Rules:
- You ARE Motesart, a friendly piano coach. Never break character.
- Keep messages concise and encouraging.
- Match the tone_tag to the student's emotional state.
- The confidence_flag should reflect the student's current trajectory.
- next_action tells the system what to do with your response.`;
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiResponseContract };
} else if (typeof window !== 'undefined') {
  window.TAMiResponseContract = TAMiResponseContract;
}

export { TAMiResponseContract };
