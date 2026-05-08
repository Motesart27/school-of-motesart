/**
 * ============================================================
 * T.A.M.i BRIDGE v2.0
 * ============================================================
 *
 * The connector between the Lesson Orchestrator and the T.A.M.i
 * Intelligence Layer. The bridge:
 *
 *   1. Listens to engine/orchestrator events
 *   2. Feeds signals to the Intelligence Layer
 *   3. Checks the Strategy Resolver for deterministic handling
 *   4. Only if the resolver escalates, calls the backend endpoint
 *   5. Validates the response via the Response Contract
 *   6. Passes the validated action back to the orchestrator
 *   7. If AI fails, uses the deterministic fallback
 *
 * The bridge is the ONLY component that talks to the backend.
 * The intelligence layer never makes HTTP calls directly.
 *
 * Wiring (v2 — with Strategy Resolver):
 *   Orchestrator ──events──→ Bridge ──signals──→ Intelligence Layer
 *                                                       │
 *                                               detection fires
 *                                                       │
 *                                              Strategy Resolver
 *                                                ┌──────┴──────┐
 *                                            resolved?       escalate?
 *                                                │               │
 *                                         apply directly    call Claude
 *                                                            via backend
 *                                                               │
 *                                                   Response Contract validates
 *                                                               │
 *                                                   Intelligence Layer merges
 *                                                               │
 *                                                   Orchestrator ← action
 *
 * ============================================================
 */

class TAMiBridge {

  /**
   * @param {Object} params
   * @param {MotesartLessonEngine} params.engine - The lesson engine instance
   * @param {LessonOrchestrator} params.orchestrator - The orchestrator instance
   * @param {TAMiIntelligenceLayer} params.intelligence - The intelligence layer instance
   * @param {TAMiResponseContract} params.contract - The response contract validator
   * @param {TAMiStrategyResolver} [params.resolver] - The strategy resolver (optional)
   * @param {TAMiStateManager} [params.stateManager] - State manager for resolver context (optional)
   * @param {TAMiMicroMemory} [params.memory] - Micro-memory for resolver context (optional)
   * @param {TAMiTimingEngine} [params.timingEngine] - Timing engine for pacing (optional)
   * @param {Object} params.config
   */
  constructor({ engine, orchestrator, intelligence, contract, resolver, stateManager, memory, timingEngine, config = {} }) {
    this.engine = engine;
    this.orchestrator = orchestrator;
    this.intelligence = intelligence;
    this.contract = contract;
    this.resolver = resolver || null;
    this.stateManager = stateManager || null;
    this.memory = memory || null;
    this.timingEngine = timingEngine || null;

    this.config = {
      apiUrl: config.apiUrl || '',
      lessonMomentEndpoint: config.lessonMomentEndpoint || '/tami/lesson-moment',
      aiTimeoutMs: config.aiTimeoutMs || 8000,
      enableInactivityCheck: config.enableInactivityCheck !== false,
      inactivityCheckIntervalMs: config.inactivityCheckIntervalMs || 10000,
      debugMode: config.debugMode || false,
      ...config
    };

    // ---- Internal state ----
    this._connected = false;
    this._inactivityTimer = null;
    this._pendingAICall = null;     // Promise for in-flight AI call
    this._listeners = {};
    this._resolutionLog = [];       // Track resolver decisions for tuning

    // ---- Callback for orchestrator to receive AI actions ----
    // The orchestrator registers this to get notified when AI
    // produces an action (or a fallback fires).
    this._actionHandler = null;
  }

