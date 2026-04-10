import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

var API_BASE = 'https://motesart-converter.netlify.app'
var CONCEPT_ID = 'T_SCALE_DEGREES_MAJOR'

// C major scale: degree → key name mapping
var SCALE_MAP = { 1: 'C', 2: 'D', 3: 'E', 4: 'F', 5: 'G', 6: 'A', 7: 'B', 8: 'C2' }
var KEY_TO_DEGREE = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7, C2: 8 }
var ALL_WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2']
var BLACK_KEY_POSITIONS = [
  { left: '11.5%', label: 'C#' },
  { left: '24%', label: 'D#' },
  { left: '49%', label: 'F#' },
  { left: '61.5%', label: 'G#' },
  { left: '74%', label: 'A#' }
]

// Build question sequence: ensure together-pair degrees (3,4,7,8) appear
// 6 total: first 3 use 3-choice pads, next 3 use full 8
function buildQuestionSequence() {
  var mustInclude = [3, 4, 7, 8]
  var others = [1, 2, 5, 6]
  // Shuffle each
  mustInclude.sort(function() { return Math.random() - 0.5 })
  others.sort(function() { return Math.random() - 0.5 })
  // Pick 4 from must + 2 from others = 6
  var seq = mustInclude.slice(0, 4).concat(others.slice(0, 2))
  // Shuffle final order but keep first 3 easier (lower degrees first)
  seq.sort(function() { return Math.random() - 0.5 })
  return seq
}

function generateDistractors(correctDegree, count) {
  var all = [1, 2, 3, 4, 5, 6, 7, 8].filter(function(d) { return d !== correctDegree })
  all.sort(function() { return Math.random() - 0.5 })
  return all.slice(0, count)
}

