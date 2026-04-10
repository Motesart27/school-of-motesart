import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { replaceState, getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

/**
 * PlayItChapter.jsx
 *
 * Step 4 of T_MAJOR_SCALE_PATTERN: Play the pattern.
 * Student plays C-D-E-F-G-A-B-C in order on the keyboard.
 * Reinforces "together" moments at E->F and B->C.
 *
 * Success = all 8 notes in order (binary).
 * Timing is soft — recorded but not gated.
 *
 * Language rules:
 *   "together" = student-facing main word
 *   "squeeze"  = T.A.M.i coaching flavor only
 *   Numbers (1-8) = Motesart voice, not letter names
 */

const CONCEPT_ID = 'T_MAJOR_SCALE_PATTERN'
const API_BASE = 'https://motesart-converter.netlify.app'

const SCALE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C5']
const NOTE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8']

// Together pairs: when moving FROM index to index, these are the "together" moments
const TOGETHER_TRANSITIONS = { 2: 3, 6: 7 } // E->F (index 2->3), B->C (index 6->7)

const CHAPTERS = ['Hear It', 'Say It', 'Find It', 'Play It', 'Move It', 'Own It']
const CURRENT_CHAPTER = 3 // Play It = index 3

const KEYBOARD_KEYS = [
  { note: 'C', label: 'C', isBlack: false, scaleIndex: 0 },
  { note: 'C#', label: '', isBlack: true, scaleIndex: -1 },
  { note: 'D', label: 'D', isBlack: false, scaleIndex: 1 },
  { note: 'D#', label: '', isBlack: true, scaleIndex: -1 },
  { note: 'E', label: 'E', isBlack: false, scaleIndex: 2 },
  { note: 'F', label: 'F', isBlack: false, scaleIndex: 3 },
  { note: 'F#', label: '', isBlack: true, scaleIndex: -1 },
  { note: 'G', label: 'G', isBlack: false, scaleIndex: 4 },
  { note: 'G#', label: '', isBlack: true, scaleIndex: -1 },
  { note: 'A', label: 'A', isBlack: false, scaleIndex: 5 },
  { note: 'A#', label: '', isBlack: true, scaleIndex: -1 },
  { note: 'B', label: 'B', isBlack: false, scaleIndex: 6 },
  { note: 'C5', label: 'C', isBlack: false, scaleIndex: 7 },
]

function generateEventId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export default function PlayItChapter() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [wrongTaps, setWrongTaps] = useState([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [flashKey, setFlashKey] = useState(null)
  const [flashType, setFlashType] = useState(null)
  const [togetherPulse, setTogetherPulse] = useState(null)
  const [ambassadorMsg, setAmbassadorMsg] = useState('Start on 1. Most notes skip. Watch when they come together.')
  const [paceMsArr, setPaceMsArr] = useState([])
  const [stalledOn, setStalledOn] = useState(null)
  const lastTapTime = useRef(Date.now())
  const wrongTapCount = useRef(0)

  const handleKeyTap = useCallback((note, scaleIndex) => {
    if (isComplete) return

    const now = Date.now()
    const elapsed = now - lastTapTime.current
    setAttemptCount(prev => prev + 1)

    // Is this the correct next note?
    if (scaleIndex === currentStep) {
      // Correct tap
      lastTapTime.current = now
      setPaceMsArr(prev => [...prev, elapsed])
      wrongTapCount.current = 0

      // Flash green
      setFlashKey(note)
      setFlashType('correct')
      setTimeout(() => { setFlashKey(null); setFlashType(null) }, 300)

      const newCompleted = [...completedSteps, scaleIndex]
      setCompletedSteps(newCompleted)

      // Check for "together" moment
      if (TOGETHER_TRANSITIONS[currentStep] === currentStep + 1) {
        // We just played a note that leads into a "together" pair
        setTogetherPulse(currentStep)
        setTimeout(() => setTogetherPulse(null), 1200)
        if (currentStep === 2) {
          setAmbassadorMsg('Together here \u2014 no skip.')
        } else if (currentStep === 6) {
          setAmbassadorMsg('Last together pair \u2014 finish strong.')
        }
      } else if (currentStep + 1 < 8 && !TOGETHER_TRANSITIONS[currentStep + 1 - 1]) {
        // Normal progression message (only if not about to hit together)
        if (currentStep === 0) {
          setAmbassadorMsg('Good. Keep going \u2014 skip one, play the next.')
        }
      }

      // Check completion
      if (newCompleted.length === 8) {
        setIsComplete(true)
        setCurrentStep(8)
        setAmbassadorMsg('You executed the pattern. Next: move it to a new home.')
        writeCompletionState(newCompleted.map(i => SCALE_NOTES[i]), wrongTaps, attemptCount + 1, hintUsed, paceMsArr.concat([elapsed]), stalledOn)
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else {
      // Wrong tap
      wrongTapCount.current += 1
      setWrongTaps(prev => [...prev, note])

      // Track stalling
      if (wrongTapCount.current >= 3) {
        setStalledOn(NOTE_NUMBERS[currentStep])
      }

      setFlashKey(note)
      setFlashType('wrong')
      setTimeout(() => { setFlashKey(null); setFlashType(null) }, 300)
      setAmbassadorMsg("That's a skip spot \u2014 try the next white key.")
    }
  }, [currentStep, completedSteps, wrongTaps, attemptCount, hintUsed, isComplete, paceMsArr, stalledOn])

  const handleHint = useCallback(() => {
    if (isComplete) return
    setHintUsed(true)
    const nextNote = SCALE_NOTES[currentStep]
    const nextNum = NOTE_NUMBERS[currentStep]
    if (TOGETHER_TRANSITIONS[currentStep - 1] === currentStep) {
      setAmbassadorMsg('This note is together with the last one. Play ' + nextNote + ' (' + nextNum + ').')
    } else {
      setAmbassadorMsg('Next is ' + nextNote + ' (' + nextNum + '). Skip one and play.')
    }
  }, [currentStep, isComplete])

  function writeCompletionState(playedNotes, wrongTapsArr, attempts, hint, paceMs, stalled) {
    const eventPayload = {
      client_event_id: generateEventId(),
      student_instrument_id: getStudentId(),
      concept_id: CONCEPT_ID,
      chapter: 'play_it',
      result: 'complete',
        success_summary: 'executed the major scale pattern from home',
      found_pairs: playedNotes,
      wrong_taps: wrongTapsArr,
      attempt_count: attempts,
      hint_used: hint,
      tempo_factor: 1.0,
      timestamp: new Date().toISOString()
    }

    const confidence = wrongTapsArr.length === 0 && !hint ? 0.9
      : wrongTapsArr.length <= 2 && !hint ? 0.7
      : wrongTapsArr.length <= 4 ? 0.5
      : 0.3

    const conceptState = {
      confidence: confidence,
      trend: 'improving',
      mistake_pattern: wrongTapsArr.length > 0
        ? 'Wrong taps during play: ' + wrongTapsArr.join(', ')
        : 'No wrong taps \u2014 played pattern perfectly',
      recommended_strategy: confidence >= 0.7
        ? 'Ready to advance to Move It chapter'
        : 'May benefit from repeating Play It',
      next_action: 'move_it',
      evidence_summary: 'Play It complete: played ' + playedNotes.join('-')
        + ' in ' + attempts + ' taps'
        + (hint ? ' (hint used)' : '')
        + (wrongTapsArr.length > 0 ? '. Wrong taps: ' + wrongTapsArr.join(', ') : '. No wrong taps')
        + '. Confidence: ' + (confidence * 100) + '%',
      mastery_ready: confidence >= 0.7,
      chapter_results: { play_it: eventPayload }
    }

    replaceState(CONCEPT_ID, conceptState)
    console.log('[PlayIt] Event payload:', eventPayload)
    console.log('[PlayIt] Concept state written:', conceptState)

    fetch(API_BASE + '/api/practice-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    })
      .then(function(res) { return res.json() })
      .then(function(data) {
        console.log('[PlayIt] API event response:', data)
        return fetch(API_BASE + '/api/concept-state/recompute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_instrument_id: eventPayload.student_instrument_id,
            concept_id: eventPayload.concept_id
          })
        })
      })
      .then(function(res) { return res.json() })
      .then(function(data) {
        console.log('[PlayIt] API recompute response:', data)
      })
      .catch(function(err) {
        console.warn('[PlayIt] API write failed (localStorage still saved):', err)
      })
  }

  return (
    <div style={styles.container}>
      {/* Track bar */}
      <div style={styles.trackBar}>
        <div style={styles.trackLabel}>CURRICULUM</div>
        <div style={styles.trackTitle}>
          <span style={styles.trackSchool}>School</span>
          <span style={styles.trackFast}>Motesart Fast</span>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Chapter header */}
        <div style={styles.conceptHeader}>
          <div style={styles.conceptTitle}>The Major Scale Pattern</div>
              <div style={styles.conceptPurpose}>Learn the shape.</div>
              <div style={styles.homeBadge}>Home: C</div>
          <div style={styles.conceptTrack}>Fast Track: Core Patterns</div>
          <div style={styles.chapterLabel}>Step 4 \u00b7 Play It</div>
        </div>

        {/* Chapter nav */}
        <div style={styles.chapterNav}>
          {CHAPTERS.map((ch, i) => (
            <div key={ch} style={{
              ...styles.chapterDot,
              color: i === CURRENT_CHAPTER ? '#22d3ee' : i < CURRENT_CHAPTER ? '#34d399' : '#475569',
              fontWeight: i === CURRENT_CHAPTER ? 700 : 400,
            }}>{ch}</div>
          ))}
        </div>

        <div style={styles.twoCol}>
          {/* Left panel */}
          <div style={styles.leftPanel}>
            <div style={styles.sectionTitle}>Play the pattern</div>
            <div style={styles.sectionSubtitle}>
              Play the major scale pattern on the keyboard.{' '}
              Start from the note shown. Follow the pattern.
            </div>

            <div style={styles.patternBox}>
              <div style={styles.patternLabel}>THE PATTERN</div>
              <div style={styles.patternText}>
                1 skip 1, 2 skip 1, 3 & 4 <span style={styles.togetherWord}>together</span>, 4 skip 1, 5 skip 1, 6 skip 1, 7 & 8 <span style={styles.togetherWord}>together</span>
              </div>
            </div>

            <div style={styles.whatToDo}>
              <div style={styles.patternLabel}>WHAT TO DO NOW</div>
              <div style={styles.sectionSubtitle}>
                Start on 1. Play each note in order up to 8.
              </div>
              <div style={styles.goalText}>
                <span style={styles.goalLabel}>Goal:</span> Play all 8 notes \u2014 skip where it skips, stay close where they're together.
              </div>
            </div>

            <AmbassadorBubble message={ambassadorMsg} ambassadorId="motesart" />

            <div style={styles.toolRow}>
              <div style={styles.toolBtn} onClick={handleHint}>Hint</div>
            </div>
          </div>

          {/* Right panel — keyboard area */}
          <div style={styles.rightPanel}>
            {/* Start note cue */}
            <div style={styles.startCue}>
              {isComplete ? 'Pattern complete!' : 'Now playing: ' + NOTE_NUMBERS[currentStep] + (currentStep < 8 ? ' (' + SCALE_NOTES[currentStep] + ')' : '')}
            </div>

            {/* Progress strip */}
            <div style={styles.progressStrip}>
              {NOTE_NUMBERS.map((num, i) => (
                <div key={i} style={{
                  ...styles.progressDot,
                  background: completedSteps.includes(i) ? '#34d399'
                    : i === currentStep ? '#22d3ee'
                    : '#1e293b',
                  transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: i === currentStep ? '0 0 8px #22d3ee' : 'none',
                }}>
                  <div style={styles.progressNum}>{num}</div>
                </div>
              ))}
            </div>

            {/* Together label */}
            {togetherPulse !== null && (
              <div style={styles.togetherLabel}>together</div>
            )}

            {/* Keyboard */}
            <div style={styles.keyboard}>
              {KEYBOARD_KEYS.map((key, i) => {
                const isNext = key.scaleIndex === currentStep && !isComplete
                const isCompleted = completedSteps.includes(key.scaleIndex)
                const isFlashing = flashKey === key.note
                const isTogetherPair = togetherPulse !== null && (key.scaleIndex === togetherPulse || key.scaleIndex === togetherPulse + 1)

                let keyBg = key.isBlack ? '#1a1a2e' : '#e2e8f0'
                if (isComplete && key.scaleIndex >= 0) keyBg = '#34d399'
                else if (isFlashing && flashType === 'correct') keyBg = '#34d399'
                else if (isFlashing && flashType === 'wrong') keyBg = '#ef4444'
                else if (isTogetherPair) keyBg = '#f59e0b'
                else if (isCompleted) keyBg = '#86efac'
                else if (isNext) keyBg = '#22d3ee'

                return (
                  <div
                    key={i}
                    onClick={() => key.scaleIndex >= 0 ? handleKeyTap(key.note, key.scaleIndex) : null}
                    style={{
                      ...key.isBlack ? styles.blackKey : styles.whiteKey,
                      background: keyBg,
                      cursor: key.scaleIndex >= 0 && !isComplete ? 'pointer' : 'default',
                      transition: 'background 0.15s, transform 0.1s',
                    }}
                  >
                    {!key.isBlack && <div style={styles.keyLabel}>{key.label}</div>}
                  </div>
                )
              })}
            </div>

            {/* Completion state */}
            {isComplete && (
              <div style={styles.completionBox}>
                <div style={styles.completionText}>You executed the pattern from home. Next: prove it transfers to any home.</div>
                <div style={styles.ctaBtn} onClick={() => navigate('/practice/T_MAJOR_SCALE_PATTERN')}>
                  Next: Move It
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: '#0a0a14',
    color: '#e2e8f0',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  trackBar: {
    padding: '6px 16px',
    background: '#05050d',
    borderBottom: '1px solid #1a1a2e',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#64748b' },
  trackTitle: { display: 'flex', gap: 8 },
  trackSchool: { fontSize: 11, color: '#a78bfa' },
  trackFast: { fontSize: 11, color: '#22d3ee' },
  mainContent: { flex: 1, overflow: 'auto', padding: '8px 16px' },
  conceptHeader: { marginBottom: 8 },
  conceptTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' },
  conceptTrack: { fontSize: 10, color: '#64748b' },
  chapterLabel: { fontSize: 12, color: '#22d3ee', fontWeight: 600, marginTop: 2 },
  chapterNav: { display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  chapterDot: { fontSize: 10, cursor: 'default' },
  twoCol: { display: 'flex', gap: 16, flex: 1 },
  leftPanel: { width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' },
  sectionSubtitle: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 },
  patternBox: { background: '#0c0e16', border: '1px solid #1a1a2e', borderRadius: 8, padding: 10 },
  patternLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', color: '#64748b', marginBottom: 4 },
  patternText: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 },
  togetherWord: { color: '#f59e0b', fontWeight: 600 },
  whatToDo: { background: '#0c0e16', border: '1px solid #1a1a2e', borderRadius: 8, padding: 10 },
  goalText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  goalLabel: { fontWeight: 700, color: '#22d3ee' },
  toolRow: { display: 'flex', gap: 8 },
  toolBtn: { fontSize: 10, color: '#64748b', cursor: 'pointer', padding: '4px 10px', border: '1px solid #1e293b', borderRadius: 6, background: '#0c0e16' },
  startCue: { fontSize: 13, fontWeight: 600, color: '#22d3ee', textAlign: 'center' },
  progressStrip: { display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  progressNum: { fontSize: 11, fontWeight: 700, color: '#0a0a14' },
  togetherLabel: { fontSize: 13, fontWeight: 700, color: '#f59e0b', textAlign: 'center', animation: 'fadeIn 0.3s' },
  keyboard: { display: 'flex', position: 'relative', height: 140, userSelect: 'none' },
  whiteKey: { width: 44, height: 140, border: '1px solid #334155', borderRadius: '0 0 6px 6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 },
  blackKey: { width: 28, height: 85, marginLeft: -14, marginRight: -14, zIndex: 2, borderRadius: '0 0 4px 4px' },
  keyLabel: { fontSize: 10, color: '#1e293b', fontWeight: 600 },
  completionBox: { background: '#0c2a1a', border: '1px solid #34d399', borderRadius: 10, padding: 16, textAlign: 'center', marginTop: 8 },
  completionText: { fontSize: 12, color: '#86efac', marginBottom: 10, lineHeight: 1.5 },
  ctaBtn: { display: 'inline-block', padding: '8px 20px', background: '#22d3ee', color: '#0a0a14', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
}
