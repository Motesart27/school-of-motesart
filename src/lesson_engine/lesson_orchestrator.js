/**
 * ============================================================
 * MOTESART LESSON ORCHESTRATOR v1.0
 * ============================================================
 *
 * The control tower between the React UI and the Lesson Engine.
 *
 *   React UI  ←→  Orchestrator  ←→  Engine  ←→  Lesson JSON
 *
 * The Orchestrator:
 *   - Owns the run loop (so the UI never drives lesson logic)
 *   - Manages interaction modes (speech, MIDI, tap)
 *   - Handles moment caching (TTS audio, visual state)
 *   - Controls pedagogical timing
 *   - Coordinates visual component rendering
 *   - Enables teacher observation / multiplayer later
 *
 * The UI only needs to implement a simple interface:
 *   ui.renderMoment(moment, visual, options)
 *   ui.showFeedback(feedback)
 *   ui.waitForStudent(interactionMode, timeout) → Promise<response>
 *   ui.playSpeech(text, options) → Promise<void>
 *   ui.playTones(tones, options) → Promise<void>
 *   ui.showCelebration(type)
 *   ui.clearVisual()
 *   ui.updateDebug(state)
 *
 * ============================================================
 */

class LessonOrchestrator {

  constructor(engine, ui, config = {}) {
    this.engine = engine;
    this.ui = ui;
    this.config = {
      preloadAhead: 2,         // prefetch N moments ahead
      enableCache: true,
      enableDebug: false,
      difficulty: 'beginner',
      ...config
    };

    // Moment cache: avoid re-generating TTS/visuals for replayed moments
    this.momentCache = new Map();

    // Timing system
    this.timingProfiles = {
      instruction: { base: 0, after: 2000 },     // short pause after teaching
      thinking:    { base: 500, after: 3000 },    // medium pause for absorption
      observation: { base: 0, after: 4000 },      // long pause — let it sink in
      celebration: { base: 0, after: 2500 },      // animated celebration beat
      transition:  { base: 800, after: 1000 },     // phase transitions
      response:    { base: 1500, after: 0 }        // the 1.5s "thinking" before Motesart responds
    };

    // Concept mastery thresholds
    this.masteryLevels = {
      learning: { min: 0, max: 39 },
      stable:   { min: 40, max: 74 },
      mastered: { min: 75, max: 100 }
    };

    // Engagement metrics (beyond DPM)
    this.engagement = {
      attentionScore: 50,      // response_speed + consistency
      struggleScore: 0,        // wrong_answers + hesitation + replays
      flowState: false          // true when student is in consistent correct streak
    };
    this._correctStreak = 0;

    // Run state
    this._running = false;
    this._paused = false;

    // Wire engine events to orchestrator logic
    this._wireEngineEvents();
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Initialize and start a lesson
   */
  async start(lessonId) {
    // Load lesson data
    const lesson = await this.engine.loadLesson(lessonId);

    // Load visual registry
    await this.engine.loadVisualRegistry(this.config.visualRegistryPath);

    // Set difficulty
    this.engine.config.difficulty = this.config.difficulty;

    this._running = true;
    this._paused = false;

    // Notify UI
    this.ui.onLessonStart?.({
      title: lesson.title,
      lessonId: lesson.lessonId,
      duration: lesson.duration,
      concepts: lesson.concepts
    });

    // Preload first N moments
    this._preloadMoments(lesson.moments.slice(0, this.config.preloadAhead));

    // Start the run loop
    await this.engine.start();
  }

  /**
   * Pause lesson
   */
  pause() {
    this._paused = true;
    this.engine.pause();
  }

  /**
   * Resume lesson
   */
  resume() {
    this._paused = false;
    this.engine.resume();
  }

  /**
   * Stop lesson entirely
   */
  async stop() {
    this._running = false;
    return await this.engine.endLesson();
  }

  // ============================================================
  // RUN LOOP (driven by engine events)
  // ============================================================

  /**
   * Wire engine events to orchestrator handlers
   * This is the core coordination layer
   */
  _wireEngineEvents() {
    const engine = this.engine;

    // ---- Moment lifecycle ----
    engine.on('moment:enter', async ({ moment, state }) => {
      if (this.config.enableDebug) {
        this.ui.updateDebug?.({
          currentMoment: moment.id,
          phase: moment.phase,
          confidence: state.confidence,
          wyl: state.wyl,
          dpm: state.dpm,
          engagement: this.engagement,
          masteryLevels: this._getMasteryLevels(state.confidence)
        });
      }

      // Preload upcoming moments
      this._preloadAhead(moment.id);
    });

    // ---- Dialogue ----
    engine.on('dialogue:start', async ({ text, sound }) => {
      // Check cache for pre-generated TTS
      const cached = this.momentCache.get(this.engine.state.currentMomentId);
      if (cached?.ttsAudio) {
        await this.ui.playSpeech?.(text, { audio: cached.ttsAudio });
      } else {
        await this.ui.playSpeech?.(text, {});
      }
    });

    // ---- Visuals ----
    engine.on('visual:render', ({ visual, moment }) => {
      // Resolve visual to component props
      const componentProps = this._resolveVisualToComponent(visual);
      this.ui.renderMoment?.(moment, componentProps, {
        interactionMode: this._getInteractionMode(moment),
        masteryLevel: this._getConceptMastery(moment.concepts?.[0])
      });
    });

    engine.on('visual:clear', () => {
      this.ui.clearVisual?.();
    });

    // ---- Sound ----
    engine.on('sound:play', ({ tones, tempo, mode }) => {
      this.ui.playTones?.(tones, { tempo, mode });
    });

    // ---- Student interaction ----
    engine.on('action:waiting', async ({ type, trigger, timeout }) => {
      const interactionMode = this._mapActionTypeToMode(type);

      try {
        const response = await this.ui.waitForStudent?.(interactionMode, timeout * 1000);
        if (response) {
          response.timestamp = Date.now();
          // Apply the 1.5s "thinking" pause before engine processes
          await this._pedagogicalPause('response');
          this.engine.submitResponse(response);
        }
      } catch (err) {
        // Timeout handled by engine
      }
    });

    // ---- Evaluation feedback ----
    engine.on('action:evaluated', ({ moment, outcome, feedback, visualHint }) => {
      // Update engagement
      this._updateEngagement(outcome.type);

      // Determine timing type for feedback
      const timingType = outcome.type === 'correct' || outcome.type === 'perfect'
        ? 'celebration' : 'instruction';

      this.ui.showFeedback?.({
        type: outcome.type,
        feedback,
        visualHint,
        timing: this.timingProfiles[timingType]
      });

      // Celebration for perfect/correct
      if (outcome.type === 'perfect') {
        this.ui.showCelebration?.('confetti');
      }
    });

    // ---- Confidence updates ----
    engine.on('confidence:update', ({ concept, oldValue, newValue, delta }) => {
      const oldLevel = this._getMasteryLevel(oldValue);
      const newLevel = this._getMasteryLevel(newValue);

      // Mastery level transition — trigger UI celebration
      if (newLevel !== oldLevel && newLevel === 'mastered') {
        this.ui.showCelebration?.('mastery_achieved');
      }

      if (this.config.enableDebug) {
        this.ui.updateDebug?.({
          confidenceUpdate: { concept, oldValue, newValue, delta, level: newLevel }
        });
      }
    });

    // ---- Branch decisions ----
    engine.on('branch:resolve', ({ from, outcome, to, attemptCount }) => {
      if (this.config.enableDebug) {
        this.ui.updateDebug?.({
          branch: { from, outcome, to, attemptCount }
        });
      }

      // Concept reinforcement: if branching due to failure, trigger reinforcement
      if (outcome === 'wrong' || outcome === 'wrongTwice') {
        const moment = this.engine.moments.get(from);
        if (moment?.concepts?.length) {
          this._triggerReinforcement(moment.concepts[0]);
        }
      }
    });

    // ---- Micro-games ----
    engine.on('game:trigger', ({ game, moment }) => {
      this.ui.startMicroGame?.(game, moment);
    });

    // ---- WYL updates ----
    engine.on('wyl:update', ({ profile }) => {
      if (this.config.enableDebug) {
        this.ui.updateDebug?.({ wyl: profile });
      }
    });

    engine.on('wyl:adapt', ({ original, adapted }) => {
      if (this.config.enableDebug && original.id !== adapted.id) {
        this.ui.updateDebug?.({
          wylAdaptation: {
            moment: original.id,
            dominant: this.engine.state.wyl.dominant,
            changes: this._diffMoments(original, adapted)
          }
        });
      }
    });

    // ---- Lesson complete ----
    engine.on('lesson:complete', (summary) => {
      this._running = false;
      summary.engagement = { ...this.engagement };
      summary.masteryLevels = this._getMasteryLevels(summary.confidence);
      this.ui.onLessonComplete?.(summary);
    });

    // ---- Telemetry ----
    engine.on('telemetry:log', (entry) => {
      // Augment with engagement data
      entry.engagement = { ...this.engagement };
      entry.masteryLevel = entry.moment
        ? this._getConceptMastery(this.engine.moments.get(entry.moment)?.concepts?.[0])
        : null;
    });
  }

  // ============================================================
  // INTERACTION MODES
  // ============================================================

  /**
   * Determine interaction mode from moment data
   */
  _getInteractionMode(moment) {
    // Explicit mode if set
    if (moment.interactionMode) return moment.interactionMode;

    // Infer from expected action
    const action = moment.expectedAction;
    if (!action) return 'passive';

    if (action.type === 'midi_sequence' || action.type === 'midi_or_verbal') return 'midi';
    if (action.type === 'verbal') return 'speech';
    if (action.type === 'tap') return 'tap';
    if (action.type === 'listen') return 'passive';

    return 'speech'; // default
  }

  _mapActionTypeToMode(actionType) {
    const map = {
      'verbal': 'speech',
      'midi_or_verbal': 'midi',
      'midi_sequence': 'midi',
      'tap': 'tap',
      'listen': 'passive'
    };
    return map[actionType] || 'speech';
  }

  // ============================================================
  // VISUAL COMPONENT RESOLUTION
  // ============================================================

  /**
   * Turn a visual asset reference into React component props
   * This is where the 3-component strategy lives:
   *   KeyboardDiagram, ScalePathDiagram, FingerMapDiagram
   */
  _resolveVisualToComponent(visual) {
    if (!visual || !visual.asset) return null;

    const registry = this.engine.visualRegistry?.assets?.[visual.asset];
    if (!registry) {
      // Fallback: return raw visual data for the UI to handle
      return { component: 'GenericVisual', props: visual };
    }

    // Map registry component types to the 3 core components
    const componentMap = {
      'Keyboard': 'KeyboardDiagram',
      'KeyboardDemo': 'KeyboardDiagram',
      'KeyboardWalkthrough': 'KeyboardDiagram',
      'KeyboardPractice': 'KeyboardDiagram',
      'KeyboardComparison': 'KeyboardDiagram',
      'HandDiagram': 'FingerMapDiagram',
      'HandKeyboardComposite': 'FingerMapDiagram',
      'PatternDisplay': 'ScalePathDiagram',
      'SummaryCard': 'GenericVisual',
      'TeaserCard': 'GenericVisual',
      'CompletionBadge': 'GenericVisual'
    };

    const component = componentMap[registry.component] || 'GenericVisual';

    return {
      component,
      props: {
        ...registry,
        ...visual.params,
        mode: visual.mode,
        intensity: visual.intensity,
        animation: registry.animation || visual.animation
      }
    };
  }

  // ============================================================
  // CONCEPT MASTERY
  // ============================================================

  _getMasteryLevel(confidence) {
    if (confidence >= 75) return 'mastered';
    if (confidence >= 40) return 'stable';
    return 'learning';
  }

  _getMasteryLevels(confidenceMap) {
    const levels = {};
    Object.entries(confidenceMap).forEach(([concept, val]) => {
      levels[concept] = {
        value: val,
        level: this._getMasteryLevel(val)
      };
    });
    return levels;
  }

  _getConceptMastery(conceptId) {
    if (!conceptId) return 'stable';
    const val = this.engine.state.confidence[conceptId];
    return val !== undefined ? this._getMasteryLevel(val) : 'stable';
  }

  // ============================================================
  // ENGAGEMENT TRACKING
  // ============================================================

  _updateEngagement(outcomeType) {
    // Correct streak → flow state
    if (outcomeType === 'correct' || outcomeType === 'perfect') {
      this._correctStreak++;
      this.engagement.attentionScore = Math.min(100, this.engagement.attentionScore + 3);
      this.engagement.struggleScore = Math.max(0, this.engagement.struggleScore - 2);
    } else if (outcomeType === 'wrong' || outcomeType === 'failed') {
      this._correctStreak = 0;
      this.engagement.struggleScore = Math.min(100, this.engagement.struggleScore + 5);
      this.engagement.attentionScore = Math.max(0, this.engagement.attentionScore - 2);
    } else if (outcomeType === 'timeout') {
      this._correctStreak = 0;
      this.engagement.attentionScore = Math.max(0, this.engagement.attentionScore - 8);
      this.engagement.struggleScore = Math.min(100, this.engagement.struggleScore + 3);
    }

    // Flow state: 5+ correct in a row with good attention
    this.engagement.flowState = this._correctStreak >= 5 && this.engagement.attentionScore > 60;

    // If in flow state, engine can speed up pacing
    if (this.engagement.flowState) {
      this.timingProfiles.instruction.after = 1500;
      this.timingProfiles.thinking.after = 2000;
    } else {
      this.timingProfiles.instruction.after = 2000;
      this.timingProfiles.thinking.after = 3000;
    }
  }

  // ============================================================
  // CONCEPT REINFORCEMENT
  // ============================================================

  /**
   * Trigger reinforcement for a struggling concept
   * Instead of replaying moments, insert targeted micro-help
   */
  _triggerReinforcement(conceptId) {
    const mastery = this._getConceptMastery(conceptId);

    if (mastery === 'learning') {
      // Insert visual replay + micro exercise
      this.ui.showReinforcement?.({
        concept: conceptId,
        type: 'visual_replay',
        intensity: 'high'
      });
    } else if (mastery === 'stable') {
      // Lighter reinforcement — just a visual hint
      this.ui.showReinforcement?.({
        concept: conceptId,
        type: 'hint_card',
        intensity: 'low'
      });
    }
    // mastered → no reinforcement needed
  }

  // ============================================================
  // PEDAGOGICAL TIMING
  // ============================================================

  _pedagogicalPause(type) {
    const timing = this.timingProfiles[type] || this.timingProfiles.instruction;
    const delay = timing.base || 0;
    if (delay === 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // ============================================================
  // MOMENT CACHING
  // ============================================================

  _preloadMoments(moments) {
    if (!this.config.enableCache) return;
    moments.forEach(m => {
      if (!this.momentCache.has(m.id)) {
        this.momentCache.set(m.id, {
          id: m.id,
          ttsAudio: null,    // will be populated by TTS preload
          visualState: null   // will be populated by visual prerender
        });
      }
    });
  }

  _preloadAhead(currentMomentId) {
    const moments = this.engine.lessonData.moments;
    const idx = moments.findIndex(m => m.id === currentMomentId);
    if (idx >= 0) {
      const upcoming = moments.slice(idx + 1, idx + 1 + this.config.preloadAhead);
      this._preloadMoments(upcoming);
    }
  }

  // ============================================================
  // UTILITY
  // ============================================================

  _diffMoments(original, adapted) {
    const diffs = [];
    if (original.dialogue !== adapted.dialogue) diffs.push('dialogue');
    if (JSON.stringify(original.visual) !== JSON.stringify(adapted.visual)) diffs.push('visual');
    if (JSON.stringify(original.timing) !== JSON.stringify(adapted.timing)) diffs.push('timing');
    if (JSON.stringify(original.sound) !== JSON.stringify(adapted.sound)) diffs.push('sound');
    return diffs;
  }

  /**
   * Get full orchestrator state (for debugging / teacher view)
   */
  getState() {
    return {
      engineState: this.engine.getState(),
      engagement: { ...this.engagement },
      masteryLevels: this._getMasteryLevels(this.engine.state.confidence),
      correctStreak: this._correctStreak,
      cacheSize: this.momentCache.size,
      running: this._running,
      paused: this._paused
    };
  }
}

// ============================================================
// EXPORT
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LessonOrchestrator;
}
if (typeof window !== 'undefined') {
  window.LessonOrchestrator = LessonOrchestrator;
}

export { LessonOrchestrator };