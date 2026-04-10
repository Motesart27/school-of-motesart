import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentId, getState, replaceState } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

const API_BASE = 'https://motesart-converter.netlify.app'
const CONCEPT_ID = 'T_MAJOR_SCALE_PATTERN'
const CHAPTERS = ['Hear It', 'Say It', 'Find It', 'Play It', 'Move It', 'Own It']
const CURRENT_CHAPTER = 4 // Move It = index 4
const NOTE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8']

// Together transitions always at scale positions 2->3 and 6->7
const TOGETHER_TRANSITIONS = { 2: 3, 6: 7 }

// All chromatic notes in order (for keyboard generation)
const CHROMATIC = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
]
const BLACK_NOTES = new Set(['C#','D#','F#','G#','A#','C#5','D#5','F#5','G#5','A#5'])

// Scale definitions for each home
const HOME_SCALES = {
  C: {
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C5'],
    labels: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'],
    togetherPairs: ['E-F', 'B-C'],
    keyboardStart: 0,  // Start at C
    keyboardEnd: 12     // End at C5
  },
  G: {
    notes: ['G', 'A', 'B', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    labels: ['G', 'A', 'B', 'C', 'D', 'E', 'F\u266f', 'G'],
    togetherPairs: ['B-C', 'F\u266f-G'],
    keyboardStart: 7,  // Start at G
    keyboardEnd: 19     // End at G5
  },
  F: {
    notes: ['F', 'G', 'A', 'A#', 'C5', 'D5', 'E5', 'F5'],
    labels: ['F', 'G', 'A', 'B\u266d', 'C', 'D', 'E', 'F'],
    togetherPairs: ['A-B\u266d', 'E-F'],
    keyboardStart: 5,  // Start at F
    keyboardEnd: 17     // End at F5
  }
}

// Curated homes in order
const HOMES_ORDER = ['C', 'G', 'F']

function generateEventId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function buildKeyboard(homeKey) {
  var scale = HOME_SCALES[homeKey]
  var keys = []
  for (var i = scale.keyboardStart; i <= scale.keyboardEnd; i++) {
    var note = CHROMATIC[i]
    var isBlack = BLACK_NOTES.has(note)
    var scaleIdx = scale.notes.indexOf(note)
    keys.push({
      note: note,
      label: scaleIdx >= 0 ? scale.labels[scaleIdx] : (isBlack ? '' : note.replace('5', '')),
      isBlack: isBlack,
      scaleIndex: scaleIdx,
      isInScale: scaleIdx >= 0
    })
  }
  return keys
}

export default function MoveItChapter() {
  var navigate = useNavigate()

  // Home progression state
  var [completedHomes, setCompletedHomes] = useState(['C']) // C already done from Play It
  var [currentHome, setCurrentHome] = useState('G')
  var [allHomesDone, setAllHomesDone] = useState(false)
  var [homeJustCompleted, setHomeJustCompleted] = useState(null)

  // Per-home play state
  var [currentStep, setCurrentStep] = useState(0)
  var [completedSteps, setCompletedSteps] = useState([])
  var [wrongTaps, setWrongTaps] = useState([])
  var [attemptCount, setAttemptCount] = useState(0)
  var [hintUsed, setHintUsed] = useState(false)
  var [isComplete, setIsComplete] = useState(false)
  var [flashKey, setFlashKey] = useState(null)
  var [flashType, setFlashType] = useState(null)
  var [togetherPulse, setTogetherPulse] = useState(null)
  var [ambassadorMsg, setAmbassadorMsg] = useState("Same pattern. New home.. Start on G  -- that's your 1 now.")
  var [paceMsArr, setPaceMsArr] = useState([])
  var [stalledOn, setStalledOn] = useState(null)
  var lastTapTime = useRef(Date.now())
  var wrongTapCount = useRef(0)

  var scale = HOME_SCALES[currentHome]
  var keyboardKeys = buildKeyboard(currentHome)

  function resetForHome(home) {
    setCurrentStep(0)
    setCompletedSteps([])
    setWrongTaps([])
    setAttemptCount(0)
    setHintUsed(false)
    setIsComplete(false)
    setFlashKey(null)
    setFlashType(null)
    setTogetherPulse(null)
    setPaceMsArr([])
    setStalledOn(null)
    setHomeJustCompleted(null)
    lastTapTime.current = Date.now()
    wrongTapCount.current = 0
    setCurrentHome(home)
    setAmbassadorMsg("Same pattern, new home. Start on " + home + "  -- that's your 1 now.")
  }

  var handleKeyTap = useCallback(function(note, scaleIndex) {
    if (isComplete || homeJustCompleted) return

    var now = Date.now()
    var elapsed = now - lastTapTime.current
    setAttemptCount(function(prev) { return prev + 1 })

    if (scaleIndex === currentStep) {
      // Correct tap
      lastTapTime.current = now
      setPaceMsArr(function(prev) { return prev.concat([elapsed]) })
      wrongTapCount.current = 0

      setFlashKey(note)
      setFlashType('correct')
      setTimeout(function() { setFlashKey(null); setFlashType(null) }, 300)

      var newCompleted = completedSteps.concat([currentStep])
      setCompletedSteps(newCompleted)

      // Check for together transition
      if (TOGETHER_TRANSITIONS[currentStep] === currentStep + 1) {
        setTogetherPulse(currentStep)
        setAmbassadorMsg("Together here again  -- it travels with the pattern.")
        setTimeout(function() { setTogetherPulse(null) }, 1200)
      } else if (TOGETHER_TRANSITIONS[currentStep - 1] === currentStep) {
        setAmbassadorMsg("Together pair complete. Keep going.")
      } else if (currentStep === 0) {
        setAmbassadorMsg("Good. " + currentHome + " is your 1. Now follow the pattern up.")
      } else {
        setAmbassadorMsg("Skip  -- keep moving.")
      }

      if (newCompleted.length >= 8) {
        // Home complete!
        setIsComplete(true)
        setHomeJustCompleted(currentHome)
        var newCompletedHomes = completedHomes.includes(currentHome) ? completedHomes : completedHomes.concat([currentHome])
        setCompletedHomes(newCompletedHomes)
        writeHomeCompletion(scale.notes, wrongTaps, attemptCount + 1, hintUsed, paceMsArr.concat([elapsed]), stalledOn, currentHome)

        // Check if all 3 homes done
        var allDone = HOMES_ORDER.every(function(h) { return newCompletedHomes.includes(h) })
        if (allDone) {
          setAllHomesDone(true)
          setAmbassadorMsg("You transferred the pattern to every home. It works from any starting note.")
        } else {
          var nextHome = HOMES_ORDER.find(function(h) { return !newCompletedHomes.includes(h) })
          setAmbassadorMsg("See? Same pattern. " + currentHome + " was your home  -- now try " + nextHome + ".")
        }
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else {
      // Wrong tap
      wrongTapCount.current += 1
      setWrongTaps(function(prev) { return prev.concat([note]) })
      if (wrongTapCount.current >= 3) {
        setStalledOn(NOTE_NUMBERS[currentStep])
      }
      setFlashKey(note)
      setFlashType('wrong')
      setTimeout(function() { setFlashKey(null); setFlashType(null) }, 300)
      if (scale.notes[currentStep] && BLACK_NOTES.has(scale.notes[currentStep])) {
        setAmbassadorMsg("The pattern needs a black key here. Trust it.")
      } else {
        setAmbassadorMsg("That's a skip spot  -- try the next note in the pattern.")
      }
    }
  }, [currentStep, completedSteps, wrongTaps, attemptCount, hintUsed, isComplete, paceMsArr, stalledOn, currentHome, completedHomes, homeJustCompleted, scale])

  var handleHint = useCallback(function() {
    if (isComplete) return
    setHintUsed(true)
    var nextNote = scale.labels[currentStep]
    var nextNum = NOTE_NUMBERS[currentStep]
    if (TOGETHER_TRANSITIONS[currentStep - 1] === currentStep) {
      setAmbassadorMsg("This note is together with the last one. Play " + nextNote + " (" + nextNum + ").")
    } else {
      setAmbassadorMsg("Next is " + nextNote + " (" + nextNum + "). Skip one and play.")
    }
  }, [currentStep, isComplete, scale])

  function writeHomeCompletion(playedNotes, wrongTapsArr, attempts, hint, paceMs, stalled, homeKey) {
    var avgPace = paceMs.length > 0 ? Math.round(paceMs.reduce(function(a,b){return a+b}, 0) / paceMs.length) : 0
    var eventPayload = {
      client_event_id: generateEventId(),
      student_instrument_id: getStudentId(),
      concept_id: CONCEPT_ID,
      chapter: "move_it",
      home_key: homeKey,
      played_notes: playedNotes,
      wrong_taps: wrongTapsArr,
      attempt_count: attempts,
      hint_used: hint,
      result: "complete",
        success_summary: "transferred the major scale pattern to home " + homeKey,
      stalled_on_note: stalled || null,
      pace_ms: avgPace
    }
    fetch(API_BASE + "/api/practice-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload)
    })
    .then(function(res) { return res.json() })
    .then(function(data) {
      console.log("[MoveIt] practice-event response:", data)
      if (data && data.confidence !== undefined) {
        setConfidence(data.confidence)
        setTrend(data.trend || null)
      }
    })
    .catch(function(err) { console.error("[MoveIt] practice-event failed:", err) })
  }

  return (
    <div style={styles.container}>
      {/* Track bar */}
      <div style={styles.trackBar}>
        <span style={styles.badge}>CURRICULUM</span>
        <span style={styles.school}>School</span>
      </div>
      <div style={styles.conceptTitle}>Motesart Fast</div>
      <div style={styles.conceptTitle}>The Major Scale Pattern</div>
          <div style={styles.conceptPurpose}>Learn the shape.</div>
      <div style={styles.trackLabel}>Fast Track: Core Patterns</div>

      {/* Chapter nav */}
      <div style={styles.chapterNav}>
        {CHAPTERS.map(function(ch, i) {
          var s = i < 2 ? 'locked' : i < CURRENT_CHAPTER ? 'completed' : i === CURRENT_CHAPTER ? 'active' : 'locked'
          return <span key={ch} style={Object.assign({}, styles.chapterStep, styles['step_' + s])}>
            {i === CURRENT_CHAPTER && <span style={styles.stepNum}>{''}</span>}
            {ch}
          </span>
        })}
      </div>

      {/* Main instruction */}
      <div style={styles.instructionBlock}>
        <div style={styles.instructionTitle}>Move the pattern</div>
        <div style={styles.instructionSub}>You learned the pattern starting on C. Now play it from a new home. The pattern is the same  -- the notes change.</div>
      </div>

      {/* Home selector */}
      {!allHomesDone && <div style={styles.homeSelector}>
        <div style={styles.homeLabel}>CHOOSE YOUR NEXT HOME</div>
        <div style={styles.homesRow}>
          {HOMES_ORDER.map(function(h) {
            var state = completedHomes.includes(h) ? 'completed' : h === currentHome ? 'current' : 'available'
            return <div key={h}
              style={Object.assign({}, styles.homePill, styles['pill_' + state])}
              onClick={function() {
                if (state === 'available' && !homeJustCompleted) { resetForHome(h) }
              }}>
              {h}{state === 'completed' ? ' Done' : ''}
            </div>
          })}
        </div>
      </div>}

      {/* Pattern from current home */}
      <div style={styles.patternBlock}>
        <div style={styles.patternLabel}>{'THE PATTERN FROM ' + currentHome}</div>
        <div style={styles.patternText}>
          1 skip 1, 2 skip 1, 3 &amp; 4 <span style={styles.together}>together</span>, 4 skip 1, 5 skip 1, 6 skip 1, 7 &amp; 8 <span style={styles.together}>together</span>
        </div>
      </div>

      {/* What to do */}
      {!homeJustCompleted && <div style={styles.whatToDo}>
        <div style={styles.whatToDoLabel}>WHAT TO DO NOW</div>
        <div style={styles.whatToDoText}>Start on 1. Play each note in order up to 8  -- from the new home.</div>
        <div style={styles.goalText}><strong>Goal:</strong> Same pattern, different starting note. Skip where it skips, together where they're together.</div>
      </div>}

      {/* Ambassador */}
      <AmbassadorBubble message={ambassadorMsg} ambassadorId="motesart" />

      {/* Hint */}
      {!homeJustCompleted && !allHomesDone && <div style={styles.hintRow}>
        <button style={styles.hintBtn} onClick={handleHint}>Hint</button>
      </div>}

      {/* Now playing cue ÃÂ¢ÃÂÃÂ HOME is prominent */}
      {!homeJustCompleted && !allHomesDone && <div style={styles.nowPlaying}>
        Now playing: <span style={styles.noteHighlight}>{NOTE_NUMBERS[currentStep] + ' (' + scale.labels[currentStep] + ')'}</span>
        {' - '}
        <span style={styles.homeHighlight}>{'Home: ' + currentHome}</span>
      </div>}

      
      {/* Pattern anchor */}
      <div style={{ textAlign: "center", padding: "4px 20px 8px", fontSize: "12px", color: "#555", letterSpacing: "0.3px" }}>Together at 3â4 and 7â8</div>

      {/* Progress strip */}
      {!homeJustCompleted && !allHomesDone && <div style={styles.progressStrip}>
        {NOTE_NUMBERS.map(function(num, i) {
          var state = completedSteps.includes(i) ? 'completed' : i === currentStep ? 'current' : 'upcoming'
          var isTogether = togetherPulse !== null && (i === togetherPulse || i === togetherPulse + 1)
          return <div key={i} style={Object.assign({}, styles.dot, styles['dot_' + state], isTogether ? styles.dot_together : {})}>
            {num}
          </div>
        })}
      </div>}

      {/* Keyboard */}
      {!homeJustCompleted && !allHomesDone && <div style={styles.keyboardContainer}>
        <div style={styles.keyboard}>
          {keyboardKeys.map(function(key, i) {
            if (key.isBlack) return null // black keys rendered as overlays

            var isTarget = key.scaleIndex === currentStep
            var isCompleted = key.scaleIndex >= 0 && completedSteps.includes(key.scaleIndex)
            var isHome = key.scaleIndex === 0
            var isFlash = flashKey === key.note
            var isTogether = togetherPulse !== null && key.scaleIndex >= 0 && (key.scaleIndex === togetherPulse || key.scaleIndex === togetherPulse + 1)

            var keyStyle = Object.assign({}, styles.whiteKey)
            if (isFlash && flashType === 'correct') keyStyle = Object.assign({}, keyStyle, styles.key_correct_flash)
            else if (isFlash && flashType === 'wrong') keyStyle = Object.assign({}, keyStyle, styles.key_wrong_flash)
            else if (isTogether) keyStyle = Object.assign({}, keyStyle, styles.key_together)
            else if (isTarget) keyStyle = Object.assign({}, keyStyle, styles.key_target)
            else if (isCompleted) keyStyle = Object.assign({}, keyStyle, styles.key_completed)
            else if (isHome) keyStyle = Object.assign({}, keyStyle, styles.key_home)

            // Check if next note is black key in scale
            var nextChromatic = keyboardKeys[i + 1]
            var hasBlackOverlay = nextChromatic && nextChromatic.isBlack

            return <div key={key.note} style={{ position: 'relative', flex: 1 }}>
              {isHome && <div style={styles.homeIndicator}>HOME</div>}
              {key.scaleIndex === 3 && <div style={styles.togetherLabel}>together v</div>}
              {key.scaleIndex === 7 && <div style={styles.togetherLabel}>together v</div>}
              <div style={keyStyle}
                onClick={function() { handleKeyTap(key.note, key.scaleIndex) }}>
                <span style={Object.assign({}, styles.keyLabel, key.isInScale ? styles.keyLabelScale : {})}>{key.label}</span>
              </div>
              {hasBlackOverlay && (function() {
                var bk = nextChromatic
                var bkIsTarget = bk.scaleIndex === currentStep
                var bkIsCompleted = bk.scaleIndex >= 0 && completedSteps.includes(bk.scaleIndex)
                var bkIsFlash = flashKey === bk.note
                var bkIsTogether = togetherPulse !== null && bk.scaleIndex >= 0 && (bk.scaleIndex === togetherPulse || bk.scaleIndex === togetherPulse + 1)

                var bkStyle = Object.assign({}, styles.blackKey)
                if (bk.isInScale) bkStyle = Object.assign({}, bkStyle, styles.blackKey_inScale)
                if (bkIsFlash && flashType === 'correct') bkStyle = Object.assign({}, bkStyle, styles.blackKey_correct)
                else if (bkIsFlash && flashType === 'wrong') bkStyle = Object.assign({}, bkStyle, styles.blackKey_wrong)
                else if (bkIsTogether) bkStyle = Object.assign({}, bkStyle, styles.blackKey_together)
                else if (bkIsTarget) bkStyle = Object.assign({}, bkStyle, styles.blackKey_target)
                else if (bkIsCompleted) bkStyle = Object.assign({}, bkStyle, styles.blackKey_completed)

                return <div style={bkStyle}
                  onClick={function() { handleKeyTap(bk.note, bk.scaleIndex) }}>
                  {bk.isInScale && <span style={styles.blackKeyLabel}>{bk.label}</span>}
                </div>
              })()}
            </div>
          })}
        </div>
      </div>}

      {/* Homes completed strip */}
      <div style={styles.homesStripSection}>
        <div style={styles.homesStripLabel}>Homes completed</div>
        <div style={styles.homesStrip}>
          {HOMES_ORDER.map(function(h) {
            var st = completedHomes.includes(h) ? 'done' : h === currentHome ? 'current' : 'pending'
            return <div key={h} style={Object.assign({}, styles.homeCheck, styles['hc_' + st])}>{h}</div>
          })}
        </div>
      </div>

      {/* Per-home completion */}
      {homeJustCompleted && !allHomesDone && <div style={styles.completion}>
        <div style={styles.completionIcon}>Done</div>
        <div style={styles.completionMsg}>{homeJustCompleted === 'C' ? 'C is done! You already know it from here.' : 'Same pattern. ' + homeJustCompleted + ' was your 1 this time.'}</div>
        <div style={styles.completionSub}>Same shape, new home. The skips and togethers stayed the same  -- only the notes changed.</div>
        {(function() {
          var nextHome = HOMES_ORDER.find(function(h) { return !completedHomes.includes(h) })
          return nextHome ? <button style={styles.ctaBtn} onClick={function() { resetForHome(nextHome) }}>
            {'Next home: ' + nextHome}
          </button> : null
        })()}
      </div>}

      {/* All homes complete */}
      {allHomesDone && <div style={styles.completion}>
        <div style={styles.completionIcon}>*</div>
        <div style={styles.completionMsg}>You transferred the pattern to every home. Next: prove it without support.</div>
        <div style={styles.completionSub}>The pattern is the same everywhere. Skips and togethers never change  -- only the starting note does. You proved it.</div>
        <button style={styles.ctaBtn} onClick={function() { navigate('/practice/T_MAJOR_SCALE_PATTERN') }}>Next: Own It</button>
      </div>}
    </div>
  )
}

var styles = {
  container: { maxWidth: 480, margin: "0 auto", padding: "16px 12px 120px", fontFamily: "system-ui, sans-serif", background: "#fafaf7", minHeight: "100vh" },
  trackBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  badge: { background: "#7c3aed", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  school: { fontSize: 11, color: "#a78bfa", fontWeight: 600 },
  conceptPurpose: { fontSize: 11, color: "#64748b", fontStyle: "italic", marginTop: 2 },
    conceptTitle: { fontSize: 14, fontWeight: 700, color: "#1e1b4b" },
  trackLabel: { fontSize: 11, color: "#6b7280", marginLeft: "auto" },
  chapterNav: { display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", padding: "0 2px" },
  chapterStep: { display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", cursor: "default" },
  stepNum: { width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  instructionBlock: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  instructionTitle: { fontSize: 18, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 },
  instructionSub: { fontSize: 13, color: "#6b7280", lineHeight: 1.4 },
  homeSelector: { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  homeLabel: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  homesRow: { display: "flex", gap: 8 },
  homePill: { flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid #e5e7eb", background: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", cursor: "pointer", transition: "all 0.2s" },
  patternBlock: { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  patternLabel: { fontSize: 11, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  patternText: { fontSize: 22, fontWeight: 700, color: "#1e1b4b", letterSpacing: 2 },
  together: { color: "#d97706", textDecoration: "underline", textDecorationStyle: "wavy" },
  whatToDo: { background: "#fef3c7", borderRadius: 10, padding: 12, marginBottom: 10 },
  whatToDoLabel: { fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 4 },
  whatToDoText: { fontSize: 13, color: "#78350f", lineHeight: 1.4 },
  goalText: { fontSize: 12, color: "#92400e", marginTop: 6, fontStyle: "italic" },
  hintRow: { display: "flex", justifyContent: "flex-end", marginBottom: 10 },
  hintBtn: { background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#6b7280", cursor: "pointer" },
  nowPlaying: { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  noteHighlight: { fontSize: 28, fontWeight: 800, color: "#7c3aed" },
  homeHighlight: { fontSize: 20, fontWeight: 800, color: "#d97706", background: "#fef3c7", borderRadius: 10, padding: "6px 18px", display: "inline-block", marginBottom: 6, border: "2px solid #f59e0b" },
  progressStrip: { display: "flex", gap: 6, justifyContent: "center", marginTop: 10 },
  dot: { width: 12, height: 12, borderRadius: "50%", border: "2px solid #d1d5db", background: "#fff", transition: "all 0.3s" },
  dot_together: { border: "2px solid #f59e0b" },
  keyboardContainer: { position: "relative", marginBottom: 12, width: "100%" },
  keyboard: { display: "flex", position: "relative", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  whiteKey: { flex: 1, height: 120, background: "#fff", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 8, cursor: "pointer", position: "relative", transition: "all 0.15s", borderRadius: "0 0 6px 6px", zIndex: 1 },
  key_correct_flash: { background: "#d1fae5" },
  key_wrong_flash: { background: "#fee2e2" },
  key_together: { background: "#fef3c7", borderColor: "#f59e0b" },
  key_target: { background: "#ede9fe", borderColor: "#7c3aed" },
  key_completed: { background: "#f0fdf4", borderColor: "#86efac" },
  key_home: { background: "#fef3c7", borderColor: "#d97706", borderWidth: 2 },
  homeIndicator: { position: "absolute", top: 4, fontSize: 8, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: 1 },
  togetherLabel: { position: "absolute", top: 14, fontSize: 7, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" },
  keyLabel: { fontSize: 11, fontWeight: 600, color: "#6b7280", marginTop: 2 },
  keyLabelScale: { fontSize: 10, color: "#a78bfa" },
  blackKey: { position: "absolute", top: 0, right: -14, width: 28, height: 75, background: "#1e1b4b", borderRadius: "0 0 4px 4px", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 6, cursor: "pointer", transition: "all 0.15s", border: "1px solid #0f0d2e" },
  blackKey_inScale: { background: "#312e81", boxShadow: "0 0 8px rgba(124,58,237,0.3)" },
  blackKey_correct: { background: "#059669" },
  blackKey_wrong: { background: "#dc2626" },
  blackKey_together: { background: "#d97706" },
  blackKey_target: { background: "#7c3aed", boxShadow: "0 0 12px rgba(124,58,237,0.5)" },
  blackKey_completed: { background: "#065f46" },
  blackKeyLabel: { fontSize: 9, fontWeight: 600, color: "#c4b5fd" },
  homesStripSection: { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  homesStripLabel: { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  homesStrip: { display: "flex", gap: 10, justifyContent: "center" },
  homeCheck: { display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 },
  completion: { background: "#fff", borderRadius: 16, padding: 24, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 16 },
  completionIcon: { fontSize: 48, marginBottom: 8 },
  completionMsg: { fontSize: 18, fontWeight: 700, color: "#1e1b4b", marginBottom: 6 },
  completionSub: { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 16 },
  ctaBtn: { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }
}

