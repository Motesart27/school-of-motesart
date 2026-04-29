export const CONCEPT_VIEW_CONFIG = {
  T_HALF_STEP: {
    highlightedKeys: [2, 3],
    homeKeyIndex: 0,
    answerOptions: ["1 & 2", "3 & 4", "5 & 6", "7 & 8"],
    correctAnswer: "3 & 4",
    bpm: 92,
    speechTexts: {
      teach: "Look — 3 and 4 are neighbors. No black key between them. That is a half step. The closest two notes can be.",
      guide: "Now find it yourself. Which two keys are next-door neighbors with nothing between them?",
      confirm: "Say the number. Which pair makes a half step? Name it before you play it.",
      release: "No hints. No looking. Feel where 3 and 4 live. Trust what you know."
    }
  },
  T_WHOLE_STEP: {
    highlightedKeys: [0, 2],
    homeKeyIndex: 0,
    answerOptions: ["1 & 2", "1 & 3", "2 & 4", "3 & 5"],
    correctAnswer: "1 & 3",
    bpm: 88,
    speechTexts: {
      teach: "A whole step skips one key. From 1 to 3 — there is a key in between. That gap is a whole step.",
      guide: "Find two notes with exactly one key between them. That is your whole step.",
      confirm: "Name the pair. Which two notes are a whole step apart?",
      release: "Feel it. No help. Find the whole step by ear."
    }
  }
,
  T_SCALE_DEGREES_MAJOR: {
    highlightedKeys: [0, 1, 2, 3, 4, 5, 6, 7],
    homeKeyIndex: 0,
    answerOptions: [],
    correctAnswer: null,
    bpm: 88,
    speechTexts: {
      teach: "Every note in the scale has a number — degree 1 through 8. C is 1, D is 2, E is 3, and so on.",
      guide: "Name the degree. Which number is this note in the C major scale?",
      confirm: "Say the degree number before you play it.",
      release: "No hints. Name the degree by ear."
    }
  }
}