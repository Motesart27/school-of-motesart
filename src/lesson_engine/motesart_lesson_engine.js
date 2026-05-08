/**
 * ============================================================
 * MOTESART LESSON ENGINE v1.0
 * ============================================================
 *
 * The runtime that interprets structured lesson JSON and drives
 * the entire teaching experience. This is the heart of the system.
 *
 * Architecture:
 *   Lesson JSON → Lesson Engine → Moment Renderer → Student Interaction → Telemetry
 *
 * Usage:
 *   const engine = new MotesartLessonEngine();
 *   await engine.loadLesson('L01_c_major_scale');
 *   engine.start();
 *
 * The engine is framework-agnostic. It emits events that your
 * React/Vue/vanilla UI layer listens to and renders.
 *
 * ============================================================
 */

class MotesartLessonEngine {

  constructor(config = {}) {
    // ---- Configuration ----
    this.config = {
      lessonDataPath: config.lessonDataPath || '/lesson_data',
      visualRegistryPath: config.visualRegistryPath || '/lesson_data/visual_asset_registry.json',
      debugMode: config.debugMode || false,
      persistProgress: config.persistProgress !== false, // default true
      storageKey: config.storageKey || 'motesart_progress',
      apiUrl: config.apiUrl || '',
      studentId: config.studentId || null,
      ...config
    };

    // ---- Lesson Data ----
    this.lessonData = null;
    this.visualRegistry = null;
    this.moments = new Map(); // id → moment for O(1) lookup

    // ---- Runtime State ----
    this.state = {
      status: 'idle',           // idle | loading | running | paused | complete
      currentMomentId: null,
      previousMomentId: null,
      lessonId: null,
      startTime: null,

      // Confidence per concept (0-100)
      confidence: {},

      // WYL profile
      wyl: {
        visual: 25,
        auditory: 25,
        readwrite: 25,
        kinesthetic: 25,
        dominant: null,
        loaded: false
      },

      // DPM tracking
      dpm: {
        drive: 50,
        passion: 50,
        motivation: 50,
        overall: 50
      },

      // Per-moment tracking
      attempts: {},           // momentId → { count, outcomes[] }
      flags: {},              // arbitrary flags (hasInstrument, etc.)

      // WYL signal accumulation
      wylSignals: {
        replayCount: 0,
        verbalAccuracy: { correct: 0, total: 0 },
        midiAccuracy: { correct: 0, total: 0 },
        visualInteractionTime: 0,
        responseTimesMs: []
      },

      // Telemetry log
      telemetry: [],

      // Moments visited
      momentHistory: [],
      momentsCompleted: new Set()
    };

    // ---- Event System ----
    this._listeners = {};

    // ---- Moment Execution ----
    this._pendingResponse = null;
    this._responseTimeout = null;
    this._autoAdvanceTimeout = null;
  }

  // ============================================================
  // EVENT SYSTEM
  // ============================================================

