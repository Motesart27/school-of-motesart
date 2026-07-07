import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getStudentId } from '../lesson_engine/concept_state_store.js'
import levels from '../data/rhythm_racer_levels.json'

const API_BASE = 'https://motesart-converter.netlify.app'
const PERFECT_MS = 50
const GOOD_MS = 100
const EDGE_MS = 180
const MAX_LIVES = 3

const RESULT_TEXT = {
  perfect: ['PERFECT', "That's it. Locked in."],
  good: ['GOOD', 'Yes. You had it.'],
  early: ['EARLY', 'Let the beat arrive before your hand moves.'],
  late: ['LATE', 'Lean into the next beat a little sooner.'],
  miss: ['MISS', "Oof. Let's back up a sec."],
  extra: ['EXTRA', 'Hold the space between notes.'],
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

function weightedAccuracy(results) {
  if (!results.length) return 0
  const score = results.reduce((sum, item) => {
    if (item.result === 'perfect') return sum + 1
    if (item.result === 'good') return sum + 0.8
    if (item.result === 'early' || item.result === 'late') return sum + 0.4
    return sum
  }, 0)
  return Math.round((score / results.length) * 100)
}

function noteScore(result, onFire) {
  const base = result === 'perfect' ? 100 : result === 'good' ? 80 : result === 'early' || result === 'late' ? 40 : 0
  return onFire ? base * 2 : base
}

function classifyTap(offsetMs) {
  const abs = Math.abs(offsetMs)
  if (abs <= PERFECT_MS) return 'perfect'
  if (abs <= GOOD_MS) return 'good'
  if (abs <= EDGE_MS) return offsetMs < 0 ? 'early' : 'late'
  return 'miss'
}

function levelByNumber(value) {
  const fallback = levels[0]
  return levels.find(item => item.level === Number(value)) || fallback
}

function playableLevels(unlockedLevel) {
  return levels.filter(item => !item.locked && item.level <= unlockedLevel)
}

function getMistakePattern(results) {
  const early = results.filter(item => item.result === 'early').length
  const late = results.filter(item => item.result === 'late').length
  const miss = results.filter(item => item.result === 'miss').length
  const extra = results.filter(item => item.result === 'extra').length
  if (extra) return 'extra_taps_between_beats'
  if (miss) return 'missed_entries'
  if (early > late) return 'rushes_entries'
  if (late > early) return 'late_entries'
  return 'steady_pulse'
}

function buildSummary(level, accuracy, results, durationSeconds) {
  const mistake = getMistakePattern(results)
  const mastery = accuracy >= 80 ? 'mastery_ready' : accuracy >= 60 ? 'developing' : 'needs_replay'
  return {
    mistake,
    mastery,
    teacher: `Rhythm Racer L${level.level} ${level.name}: ${accuracy}% accuracy over ${results.length} judged notes in ${durationSeconds}s. Pattern: ${mistake}.`,
    avatar: accuracy >= 80 ? "That's it. Locked in." : "Oof. Let's back up a sec.",
  }
}

function scheduleAt(audioContext, when, fn) {
  const delay = Math.max(0, (when - audioContext.currentTime) * 1000)
  return window.setTimeout(fn, delay)
}

function playClick(audioContext, when, accent = false) {
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(accent ? 980 : 640, when)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(accent ? 0.16 : 0.09, when + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.075)
  osc.connect(gain).connect(audioContext.destination)
  osc.start(when)
  osc.stop(when + 0.09)
}

function playDrum(audioContext, when, hand) {
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(hand === 'R' ? 170 : 128, when)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(0.32, when + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16)
  osc.connect(gain).connect(audioContext.destination)
  osc.start(when)
  osc.stop(when + 0.18)
}

function Staff({ level, stage, activeIndex, noteFeedback, displayMode }) {
  const notes = stage.pattern.filter(item => item.type !== 'rest')
  const beats = [1, 2, 3, 4]
  return (
    <section className="rr2-staff-card" aria-label="Rhythm staff">
      <svg className="rr2-staff" viewBox="0 0 760 210" role="img" aria-label={`${level.timeSig} rhythm notation`}>
        {[56, 78, 100, 122, 144].map(y => (
          <line key={y} x1="88" y1={y} x2="700" y2={y} />
        ))}
        <text x="28" y="94" className="rr2-time">4</text>
        <text x="28" y="137" className="rr2-time">4</text>
        {beats.map(beat => (
          <line key={beat} x1={108 + (beat - 1) * 150} y1="50" x2={108 + (beat - 1) * 150} y2="150" className="rr2-beat-line" />
        ))}
        {stage.pattern.map((note, index) => {
          const x = 142 + (note.beat - 1) * 150
          const isRest = note.type === 'rest'
          const fb = noteFeedback[index]
          const active = activeIndex === index
          return (
            <g key={`${note.beat}-${index}`} className={active ? 'rr2-note-active' : ''}>
              {isRest ? (
                <text x={x - 12} y="106" className={`rr2-rest ${fb || ''}`}>R</text>
              ) : (
                <>
                  <ellipse cx={x} cy="100" rx={note.type === 'whole' ? 18 : 15} ry="11" className={`rr2-note ${fb || ''}`} />
                  {note.type !== 'whole' && <line x1={x + 13} y1="96" x2={x + 13} y2="48" className="rr2-stem" />}
                  {note.type === 'whole' && <ellipse cx={x} cy="100" rx="9" ry="5" className="rr2-note-hole" />}
                </>
              )}
              <text x={x} y="178" className="rr2-count-label">
                {displayMode === 'trad' ? note.type.toUpperCase() : note.count}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="rr2-count-circles">
        {beats.map(beat => (
          <div key={beat} className={`rr2-count-circle ${activeIndex >= 0 && Math.ceil(stage.pattern[activeIndex]?.beat || 0) === beat ? 'active' : ''}`}>
            {beat}
          </div>
        ))}
      </div>
      <div className="rr2-stage-line">{displayMode === 'trad' ? `${level.name} - ${notes.length || 0} playable note${notes.length === 1 ? '' : 's'}` : level.counting}</div>
    </section>
  )
}

function DrumPad({ side, label, active, onHit }) {
  const lugAngles = Array.from({ length: 10 }, (_, index) => index * 36)
  return (
    <button
      type="button"
      className={`rr2-pad rr2-pad-${side.toLowerCase()} ${active ? 'struck' : ''}`}
      onPointerDown={onHit}
      aria-label={`${label} drum pad`}
    >
      <span className="rr2-pad-glow" />
      <span className="rr2-pad-shell">
        <span className="rr2-metal-rim">
          {lugAngles.map(angle => (
            <span key={angle} className="rr2-lug" style={{ transform: `rotate(${angle}deg) translateY(-112px)` }} />
          ))}
          <span className="rr2-rim-clamp top" />
          <span className="rr2-rim-clamp bottom" />
          <span className="rr2-mesh-head">
            <span className="rr2-head-ring ring-a" />
            <span className="rr2-head-ring ring-b" />
            <span className="rr2-head-ring ring-c" />
            <span className="rr2-ripple" />
            <strong>{label}</strong>
            <small>{side === 'L' ? 'A key' : 'L key'}</small>
          </span>
        </span>
      </span>
    </button>
  )
}

export default function RhythmRacerV2() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const requestedMode = searchParams.get('mode') || 'game'
  const isAcademic = requestedMode === 'academic'
  const requestedLevel = clamp(Number(searchParams.get('level')) || 1, 1, 5)
  const assignmentId = searchParams.get('assignment_id') || null
  const conceptId = searchParams.get('concept') || levelByNumber(requestedLevel).concept

  const [levelNumber, setLevelNumber] = useState(requestedLevel)
  const [unlockedLevel, setUnlockedLevel] = useState(Math.max(1, requestedLevel))
  const [stageIndex, setStageIndex] = useState(0)
  const [phase, setPhase] = useState('ready')
  const [displayMode, setDisplayMode] = useState('trad')
  const [points, setPoints] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [correctStages, setCorrectStages] = useState(0)
  const [failedStages, setFailedStages] = useState(0)
  const [perfectStageStreak, setPerfectStageStreak] = useState(0)
  const [onFire, setOnFire] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [noteFeedback, setNoteFeedback] = useState({})
  const [padFlash, setPadFlash] = useState(null)
  const [feedback, setFeedback] = useState({ result: 'perfect', title: 'READY', text: 'Press play to hear the rhythm first.' })
  const [stageResults, setStageResults] = useState([])
  const [sessionResults, setSessionResults] = useState([])
  const [summary, setSummary] = useState(null)
  const [logState, setLogState] = useState('idle')

  const audioRef = useRef(null)
  const timersRef = useRef([])
  const turnStartRef = useRef(0)
  const expectedRef = useRef([])
  const judgedRef = useRef([])
  const stageResultsRef = useRef([])
  const sessionResultsRef = useRef([])
  const sessionStartRef = useRef(Date.now())
  const loggedRef = useRef(false)

  const level = useMemo(() => {
    if (isAcademic) return levelByNumber(requestedLevel)
    return levelByNumber(levelNumber)
  }, [isAcademic, levelNumber, requestedLevel])

  const stage = level.stages[stageIndex % Math.max(1, level.stages.length)] || { id: 'empty', pattern: [] }
  const progress = Math.round(((correctStages % 5) / 5) * 100)
  const statusText = phase === 'listen'
    ? 'LISTEN... watch the notes light up.'
    : phase === 'count'
      ? 'READY... 1 2 3 4'
      : phase === 'turn'
        ? 'YOUR TURN - tap on beat 1'
        : summary
          ? 'SESSION COMPLETE'
          : 'Press play to start.'

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const getAudio = useCallback(async () => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    if (!audioRef.current) audioRef.current = new Ctx()
    if (audioRef.current.state === 'suspended') await audioRef.current.resume()
    return audioRef.current
  }, [])

  const flashPad = useCallback((hand) => {
    setPadFlash(hand)
    window.setTimeout(() => setPadFlash(current => (current === hand ? null : current)), 130)
  }, [])

  const judgeTap = useCallback((hand) => {
    if (phase !== 'turn' || summary) return
    const audio = audioRef.current
    const now = audio ? audio.currentTime : performance.now() / 1000
    flashPad(hand)
    if (audio) playDrum(audio, now, hand)

    const pending = expectedRef.current
      .map((note, index) => ({ note, index, offset: (now - note.targetTime) * 1000 }))
      .filter(item => !judgedRef.current[item.index] && Math.abs(item.offset) <= EDGE_MS)
      .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))[0]

    if (!pending) {
      const item = { result: 'extra', hand, at: now }
      stageResultsRef.current = [...stageResultsRef.current, item]
      sessionResultsRef.current = [...sessionResultsRef.current, item]
      setStageResults(prev => [...prev, item])
      setSessionResults(prev => [...prev, item])
      setFeedback({ result: 'extra', title: RESULT_TEXT.extra[0], text: RESULT_TEXT.extra[1] })
      return
    }

    judgedRef.current[pending.index] = true
    const result = classifyTap(pending.offset)
    const item = { ...pending.note, result, offsetMs: Math.round(pending.offset), actualHand: hand }
    stageResultsRef.current = [...stageResultsRef.current, item]
    sessionResultsRef.current = [...sessionResultsRef.current, item]
    setNoteFeedback(prev => ({ ...prev, [pending.note.patternIndex]: result }))
    setStageResults(prev => [...prev, item])
    setSessionResults(prev => [...prev, item])
    setPoints(prev => prev + noteScore(result, onFire))
    setFeedback({ result, title: RESULT_TEXT[result][0], text: RESULT_TEXT[result][1] })
  }, [flashPad, onFire, phase, summary])

  const finishStage = useCallback((resultsOverride) => {
    const results = resultsOverride || stageResultsRef.current
    const misses = expectedRef.current
      .map((note, index) => ({ note, index }))
      .filter(item => !judgedRef.current[item.index])
      .map(item => ({ ...item.note, result: 'miss', offsetMs: null }))

    misses.forEach(item => {
      setNoteFeedback(prev => ({ ...prev, [item.patternIndex]: 'miss' }))
    })

    const allResults = [...results, ...misses]
    if (misses.length) {
      stageResultsRef.current = allResults
      sessionResultsRef.current = [...sessionResultsRef.current, ...misses]
      setStageResults(allResults)
      setSessionResults(prev => [...prev, ...misses])
      setFeedback({ result: 'miss', title: RESULT_TEXT.miss[0], text: RESULT_TEXT.miss[1] })
    }

    const accuracy = weightedAccuracy(allResults.filter(item => item.result !== 'extra'))
    const stagePerfect = allResults.length > 0 && allResults.every(item => item.result === 'perfect')
    setPhase('result')
    setActiveIndex(-1)

    if (accuracy < 60) {
      setLives(prev => {
        const next = Math.max(0, prev - 1)
        if (next === 0) {
          window.setTimeout(() => endSession('out_of_lives', allResults), 250)
        }
        return next
      })
      setFailedStages(prev => {
        const next = prev + 1
        if (next >= 2 && !isAcademic) {
          setLevelNumber(current => Math.max(1, current - 1))
          return 0
        }
        return next
      })
      setCorrectStages(0)
    } else {
      setFailedStages(0)
      setCorrectStages(prev => {
        const next = prev + 1
        if (next >= 5 && !isAcademic) {
          setUnlockedLevel(current => Math.max(current, Math.min(5, level.level + 1)))
          setLevelNumber(current => Math.min(5, current + 1))
          setFeedback({ result: 'perfect', title: 'LEVEL UP', text: "That's it. Locked in." })
          return 0
        }
        return next
      })
    }

    setPerfectStageStreak(prev => {
      const next = stagePerfect ? prev + 1 : 0
      if (next >= 4) {
        setOnFire(true)
        setLives(current => Math.min(MAX_LIVES, current + 1))
      } else if (!stagePerfect) {
        setOnFire(false)
      }
      return next
    })

    if (isAcademic && stageIndex >= level.stages.length - 1) {
      window.setTimeout(() => endSession('academic_complete', allResults), 400)
    }
  }, [isAcademic, level, stageIndex])

  function endSession(result = 'complete', latestStageResults = []) {
    clearTimers()
    const endedAt = Date.now()
    const durationSeconds = Math.max(1, Math.round((endedAt - sessionStartRef.current) / 1000))
    const combined = sessionResultsRef.current
    const judged = combined.filter(item => item.result !== 'extra')
    const accuracy = weightedAccuracy(judged)
    const built = buildSummary(level, accuracy, judged, durationSeconds)
    const nextSummary = { result, accuracy, durationSeconds, attempts: judged.length, ...built }
    setSummary(nextSummary)
    setPhase('complete')
    writePracticeEvent(nextSummary, combined)
  }

  async function writePracticeEvent(nextSummary, results) {
    if (loggedRef.current) return
    loggedRef.current = true
    setLogState('posting')
    const wrongTaps = results
      .filter(item => ['early', 'late', 'miss', 'extra'].includes(item.result))
      .map(item => item.count || item.result)

    const payload = {
      client_event_id: makeEventId(),
      student_instrument_id: user?.id || getStudentId(),
      concept_id: conceptId || level.concept,
      chapter: 'rhythm_racer',
      result: nextSummary.result,
      success_summary: `Rhythm Racer ${level.name}: ${nextSummary.accuracy}% accuracy`,
      found_pairs: [],
      wrong_taps: wrongTaps,
      attempt_count: nextSummary.attempts,
      hint_used: false,
      tempo_factor: level.bpm / 70,
      timestamp: new Date().toISOString(),
      assignment_id: assignmentId,
      activity_type: 'rhythm_racer',
      started_at: new Date(sessionStartRef.current).toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: nextSummary.durationSeconds,
      accuracy: nextSummary.accuracy,
      attempts: nextSummary.attempts,
      hints_used: 0,
      mistake_pattern: nextSummary.mistake,
      mastery_status: nextSummary.mastery,
      teacher_summary: nextSummary.teacher,
      avatar_summary: nextSummary.avatar,
    }

    try {
      console.log('[RhythmRacerV2] Event payload:', payload)
      const res = await fetch(API_BASE + '/api/practice-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      console.log('[RhythmRacerV2] API event response:', data)
      await fetch(API_BASE + '/api/concept-state/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_instrument_id: payload.student_instrument_id,
          concept_id: payload.concept_id,
        }),
      })
      setLogState('posted')
    } catch (err) {
      console.warn('[RhythmRacerV2] API write failed:', err)
      setLogState('failed')
    }
  }

  const playStage = useCallback(async () => {
    clearTimers()
    setSummary(null)
    setStageResults([])
    stageResultsRef.current = []
    setNoteFeedback({})
    setFeedback({ result: 'perfect', title: 'LISTEN', text: 'Listen first. Then repeat it back.' })
    const audio = await getAudio()
    if (!audio) return

    const beatSeconds = 60 / level.bpm
    const start = audio.currentTime + 0.16
    const listenStart = start
    const countStart = listenStart + 5 * beatSeconds
    const turnStart = countStart + 4 * beatSeconds
    turnStartRef.current = turnStart

    setPhase('listen')
    stage.pattern.forEach((note, index) => {
      const when = listenStart + (note.beat - 1) * beatSeconds
      timersRef.current.push(scheduleAt(audio, when, () => {
        setActiveIndex(index)
        if (note.type !== 'rest') {
          flashPad(note.hand)
          playDrum(audio, audio.currentTime, note.hand)
        }
      }))
    })

    for (let beat = 0; beat < 4; beat += 1) {
      const when = countStart + beat * beatSeconds
      playClick(audio, when, beat === 0)
      timersRef.current.push(scheduleAt(audio, when, () => {
        setPhase('count')
        setActiveIndex(beat)
      }))
    }

    const expected = stage.pattern
      .map((note, patternIndex) => ({ ...note, patternIndex, targetTime: turnStart + (note.beat - 1) * beatSeconds }))
      .filter(note => note.type !== 'rest')
    expectedRef.current = expected
    judgedRef.current = Array(expected.length).fill(false)

    timersRef.current.push(scheduleAt(audio, turnStart, () => {
      setPhase('turn')
      setActiveIndex(-1)
      setFeedback({ result: 'good', title: 'YOUR TURN', text: 'Tap the rhythm back on the beat.' })
    }))

    timersRef.current.push(scheduleAt(audio, turnStart + 4 * beatSeconds + 0.26, () => {
      finishStage()
    }))
  }, [clearTimers, finishStage, flashPad, getAudio, level.bpm, stage.pattern])

  const nextStage = useCallback(() => {
    if (summary) return
    setStageIndex(prev => (prev + 1) % Math.max(1, level.stages.length))
    setPhase('ready')
    setActiveIndex(-1)
    setFeedback({ result: 'perfect', title: 'READY', text: 'Press play to hear the next rhythm.' })
  }, [level.stages.length, summary])

  useEffect(() => {
    const onKey = (event) => {
      const key = event.key.toLowerCase()
      if (key === 'a') judgeTap('L')
      if (key === 'l') judgeTap('R')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [judgeTap])

  useEffect(() => {
    setLevelNumber(requestedLevel)
    setUnlockedLevel(Math.max(1, requestedLevel))
  }, [requestedLevel])

  return (
    <main className="rr2-page">
      <style>{styles}</style>
      <section className="rr2-shell">
        <header className="rr2-topbar">
          <div className="rr2-metric"><span className="rr2-coin" /> <span><b>POINTS</b>{points}</span></div>
          <div className="rr2-metric"><span><b>LIVES</b><span className="rr2-hearts">{Array.from({ length: MAX_LIVES }, (_, i) => <span key={i} className={i < lives ? 'full' : ''}>♥</span>)}</span></span></div>
          <div className="rr2-metric"><span><b>TEMPO</b>{level.bpm} BPM</span></div>
          <div className="rr2-toggle" role="group" aria-label="notation mode">
            <button type="button" className={displayMode === 'trad' ? 'active' : ''} onClick={() => setDisplayMode('trad')}>TRAD</button>
            <button type="button" className={displayMode === 'num' ? 'active' : ''} onClick={() => setDisplayMode('num')}>NUM</button>
          </div>
          <div className="rr2-progress-cell">
            <div className="rr2-progress-bar"><span style={{ height: `${progress}%` }} /></div>
            <span><b>PROGRESS</b>{progress}%</span>
          </div>
        </header>

        <Staff level={level} stage={stage} activeIndex={activeIndex} noteFeedback={noteFeedback} displayMode={displayMode} />

        <div className="rr2-midrow">
          <div className="rr2-level">LEVEL {level.level}<small>{level.name}</small></div>
          <h1>Rhythm Racer</h1>
          <button type="button" className="rr2-play" onClick={phase === 'result' ? nextStage : playStage} disabled={phase === 'listen' || phase === 'count' || phase === 'turn'}>
            {phase === 'result' ? 'NEXT' : 'PLAY'}
          </button>
        </div>

        {!isAcademic && (
          <div className="rr2-level-select" aria-label="level select">
            {playableLevels(unlockedLevel).map(item => (
              <button key={item.level} type="button" className={item.level === level.level ? 'active' : ''} onClick={() => { setLevelNumber(item.level); setStageIndex(0) }}>
                L{item.level}
              </button>
            ))}
          </div>
        )}

        <div className="rr2-status">{statusText}{onFire ? ' - ON FIRE' : ''}</div>

        <section className="rr2-pads" aria-label="drum pads">
          <DrumPad side="L" label="LEFT" active={padFlash === 'L'} onHit={() => judgeTap('L')} />
          <DrumPad side="R" label="RIGHT" active={padFlash === 'R'} onHit={() => judgeTap('R')} />
        </section>

        <section className={`rr2-feedback ${feedback.result}`}>
          <strong>{feedback.title}</strong>
          <span>{feedback.text}</span>
        </section>

        {summary && (
          <section className="rr2-summary">
            <h2>Session Summary</h2>
            <p>{summary.accuracy}% accuracy - {summary.mastery.replace(/_/g, ' ')}</p>
            <p>{summary.teacher}</p>
            <div className="rr2-summary-actions">
              {isAcademic && <button type="button" onClick={() => navigate('/homework')}>Back to Homework</button>}
              {!isAcademic && <button type="button" onClick={() => { setSummary(null); setLives(MAX_LIVES); setPhase('ready'); loggedRef.current = false; sessionStartRef.current = Date.now() }}>Play Again</button>}
              <span>Log: {logState}</span>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

const styles = `
.rr2-page{min-height:100vh;background:radial-gradient(circle at 50% -15%,rgba(62,224,200,.16),transparent 32%),#0b1026;color:#eff6ff;font-family:'DM Sans','Outfit',system-ui,sans-serif;padding:18px;box-sizing:border-box}
.rr2-shell{max-width:1160px;margin:0 auto;padding:16px;border:1px solid rgba(148,163,184,.22);background:linear-gradient(135deg,rgba(15,23,42,.86),rgba(15,23,42,.58));backdrop-filter:blur(18px);border-radius:18px;box-shadow:0 22px 80px rgba(0,0,0,.38)}
.rr2-topbar{display:grid;grid-template-columns:1fr 1fr 1fr 1.1fr 1.1fr;border:1px solid rgba(148,163,184,.28);border-radius:8px;overflow:hidden;background:rgba(8,13,32,.72)}
.rr2-metric,.rr2-progress-cell,.rr2-toggle{min-height:58px;display:flex;align-items:center;justify-content:center;gap:10px;border-right:1px solid rgba(148,163,184,.25);font-size:18px;font-weight:800}
.rr2-metric span span,.rr2-progress-cell span{display:flex;flex-direction:column;gap:2px;align-items:center}.rr2-metric b,.rr2-progress-cell b{font-size:10px;letter-spacing:.13em;color:#93a4bd}.rr2-coin{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 32%,#fff3b0,#f8c33a 55%,#a96800);box-shadow:0 0 18px rgba(248,195,58,.38)}.rr2-hearts{flex-direction:row!important;color:#334155;font-size:17px}.rr2-hearts .full{color:#fb7185;text-shadow:0 0 12px rgba(251,113,133,.5)}
.rr2-toggle button{border:0;background:rgba(15,23,42,.8);color:#94a3b8;padding:9px 12px;font-weight:900;border-radius:6px;cursor:pointer}.rr2-toggle button.active{background:#3ee0c8;color:#062327}.rr2-progress-bar{width:14px;height:38px;border:1px solid rgba(148,163,184,.42);border-radius:999px;display:flex;align-items:flex-end;padding:2px;background:#0f172a}.rr2-progress-bar span{width:100%;border-radius:999px;background:linear-gradient(#8b7ef8,#3ee0c8)}
.rr2-staff-card{margin:18px 0 14px;padding:16px;border-radius:8px;background:rgba(2,6,23,.42);border:1px solid rgba(148,163,184,.18)}.rr2-staff{height:auto;width:100%;max-height:250px}.rr2-staff line{stroke:#5b6b86;stroke-width:2}.rr2-beat-line{stroke:#26344f!important;stroke-width:1!important}.rr2-time{fill:#dbeafe;font-size:38px;font-weight:900}.rr2-note{fill:#d1d5db;stroke:#f8fafc;stroke-width:3;transform-origin:center;transition:.2s}.rr2-note-hole{fill:#0f172a}.rr2-stem{stroke:#e5e7eb!important;stroke-width:4!important}.rr2-rest{fill:#d1d5db;font-size:28px;font-weight:900}.rr2-note-active .rr2-note{filter:drop-shadow(0 0 16px #3ee0c8);transform:scale(1.18)}.rr2-note.perfect,.rr2-note.good,.rr2-rest.perfect,.rr2-rest.good{fill:#3ee0c8}.rr2-note.early,.rr2-note.late,.rr2-rest.early,.rr2-rest.late{fill:#facc15}.rr2-note.miss,.rr2-rest.miss{fill:#fb7185}.rr2-count-label{fill:#93a4bd;font-size:13px;font-weight:900;text-anchor:middle}
.rr2-count-circles{display:flex;justify-content:center;gap:12px;margin-top:0}.rr2-count-circle{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(148,163,184,.35);background:#101935;color:#cbd5e1;font-weight:900}.rr2-count-circle.active{background:#3ee0c8;color:#062327;box-shadow:0 0 0 8px rgba(62,224,200,.12);animation:rr2Pulse .42s ease}.rr2-stage-line{text-align:center;color:#9fb0ca;font-weight:800;margin-top:10px}
.rr2-midrow{display:grid;grid-template-columns:160px 1fr 160px;align-items:center;gap:12px}.rr2-level{justify-self:start;padding:10px 14px;border-radius:8px;background:rgba(139,126,248,.16);border:1px solid rgba(139,126,248,.38);font-weight:950}.rr2-level small{display:block;color:#b8c2d8;font-size:11px;margin-top:2px}.rr2-midrow h1{text-align:center;margin:0;font-size:clamp(32px,5vw,58px);font-family:'Outfit','DM Sans',sans-serif;letter-spacing:0}.rr2-play{justify-self:end;border:0;border-radius:8px;background:linear-gradient(135deg,#3ee0c8,#8b7ef8);color:#061225;padding:15px 28px;font-weight:1000;cursor:pointer;box-shadow:0 12px 30px rgba(62,224,200,.23)}.rr2-play:disabled{opacity:.45;cursor:not-allowed}.rr2-level-select{display:flex;justify-content:center;gap:8px;margin:10px 0}.rr2-level-select button{border:1px solid rgba(148,163,184,.25);background:#101935;color:#cbd5e1;border-radius:6px;padding:7px 12px;font-weight:900;cursor:pointer}.rr2-level-select button.active{background:#8b7ef8;color:white}.rr2-status{text-align:center;color:#e2e8f0;font-weight:1000;font-size:17px;margin:12px 0 14px;min-height:24px}
.rr2-pads{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center}.rr2-pad{height:300px;border:0;background:transparent;position:relative;cursor:pointer;touch-action:manipulation}.rr2-pad-glow{position:absolute;left:18%;right:18%;bottom:16px;height:34px;border-radius:50%;filter:blur(18px);opacity:.5}.rr2-pad-l .rr2-pad-glow{background:#3ee0c8}.rr2-pad-r .rr2-pad-glow{background:#8b7ef8}.rr2-pad-shell{position:absolute;inset:12px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#14213f,#050917);box-shadow:inset 0 -24px 45px rgba(0,0,0,.5),0 24px 50px rgba(0,0,0,.45)}.rr2-metal-rim{position:relative;width:250px;height:250px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(from 16deg,#e2e8f0,#334155,#94a3b8,#111827,#cbd5e1,#475569,#f8fafc,#1f2937,#e2e8f0);box-shadow:inset 0 0 0 10px rgba(15,23,42,.72),0 0 0 4px rgba(226,232,240,.2)}.rr2-mesh-head{position:relative;width:196px;height:196px;border-radius:50%;display:grid;place-items:center;background:repeating-radial-gradient(circle,#cbd5e1 0 2px,#9ca3af 3px 5px);box-shadow:inset 0 0 34px rgba(15,23,42,.42);overflow:hidden}.rr2-mesh-head strong{font-size:32px;color:#0f172a;letter-spacing:.04em}.rr2-mesh-head small{margin-top:-48px;color:#334155;font-weight:900}.rr2-head-ring{position:absolute;border:1px solid rgba(15,23,42,.28);border-radius:50%}.ring-a{inset:18px}.ring-b{inset:38px}.ring-c{inset:58px}.rr2-lug{position:absolute;left:116px;top:116px;width:18px;height:30px;border-radius:5px;background:linear-gradient(90deg,#e5e7eb,#475569,#f8fafc);transform-origin:9px 9px;box-shadow:0 0 0 2px rgba(15,23,42,.42)}.rr2-rim-clamp{position:absolute;left:50%;width:70px;height:18px;margin-left:-35px;border-radius:5px;background:linear-gradient(90deg,#f8fafc,#475569,#e2e8f0);z-index:2}.rr2-rim-clamp.top{top:10px}.rr2-rim-clamp.bottom{bottom:10px}.rr2-ripple{position:absolute;inset:40px;border-radius:50%;border:3px solid currentColor;opacity:0;transform:scale(.6)}.rr2-pad-l .rr2-ripple{color:#3ee0c8}.rr2-pad-r .rr2-ripple{color:#8b7ef8}.rr2-pad.struck .rr2-ripple{animation:rr2Ripple .38s ease-out}.rr2-pad.struck .rr2-pad-shell{transform:translateY(2px) scale(.99)}
.rr2-feedback{margin:16px auto 0;max-width:560px;min-height:70px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(15,23,42,.78);border:1px solid rgba(148,163,184,.22)}.rr2-feedback strong{font-size:30px}.rr2-feedback span{color:#b8c2d8;font-weight:800}.rr2-feedback.perfect strong,.rr2-feedback.good strong{color:#3ee0c8}.rr2-feedback.early strong,.rr2-feedback.late strong{color:#facc15}.rr2-feedback.miss strong,.rr2-feedback.extra strong{color:#fb7185}
.rr2-summary{margin-top:14px;padding:16px;border-radius:8px;background:rgba(8,13,32,.92);border:1px solid rgba(62,224,200,.28);text-align:center}.rr2-summary h2{margin:0 0 8px}.rr2-summary p{margin:6px 0;color:#cbd5e1}.rr2-summary-actions{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:12px}.rr2-summary-actions button{border:0;border-radius:8px;background:#3ee0c8;color:#062327;padding:10px 14px;font-weight:950;cursor:pointer}.rr2-summary-actions span{color:#94a3b8;font-weight:800}
@keyframes rr2Pulse{0%{transform:scale(.9)}70%{transform:scale(1.08)}100%{transform:scale(1)}}@keyframes rr2Ripple{0%{opacity:.8;transform:scale(.55)}100%{opacity:0;transform:scale(1.45)}}
@media (max-width:760px){.rr2-page{padding:10px}.rr2-shell{padding:10px}.rr2-topbar{grid-template-columns:1fr 1fr}.rr2-topbar>*{border-bottom:1px solid rgba(148,163,184,.2)}.rr2-progress-cell{grid-column:1/-1}.rr2-midrow{grid-template-columns:1fr;justify-items:center}.rr2-level,.rr2-play{justify-self:center}.rr2-pads{gap:10px}.rr2-pad{height:220px}.rr2-metal-rim{width:166px;height:166px}.rr2-mesh-head{width:128px;height:128px}.rr2-mesh-head strong{font-size:22px}.rr2-mesh-head small{margin-top:-28px}.rr2-lug{left:74px;top:74px;transform:scale(.72)}.rr2-rim-clamp{width:48px;margin-left:-24px}.rr2-staff-card{padding:8px}.rr2-count-label{font-size:11px}}
`
