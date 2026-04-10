import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
// Dynamic import used in useEffect below to avoid TDZ crash

// ─── PHASE DATA ───
const PHASES = [
  { id: 'F01_BODY', num: 1, name: 'Body', desc: 'Physical awareness, hand shape, finger numbering', concepts: ['T_FINGER_NUMBERING', 'T_HAND_POSITION'] },
  { id: 'F02_BEAT_PATTERN', num: 2, name: 'Beat + Pattern', desc: 'Steady beat, rhythmic feel, interval patterns as chants', concepts: ['T_HALF_STEP', 'T_WHOLE_STEP', 'T_RHYTHM_BASIC', 'T_MAJOR_SCALE_PATTERN'] },
  { id: 'F03_VISUAL', num: 3, name: 'Visual', desc: 'Keyboard geography, pattern recognition, octave awareness', concepts: ['T_KEYBOARD_LAYOUT', 'T_SCALE_DEGREES_MAJOR', 'T_OCTAVE'] },
  { id: 'F04_EAR', num: 4, name: 'Ear', desc: 'Aural recognition of intervals, scales, tension/resolution', concepts: ['T_SHARPS_FLATS', 'T_INTERVALS_BASIC', 'T_TIME_SIGNATURE', 'T_EAR_INTERVALS', 'T_CHROMATIC'] },
  { id: 'F05_RIGHT_HAND', num: 5, name: 'Right Hand', desc: 'Right hand scale playing, C and G Major', concepts: ['T_C_MAJOR', 'T_G_MAJOR'] },
  { id: 'F06_LEFT_HAND', num: 6, name: 'Left Hand', desc: 'Left hand mirroring, bilateral coordination', concepts: [] },
  { id: 'F07_FEEL', num: 7, name: 'Feel', desc: 'Dynamics, major vs minor color, emotional expression', concepts: ['T_MAJOR_3RD', 'T_DYNAMICS'] },
  { id: 'F08_TOUCH', num: 8, name: 'Touch', desc: 'Refined touch, pedaling, articulation', concepts: ['T_PEDALING'] },
  { id: 'F09_FUNCTION', num: 9, name: 'Function', desc: 'Harmonic function, key signatures, sight reading', concepts: ['T_MINOR_SCALE', 'T_KEY_SIGNATURES', 'T_SIGHT_READING'] },
  { id: 'F10_CHORDS', num: 10, name: 'Chords', desc: 'Triads, chord quality, diatonic chord map', concepts: ['T_CHORDS_BASIC', 'T_DIATONIC_CHORD_MAP'] },
  { id: 'F11_SONGS', num: 11, name: 'Songs', desc: 'Real songs with 1-4-5-6 progressions', concepts: ['T_CHORD_PROGRESSIONS'] },
  { id: 'F12_PRACTICAL', num: 12, name: 'Practical', desc: 'Genre-specific application \u2014 gospel, pop, church, jazz', concepts: [] },
  { id: 'F13_EXPANSION', num: 13, name: 'Expansion', desc: 'Advanced concepts and creative exploration', concepts: [] },
]

// ─── CONCEPT NAMES ───
const CONCEPT_NAMES = {
  T_FINGER_NUMBERING: 'Finger Numbering',
  T_HAND_POSITION: 'Hand Position',
  T_HALF_STEP: 'Half Step \u2014 The Squeeze',
  T_WHOLE_STEP: 'Whole Step \u2014 The Skip',
  T_RHYTHM_BASIC: 'Basic Rhythm',
  T_MAJOR_SCALE_PATTERN: 'Major Scale Pattern \u2014 The Chant',
  T_KEYBOARD_LAYOUT: 'Keyboard Layout',
  T_SCALE_DEGREES_MAJOR: 'Scale Degrees \u2014 Home & Tension',
  T_OCTAVE: 'Octave',
  T_SHARPS_FLATS: 'Sharps & Flats',
  T_INTERVALS_BASIC: 'Basic Intervals',
  T_TIME_SIGNATURE: 'Time Signature',
  T_EAR_INTERVALS: 'Ear Intervals',
  T_CHROMATIC: 'Chromatic Scale',
  T_C_MAJOR: 'C Major Scale',
  T_G_MAJOR: 'G Major Scale',
  T_MAJOR_3RD: 'Major 3rd \u2014 The Smile',
  T_DYNAMICS: 'Dynamics',
  T_PEDALING: 'Pedaling',
  T_MINOR_SCALE: 'Minor Scale',
  T_KEY_SIGNATURES: 'Key Signatures',
  T_SIGHT_READING: 'Sight Reading',
  T_CHORDS_BASIC: 'Basic Chords',
  T_DIATONIC_CHORD_MAP: 'Diatonic Chord Map',
  T_CHORD_PROGRESSIONS: 'Chord Progressions',
}

