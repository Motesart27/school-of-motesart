import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

var API_BASE = 'https://motesart-converter.netlify.app'
var CONCEPT_ID = 'T_SCALE_DEGREES_MAJOR'

// Major scale intervals: W W H W W W H (in semitones: 2 2 1 2 2 2 1)
var INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12]
var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
var HOME_CONFIGS = [
  { home: 'C', startMidi: 60 },
  { home: 'G', startMidi: 67 },
  { home: 'F', startMidi: 65 }
]

function getScaleKeys(startMidi) {
  return INTERVALS.map(function(interval) {
    var midi = startMidi + interval
    var noteName = NOTE_NAMES[midi % 12]
    var isBlack = noteName.includes('#')
    return { midi: midi, name: noteName, isBlack: isBlack }
  })
}

// Build 8-key keyboard range covering the home's scale
function getKeyboardRange(startMidi) {
  // Show keys from home to octave above
  var keys = []
  for (var m = startMidi; m <= startMidi + 12; m++) {
    var name = NOTE_NAMES[m % 12]
    keys.push({ midi: m, name: name, isBlack: name.includes('#') })
  }
  return keys
}

// Calls per home: 4 degrees, must include together-pair degrees (3,4 or 7,8)
function buildHomeCalls() {
  var mustHave = [4, 7] // together-pair anchors
  var pool = [1, 2, 3, 5, 6, 8]
  pool.sort(function() { return Math.random() - 0.5 })
  var calls = mustHave.concat(pool.slice(0, 2))
  calls.sort(function() { return Math.random() - 0.5 })
  return calls
}

function generateEventId() {
  return 'sd-move-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8)
}