  // ============================================================
  // EVENT SYSTEM
  // ============================================================

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
        try { cb(data); } catch (err) { console.error(`[Bridge] Event error [${event}]:`, err); }
      });
    }
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Connect the bridge to the engine and start listening.
   * Call this after the orchestrator is initialized but before
   * the lesson starts.
   *
   * @param {Object} lessonContext
   * @param {string} lessonContext.lessonId
   * @param {string} lessonContext.studentId
   * @param {Object} lessonContext.studentProfile
   * @param {string} lessonContext.ambassadorPrompt
   * @param {Object} lessonContext.lessonData
   */
  connect(lessonContext) {
    if (this._connected) {
      this._log('Already connected. Disconnect first.');
      return;
    }

    // Initialize the intelligence layer
    this.intelligence.initialize(lessonContext);

    // Wire engine events
    this._wireEvents();

    // Start inactivity monitor
    if (this.config.enableInactivityCheck) {
      this._startInactivityMonitor();
    }

    this._connected = true;
    this.emit('bridge:connected', { lessonId: lessonContext.lessonId });
    this._log('Bridge connected.');
  }

  /**
   * Disconnect the bridge and clean up.
   */
  disconnect() {
    this._connected = false;

    // Stop inactivity monitor
    if (this._inactivityTimer) {
      clearInterval(this._inactivityTimer);
      this._inactivityTimer = null;
    }

    // Unwire events (engine uses simple on/off, we stored unsub functions)
    if (this._unsubscribers) {
      this._unsubscribers.forEach(unsub => unsub());
      this._unsubscribers = [];
    }

    this.emit('bridge:disconnected', {});
    this._log('Bridge disconnected.');
  }

  /**
   * Register a callback to receive AI actions (or fallbacks).
   * The orchestrator uses this to know when T.A.M.i has something to say.
   *
   * @param {Function} handler - Called with (action) where action has:
   *   { source: 'ai'|'fallback', type: string, dialogue: string, ... }
   */
  onAction(handler) {
    this._actionHandler = handler;
  }

  // ============================================================
  // EVENT WIRING
  // ============================================================

  _wireEvents() {
    this._unsubscribers = [];

    // ---- Moment enter → update intelligence context ----
    this._unsubscribers.push(
      this.engine.on('moment:enter', ({ moment, state }) => {
        this.intelligence.processMomentEnter(moment, state);
      })
    );

    // ---- Response evaluated → check for struggle/milestone ----
    this._unsubscribers.push(
      this.engine.on('action:evaluated', ({ moment, outcome }) => {
        // Track last outcome for timing engine context
        this._lastOutcome = outcome.type;
        this._lastMoment = moment;

        // ── Difficulty ladder evaluation ──
        if (this.difficultyLadder && moment.concepts?.length > 0) {
          const concept = moment.concepts[0];
          const engineState = this.engine.getState();
          const engagement = this.memory ? this.memory.getEngagementSignals() : {};

          const ladderResult = this.difficultyLadder.evaluate({
            concept,
            outcome: outcome.type,
            confidence: engineState.confidence?.[concept] || 50,
            responseTimeMs: outcome.responseTimeMs || 0,
            engagement,
            questionCount: engagement.questionCount || 0,
          });

          if (ladderResult.changed) {
            this._log(`Difficulty ${ladderResult.action}: ${concept} rung ${ladderResult.previousRung}→${ladderResult.rung} (${ladderResult.reason})`);
            this.engine.logTelemetry(moment, {
              type: 'difficulty_change',
              concept,
              action: ladderResult.action,
              previousRung: ladderResult.previousRung,
              newRung: ladderResult.rung,
              recommendation: ladderResult.recommendation,
              reason: ladderResult.reason,
            });
          }

          // Apply confidence multiplier — adjust how the engine updates confidence
          if (ladderResult.confidenceMultiplier !== 1.0) {
            this._lastConfidenceMultiplier = ladderResult.confidenceMultiplier;
          }

          // ── Profile evaluation: check if teaching style should switch ──
          if (this.profileManager) {
            const profileSwitch = this.profileManager.evaluateSwitch({
              rung: ladderResult.rung,
              engagement: engagement.trend || 'engaged',
              confusionCount: engagement.confusionCount || 0,
              streak: this.difficultyLadder.getAllRungs()[concept]?.streak || 0,
              confidence: engineState.confidence?.[concept] || 50,
              lastOutcome: outcome.type,
            });

            if (profileSwitch?.switched) {
              this._log(`Profile switch: ${profileSwitch.from} → ${profileSwitch.to} (${profileSwitch.reason})`);
              this.engine.logTelemetry(moment, {
                type: 'profile_switch',
                from: profileSwitch.from,
                to: profileSwitch.to,
                reason: profileSwitch.reason,
                rung: ladderResult.rung,
              });
            }
          }
        }

        const detection = this.intelligence.processEvaluation({
          outcome: outcome.type,
          moment,
          engineState: this.engine.getState()
        });

        if (detection) {
          this._handleDetection(detection);
        }
      })
    );

    // ---- Confidence update → check for drops/milestones ----
    this._unsubscribers.push(
      this.engine.on('confidence:update', (data) => {
        const detection = this.intelligence.processConfidenceUpdate(data);
        if (detection) {
          this._handleDetection(detection);
        }
      })
    );

    // ---- Branch resolve → track wrongTwice ----
    this._unsubscribers.push(
      this.engine.on('branch:resolve', (data) => {
        this.intelligence.processBranchResolve(data);
      })
    );

    // ---- Lesson complete → trigger summary ----
    this._unsubscribers.push(
      this.engine.on('lesson:complete', () => {
        const detection = this.intelligence.processLessonComplete(this.engine.getState());
        this._handleDetection(detection);
      })
    );
  }

  // ============================================================
  // DETECTION HANDLER
  // ============================================================

  /**
   * Handle a detection from the intelligence layer.
   *
   * v2 flow:
   *   1. If strategy resolver exists → try deterministic resolution
   *   2. If resolved → deliver strategy action directly (no Claude call)
   *   3. If escalated → call Claude via backend
   *   4. If no resolver → fall back to v1 behavior (aiNeeded check)
   */
  async _handleDetection(detection) {
    if (!detection) return;

    this._log(`Detection: ${detection.detection}`, detection);

    // Timing context — passed through to _deliverAction
    const timingCtx = {
      moment: this._lastMoment || null,
      lastOutcome: this._lastOutcome || null,
    };

    // ---- v2: Strategy Resolver gate ----
    if (this.resolver) {
      const stateSnapshot = this.stateManager ? this.stateManager.getState() : null;
      const memorySnapshot = this.memory ? this.memory.getTeachingSnapshot() : null;

      const resolution = this.resolver.resolve(detection, stateSnapshot, memorySnapshot);
      this._resolutionLog.push(resolution);

      this._log(`Resolver: resolved=${resolution.resolved}, confidence=${resolution.confidence}, escalate=${resolution.escalate}, reason=${resolution.reason}`);
      this.emit('bridge:resolver_result', resolution);

      if (resolution.resolved && resolution.strategy) {
        // Deterministic resolution — no Claude call needed
        const action = this._strategyToAction(resolution.strategy);
        this._deliverAction(action, timingCtx);
        return;
      }

      if (resolution.escalate && detection.aiNeeded) {
        // Resolver says Claude is needed AND intelligence layer agrees
        this.emit('bridge:ai_pending', { detection: detection.detection, resolverReason: resolution.reason });
        const action = await this._callBackend(detection);
        this._deliverAction(action, timingCtx);
        return;
      }

      // Resolver didn't resolve and didn't escalate — use fallback
      if (!resolution.resolved && !resolution.escalate) {
        const fallback = this.intelligence.getFallback(detection);
        this._deliverAction(fallback, timingCtx);
        return;
      }
    }

    // ---- v1 fallback: No resolver wired ----
    if (detection.aiNeeded) {
      this.emit('bridge:ai_pending', { detection: detection.detection });
      const action = await this._callBackend(detection);
      this._deliverAction(action, timingCtx);
    } else {
      const fallback = this.intelligence.getFallback(detection);
      this._deliverAction(fallback, timingCtx);
    }
  }

  /**
   * Convert a strategy resolver result into an action the orchestrator
   * can consume. Matches the same shape as intelligence.mergeResponse().
   */
  _strategyToAction(strategy) {
    return {
      source: 'resolver',
      type: strategy.action || 'encouragement_inject',
      dialogue: strategy.dialogue || '',
      visualAsset: strategy.visualAsset || null,
      alternateVisuals: strategy.alternateVisuals || [],
      targetConcept: strategy.targetConcept || null,
      celebration: strategy.celebration || null,
      difficultyAdjustment: strategy.difficultyAdjustment || null,
      paceAdjustment: strategy.paceAdjustment || null,
      strategyType: strategy.type,
    };
  }

  // ============================================================
  // BACKEND COMMUNICATION
  // ============================================================

  /**
   * Call the backend /tami/lesson-moment endpoint.
   * Validates the response and either merges it or falls back.
   *
   * @param {Object} detection - From intelligence layer
   * @returns {Object} Action to execute (AI or fallback)
   */
  async _callBackend(detection) {
    // Record the call
    this.intelligence.recordAICall();

    try {
      // Build request
      const url = `${this.config.apiUrl}${this.config.lessonMomentEndpoint}`;
      const body = {
        context: detection.context,
        detection_type: detection.detection,
        reasons: detection.reasons || [],
      };

      this._log('Calling backend:', url);

      // Fetch with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.aiTimeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body).replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ''),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const rawResponse = await response.json();
      this._log('Backend response:', rawResponse);

      // ---- Validate via contract ----
      const validation = this.contract.validate(rawResponse.tami_response || rawResponse);

      if (validation.valid) {
        // Log warnings
        if (validation.warnings.length > 0) {
          this._log('Response warnings:', validation.warnings);
        }

        // Merge into action
        this.emit('bridge:ai_complete', { success: true });
        return this.intelligence.mergeResponse(validation.data, detection);

      } else {
        // Validation failed — log and fallback
        this._log('Response validation FAILED:', validation.errors);
        this.intelligence.emit('tami:ai_error', {
          type: 'validation_failed',
          errors: validation.errors,
          rawResponse
        });
        this.emit('bridge:ai_complete', { success: false, reason: 'validation_failed' });
        return this.intelligence.getFallback(detection);
      }

    } catch (err) {
      // Network error, timeout, or parse error
      this._log('Backend call failed:', err.message);

      const errorType = err.name === 'AbortError' ? 'timeout' : 'network_error';
      this.intelligence.emit('tami:ai_error', {
        type: errorType,
        message: err.message
      });
      this.emit('bridge:ai_complete', { success: false, reason: errorType });

      return this.intelligence.getFallback(detection);
    }
  }

  // ============================================================
  // ACTION DELIVERY
  // ============================================================

  /**
   * Deliver an action (AI or fallback) to the orchestrator.
   */
  _deliverAction(action, detectionContext) {
    if (!action) return;

    this._log('Delivering action:', action.type, action.source);

    // ---- Timing Engine wrap ----
    if (this.timingEngine) {
      const timingContext = {
        state: this.stateManager ? this.stateManager.getState() : null,
        memory: this.memory ? this.memory.getTeachingSnapshot() : null,
        moment: detectionContext?.moment || null,
        lastOutcome: detectionContext?.lastOutcome || null,
      };

      const wrapped = this.timingEngine.wrapAction(action, timingContext);
      this._log(`Timing: delay=${wrapped.delayMs}ms, hold=${wrapped.holdMs}ms, reason=${wrapped.timing.reason}`);

      // Deliver with timing metadata
      const timedAction = {
        ...action,
        timing: {
          delayMs: wrapped.delayMs,
          holdMs: wrapped.holdMs,
          ...wrapped.timing,
        },
      };

      if (wrapped.delayMs > 0) {
        // Schedule delayed delivery
        const handle = this.timingEngine.scheduleAction(() => {
          this._executeDelivery(timedAction);
        }, wrapped.delayMs);

        this.emit('bridge:action_scheduled', {
          delayMs: wrapped.delayMs,
          holdMs: wrapped.holdMs,
          cancel: handle.cancel,
        });
        return;
      }

      // No delay — deliver immediately with hold metadata
      this._executeDelivery(timedAction);
      return;
    }

    // No timing engine — deliver immediately (v1 behavior)
    this._executeDelivery(action);
  }

  /**
   * Execute the actual delivery to the action handler and emit events.
   * Separated from _deliverAction so timing can schedule it.
   */
  _executeDelivery(action) {
    if (this._actionHandler) {
      this._actionHandler(action);
    }

    // Emit typed event based on source
    const eventMap = {
      ai: 'tami:ai_response',
      resolver: 'tami:resolver_response',
      fallback: 'tami:ai_fallback',
    };
    const eventName = eventMap[action.source] || 'tami:ai_fallback';
    this.emit(eventName, action);
  }

  // ============================================================
  // INACTIVITY MONITOR
  // ============================================================

  _startInactivityMonitor() {
    this._inactivityTimer = setInterval(() => {
      if (!this._connected) return;

      const detection = this.intelligence.processResponseDelay();
      if (detection) {
        this._handleDetection(detection);
      }
    }, this.config.inactivityCheckIntervalMs);
  }

  // ============================================================
  // DEBUG
  // ============================================================

  _log(...args) {
    if (this.config.debugMode) {
      console.log('[TAMi Bridge]', ...args);
    }
  }

  /**
   * Get bridge status for debugging.
   */
  getStatus() {
    const resolverStats = this.resolver && this._resolutionLog.length > 0
      ? TAMiStrategyResolver.analyzeResolutions(this._resolutionLog)
      : null;

    return {
      connected: this._connected,
      hasPendingCall: this._pendingAICall !== null,
      hasResolver: this.resolver !== null,
      resolverStats,
      intelligenceStatus: this.intelligence.getStatus(),
    };
  }

  /**
   * Get the full resolution log for debugging/analytics.
   */
  getResolutionLog() {
    return [...this._resolutionLog];
  }
}

