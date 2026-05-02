export const TAMI_CONTEXTS = {
  LESSON_MUSIC: 'lesson_music',
  SCHOOL_OPERATIONS: 'school_operations',
  STUDENT_SUPPORT: 'student_support',
  FAMILY_UPDATE: 'family_update',
  UNKNOWN: 'unknown'
}

function fallbackQuestionDetection(userMessage) {
  const text = String(userMessage || '')
  if (!text.trim()) return null
  if (!/^(what|who|where|when|why|how|can|could|would|should|is|are|do|does|did)\b/i.test(text) && !text.includes('?')) {
    return null
  }
  if (/half\s*step|whole\s*step|scale|piano|note|rhythm|key|chord|music/i.test(text)) {
    return { isQuestion: true, category: 'lesson_related', confidence: 0.7 }
  }
  return { isQuestion: true, category: 'off_topic', confidence: 0.55 }
}

const DPM_DEFAULT = { drive: 50, passion: 50, motivation: 50, overall: 50 }

export const TAMI_DERIVED_SCORE_KEYS = {
  MOTIVATION_RISK: 'motivationRiskScore',
  ERROR_RISK: 'errorRiskScore',
  HINT_LOAD: 'hintLoadScore',
  STRUGGLE_LOAD: 'struggleLoadScore',
  ENGAGEMENT_RISK: 'engagementRiskScore',
  INTERVENTION_RISK: 'interventionRiskScore',
  CONFUSION: 'confusionScore',
  MASTERY_RISK: 'masteryRiskScore'
}

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function clampPercent(value, fallback = 0) {
  return Math.max(0, Math.min(100, toNumber(value, fallback)))
}

