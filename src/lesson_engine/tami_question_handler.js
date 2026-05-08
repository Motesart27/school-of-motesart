/**
 * ============================================================
 * T.A.M.i QUESTION HANDLER v1.0
 * ============================================================
 *
 * Detects when a student asks a question during a lesson and
 * provides an intelligent response that acknowledges the question
 * then steers the student back to the current lesson material.
 *
 * Architecture:
 *   Student types/speaks something
 *       │
 *       ▼
 *   Question Handler
 *       │
 *       ├── Is it a question? → classify it
 *       │       │
 *       │       ├── Lesson-related? → deterministic answer from knowledge base
 *       │       │
 *       │       ├── Music-related but off-topic? → brief answer + redirect
 *       │       │
 *       │       └── Non-music? → acknowledge + warm redirect
 *       │
 *       └── Not a question → return null (let normal flow handle it)
 *
 * Motesart ALWAYS answers as a warm, knowledgeable teacher.
 * Never dismissive. Always acknowledges the curiosity.
 * Then gently steers back to the lesson.
 *
 * ============================================================
 */

class TAMiQuestionHandler {

  constructor(config = {}) {
    this.config = {
      // If confidence in question detection is below this, don't intercept
      detectionThreshold: 0.5,
      // Max response length (characters)
      maxResponseLength: 300,
      ...config,
    };

    // ── Question detection patterns ──
    // These patterns identify whether user input is a question
    this._questionPatterns = [
      /^(what|who|where|when|why|how|can|could|would|should|is|are|was|were|do|does|did|will|shall|may|might)\b/i,
      /\?\s*$/,                           // ends with ?
      /^(tell me|explain|show me|help me|i don't understand|i dont understand|what's|whats|what is)/i,
      /^(can you|could you|would you|please)\b/i,
      /^(i have a question|question:|quick question)/i,
      /^(i'm confused|im confused|i'm lost|im lost|i don't get|i dont get)/i,
    ];

    // ── Lesson concept knowledge base ──
    // Maps concept keywords to deterministic answers.
    // These are the answers Motesart gives WITHOUT calling Claude.
    this._knowledgeBase = {
      // C_KEYBOARD — Piano keyboard layout
      keyboard: {
        patterns: [/keyboard|piano keys|keys on|how many keys|layout|black.*(key|note)|white.*(key|note)/i],
        answer: "Great question! A standard piano has 88 keys — 52 white and 36 black. The white keys are the natural notes (A through G), and the black keys are sharps and flats. The pattern of black keys in groups of 2 and 3 repeats all the way up. That's actually what we're exploring right now!",
        concept: 'C_KEYBOARD',
        visual: 'numbered_keyboard',
      },
      middle_c: {
        patterns: [/middle c|where.*(is|find).*c|which.*c/i],
        answer: "Middle C is the C note closest to the center of the piano — it sits just to the left of the group of 2 black keys near the middle. It's the home base for a lot of what we learn. Let me show you exactly where it is.",
        concept: 'C_KEYBOARD',
        visual: 'keyboard_middle_c_arrow',
      },

      // C_HALFWHOLE — Half and whole steps
      half_step: {
        patterns: [/half\s*step|semitone|half\s*tone/i],
        answer: "A half step is the smallest distance between two notes on a piano — it's the very next key, whether that's white to black or white to white (like E to F). Two half steps make a whole step. This is one of the building blocks of scales!",
        concept: 'C_HALFWHOLE',
        visual: 'half_step_demo',
      },
      whole_step: {
        patterns: [/whole\s*step|whole\s*tone|two\s*half/i],
        answer: "A whole step is two half steps — so you skip one key in between. For example, C to D is a whole step because there's a black key (C#) between them. Whole steps and half steps together create the pattern for every scale!",
        concept: 'C_HALFWHOLE',
        visual: 'whole_step_demo',
      },

      // C_MAJSCALE — Major scale formula
      major_scale: {
        patterns: [/major\s*scale|scale\s*formula|scale\s*pattern|W\s*W\s*H|whole.*whole.*half/i],
        answer: "The major scale follows a specific pattern of whole and half steps: W-W-H-W-W-W-H. That's Whole, Whole, Half, Whole, Whole, Whole, Half. Every major scale in every key uses this exact same pattern. It's like a recipe!",
        concept: 'C_MAJSCALE',
        visual: 'scale_pattern_overlay',
      },

      // C_CMAJOR — C Major specifically
      c_major: {
        patterns: [/c\s*major|key\s*of\s*c|c\s*scale/i],
        answer: "C Major is the friendliest scale to start with because it uses only white keys: C, D, E, F, G, A, B, C. It follows the major scale pattern perfectly, and it's what we're working on right now!",
        concept: 'C_CMAJOR',
        visual: 'cmaj_ascending_labeled',
      },

      // C_FINGERS — Finger numbering
      fingers: {
        patterns: [/finger\s*(number|position)|which\s*finger|thumb|fingering|hand\s*position/i],
        answer: "In piano, your fingers are numbered 1 through 5. Your thumb is always 1, index finger is 2, middle is 3, ring is 4, and pinky is 5. This numbering is the same for both hands. For C Major, you start with your thumb on C!",
        concept: 'C_FINGERS',
        visual: 'finger_map_numbered',
      },

      // C_OCTAVE — Octave concept
      octave: {
        patterns: [/octave|8\s*notes|same\s*note.*higher|same\s*note.*lower/i],
        answer: "An octave is the distance between one note and the next note with the same name — like from C up to the next C. It spans 8 note names (that's where 'oct' comes from, like octopus!). The two notes sound alike, just one is higher.",
        concept: 'C_OCTAVE',
        visual: 'numbered_keyboard',
      },

      // General music questions
      sharp: {
        patterns: [/sharp|♯|what.*#/i],
        answer: "A sharp (♯) raises a note by one half step — so C♯ is the black key just to the right of C. Sharps and flats are how we name those black keys. We'll explore them more as we go, but for now, our C Major scale keeps things simple with just white keys!",
        concept: null,
        visual: null,
      },
      flat: {
        patterns: [/flat|♭|what.*b\b/i],
        answer: "A flat (♭) lowers a note by one half step — so B♭ is the black key just to the left of B. It's the opposite of a sharp. In C Major we don't use any flats or sharps, which is why it's such a great scale to start with!",
        concept: null,
        visual: null,
      },
      chord: {
        patterns: [/chord|triad|harmony/i],
        answer: "A chord is when you play multiple notes at the same time — usually 3 or more. They create harmony! We'll get to chords soon, but first let's make sure we're solid on the scale. Chords are actually built from scale notes, so this is the perfect foundation.",
        concept: null,
        visual: null,
      },
      practice: {
        patterns: [/how.*practice|practice\s*tip|how\s*long.*practice|how\s*often/i],
        answer: "Great that you're thinking about practice! Even 10-15 minutes a day is better than one long session a week. The key is consistency. And what we're doing right now? This IS practice — you're building muscle memory with every note you play.",
        concept: null,
        visual: null,
      },
      reading_music: {
        patterns: [/read\s*music|sheet\s*music|music\s*notation|treble|bass\s*clef|staff|stave/i],
        answer: "Reading music is a wonderful skill we'll build over time! Sheet music uses a staff (five lines) with notes placed on or between the lines to show pitch and rhythm. For now, we're focusing on knowing the keyboard and the C Major scale — that'll make reading music much easier when we get there.",
        concept: null,
        visual: null,
      },
    };

    // ── Redirect phrases ──
    // Used to steer the conversation back to the lesson
    this._redirectPhrases = {
      lesson_related: [
        "Let's keep building on that —",
        "Now that we've got that covered —",
        "Good thinking! Back to where we were —",
      ],
      music_related: [
        "That's a great topic for later! For now, let's focus on",
        "We'll definitely get there! But first, let's nail",
        "Love the curiosity! Let's finish up with",
      ],
      off_topic: [
        "Ha, I like the way you think! But let's get back to the music —",
        "I appreciate the curiosity! Right now though, let's focus on",
        "That's interesting! But Motesart's specialty is piano, so let's get back to",
      ],
    };

    // ── Confusion responses ──
    // When student expresses confusion rather than asking a question
    this._confusionResponses = [
      "No worries at all — let me explain that differently.",
      "Totally okay to feel that way. Let's take another look at this.",
      "That's completely normal at this stage. Let me show you again from a different angle.",
      "Hey, the fact that you're saying that means you're paying attention. Let me help.",
    ];
  }

  // ============================================================
  // PRIMARY DETECTION
  // ============================================================

  /**
   * Process student input to check if it's a question.
   *
   * @param {string} text - What the student typed or said
   * @param {Object} lessonContext - Current lesson state
   * @param {string} lessonContext.currentConcept - The concept being taught
   * @param {string} lessonContext.currentPhase - The lesson phase
   * @param {number} lessonContext.momentIndex - How far into the lesson
   * @returns {Object|null} - Response object or null if not a question
   *   {
   *     isQuestion: boolean,
   *     category: 'lesson_related' | 'music_related' | 'off_topic' | 'confusion',
   *     response: string,         // What Motesart should say
   *     visual: string|null,      // Visual asset to show (if any)
   *     concept: string|null,     // Related concept
   *     redirect: string,         // Phrase to steer back to lesson
   *     confidence: number,       // How confident we are this is a question (0-1)
   *   }
   */
  detect(text, lessonContext = {}) {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (trimmed.length < 2) return null;

    // Step 1: Is this a question or expression of confusion?
    const questionConfidence = this._getQuestionConfidence(trimmed);
    const isConfusion = this._isConfusion(trimmed);

    if (questionConfidence < this.config.detectionThreshold && !isConfusion) {
      return null; // Not a question — let normal lesson flow handle it
    }

    // Step 2: Classify the question
    if (isConfusion) {
      return this._handleConfusion(trimmed, lessonContext);
    }

    // Step 3: Check knowledge base for a match
    const kbMatch = this._matchKnowledgeBase(trimmed);
    if (kbMatch) {
      return this._buildKBResponse(kbMatch, lessonContext);
    }

    // Step 4: Is it music-related but not in our KB?
    if (this._isMusicRelated(trimmed)) {
      return this._buildGenericMusicResponse(trimmed, lessonContext);
    }

    // Step 5: Off-topic question
    return this._buildOffTopicResponse(trimmed, lessonContext);
  }

  // ============================================================
  // QUESTION CONFIDENCE
  // ============================================================

  _getQuestionConfidence(text) {
    let confidence = 0;
    const lower = text.toLowerCase();

    // Check each pattern
    for (const pattern of this._questionPatterns) {
      if (pattern.test(lower)) {
        confidence += 0.3;
      }
    }

    // Boost for question mark
    if (text.includes('?')) confidence += 0.3;

    // Boost for question words at start
    if (/^(what|why|how|when|where|who|can|is|are|do|does)\b/i.test(lower)) {
      confidence += 0.2;
    }

    // Boost for longer text (short = likely just a response word)
    if (text.split(/\s+/).length >= 4) confidence += 0.1;

    return Math.min(1, confidence);
  }

  _isConfusion(text) {
    const lower = text.toLowerCase();
    const confusionPatterns = [
      /i('m| am)\s*(confused|lost|stuck)/i,
      /i\s*don'?t\s*(understand|get|know)/i,
      /what\s*(do\s*you\s*mean|does\s*that\s*mean)/i,
      /can\s*you\s*(repeat|say\s*that\s*again|explain\s*again)/i,
      /huh\??/i,
      /^(confused|lost|stuck|help)\s*\??$/i,
      /that\s*doesn'?t\s*make\s*sense/i,
      /i('m| am)\s*not\s*(sure|following)/i,
    ];
    return confusionPatterns.some(p => p.test(lower));
  }

  // ============================================================
  // KNOWLEDGE BASE MATCHING
  // ============================================================

  _matchKnowledgeBase(text) {
    const lower = text.toLowerCase();

    for (const [key, entry] of Object.entries(this._knowledgeBase)) {
      for (const pattern of entry.patterns) {
        if (pattern.test(lower)) {
          return { key, ...entry };
        }
      }
    }
    return null;
  }

  _isMusicRelated(text) {
    const musicTerms = /note|key|scale|piano|music|play|song|melody|rhythm|tempo|beat|rest|clef|staff|chord|tune|pitch|tone|sound|instrument|compose|harmony|minor|major/i;
    return musicTerms.test(text);
  }

  // ============================================================
  // RESPONSE BUILDERS
  // ============================================================

  _handleConfusion(text, context) {
    const response = this._randomPick(this._confusionResponses);
    const currentConcept = context.currentConcept || null;

    // If we know the current concept, add context-specific help
    let visual = null;
    let conceptHint = '';
    if (currentConcept) {
      const conceptVisuals = this._getConceptVisual(currentConcept);
      visual = conceptVisuals.visual;
      conceptHint = ` Let me show you ${conceptVisuals.label} one more time.`;
    }

    return {
      isQuestion: true,
      category: 'confusion',
      response: response + conceptHint,
      visual,
      concept: currentConcept,
      redirect: null, // No redirect needed — we're helping with current material
      confidence: 0.9,
    };
  }

  _buildKBResponse(match, context) {
    const isCurrentConcept = match.concept && match.concept === context.currentConcept;

    let redirect = null;
    if (!isCurrentConcept && match.concept) {
      // The question is about a different concept — answer and redirect
      redirect = this._randomPick(this._redirectPhrases.lesson_related);
    }

    return {
      isQuestion: true,
      category: 'lesson_related',
      response: match.answer,
      visual: match.visual,
      concept: match.concept,
      redirect,
      confidence: 0.95,
    };
  }

  _buildGenericMusicResponse(text, context) {
    const redirect = this._randomPick(this._redirectPhrases.music_related);
    const currentLabel = this._getCurrentConceptLabel(context.currentConcept);

    return {
      isQuestion: true,
      category: 'music_related',
      response: `That's a really thoughtful question! We'll get into that in a future lesson. ${redirect} ${currentLabel} — it's going to make everything else click.`,
      visual: null,
      concept: null,
      redirect,
      confidence: 0.7,
    };
  }

  _buildOffTopicResponse(text, context) {
    const redirect = this._randomPick(this._redirectPhrases.off_topic);
    const currentLabel = this._getCurrentConceptLabel(context.currentConcept);

    return {
      isQuestion: true,
      category: 'off_topic',
      response: `${redirect} ${currentLabel}. We've got some cool stuff coming up!`,
      visual: null,
      concept: null,
      redirect,
      confidence: 0.6,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  _getConceptVisual(concept) {
    const map = {
      'C_KEYBOARD': { visual: 'numbered_keyboard', label: 'the keyboard layout' },
      'C_HALFWHOLE': { visual: 'half_step_demo', label: 'half and whole steps' },
      'C_MAJSCALE': { visual: 'scale_pattern_overlay', label: 'the major scale pattern' },
      'C_CMAJOR': { visual: 'cmaj_ascending_labeled', label: 'the C Major scale' },
      'C_FINGERS': { visual: 'finger_map_numbered', label: 'the finger numbers' },
      'C_OCTAVE': { visual: 'numbered_keyboard', label: 'the octave' },
    };
    return map[concept] || { visual: null, label: 'what we were working on' };
  }

  _getCurrentConceptLabel(concept) {
    const labels = {
      'C_KEYBOARD': 'the keyboard layout',
      'C_HALFWHOLE': 'half and whole steps',
      'C_MAJSCALE': 'the major scale formula',
      'C_CMAJOR': 'the C Major scale',
      'C_FINGERS': 'finger positioning',
      'C_OCTAVE': 'octaves',
    };
    return labels[concept] || 'what we were working on';
  }

  _randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ============================================================
  // ESCALATION CHECK
  // ============================================================

  /**
   * Determine if this question should be escalated to Claude
   * for a more personalized, contextual answer.
   *
   * Escalation triggers:
   *   - Very long question (likely complex)
   *   - Multiple topics in one question
   *   - 3+ questions in a row (student is very curious/stuck)
   *   - Question references something personal ("I play guitar too")
   *
   * @param {string} text
   * @param {Object} questionHistory - Array of recent questions
   * @returns {boolean}
   */
  shouldEscalate(text, questionHistory = []) {
    // Long question = complex
    if (text.split(/\s+/).length > 20) return true;

    // 3+ recent questions = student needs more help
    if (questionHistory.length >= 3) return true;

    // Personal references
    if (/i (play|have|know|learned|took|studied)/i.test(text)) return true;

    // Emotional content
    if (/frustrated|annoyed|bored|hate|hard|difficult|impossible|give up/i.test(text)) return true;

    return false;
  }
}

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiQuestionHandler };
} else if (typeof window !== 'undefined') {
  window.TAMiQuestionHandler = TAMiQuestionHandler;
}

export { TAMiQuestionHandler };
