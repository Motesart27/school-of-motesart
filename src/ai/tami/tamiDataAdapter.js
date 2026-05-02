import { normalizeTamiSignals } from './tamiSignalIntakeEngine.js'

function field(record, key, fallback = undefined) {
  if (!record) return fallback
  const fields = record.fields || record
  return fields[key] ?? record[key] ?? fallback
}

function numberField(record, key, fallback) {
  const value = Number(field(record, key, fallback))
  return Number.isFinite(value) ? value : fallback
}

function normalizeLogs(snapshot) {
  if (!snapshot) return []
  if (Array.isArray(snapshot)) return snapshot
  if (Array.isArray(snapshot.records)) return snapshot.records
  if (Array.isArray(snapshot.logs)) return snapshot.logs
  if (Array.isArray(snapshot.sessions)) return snapshot.sessions
  return []
}

function logValue(log, keys, fallback = 0) {
  const source = log?.fields || log || {}
  for (const key of keys) {
    if (source[key] !== undefined) return source[key]
  }
  return fallback
}

export function derivePracticeSignals(practiceLogSnapshot) {
  const recentLogs = normalizeLogs(practiceLogSnapshot).slice(-5)
  let errorCount = 0
  let replayCount = 0
  let hintCount = 0
  let currentCorrect = 0
  let longestCorrect = 0

  recentLogs.forEach(log => {
    const outcome = String(logValue(log, ['outcome', 'result', 'status', 'event_type', 'type'], '')).toLowerCase()
    const explicitErrors = Number(logValue(log, ['errorCount', 'error_count', 'wrong_count', 'errors'], 0))
    const explicitHints = Number(logValue(log, ['hintCount', 'hint_count', 'hints_used', 'hints'], 0))
    const explicitReplays = Number(logValue(log, ['replayCount', 'replay_count', 'replays_used', 'replays'], 0))

    if (Number.isFinite(explicitErrors) && explicitErrors > 0) errorCount += explicitErrors
    else if (outcome === 'wrong' || outcome === 'incorrect') errorCount += 1

    if (Number.isFinite(explicitHints) && explicitHints > 0) hintCount += explicitHints
    else if (outcome === 'hint') hintCount += 1

    if (Number.isFinite(explicitReplays) && explicitReplays > 0) replayCount += explicitReplays
    else if (outcome === 'replay') replayCount += 1

    if (outcome === 'correct' || outcome === 'perfect') {
      currentCorrect += 1
      longestCorrect = Math.max(longestCorrect, currentCorrect)
    } else if (outcome === 'wrong' || outcome === 'incorrect') {
      currentCorrect = 0
    }
  })

  return {
    errorCount,
    streakLength: longestCorrect,
    replayCount,
    hintCount
  }
}

function safeNominalContext() {
  return normalizeTamiSignals({
    userMessage: 'status',
    role: 'teacher',
    dpmSignals: { drive: 50, passion: 50, motivation: 50, overall: 50 },
    wylSignals: { visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25 },
    hintCount: 0,
    errorCount: 0,
    streakLength: 0,
    confusionSignalCount: 0,
    stateSnapshot: {
      performance: {
        totalCorrect: 0,
        totalWrong: 0,
        totalAttempts: 0,
        correctStreak: 0,
        wrongStreak: 0,
        strugglingConcepts: []
      }
    }
  })
}

export function buildSignalContextFromStudentRecord(studentRecord, practiceLogSnapshot = null, sessionSnapshot = null) {
  try {
    if (field(studentRecord, 'Role', '') !== 'Student') return null

    const practiceSignals = derivePracticeSignals(practiceLogSnapshot)
    const name = String(field(studentRecord, 'Student / User Name', 'Unknown') || 'Unknown')
    const email = String(field(studentRecord, 'User Email', '') || '')
    const currentConcept = String(field(studentRecord, 'current_concept', 'unknown') || 'unknown')
    const currentPhase = String(field(studentRecord, 'current_phase', 'unknown') || 'unknown')
    const totalCorrect = Number(field(studentRecord, 'total_correct', practiceSignals.streakLength)) || practiceSignals.streakLength
    const totalWrong = practiceSignals.errorCount
    const totalAttempts = totalCorrect + totalWrong

    return normalizeTamiSignals({
      userMessage: 'what needs attention?',
      role: 'teacher',
      routeContext: { pathname: '/dashboard', component: 'TamiDataAdapter' },
      lessonContext: {
        inLesson: false,
        currentConcept,
        currentPhase
      },
      wylSignals: {
        visual: numberField(studentRecord, 'wyl_visual', 25),
        auditory: numberField(studentRecord, 'wyl_auditory', 25),
        readwrite: numberField(studentRecord, 'wyl_readwrite', 25),
        kinesthetic: numberField(studentRecord, 'wyl_kinesthetic', 25)
      },
      dpmSignals: {
        drive: numberField(studentRecord, 'dpm_drive', 50),
        passion: numberField(studentRecord, 'dpm_passion', 50),
        motivation: numberField(studentRecord, 'dpm_motivation', 50),
        overall: numberField(studentRecord, 'dpm_overall', 50)
      },
      hintCount: practiceSignals.hintCount,
      errorCount: practiceSignals.errorCount,
      streakLength: practiceSignals.streakLength,
      confusionSignalCount: practiceSignals.hintCount,
      stateSnapshot: {
        student: { name, email },
        sessionSnapshot,
        performance: {
          totalCorrect,
          totalWrong,
          totalAttempts,
          correctStreak: practiceSignals.streakLength,
          wrongStreak: practiceSignals.errorCount,
          strugglingConcepts: practiceSignals.errorCount > 0 ? [currentConcept] : []
        }
      }
    })
  } catch (err) {
    console.warn('[TAMI Data Adapter] Failed to build signal context:', err)
    return safeNominalContext()
  }
}
