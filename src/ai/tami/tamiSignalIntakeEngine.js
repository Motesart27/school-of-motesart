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
    hintCount: toNumber(hintCount, 0),
    errorCount: toNumber(errorCount, 0),
    wrongStreak: toNumber(stateSnapshot?.performance?.wrongStreak ?? input.wrongStreak, 0),
    strugglingCount: Array.isArray(stateSnapshot?.performance?.strugglingConcepts)
      ? stateSnapshot.performance.strugglingConcepts.length
      : toNumber(input.strugglingCount, 0),
    engagementTrend: memorySnapshot?.engagement?.trend || stateSnapshot?.engagement?.trend || 'engaged'
  }
}
