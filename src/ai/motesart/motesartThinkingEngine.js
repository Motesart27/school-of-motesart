export const TEACHING_MODES = {
  EXPLAIN_PATTERN: 'EXPLAIN_PATTERN',
  ASK_DISCOVERY_QUESTION: 'ASK_DISCOVERY_QUESTION',
  GIVE_HINT: 'GIVE_HINT',
  SIMPLIFY: 'SIMPLIFY',
  QUIZ_FOR_OWNERSHIP: 'QUIZ_FOR_OWNERSHIP',
  CONNECT_TO_SOUND: 'CONNECT_TO_SOUND',
  CONNECT_TO_KEYS: 'CONNECT_TO_KEYS',
  CONNECT_TO_NUMBERS: 'CONNECT_TO_NUMBERS',
  CONNECT_TO_NOTATION: 'CONNECT_TO_NOTATION',
  CELEBRATE_PROGRESS: 'CELEBRATE_PROGRESS',
  REDIRECT_TO_TAMI: 'REDIRECT_TO_TAMI',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE'
}

const MUSIC_CONTEXT_TERMS = [
  'lesson',
  'concept',
  'practice',
  'curriculum',
  'piano',
  'theory',
  'rhythm',
  'ear-training',
  'ear training',
  'music-learning',
  'music learning'
]

const CONFUSION_TERMS = [
  "i don't get it",
  'i dont get it',
  "don't get it",
  'dont get it',
  'confused',
  'huh',
  'again',
  'not sure',
  "don't know",
  'dont know'
]

function isLessonContext(routeContext = {}, lessonContext = {}, conceptContext = {}) {
  const contextText = [
    routeContext.pathname,
    routeContext.component,
    lessonContext.lessonId,
    lessonContext.phase,
    conceptContext.concept,
    conceptContext.conceptId
  ].filter(Boolean).join(' ').toLowerCase()

  if (routeContext.component === 'WYLPracticeLive') return true
  return MUSIC_CONTEXT_TERMS.some(term => contextText.includes(term))
}

function hasConfusionCue(message) {
  if (!message) return false
  if (message === 'what' || message === 'what?' || message === 'huh' || message === 'huh?') return true
  return CONFUSION_TERMS.some(term => message.includes(term))
}

function selectSpeechText(conceptConfig, speechMode) {
  const speechTexts = conceptConfig?.speechTexts
  if (speechTexts?.[speechMode]) return speechTexts[speechMode]
  if (speechTexts?.teach) return speechTexts.teach
  return 'Let us stay with the pattern. Watch it once, then try it back.'
}

function reduceZpdLevel(currentLevel) {
  if (currentLevel === 'release') return 'guided'
  if (currentLevel === 'independent') return 'guided'
  return 'guided'
}

export function runMotesartThinkingEngine(input = {}) {
  const {
    userMessage = '',
    routeContext = {},
    lessonContext = {},
    conceptContext = {},
    studentState = {},
    conceptConfig,
    tamiContext
  } = input

  const concept = conceptContext.conceptId || conceptContext.concept || lessonContext.conceptId || null
  const baseBloomLevel = conceptConfig?.bloomLevel || studentState.bloomLevel || 'understand'
  const baseZpdLevel = conceptConfig?.zpdLevel || studentState.zpdLevel || 'guided'

  if (!isLessonContext(routeContext, lessonContext, conceptContext)) {
    return {
      shouldUseMotesart: false,
      teachingMode: TEACHING_MODES.REDIRECT_TO_TAMI,
      speechMode: null,
      phase: lessonContext.phase || null,
      concept,
      bloomLevel: baseBloomLevel,
      zpdLevel: baseZpdLevel,
      selectedSpeechText: null,
      stateUpdates: {},
      redirectReason: 'outside_music_learning_context',
      debug: { routeContext, tamiContext }
    }
  }

  const normalizedMessage = String(userMessage || '').toLowerCase().trim()
  const repeatedWrong = Number(studentState.incorrectStreak || 0) >= 1
  const noPriorSignal =
    !studentState.lastStudentExplanation &&
    Number(studentState.correctStreak || 0) === 0 &&
    Number(studentState.incorrectStreak || 0) === 0
  const confusionDetected = hasConfusionCue(normalizedMessage) || repeatedWrong
  const explanationBack = normalizedMessage.split(/\s+/).filter(Boolean).length >= 4
  const masteryDetected = Boolean(studentState.masteryDetected || studentState.nextRecommendedMove === 'release')

  let teachingMode = TEACHING_MODES.EXPLAIN_PATTERN
  let speechMode = 'teach'
  let zpdLevel = baseZpdLevel

  if (Number(studentState.hintCount || 0) >= 2) {
    teachingMode = TEACHING_MODES.SIMPLIFY
    speechMode = 'guide'
    zpdLevel = reduceZpdLevel(baseZpdLevel)
  } else if (masteryDetected || (Number(studentState.correctStreak || 0) >= 2 && explanationBack)) {
    teachingMode = TEACHING_MODES.CELEBRATE_PROGRESS
    speechMode = 'release'
  } else if (confusionDetected) {
    teachingMode = TEACHING_MODES.SIMPLIFY
    speechMode = 'guide'
  } else if (Number(studentState.correctStreak || 0) >= 1) {
    teachingMode = TEACHING_MODES.QUIZ_FOR_OWNERSHIP
    speechMode = 'confirm'
  } else if (noPriorSignal) {
    teachingMode = TEACHING_MODES.EXPLAIN_PATTERN
    speechMode = 'teach'
  }

  const selectedSpeechText = selectSpeechText(conceptConfig, speechMode)

  return {
    shouldUseMotesart: true,
    teachingMode,
    speechMode,
    phase: lessonContext.phase || speechMode,
    concept,
    bloomLevel: baseBloomLevel,
    zpdLevel,
    selectedSpeechText,
    stateUpdates: {
      lastMotesartMove: teachingMode,
      nextRecommendedMove: speechMode
    },
    redirectReason: null,
    debug: {
      routeContext,
      conceptContext,
      correctStreak: studentState.correctStreak || 0,
      incorrectStreak: studentState.incorrectStreak || 0,
      hintCount: studentState.hintCount || 0
    }
  }
}
