import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

var API_BASE = 'https://motesart-converter.netlify.app'
var CONCEPT_ID = 'T_SCALE_DEGREES_MAJOR'

var SCALE_MAP = { 1: 'C', 2: 'D', 3: 'E', 4: 'F', 5: 'G', 6: 'A', 7: 'B', 8: 'C2' }
var ALL_WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2']
var KEY_TO_DEGREE = {}
ALL_WHITE_KEYS.forEach(function(k, i) { KEY_TO_DEGREE[k] = i + 1 })

var BLACK_KEY_POSITIONS = [
  { left: '11.5%' }, { left: '24%' }, { left: '49%' }, { left: '61.5%' }, { left: '74%' }
]

// Round structure: singles → pairs → mixed sequences
var ROUNDS = [
  { label: 'Round 1', calls: [[1], [3], [5], [8]] },
  { label: 'Round 2', calls: [[1, 5], [3, 4], [7, 8]] },
  { label: 'Round 3', calls: [[5, 3, 1], [7, 8], [4, 5, 6]] }
]

function generateEventId() {
  return 'sd-play-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8)
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
  callDisplay: { textAlign: 'center', margin: '16px 0' },
  callLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  callNumber: { fontSize: '44px', fontWeight: 800, color: '#a78bfa', letterSpacing: '4px' },
  callSub: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  roundLabel: { textAlign: 'center', fontSize: '11px', color: '#6366f1', fontWeight: 600, letterSpacing: '1px', margin: '8px 0' },
  keyboard: { display: 'flex', position: 'relative', height: '140px', margin: '12px 0' },
  whiteKey: { flex: 1, background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', cursor: 'pointer', transition: 'background 0.15s' },
  whiteKeyCorrect: { flex: 1, background: '#34d39918', border: '1px solid #34d39950', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', cursor: 'pointer' },
  whiteKeyWrong: { flex: 1, background: '#ef444418', border: '1px solid #ef444450', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', cursor: 'pointer' },
  blackKey: { width: '28px', height: '85px', background: '#0a0a12', borderRadius: '0 0 4px 4px', position: 'absolute', top: 0, zIndex: 2, border: '1px solid #1a1a24' },
  keyDegree: { fontSize: '15px', fontWeight: 700, color: '#a78bfa', marginBottom: '2px' },
  keyNote: { fontSize: '10px', color: '#475569' },
  dots: { display: 'flex', gap: '6px', justifyContent: 'center', margin: '12px 0' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a3a' },
  dotDone: { width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' },
  dotCurrent: { width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f140' },
  completion: { textAlign: 'center', padding: '20px', background: '#34d39908', border: '1px solid #34d39920', borderRadius: '12px', margin: '20px 0' },
  completionMain: { fontSize: '15px', color: '#34d399', fontWeight: 600 },
  completionSub: { fontSize: '12px', color: '#64748b', marginTop: '6px' }
}

export default function ScaleDegreesPlayIt() {
  var navigate = useNavigate()
  var [roundIdx, setRoundIdx] = useState(0)
  var [callIdx, setCallIdx] = useState(0)
  var [noteIdx, setNoteIdx] = useState(0) // position within current call group
  var [feedback, setFeedback] = useState(null)
  var [done, setDone] = useState(false)
  var [correctDegrees, setCorrectDegrees] = useState([])
  var [wrongTaps, setWrongTaps] = useState([])
  var [ambassadorMsg, setAmbassadorMsg] = useState("I'll call a number. You play it. Start easy \u2014 play 1.")
  var totalAttempts = useRef(0)

  var currentRound = ROUNDS[roundIdx]
  var currentCall = currentRound ? currentRound.calls[callIdx] : null
  var currentDegree = currentCall ? currentCall[noteIdx] : null

  // Build display string for call group
  var callDisplayStr = currentCall ? currentCall.join(', ') : ''

  var handleKeyTap = useCallback(function(keyName) {
    if (feedback || done || !currentDegree) return
    totalAttempts.current++
    var tappedDegree = KEY_TO_DEGREE[keyName]
    var isCorrect = tappedDegree === currentDegree

    if (isCorrect) {
      setFeedback({ type: 'correct', key: keyName })
      setCorrectDegrees(function(prev) { return prev.concat([String(currentDegree)]) })

      // Ambassador
      var togetherDegs = [3, 4, 7, 8]
      if (currentDegree === 4) setAmbassadorMsg("4 is right next to 3. That's the squeeze.")
      else if (currentDegree === 8) setAmbassadorMsg("That's 8. Together with 7. Back home.")
      else if (togetherDegs.indexOf(currentDegree) !== -1) setAmbassadorMsg("That's " + currentDegree + ". Near a squeeze.")
      else if (currentDegree === 1) setAmbassadorMsg("That's 1. That's home.")
      else setAmbassadorMsg("That's " + currentDegree + ". " + (currentDegree - 1) + " step" + (currentDegree - 1 === 1 ? "" : "s") + " from home.")

      setTimeout(function() {
        setFeedback(null)
        // Advance within call group, then to next call, then to next round
        if (noteIdx + 1 < currentCall.length) {
          setNoteIdx(function(n) { return n + 1 })
        } else if (callIdx + 1 < currentRound.calls.length) {
          setCallIdx(function(c) { return c + 1 })
          setNoteIdx(0)
        } else if (roundIdx + 1 < ROUNDS.length) {
          setRoundIdx(function(r) { return r + 1 })
          setCallIdx(0)
          setNoteIdx(0)
          if (roundIdx === 0) setAmbassadorMsg("Good. Now pairs \u2014 degrees live in relationships.")
          else setAmbassadorMsg("Last round. Mixed sequences.")
        } else {
          setDone(true)
          setAmbassadorMsg("You executed every degree when called. Next: move them to a new home.")
          postEvent()
        }
      }, 500)
    } else {
      setFeedback({ type: 'wrong', key: keyName })
      setWrongTaps(function(prev) { return prev.concat([keyName]) })
      setAmbassadorMsg("Count from home. 1 is home, then count up.")
      setTimeout(function() { setFeedback(null) }, 400)
    }
  }, [feedback, done, currentDegree, noteIdx, callIdx, roundIdx, currentCall, currentRound])

  function postEvent() {
    var payload = {
      client_event_id: generateEventId(),
      student_instrument_id: getStudentId(),
      concept_id: CONCEPT_ID,
      chapter: 'play_it',
      found_pairs: correctDegrees,
      wrong_taps: wrongTaps,
      attempt_count: totalAttempts.current,
      hint_used: false,
      result: 'complete',
        success_summary: 'executed scale degrees on demand from home'
    }
    fetch(API_BASE + '/api/practice-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(err) { console.error('[ScaleDegreesPlayIt] event post failed:', err) })
  }

  // Count total calls for progress dots
  var allCalls = []
  ROUNDS.forEach(function(r) { r.calls.forEach(function(c) { c.forEach(function() { allCalls.push(1) }) }) })
  var totalNotes = allCalls.length
  var completedNotes = correctDegrees.length

  return (
    React.createElement('div', { style: styles.page },
      React.createElement('div', { style: styles.header },
        React.createElement('div', null,
          React.createElement('div', { style: styles.title }, 'Scale Degrees'),
          React.createElement('div', { style: styles.subtitle }, 'Learn what each number means from home.')
        ),
        React.createElement('span', { style: styles.stagePill }, 'Play It')
      ),

      React.createElement('div', { style: styles.stepBar },
        React.createElement('div', { style: styles.stepDone }, 'Find It'),
        React.createElement('div', { style: styles.stepCurrent }, 'Play It'),
        React.createElement('div', { style: styles.stepLocked }, 'Move It'),
        React.createElement('div', { style: styles.stepLocked }, 'Own It')
      ),

      React.createElement('div', { style: styles.homeBadge }, 'Home: C'),
      React.createElement(AmbassadorBubble, { message: ambassadorMsg, ambassadorId: 'motesart' }),

      // Round label
      !done && currentRound && React.createElement('div', { style: styles.roundLabel }, currentRound.label),

      // Call display
      !done && currentDegree && React.createElement('div', { style: styles.callDisplay },
        React.createElement('div', { style: styles.callLabel },
          currentCall.length > 1 ? 'Play this sequence' : 'Play this degree'
        ),
        React.createElement('div', { style: styles.callNumber },
          currentCall.length > 1
            ? currentCall.map(function(d, i) {
                var played = i < noteIdx
                var current = i === noteIdx
                var color = played ? '#34d399' : (current ? '#a78bfa' : '#475569')
                return React.createElement('span', { key: i, style: { color: color, margin: '0 4px' } }, d)
              })
            : currentDegree
        ),
        React.createElement('div', { style: styles.callSub }, 'Find it on the keyboard')
      ),

      // Keyboard with degree labels
      React.createElement('div', { style: styles.keyboard },
        BLACK_KEY_POSITIONS.map(function(bk, i) {
          return React.createElement('div', { key: 'bk-' + i, style: Object.assign({}, styles.blackKey, { left: bk.left }) })
        }),
        ALL_WHITE_KEYS.map(function(keyName, i) {
          var degree = i + 1
          var keyStyle = styles.whiteKey
          if (feedback && feedback.key === keyName) {
            keyStyle = feedback.type === 'correct' ? styles.whiteKeyCorrect : styles.whiteKeyWrong
          }
          return React.createElement('div', {
            key: keyName,
            style: keyStyle,
            onClick: function() { handleKeyTap(keyName) }
          },
            React.createElement('span', { style: styles.keyDegree }, degree),
            React.createElement('span', { style: styles.keyNote }, keyName === 'C2' ? 'C' : keyName)
          )
        })
      ),

      // Progress dots
      React.createElement('div', { style: styles.dots },
        Array.from({ length: totalNotes }, function(_, i) {
          var dotStyle = styles.dot
          if (i < completedNotes) dotStyle = styles.dotDone
          else if (i === completedNotes && !done) dotStyle = styles.dotCurrent
          return React.createElement('div', { key: 'dot-' + i, style: dotStyle })
        })
      ),

      // Completion
      done && React.createElement('div', { style: styles.completion },
        React.createElement('div', { style: styles.completionMain }, 'You executed every degree when called. Next: move them to a new home.'),
        React.createElement('div', { style: styles.completionSub },
          correctDegrees.length + ' degrees played. ' + wrongTaps.length + ' wrong tap' + (wrongTaps.length !== 1 ? 's' : '') + '.'
        )
      )
    )
  )
}
