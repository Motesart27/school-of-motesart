/**
 * ============================================================
 * TELEMETRY PANEL — Live Dev-Mode Session Dashboard
 * ============================================================
 *
 * Collapsible overlay that displays real-time lesson telemetry
 * during practice sessions. Visible only in dev mode.
 *
 * Data sources:
 *   - Engine state (confidence, phase, moments completed)
 *   - Micro-memory (engagement signals, struggles, breakthroughs)
 *   - Bridge (AI call count, resolver stats)
 *   - Telemetry log (event stream)
 *   - Question handler (question history)
 *
 * ============================================================
 */

import { useState, useEffect, useRef } from 'react'

// ── Confidence bar colors by range ──
function confColor(val) {
  if (val >= 80) return '#10b981'  // green — mastered
  if (val >= 60) return '#06b6d4'  // cyan — progressing
  if (val >= 40) return '#f59e0b'  // amber — needs work
  return '#ef4444'                  // red — struggling
}

// ── Friendly concept names ──
const CONCEPT_LABELS = {
  C_KEYBOARD: 'Keyboard',
  C_HALFWHOLE: 'Half/Whole',
  C_MAJSCALE: 'Maj Scale',
  C_CMAJOR: 'C Major',
  C_FINGERS: 'Fingers',
  C_OCTAVE: 'Octave',
}

// ── Trend indicator ──
function TrendBadge({ trend }) {
  const map = {
    engaged: { label: 'Engaged', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    slowing: { label: 'Slowing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    disengaging: { label: 'Disengaging', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  }
  const t = map[trend] || map.engaged
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: t.color,
      background: t.bg, padding: '2px 8px', borderRadius: 8,
    }}>
      {t.label}
    </span>
  )
}

// ── Mini bar chart for confidence ──
function ConfidenceBar({ concept, value }) {
  const label = CONCEPT_LABELS[concept] || concept
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', width: 60, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(2, value)}%`, height: '100%',
          background: confColor(value), borderRadius: 4,
          transition: 'width 0.5s ease, background 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: 9, color: confColor(value), width: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(value)}
      </span>
    </div>
  )
}

// ── Event log row ──
function EventRow({ entry, index }) {
  const typeColors = {
    student_question: '#8b5cf6',
    question_escalation: '#ef4444',
    outcome: '#10b981',
    replay: '#f59e0b',
    game_complete: '#06b6d4',
  }
  const color = typeColors[entry.type] || 'rgba(255,255,255,0.4)'
  const age = Math.round((Date.now() - entry.timestamp) / 1000)
  return (
    <div style={{ fontSize: 9, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 6 }}>
      <span style={{ color, fontWeight: 700, width: 80, flexShrink: 0 }}>{entry.type}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.concept || entry.outcome || entry.question?.substring(0, 40) || entry.moment || '—'}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{age}s</span>
    </div>
  )
}


