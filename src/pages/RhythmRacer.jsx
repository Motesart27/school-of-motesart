import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getCoaching,
  getLevel,
  getPatternForAttempt,
  normalizeAgeGroup,
  RHYTHM_BEAT_MS,
  RHYTHM_BEATS_PER_ATTEMPT,
  RHYTHM_BEATS_PER_MEASURE,
} from '../data/rhythmRacerLevels.js'

const PRACTICE_LOG_URL = 'https://deployable-python-codebase-som-production.up.railway.app/practice-log/sessions'
const PERFECT_MS = 80
const GOOD_MS = 150
const LATE_EARLY_MS = 250
const CAR_X = 80
const TRAVEL_BEATS = 4

const emptyCounts = () => ({
  perfect: 0,
  good: 0,
  early: 0,
  late: 0,
  miss: 0,
  restMistake: 0,
})

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num))
}

function getSelfRating(accuracy) {
  if (accuracy >= 95) return 5
  if (accuracy >= 85) return 4
  if (accuracy >= 70) return 3
  if (accuracy >= 50) return 2
  return 1
}

function getAccuracyFromCounts(counts) {
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0)
  if (!total) return 0
  return Math.round(((counts.perfect + counts.good) / total) * 100)
}

function getConceptName(concept) {
  return String(concept || 'rhythm')
    .replace(/^R_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function getTapAccuracy(result) {
  if (result === 'perfect') return 100
  if (result === 'good') return 90
  if (result === 'early' || result === 'late') return 70
  return 0
}

function classifyOffset(offsetMs) {
  const abs = Math.abs(offsetMs)
  if (abs <= PERFECT_MS) return 'perfect'
  if (abs <= GOOD_MS) return 'good'
  if (abs <= LATE_EARLY_MS) return offsetMs < 0 ? 'early' : 'late'
  return 'miss'
}

function feedbackKey(result) {
  if (result === 'restMistake') return 'REST_MISTAKE'
  return String(result || 'miss').toUpperCase()
}

function formatSeconds(seconds) {
  const total = Math.max(0, Math.round(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function buildAttemptBeats(levelConfig, stageAttempt) {
  const pattern = getPatternForAttempt(levelConfig, stageAttempt)
  const beats = []
  for (let measure = 0; measure < 4; measure += 1) {
    pattern.forEach((kind, beat) => {
      beats.push({
        id: `${measure}-${beat}`,
        index: beats.length,
        measure,
        beat,
        kind,
      })
    })
  }
  return beats
}

function buildMarkers(beats, levelConfig) {
  const markers = []
  beats.forEach((beat, idx) => {
    if (beat.kind === 'tap') {
      markers.push({
        id: `tap-${beat.id}`,
        beatIndex: idx,
        type: levelConfig.marker === 'circle' || levelConfig.marker === 'mixed' ? 'circle' : 'bar',
        span: Math.max(1, levelConfig.span || 1),
      })
    }
    if (beat.kind === 'rest') {
      markers.push({
        id: `rest-${beat.id}`,
        beatIndex: idx,
        type: 'rest',
        span: 1,
      })
    }
  })
  return markers
}

function Confetti() {
  const pieces = Array.from({ length: 54 }, (_, i) => ({
    id: i,
    left: (i * 17) % 100,
    delay: (i % 9) * 0.08,
    duration: 2.3 + (i % 5) * 0.18,
    color: ['#fbbf24', '#14b8a6', '#22d3ee', '#a855f7', '#22c55e', '#f97316'][i % 6],
    size: 7 + (i % 4),
  }))
  return (
    <>
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="rr-confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            background: piece.color,
            width: piece.size,
            height: piece.size,
          }}
        />
      ))}
    </>
  )
}