var styles = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '16px', maxWidth: '600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  title: { fontSize: '16px', fontWeight: 700 },
  subtitle: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  stagePill: { fontSize: '11px', color: '#a78bfa', background: '#a78bfa15', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 },
  stepBar: { display: 'flex', gap: '4px', marginBottom: '16px' },
  stepDone: { flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: '#34d399', background: '#34d39910', borderRadius: '6px' },
  stepCurrent: { flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: '#e2e8f0', background: '#6366f120', border: '1px solid #6366f140', borderRadius: '6px' },
  stepLocked: { flex: 1, textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: '#334155', background: '#1a1a24', borderRadius: '6px' },
  homeSelector: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' },
  homeBtn: { padding: '8px 18px', borderRadius: '8px', border: '1px solid #2a2a3a', background: '#1a1a24', color: '#64748b', fontSize: '13px', fontWeight: 600 },
  homeBtnActive: { padding: '8px 18px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#f59e0b10', color: '#f59e0b', fontSize: '13px', fontWeight: 700 },
  homeBtnDone: { padding: '8px 18px', borderRadius: '8px', border: '1px solid #34d399', background: '#34d39910', color: '#34d399', fontSize: '13px', fontWeight: 600 },
  homeAnchor: { textAlign: 'center', fontSize: '12px', color: '#f59e0b', fontWeight: 600, margin: '4px 0 8px', letterSpacing: '0.5px' },
  callDisplay: { textAlign: 'center', margin: '12px 0' },
  callLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  callNumber: { fontSize: '44px', fontWeight: 800, color: '#a78bfa' },
  callSub: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  keyboard: { display: 'flex', position: 'relative', height: '140px', margin: '12px 0' },
  whiteKey: { flex: 1, background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', cursor: 'pointer', transition: 'background 0.15s' },
  whiteKeyHome: { flex: 1, background: '#f59e0b08', border: '1px solid #f59e0b40', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', cursor: 'pointer', borderBottom: '2px solid #f59e0b60' },
  whiteKeyCorrect: { flex: 1, background: '#34d39918', border: '1px solid #34d39950', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px' },
  whiteKeyWrong: { flex: 1, background: '#ef444418', border: '1px solid #ef444450', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px' },
  blackKey: { height: '85px', background: '#0a0a12', borderRadius: '0 0 4px 4px', position: 'absolute', top: 0, zIndex: 2, border: '1px solid #1a1a24', cursor: 'pointer', width: '28px' },
  blackKeyScale: { flex: 1, background: '#1a1030', border: '1px solid #7c3aed40', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '2px solid #7c3aed50' },
  blackKeyCorrect: { flex: 1, background: '#34d39918', border: '1px solid #34d39950', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px' },
  blackKeyWrong: { flex: 1, background: '#ef444418', border: '1px solid #ef444450', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px' },
  blackKeyDegree: { fontSize: '15px', fontWeight: 700, color: '#c4b5fd', marginBottom: '2px' },
  blackKeyNote: { fontSize: '10px', color: '#7c3aed80' },
  keyDegree: { fontSize: '15px', fontWeight: 700, color: '#a78bfa', marginBottom: '2px' },
  keyDegreeHome: { fontSize: '15px', fontWeight: 700, color: '#f59e0b', marginBottom: '2px' },
  keyNote: { fontSize: '10px', color: '#475569' },
  dots: { display: 'flex', gap: '6px', justifyContent: 'center', margin: '12px 0' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a3a' },
  dotDone: { width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' },
  dotCurrent: { width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f140' },
  completion: { textAlign: 'center', padding: '20px', background: '#34d39908', border: '1px solid #34d39920', borderRadius: '12px', margin: '20px 0' },
  completionMain: { fontSize: '15px', color: '#34d399', fontWeight: 600 },
  completionSub: { fontSize: '12px', color: '#64748b', marginTop: '6px' }
}

export default function ScaleDegreesMoveIt() {
  var navigate = useNavigate()
  var [homeIdx, setHomeIdx] = useState(0)
  var [calls, setCalls] = useState(function() { return buildHomeCalls() })
  var [callPos, setCallPos] = useState(0)
  var [feedback, setFeedback] = useState(null)
  var [done, setDone] = useState(false)
  var [homesCompleted, setHomesCompleted] = useState([])
  var [correctDegrees, setCorrectDegrees] = useState([])
  var [wrongTaps, setWrongTaps] = useState([])
  var [ambassadorMsg, setAmbassadorMsg] = useState("Same numbers, different keys. Home is C \u2014 that's your 1.")
  var totalAttempts = useRef(0)

  var config = HOME_CONFIGS[homeIdx]
  var scaleKeys = getScaleKeys(config.startMidi)
  var currentDegree = calls[callPos]

  // Find the target key for current degree
  var targetKey = scaleKeys[currentDegree - 1]

  function handleKeyTap(midi) {
    if (feedback || done) return
    totalAttempts.current++
    var isCorrect = targetKey && midi === targetKey.midi

    if (isCorrect) {
      setFeedback({ type: 'correct', midi: midi })
      setCorrectDegrees(function(prev) { return prev.concat([String(currentDegree)]) })

      if (currentDegree === 4 || currentDegree === 3) {
        setAmbassadorMsg(currentDegree + ' and ' + (currentDegree === 3 ? 4 : 3) + ' are together here too. The squeeze travels.')
      } else {
        setAmbassadorMsg(currentDegree + ' in ' + config.home + '. Different key, same job.')
      }

      setTimeout(function() {
        setFeedback(null)
        if (callPos + 1 < calls.length) {
          setCallPos(function(p) { return p + 1 })
        } else {
          // Home complete
          var newCompleted = homesCompleted.concat([config.home])
          setHomesCompleted(newCompleted)
          postHomeEvent(config.home)

          if (homeIdx + 1 < HOME_CONFIGS.length) {
            setHomeIdx(function(h) { return h + 1 })
            setCalls(buildHomeCalls())
            setCallPos(0)
            var nextHome = HOME_CONFIGS[homeIdx + 1].home
            setAmbassadorMsg("New home. Same numbers, different keys. Home is " + nextHome + " now \u2014 that's your 1.")
          } else {
            setDone(true)
            setAmbassadorMsg("You transferred the degrees to every home. Next: prove it without support.")
          }
        }
      }, 500)
    } else {
      setFeedback({ type: 'wrong', midi: midi })
      setWrongTaps(function(prev) { return prev.concat([String(midi)]) })
      setAmbassadorMsg("Not " + currentDegree + " here. Count from the new home.")
      setTimeout(function() { setFeedback(null) }, 400)
    }
  }

  function postHomeEvent(homeKey) {
    fetch(API_BASE + '/api/practice-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_event_id: generateEventId(),
        student_instrument_id: getStudentId(),
        concept_id: CONCEPT_ID,
        chapter: 'move_it',
        home_key: homeKey,
        found_pairs: correctDegrees,
        wrong_taps: wrongTaps,
        attempt_count: totalAttempts.current,
        hint_used: false,
        result: 'complete',
        success_summary: 'transferred scale degrees to home ' + homeKey
      })
    }).catch(function(err) { console.error('[ScaleDegreesMoveIt] event post failed:', err) })
  }

  // Build a simple keyboard for current home scale
  var whiteKeys = scaleKeys.filter(function(k) { return !k.isBlack })
  var blackKeys = scaleKeys.filter(function(k) { return k.isBlack })

  return (
    React.createElement('div', { style: styles.page },
      React.createElement('div', { style: styles.header },
        React.createElement('div', null,
          React.createElement('div', { style: styles.title }, 'Scale Degrees'),
          React.createElement('div', { style: styles.subtitle }, 'Learn what each number means from home.')
        ),
        React.createElement('span', { style: styles.stagePill }, 'Move It')
      ),

      React.createElement('div', { style: styles.stepBar },
        React.createElement('div', { style: styles.stepDone }, 'Find It'),
        React.createElement('div', { style: styles.stepDone }, 'Play It'),
        React.createElement('div', { style: styles.stepCurrent }, 'Move It'),
        React.createElement('div', { style: styles.stepLocked }, 'Own It')
      ),

      // Home selector
      React.createElement('div', { style: styles.homeSelector },
        HOME_CONFIGS.map(function(hc, i) {
          var btnStyle = styles.homeBtn
          if (homesCompleted.indexOf(hc.home) !== -1) btnStyle = styles.homeBtnDone
          else if (i === homeIdx) btnStyle = styles.homeBtnActive
          var label = 'Home: ' + hc.home
          if (homesCompleted.indexOf(hc.home) !== -1) label += ' \u2713'
          return React.createElement('div', { key: hc.home, style: btnStyle }, label)
        })
      ),

      React.createElement(AmbassadorBubble, { message: ambassadorMsg, ambassadorId: 'motesart' }),

      // Home = 1 anchor
      !done && React.createElement('div', { style: styles.homeAnchor }, 'Home = 1'),

      // Call display
      !done && currentDegree && React.createElement('div', { style: styles.callDisplay },
        React.createElement('div', { style: styles.callLabel }, 'Play this degree in Home ' + config.home),
        React.createElement('div', { style: styles.callNumber }, currentDegree),
        React.createElement('div', { style: styles.callSub },
          currentDegree + ' in ' + config.home + (homeIdx > 0 ? ' is a different key than ' + currentDegree + ' in C' : ''))
      ),

      // Keyboard showing scale degrees
        React.createElement('div', { style: styles.keyboard },
          scaleKeys.map(function(sk, i) {
            var degree = i + 1
            var isHome = degree === 1
            var displayName = sk.name
            if (config.home === 'F' && sk.name === 'A#') displayName = 'B\u266d'
            else if (sk.name.includes('#')) displayName = sk.name.replace('#', '\u266f')

            if (sk.isBlack) {
              var bkStyle = Object.assign({}, styles.blackKeyScale)
              if (feedback && feedback.midi === sk.midi) {
                bkStyle = feedback.type === 'correct' ? styles.blackKeyCorrect : styles.blackKeyWrong
              }
              return React.createElement('div', {
                key: sk.midi,
                style: bkStyle,
                onClick: function() { handleKeyTap(sk.midi) }
              },
                React.createElement('span', { style: styles.blackKeyDegree }, degree),
                React.createElement('span', { style: styles.blackKeyNote }, displayName)
              )
            }

            var keyStyle = isHome ? styles.whiteKeyHome : styles.whiteKey
            if (feedback && feedback.midi === sk.midi) {
              keyStyle = feedback.type === 'correct' ? styles.whiteKeyCorrect : styles.whiteKeyWrong
            }
            return React.createElement('div', {
              key: sk.midi,
              style: keyStyle,
              onClick: function() { handleKeyTap(sk.midi) }
            },
              React.createElement('span', { style: isHome ? styles.keyDegreeHome : styles.keyDegree }, degree),
              React.createElement('span', { style: styles.keyNote }, displayName)
            )
          })
        ),

      // Progress dots (4 per home)
      React.createElement('div', { style: styles.dots },
        calls.map(function(_, i) {
          var dotStyle = styles.dot
          if (i < callPos) dotStyle = styles.dotDone
          else if (i === callPos && !done) dotStyle = styles.dotCurrent
          return React.createElement('div', { key: 'dot-' + i, style: dotStyle })
        })
      ),

      // Completion
      done && React.createElement('div', { style: styles.completion },
        React.createElement('div', { style: styles.completionMain }, 'You transferred the degrees to every home. Next: prove it without support.'),
        React.createElement('div', { style: styles.completionSub },
          homesCompleted.length + ' homes completed. ' + wrongTaps.length + ' wrong tap' + (wrongTaps.length !== 1 ? 's' : '') + '.'
        )
      )
    )
  )
}