function generateEventId() {
  return 'sd-find-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8)
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
  stepLocked: { flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: '#334155', background: '#1a1a24', borderRadius: '6px' },
  prompt: { textAlign: 'center', fontSize: '14px', color: '#f59e0b', margin: '12px 0 8px', fontWeight: 500 },
  keyboard: { display: 'flex', position: 'relative', height: '130px', margin: '12px 0' },
  whiteKey: { flex: 1, background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', transition: 'background 0.15s', cursor: 'default' },
  whiteKeyTarget: { flex: 1, background: '#f59e0b18', border: '1px solid #f59e0b50', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', boxShadow: '0 0 12px #f59e0b15' },
  whiteKeyCorrect: { flex: 1, background: '#34d39918', border: '1px solid #34d39950', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px' },
  whiteKeyWrong: { flex: 1, background: '#ef444418', border: '1px solid #ef444450', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px' },
  blackKey: { width: '28px', height: '80px', background: '#0a0a12', borderRadius: '0 0 4px 4px', position: 'absolute', top: 0, zIndex: 2, border: '1px solid #1a1a24' },
  keyNote: { fontSize: '10px', color: '#475569' },
  responsePads: { display: 'flex', gap: '10px', justifyContent: 'center', margin: '16px 0', flexWrap: 'wrap' },
  pad: { width: '48px', height: '48px', borderRadius: '10px', background: '#1a1a24', border: '1px solid #2a2a3a', color: '#94a3b8', fontSize: '18px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' },
  padCorrect: { width: '48px', height: '48px', borderRadius: '10px', background: '#34d39920', border: '1px solid #34d39960', color: '#34d399', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  padWrong: { width: '48px', height: '48px', borderRadius: '10px', background: '#ef444420', border: '1px solid #ef444460', color: '#ef4444', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dots: { display: 'flex', gap: '6px', justifyContent: 'center', margin: '12px 0' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a3a' },
  dotDone: { width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' },
  dotCurrent: { width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f140' },
  dotWrong: { width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' },
  completion: { textAlign: 'center', padding: '20px', background: '#34d39908', border: '1px solid #34d39920', borderRadius: '12px', margin: '20px 0' },
  completionMain: { fontSize: '15px', color: '#34d399', fontWeight: 600 },
  completionSub: { fontSize: '12px', color: '#64748b', marginTop: '6px' }
}

export default function ScaleDegreesFindIt() {
  var navigate = useNavigate()
  var [questions] = useState(function() { return buildQuestionSequence() })
  var [currentQ, setCurrentQ] = useState(0)
  var [choices, setChoices] = useState(function() { return [] })
  var [foundDegrees, setFoundDegrees] = useState([])
  var [wrongGuesses, setWrongGuesses] = useState([])
  var [feedback, setFeedback] = useState(null) // { type: 'correct'|'wrong', degree }
  var [done, setDone] = useState(false)
  var [ambassadorMsg, setAmbassadorMsg] = useState("You know the pattern. Now \u2014 what number is each note?")
  var [results, setResults] = useState([]) // 'correct' | 'wrong' per question
  var totalAttempts = useRef(0)

  // Build choices for current question
  useEffect(function() {
    if (currentQ >= questions.length) return
    var correctDeg = questions[currentQ]
    var expanded = currentQ >= 3 // after 3 correct: expand to 8
    if (expanded) {
      setChoices([1, 2, 3, 4, 5, 6, 7, 8])
    } else {
      var distractors = generateDistractors(correctDeg, 2)
      var opts = [correctDeg].concat(distractors)
      opts.sort(function(a, b) { return a - b })
      setChoices(opts)
    }
    setFeedback(null)
  }, [currentQ, questions])

  var handleChoice = useCallback(function(picked) {
    if (feedback || done) return
    totalAttempts.current++
    var correctDeg = questions[currentQ]
    var isCorrect = picked === correctDeg

    if (isCorrect) {
      setFeedback({ type: 'correct', degree: picked })
      setFoundDegrees(function(prev) { return prev.concat([String(correctDeg)]) })
      setResults(function(prev) { return prev.concat(['correct']) })

      // Ambassador lines for correct
      var togetherDegs = [3, 4, 7, 8]
      if (togetherDegs.indexOf(correctDeg) !== -1) {
        if (correctDeg === 3) setAmbassadorMsg("That's 3. Right before the squeeze.")
        else if (correctDeg === 4) setAmbassadorMsg("That's 4. Together with 3.")
        else if (correctDeg === 7) setAmbassadorMsg("That's 7. Right before the top squeeze.")
        else if (correctDeg === 8) setAmbassadorMsg("That's 8. Together with 7. Back home.")
      } else {
        setAmbassadorMsg("That's " + correctDeg + ". " + correctDeg + " steps from home.")
      }

      setTimeout(function() {
        if (currentQ + 1 >= questions.length) {
          setDone(true)
          setAmbassadorMsg("You located each degree by number. Next: play them when called.")
          postEvent(foundDegrees.concat([String(correctDeg)]), wrongGuesses)
        } else {
          setCurrentQ(function(q) { return q + 1 })
        }
      }, 800)
    } else {
      setFeedback({ type: 'wrong', degree: picked })
      setWrongGuesses(function(prev) { return prev.concat([String(picked)]) })
      setResults(function(prev) { return prev.concat(['wrong']) })
      setAmbassadorMsg("That's not " + correctDeg + " here. Count from home.")
      setTimeout(function() { setFeedback(null) }, 600)
    }
  }, [feedback, done, currentQ, questions, foundDegrees, wrongGuesses])

  function postEvent(found, wrong) {
    var payload = {
      client_event_id: generateEventId(),
      student_instrument_id: getStudentId(),
      concept_id: CONCEPT_ID,
      chapter: 'find_it',
      found_pairs: found,
      wrong_taps: wrong,
      attempt_count: totalAttempts.current,
      hint_used: false,
      result: 'complete',
        success_summary: 'located scale degrees by number from home'
    }
    fetch(API_BASE + '/api/practice-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json() })
    .catch(function(err) { console.error('[ScaleDegreesFindIt] event post failed:', err) })
  }

  // Current target
  var targetDegree = done ? null : questions[currentQ]
  var targetKey = targetDegree ? SCALE_MAP[targetDegree] : null

  return (
    React.createElement('div', { style: styles.page },
      // Header
      React.createElement('div', { style: styles.header },
        React.createElement('div', null,
          React.createElement('div', { style: styles.title }, 'Scale Degrees'),
          React.createElement('div', { style: styles.subtitle }, "Learn what each number means from home.")
        ),
        React.createElement('span', { style: styles.stagePill }, 'Find It')
      ),

      // Step bar
      React.createElement('div', { style: styles.stepBar },
        React.createElement('div', { style: styles.stepCurrent }, 'Find It'),
        React.createElement('div', { style: styles.stepLocked }, 'Play It'),
        React.createElement('div', { style: styles.stepLocked }, 'Move It'),
        React.createElement('div', { style: styles.stepLocked }, 'Own It')
      ),

      // Home badge
      React.createElement('div', { style: styles.homeBadge }, 'Home: C'),

      // Ambassador
      React.createElement(AmbassadorBubble, { message: ambassadorMsg, ambassadorId: 'motesart' }),

      // Prompt
      !done && React.createElement('div', { style: styles.prompt },
        'In Home C, what number is this?'
      ),

      // Keyboard
      React.createElement('div', { style: styles.keyboard },
        // Black keys
        BLACK_KEY_POSITIONS.map(function(bk, i) {
          return React.createElement('div', { key: 'bk-' + i, style: Object.assign({}, styles.blackKey, { left: bk.left }) })
        }),
        // White keys
        ALL_WHITE_KEYS.map(function(keyName) {
          var isTarget = keyName === targetKey && !done
          var showCorrect = feedback && feedback.type === 'correct' && keyName === targetKey
          var keyStyle = showCorrect ? styles.whiteKeyCorrect : (isTarget ? styles.whiteKeyTarget : styles.whiteKey)
          return React.createElement('div', { key: keyName, style: keyStyle },
            React.createElement('span', { style: styles.keyNote }, keyName === 'C2' ? 'C' : keyName)
          )
        })
      ),

      // Response pads
      !done && React.createElement('div', { style: styles.responsePads },
        choices.map(function(deg) {
          var padStyle = styles.pad
          if (feedback && feedback.degree === deg) {
            padStyle = feedback.type === 'correct' ? styles.padCorrect : styles.padWrong
          }
          return React.createElement('div', {
            key: 'pad-' + deg,
            style: padStyle,
            onClick: function() { handleChoice(deg) }
          }, deg)
        })
      ),

      // Progress dots
      React.createElement('div', { style: styles.dots },
        questions.map(function(_, i) {
          var dotStyle = styles.dot
          if (i < results.length) {
            dotStyle = results[i] === 'correct' ? styles.dotDone : styles.dotWrong
          } else if (i === currentQ && !done) {
            dotStyle = styles.dotCurrent
          }
          return React.createElement('div', { key: 'dot-' + i, style: dotStyle })
        })
      ),

      // Completion
      done && React.createElement('div', { style: styles.completion },
        React.createElement('div', { style: styles.completionMain }, "You located each degree by number. Next: play them when called."),
        React.createElement('div', { style: styles.completionSub },
          foundDegrees.length + ' degrees identified. ' + wrongGuesses.length + ' wrong guess' + (wrongGuesses.length !== 1 ? 'es' : '') + '.'
        )
      )
    )
  )
}
