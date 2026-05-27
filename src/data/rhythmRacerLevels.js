export const INPUT_MODES = {
  ACTIVE: 'ONE_PAD',
  STUBBED: {
    TWO_PAD: 'TWO_PAD',
    BONGO_SET: 'BONGO_SET',
    CONGA_SET: 'CONGA_SET',
    STEEL_CAN_SET: 'STEEL_CAN_SET',
    MIDI_HAND_TRIGGER: 'MIDI_HAND_TRIGGER',
  },
}

export const RHYTHM_TEMPO_BPM = 70
export const RHYTHM_BEAT_MS = 60000 / RHYTHM_TEMPO_BPM
export const RHYTHM_BEATS_PER_MEASURE = 4
export const RHYTHM_MEASURES_PER_ATTEMPT = 4
export const RHYTHM_BEATS_PER_ATTEMPT = RHYTHM_BEATS_PER_MEASURE * RHYTHM_MEASURES_PER_ATTEMPT

export const RHYTHM_LEVELS = [
  {
    level: 1,
    key: 'L1',
    name: 'Whole Note',
    concept: 'R_PULSE_WHOLE',
    displayPattern: 'TAP -- -- --',
    beats: ['tap', 'hold', 'hold', 'hold'],
    marker: 'bar',
    span: 4,
  },
  {
    level: 2,
    key: 'L2',
    name: 'Half Notes',
    concept: 'R_PULSE_HALF',
    displayPattern: 'TAP -- TAP --',
    beats: ['tap', 'hold', 'tap', 'hold'],
    marker: 'bar',
    span: 2,
  },
  {
    level: 3,
    key: 'L3',
    name: 'Quarter Notes',
    concept: 'R_PULSE_QUARTER',
    displayPattern: 'TAP TAP TAP TAP',
    beats: ['tap', 'tap', 'tap', 'tap'],
    marker: 'circle',
    span: 1,
  },
  {
    level: 4,
    key: 'L4',
    name: 'Quarter Rest',
    concept: 'R_REST_QUARTER',
    displayPattern: 'TAP TAP REST TAP',
    beats: ['tap', 'tap', 'rest', 'tap'],
    marker: 'mixed',
    span: 1,
    rotations: [
      ['tap', 'tap', 'rest', 'tap'],
      ['tap', 'rest', 'rest', 'tap'],
      ['rest', 'tap', 'tap', 'rest'],
      ['tap', 'rest', 'tap', 'rest'],
    ],
  },
]

export const COACHING = {
  PRE_GAME: {
    child: {
      L1: 'Wait for the car - then tap!',
      L2: 'Two taps. Feel the split.',
      L3: 'Every beat. Lock it.',
      L4: 'Heads up - beat 3 is quiet.',
    },
    teen: {
      L1: "Let it ride. Don't rush.",
      L2: 'Beat 1 and beat 3. Feel it.',
      L3: 'Steady pulse. Every beat.',
      L4: 'Silence counts. Leave beat 3 alone.',
    },
    adult: {
      L1: 'Beat 1. Tap and hold.',
      L2: 'Tap 1 and 3. Hold space.',
      L3: 'Quarter pulse. Four beats.',
      L4: 'TAP TAP REST TAP. Three-beat is silent.',
    },
  },
  PERFECT: {
    child: 'Yes! Right there!',
    teen: 'That is it. On the pulse.',
    adult: 'Perfect timing.',
  },
  GOOD: {
    child: 'Nice! You felt it.',
    teen: 'Close enough. Keep it.',
    adult: 'Good. Stay with it.',
  },
  EARLY: {
    child: 'Wait for it - let the car come to you.',
    teen: 'Easy. Let the beat come.',
    adult: 'Early. Wait for the marker.',
  },
  LATE: {
    child: 'Almost! Tap when the bar hits the car.',
    teen: 'Half-step late. Lean forward.',
    adult: 'Late. Anticipate the beat.',
  },
  MISS: {
    child: 'Oops - try to tap when the bar hits the car!',
    teen: 'Lost that one. Stay with the count.',
    adult: 'Miss. Reset and hold the pulse.',
  },
  REST_MISTAKE: {
    child: 'Oops - that one was quiet time!',
    teen: 'That was a rest. Silence counts too.',
    adult: 'Rest beat. No tap required.',
  },
  LEVEL_CLEAR: {
    child: "You got it! Let's go to the next one.",
    teen: 'That is locked. Next level.',
    adult: 'Level clear.',
  },
  STAGE_CLEAR: {
    child: 'Nice work!',
    teen: 'Good stage.',
    adult: 'Stage done.',
  },
}

export function normalizeAgeGroup(ageGroup) {
  const value = String(ageGroup || '').toLowerCase()
  if (value.includes('teen')) return 'teen'
  if (value.includes('adult')) return 'adult'
  return 'child'
}

export function getLevel(level) {
  const numeric = Number(level) || 1
  return RHYTHM_LEVELS.find(item => item.level === numeric) || RHYTHM_LEVELS[0]
}

export function getPatternForAttempt(levelConfig, attemptNumber) {
  if (!levelConfig.rotations?.length) return levelConfig.beats
  const index = Math.max(0, attemptNumber - 1) % levelConfig.rotations.length
  return levelConfig.rotations[index]
}

export function getCoaching(eventKey, ageGroup, levelKey) {
  const age = normalizeAgeGroup(ageGroup)
  if (eventKey === 'PRE_GAME') {
    return COACHING.PRE_GAME[age]?.[levelKey] || COACHING.PRE_GAME.child.L1
  }
  const bank = COACHING[eventKey]
  if (!bank) return ''
  return bank[age] || bank.child || ''
}