function getDominantWyl(wyl = {}) {
  const scores = {
    visual: clampPercent(wyl.visual, 25),
    auditory: clampPercent(wyl.auditory, 25),
    readwrite: clampPercent(wyl.readwrite ?? wyl.reading_writing, 25),
    kinesthetic: clampPercent(wyl.kinesthetic, 25)
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

export function computeDpmSnapshot(dpm = {}, outcomeHistory = []) {
  const drive = clampPercent(dpm.drive, DPM_DEFAULT.drive)
  const passion = clampPercent(dpm.passion, DPM_DEFAULT.passion)
  let motivation = clampPercent(dpm.motivation, DPM_DEFAULT.motivation)

  if (Array.isArray(outcomeHistory) && outcomeHistory.length > 0) {
    const recent = outcomeHistory.slice(-5)
    const recentCorrect = recent.filter(o => o === 'correct' || o === 'perfect').length
    motivation = Math.round((recentCorrect / Math.max(recent.length, 1)) * 100)
  }

  return {
    drive,
    passion,
    motivation,
    overall: Math.round((drive + passion + motivation) / 3)
  }
}

export function computeDerivedScores({
  dpm,
  hintCount = 0,
  errorCount = 0,
  wrongStreak = 0,
  strugglingCount = 0,
  confusionSignalCount = 0,
  streakLength = 0,
  errorRate = null,
  engagementTrend = 'engaged'
} = {}) {
  const motivationRiskScore = clampPercent(100 - Math.min(dpm?.motivation ?? 50, dpm?.overall ?? 50), 50)
  const errorRiskScore = clampPercent(Math.max(errorCount * 20, wrongStreak * 35), 0)
  const hintLoadScore = clampPercent(hintCount * 35, 0)
  const struggleLoadScore = clampPercent(strugglingCount * 50, 0)
  const engagementRiskScore = engagementTrend === 'disengaging' ? 85 : engagementTrend === 'slowing' ? 55 : 0
  const interventionRiskScore = Math.round(
    (motivationRiskScore + errorRiskScore + hintLoadScore + struggleLoadScore + engagementRiskScore) / 5
  )
  const hasRawContractValues = Number.isFinite(Number(errorRate))
  const confusionScore = hasRawContractValues
    ? clampPercent((Number(errorRate) * 40) + (hintCount * 10) + (confusionSignalCount * 5), 0)
    : struggleLoadScore
  const masteryRiskScore = hasRawContractValues
    ? clampPercent((streakLength < 2 ? 30 : 0) + (Number(errorRate) > 0.4 ? 40 : 0) + (hintCount > 3 ? 20 : 0), 0)
    : interventionRiskScore

  return {
    [TAMI_DERIVED_SCORE_KEYS.MOTIVATION_RISK]: motivationRiskScore,
    [TAMI_DERIVED_SCORE_KEYS.ERROR_RISK]: errorRiskScore,
    [TAMI_DERIVED_SCORE_KEYS.HINT_LOAD]: hintLoadScore,
    [TAMI_DERIVED_SCORE_KEYS.STRUGGLE_LOAD]: struggleLoadScore,
    [TAMI_DERIVED_SCORE_KEYS.ENGAGEMENT_RISK]: engagementRiskScore,
    [TAMI_DERIVED_SCORE_KEYS.INTERVENTION_RISK]: interventionRiskScore,
    [TAMI_DERIVED_SCORE_KEYS.CONFUSION]: confusionScore,
    [TAMI_DERIVED_SCORE_KEYS.MASTERY_RISK]: masteryRiskScore
  }
}

export function normalizeTamiSignals(input = {}) {
  const {
    userMessage = '',
    role = 'student',
    routeContext = {},
    lessonContext = {},
    stateSnapshot = {},
    memorySnapshot = {},
    wylSignals = {},
    dpmSignals = {},
    outcomeHistory = [],
    hintCount = 0,
    errorCount = 0
  } = input

  const questionHandler = input.questionHandler || null
  const currentConcept = lessonContext.currentConcept || lessonContext.concept || null
  const currentPhase = lessonContext.currentPhase || lessonContext.phase || null
  const question = questionHandler?.detect
    ? questionHandler.detect(userMessage, {
        currentConcept,
        currentPhase,
        momentIndex: lessonContext.momentIndex || 0
      })
    : fallbackQuestionDetection(userMessage)
  const pathname = String(routeContext.pathname || '').toLowerCase()
  const component = String(routeContext.component || '').toLowerCase()
  const message = String(userMessage || '').toLowerCase()
  const inLesson = Boolean(lessonContext.inLesson || component.includes('wyl') || pathname.includes('lesson') || pathname.includes('practice'))
  const musicQuestion = Boolean(question && ['lesson_related', 'music_related', 'confusion'].includes(question.category))
  const operationalQuestion = /(who is struggling|what needs attention|homework|assignment|progress|child|student|intervention|blocked|admin|dashboard)/i.test(userMessage)
  const dpm = computeDpmSnapshot(dpmSignals, outcomeHistory)
  const wyl = {
    visual: clampPercent(wylSignals.visual, 25),
    auditory: clampPercent(wylSignals.auditory, 25),
    readwrite: clampPercent(wylSignals.readwrite ?? wylSignals.reading_writing, 25),
    kinesthetic: clampPercent(wylSignals.kinesthetic, 25),
    dominant: wylSignals.dominant || getDominantWyl(wylSignals)
  }

  let contextType = TAMI_CONTEXTS.UNKNOWN
  if (inLesson && musicQuestion && !operationalQuestion) contextType = TAMI_CONTEXTS.LESSON_MUSIC
  else if (role === 'parent' || /child|my child|how did/i.test(message)) contextType = TAMI_CONTEXTS.FAMILY_UPDATE
  else if (role === 'teacher' || role === 'admin' || operationalQuestion) contextType = TAMI_CONTEXTS.SCHOOL_OPERATIONS
  else if (inLesson) contextType = TAMI_CONTEXTS.STUDENT_SUPPORT
  const normalizedHintCount = toNumber(hintCount, 0)
  const normalizedErrorCount = toNumber(errorCount, 0)
  const normalizedWrongStreak = toNumber(stateSnapshot?.performance?.wrongStreak ?? input.wrongStreak, 0)
  const normalizedStrugglingCount = Array.isArray(stateSnapshot?.performance?.strugglingConcepts)
    ? stateSnapshot.performance.strugglingConcepts.length
    : toNumber(input.strugglingCount, 0)
  const engagementTrend = memorySnapshot?.engagement?.trend || stateSnapshot?.engagement?.trend || 'engaged'
  const totalCorrect = toNumber(stateSnapshot?.performance?.totalCorrect ?? input.totalCorrect, 0)
  const totalAttempts = toNumber(
    stateSnapshot?.performance?.totalAttempts ?? input.totalAttempts,
    totalCorrect + normalizedErrorCount
  )
  const errorRate = totalAttempts > 0 ? normalizedErrorCount / totalAttempts : null
  const streakLength = toNumber(stateSnapshot?.performance?.correctStreak ?? input.streakLength, 0)
  const confusionSignalCount = toNumber(memorySnapshot?.engagement?.confusionCount ?? input.confusionSignalCount, 0)
  const derivedScores = computeDerivedScores({
    dpm,
    hintCount: normalizedHintCount,
    errorCount: normalizedErrorCount,
    wrongStreak: normalizedWrongStreak,
    strugglingCount: normalizedStrugglingCount,
    confusionSignalCount,
    streakLength,
    errorRate,
    engagementTrend
  })

  return {
    userMessage,
    role,
    routeContext,
    lessonContext,
    stateSnapshot,
    memorySnapshot,
    question,
    contextType,
    inLesson,
    operationalQuestion,
    wyl,
    dpm,
    derivedScores,
    hintCount: normalizedHintCount,
    errorCount: normalizedErrorCount,
    wrongStreak: normalizedWrongStreak,
    strugglingCount: normalizedStrugglingCount,
    engagementTrend
  }
}