export default function RhythmRacer() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const requestedLevel = clamp(Number(searchParams.get('level') || 1) || 1, 1, 4)
  const assignmentId = searchParams.get('assignment_id') || null
  const fromParam = searchParams.get('from')
  const ageGroup = normalizeAgeGroup(user?.age_group || user?.ageGroup)

  const [level, setLevel] = useState(requestedLevel)
  const levelConfig = useMemo(() => getLevel(level), [level])
  const concept = searchParams.get('concept') || levelConfig.concept
  const mode = searchParams.get('mode') || 'game'
  const isAcademic = mode === 'academic'
  const conceptName = getConceptName(concept)
  const [phase, setPhase] = useState('ready')
  const [countBeat, setCountBeat] = useState(0)
  const [nowMs, setNowMs] = useState(0)
  const [attemptStart, setAttemptStart] = useState(null)
  const [stageAttempt, setStageAttempt] = useState(1)
  const [correctStages, setCorrectStages] = useState(0)
  const [failedStages, setFailedStages] = useState(0)
  const [lives, setLives] = useState(3)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [onFire, setOnFire] = useState(false)
  const [counts, setCounts] = useState(emptyCounts)
  const [levelCounts, setLevelCounts] = useState(emptyCounts)
  const [completion, setCompletion] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [coachLine, setCoachLine] = useState(() => getCoaching('PRE_GAME', ageGroup, getLevel(requestedLevel).key))
  const [flash, setFlash] = useState(null)
  const [padActive, setPadActive] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [written, setWritten] = useState(false)
  const [writeStatus, setWriteStatus] = useState('idle')

  const sessionStartRef = useRef(Date.now())
  const audioCtxRef = useRef(null)
  const tamiStackRef = useRef(null)
  const rafRef = useRef(null)
  const timersRef = useRef([])
  const touchRef = useRef(0)
  const lastMetroBeatRef = useRef(-1)
  const beatsRef = useRef([])
  const scoredRef = useRef({})
  const countsRef = useRef(emptyCounts())
  const levelCountsRef = useRef(emptyCounts())
  const streakRef = useRef(0)
  const maxStreakRef = useRef(0)
  const livesRef = useRef(3)
  const phaseRef = useRef('ready')
  const attemptStartRef = useRef(null)

  const beats = useMemo(() => buildAttemptBeats(levelConfig, stageAttempt), [levelConfig, stageAttempt])
  const markers = useMemo(() => buildMarkers(beats, levelConfig), [beats, levelConfig])
  const sessionSeconds = (Date.now() - sessionStartRef.current) / 1000
  const totalJudged = Object.values(counts).reduce((sum, val) => sum + val, 0)
  const positive = counts.perfect + counts.good
  const accuracy = totalJudged ? Math.round((positive / totalJudged) * 100) : 0
  const levelAccuracy = getAccuracyFromCounts(levelCounts)
  const carPulse = phase === 'count-in' || phase === 'playing'

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { livesRef.current = lives }, [lives])
  useEffect(() => { attemptStartRef.current = attemptStart }, [attemptStart])
  useEffect(() => {
    beatsRef.current = beats
    scoredRef.current = {}
  }, [beats])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer))
    timersRef.current = []
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const playMetronomeClick = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.022)
    } catch (e) {}
  }, [])

  const getTamiStack = useCallback(() => {
    try {
      if (!tamiStackRef.current && typeof window !== 'undefined') {
        tamiStackRef.current = window.__tamiStack || null
      }
      return tamiStackRef.current || null
    } catch (e) {
      return null
    }
  }, [])

  useEffect(() => {
    try {
      const stack = getTamiStack()
      stack?.bridge?.connect?.({
        conceptId: concept,
        activityType: 'rhythm_game',
        mode,
        level,
      })
    } catch (e) {}
  }, [concept, getTamiStack, level, mode])

  const emitTamiResult = useCallback((result, beatIndex, meta = {}) => {
    const isCorrect = result === 'perfect' || result === 'good'
    const beat = beatsRef.current[beatIndex] || {}
    const resultKey = feedbackKey(result)
    try {
      getTamiStack()?.intelligence?.processEvaluation?.({
        isCorrect,
        concept,
        activityType: 'rhythm_tap',
        accuracy: getTapAccuracy(result),
        timingOffset: meta.offsetMs ?? null,
        level,
        beatPosition: (beatIndex % RHYTHM_BEATS_PER_MEASURE) + 1,
        noteType: beat.kind || meta.noteType || 'unknown',
      })
    } catch (e) {}
    try {
      getTamiStack()?.intelligence?.processConfidenceUpdate?.({
        delta: isCorrect ? 10 : -15,
        concept,
        reason: resultKey,
      })
    } catch (e) {}
  }, [concept, getTamiStack, level])

  const setCoach = useCallback((eventKey) => {
    setCoachLine(getCoaching(eventKey, ageGroup, levelConfig.key))
  }, [ageGroup, levelConfig.key])

  const recordResult = useCallback((result, beatIndex, meta = {}) => {
    if (scoredRef.current[beatIndex]) return
    scoredRef.current[beatIndex] = result

    countsRef.current = {
      ...countsRef.current,
      [result]: (countsRef.current[result] || 0) + 1,
    }
    levelCountsRef.current = {
      ...levelCountsRef.current,
      [result]: (levelCountsRef.current[result] || 0) + 1,
    }
    setCounts(countsRef.current)
    setLevelCounts(levelCountsRef.current)
    setLastResult({ result, beatIndex, at: Date.now() })
    setCoach(feedbackKey(result))
    emitTamiResult(result, beatIndex, meta)

    if (result === 'perfect' || result === 'good') {
      const nextStreak = streakRef.current + 1
      streakRef.current = nextStreak
      maxStreakRef.current = Math.max(maxStreakRef.current, nextStreak)
      setStreak(nextStreak)
      setMaxStreak(maxStreakRef.current)
      setOnFire(nextStreak >= 4 && countsRef.current.perfect >= 4)
      setFlash(result === 'perfect' ? 'correct' : 'good')
    } else {
      streakRef.current = 0
      setStreak(0)
      setOnFire(false)
      setFlash(result === 'restMistake' ? 'rest' : 'miss')
      if (result === 'miss' || result === 'restMistake') {
        setLives(prev => {
          const next = Math.max(0, prev - 1)
          livesRef.current = next
          return next
        })
      }
    }

    window.setTimeout(() => setFlash(null), 220)
  }, [emitTamiResult, setCoach])

  const writeAssignmentResult = useCallback((snapshot) => {
    if (!assignmentId || !snapshot) return
    try {
      sessionStorage.setItem(`${assignmentId}_result`, JSON.stringify({
        gateId: assignmentId,
        concept,
        completedAt: new Date().toISOString(),
        executionScore: snapshot.accuracy,
        ownershipPassed: snapshot.accuracy >= 80,
        level: Number(snapshot.level),
        stagesCompleted: snapshot.stagesCompleted,
        livesRemaining: snapshot.lives,
      }))
    } catch (err) {
      console.warn('[RhythmRacer] Session result writeback failed:', err)
    }
  }, [assignmentId, concept])

  const showLevelComplete = useCallback((stagesCompleted) => {
    const finalCounts = { ...levelCountsRef.current }
    const finalAccuracy = getAccuracyFromCounts(finalCounts)
    const snapshot = {
      passed: finalAccuracy >= 80,
      accuracy: finalAccuracy,
      score: finalCounts.perfect * 200 + finalCounts.good * 100 + finalCounts.early * 25 + finalCounts.late * 25,
      counts: finalCounts,
      level,
      levelName: levelConfig.name,
      stagesCompleted,
      lives: livesRef.current,
      maxStreak: maxStreakRef.current,
    }
    setCompletion(snapshot)
    setPhase('complete')
    setAttemptStart(null)
    attemptStartRef.current = null
    setCoachLine(snapshot.passed
      ? `Level ${level} is locked in. ${finalAccuracy}% accuracy — that's real rhythm control.`
      : `You're close. ${finalAccuracy}% accuracy means this level needs one more focused run.`)
    writeAssignmentResult(snapshot)
  }, [level, levelConfig.name, writeAssignmentResult])

  const resetLevelRun = useCallback((targetLevel) => {
    clearTimers()
    const nextLevel = clamp(targetLevel, 1, 4)
    setLevel(nextLevel)
    setCorrectStages(0)
    setFailedStages(0)
    setStageAttempt(1)
    setLives(3)
    livesRef.current = 3
    setCounts(emptyCounts())
    countsRef.current = emptyCounts()
    setLevelCounts(emptyCounts())
    levelCountsRef.current = emptyCounts()
    setStreak(0)
    streakRef.current = 0
    setMaxStreak(0)
    maxStreakRef.current = 0
    setOnFire(false)
    setLastResult(null)
    setCompletion(null)
    setPhase('ready')
    setCoachLine(getCoaching('PRE_GAME', ageGroup, getLevel(nextLevel).key))
  }, [ageGroup, clearTimers])

  const targetTimeForBeat = useCallback((beatIndex) => {
    if (attemptStartRef.current == null) return null
    return attemptStartRef.current + beatIndex * RHYTHM_BEAT_MS
  }, [])

  const evaluateTap = useCallback((inputTime) => {
    if (phaseRef.current !== 'playing') return
    const start = attemptStartRef.current
    if (start == null) return
    const relativeBeat = Math.floor((inputTime - start + RHYTHM_BEAT_MS / 2) / RHYTHM_BEAT_MS)
    const beatIndex = clamp(relativeBeat, 0, beatsRef.current.length - 1)
    const beat = beatsRef.current[beatIndex]
    if (!beat) return

    const targetTime = targetTimeForBeat(beatIndex)
    const offset = inputTime - targetTime

    if (beat.kind === 'rest') {
      if (Math.abs(offset) <= LATE_EARLY_MS) {
        recordResult('restMistake', beatIndex, { offsetMs: offset, noteType: 'rest' })
        return
      }
    }

    if (beat.kind !== 'tap') {
      recordResult('miss', beatIndex, { offsetMs: offset, noteType: beat.kind || 'unknown' })
      return
    }

    recordResult(classifyOffset(offset), beatIndex, { offsetMs: offset, noteType: 'tap' })
  }, [recordResult, targetTimeForBeat])

  const handlePad = useCallback((source = 'mouse') => {
    if (source === 'touch') touchRef.current = Date.now()
    if (source === 'mouse' && Date.now() - touchRef.current < 500) return

    setPadActive(true)
    window.setTimeout(() => setPadActive(false), 140)
    evaluateTap(performance.now())
  }, [evaluateTap])

  const finishAttempt = useCallback(() => {
    if (phaseRef.current !== 'playing') return

    beatsRef.current.forEach((beat, index) => {
      if (beat.kind === 'tap' && !scoredRef.current[index]) {
        recordResult('miss', index, { offsetMs: null, noteType: 'tap' })
      }
    })

    const latestCounts = countsRef.current
    const misses = latestCounts.miss + latestCounts.restMistake
    const close = latestCounts.perfect + latestCounts.good
    const judged = Object.values(latestCounts).reduce((sum, val) => sum + val, 0)
    const pct = judged ? Math.round((close / judged) * 100) : 0
    const passed = misses === 0 && pct >= 75

    setPhase('review')
    setAttemptStart(null)
    attemptStartRef.current = null

    if (livesRef.current <= 0) {
      setCoach('MISS')
      showLevelComplete(correctStages)
      return
    }

    if (passed) {
      const nextCorrect = correctStages + 1
      setCorrectStages(nextCorrect)
      setStageAttempt(1)
      setCoach(nextCorrect >= 5 ? 'LEVEL_CLEAR' : 'STAGE_CLEAR')
      if (nextCorrect >= 5) {
        showLevelComplete(nextCorrect)
      }
      return
    }

    if (stageAttempt < 3) {
      setStageAttempt(prev => prev + 1)
      setCoach('MISS')
      return
    }

    const nextFailed = failedStages + 1
    setFailedStages(nextFailed)
    setStageAttempt(1)
    setCoach('MISS')

    if (nextFailed >= 2) {
      showLevelComplete(correctStages)
    }
  }, [correctStages, failedStages, recordResult, setCoach, showLevelComplete, stageAttempt])

  const tickGameplay = useCallback(() => {
    const now = performance.now()
    setNowMs(now)

    if (phaseRef.current === 'playing') {
      beatsRef.current.forEach((beat, index) => {
        const target = targetTimeForBeat(index)
        if (target == null) return
        if (beat.kind === 'tap' && !scoredRef.current[index] && now > target + LATE_EARLY_MS) {
          recordResult('miss', index, { offsetMs: now - target, noteType: 'tap' })
        }
      })

      if (metronomeOn && attemptStartRef.current != null) {
        const metroBeat = Math.floor((now - attemptStartRef.current) / RHYTHM_BEAT_MS)
        if (metroBeat >= 0 && metroBeat < RHYTHM_BEATS_PER_ATTEMPT && metroBeat !== lastMetroBeatRef.current) {
          lastMetroBeatRef.current = metroBeat
          playMetronomeClick()
        }
      }

      const endTime = attemptStartRef.current + RHYTHM_BEATS_PER_ATTEMPT * RHYTHM_BEAT_MS + 350
      if (now >= endTime) {
        finishAttempt()
        return
      }
    }

    rafRef.current = requestAnimationFrame(tickGameplay)
  }, [finishAttempt, metronomeOn, playMetronomeClick, recordResult, targetTimeForBeat])

  const beginAttempt = useCallback(() => {
    clearTimers()
    scoredRef.current = {}
    countsRef.current = emptyCounts()
    setCounts(countsRef.current)
    setLastResult(null)
    setOnFire(false)
    setStreak(0)
    streakRef.current = 0
    setCountBeat(1)
    setPhase('count-in')
    lastMetroBeatRef.current = -1
    setCoachLine(getCoaching('PRE_GAME', ageGroup, levelConfig.key))

    for (let i = 1; i <= 4; i += 1) {
      timersRef.current.push(window.setTimeout(() => {
        setCountBeat(i)
        playMetronomeClick()
      }, (i - 1) * RHYTHM_BEAT_MS))
    }

    timersRef.current.push(window.setTimeout(() => {
      const start = performance.now()
      attemptStartRef.current = start
      setAttemptStart(start)
      setNowMs(start)
      setPhase('playing')
      rafRef.current = requestAnimationFrame(tickGameplay)
    }, RHYTHM_BEAT_MS * 4))
  }, [ageGroup, clearTimers, levelConfig.key, playMetronomeClick, tickGameplay])

  const writePracticeSession = useCallback(async () => {
    if (written) return
    setWritten(true)
    setWriteStatus('writing')
    const endedAt = Date.now()
    const durationSeconds = Math.round((endedAt - sessionStartRef.current) / 1000)
    const durationMin = Math.round(durationSeconds / 60)
    const body = {
      student_id: user?.airtableId || user?.airtable_id || user?.student_id || user?.id || null,
      duration_min: durationMin,
      activity_type: 'rhythm_racer',
      piece_name: `Rhythm Racer L${level} - ${levelConfig.name}`,
      self_rating: getSelfRating(accuracy),
      source: 'RhythmRacer',
    }

    try {
      const token = localStorage.getItem('som_token')
      await fetch(PRACTICE_LOG_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      setWriteStatus('saved')
    } catch (err) {
      console.warn('[RhythmRacer] Practice log write failed:', err)
      setWriteStatus('failed')
    }
  }, [accuracy, level, levelConfig.name, user, written])

  const endSession = useCallback(async () => {
    clearTimers()
    setPhase('done')
    await writePracticeSession()
    navigate('/session-summary')
  }, [clearTimers, navigate, writePracticeSession])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault()
        handlePad('key')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePad])

  const goBack = () => {
    if (fromParam) navigate(fromParam)
    else navigate('/student')
  }

  const goDashboard = () => {
    if (completion) writeAssignmentResult(completion)
    navigate('/student')
  }

  const switchMode = (nextMode) => {
    const next = new URLSearchParams(searchParams)
    next.set('mode', nextMode)
    setSearchParams(next, { replace: true })
  }

  const toggleMetronome = () => {
    setMetronomeOn(prev => {
      const next = !prev
      if (next) playMetronomeClick()
      return next
    })
  }

  const markerStyle = (marker) => {
    const target = attemptStart == null ? null : attemptStart + marker.beatIndex * RHYTHM_BEAT_MS
    const current = phase === 'playing' && target != null ? nowMs : attemptStart || nowMs
    const msUntil = target == null ? marker.beatIndex * RHYTHM_BEAT_MS : target - current
    const x = CAR_X + (msUntil / (RHYTHM_BEAT_MS * TRAVEL_BEATS)) * 42
    return {
      left: `${clamp(x, -18, 112)}%`,
      width: marker.type === 'bar' ? 34 : 24,
      opacity: x < CAR_X - 3 ? 0.18 : 1,
    }
  }

  const activeBeat = attemptStart == null ? -1 : clamp(Math.floor((nowMs - attemptStart) / RHYTHM_BEAT_MS), 0, RHYTHM_BEATS_PER_ATTEMPT - 1)
  const visibleBeat = phase === 'count-in' ? countBeat - 1 : phase === 'playing' ? activeBeat % RHYTHM_BEATS_PER_MEASURE : -1
  const padApproach = phase === 'playing' && markers.some(marker => {
    const target = attemptStart == null ? null : attemptStart + marker.beatIndex * RHYTHM_BEAT_MS
    if (target == null) return false
    const msUntil = target - nowMs
    return msUntil > 0 && msUntil < RHYTHM_BEAT_MS * 1.2
  })

  return (
    <div className="rr-page">
      <style>{`
        .rr-page{min-height:100vh;background:#0f172a;color:#f8fafc;font-family:inherit;overflow-x:hidden;display:flex;flex-direction:column}
        .rr-shell{width:min(100%,980px);margin:0 auto;padding:14px 14px 18px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;flex:1}
        .rr-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:10px 12px}
        .rr-nav-left{display:flex;align-items:center;gap:9px;min-width:0}
        .rr-user-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#d946ef);border:1px solid rgba(255,255,255,.18);box-shadow:0 0 18px rgba(124,58,237,.28)}
        .rr-mode-badge{border-radius:8px;padding:4px 8px;font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
        .rr-mode-badge.academic{background:rgba(217,70,239,.1);color:#d946ef;border:1px solid rgba(217,70,239,.22)}
        .rr-mode-badge.game{background:rgba(55,65,81,.2);color:#6b7280;border:1px solid rgba(107,114,128,.18)}
        .rr-back{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#cbd5e1;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
        .rr-title{text-align:center;min-width:0;display:flex;align-items:center;justify-content:center;gap:9px}
        .rr-title h1{font-size:18px;line-height:1;margin:0;color:#fff;font-weight:900;letter-spacing:0}
        .rr-level-pill{display:inline-flex;align-items:center;border-radius:999px;background:#f97316;color:#fff;padding:4px 9px;font-size:11px;font-weight:900;box-shadow:0 0 16px rgba(249,115,22,.28)}
        .rr-nav-right{display:flex;align-items:center;justify-content:flex-end;gap:9px}
        .rr-streak-circle{width:38px;height:38px;border-radius:50%;background:#111827;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900}
        .rr-progress-mini{min-width:90px}
        .rr-progress-label{font-size:10px;color:#94a3b8;font-weight:800;text-align:right;margin-bottom:4px}
        .rr-progress-track{height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden}
        .rr-progress-fill{height:100%;background:#14b8a6;border-radius:999px}
        .rr-end{background:#111827;border:1px solid rgba(20,184,166,0.25);border-radius:8px;color:#14b8a6;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer}
        .rr-academic-banner{border:1px solid rgba(217,70,239,.24);background:rgba(217,70,239,.1);color:#d946ef;border-radius:12px;padding:9px 12px;font-size:12px;font-weight:900;text-align:center}
        .rr-mode-toggle{display:flex;width:100%;max-width:330px;margin:0 auto;background:rgba(15,23,42,.74);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:4px;gap:4px}
        .rr-mode-toggle button{flex:1;border:none;border-radius:999px;background:transparent;color:#94a3b8;font-size:12px;font-weight:900;padding:8px 10px;cursor:pointer}
        .rr-mode-toggle button.academic.active{background:rgba(217,70,239,.12);box-shadow:inset 0 0 0 1px rgba(217,70,239,.5);color:#d946ef}
        .rr-mode-toggle button.game.active{background:rgba(55,65,81,.32);color:#e5e7eb}
        .rr-coach{display:flex;align-items:center;gap:10px;background:#0d1117;border:1px solid rgba(20,184,166,0.18);border-radius:12px;padding:10px 12px;min-height:58px}
        .rr-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(20,184,166,0.4);flex-shrink:0;background:#111827}
        .rr-coach-label{font-size:10px;color:#14b8a6;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
        .rr-coach-text{font-size:14px;color:#e5e7eb;font-weight:700;line-height:1.35}
        .rr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
        .rr-stat{background:rgba(15,23,42,.8);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 11px;min-width:0}
        .rr-stat span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.06em}
        .rr-stat strong{display:block;font-size:17px;color:#fff;margin-top:4px;line-height:1}
        .rr-metro{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .rr-metro-main{display:flex;align-items:center;gap:8px}
        .rr-metro-toggle{border:none;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;cursor:pointer;color:#fff}
        .rr-metro-toggle.on{background:#10b981}.rr-metro-toggle.off{background:#4b5563}
        .rr-pendulum{width:24px;height:28px;overflow:visible}
        .rr-pendulum.on .rr-pendulum-arm{transform-origin:12px 4px;animation:rrPendulum 0.857s ease-in-out infinite alternate}
        @keyframes rrPendulum{from{transform:rotate(-18deg)}to{transform:rotate(18deg)}}
        .rr-count{height:40px;display:flex;align-items:center;justify-content:center;gap:18px}
        .rr-count-num{font-size:15px;color:rgba(255,255,255,.35);font-weight:900;transition:all .15s}
        .rr-count-num.active{font-size:22px;color:#f59e0b;text-shadow:0 0 18px rgba(245,158,11,.6)}
        .rr-track{position:relative;height:262px;background:rgba(15,23,42,.8);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;padding:14px 18px}
        .rr-beat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 88px 18px 82px}
        .rr-beat-num{text-align:center;font-size:16px;color:rgba(255,255,255,.4);font-weight:900;transition:all .12s}
        .rr-beat-num.active{font-size:24px;color:#f59e0b;text-shadow:0 0 16px rgba(245,158,11,.5)}
        .rr-beat-num.passed{color:rgba(255,255,255,.2)}
        .rr-staff{position:absolute;left:72px;right:28px;top:92px;height:98px}
        .rr-staff-line{position:absolute;left:0;right:0;height:1px;background:rgba(255,255,255,.15)}
        .rr-staff-line:nth-child(1){top:0}.rr-staff-line:nth-child(2){top:24px}.rr-staff-line:nth-child(3){top:48px}.rr-staff-line:nth-child(4){top:72px}.rr-staff-line:nth-child(5){top:96px}
        .rr-clef{position:absolute;left:18px;top:79px;font-family:Georgia,serif;font-size:58px;line-height:1;color:#fff}
        .rr-timesig{position:absolute;left:54px;top:103px;font-family:Georgia,serif;font-weight:900;font-size:24px;line-height:.75;color:#fff;text-align:center}
        .rr-barline{position:absolute;top:92px;height:98px;width:1px;background:rgba(255,255,255,.22)}
        .rr-target{position:absolute;left:80%;top:50%;transform:translate(-50%,-50%);font-size:30px;line-height:1;pointer-events:none;z-index:2;transition:filter .12s}
        .rr-target.pulse{animation:rrTargetPulse 0.857s ease-in-out infinite}
        @keyframes rrTargetPulse{0%,100%{filter:drop-shadow(0 0 2px rgba(234,179,8,0))}50%{filter:drop-shadow(0 0 12px rgba(234,179,8,.85))}}
        @keyframes rrScroll{from{transform:translateX(0)}to{transform:translateX(-48px)}}
        .rr-marker{position:absolute;top:143px;transform:translate(-50%,-50%);transition:left .035s linear;opacity:1}
        .rr-marker.past{opacity:.22}
        .rr-note-open{width:26px;height:17px;border:3px solid #fff;border-radius:50%;transform:rotate(-18deg);background:transparent;position:relative}
        .rr-note-open:after{content:'';position:absolute;right:-5px;bottom:8px;width:2px;height:52px;background:#fff;transform:rotate(18deg);transform-origin:bottom}
        .rr-note-filled{width:18px;height:18px;border-radius:50%;background:#fff;position:relative;box-shadow:0 0 14px rgba(255,255,255,.3)}
        .rr-note-filled:after{content:'';position:absolute;right:-4px;bottom:8px;width:2px;height:50px;background:#fff}
        .rr-rest-symbol{font-family:Georgia,serif;font-size:38px;color:rgba(239,68,68,.7);font-weight:900;line-height:1;text-shadow:0 0 14px rgba(239,68,68,.25)}
        .rr-pattern{display:grid;grid-template-columns:92px 1fr auto;align-items:center;gap:12px;background:rgba(15,23,42,.8);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px 12px}
        .rr-level-badge{background:#2563eb;border-radius:999px;padding:8px 10px;text-align:center;color:#fff;font-weight:900}
        .rr-level-badge span{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
        .rr-pattern-main{font-size:14px;color:#fff;font-weight:900}
        .rr-pattern-sub{font-size:11px;color:#64748b;font-weight:700}
        .rr-result{font-size:12px;font-weight:900;color:#22d3ee;text-transform:uppercase;min-height:18px;text-align:right}
        .rr-pad{margin-top:auto;width:100%;min-height:104px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.8);cursor:pointer;touch-action:none;transition:transform .1s,border-color .1s,box-shadow .1s;display:flex;align-items:center;justify-content:center;user-select:none}
        .rr-pad svg{width:min(100%,420px);height:96px;overflow:visible}
        .rr-pad.active{transform:scale(.98);border-color:#14b8a6;box-shadow:0 0 28px rgba(20,184,166,.32)}
        .rr-pad.approach{box-shadow:0 0 34px rgba(20,184,166,.2)}
        .rr-drum-shell{fill:#c4b5a0;stroke:#374151;stroke-width:8}
        .rr-drum-center{fill:#776957}
        .rr-drum-lug{fill:#1f2937}
        .rr-actions{display:flex;gap:8px}
        .rr-primary{border:none;border-radius:999px;padding:13px 18px;background:#ef4444;color:#fff;font-size:14px;font-weight:900;cursor:pointer;min-width:132px}
        .rr-secondary{flex:1;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:13px 16px;background:#111827;color:#cbd5e1;font-size:14px;font-weight:900;cursor:pointer}
        .rr-complete{position:relative;background:linear-gradient(135deg,#111827,#0d1117);border:1px solid rgba(20,184,166,.22);border-radius:18px;padding:22px 18px;overflow:hidden;text-align:center}
        .rr-complete.pass{border-color:rgba(34,211,238,.4);box-shadow:0 0 42px rgba(34,211,238,.12)}
        .rr-complete.fail{border-color:rgba(245,158,11,.28)}
        .rr-complete-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#14b8a6;font-weight:900;margin-bottom:8px}
        .rr-complete h2{font-size:26px;line-height:1.05;margin:0;color:#fff;font-weight:900;letter-spacing:0}
        .rr-complete-msg{max-width:560px;margin:10px auto 18px;color:#cbd5e1;font-size:14px;font-weight:700;line-height:1.5}
        .rr-complete-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 auto 16px;max-width:720px}
        .rr-complete-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 8px}
        .rr-complete-stat strong{display:block;font-size:20px;color:#fff;line-height:1}
        .rr-complete-stat span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:900;margin-top:6px}
        .rr-complete-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}
        .rr-complete-actions button{min-width:150px;border-radius:12px;padding:12px 15px;font-size:13px;font-weight:900;cursor:pointer}
        .rr-next{border:none;background:#22d3ee;color:#06232a}
        .rr-again{border:none;background:#14b8a6;color:#001f1b}
        .rr-dashboard{border:1px solid rgba(255,255,255,.1);background:#111827;color:#cbd5e1}
        .rr-confetti-piece{position:fixed;top:-14px;border-radius:3px;animation:rrConfettiFall linear forwards;pointer-events:none;z-index:50}
        @keyframes rrConfettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        @media (max-width:520px){
          .rr-shell{padding:10px 10px 14px;gap:10px}
          .rr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
          .rr-complete-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .rr-complete h2{font-size:22px}
          .rr-track{height:210px}
          .rr-title h1{font-size:16px}
          .rr-back,.rr-end{padding:7px 9px;font-size:11px}
          .rr-coach-text{font-size:13px}
          .rr-pad{min-height:82px}
          .rr-actions{flex-direction:column}
        }
      `}</style>

      <div className="rr-shell">
        <header className="rr-top">
          <div className="rr-nav-left">
            <div className="rr-user-avatar" />
            <div className={`rr-mode-badge ${isAcademic ? 'academic' : 'game'}`}>
              {isAcademic ? `Academic · ${conceptName}` : 'Game Mode'}
            </div>
          </div>
          <div className="rr-title">
            <h1>Rhythm Racer</h1>
            <div className="rr-level-pill">Lv {level}</div>
          </div>
          <div className="rr-nav-right">
            <button className="rr-back" onClick={goBack}>Back</button>
            <div className="rr-streak-circle">{streak}</div>
            <div className="rr-progress-mini">
              <div className="rr-progress-label">{correctStages}/5</div>
              <div className="rr-progress-track"><div className="rr-progress-fill" style={{ width: `${Math.min(100, (correctStages / 5) * 100)}%` }} /></div>
            </div>
            <button className="rr-end" onClick={endSession} disabled={writeStatus === 'writing'}>
              {writeStatus === 'writing' ? 'Saving' : 'Done'}
            </button>
          </div>
        </header>

        <section className="rr-stats">
          <div className="rr-stat"><span>Lives</span><strong>{'♥'.repeat(lives)}{lives === 0 ? '0' : ''}</strong></div>
          <div className="rr-stat">
            <div className="rr-metro">
              <div className="rr-metro-main">
                <svg className={`rr-pendulum${metronomeOn ? ' on' : ''}`} viewBox="0 0 24 28" aria-hidden="true">
                  <line className="rr-pendulum-arm" x1="12" y1="4" x2="12" y2="22" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="23" r="3" fill="#10b981" />
                </svg>
                <div><span>Tempo</span><strong>70</strong></div>
              </div>
              <button className={`rr-metro-toggle ${metronomeOn ? 'on' : 'off'}`} onClick={toggleMetronome}>{metronomeOn ? 'ON' : 'OFF'}</button>
            </div>
          </div>
          <div className="rr-stat"><span>Streak</span><strong>{streak}</strong></div>
          <div className="rr-stat"><span>Accuracy</span><strong>{levelAccuracy}%</strong></div>
        </section>

        {isAcademic && <div className="rr-academic-banner">Academic Mode — assigned by teacher</div>}

        {isAcademic && (
          <section className="rr-coach">
            <img className="rr-avatar" src="/avatars/motesart_avatar_1.png" alt="Motesart" />
            <div>
              <div className="rr-coach-label">Motesart</div>
              <div className="rr-coach-text">{coachLine}</div>
            </div>
          </section>
        )}

        <div className="rr-mode-toggle" aria-label="Rhythm Racer mode">
          <button className={`academic${isAcademic ? ' active' : ''}`} onClick={() => switchMode('academic')}>Academic</button>
          <button className={`game${!isAcademic ? ' active' : ''}`} onClick={() => switchMode('game')}>Game</button>
        </div>

        {completion ? (
          <section className={`rr-complete ${completion.passed ? 'pass' : 'fail'}`}>
            {completion.passed && <Confetti />}
            <div className="rr-complete-kicker">Rhythm Racer Level {completion.level}</div>
            <h2>{completion.passed ? 'Level Complete!' : 'Keep Practicing'}</h2>
            <div className="rr-complete-msg">
              {completion.passed
                ? `Motesart says: ${completion.levelName} is locked in. You finished with ${completion.accuracy}% accuracy.`
                : `Motesart says: ${completion.levelName} needs one more run. Aim for 80% accuracy before moving on.`}
            </div>
            <div className="rr-complete-grid">
              {[
                [completion.score, 'Score'],
                [completion.accuracy + '%', 'Accuracy'],
                [completion.maxStreak, 'Best streak'],
                [completion.lives, 'Lives left'],
                [completion.stagesCompleted + '/5', 'Stages'],
                [completion.counts.perfect, 'Perfect'],
                [completion.counts.good, 'Good'],
                [completion.counts.miss, 'Miss'],
                [completion.counts.restMistake, 'Rest mistakes'],
              ].map(([value, label]) => (
                <div key={label} className="rr-complete-stat">
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="rr-complete-actions">
              {completion.passed && completion.level < 4 && (
                <button className="rr-next" onClick={() => resetLevelRun(completion.level + 1)}>Next Level</button>
              )}
              <button className="rr-again" onClick={() => resetLevelRun(completion.level)}>Practice Again</button>
              <button className="rr-dashboard" onClick={goDashboard}>Back to Dashboard</button>
            </div>
          </section>
        ) : (
          <>
        <section className="rr-track" aria-label="Rhythm track">
          <div className="rr-beat-row" aria-label="Beat numbers">
            {[1, 2, 3, 4].map((num, index) => {
              const active = visibleBeat === index
              const passed = visibleBeat > index
              return <span key={num} className={`rr-beat-num${active ? ' active' : ''}${passed ? ' passed' : ''}`}>{num}</span>
            })}
          </div>
          <div className="rr-clef">𝄞</div>
          <div className="rr-timesig"><div>4</div><div>4</div></div>
          <div className="rr-staff">
            <div className="rr-staff-line" />
            <div className="rr-staff-line" />
            <div className="rr-staff-line" />
            <div className="rr-staff-line" />
            <div className="rr-staff-line" />
          </div>
          {[20, 40, 60, 80].map(pos => <div key={pos} className="rr-barline" style={{ left: `${pos}%` }} />)}
          <div className={`rr-target${carPulse ? ' pulse' : ''}`}>🏎️</div>
          {phase === 'playing' && markers.map(marker => (
            <div
              key={marker.id}
              className={`rr-marker ${marker.type}`}
              style={markerStyle(marker)}
            >
              {marker.type === 'rest'
                ? <div className="rr-rest-symbol">𝄽</div>
                : marker.type === 'circle'
                  ? <div className="rr-note-filled" />
                  : <div className="rr-note-open" />}
            </div>
          ))}
        </section>

        <section className="rr-pattern">
          <div className="rr-level-badge">
            {level}
            <span>Level</span>
          </div>
          <div>
            <div className="rr-pattern-main">L{level} - {levelConfig.name}</div>
            <div className="rr-pattern-sub">{levelConfig.displayPattern} - stage {correctStages + 1}/5 - attempt {stageAttempt}/3</div>
          </div>
          <button className="rr-primary" onClick={beginAttempt} disabled={phase === 'count-in' || phase === 'playing' || lives <= 0}>
            {phase === 'review' ? '▶ Next' : lives <= 0 ? 'No lives' : '▶ Play'}
          </button>
        </section>

        <div className="rr-actions">
          <div className="rr-result">{lastResult ? lastResult.result.replace(/([A-Z])/g, ' $1') : phase === 'count-in' ? 'Count in' : ''}</div>
          <button className="rr-secondary" onClick={() => resetLevelRun(requestedLevel)}>
            Reset
          </button>
        </div>

        <div
          className={`rr-pad${padActive ? ' active' : ''}${padApproach ? ' approach' : ''}`}
          onMouseDown={() => handlePad('mouse')}
          onTouchStart={(event) => {
            event.preventDefault()
            handlePad('touch')
          }}
          role="button"
          tabIndex={0}
          aria-label="Tap here"
        >
          <svg viewBox="0 0 420 104" aria-hidden="true">
            <ellipse className="rr-drum-shell" cx="210" cy="52" rx="148" ry="38" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const x = 210 + Math.cos(rad) * 132
              const y = 52 + Math.sin(rad) * 31
              return <circle key={angle} className="rr-drum-lug" cx={x} cy={y} r="5" />
            })}
            <circle className="rr-drum-center" cx="210" cy="52" r="5" />
            <text x="210" y="57" textAnchor="middle" fill="#1f2937" fontSize="14" fontWeight="900">Tap here</text>
          </svg>
        </div>

        {isAcademic && assignmentId && <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', minHeight: 16 }}>
          {assignmentId ? `Assignment tracking ready - ${formatSeconds(sessionSeconds)}` : `Free practice - ${formatSeconds(sessionSeconds)}`}
          {writeStatus === 'failed' ? ' - practice log save failed' : ''}
        </div>}
          </>
        )}
      </div>
    </div>
  )
}
