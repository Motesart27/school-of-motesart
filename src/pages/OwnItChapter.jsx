import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

var API_BASE = 'https://motesart-converter.netlify.app'
var CONCEPT_ID = 'T_MAJOR_SCALE_PATTERN'
var SCALE = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2']
var PASSES_REQUIRED = 2
var HESITATION_MS = 3000

function generateEventId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

var WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2']
var BLACK_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#']
var BLACK_POSITIONS = { 'C#': 11.5, 'D#': 25, 'F#': 53.5, 'G#': 67, 'A#': 80.5 }

var styles = {
  page: { minHeight: '100vh', background: '#0a0a12', color: '#e8e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: 'hidden', position: 'relative' },
  header: { width: '100%', maxWidth: '800px', padding: '32px 24px 12px', textAlign: 'center' },
  conceptPurpose: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 },
  homeBadge: { fontSize: 13, color: '#f59e0b', background: '#f59e0b15', padding: '6px 16px', borderRadius: 8, fontWeight: 700, letterSpacing: '1px', display: 'inline-block', marginTop: 8 },
  conceptTitle: { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#666', marginBottom: '6px' },
  chapterRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '4px' },
  chapterTitle: { fontSize: '22px', fontWeight: 600, color: '#e8e8f0' },
  stagePill: { fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#5a8a6a', background: '#1a2a1e', border: '1px solid #2a3a2e', borderRadius: '10px', padding: '3px 10px' },
  subtitle: { fontSize: '14px', color: '#555', fontStyle: 'italic' },
  stage: { flex: 1, width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'relative' },
  passCounter: { position: 'absolute', top: '0', right: '24px', fontSize: '11px', color: '#444', letterSpacing: '1px' },
  passCountNum: { color: '#6a8a6a', fontWeight: 600 },
  startPrompt: { textAlign: 'center', marginBottom: '48px' },
  startInstruction: { fontSize: '18px', color: '#aaa' },
  progressDots: { display: 'flex', gap: '10px', marginBottom: '32px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#222', transition: 'background 0.3s, box-shadow 0.3s' },
  dotHit: { background: '#4a6', boxShadow: '0 0 6px rgba(68,170,102,0.4)' },
  dotWrong: { background: '#c44', boxShadow: '0 0 6px rgba(204,68,68,0.4)' },
  keyboardWrap: { width: '100%', maxWidth: '700px', position: 'relative' },
  keyboard: { display: 'flex', position: 'relative', height: '160px', width: '100%' },
  whiteKey: { flex: 1, background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '0 0 6px 6px', cursor: 'pointer', position: 'relative', transition: 'background 0.15s' },
  whiteKeyPressed: { background: '#2a3a2a' },
  whiteKeyWrong: { background: '#3a2020' },
  blackKeysRow: { position: 'absolute', top: 0, left: 0, right: 0, height: '100px', pointerEvents: 'none' },
  blackKey: { position: 'absolute', width: '7%', height: '100%', background: '#0d0d14', border: '1px solid #1a1a28', borderRadius: '0 0 4px 4px', cursor: 'pointer', pointerEvents: 'auto', transition: 'background 0.15s' },
  completionOverlay: { position: 'fixed', inset: 0, background: 'rgba(10,10,18,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  completionText: { fontSize: '20px', color: '#e8e8f0', marginBottom: '8px', textAlign: 'center' },
  completionSub: { fontSize: '14px', color: '#666', marginBottom: '32px', textAlign: 'center' },
  completionEvidence: { fontSize: '12px', color: '#444', maxWidth: '400px', textAlign: 'center', marginBottom: '24px' },
  nextBtn: { padding: '12px 32px', background: '#2a3a2a', color: '#8cb88c', border: '1px solid #3a4a3a', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', letterSpacing: '0.5px' }
}

export default function OwnItChapter() {
  var navigate = useNavigate()

  var [noteIndex, setNoteIndex] = useState(0)
  var [playing, setPlaying] = useState(false)
  var [cleanPasses, setCleanPasses] = useState(0)
  var [totalAttempts, setTotalAttempts] = useState(0)
  var [roundHasWrong, setRoundHasWrong] = useState(false)
  var [completed, setCompleted] = useState(false)
  var [playedNotes, setPlayedNotes] = useState([])
  var [wrongTaps, setWrongTaps] = useState([])
  var [hesitationCount, setHesitationCount] = useState(0)
  var [roundPaceMs, setRoundPaceMs] = useState([])
  var [dotStates, setDotStates] = useState(Array(8).fill('empty'))
  var [pressedKey, setPressedKey] = useState(null)
  var [wrongKey, setWrongKey] = useState(null)
  var [ambassadorMsg, setAmbassadorMsg] = useState("Trust the pattern. Don\u2019t chase the screen.")
  var [confidence, setConfidence] = useState(null)
  var [trend, setTrend] = useState(null)

  var lastTapTime = useRef(0)
  var hesitationTimer = useRef(null)
  var hesitationsThisRound = useRef(0)

  function startHesitationWatch() {
    if (hesitationTimer.current) clearInterval(hesitationTimer.current)
    lastTapTime.current = Date.now()
    hesitationTimer.current = setInterval(function() {
      if (Date.now() - lastTapTime.current > HESITATION_MS) {
        hesitationsThisRound.current += 1
        setHesitationCount(function(h) { return h + 1 })
        lastTapTime.current = Date.now()
      }
    }, 500)
  }

  function stopHesitationWatch() {
    if (hesitationTimer.current) {
      clearInterval(hesitationTimer.current)
      hesitationTimer.current = null
    }
  }

  useEffect(function() { return function() { stopHesitationWatch() } }, [])

  function resetRound() {
    setNoteIndex(0)
    setPlaying(false)
    setRoundHasWrong(false)
    setPlayedNotes([])
    setWrongTaps([])
    setHesitationCount(0)
    setRoundPaceMs([])
    setDotStates(Array(8).fill('empty'))
    setPressedKey(null)
    setWrongKey(null)
    hesitationsThisRound.current = 0
    stopHesitationWatch()
  }

  var handleTap = useCallback(function(note) {
    if (completed) return
    var expected = SCALE[noteIndex]
    var now = Date.now()

    if (!playing) {
      setPlaying(true)
      setTotalAttempts(function(a) { return a + 1 })
    }

    if (lastTapTime.current > 0) {
      var elapsed = now - lastTapTime.current
      setRoundPaceMs(function(prev) { return prev.concat([elapsed]) })
    }
    lastTapTime.current = now

    if (noteIndex === 0 && !playing) { startHesitationWatch() }

    if (note === expected) {
      setPressedKey(note)
      setTimeout(function() { setPressedKey(null) }, 200)
      setPlayedNotes(function(prev) { return prev.concat([note]) })
      var newDots = dotStates.slice()
      newDots[noteIndex] = 'hit'
      setDotStates(newDots)
      var nextIdx = noteIndex + 1
      if (nextIdx >= SCALE.length) {
        stopHesitationWatch()
        setNoteIndex(nextIdx)
        finishRound(!roundHasWrong)
      } else {
        setNoteIndex(nextIdx)
      }
    } else {
      setWrongKey(note)
      setTimeout(function() { setWrongKey(null) }, 400)
      setWrongTaps(function(prev) { return prev.concat([note]) })
      setRoundHasWrong(true)
      var newDots2 = dotStates.slice()
      newDots2[noteIndex] = 'wrong'
      setDotStates(newDots2)
      setTimeout(function() {
        setDotStates(function(prev) { var c = prev.slice(); if (c[noteIndex] === 'wrong') c[noteIndex] = 'empty'; return c })
      }, 600)
      setAmbassadorMsg("That wasn\u2019t it. Feel the shape.")
    }
  }, [noteIndex, playing, completed, dotStates, roundHasWrong])

  function finishRound(wasClean) {
    var newCleanPasses = wasClean ? cleanPasses + 1 : cleanPasses
    if (wasClean) setCleanPasses(newCleanPasses)
    writeOwnItEvent(wasClean, newCleanPasses)
    if (newCleanPasses >= PASSES_REQUIRED) {
      setCompleted(true)
      setAmbassadorMsg("Good. You\u2019re starting to trust the pattern.")
    } else if (wasClean) {
      if (hesitationsThisRound.current > 0) {
        setAmbassadorMsg('')
      } else {
        setAmbassadorMsg('One clean pass. Do it again.')
      }
      setTimeout(resetRound, 1400)
    } else {
      if (wrongTaps.length >= 3) {
        setAmbassadorMsg("You\u2019re guessing. Slow down. Trust the shape.")
      } else if (hesitationsThisRound.current > 0) {
        setAmbassadorMsg('You hesitated a little. Try again.')
      } else {
        setAmbassadorMsg('Not quite. Try again.')
      }
      setTimeout(resetRound, 1400)
    }
  }

  function writeOwnItEvent(wasClean, passCount) {
    var avgPace = roundPaceMs.length > 0
      ? Math.round(roundPaceMs.reduce(function(a, b) { return a + b }, 0) / roundPaceMs.length)
      : 0
    var finalNotes = playedNotes.slice()
    if (finalNotes.length < SCALE.length) finalNotes.push(SCALE[SCALE.length - 1])
    var eventPayload = {
      client_event_id: generateEventId(),
      student_instrument_id: getStudentId(),
      concept_id: CONCEPT_ID,
      chapter: 'own_it',
      played_notes: finalNotes,
      wrong_taps: wrongTaps,
      attempt_count: totalAttempts,
      hint_used: false,
      hesitation_count: hesitationsThisRound.current,
      feel_mode_stage: 'own_it',
      visual_support_level: 'hidden',
      result: 'complete',
        success_summary: 'performed the major scale pattern without visual cues',
      stalled_on_note: null,
      pace_ms: avgPace
    }
    fetch(API_BASE + '/api/practice-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    })
    .then(function(res) { return res.json() })
    .then(function(data) {
      if (data && data.confidence !== undefined) {
        setConfidence(data.confidence)
        setTrend(data.trend || null)
      }
    })
    .catch(function(err) { console.error('[OwnIt] practice-event failed:', err) })
  }

  return (
    React.createElement('div', { style: styles.page },
      React.createElement('div', { style: styles.header },
        React.createElement('div', { style: styles.conceptTitle }, 'The Major Scale Pattern'),
        React.createElement('div', { style: styles.conceptPurpose }, 'Learn the shape.'),
        React.createElement('div', { style: styles.homeBadge }, 'Home: C'),
        React.createElement('div', { style: styles.chapterRow },
          React.createElement('div', { style: styles.chapterTitle }, 'Own It'),
          React.createElement('span', { style: styles.stagePill }, 'Emerging')
        ),
        React.createElement('div', { style: styles.subtitle }, 'Play the pattern without looking.')
      ),
      React.createElement('div', { style: styles.stage },
        React.createElement('div', { style: styles.passCounter },
          'CLEAN PASSES: ',
          React.createElement('span', { style: styles.passCountNum }, cleanPasses),
          ' / ' + PASSES_REQUIRED
        ),
        !playing && !completed
          ? React.createElement('div', { style: styles.startPrompt },
              React.createElement('div', { style: styles.startInstruction }, 'Start on 1.')
            )
          : null,
        React.createElement('div', { style: styles.progressDots },
          dotStates.map(function(st, i) {
            var dotStyle = Object.assign({}, styles.dot)
            if (st === 'hit') Object.assign(dotStyle, styles.dotHit)
            if (st === 'wrong') Object.assign(dotStyle, styles.dotWrong)
            return React.createElement('div', { key: i, style: dotStyle })
          })
        ),
        React.createElement('div', { style: styles.keyboardWrap },
          React.createElement('div', { style: styles.keyboard },
            WHITE_NOTES.map(function(note) {
              var keyStyle = Object.assign({}, styles.whiteKey)
              if (pressedKey === note) Object.assign(keyStyle, styles.whiteKeyPressed)
              if (wrongKey === note) Object.assign(keyStyle, styles.whiteKeyWrong)
              return React.createElement('div', { key: note, style: keyStyle, onClick: function() { handleTap(note) } })
            }),
            React.createElement('div', { style: styles.blackKeysRow },
              BLACK_NOTES.map(function(note) {
                var bkStyle = Object.assign({}, styles.blackKey, { left: BLACK_POSITIONS[note] + '%' })
                if (wrongKey === note) Object.assign(bkStyle, styles.whiteKeyWrong)
                return React.createElement('div', { key: note, style: bkStyle, onClick: function() { handleTap(note) } })
              })
            )
          )
        )
      ),
      React.createElement(AmbassadorBubble, { message: ambassadorMsg, ambassadorId: 'motesart' }),
      completed
        ? React.createElement('div', { style: styles.completionOverlay },
            React.createElement('div', { style: styles.completionText }, 'You performed the pattern without visual cues. The shape is yours.'),
            React.createElement('div', { style: styles.completionSub }, 'Two clean passes. Own It \u2014 Emerging.'),
            React.createElement('div', { style: styles.completionEvidence },
              confidence !== null
                ? 'Confidence: ' + Math.round(confidence * 100) + '% \u00B7 Trend: ' + (trend || 'stable')
                : ''
            ),
            React.createElement('button', { style: styles.nextBtn, onClick: function() { navigate('/practice') } }, 'Back to Practice')
          )
        : null
    )
  )
}