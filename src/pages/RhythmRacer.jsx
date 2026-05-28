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
const CAR_X = 86
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
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const requestedLevel = clamp(Number(searchParams.get('level') || 1) || 1, 1, 4)
  const assignmentId = searchParams.get('assignment_id') || null
  const fromParam = searchParams.get('from')
  const ageGroup = normalizeAgeGroup(user?.age_group || user?.ageGroup)

  const [level, setLevel] = useState(requestedLevel)
  const levelConfig = useMemo(() => getLevel(level), [level])
  const concept = searchParams.get('concept') || levelConfig.concept
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
  const [written, setWritten] = useState(false)
  const [writeStatus, setWriteStatus] = useState('idle')

  const sessionStartRef = useRef(Date.now())
  const rafRef = useRef(null)
  const timersRef = useRef([])
  const touchRef = useRef(0)
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

  const setCoach = useCallback((eventKey) => {
    setCoachLine(getCoaching(eventKey, ageGroup, levelConfig.key))
  }, [ageGroup, levelConfig.key])

  const recordResult = useCallback((result, beatIndex) => {
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
  }, [setCoach])

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
        recordResult('restMistake', beatIndex)
        return
      }
    }

    if (beat.kind !== 'tap') {
      recordResult('miss', beatIndex)
      return
    }

    recordResult(classifyOffset(offset), beatIndex)
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
        recordResult('miss', index)
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
          recordResult('miss', index)
        }
      })

      const endTime = attemptStartRef.current + RHYTHM_BEATS_PER_ATTEMPT * RHYTHM_BEAT_MS + 350
      if (now >= endTime) {
        finishAttempt()
        return
      }
    }

    rafRef.current = requestAnimationFrame(tickGameplay)
  }, [finishAttempt, recordResult, targetTimeForBeat])

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
    setCoachLine(getCoaching('PRE_GAME', ageGroup, levelConfig.key))

    for (let i = 1; i <= 4; i += 1) {
      timersRef.current.push(window.setTimeout(() => setCountBeat(i), (i - 1) * RHYTHM_BEAT_MS))
    }

    timersRef.current.push(window.setTimeout(() => {
      const start = performance.now()
      attemptStartRef.current = start
      setAttemptStart(start)
      setNowMs(start)
      setPhase('playing')
      rafRef.current = requestAnimationFrame(tickGameplay)
    }, RHYTHM_BEAT_MS * 4))
  }, [ageGroup, clearTimers, levelConfig.key, tickGameplay])

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

  const markerStyle = (marker) => {
    const target = attemptStart == null ? null : attemptStart + marker.beatIndex * RHYTHM_BEAT_MS
    const current = phase === 'playing' && target != null ? nowMs : attemptStart || nowMs
    const msUntil = target == null ? marker.beatIndex * RHYTHM_BEAT_MS : target - current
    const x = CAR_X + (msUntil / (RHYTHM_BEAT_MS * TRAVEL_BEATS)) * 42
    const widthPct = marker.type === 'bar' ? marker.span * 12 : 0
    return {
      left: `${clamp(x, -18, 112)}%`,
      width: marker.type === 'bar' ? `${widthPct}%` : 14,
    }
  }

  const activeBeat = attemptStart == null ? -1 : clamp(Math.floor((nowMs - attemptStart) / RHYTHM_BEAT_MS), 0, RHYTHM_BEATS_PER_ATTEMPT - 1)

  return (
    <div className="rr-page">
      <style>{`
        .rr-page{min-height:100vh;background:#0a0a0f;color:#f8fafc;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow-x:hidden;display:flex;flex-direction:column}
        .rr-shell{width:min(100%,980px);margin:0 auto;padding:14px 14px 18px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;flex:1}
        .rr-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .rr-back{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#cbd5e1;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
        .rr-title{text-align:center;min-width:0}
        .rr-title h1{font-size:18px;line-height:1;margin:0;color:#fff;font-weight:900;letter-spacing:0}
        .rr-title div{font-size:11px;color:#94a3b8;margin-top:5px;font-weight:700}
        .rr-end{background:#111827;border:1px solid rgba(20,184,166,0.25);border-radius:8px;color:#14b8a6;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer}
        .rr-coach{display:flex;align-items:center;gap:10px;background:#0d1117;border:1px solid rgba(20,184,166,0.18);border-radius:12px;padding:10px 12px;min-height:58px}
        .rr-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(20,184,166,0.4);flex-shrink:0;background:#111827}
        .rr-coach-label{font-size:10px;color:#14b8a6;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
        .rr-coach-text{font-size:14px;color:#e5e7eb;font-weight:700;line-height:1.35}
        .rr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
        .rr-stat{background:#0d1117;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:9px 10px;min-width:0}
        .rr-stat span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.06em}
        .rr-stat strong{display:block;font-size:17px;color:#fff;margin-top:4px;line-height:1}
        .rr-count{height:40px;display:flex;align-items:center;justify-content:center;gap:18px}
        .rr-count-num{font-size:15px;color:rgba(255,255,255,.35);font-weight:900;transition:all .15s}
        .rr-count-num.active{font-size:22px;color:#f59e0b;text-shadow:0 0 18px rgba(245,158,11,.6)}
        .rr-track{position:relative;height:230px;background:#0d1117;border:1px solid rgba(20,184,166,0.12);border-radius:14px;overflow:hidden}
        .rr-lane{position:absolute;left:14px;right:14px;height:1px;border-top:1px dashed rgba(20,184,166,0.4)}
        .rr-lane.l1{top:34%}.rr-lane.l2{top:50%}.rr-lane.l3{top:66%}
        .rr-roadline{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(20,184,166,.08) 0 14px,transparent 14px 48px);opacity:.5;animation:rrScroll 1.2s linear infinite}
        @keyframes rrScroll{from{transform:translateX(0)}to{transform:translateX(-48px)}}
        .rr-marker{position:absolute;top:50%;transform:translate(-50%,-50%);transition:left .035s linear}
        .rr-marker.bar{height:18px;background:#14b8a6;border-radius:999px;box-shadow:0 0 18px rgba(20,184,166,.45)}
        .rr-marker.circle{width:14px;height:14px;background:#14b8a6;border-radius:50%;box-shadow:0 0 16px rgba(20,184,166,.5)}
        .rr-marker.rest{width:24px;height:24px;border:2px dashed rgba(248,113,113,0.6);border-radius:50%;background:transparent;box-shadow:0 0 16px rgba(248,113,113,.16)}
        .rr-car{position:absolute;right:28px;top:50%;width:58px;height:42px;transform:translateY(-50%);border-radius:18px 10px 10px 18px;background:#14b8a6;box-shadow:0 0 0 8px rgba(20,184,166,.08),0 0 32px rgba(20,184,166,.3);transition:box-shadow .12s,transform .12s,background .12s}
        .rr-car:before{content:'';position:absolute;right:7px;top:9px;width:12px;height:24px;background:rgba(10,10,15,.45);border-radius:4px}
        .rr-car:after{content:'';position:absolute;left:7px;top:8px;width:18px;height:26px;border-radius:50%;background:rgba(255,255,255,.2)}
        .rr-car.pulse{animation:rrBeat .42s ease}
        .rr-car.correct{background:#22d3ee;box-shadow:0 0 0 12px rgba(34,211,238,.18),0 0 42px rgba(34,211,238,.7)}
        .rr-car.good{box-shadow:0 0 0 12px rgba(20,184,166,.16),0 0 36px rgba(20,184,166,.55)}
        .rr-car.miss{animation:rrShake .2s ease;background:#ef4444;box-shadow:0 0 0 10px rgba(239,68,68,.2),0 0 35px rgba(239,68,68,.6)}
        .rr-car.rest{background:#f59e0b;box-shadow:0 0 0 10px rgba(245,158,11,.18),0 0 35px rgba(245,158,11,.55)}
        .rr-car.fire{box-shadow:0 0 0 10px rgba(34,211,238,.16),0 0 54px rgba(34,211,238,.7)}
        .rr-trail{position:absolute;right:88px;top:50%;width:70px;height:22px;transform:translateY(-50%);background:linear-gradient(90deg,transparent,rgba(34,211,238,.5));filter:blur(8px);opacity:0;transition:opacity .15s}
        .rr-trail.on{opacity:1}
        @keyframes rrBeat{0%{box-shadow:0 0 0 4px rgba(20,184,166,.35),0 0 25px rgba(20,184,166,.5)}100%{box-shadow:0 0 0 14px rgba(20,184,166,0),0 0 32px rgba(20,184,166,.3)}}
        @keyframes rrShake{0%,100%{transform:translateY(-50%) translateX(0)}25%{transform:translateY(-50%) translateX(-8px)}75%{transform:translateY(-50%) translateX(8px)}}
        .rr-pattern{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#0d1117;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px 12px}
        .rr-pattern-main{font-size:14px;color:#fff;font-weight:900}
        .rr-pattern-sub{font-size:11px;color:#64748b;font-weight:700}
        .rr-result{font-size:12px;font-weight:900;color:#22d3ee;text-transform:uppercase;min-height:18px;text-align:right}
        .rr-pad{margin-top:auto;width:100%;min-height:86px;border-radius:16px;border:1.5px solid rgba(20,184,166,.25);background:rgba(13,17,23,.92);color:#e2e8f0;font-size:16px;font-weight:900;letter-spacing:.02em;cursor:pointer;touch-action:none;transition:transform .1s,border-color .1s,box-shadow .1s;display:flex;align-items:center;justify-content:center;user-select:none}
        .rr-pad.active{transform:scale(.96);border-color:#14b8a6;box-shadow:0 0 28px rgba(20,184,166,.32)}
        .rr-actions{display:flex;gap:8px}
        .rr-primary{flex:1;border:none;border-radius:12px;padding:13px 16px;background:#14b8a6;color:#001f1b;font-size:14px;font-weight:900;cursor:pointer}
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
          <button className="rr-back" onClick={goBack}>Back</button>
          <div className="rr-title">
            <h1>Rhythm Racer</h1>
            <div>Practice Pad Mode - 4/4 - 70 BPM</div>
          </div>
          <button className="rr-end" onClick={endSession} disabled={writeStatus === 'writing'}>
            {writeStatus === 'writing' ? 'Saving' : 'Done'}
          </button>
        </header>

        <section className="rr-coach">
          <img className="rr-avatar" src="/avatars/motesart_avatar_1.png" alt="Motesart" />
          <div>
            <div className="rr-coach-label">Motesart</div>
            <div className="rr-coach-text">{coachLine}</div>
          </div>
        </section>

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
        <section className="rr-stats">
          <div className="rr-stat"><span>Level</span><strong>{level}</strong></div>
          <div className="rr-stat"><span>Lives</span><strong>{lives}</strong></div>
          <div className="rr-stat"><span>Streak</span><strong>{streak}</strong></div>
          <div className="rr-stat"><span>Accuracy</span><strong>{levelAccuracy}%</strong></div>
        </section>

        <div className="rr-count" aria-label="Count-in">
          {[1, 2, 3, 4].map(num => {
            const active = phase === 'count-in' && countBeat === num
            const dim = phase === 'count-in' && countBeat > num
            return <span key={num} className={`rr-count-num${active ? ' active' : ''}`} style={dim ? { opacity: .35 } : null}>{num}</span>
          })}
        </div>

        <section className="rr-track" aria-label="Rhythm track">
          <div className="rr-roadline" />
          <div className="rr-lane l1" />
          <div className="rr-lane l2" />
          <div className="rr-lane l3" />
          {phase === 'playing' && markers.map(marker => (
            <div
              key={marker.id}
              className={`rr-marker ${marker.type}`}
              style={markerStyle(marker)}
            />
          ))}
          <div className={`rr-trail${onFire ? ' on' : ''}`} />
          <div className={`rr-car${carPulse ? ' pulse' : ''}${flash ? ` ${flash}` : ''}${onFire ? ' fire' : ''}`} />
        </section>

        <section className="rr-pattern">
          <div>
            <div className="rr-pattern-main">L{level} - {levelConfig.name}</div>
            <div className="rr-pattern-sub">{levelConfig.displayPattern} - stage {correctStages + 1}/5 - attempt {stageAttempt}/3</div>
          </div>
          <div className="rr-result">{lastResult ? lastResult.result.replace(/([A-Z])/g, ' $1') : phase === 'count-in' ? 'Count in' : ''}</div>
        </section>

        <div className="rr-actions">
          <button className="rr-primary" onClick={beginAttempt} disabled={phase === 'count-in' || phase === 'playing' || lives <= 0}>
            {phase === 'review' ? 'Next attempt' : lives <= 0 ? 'No lives left' : 'Start attempt'}
          </button>
          <button className="rr-secondary" onClick={() => resetLevelRun(requestedLevel)}>
            Reset
          </button>
        </div>

        <div
          className={`rr-pad${padActive ? ' active' : ''}`}
          onMouseDown={() => handlePad('mouse')}
          onTouchStart={(event) => {
            event.preventDefault()
            handlePad('touch')
          }}
          role="button"
          tabIndex={0}
          aria-label="Tap here"
        >
          Tap here
        </div>

        <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', minHeight: 16 }}>
          {assignmentId ? `Assignment tracking ready - ${formatSeconds(sessionSeconds)}` : `Free practice - ${formatSeconds(sessionSeconds)}`}
          {writeStatus === 'failed' ? ' - practice log save failed' : ''}
        </div>
          </>
        )}
      </div>
    </div>
  )
}