  /**
   * Subscribe to engine events
   * Events:
   *   'moment:enter'       - new moment started
   *   'moment:exit'        - moment completed
   *   'dialogue:start'     - Motesart begins speaking
   *   'dialogue:end'       - Motesart finished speaking
   *   'visual:render'      - visual asset should be displayed
   *   'visual:clear'       - clear current visual
   *   'sound:play'         - play audio/tones
   *   'action:waiting'     - waiting for student input
   *   'action:received'    - student input received
   *   'action:evaluated'   - response evaluated (correct/wrong/timeout)
   *   'confidence:update'  - concept confidence changed
   *   'wyl:update'         - WYL profile changed
   *   'wyl:adapt'          - WYL adaptation applied to moment
   *   'dpm:update'         - DPM scores changed
   *   'branch:resolve'     - branch decision made
   *   'telemetry:log'      - telemetry event recorded
   *   'game:trigger'       - micro-game should start
   *   'game:complete'      - micro-game finished
   *   'lesson:start'       - lesson begins
   *   'lesson:complete'    - lesson finished
   *   'lesson:paused'      - lesson paused
   *   'lesson:resumed'     - lesson resumed
   *   'state:change'       - any state mutation
   *   'debug:log'          - debug info (only in debug mode)
   *   'error'              - error occurred
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => {
        try { cb(data); } catch (err) { console.error(`Event handler error [${event}]:`, err); }
      });
    }
    // Always emit state:change for any non-debug event
    if (event !== 'state:change' && event !== 'debug:log') {
      if (this._listeners['state:change']) {
        this._listeners['state:change'].forEach(cb => {
          try { cb({ event, data, state: this.getState() }); } catch (err) {}
        });
      }
    }
    // Debug logging
    if (this.config.debugMode && event !== 'debug:log') {
      this.emit('debug:log', { event, data, timestamp: Date.now() });
    }
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  /**
   * Load lesson from JSON file or object
   */
  async loadLesson(lessonIdOrData) {
    this.state.status = 'loading';

    try {
      // Accept either a string ID (fetch from file) or raw data object
      if (typeof lessonIdOrData === 'string') {
        const path = `${this.config.lessonDataPath}/${lessonIdOrData}.json`;
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load lesson: ${path} (${res.status})`);
        this.lessonData = await res.json();
      } else {
        this.lessonData = lessonIdOrData;
      }

      // Build moment lookup map
      this.moments.clear();
      this.lessonData.moments.forEach(m => {
        this.moments.set(m.id, m);
      });

      // Initialize confidence from concept definitions
      this.state.confidence = {};
      this.lessonData.concepts.forEach(c => {
        this.state.confidence[c.id] = c.startConfidence || 50;
      });

      this.state.lessonId = this.lessonData.lessonId;
      this.state.status = 'idle';

      this.emit('debug:log', { msg: `Lesson loaded: ${this.lessonData.title}`, moments: this.moments.size });

      return this.lessonData;
    } catch (err) {
      this.state.status = 'idle';
      this.emit('error', { phase: 'load', error: err.message });
      throw err;
    }
  }

  /**
   * Load visual asset registry
   */
  async loadVisualRegistry(pathOrData) {
    try {
      if (typeof pathOrData === 'string') {
        const res = await fetch(pathOrData);
        if (res.ok) this.visualRegistry = await res.json();
      } else {
        this.visualRegistry = pathOrData;
      }
    } catch (err) {
      this.emit('debug:log', { msg: 'Visual registry load failed, continuing without', error: err.message });
    }
  }

  /**
   * Load WYL profile from backend
   */
  async loadWYLProfile() {
    if (!this.config.studentId || !this.config.apiUrl) {
      // Fallback: equal distribution with auditory dominant
      this.state.wyl = { visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25, dominant: 'auditory', loaded: true };
      return;
    }

    try {
      const res = await fetch(`${this.config.apiUrl}/students/${this.config.studentId}/wyl`);
      if (res.ok) {
        const data = await res.json();
        const profile = {
          visual: data.visual || 25,
          auditory: data.auditory || 25,
          readwrite: data.readwrite || 25,
          kinesthetic: data.kinesthetic || 25,
          dominant: data.dominant || null,
          loaded: true
        };
        if (!profile.dominant) {
          profile.dominant = this._determineDominant(profile);
        }
        this.state.wyl = profile;
      }
    } catch (err) {
      this.state.wyl = { visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25, dominant: 'auditory', loaded: true };
      this.emit('debug:log', { msg: 'WYL fetch failed, using fallback', error: err.message });
    }

    this.emit('wyl:update', { profile: this.state.wyl });
  }

  /**
   * Restore saved progress (if any)
   */
  restoreProgress() {
    if (!this.config.persistProgress) return null;
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (!saved) return null;
      const data = JSON.parse(saved);
      if (data.lessonId !== this.state.lessonId) return null; // different lesson

      // Restore relevant state
      this.state.confidence = data.confidence || this.state.confidence;
      this.state.attempts = data.attempts || {};
      this.state.flags = data.flags || {};
      this.state.momentHistory = data.momentHistory || [];
      this.state.wylSignals = data.wylSignals || this.state.wylSignals;

      this.emit('debug:log', { msg: 'Progress restored', moment: data.currentMomentId });
      return data.currentMomentId;
    } catch (err) {
      return null;
    }
  }

  /**
   * Save current progress
   */
  saveProgress() {
    if (!this.config.persistProgress) return;
    try {
      const snapshot = {
        lessonId: this.state.lessonId,
        currentMomentId: this.state.currentMomentId,
        confidence: this.state.confidence,
        attempts: this.state.attempts,
        flags: this.state.flags,
        momentHistory: this.state.momentHistory,
        wylSignals: this.state.wylSignals,
        timestamp: Date.now()
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(snapshot));
    } catch (err) {
      this.emit('debug:log', { msg: 'Progress save failed', error: err.message });
    }
  }

  // ============================================================
  // LESSON LIFECYCLE
  // ============================================================

  /**
   * Start the lesson
   */
  async start(fromMomentId = null) {
    if (!this.lessonData) throw new Error('No lesson loaded. Call loadLesson() first.');

    // Load WYL profile
    await this.loadWYLProfile();

    // Check for saved progress
    const resumeId = fromMomentId || this.restoreProgress();

    this.state.status = 'running';
    this.state.startTime = Date.now();

    this.emit('lesson:start', {
      lessonId: this.lessonData.lessonId,
      title: this.lessonData.title,
      resuming: !!resumeId
    });

    // Start from first moment or resume point
    const startId = resumeId || this.lessonData.moments[0].id;
    await this.runMoment(startId);
  }

  /**
   * Pause the lesson
   */
  pause() {
    if (this.state.status !== 'running') return;
    this.state.status = 'paused';
    clearTimeout(this._responseTimeout);
    clearTimeout(this._autoAdvanceTimeout);
    this.saveProgress();
    this.emit('lesson:paused', { moment: this.state.currentMomentId });
  }

  /**
   * Resume the lesson
   */
  resume() {
    if (this.state.status !== 'paused') return;
    this.state.status = 'running';
    this.emit('lesson:resumed', { moment: this.state.currentMomentId });
    // Re-run current moment
    this.runMoment(this.state.currentMomentId);
  }

  /**
   * End the lesson
   */
  async endLesson() {
    this.state.status = 'complete';
    clearTimeout(this._responseTimeout);
    clearTimeout(this._autoAdvanceTimeout);

    // Check mastery goals
    const goalResults = this._evaluateGoals();

    // Build session summary
    const summary = {
      lessonId: this.state.lessonId,
      duration: Date.now() - this.state.startTime,
      confidence: { ...this.state.confidence },
      dpm: { ...this.state.dpm },
      wyl: { ...this.state.wyl },
      momentsCompleted: this.state.momentsCompleted.size,
      totalMoments: this.lessonData.moments.filter(m => !m.isBranch).length,
      goalResults,
      telemetryCount: this.state.telemetry.length,
      wylSignals: { ...this.state.wylSignals }
    };

    // Handle unmet goals
    if (!goalResults.allMet && this.lessonData.onGoalNotMet) {
      summary.remediation = this.lessonData.onGoalNotMet;
    }

    // Attach practice assignment
    if (this.lessonData.practiceAssignment) {
      summary.practiceAssignment = this.lessonData.practiceAssignment;
    }

    // Save final state
    this.saveProgress();

    // Save to backend if available
    if (this.config.apiUrl && this.config.studentId && this.lessonData.moments.slice(-1)[0]?.sessionEnd) {
      await this._saveToBackend(summary);
    }

    this.emit('lesson:complete', summary);

    // Clear local progress for completed lesson
    if (this.config.persistProgress) {
      localStorage.removeItem(this.config.storageKey);
    }

    return summary;
  }

  // ============================================================
  // MOMENT EXECUTION ENGINE
  // ============================================================

  /**
   * Run a single teaching moment — the core loop
   */
  async runMoment(momentId) {
    if (this.state.status !== 'running') return;

    // Handle END marker
    if (momentId === 'END') {
      await this.endLesson();
      return;
    }

    const moment = this.moments.get(momentId);
    if (!moment) {
      this.emit('error', { phase: 'run', error: `Moment not found: ${momentId}` });
      return;
    }

    // Check conditional trigger
    if (moment.conditional) {
      const shouldRun = this._evaluateCondition(moment.conditional);
      if (!shouldRun) {
        // Skip this moment, find the autoAdvance or next main moment
        const next = moment.branches?.autoAdvance || this._findNextMainMoment(momentId);
        if (next) return this.runMoment(next);
        return;
      }
    }

    // Update state
    this.state.previousMomentId = this.state.currentMomentId;
    this.state.currentMomentId = momentId;
    this.state.momentHistory.push(momentId);
    this.state.momentsCompleted.add(momentId);

    // Initialize attempt tracking
    if (!this.state.attempts[momentId]) {
      this.state.attempts[momentId] = { count: 0, outcomes: [] };
    }
    this.state.attempts[momentId].count++;

    this.emit('moment:enter', { moment, state: this.getState() });

    // ---- Step 1: Apply WYL adaptations ----
    const adaptedMoment = this._applyWYLAdaptation(moment);
    this.emit('wyl:adapt', { original: moment, adapted: adaptedMoment });

    // ---- Step 2: Render Visual ----
    if (adaptedMoment.visual && adaptedMoment.visual.asset) {
      const resolvedVisual = this._resolveVisual(adaptedMoment.visual);
      this.emit('visual:render', { visual: resolvedVisual, moment: adaptedMoment });
    } else {
      this.emit('visual:clear', { moment: adaptedMoment });
    }

    // ---- Step 3: Speak Dialogue ----
    this.emit('dialogue:start', {
      text: adaptedMoment.dialogue,
      sound: adaptedMoment.sound
    });

    // ---- Step 4: Play Sound ----
    if (adaptedMoment.sound && adaptedMoment.sound.tones) {
      this.emit('sound:play', {
        mode: adaptedMoment.sound.mode,
        tones: adaptedMoment.sound.tones,
        tempo: adaptedMoment.sound.tempo,
        sync: adaptedMoment.sound.toneSync
      });
    }

    // ---- Step 5: Wait for action or auto-advance ----
    const action = adaptedMoment.expectedAction;

    if (action && action.type === 'listen' && action.autoAdvance) {
      // Auto-advance after speech + pause
      const pause = (adaptedMoment.timing?.pauseAfter || 3) * 1000;
      this._autoAdvanceTimeout = setTimeout(() => {
        this.emit('moment:exit', { moment: adaptedMoment, outcome: 'autoAdvance' });
        this.saveProgress();
        const next = adaptedMoment.branches?.autoAdvance || this._findNextMainMoment(momentId);
        if (next) this.runMoment(next);
      }, pause);
    } else if (action) {
      // Wait for student response
      const timeout = (action.timeout || 20) * 1000;

      this.emit('action:waiting', {
        type: action.type,
        trigger: action.trigger,
        timeout: action.timeout
      });

      // Create a promise that the UI layer resolves via submitResponse()
      this._pendingResponse = this._createResponsePromise(timeout, momentId);

      try {
        const response = await this._pendingResponse;
        await this._handleResponse(adaptedMoment, response);
      } catch (err) {
        // Timeout
        await this._handleResponse(adaptedMoment, { type: 'timeout' });
      }
    } else {
      // No action defined - auto-advance after pause
      const pause = (adaptedMoment.timing?.pauseAfter || 2) * 1000;
      this._autoAdvanceTimeout = setTimeout(() => {
        this.emit('moment:exit', { moment: adaptedMoment, outcome: 'autoAdvance' });
        this.saveProgress();
        const next = this._findNextMainMoment(momentId);
        if (next) this.runMoment(next);
      }, pause);
    }
  }

  /**
   * Submit student response from UI layer
   * Called by your React component when student speaks, plays MIDI, etc.
   */
  submitResponse(response) {
    if (this._resolveResponse) {
      this.emit('action:received', { response, moment: this.state.currentMomentId });
      this._resolveResponse(response);
      this._resolveResponse = null;
    }
  }

  /**
   * Student requested replay of current moment
   */
  replay() {
    this.state.wylSignals.replayCount++;
    const moment = this.moments.get(this.state.currentMomentId);
    if (moment) {
      this.logTelemetry(moment, { type: 'replay' });
      this.emit('debug:log', { msg: 'Replay requested', moment: moment.id });
      // Re-run same moment
      clearTimeout(this._responseTimeout);
      clearTimeout(this._autoAdvanceTimeout);
      this.runMoment(moment.id);
    }
  }

  // ============================================================
  // RESPONSE EVALUATION
  // ============================================================

  /**
   * Handle student response and determine outcome
   */
  async _handleResponse(moment, response) {
    clearTimeout(this._responseTimeout);

    const outcome = this._evaluateResponse(moment, response);
    const attemptData = this.state.attempts[moment.id];
    attemptData.outcomes.push(outcome.type);

    // Track response time
    if (response.timestamp) {
      this.state.wylSignals.responseTimesMs.push(response.timestamp - (this._momentStartTime || Date.now()));
    }

    // Handle flags
    if (moment.expectedAction?.setsFlag && response.value) {
      const flag = moment.expectedAction.setsFlag;
      this.state.flags[flag] = this._inferFlagValue(response.value);
    }

    // Update accuracy tracking
    if (response.type === 'verbal') {
      this.state.wylSignals.verbalAccuracy.total++;
      if (outcome.type === 'correct') this.state.wylSignals.verbalAccuracy.correct++;
    } else if (response.type === 'midi') {
      this.state.wylSignals.midiAccuracy.total++;
      if (outcome.type === 'correct' || outcome.type === 'perfect') this.state.wylSignals.midiAccuracy.correct++;
    }

    // Update confidence
    this._updateConfidence(moment, outcome.type);

    // Update DPM
    this._updateDPM(outcome.type, response);

    // Recalibrate WYL if marked
    if (moment.recalibrate?.trigger) {
      this._recalibrateWYL(outcome.type === 'correct' || outcome.type === 'perfect');
    }

    // Log telemetry
    this.logTelemetry(moment, {
      outcome: outcome.type,
      response: response.type,
      responseTime: response.timestamp ? response.timestamp - (this._momentStartTime || Date.now()) : null,
      confidence: { ...this.state.confidence }
    });

    // Emit evaluation result
    this.emit('action:evaluated', {
      moment,
      outcome,
      feedback: outcome.feedback,
      visualHint: outcome.visualHint
    });

    // Trigger micro-game if applicable
    if (moment.microGame) {
      const shouldTrigger =
        (moment.microGame.trigger === 'on_correct' && outcome.type === 'correct') ||
        (moment.microGame.trigger === 'after_completion') ||
        (moment.microGame.trigger === 'after_listen');

      if (shouldTrigger) {
        this.emit('game:trigger', { game: moment.microGame, moment });
        // Wait for game complete before branching
        // UI layer should call engine.gameDone(result) when finished
        return;
      }
    }

    // Resolve branch
    this._advanceFromOutcome(moment, outcome);
  }

  /**
   * Evaluate a response against moment expectations
   */
  _evaluateResponse(moment, response) {
    if (response.type === 'timeout') {
      return { type: 'timeout', feedback: null };
    }

    // Verbal response
    if (response.type === 'verbal' && moment.correctResponse) {
      const text = (response.value || '').toLowerCase().trim();

      // Check correct
      let correctMatches = [];
      if (moment.correctResponse.match) {
        correctMatches = Array.isArray(moment.correctResponse.match)
          ? moment.correctResponse.match
          : [moment.correctResponse.match];
      }

      if (moment.correctResponse.type === 'any_affirmative' || moment.correctResponse.type === 'any_response') {
        return {
          type: 'correct',
          feedback: moment.correctResponse.feedback || 'Got it!',
        };
      }

      // Fuzzy match support
      const isCorrect = moment.correctResponse.fuzzyMatch
        ? this._fuzzyMatch(text, correctMatches)
        : correctMatches.some(m => text.includes(m.toLowerCase()));

      if (isCorrect) {
        return {
          type: 'correct',
          feedback: moment.correctResponse.feedback ||
                    moment.correctResponse.allCorrect?.feedback || ''
        };
      }

      // Check wrong
      if (moment.wrongResponse) {
        return {
          type: 'wrong',
          feedback: moment.wrongResponse.feedback || '',
          visualHint: moment.wrongResponse.visualHint || null
        };
      }

      return { type: 'wrong', feedback: '' };
    }

    // MIDI response
    if (response.type === 'midi') {
      if (moment.correctResponse?.midi) {
        const expected = moment.correctResponse.midi.note;
        if (response.note === expected) {
          return { type: 'correct', feedback: moment.correctResponse.midi.feedback };
        }
        return {
          type: 'wrong',
          feedback: moment.wrongResponse?.midi?.feedback || '',
          visualHint: moment.wrongResponse?.midi?.visualHint
        };
      }
    }

    // MIDI sequence response (practice phases)
    if (response.type === 'midi_sequence') {
      const expected = moment.expectedAction?.notes || [];
      const played = response.notes || [];

      const correctCount = played.filter((n, i) => i < expected.length && n === expected[i]).length;
      const accuracy = expected.length ? correctCount / expected.length : 0;

      if (accuracy === 1) {
        return { type: 'perfect', feedback: moment.correctResponse?.allCorrect?.feedback || moment.correctResponse?.perfect?.feedback || 'Perfect!' };
      } else if (accuracy >= 0.7) {
        return { type: 'passed', feedback: moment.correctResponse?.partialCorrect?.feedback || moment.correctResponse?.ascending_only?.feedback || 'Good effort!' };
      } else {
        return { type: 'failed', feedback: moment.correctResponse?.partial?.feedback || 'Keep practicing!' };
      }
    }

    return { type: 'unknown', feedback: '' };
  }

  /**
   * Fuzzy match for verbal responses (handles "c d e f g a b c" vs exact match)
   */
  _fuzzyMatch(input, patterns) {
    const normalizedInput = input.replace(/[,.\s]+/g, ' ').trim();
    return patterns.some(p => {
      const normalizedPattern = p.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
      // Check if all words from pattern appear in input in order
      const patternWords = normalizedPattern.split(' ');
      const inputWords = normalizedInput.split(' ');
      let pi = 0;
      for (let ii = 0; ii < inputWords.length && pi < patternWords.length; ii++) {
        if (inputWords[ii] === patternWords[pi]) pi++;
      }
      return pi === patternWords.length;
    });
  }

  // ============================================================
  // BRANCHING
  // ============================================================

  /**
   * Resolve and advance to next moment based on outcome
   */
  _advanceFromOutcome(moment, outcome) {
    const branches = moment.branches;
    if (!branches) return;

    let nextId = null;
    const attemptCount = this.state.attempts[moment.id]?.count || 1;

    // Check wrongTwice first
    if (outcome.type === 'wrong' && attemptCount >= 2 && branches.wrongTwice) {
      nextId = branches.wrongTwice;
    }
    // Then check specific outcome
    else if (branches[outcome.type]) {
      nextId = branches[outcome.type];
    }
    // Fallback to 'any' branch
    else if (branches.any) {
      nextId = branches.any;
    }
    // Fallback to autoAdvance
    else if (branches.autoAdvance) {
      nextId = branches.autoAdvance;
    }

    this.emit('branch:resolve', {
      from: moment.id,
      outcome: outcome.type,
      to: nextId,
      attemptCount
    });

    this.emit('moment:exit', { moment, outcome: outcome.type });
    this.saveProgress();

    if (nextId) {
      // Small delay before next moment for pacing
      const delay = (moment.timing?.replayDelay || 1) * 1000;
      setTimeout(() => this.runMoment(nextId), delay);
    }
  }

  /**
   * Called by UI when micro-game completes
   */
  gameDone(result) {
    const moment = this.moments.get(this.state.currentMomentId);
    this.emit('game:complete', { result, moment });
    this.logTelemetry(moment, { type: 'game_complete', result });

    // Advance to normal branch
    const branches = moment?.branches;
    if (branches?.autoAdvance) {
      this.runMoment(branches.autoAdvance);
    } else if (branches?.correct) {
      this.runMoment(branches.correct);
    }
  }

  // ============================================================
  // CONFIDENCE SYSTEM
  // ============================================================

  _updateConfidence(moment, outcomeType) {
    if (!moment.confidenceImpact) return;

    Object.entries(moment.confidenceImpact).forEach(([concept, impact]) => {
      if (this.state.confidence[concept] === undefined) return;

      let delta = 0;
      if (typeof impact === 'number') {
        delta = impact;
      } else if (typeof impact === 'object') {
        delta = impact[outcomeType] || impact.teach || impact.recovery || 0;
      }

      if (delta !== 0) {
        const oldVal = this.state.confidence[concept];
        this.state.confidence[concept] = Math.max(0, Math.min(100, oldVal + delta));

        this.emit('confidence:update', {
          concept,
          oldValue: oldVal,
          newValue: this.state.confidence[concept],
          delta,
          trigger: moment.id
        });
      }
    });
  }

  // ============================================================
  // WYL SYSTEM
  // ============================================================

  /**
   * Apply WYL overrides to a moment
   */
  _applyWYLAdaptation(moment) {
    const dominant = this.state.wyl.dominant;
    if (!dominant || !moment.visual?.wylOverride) return moment;

    const override = moment.visual.wylOverride[dominant];
    if (!override) return moment;

    // Deep clone moment to avoid mutating original
    const adapted = JSON.parse(JSON.stringify(moment));

    // Apply visual overrides
    if (override.asset) adapted.visual.asset = override.asset;
    if (override.intensity !== undefined) adapted.visual.intensity = override.intensity;
    if (override.mode) adapted.visual.mode = override.mode;

    // Apply dialogue additions
    if (override.addDialogue) {
      adapted.dialogue = adapted.dialogue + ' ' + override.addDialogue;
    }
    if (override.addOverlay) {
      if (!adapted.visual.params) adapted.visual.params = {};
      adapted.visual.params.textOverlay = override.addOverlay;
    }
    if (override.addSuffix && override.suffix) {
      adapted.dialogue = adapted.dialogue + ' ' + override.suffix;
    }

    // Apply pacing
    if (override.pacing === 'slow' && adapted.timing) {
      adapted.timing.pauseAfter = (adapted.timing.pauseAfter || 3) + 2;
    }
    if (override.tempo && adapted.sound) {
      adapted.sound.tempo = override.tempo;
    }

    return adapted;
  }

  /**
   * Recalibrate WYL based on performance
   */
  _recalibrateWYL(wasEffective) {
    const w = { ...this.state.wyl };
    const boost = wasEffective ? 3 : -3;
    const dominant = w.dominant;

    if (dominant === 'visual') { w.visual += boost; w.auditory -= Math.round(boost / 3); w.kinesthetic -= Math.round(boost / 3); }
    else if (dominant === 'auditory') { w.auditory += boost; w.visual -= Math.round(boost / 3); w.kinesthetic -= Math.round(boost / 3); }
    else if (dominant === 'kinesthetic') { w.kinesthetic += boost; w.auditory -= Math.round(boost / 3); w.visual -= Math.round(boost / 3); }
    else { w.readwrite += boost; w.auditory -= Math.round(boost / 3); w.visual -= Math.round(boost / 3); }

    // Normalize to 100
    const total = w.visual + w.auditory + w.readwrite + w.kinesthetic;
    if (total > 0) {
      w.visual = Math.round((w.visual / total) * 100);
      w.auditory = Math.round((w.auditory / total) * 100);
      w.readwrite = Math.round((w.readwrite / total) * 100);
      w.kinesthetic = Math.round((w.kinesthetic / total) * 100);
    }

    // Auto-detect style shift from signals
    w.dominant = this._detectStyleFromSignals(w);

    this.state.wyl = w;
    this.emit('wyl:update', { profile: w, wasEffective });
  }

  /**
   * Detect learning style from accumulated signals
   */
  _detectStyleFromSignals(currentProfile) {
    const signals = this.state.wylSignals;
    const scores = { ...currentProfile };

    // High replay count → visual or readwrite learner
    if (signals.replayCount > 5) {
      scores.visual += 5;
      scores.readwrite += 3;
    }

    // MIDI accuracy higher than verbal → kinesthetic
    if (signals.midiAccuracy.total > 3 && signals.verbalAccuracy.total > 3) {
      const midiRate = signals.midiAccuracy.correct / signals.midiAccuracy.total;
      const verbalRate = signals.verbalAccuracy.correct / signals.verbalAccuracy.total;
      if (midiRate > verbalRate + 0.2) scores.kinesthetic += 5;
      if (verbalRate > midiRate + 0.2) scores.auditory += 5;
    }

    return this._determineDominant(scores);
  }

  _determineDominant(profile) {
    const max = Math.max(profile.visual, profile.auditory, profile.readwrite, profile.kinesthetic);
    if (profile.visual === max) return 'visual';
    if (profile.auditory === max) return 'auditory';
    if (profile.kinesthetic === max) return 'kinesthetic';
    return 'readwrite';
  }

  // ============================================================
  // DPM SYSTEM
  // ============================================================

  _updateDPM(outcomeType, response) {
    const dpm = this.state.dpm;

    // Drive: based on consistent engagement
    if (outcomeType === 'correct' || outcomeType === 'perfect') {
      dpm.drive = Math.min(100, dpm.drive + 3);
    } else if (outcomeType === 'timeout') {
      dpm.drive = Math.max(0, dpm.drive - 5);
    }

    // Passion: based on replay/exploration behavior
    if (this.state.wylSignals.replayCount > 0) {
      dpm.passion = Math.min(100, dpm.passion + 1);
    }

    // Motivation: based on accuracy trend
    const recentOutcomes = this.state.momentHistory.slice(-5).map(id =>
      this.state.attempts[id]?.outcomes?.slice(-1)[0]
    ).filter(Boolean);
    const recentCorrect = recentOutcomes.filter(o => o === 'correct' || o === 'perfect').length;
    dpm.motivation = Math.round((recentCorrect / Math.max(recentOutcomes.length, 1)) * 100);

    dpm.overall = Math.round((dpm.drive + dpm.passion + dpm.motivation) / 3);

    this.emit('dpm:update', { dpm: { ...dpm } });
  }

  // ============================================================
  // VISUAL SYSTEM
  // ============================================================

  /**
   * Resolve a visual asset reference to full render config
   */
  _resolveVisual(visual) {
    if (!visual || !visual.asset) return null;

    const resolved = { ...visual };

    // Lookup in registry if available
    if (this.visualRegistry?.assets?.[visual.asset]) {
      resolved.registryConfig = this.visualRegistry.assets[visual.asset];
    }

    // Apply difficulty scaling
    const diff = this.lessonData.difficulty?.[this.config.difficulty || 'beginner'];
    if (diff) {
      if (!diff.visualHints && resolved.registryConfig) {
        resolved.registryConfig.guideDots = false;
      }
      if (!diff.patternOverlay && resolved.params) {
        resolved.params.patternOverlay = false;
      }
    }

    return resolved;
  }

  // ============================================================
  // TELEMETRY
  // ============================================================

  logTelemetry(moment, data) {
    const entry = {
      lesson: this.state.lessonId,
      moment: moment.id,
      phase: moment.phase,
      timestamp: Date.now(),
      sessionTime: Date.now() - (this.state.startTime || Date.now()),
      ...data
    };

    this.state.telemetry.push(entry);
    this.emit('telemetry:log', entry);
  }

  // ============================================================
  // GOALS
  // ============================================================

  _evaluateGoals() {
    if (!this.lessonData.lessonGoals) return { allMet: true, results: {} };

    const results = {};
    let allMet = true;

    Object.entries(this.lessonData.lessonGoals).forEach(([concept, goal]) => {
      const current = this.state.confidence[concept] || 0;
      const met = current >= goal.min;
      results[concept] = { target: goal.min, actual: current, met, label: goal.label };
      if (!met) allMet = false;
    });

    return { allMet, results };
  }

  _evaluateCondition(condition) {
    if (condition.trigger === 'confidence') {
      const current = this.state.confidence[condition.concept] || 50;
      return current < condition.below;
    }
    return true;
  }

  // ============================================================
  // UTILITY
  // ============================================================

  _findNextMainMoment(currentId) {
    const mainMoments = this.lessonData.moments.filter(m => !m.isBranch);
    const idx = mainMoments.findIndex(m => m.id === currentId);
    if (idx >= 0 && idx < mainMoments.length - 1) {
      return mainMoments[idx + 1].id;
    }
    return 'END';
  }

  _createResponsePromise(timeout, momentId) {
    this._momentStartTime = Date.now();
    return new Promise((resolve, reject) => {
      this._resolveResponse = resolve;
      this._responseTimeout = setTimeout(() => {
        this._resolveResponse = null;
        reject(new Error('timeout'));
      }, timeout);
    });
  }

  _inferFlagValue(text) {
    const lower = text.toLowerCase();
    if (['yes', 'yeah', 'yep', 'sure', 'i do', 'got it'].some(w => lower.includes(w))) return true;
    if (['no', 'nope', 'i don\'t', 'not'].some(w => lower.includes(w))) return false;
    return text;
  }

  async _saveToBackend(summary) {
    try {
      await fetch(`${this.config.apiUrl}/students/${this.config.studentId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary)
      });
    } catch (err) {
      this.emit('debug:log', { msg: 'Backend save failed', error: err.message });
    }
  }

  /**
   * Get current state snapshot (safe copy)
   */
  getState() {
    return {
      status: this.state.status,
      currentMomentId: this.state.currentMomentId,
      previousMomentId: this.state.previousMomentId,
      lessonId: this.state.lessonId,
      confidence: { ...this.state.confidence },
      wyl: { ...this.state.wyl },
      dpm: { ...this.state.dpm },
      flags: { ...this.state.flags },
      momentsCompleted: this.state.momentsCompleted.size,
      momentHistory: [...this.state.momentHistory],
      telemetryCount: this.state.telemetry.length
    };
  }

  /**
   * Get full telemetry log
   */
  getTelemetry() {
    return [...this.state.telemetry];
  }

  /**
   * Get the current moment object
   */
  getCurrentMoment() {
    return this.state.currentMomentId ? this.moments.get(this.state.currentMomentId) : null;
  }

  /**
   * Get difficulty config
   */
  getDifficulty() {
    return this.lessonData?.difficulty?.[this.config.difficulty || 'beginner'] || {};
  }
}

// ============================================================
// EXPORT
// ============================================================
// Works in both browser and module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MotesartLessonEngine;
}
if (typeof window !== 'undefined') {
  window.MotesartLessonEngine = MotesartLessonEngine;
}

export { MotesartLessonEngine };