// ─── FEEL MODE TASKS ───
const FEEL_TASKS = {
  T_HALF_STEP: {
    A: 'Identify squeeze on keyboard with visual markers',
    B: 'Find any half step by feel \u2014 no visual cues',
    C: 'Identify half steps in a new key by feel alone'
  },
  T_WHOLE_STEP: {
    A: 'Identify skip with visual markers',
    B: 'Contrast half vs whole by feel \u2014 no markers',
    C: 'Play alternating half and whole from any note'
  },
  T_MAJOR_SCALE_PATTERN: {
    A: 'Chant W-W-H-W-W-W-H with visual prompt',
    B: 'Chant from memory, identify squeeze points',
    C: 'Build scale from new note without visual aid'
  },
  T_SCALE_DEGREES_MAJOR: {
    A: 'Number C Major scale with visual guide',
    B: 'Assign degrees without guide, feel 7 tension',
    C: 'Assign degrees in G Major by feel'
  },
  T_MAJOR_3RD: {
    A: 'Play major/minor 3rd, identify bright with guide',
    B: 'Hear major vs minor, name without cue',
    C: 'Identify in new key by ear alone'
  }
}

// ─── MOCK STUDENT DATA ───
const MOCK_STUDENT_STATES = {
  T_FINGER_NUMBERING: { status: 'owned', confidence: 1.0, feelModes: { A: true, B: true, C: true } },
  T_HAND_POSITION: { status: 'owned', confidence: 1.0, feelModes: { A: true, B: true, C: true } },
  T_HALF_STEP: { status: 'accurate_with_support', confidence: 0.72, feelModes: { A: true, B: false, C: false } },
  T_WHOLE_STEP: { status: 'practicing', confidence: 0.58, feelModes: { A: true, B: false, C: false } },
  T_RHYTHM_BASIC: { status: 'introduced', confidence: 0.30, feelModes: { A: false, B: false, C: false } },
  T_MAJOR_SCALE_PATTERN: { status: 'practicing', confidence: 0.45, feelModes: { A: false, B: false, C: false } },
}

