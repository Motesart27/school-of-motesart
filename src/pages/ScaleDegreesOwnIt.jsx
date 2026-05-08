import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

var API_BASE = 'https://motesart-converter.netlify.app'
var CONCEPT_ID = 'T_SCALE_DEGREES_MAJOR'
var PASSES_REQUIRED = 2
var HESITATION_MS = 3000
var MAX_WRONG_TAPS = 4

var SCALE_MAP = { 1: 'C', 2: 'D', 3: 'E', 4: 'F', 5: 'G', 6: 'A', 7: 'B', 8: 'C2' }
var ALL_WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2']
var KEY_TO_DEGREE = {}
ALL_WHITE_KEYS.forEach(function(k, i) { KEY_TO_DEGREE[k] = i + 1 })

// Curated degree sets: pass 1 = functional landmarks, pass 2 = all degrees
var PASS1_POOL = [1, 7, 4, 5] // home, leading tone, subdominant, dominant
var PASS2_POOL = [1, 2, 3, 4, 5, 6, 7, 8]

function buildPassCalls(passNum) {
  var pool = passNum === 0 ? PASS1_POOL.slice() : PASS2_POOL.slice()
  pool.sort(function() { return Math.random() - 0.5 })
  // 6 calls, ensure at least one together-pair degree (4 or 7)
  var calls = pool.slice(0, 6)
  if (calls.indexOf(4) === -1 && calls.indexOf(7) === -1) {
    calls[calls.length - 1] = Math.random() > 0.5 ? 4 : 7
  }
  // For pass 1 with only 4 unique degrees, repeat some
  while (calls.length < 6) {
    calls.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return calls
}

function generateEventId() {
  return 'sd-own-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8)
}

var styles = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '16px', maxWidth: '600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  title: { fontSize: '16px', fontWeight: 700 },
  subtitle: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  stagePill: { fontSize: '11px', color: '#a78bfa', background: '#a78bfa15', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 },
  homeBadge: { fontSize: '13px', color: '#f59e0b', background: '#f59e0b15', padding: '6px 16px', borderRadius: '8px', fontWeight: 700, letterSpacing: '1px', display: 'inline-block', marginBottom: '12px' },
  stepBar: { display: 'flex', gap: '4px', marginBottom: '16px' },
  stepDone: { flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: '#34d399', background: '#34d39910', borderRadius: '6px' },
  stepCurrent: { flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: '#e2e8f0', background: '#6366f120', border: '1px solid #6366f140', borderRadius: '6px' },
  callDisplay: { textAlign: 'center', margin: '16px 0' },
  callLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  callNumber: { fontSize: '48px', fontWeight: 800, color: '#a78bfa' },
  callSub: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  keyboard: { display: 'flex', position: 'relative', height: '140px', margin: '12px 0' },
  blankKey: { flex: 1, background: '#1a1a24', border: '1px solid #222230', borderRadius: '0 0 6px 6px', cursor: 'pointer', transition: 'background 0.15s' },
  homeKey: { flex: 1, background: '#1a1a24', border: '1px solid #222230', borderRadius: '0 0 6px 6px', cursor: 'pointer', borderBottom: '2px solid #f59e0b40' },
  keyCorrect: { flex: 1, background: '#34d39915', border: '1px solid #34d39940', borderRadius: '0 0 6px 6px' },
  keyWrong: { flex: 1, background: '#ef444415', border: '1px solid #ef444440', borderRadius: '0 0 6px 6px' },
  blackKey: { width: '28px', height: '85px', background: '#0a0a12', borderRadius: '0 0 4px 4px', position: 'absolute', top: 0, zIndex: 2, border: '1px solid #1a1a24' },
  blackKeyPositions: ['11.5%', '24%', '49%', '61.5%', '74%'],
  passCounter: { textAlign: 'center', fontSize: '12px', color: '#475569', margin: '8px 0', letterSpacing: '1px' },
  passNum: { color: '#6a8a6a', fontWeight: 600 },
  dots: { display: 'flex', gap: '6px', justifyContent: 'center', margin: '12px 0' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a3a' },
  dotDone: { width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' },
  dotCurrent: { width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f140' },
  completion: { textAlign: 'center', padding: '20px', background: '#34d39908', border: '1px solid #34d39920', borderRadius: '12px', margin: '20px 0' },
  completionMain: { fontSize: '15px', color: '#34d399', fontWeight: 600 },
  completionSub: { fontSize: '12px', color: '#64748b', marginTop: '6px' }
}

export default function ScaleDegreesOwnIt() {
  var navigate = useNavigate()
  var [cleanPasses, setCleanPasses] = useState(0)
  var [calls, setCalls] = useState(function() { return buildPassCalls(0) })
  var [callPos, setCallPos] = useState(0)
  var [wrongThisPass, setWrongThisPass] = useState(0)
  var [totalWrongTaps, setTotalWrongTaps] = useState([])
  var [correctDegrees, setCorrectDegrees] = useState([])
  var [feedback, setFeedback] = useState(null)
  var [done, setDone] = useState(false)
  var [failed, setFailed] = useState(false)
  var [ambassadorMsg, setAmbassadorMsg] = useState("No labels. Just home and the number. Trust what you know.")
  var hesitationsThisRound = useRef(0)
  var lastTapTime = useRef(Date.now())
  var totalAttempts = useRef(0)

  var currentDegree = calls[callPos]

  var handleKeyTap = useCallback(function(keyName) {
    if (feedback || done || failed) return
    totalAttempts.current++

    // Check hesitation
    var now = Date.now()
    if (now - lastTapTime.current > HESITATION_MS) {
      hesitationsThisRound.current++
    }
    lastTapTime.current = now

    var tappedDegree = KEY_TO_DEGREE[keyName]
    var isCorrect = tappedDegree === currentDegree

    if (isCorrect) {
      setFeedback({ type: 'correct', key: keyName })
      setCorrectDegrees(function(prev) { return prev.concat([String(currentDegree)]) })
      // silent on correct tap during Own It

      setTimeout(function() {
        setFeedback(null)
        if (callPos + 1 < calls.length) {
          setCallPos(function(p) { return p + 1 })
        } else {
          // Pass complete
          var isClean = wrongThisPass === 0
          var newCleanPasses = isClean ? cleanPasses + 1 : cleanPasses

          if (newCleanPasses >= PASSES_REQUIRED) {
            setCleanPasses(newCleanPasses)
            setDone(true)
            setAmbassadorMsg("You performed the degrees without visual cues. The numbers are yours.")
            postEvent(true, newCleanPasses)
          } else {
            setCleanPasses(newCleanPasses)
            if (isClean) {
              setAmbassadorMsg("One clean pass. Do it again.")
            } else {
              setAmbassadorMsg("Some wrong taps. Try again \u2014 trust the pattern.")
            }
            // Start next pass with wider pool
            setCalls(buildPassCalls(newCleanPasses))
            setCallPos(0)
            setWrongThisPass(0)
          }
        }
      }, 500)
    } else {
      setFeedback({ type: 'wrong', key: keyName })
      setTotalWrongTaps(function(prev) { return prev.concat([keyName]) })
      var newWrongThisPass = wrongThisPass + 1
      setWrongThisPass(newWrongThisPass)
      setAmbassadorMsg("Not that one. Start from home, count the pattern.")

      if (newWrongThisPass >= MAX_WRONG_TAPS) {
        setFailed(true)
        setAmbassadorMsg("Too many misses. Go back and feel the pattern again.")
        postEvent(false, cleanPasses)
      }

      setTimeout(function() { setFeedback(null) }, 400)
    }
  }, [feedback, done, failed, currentDegree, callPos, calls, wrongThisPass, cleanPasses])

  function postEvent(passed, passes) {
    fetch(API_BASE + '/api/practice-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_event_id: generateEventId(),
        student_instrument_id: getStudentId(),
        concept_id: CONCEPT_ID,
        chapter: 'own_it',
        found_pairs: correctDegrees,
        wrong_taps: totalWrongTaps,
        attempt_count: totalAttempts.current,
        hint_used: false,
        hesitation_count: hesitationsThisRound.current,
        feel_mode_stage: 'own_it',
        visual_support_level: 'hidden',
        result: 'complete',
        success_summary: 'performed scale degrees without visual cues'
      })
    }).catch(function(err) { console.error('[ScaleDegreesOwnIt] event post failed:', err) })
  }

  return (
    React.createElement('div', { style: styles.page },
      React.createElement('div', { style: styles.header },
        React.createElement('div', null,
          React.createElement('div', { style: styles.title }, 'Scale Degrees'),
          React.createElement('div', { style: styles.subtitle }, 'Learn what each number means from home.')
        ),
        React.createElement('span', { style: styles.stagePill }, 'Own It \u2014 Emerging')
      ),

      React.createElement('div', { style: styles.stepBar },
        React.createElement('div', { style: styles.stepDone }, 'Find It'),
        React.createElement('div', { style: styles.stepDone }, 'Play It'),
        React.createElement('div', { style: styles.stepDone }, 'Move It'),
        React.createElement('div', { style: styles.stepCurrent }, 'Own It')
      ),

      React.createElement('div', { style: styles.homeBadge }, 'Home: C'),
      React.createElement(AmbassadorBubble, { message: ambassadorMsg, ambassadorId: 'motesart' }),

      // Call display
      !done && !failed && currentDegree && React.createElement('div', { style: styles.callDisplay },
        React.createElement('div', { style: styles.callLabel }, 'Play this degree'),
        React.createElement('div', { style: styles.callNumber }, currentDegree),
        React.createElement('div', { style: styles.callSub }, 'No labels. Count from home.')
      ),

      // Blank keyboard
      React.createElement('div', { style: styles.keyboard },
        styles.blackKeyPositions.map(function(left, i) {
          return React.createElement('div', { key: 'bk-' + i, style: Object.assign({}, styles.blackKey, { left: left }) })
        }),
        ALL_WHITE_KEYS.map(function(keyName, i) {
          var isHome = i === 0
          var keyStyle = isHome ? styles.homeKey : styles.blankKey
          if (feedback && feedback.key === keyName) {
            keyStyle = feedback.type === 'correct' ? styles.keyCorrect : styles.keyWrong
          }
          return React.createElement('div', {
            key: keyName,
            style: keyStyle,
            onClick: function() { handleKeyTap(keyName) }
          })
        })
      ),

      // Pass counter
      React.createElement('div', { style: styles.passCounter },
        'Clean passes: ',
        React.createElement('span', { style: styles.passNum }, cleanPasses),
        ' / ' + PASSES_REQUIRED
      ),

      // Progress dots
      React.createElement('div', { style: styles.dots },
        calls.map(function(_, i) {
          var dotStyle = styles.dot
          if (i < callPos) dotStyle = styles.dotDone
          else if (i === callPos && !done && !failed) dotStyle = styles.dotCurrent
          return React.createElement('div', { key: 'dot-' + i, style: dotStyle })
        })
      ),

      // Completion
      done && React.createElement('div', { style: styles.completion },
        React.createElement('div', { style: styles.completionMain }, "You performed the degrees without visual cues. The numbers are yours."),
        React.createElement('div', { style: styles.completionSub }, 'Two clean passes. Own It \u2014 Emerging.')
      ),

      // Failure
      failed && React.createElement('div', { style: Object.assign({}, styles.completion, { background: '#ef444408', borderColor: '#ef444420' }) },
        React.createElement('div', { style: Object.assign({}, styles.completionMain, { color: '#ef4444' }) }, 'Too many wrong taps this round.'),
        React.createElement('div', { style: styles.completionSub }, 'Go back and feel the pattern again.')
      )
    )
  )
}