export default function TelemetryPanel({ engineRef, tamiStackRef, questionHistory, visible }) {
  const [expanded, setExpanded] = useState(true)
  const [data, setData] = useState(null)
  const intervalRef = useRef(null)

  // Poll engine state every 500ms when visible
  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    function poll() {
      const engine = engineRef?.current
      const stack = tamiStackRef?.current
      if (!engine) return

      const state = engine.getDebugState?.() || {}
      const telemetry = engine.getTelemetry?.() || []
      const memory = stack?.memory
      const engagement = memory?.getEngagementSignals?.() || {}
      const struggles = memory?.getStruggleConcepts?.() || []
      const breakthroughs = memory?.getBreakthroughs?.() || []
      const recommendation = memory?.getStrategyRecommendation?.() || null
      const qHistory = questionHistory?.current || []
      const ladder = stack?.difficultyLadder || stack?.bridge?.difficultyLadder
      const ladderSnapshot = ladder?.getSnapshot?.() || null
      const profMgr = stack?.profileManager || stack?.bridge?.profileManager
      const profileSnapshot = profMgr?.getSnapshot?.() || null

      setData({
        // Engine
        phase: state.phase || '—',
        currentMoment: state.currentMomentId || '—',
        momentsCompleted: state.momentsCompleted || 0,
        confidence: state.confidence || {},

        // Engagement
        trend: engagement.trend || 'engaged',
        recentPace: engagement.recentPace || 'normal',
        avgResponseTime: Math.round(engagement.avgResponseTimeMs || 0),
        slowResponses: engagement.slowResponses || 0,
        replays: engagement.replays || 0,
        questionCount: engagement.questionCount || qHistory.length,
        confusionCount: engagement.confusionCount || 0,

        // Intelligence
        struggles: struggles.filter(s => !s.resolved),
        breakthroughs,
        recommendation,

        // Telemetry stream
        recentEvents: telemetry.slice(-12).reverse(),
        totalEvents: telemetry.length,

        // Questions
        recentQuestions: qHistory.slice(-5).reverse(),

        // Difficulty ladder
        ladderGlobal: ladderSnapshot?.globalRung || null,
        ladderConcepts: ladderSnapshot?.concepts || {},

        // Teaching profile
        profileId: profileSnapshot?.activeProfileId || null,
        profileName: profileSnapshot?.activeProfileName || null,
        profilePersonality: profileSnapshot?.personality || null,
        profilePacing: profileSnapshot?.pacingBias || null,
        profileReinforcement: profileSnapshot?.reinforcementMode || null,
        profileSwitchCount: profileSnapshot?.switchCount || 0,
        profileLastSwitch: profileSnapshot?.lastSwitch || null,
        profileOverride: profileSnapshot?.override || null,

        timestamp: Date.now(),
      })
    }

    poll()
    intervalRef.current = setInterval(poll, 500)
    return () => clearInterval(intervalRef.current)
  }, [visible, engineRef, tamiStackRef, questionHistory])

  if (!visible) return null

  const d = data || {}
  const confidenceEntries = Object.entries(d.confidence || {})

  return (
    <div style={{
      position: 'absolute', top: 68, right: 12, width: expanded ? 300 : 44,
      zIndex: 20, fontFamily: "'DM Sans', monospace",
      transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'absolute', top: 0, right: 0, width: 32, height: 32,
          background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 8, color: '#8b5cf6', fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}
        title="Toggle Telemetry Panel"
      >
        {expanded ? '×' : '📊'}
      </button>

      {expanded && (
        <div style={{
          background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12,
          padding: 14, paddingTop: 10, maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingRight: 28 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', fontFamily: 'Outfit, sans-serif' }}>
              T.A.M.i TELEMETRY
            </span>
            <TrendBadge trend={d.trend} />
          </div>

          {/* Phase + Moment */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Phase</div>
              <div style={{ fontSize: 12, color: '#06b6d4', fontWeight: 700 }}>{d.phase}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Moments</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{d.momentsCompleted || 0}</div>
            </div>
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { label: 'Avg RT', value: `${d.avgResponseTime}ms`, color: d.avgResponseTime > 8000 ? '#ef4444' : '#06b6d4' },
              { label: 'Pace', value: d.recentPace, color: d.recentPace === 'slow' ? '#f59e0b' : '#10b981' },
              { label: 'Qs', value: d.questionCount, color: d.questionCount >= 3 ? '#f59e0b' : '#8b5cf6' },
              { label: 'Replays', value: d.replays, color: d.replays >= 2 ? '#ef4444' : 'rgba(255,255,255,0.5)' },
              { label: 'Events', value: d.totalEvents, color: 'rgba(255,255,255,0.4)' },
            ].map(chip => (
              <div key={chip.label} style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{chip.label} </span>
                <span style={{ color: chip.color, fontWeight: 700 }}>{chip.value}</span>
              </div>
            ))}
          </div>

          {/* Confidence bars */}
          {confidenceEntries.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Concept Confidence
              </div>
              {confidenceEntries.map(([concept, val]) => (
                <ConfidenceBar key={concept} concept={concept} value={val} />
              ))}
            </div>
          )}

          {/* Difficulty Ladder */}
          {d.ladderGlobal && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Difficulty Ladder
                </span>
                <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                  Global: {d.ladderGlobal}
                </span>
              </div>
              {Object.entries(d.ladderConcepts).map(([concept, info]) => {
                const label = CONCEPT_LABELS[concept] || concept
                const rungColors = { 1: '#ef4444', 2: '#f59e0b', 3: '#06b6d4', 4: '#10b981', 5: '#8b5cf6' }
                const rungLabels = { 1: 'Found', 2: 'Strug', 3: 'Learn', 4: 'Conf', 5: 'Chal' }
                return (
                  <div key={concept} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', width: 60, textAlign: 'right' }}>{label}</span>
                    {[1,2,3,4,5].map(r => (
                      <div key={r} style={{
                        width: 14, height: 8, borderRadius: 2,
                        background: r <= info.rung ? rungColors[info.rung] : 'rgba(255,255,255,0.06)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                    <span style={{ fontSize: 8, color: rungColors[info.rung], fontWeight: 600 }}>
                      {rungLabels[info.rung]}
                    </span>
                    {info.streak > 0 && (
                      <span style={{ fontSize: 8, color: '#10b981' }}>🔥{info.streak}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Teaching Profile */}
          {d.profileId && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Teaching Profile
              </div>
              <div style={{
                padding: '6px 8px', borderRadius: 6,
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#c084fc' }}>
                    {d.profileName}
                  </span>
                  {d.profileOverride && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: '#f59e0b',
                      background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: 4,
                    }}>
                      OVERRIDE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 4, fontStyle: 'italic' }}>
                  {d.profilePersonality}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                    Pacing <span style={{ color: d.profilePacing > 1 ? '#f59e0b' : d.profilePacing < 1 ? '#06b6d4' : '#10b981', fontWeight: 700 }}>
                      {d.profilePacing}x
                    </span>
                  </span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                    Mode <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{d.profileReinforcement}</span>
                  </span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                    Switches <span style={{ color: d.profileSwitchCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                      {d.profileSwitchCount}
                    </span>
                  </span>
                </div>
                {d.profileLastSwitch && (
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                    Last: {d.profileLastSwitch.from} → {d.profileLastSwitch.to}
                    <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.2)' }}>
                      ({d.profileLastSwitch.reason})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Struggles */}
          {d.struggles?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                Struggling
              </div>
              {d.struggles.map((s, i) => (
                <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>
                  {CONCEPT_LABELS[s.concept] || s.concept} — {s.mistakeCount} mistakes
                </div>
              ))}
            </div>
          )}

          {/* Breakthroughs */}
          {d.breakthroughs?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                Breakthroughs
              </div>
              {d.breakthroughs.map((b, i) => (
                <div key={i} style={{ fontSize: 9, color: '#10b981' }}>
                  {CONCEPT_LABELS[b.concept] || b.concept}
                </div>
              ))}
            </div>
          )}

          {/* Strategy recommendation */}
          {d.recommendation && (
            <div style={{
              marginBottom: 8, padding: '4px 8px', borderRadius: 6,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
            }}>
              <div style={{ fontSize: 8, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1 }}>
                Recommendation
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                {d.recommendation.recommendation} — {d.recommendation.reason}
              </div>
            </div>
          )}

          {/* Recent questions */}
          {d.recentQuestions?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                Recent Questions
              </div>
              {d.recentQuestions.map((q, i) => (
                <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <span style={{
                    color: q.category === 'confusion' ? '#ef4444' : q.category === 'lesson_related' ? '#06b6d4' : '#f59e0b',
                    fontWeight: 700, marginRight: 4,
                  }}>
                    {q.category}
                  </span>
                  {q.text?.substring(0, 35)}{q.text?.length > 35 ? '…' : ''}
                </div>
              ))}
            </div>
          )}

          {/* Event stream */}
          {d.recentEvents?.length > 0 && (
            <div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                Event Stream
              </div>
              {d.recentEvents.map((e, i) => (
                <EventRow key={i} entry={e} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