export default function CurriculumPath() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedPhaseNum, setSelectedPhaseNum] = useState(2)
  const [selectedConceptId, setSelectedConceptId] = useState(null)

  // Live curriculum data (replaces mock on load)
  const [livePhases, setLivePhases] = useState(null)
  const [liveStates, setLiveStates] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
            const { getStudentCurriculumView } = await import('../lesson_engine/curriculum_data_provider.js')
            const { getAllStates } = await import('../lesson_engine/concept_state_store.js')
            const liveStates = getAllStates()
            const data = await getStudentCurriculumView(liveStates)
            if (cancelled) return
        if (data?.phases?.length) setLivePhases(data.phases)
        if (data?.conceptStates) setLiveStates(data.conceptStates)
      } catch (err) {
        console.warn('[CurriculumPath] Live data load failed, using mock:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Use live data if available, fall back to mock
  const activePHASES = livePhases || PHASES
  const activeSTATES = liveStates || MOCK_STUDENT_STATES

  const currentPhase = activePHASES.find(p => p.num === selectedPhaseNum)
  const totalOwned = Object.values(activeSTATES).filter(s => s.status === 'owned').length

  const getPhaseState = (phaseNum) => {
    if (phaseNum < 2) return 'completed'
    if (phaseNum === 2) return 'current'
    return 'locked'
  }

  const getPhaseProgress = (phaseNum) => {
    const phase = activePHASES.find(p => p.num === phaseNum)
    if (!phase || phase.concepts.length === 0) return { owned: 0, total: 0 }
    const owned = phase.concepts.filter(cid => activeSTATES[cid]?.status === 'owned').length
    return { owned, total: phase.concepts.length }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #111827, #1f2937)', color: '#fff', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @keyframes pulseCurrent {
          0%, 100% { box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.3); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .phase-dot-current { animation: pulseCurrent 2s infinite; }
        .concept-card { animation: slideIn 0.3s ease-out; }
        .modal-overlay { animation: fadeIn 0.2s ease-out; }
      `}</style>

      {/* STICKY HEADER */}
      <div style={{ borderBottom: '1px solid #1f2937', position: 'sticky', top: 0, background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(12px)', zIndex: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/student')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: 0 }}>\u2190</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>My Curriculum Path</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Master the Fast Curriculum</div>
          </div>
        </div>
        <div style={{ background: 'rgba(55,65,81,0.5)', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Current Phase</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#14b8a6' }}>Phase {currentPhase.num}: {currentPhase.name}</div>
        </div>
      </div>

      {/* PROGRESS OVERVIEW BAR */}
      <div style={{ padding: '16px', background: 'rgba(31,41,55,0.6)', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {activePHASES.map((phase) => {
            const state = getPhaseState(phase.num)
            const isCurrentDot = phase.num === selectedPhaseNum && state === 'current'
            let bgColor = '#374151'
            if (state === 'completed') bgColor = '#14b8a6'
            if (state === 'current') bgColor = '#14b8a6'

            return (
              <button
                key={phase.num}
                onClick={() => state !== 'locked' && setSelectedPhaseNum(phase.num)}
                className={isCurrentDot ? 'phase-dot-current' : ''}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: bgColor,
                  border: 'none', cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: state === 'locked' ? 0.5 : 1, transition: 'all 0.3s ease',
                }}
                disabled={state === 'locked'}
              >
                {state === 'completed' ? '\u2713' : phase.num}
              </button>
            )
          })}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>Phase {selectedPhaseNum} of 13</span>
          <span style={{ margin: '0 8px' }}>\u00b7</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{totalOwned}</span>
          <span> concepts owned</span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, padding: 16, maxWidth: 1400, margin: '0 auto', alignItems: 'start' }}>
        {/* CURRENT PHASE CARD */}
        <div style={{ background: 'rgba(31,41,55,0.8)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(55,65,81,0.5)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>Phase {currentPhase.num}: {currentPhase.name}</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{currentPhase.desc}</p>
          </div>

          <div style={{ padding: 20 }}>
            {currentPhase.concepts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                <div style={{ fontSize: 14 }}>No concepts for this phase yet</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Reinforcement phase \u2014 practice existing skills</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {currentPhase.concepts.map((conceptId) => {
                  const state = activeSTATES[conceptId]
                  const name = CONCEPT_NAMES[conceptId]
                  if (!state) return (
                    <div key={conceptId} style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(55,65,81,0.3)', borderRadius: 10, padding: 12, opacity: 0.5 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>{name || conceptId}</div>
                      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>Not yet started</div>
                    </div>
                  )

                  const statusBadgeColors = {
                    introduced: { bg: '#4b5563', text: '#d1d5db', label: 'Introduced' },
                    practicing: { bg: '#1e40af', text: '#93c5fd', label: 'Practicing' },
                    accurate_with_support: { bg: '#92400e', text: '#fcd34d', label: 'With Support' },
                    accurate_without_support: { bg: '#6b21a8', text: '#d8b4fe', label: 'Accurate' },
                    owned: { bg: '#134e4a', text: '#5eead4', label: '\u2713 Owned' },
                  }
                  const badge = statusBadgeColors[state.status] || statusBadgeColors.introduced

                  return (
                    <div
                      key={conceptId}
                      className="concept-card"
                      onClick={() => setSelectedConceptId(conceptId)}
                      style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(55,65,81,0.5)', borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all 0.3s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(31,41,55,0.8)'; e.currentTarget.style.borderColor = 'rgba(75,120,180,0.5)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(17,24,39,0.6)'; e.currentTarget.style.borderColor = 'rgba(55,65,81,0.5)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Tap to see Feel Mode details</div>
                        </div>
                        <div style={{ background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                          {badge.label}
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>Confidence</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{Math.round(state.confidence * 100)}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(55,65,81,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #14b8a6)', width: `${state.confidence * 100}%`, transition: 'width 0.3s ease' }} />
                        </div>
                      </div>

                      {/* Feel Mode Gates */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['A', 'B', 'C'].map((mode) => {
                          const isPassed = state.feelModes[mode]
                          return (
                            <div key={mode} style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isPassed ? 'rgba(20,184,166,0.2)' : 'rgba(55,65,81,0.3)',
                              border: `2px solid ${isPassed ? '#14b8a6' : '#4b5563'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: isPassed ? '#14b8a6' : '#6b7280',
                            }}>
                              {isPassed ? '\u2713' : mode}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mastery Gate */}
            <div style={{ marginTop: 20, padding: 12, background: 'rgba(20,184,166,0.1)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.3)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#14b8a6', marginBottom: 8 }}>Phase Gate</div>
              <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                Master all concepts in this phase and complete all Feel Mode gates (A, B, C) to progress to the next phase.
              </div>
            </div>
          </div>
        </div>
        {/* PHASE LIST SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
          {activePHASES.map((phase) => {
            const state = getPhaseState(phase.num)
            const progress = getPhaseProgress(phase.num)
            const isSelected = phase.num === selectedPhaseNum

            return (
              <button
                key={phase.num}
                onClick={() => state !== 'locked' && setSelectedPhaseNum(phase.num)}
                disabled={state === 'locked'}
                style={{
                  background: isSelected ? 'rgba(20,184,166,0.15)' : 'rgba(31,41,55,0.6)',
                  border: isSelected ? '1px solid #14b8a6' : '1px solid rgba(55,65,81,0.5)',
                  borderRadius: 10, padding: 10,
                  cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                  color: '#fff', textAlign: 'left',
                  transition: 'all 0.3s ease',
                  opacity: state === 'locked' ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>
                    {state === 'completed' && '\u2713 '}
                    {state === 'locked' && '\ud83d\udd12 '}
                    Phase {phase.num}
                  </div>
                  {state === 'completed' && <span style={{ color: '#14b8a6', fontSize: 11 }}>Done</span>}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{phase.name}</div>
                {phase.concepts.length > 0 && (
                  <div style={{ fontSize: 10, color: '#6b7280' }}>
                    {progress.owned}/{progress.total} concepts
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* CONCEPT DETAIL MODAL */}
      {selectedConceptId && (
        <ConceptModal
          conceptId={selectedConceptId}
          state={activeSTATES[selectedConceptId]}
          name={CONCEPT_NAMES[selectedConceptId]}
          tasks={FEEL_TASKS[selectedConceptId]}
          onClose={() => setSelectedConceptId(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}

/* CONCEPT DETAIL MODAL */
function ConceptModal({ conceptId, state, name, tasks, onClose, navigate }) {
  if (!state) return null

  const statusBadgeColors = {
    introduced: { bg: '#4b5563', text: '#d1d5db', label: 'Introduced' },
    practicing: { bg: '#1e40af', text: '#93c5fd', label: 'Practicing' },
    accurate_with_support: { bg: '#92400e', text: '#fcd34d', label: 'With Support' },
    accurate_without_support: { bg: '#6b21a8', text: '#d8b4fe', label: 'Accurate' },
    owned: { bg: '#134e4a', text: '#5eead4', label: '\u2713 Owned' },
  }
  const badge = statusBadgeColors[state.status] || statusBadgeColors.introduced

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #111827, #1f2937)', borderRadius: 16, border: '1px solid rgba(55,65,81,0.5)', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, color: '#fff' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 6 }}>{name}</h2>
            <div style={{ background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, width: 'fit-content' }}>{badge.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 24, padding: 0, lineHeight: 1 }}>\u00d7</button>
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 20, padding: 12, background: 'rgba(31,41,55,0.6)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Current Confidence</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#14b8a6', marginBottom: 8 }}>{Math.round(state.confidence * 100)}%</div>
          <div style={{ height: 6, background: 'rgba(55,65,81,0.5)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #14b8a6)', width: `${state.confidence * 100}%` }} />
          </div>
        </div>

        {/* Feel Mode Gates */}
        {tasks && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Feel Mode Gates</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['A', 'B', 'C'].map((mode) => {
                const isPassed = state.feelModes[mode]
                const task = tasks[mode]
                return (
                  <div key={mode} style={{ padding: 12, background: isPassed ? 'rgba(20,184,166,0.1)' : 'rgba(55,65,81,0.2)', borderRadius: 8, border: `1px solid ${isPassed ? 'rgba(20,184,166,0.3)' : 'rgba(55,65,81,0.4)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: isPassed ? 'rgba(20,184,166,0.2)' : 'rgba(55,65,81,0.3)',
                        border: `2px solid ${isPassed ? '#14b8a6' : '#4b5563'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: isPassed ? '#14b8a6' : '#6b7280',
                      }}>
                        {isPassed ? '\u2713' : mode}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Gate {mode}</span>
                      {isPassed && <span style={{ fontSize: 10, color: '#14b8a6', marginLeft: 'auto' }}>\u2713 Passed</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>{task}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Next Action */}
        <div style={{ padding: 12, background: 'rgba(20,184,166,0.05)', borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Next Step</div>
          <div style={{ fontSize: 12, color: '#5eead4' }}>
            {state.status === 'owned' && 'Concept mastered! Move on to the next concept.'}
            {state.status === 'accurate_without_support' && 'Almost there! Complete the remaining Feel Mode gates.'}
            {state.status === 'accurate_with_support' && 'Keep practicing with support. Work through Gates B and C.'}
            {state.status === 'practicing' && 'Continue practicing. Try to advance to the next proficiency level.'}
            {state.status === 'introduced' && 'Get started! Begin with Gate A to establish foundational understanding.'}
          </div>
        </div>

        {/* Practice Button */}
        <button
          onClick={() => navigate('/game')}
          style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #0d9488, #059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #0f766e, #047857)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #0d9488, #059669)' }}
        >
          Practice This Concept
        </button>
      </div>
    </div>
  )
}
