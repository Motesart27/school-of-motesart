export const CONCEPT_VIEW_CONFIG = {
  T_HALF_STEP: {
    highlightedKeys: [2, 3],
    homeKeyIndex: 0,
    answerOptions: ["1 & 2", "3 & 4", "5 & 6", "7 & 8"],
    correctAnswer: "3 & 4",
    bpm: 92,
    bloomLevel: "understand",
    zpdLevel: "guided",
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
    bloomLevel: "understand",
    zpdLevel: "guided",
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
    bloomLevel: "understand",
    zpdLevel: "guided",
    speechTexts: {
      teach: "Every note in the scale has a number — degree 1 through 8. C is 1, D is 2, E is 3, and so on.",
      guide: "Name the degree. Which number is this note in the C major scale?",
      confirm: "Say the degree number before you play it.",
      release: "No hints. Name the degree by ear."
    }
  },
  T_KEYBOARD_LAYOUT: {
    highlightedKeys: [0],
    homeKeyIndex: 0,
    answerOptions: ["Key 1", "Key 4", "Key 5", "Key 8"],
    correctAnswer: "Key 1",
    bpm: 88,
    bloomLevel: "understand",
    zpdLevel: "guided",
    speechTexts: {
      teach: "Key 1 is Middle C — the anchor. Two black keys sit just to its right. Find that pair and you have found C.",
      guide: "Point to Middle C. Which key number is it?",
      confirm: "Name it. Where does Middle C sit on this keyboard?",
      release: "No hints. Find Middle C."
    }
  },
  T_FINGER_NUMBERING: {
    highlightedKeys: [0, 1, 2, 3, 4],
    homeKeyIndex: 0,
    answerOptions: ["Finger 1", "Finger 2", "Finger 3", "Finger 5"],
    correctAnswer: "Finger 1",
    bpm: 88,
    bloomLevel: "understand",
    zpdLevel: "guided",
    speechTexts: {
      teach: "Thumb is 1. Index is 2. Middle is 3. Ring is 4. Pinky is 5. Right hand, thumb on Middle C.",
      guide: "Name the finger. If your thumb is on key 1, which finger number is that?",
      confirm: "Say the finger number before you play.",
      release: "No hints. Name the finger."
    }
  },
  T_OCTAVE_RECOGNITION: {
    highlightedKeys: [0, 7],
    homeKeyIndex: 0,
    answerOptions: ["1 & 4", "1 & 5", "1 & 8", "4 & 8"],
    correctAnswer: "1 & 8",
    bpm: 84,
    bloomLevel: "understand",
    zpdLevel: "guided",
    speechTexts: {
      teach: "Key 1 and key 8 are both C — same note, one octave apart. Eight white keys separate them.",
      guide: "Find the octave pair. Which two keys share the same name?",
      confirm: "Name the pair that forms an octave.",
      release: "No hints. Identify the octave by ear."
    }
  },
  T_MAJOR_SCALE_PATTERN: {
    highlightedKeys: [0, 1, 2, 3, 4, 5, 6, 7],
    homeKeyIndex: 0,
    answerOptions: ["W-H-W", "W-W-H", "H-W-W", "H-H-W"],
    correctAnswer: "W-W-H",
    bpm: 88,
    bloomLevel: "understand",
    zpdLevel: "guided",
    speechTexts: {
      teach: "Every major scale follows: Whole, Whole, Half, Whole, Whole, Whole, Half. That pattern never changes.",
      guide: "What are the first three steps of the major scale pattern?",
      confirm: "Say the first three steps: Whole, Whole, ___?",
      release: "No hints. Name the pattern."
    }
  },
  T_C_MAJOR_SCALE: {
    highlightedKeys: [0, 1, 2, 3, 4, 5, 6, 7],
    homeKeyIndex: 0,
    answerOptions: [],
    correctAnswer: null,
    bpm: 88,
    bloomLevel: "understand",
    zpdLevel: "guided",
    speechTexts: {
      teach: "C major is all white keys from C to C — no sharps, no flats. Eight notes. The foundation of everything.",
      guide: "Name the notes. Speak the C major scale from key 1 to key 8.",
      confirm: "Say the scale degrees in order before you play.",
      release: "No hints. Name the scale from memory."
    }
  }
}