// ============================================================
// FACTORY: Quick setup for common case
// ============================================================

/**
 * Create and wire up the full T.A.M.i stack in one call.
 *
 * v2: Now includes Strategy Resolver, State Manager, and Micro-Memory.
 *
 * Usage:
 *   const tami = TAMiBridge.createStack({
 *     engine: myEngine,
 *     orchestrator: myOrchestrator,
 *     apiUrl: 'https://my-backend.railway.app',
 *     debugMode: true
 *   });
 *
 *   tami.bridge.onAction((action) => {
 *     // Handle AI-generated dialogue, encouragement, resolver strategies, etc.
 *     console.log(action.source); // 'ai' | 'resolver' | 'fallback'
 *   });
 *
 *   tami.bridge.connect({
 *     lessonId: 'L01_c_major_scale',
 *     studentId: 'stu_123',
 *     studentProfile: { ... },
 *     ambassadorPrompt: '...',
 *     lessonData: { ... }
 *   });
 *
 * @returns {{ intelligence, contract, resolver, stateManager, memory, timingEngine, bridge }}
 */
TAMiBridge.createStack = function({ engine, orchestrator, apiUrl, debugMode = false, config = {} }) {
  // Core components
  const memory = new TAMiMicroMemory(config.memory || {});
  const stateManager = new TAMiStateManager({ memory, config: config.stateManager || {} });
  const intelligence = new TAMiIntelligenceLayer({
    stateManager,
    ...(config.intelligence || {})
  });
  const contract = new TAMiResponseContract();
  const resolver = new TAMiStrategyResolver(config.resolver || {});
  const timingEngine = new TAMiTimingEngine(config.timing || {});

  // Difficulty ladder (optional — imported dynamically if available)
  let difficultyLadder = null;
  try {
    if (typeof TAMiDifficultyLadder !== 'undefined') {
      difficultyLadder = new TAMiDifficultyLadder(config.difficulty || {});
    }
  } catch (e) { /* Ladder not loaded — runs without it */ }

  // Profile manager (optional — imported dynamically if available)
  let profileManager = null;
  try {
    if (typeof TAMiProfileManager !== 'undefined') {
      profileManager = new TAMiProfileManager(config.profiles || {});
      // Wire profile manager into resolver so it can query active profile
      resolver.profileManager = profileManager;
    }
  } catch (e) { /* Profiles not loaded — runs without them */ }

  // Wire the bridge with everything
  const bridge = new TAMiBridge({
    engine,
    orchestrator,
    intelligence,
    contract,
    resolver,
    stateManager,
    memory,
    timingEngine,
    config: {
      apiUrl,
      debugMode,
      ...(config.bridge || {})
    }
  });

  // Expose components on the bridge for external init
  bridge.difficultyLadder = difficultyLadder;
  bridge.profileManager = profileManager;

  return { intelligence, contract, resolver, stateManager, memory, timingEngine, difficultyLadder, profileManager, bridge };
};

// ---- Exports ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAMiBridge };
} else if (typeof window !== 'undefined') {
  window.TAMiBridge = TAMiBridge;
}

export { TAMiBridge };
