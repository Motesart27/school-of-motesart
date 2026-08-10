// motesart-personality-v2-tts-fixed
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api.js'
import { VisualOverlay, VISUAL_COMPONENT_MAP, VISUAL_LABELS, C_MAJOR_NOTES, KeyboardDiagram } from '../components/TeachingVisuals'
import useTamiQuestions from '../hooks/useTamiQuestions'
import TelemetryPanel from '../components/TelemetryPanel'
import PracticeSessionCockpit from '../components/PracticeSessionCockpit.jsx'
import PracticeConceptView from '../components/PracticeConceptView.jsx'
import { CONCEPT_VIEW_CONFIG } from '../config/conceptViewConfig.js'
// M1 R2-FE §E — read-only store access. Practice Live never writes academic
// state locally; canonical Concept_State is backend-derived (Practice_Events →
// Concept_State) and reaches this cache only via server-refreshed reads.
import { getState } from '../lesson_engine/concept_state_store.js'
import { useMotesartStudentState } from '../hooks/useMotesartStudentState.js'
import { runMotesartThinkingEngine } from '../ai/motesart/motesartThinkingEngine.js'
import { buildMotesartVoiceResponse } from '../ai/motesart/motesartVoicePersona.js'

const INTENT_SYSTEM_PROMPT = [
  'You are an intent classification engine for a real-time music teaching system.',
  'Analyze short student input and return structured JSON.',
  'OUTPUT: { "intent": "", "confidence": 0.0, "emotion": "", "content": "", "correctness": null }',
  'INTENT TYPES: answer_attempt, uncertain_answer, question, confusion, affirmation, hesitation, silence, off_topic',
  'EMOTIONS: confident, neutral, hesitant, frustrated, curious, disengaged',
  'CORRECTNESS: true, false, partial, or null. Be generous with beginners.'
].join(' ')

const MOTESART_PERSONALITY_VERSION = 'motesart-personality-v2-tts-fixed'
if (typeof window !== 'undefined') {
  window.__MOTESART_PERSONALITY_VERSION = MOTESART_PERSONALITY_VERSION
}

async function parseIntent(transcript, context) {
  if (!transcript || transcript.trim().length === 0) {
    return { intent: 'silence', confidence: 1.0, emotion: 'neutral', content: '', correctness: null }
  }
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': window.__MOTESART_CLAUDE_KEY || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system: INTENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: 'Student said: "' + transcript + '" Expected: ' + (context.expectedAnswer || 'any') + ' Acceptable: ' + (context.acceptableAnswers || []).join(', ') + ' Concept: ' + (context.concept || 'music') }]
      })
    })
    const data = await resp.json()
    const text = data.content && data.content[0] ? data.content[0].text : '{}'
    return JSON.parse(text)
  } catch (err) {
    console.error('Intent parse error:', err)
    return { intent: 'answer_attempt', confidence: 0.5, emotion: 'neutral', content: transcript, correctness: null }
  }
}

let _recognition = null
let _isListening = false
let _onTranscript = null
let micAllowed = false
let _recognitionActive = false
let _intentionalStop = false
let _micErrorCount = 0
let _micFailed = false
let _onMicFail = null

async function ensureMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    micAllowed = true
    console.log('Mic permission granted')
    return true
  } catch (err) {
    console.error('Mic permission denied:', err)
    return false
  }
}

function startListening(onTranscript) {
  if (_recognitionActive) return
  if (!micAllowed) { console.error('Mic not allowed'); return }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) { console.warn('SpeechRecognition not supported'); return }
  _onTranscript = onTranscript
  _intentionalStop = false
  _recognition = new SR()
  _recognition.lang = 'en-US'
  _recognition.continuous = true
  _recognition.interimResults = true
  _recognition.onresult = (event) => {
    let transcript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript
    }
    if (event.results[event.results.length - 1].isFinal && _onTranscript) {
      _onTranscript(transcript.trim())
    }
  }
  _recognition.onerror = (e) => {
    if (e.error === 'aborted' && _intentionalStop) { _intentionalStop = false; _recognitionActive = false; return }
    console.warn('Speech recognition error:', e.error)
    _recognitionActive = false
    if (e.error === 'not-allowed' || e.error === 'audio-capture') {
      _isListening = false
      _micFailed = true
      if (_onMicFail) _onMicFail()
    } else if (e.error !== 'no-speech') {
      _micErrorCount++
      if (_micErrorCount >= 2) {
        _micFailed = true
        _isListening = false
        console.warn('[Mic] Stopped retrying after 2 errors')
        if (_onMicFail) _onMicFail()
      } else {
        setTimeout(() => { _isListening = false; startListening(_onTranscript) }, 1000)
      }
    }
  }
  _recognition.onend = () => {
    _recognitionActive = false
    if (_isListening && !_intentionalStop) {
      try { if (_recognition) { _recognition.start(); _recognitionActive = true } } catch(e) {}
    }
  }
  _recognition.start()
  _isListening = true
  _recognitionActive = true
}

function stopListening() {
  _intentionalStop = true
  _isListening = false
  _recognitionActive = false
  if (_recognition) { try { _recognition.stop() } catch(e) {} _recognition = null }
}

function evaluateStudentResponse(text, expected, promptType, conceptName) {
  const normalized = text.toLowerCase().trim()
  const core = normalized
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(okay|ok|lets|let's|work|on|the|a|an|please|uh|um|yeah|yes|i|think|it|is|are)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const isQuestion = normalized.endsWith('?') || /^(what|how|why|can you|could you|do you|is it|are they)/.test(normalized)
  const isConfused = /(i don|don't know|not sure|idk|confused|huh|what do you mean)/.test(normalized)

  if (isQuestion || isConfused) {
    return {
      correct: false, confidence: 0.9, reason: 'question_or_confusion',
      motesartReply: isQuestion
        ? 'Great question! The answer is "' + (expected[0] || 'try again') + '". Say it aloud!'
        : 'No worries! Try repeating what I said.'
    }
  }

  const expectedPhrases = expected.map(e => e.toLowerCase().trim()).filter(Boolean)
  const exactExpectedMatch = expectedPhrases.some(e => core === e)
  const wholeWordExpectedMatch = expectedPhrases
    .filter(e => e.includes(' '))
    .some(e => new RegExp(`\\b${e.replace(/\s+/g, '\\s+')}\\b`).test(core))
  const halfStepConceptMatch = /\bhalf\s+step\b/.test(core) ||
    (/\bhalf\b/.test(core) && /\bstep\b/.test(core) && !/\b\d+\s+steps?\b/.test(core))
  const naturalPatterns = [
    /\b3\s*and\s*4\b/, /three\s*and\s*four/, /\be\s*(and|to)\s*f\b/,
    /next\s*to\s*each\s*other/, /neighbor/, /half\s*step/,
    /no\s*black\s*key/, /right\s*next/, /adjacent/, /closest/,
    /smallest\s*(distance|interval|move)/, /one\s*semitone/,
  ]
  const naturalMatch = naturalPatterns.some(p => p.test(normalized))
  const keywordMatch = exactExpectedMatch || wholeWordExpectedMatch || halfStepConceptMatch

  if (keywordMatch || naturalMatch) {
    return { correct: true, confidence: keywordMatch ? 0.95 : 0.85, reason: 'matched', motesartReply: 'Yes!' }
  }

  const partialWords = ['step', 'note', 'key', 'close', 'small', 'near', 'short', 'distance']
  const partialMatch = partialWords.some(w => new RegExp(`\\b${w}\\b`).test(core))

  if (partialMatch) {
    return {
      correct: false, confidence: 0.5, reason: 'partial',
      motesartReply: 'You are on the right track! Can you say the full answer?'
    }
  }

  return {
    correct: false, confidence: 0.9, reason: 'wrong',
    motesartReply: 'Not quite — a half step is the smallest distance, like E to F or B to C!'
  }
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function getDominantWYLMode(wylProfile, activeWYLProfile) {
  const explicitMode = activeWYLProfile?.dominantMode || activeWYLProfile?.dominant || wylProfile?.dominantMode || wylProfile?.dominant
  if (explicitMode) return explicitMode

  const modes = ['visual', 'auditory', 'kinesthetic', 'readwrite']
  return modes.reduce((best, mode) => (
    Number(wylProfile?.[mode] || 0) > Number(wylProfile?.[best] || 0) ? mode : best
  ), 'visual')
}

function buildWrongAnswerResponse(conceptKey, ageBand, wylDominant) {
  const conceptConfig = CONCEPT_VIEW_CONFIG[conceptKey]
  const baseGuide = conceptConfig?.speechTexts?.guide ||
    'Look at the keys carefully. Find the pattern.'

  const agePrefix = {
    child: ['Hmm, not quite!', 'Ooh, almost!', "Nice try, let's look again -"],
    teen: ['Not even close - kidding, you were close.', "Oof. Let's back up a sec.", 'Almost! But not almost enough -'],
    adult: ['Not this time.', "Nope - but here's the fix:", "Close, but let's lock this in:"],
    senior: ['Not quite - let me show you:', "Let's revisit this:", "Close - here's what to look for:"]
  }[ageBand] || ["Let's try that again -"]

  const wylSuffix = {
    visual: 'Keep your eyes on the keyboard - the pattern is right there in front of you. You have got this.',
    auditory: 'Listen for the distance - half steps have the tightest sound. You have got this.',
    kinesthetic: 'Put your finger on E. Now move it one key to the right. That landing spot is F. That gap is your half step. You have got this.',
    readwrite: 'Rule: half step = adjacent keys. Zero keys between them. Say it back. You have got this.'
  }[wylDominant] || 'Look at the keys and find the pattern. You have got this.'

  const prefix = pickRandom(agePrefix)

  return `${prefix} ${baseGuide} ${wylSuffix}`
}

function buildCorrectAnswerResponse() {
  const responses = [
    "Yes! You knew it. E and F - neighbors. That's a half step.",
    "There it is. No key between them. That's all a half step ever is.",
    'See? You had it. E and F, right next to each other.',
    "That's it. Half step locked."
  ]
  return pickRandom(responses)
}

function buildPartialAnswerResponse() {
  const responses = [
    "You're in the neighborhood. Get more specific.",
    'Warm - but not warm enough. Say the exact keys.',
    "That's in the right zip code. Try again with the exact pair."
  ]
  return pickRandom(responses)
}

let _silenceTimer = null
function resetSilenceTimer(onSilence, delay) {
  clearTimeout(_silenceTimer)
  _silenceTimer = setTimeout(() => { if (onSilence) onSilence() }, delay || 8000)
}
function clearSilenceTimer() { clearTimeout(_silenceTimer) }

let _isProcessing = false
let _audioCtx = null
let _currentSource = null

function getAudioContext() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return _audioCtx
}

if (typeof document !== 'undefined') {
  const _unlockAudio = () => {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    try {
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
    } catch(e) {}
    document.removeEventListener('click', _unlockAudio)
    document.removeEventListener('touchstart', _unlockAudio)
    document.removeEventListener('keydown', _unlockAudio)
  }
  document.addEventListener('click', _unlockAudio)
  document.addEventListener('touchstart', _unlockAudio)
  document.addEventListener('keydown', _unlockAudio)
}

// ── TTS pronunciation sanitizer ──
// Display text stays "Motesart" — spoken text uses phonetic "Moatzart"
const sanitizeTTS = (text) => text.replace(/Motesart/g, 'Moatzart')

const QUIZ_REVIEW_TEXT = "Let's go over that one more time."
const PROVE_REVIEW_TEXT = "Close. Let's make sure this one is locked in."
const PRACTICE_TARGET = 2

function buildPracticePrompt(current, practiceCorrect) {
  return `Practice ${practiceCorrect + 1} of ${current.practiceTarget || PRACTICE_TARGET}: ${current.text}`
}

const CONCEPT_CONFIG_MAP = {
  'major-scale-pattern': {
    concept: 'Major Scale Pattern',
    description: 'The Motesart pattern — how notes move inside every major scale.',
    conceptId: 'T_MAJOR_SCALE_PATTERN',
    steps: [
      {
        type: 'speak',
        stage: 'intro',
        text: 'Welcome to the School of Motesart. I am looking forward to teaching — and learning how you best learn. No pressure today, we are starting with one simple pattern: the major scale pattern. Once you understand this pattern, we will be able to build from there. Are you ready to start?'
      },
      {
        type: 'listen',
        stage: 'ready',
        expect: [
          'yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay', 'lets go',
          'yea', 'i am', 'im ready', 'go', 'let us go', 'let go'
        ],
        prompt: 'ready_check',
        prompt_display: 'Say yes or ready to begin.',
        text: 'Are you ready to start?'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: 'Good. Here is the pattern. Listen first. 1 skip 1. 2 skip 1. 3 and 4 together. 4 skip 1. 5 skip 1. 6 skip 1. 7 and 8 together.'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: 'Now say it back to me. Ready? Say the whole pattern. 1 skip 1, 2 skip 1, 3 and 4 together...'
      },
      {
        type: 'listen',
        stage: 'call_response',
        expect: [
          '1 skip 1 2 skip 1 3 and 4 together 4 skip 1 5 skip 1 6 skip 1 7 and 8 together',
          'one skip one two skip one three and four together',
          'skip skip together skip skip skip together',
          '3 and 4 together 7 and 8 together',
          'skip together',
          '1 2 3 4 5 6 7 8',
          'one two three four five six seven eight',
          '3 and 4 7 and 8'
        ],
        prompt: 'call_response',
        prompt_display: 'Say the whole pattern — 1 skip 1, 2 skip 1, 3 and 4 together...',
        text: 'Say the whole pattern — 1 skip 1, 2 skip 1, 3 and 4 together...'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: 'Good. Now here is the important part. Most of the pattern skips. But two places do not skip. 3 and 4 are together. 7 and 8 are together. No note between them. They sit right next to each other.'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: 'I am going to ask you which pairs are together. Take your time.'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: false,
        expect: [
          '3 and 4', '7 and 8', 'three and four', 'seven and eight',
          '3 4 7 8', '3 and 4 and 7 and 8', 'three and four and seven and eight',
          '34 78', 'three four seven eight', '3 and 4, 7 and 8'
        ],
        prompt: 'full_pattern',
        prompt_display: 'Q1 of 3 — Which number pairs are TOGETHER?',
        text: 'Which number pairs are TOGETHER — with no note between them?'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: false,
        expect: [
          'skip', 'a skip', 'there is a skip', 'one skip one', '1 skip 1',
          'skip one', 'whole step', 'whole', 'yes skip', 'yes a skip'
        ],
        prompt: 'full_pattern',
        prompt_display: 'Q2 of 3 — Between 1 and 2: skip or together?',
        text: 'Between 1 and 2 in the pattern — is there a skip, or are they together?'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: true,
        expect: [
          'together', 'they are together', 'no skip', 'no note between',
          'together no skip', 'no key between', 'nothing between', 'close'
        ],
        prompt: 'full_pattern',
        prompt_display: 'Q3 of 3 — Between 3 and 4: skip or together?',
        text: 'Between 3 and 4 — do we skip, or stay together?',
        quizFailStep: 6
      },
      {
        type: 'live_practice',
        stage: 'practice',
        practiceTarget: 2,
        expect: [
          'skip', 'together', 'skip skip together', 'one skip one',
          '1 skip 1', '3 and 4', '7 and 8', 'together spots',
          'skip and together', 'two together'
        ],
        prompt_display: 'Practice — say the pattern or name the together spots.',
        text: 'Say the pattern out loud, or just name the together spots.'
      },
      {
        type: 'prove_it',
        stage: 'prove_it',
        expect: [
          '3 and 4', '7 and 8', 'three and four and seven and eight',
          '3 and 4 7 and 8', '3 4 7 8', '3 and 4, 7 and 8',
          'three and four, seven and eight'
        ],
        prompt_display: 'Final question — no hints.',
        text: 'Last one. No hints. Name both together spots in the major scale pattern.',
        lockedText: 'That is locked in. 3 and 4, and 7 and 8 — the foundation of every major scale. You are ready for the next step.',
        proveFailStep: 7,
        nextConcept: 'half-step'
      }
    ],
    nextConcept: 'half-step'
  },
  'half-step': {
    concept: 'Half Step',
    description: 'The smallest distance in music — from one key to the very next key.',
    conceptId: 'T_HALF_STEP',
    steps: [
      { type: 'speak', stage: 'teach', text: "A half step is the smallest distance in music. It is the distance from one key to the very next key with nothing in between. E to F is a half step. B to C is a half step. Tiny move, huge deal." },
      { type: 'listen', stage: 'quiz', expect: ['half step', 'smallest distance', 'very next key', 'next key', 'nothing in between'], prompt: 'full_pattern', text: 'What is a half step?' },
      { type: 'listen', stage: 'quiz', expect: ['e and f', 'e f', '3 and 4', 'three and four'], prompt: 'full_pattern', text: 'Give me one half-step pair around keys 3 and 4.' },
      { type: 'listen', stage: 'quiz', quizEnd: true, expect: ['b and c', 'b c', '7 and 8', 'seven and eight'], prompt: 'full_pattern', text: 'Give me the other natural half-step pair in C major.' },
      { type: 'live_practice', stage: 'practice', practiceTarget: PRACTICE_TARGET, expect: ['e and f', 'b and c', 'e f', 'b c', '3 and 4', '7 and 8', 'half step', 'touching', 'next to each other'], prompt: 'full_pattern', text: 'Play or point to a half step, then tell me what you played.' },
      { type: 'listen', stage: 'prove', expect: ['half step', 'e and f', 'b and c', 'next to each other', 'touching', 'nothing in between', 'no key between'], prompt: 'full_pattern', text: 'Prove it: how do you know two notes are a half step apart?', lockedText: "Half step locked. Tiny distance, big musician brain. You got this." },
    ]
  },
  'whole-step': {
    concept: 'Whole Step',
    description: 'A step that skips one key — twice the size of a half step.',
    conceptId: 'T_WHOLE_STEP',
    steps: [
      { type: 'speak', stage: 'teach', text: "A whole step skips one key. Instead of going to the very next key, you hop over one and land on the key after that. C to D is a whole step. D to E is a whole step. It is a half step with a little more travel budget." },
      { type: 'listen', stage: 'quiz', expect: ['skip one', 'skips one key', 'one key between', 'whole step'], prompt: 'full_pattern', text: 'What does a whole step do?' },
      { type: 'listen', stage: 'quiz', expect: ['c and d', 'c d', 'd and e', 'd e'], prompt: 'full_pattern', text: 'Name one whole-step pair in C major.' },
      { type: 'listen', stage: 'quiz', quizEnd: true, expect: ['one key between', 'skipped one key', 'skip one', 'black key between'], prompt: 'full_pattern', text: 'How many keys are between the two notes in a whole step?' },
      { type: 'live_practice', stage: 'practice', practiceTarget: PRACTICE_TARGET, expect: ['c and d', 'skip one', 'whole step', 'd and e', 'f and g', 'skipped one key', 'one key between'], prompt: 'full_pattern', text: 'Play or point to a whole step, then tell me what you played.' },
      { type: 'listen', stage: 'prove', expect: ['whole step', 'skip one', 'one key between', 'c and d', 'd and e', 'f and g', 'skipped one key'], prompt: 'full_pattern', text: 'Prove it: how do you know two notes are a whole step apart?', lockedText: 'Whole step locked. You skipped one key on purpose, which is much better than skipping practice.' },
    ]
  },
  'scale-degree': {
    concept: 'Scale Degrees',
    description: 'Every note in the C major scale numbered 1 through 8.',
    conceptId: 'T_SCALE_DEGREES_MAJOR',
    steps: [
      { type: 'speak', text: "Now we number the notes. Every note in the scale gets a number, starting from 1. That number tells you exactly where you are. This is the Motesart system." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "Great! Let us count together. Say the numbers 1 through 4 as I point to the keys: 1, 2, 3, 4." },
      { type: 'listen', expect: ['1', '2', '3', '4', 'one', 'two', 'three', 'four'], prompt: 'call_response' },
      { type: 'speak', text: "Perfect! Now — what degree is the note F in C major?" },
      { type: 'listen', expect: ['4', 'four', 'fourth', 'degree 4', 'four degree'], prompt: 'full_pattern' },
      { type: 'speak', text: "That is right! F is the 4th degree. Now — what degree is G?" },
      { type: 'listen', expect: ['5', 'five', 'fifth', 'degree 5', 'five degree'], prompt: 'full_pattern' },
      { type: 'speak', text: "Yes! G is the 5th degree — called the dominant. Scale degrees work the same in every major key. What is the 1st degree always called?" },
      { type: 'listen', expect: ['1', 'one', 'first', 'tonic', 'root', 'home', 'degree 1'], prompt: 'full_pattern' },
      { type: 'speak', text: "Excellent! The 1st degree is the tonic — the home base. You now think like a real musician. Scale degrees connect every scale, every chord, every song. Great work today!" },
    ]
  },
  'keyboard-layout': {
    concept: 'Keyboard Layout',
    description: 'Where each key sits on the piano — white keys, black keys, and Middle C.',
    conceptId: 'T_KEYBOARD_LAYOUT',
    steps: [
      { type: 'speak', text: "The piano has a pattern. Two black keys, then three black keys, then repeat. Middle C sits to the left of the first group of two. Find that and you can find any note." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "Key 1 in our system is Middle C — the anchor of everything. Say it: Middle C." },
      { type: 'listen', expect: ['middle c', 'middle', 'c', 'one', '1', 'sea'], prompt: 'call_response' },
      { type: 'speak', text: "Now count across. C is 1. D is 2. E is 3. F is 4. G is 5. A is 6. B is 7. The next C is 8 — same note, higher pitch. What key number is F?" },
      { type: 'listen', expect: ['4', 'four', 'f', 'key 4', 'four key'], prompt: 'full_pattern' },
      { type: 'speak', text: "Correct. F is 4. And what is key 8?" },
      { type: 'listen', expect: ['8', 'eight', 'c', 'high c', 'octave c', 'key 8'], prompt: 'full_pattern' },
      { type: 'speak', text: "Right. Key 8 is C again — one octave up. Same name, higher pitch. You know the map. Every note has a number and a home." },
    ]
  },
  'finger-numbering': {
    concept: 'Finger Numbering',
    description: 'Which finger gets which number — the system every musician uses.',
    conceptId: 'T_FINGER_NUMBERING',
    steps: [
      { type: 'speak', text: "Fingers have numbers. Thumb is 1. Index is 2. Middle is 3. Ring is 4. Pinky is 5. This is how every book, every teacher, and every piece of sheet music talks about your hand." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "Right hand position: thumb on Middle C. Fingers 1 through 5 land on keys 1 through 5 — C D E F G. Say the finger number for your thumb." },
      { type: 'listen', expect: ['1', 'one', 'thumb', 'finger 1', 'finger one'], prompt: 'call_response' },
      { type: 'speak', text: "Correct. Thumb is always 1. If your middle finger is on E — key 3 — what finger number is that?" },
      { type: 'listen', expect: ['3', 'three', 'middle', 'finger 3', 'finger three'], prompt: 'full_pattern' },
      { type: 'speak', text: "Right. Middle finger is 3. And the pinky on G?" },
      { type: 'listen', expect: ['5', 'five', 'pinky', 'finger 5', 'finger five'], prompt: 'full_pattern' },
      { type: 'speak', text: "Yes. Pinky is 5. Thumb to pinky: 1, 2, 3, 4, 5. Every scale, every chord, every exercise uses these numbers. Know them without thinking." },
    ]
  },
  'octave-recognition': {
    concept: 'Octave Recognition',
    description: 'Identifying the same note in two different registers — 8 keys apart.',
    conceptId: 'T_OCTAVE_RECOGNITION',
    steps: [
      { type: 'speak', text: "An octave is the same note at a different pitch. C to C. Same name because it is the same sound — just higher. The distance is always 8 white keys." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "Key 1 and key 8 are both C. One lower, one higher — but same note name. Say it: octave." },
      { type: 'listen', expect: ['octave', 'oct', 'ok tave', 'oak tave'], prompt: 'call_response' },
      { type: 'speak', text: "Good. On this keyboard, which key number is one octave above key 1?" },
      { type: 'listen', expect: ['8', 'eight', 'key 8', 'eight key', 'octave up'], prompt: 'full_pattern' },
      { type: 'speak', text: "Right. Key 8. Both are C — that pair is an octave. What two keys on this keyboard form an octave?" },
      { type: 'listen', expect: ['1 and 8', '1 8', 'one and eight', 'one eight', 'keys 1 and 8', 'key 1 key 8'], prompt: 'full_pattern' },
      { type: 'speak', text: "Correct. Keys 1 and 8. Same note name, one octave apart. That relationship repeats across the entire piano in both directions." },
    ]
  },
  'c-major-scale': {
    concept: 'C Major Scale',
    description: 'All eight notes of the C major scale — the foundation before all others.',
    conceptId: 'T_C_MAJOR_SCALE',
    steps: [
      { type: 'speak', text: "C major is the foundation. No sharps. No flats. Eight white keys from C to C. You know the pattern — now you know exactly where it lives." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "Say the notes of the C major scale in order: C, D, E, F, G, A, B, C." },
      { type: 'listen', expect: ['c d e f g a b c', 'c', 'd', 'e', 'f', 'g'], prompt: 'call_response' },
      { type: 'speak', text: "Good. Now their degree numbers: 1, 2, 3, 4, 5, 6, 7, 8. What degree number is E?" },
      { type: 'listen', expect: ['3', 'three', 'degree 3', 'third', 'three degree'], prompt: 'full_pattern' },
      { type: 'speak', text: "Correct. E is 3. And B?" },
      { type: 'listen', expect: ['7', 'seven', 'degree 7', 'seventh', 'seven degree'], prompt: 'full_pattern' },
      { type: 'speak', text: "Right. B is the 7th degree. C major gives you every scale degree in its clearest form — no accidentals, no distractions. You now know this scale by name, by note, and by number." },
    ]
  },
  'find-home': {
    concept: 'Find Home',
    description: 'Every song has a home. Home is 1. In C major, C is home.',
    conceptId: 'T_FIND_HOME',
    steps: [
      {
        type: 'speak',
        stage: 'intro',
        text: "Every song has a home. Home is where the music wants to land. In C major, C is home — that is number 1. Everything else in the family connects back to home. I am going to help you find it, hear it, and own it. Ready?"
      },
      {
        type: 'listen',
        stage: 'ready',
        expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay', 'lets go', 'go', 'i am', 'im ready'],
        prompt: 'ready_check',
        prompt_display: 'Say yes or ready to begin.',
        text: 'Are you ready to find home?'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: "Good. Here is the idea. Every key on this keyboard has a number. C is 1. D is 2. E is 3. F is 4. G is 5. A is 6. B is 7. And then C again — that is 8. Same note as 1, just higher. Home is always 1. Home is always where the music wants to come back."
      },
      {
        type: 'speak',
        stage: 'teach',
        text: "Listen to this. I am going to play the scale — and watch what happens at the end. It lands on C. On home. On 1. That feeling of landing — that is what home sounds like."
      },
      {
        type: 'listen',
        stage: 'call_response',
        expect: ['home', 'one', '1', 'c', 'c is home', 'c is one', 'the first note', 'key 1', 'number 1', 'first key'],
        prompt: 'call_response',
        prompt_display: 'What number is home?',
        text: 'What number is home?'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: "Exactly. Home is 1. And in C major, 1 is C. The music-world name for home is the tonic — but you already know it as 1. Same idea. Just the technical name."
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: false,
        expect: ['c', 'c is home', 'c major', 'the note c', 'key 1', 'number 1', 'first key', 'c is one', 'key c'],
        prompt: 'full_pattern',
        prompt_display: 'Q1 — In C major, which note is home?',
        text: 'In C major, which note is home — which one is number 1?'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: false,
        expect: ['come back', 'land', 'settle', 'return', 'wants to land', 'the music lands', 'feels done', 'feels finished', 'feels settled', 'feels resolved'],
        prompt: 'full_pattern',
        prompt_display: 'Q2 — What does home feel like?',
        text: 'What does home feel like — what does the music want to do when it gets there?'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: true,
        expect: ['tonic', 'the tonic', 'root', 'the root', 'key center', 'scale degree one', 'degree one', 'number one'],
        prompt: 'full_pattern',
        prompt_display: 'Q3 — What is the music-world name for home?',
        text: 'Here is a bonus. What do musicians call home? What is the technical name for number 1?'
      },
      {
        type: 'live_practice',
        stage: 'practice',
        practiceTarget: 2,
        expect: ['home', '1', 'c', 'number one', 'key one', 'the first note', 'c is home', 'one is home'],
        prompt_display: 'Practice — play key 1 and tell me what you played.',
        text: 'Play home. Play key 1. Then tell me what you played and what number it is.'
      },
      {
        type: 'prove_it',
        stage: 'prove_it',
        expect: ['home is 1', 'home is c', 'one is home', 'c is home', '1 is home', 'home is always 1', 'home is where the music', 'the music comes back', 'tonic', 'the tonic', 'number 1'],
        prompt_display: 'Final — no hints. What is home and why does it matter?',
        text: 'No hints. In your own words — what is home in music, and why does it matter?',
        lockedText: 'Home is locked. You know where 1 lives, you can hear it land, and you can explain it. That is ownership. Next: skip and together.',
        proveFailStep: 6,
        nextConcept: 'skip-and-together'
      }
    ],
    nextConcept: 'skip-and-together'
  },
  'skip-and-together': {
    concept: 'Skip & Together',
    description: 'Some notes skip — space between them. Some notes hold hands — they are together.',
    conceptId: 'T_SKIP_AND_TOGETHER',
    steps: [
      {
        type: 'speak',
        stage: 'intro',
        text: "You found home. Now we look at how the family moves. Some notes skip — there is a note between them. Some notes are together — they hold hands, no note between. This is how the major scale is built. Ready to feel the difference?"
      },
      {
        type: 'listen',
        stage: 'ready',
        expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay', 'lets go', 'go', 'i am', 'im ready'],
        prompt: 'ready_check',
        prompt_display: 'Say yes or ready.',
        text: 'Ready to learn skip and together?'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: "Here is the difference. A skip means there is a note between them — you hop over one. Like 1 to 2. There is a black key between them. That is a skip. Now 3 to 4 — E and F. No black key between them. They sit right next to each other. That is together. They are holding hands."
      },
      {
        type: 'speak',
        stage: 'teach',
        text: "In the major scale pattern, most moves are skips. But two pairs are together — they hold hands. 3 and 4 are together. 7 and 8 are together. Those are the only two places where there is no note between them."
      },
      {
        type: 'listen',
        stage: 'call_response',
        expect: ['skip', 'together', '3 and 4', '7 and 8', 'three and four', 'seven and eight', 'skip and together', 'holding hands', 'no note between'],
        prompt: 'call_response',
        prompt_display: 'Say it back — what are the two types of moves?',
        text: 'Say it back — what are the two types of moves in the scale?'
      },
      {
        type: 'speak',
        stage: 'teach',
        text: "The music-world name for skip is whole step. The music-world name for together is half step. Same thing you already know — just the technical name. You earned it."
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: false,
        expect: ['3 and 4', '7 and 8', 'three and four', 'seven and eight', '3 4 7 8', 'three four seven eight'],
        prompt: 'full_pattern',
        prompt_display: 'Q1 — Which two pairs are together?',
        text: 'Which two number pairs are together — holding hands with no note between them?'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: false,
        expect: ['skip', 'a skip', 'there is a skip', 'whole step', 'there is a note between', 'note between', 'hop over'],
        prompt: 'full_pattern',
        prompt_display: 'Q2 — Between 1 and 2: skip or together?',
        text: 'Between 1 and 2 — is there a skip or are they together?'
      },
      {
        type: 'listen',
        stage: 'quiz',
        quizEnd: true,
        expect: ['half step', 'together', 'half', 'whole step', 'skip', 'the music world name', 'technical name'],
        prompt: 'full_pattern',
        prompt_display: 'Q3 — What is the music-world name for together?',
        text: 'What is the music-world name for together?',
        quizFailStep: 5
      },
      {
        type: 'live_practice',
        stage: 'practice',
        practiceTarget: 2,
        expect: ['3 and 4', '7 and 8', 'together', 'skip', 'half step', 'whole step', 'holding hands', 'no note between', 'e and f', 'b and c'],
        prompt_display: 'Practice — point to a together pair and name it.',
        text: 'Point to a together pair on the keyboard and tell me what you found.'
      },
      {
        type: 'prove_it',
        stage: 'prove_it',
        expect: ['3 and 4', '7 and 8', 'together', 'no note between', 'holding hands', 'half step', 'e and f', 'b and c', 'skip is whole step', 'together is half step'],
        prompt_display: 'Final — no hints. Name both together pairs.',
        text: 'No hints. Name both together pairs in the major scale. Then tell me what the music-world calls them.',
        lockedText: 'Skip and together — locked. 3 and 4, 7 and 8. Whole step, half step. You earned those names. Now the pattern makes sense.',
        proveFailStep: 5,
        nextConcept: 'major-scale-pattern'
      }
    ],
    nextConcept: 'major-scale-pattern'
  }
}

const DEFAULT_MOTESART_AVATAR = '/Motesart%20Avatar%201.PNG'
const DEFAULT_SOM_LOGO = '/SOM_logo.png'
const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  --bg:#F5F5FA; --bg-white:#FFF;
  --bg-dark-glass:rgba(20,20,40,0.75);
  --bg-dark-glass-heavy:rgba(20,20,40,0.88);
  --border-dark:rgba(255,255,255,0.1);
  --text:#1A1A2E; --text-secondary:#4A4A6A; --text-muted:#8E8EA8;
  --teal:#00C49A; --teal-bright:#00D4AA;
  --tami-pink:#e84b8a; --tami-orange:#f97316;
  --pink:#FF4F6E;
  --radius-2xl:24px; --radius-xl:20px; --radius-lg:16px; --radius-md:12px; --radius-sm:8px;
}

.wyl-root { position:relative; width:100vw; height:100vh; overflow:hidden; background:#0a0a1a; font-family:'DM Sans',-apple-system,sans-serif; }
.wyl-root *,.wyl-root *::before,.wyl-root *::after { box-sizing:border-box; margin:0; padding:0; }
.wyl-root h1,.wyl-root h2,.wyl-root h3,.wyl-root h4,.wyl-root h5 { font-family:'Outfit',sans-serif; letter-spacing:-0.02em; }

.wyl-camera { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.wyl-camera video { width:100%; height:100%; object-fit:cover; }
.wyl-camera-placeholder { position:absolute; inset:0; background:linear-gradient(150deg,#14142a 0%,#1c1c3a 50%,#1a1a30 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; }
.wyl-camera-placeholder__icon { width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; }
.wyl-camera-placeholder__text { font-size:13px; color:rgba(255,255,255,0.25); }

.wyl-nametag { position:absolute; top:76px; left:20px; display:flex; align-items:center; gap:6px; padding:4px 10px 4px 6px; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); border-radius:12px; z-index:5; }
.wyl-nametag__dot { width:6px; height:6px; border-radius:50%; background:#ff4f6e; animation:wylPulse 2s infinite; }
.wyl-nametag__name { font-size:11px; font-weight:600; color:rgba(255,255,255,0.9); }

.wyl-bar { position:absolute; top:12px; left:12px; right:12px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; height:48px; background:var(--bg-dark-glass); backdrop-filter:blur(20px); border:1px solid var(--border-dark); border-radius:var(--radius-lg); z-index:10; }
.wyl-bar__left { display:flex; align-items:center; gap:12px; }
.wyl-bar__brand { font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; background:linear-gradient(135deg,#e84b8a,#f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.wyl-bar__sep { width:1px; height:18px; background:rgba(255,255,255,0.1); }
.wyl-bar__objective { font-size:12px; color:rgba(255,255,255,0.45); font-weight:500; }
.wyl-bar__right { display:flex; align-items:center; gap:10px; }
.wyl-bar__timer { font-family:'Outfit',sans-serif; font-size:18px; font-weight:700; color:var(--teal); font-variant-numeric:tabular-nums; padding:0 6px; }
.wyl-bar__btn { padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:rgba(255,255,255,0.5); font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; cursor:pointer; transition:all 0.2s; }
.wyl-bar__btn:hover { border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.8); }
.wyl-bar__btn--end { border-color:rgba(255,79,110,0.3); color:var(--pink); }
.wyl-bar__btn--end:hover { background:var(--pink); color:#fff; border-color:var(--pink); }

.mc { position:absolute; bottom:24px; left:24px; z-index:10; animation:mcSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
@keyframes mcSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.mc__main { display:flex; gap:16px; align-items:center; padding:18px 24px; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); box-shadow:0 12px 40px rgba(0,0,0,0.4); cursor:pointer; transition:box-shadow 0.2s,border-color 0.2s,border-radius 0.3s; min-width:260px; }
.mc__main:hover { box-shadow:0 14px 48px rgba(0,0,0,0.5); border-color:rgba(255,255,255,0.12); }
.mc__av-wrap { position:relative; width:72px; height:72px; flex-shrink:0; }
.mc__live-ring { position:absolute; inset:-4px; border-radius:50%; border:2px solid var(--teal); animation:mcRing 3s ease-in-out infinite; }
@keyframes mcRing { 0%,100%{opacity:0.35;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
.mc__av { width:72px; height:72px; border-radius:50%; overflow:hidden; box-shadow:0 4px 20px rgba(232,75,138,0.35); }
.mc__av img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
.mc__info { flex:1; }
.mc__name { font-family:'Outfit',sans-serif; font-size:16px; font-weight:700; color:rgba(255,255,255,0.95); margin-bottom:4px; }
.mc__status-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.mc__status { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; color:var(--teal); padding:2px 8px; background:rgba(0,196,154,0.12); border-radius:10px; }
.mc__status-dot { width:5px; height:5px; border-radius:50%; background:var(--teal); animation:wylPulse 2s infinite; }
@keyframes wylPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.mc__speech { display:flex; align-items:center; gap:6px; font-size:11px; color:rgba(255,255,255,0.55); }
.mc__speech-bars { display:flex; align-items:center; gap:2px; height:14px; }
.mc__speech-bar { width:3px; border-radius:2px; background:linear-gradient(180deg,var(--tami-pink),var(--tami-orange)); animation:mcSpeak 0.8s ease-in-out infinite alternate; }
.mc__speech-bar:nth-child(1){height:6px;animation-delay:0s}
.mc__speech-bar:nth-child(2){height:12px;animation-delay:0.15s}
.mc__speech-bar:nth-child(3){height:8px;animation-delay:0.3s}
.mc__speech-bar:nth-child(4){height:14px;animation-delay:0.1s}
.mc__speech-bar:nth-child(5){height:6px;animation-delay:0.25s}
@keyframes mcSpeak { 0%{transform:scaleY(0.4)} 100%{transform:scaleY(1)} }
.mc__tap-hint { font-size:9px; color:rgba(255,255,255,0.3); margin-top:2px; }

.mc__chat { max-height:0; overflow:hidden; opacity:0; margin-top:0; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-top:none; border-radius:0 0 var(--radius-xl) var(--radius-xl); transition:max-height 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.3s ease,margin-top 0.3s ease,padding 0.3s ease; padding:0 24px; }
.mc.chat-open .mc__chat { max-height:400px; opacity:1; margin-top:-16px; padding:28px 24px 18px; }
.mc.chat-open .mc__main { border-radius:var(--radius-xl) var(--radius-xl) 0 0; }
.mc__chat-msg { font-size:13px; line-height:1.65; color:rgba(255,255,255,0.82); margin-bottom:10px; }
.mc__chat-tags { display:flex; gap:6px; }
.mc__chat-tag { font-size:9px; font-weight:600; color:rgba(255,255,255,0.4); padding:2px 8px; background:rgba(255,255,255,0.06); border-radius:12px; }
.mc__chat-tag--focus { color:var(--teal-bright); background:rgba(0,212,170,0.1); }

.wyl-visual-overlay { position:absolute; bottom:140px; left:24px; right:24px; max-width:600px; z-index:8; animation:mcSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
.wyl-visual-card { padding:24px; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); box-shadow:0 12px 40px rgba(0,0,0,0.4); }
.wyl-visual-card__title { font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; color:rgba(255,255,255,0.9); margin-bottom:12px; }
.wyl-visual-card__component { min-height:120px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; }

.wyl-celebration { position:absolute; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; pointer-events:none; animation:celebFade 2.5s ease-out forwards; }
@keyframes celebFade { 0%{opacity:0;transform:scale(0.8)} 15%{opacity:1;transform:scale(1.05)} 25%{transform:scale(1)} 80%{opacity:1} 100%{opacity:0} }
.wyl-celebration__text { font-family:'Outfit',sans-serif; font-size:48px; font-weight:800; background:linear-gradient(135deg,var(--teal-bright),var(--tami-pink)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
`

function createUIBridge(setters) {
  return {
    renderMoment(moment, visual, options) {
      setters.setCurrentMoment(moment)
      if (visual) setters.setCurrentVisual(visual)
    },

    showFeedback(feedback) {
      setters.setFeedback(feedback)
      const holdMs = feedback?.timing?.after || 2000
      setTimeout(() => setters.setFeedback(null), holdMs)
    },

    async waitForStudent(interactionMode, timeoutMs) {
      setters.setWaitingForInput({ mode: interactionMode, timeout: timeoutMs })
      return new Promise((resolve, reject) => {
        setters.setInputResolver({ resolve, reject })
        if (timeoutMs > 0) {
          setTimeout(() => {
            setters.setWaitingForInput(null)
            setters.setInputResolver(null)
            reject(new Error('timeout'))
          }, timeoutMs)
        }
      })
    },

    async playSpeech(text, options) {
      if (_currentSource) { try { _currentSource.stop() } catch(e) {} _currentSource = null }
      if (window.speechSynthesis) window.speechSynthesis.cancel()

      setters.setCoaching(prev => ({ ...prev, message: text, speaking: true }))

      if (options?.audio) {
        const audio = new Audio(options.audio)
        await audio.play().catch(() => {})
        await new Promise(r => {
          audio.onended = r
          setTimeout(r, 10000)
        })
      } else {
        // ── Use api.speakText (routes to Railway via VITE_RAILWAY_URL) ──
        let played = false
        try {
          await api.speakText(text, 'coach')
          played = true
        } catch (e) {
          console.warn('[WYLPracticeLive] TTS via api.speakText failed:', e.message)
        }

        // Browser speechSynthesis fallback
        if (!played && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'en-US'
          utterance.rate = 0.95
          utterance.pitch = 1.0
          utterance.volume = 1.0
          let voices = window.speechSynthesis.getVoices()
          if (voices.length === 0) {
            await new Promise(r => {
              window.speechSynthesis.onvoiceschanged = () => r()
              setTimeout(r, 1000)
            })
            voices = window.speechSynthesis.getVoices()
          }
          const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
            || voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha'))
            || voices.find(v => v.lang === 'en-US')
            || voices.find(v => v.lang.startsWith('en'))
          if (preferred) utterance.voice = preferred
          utterance.lang = 'en-US'
          await new Promise(resolve => {
            utterance.onend = resolve
            utterance.onerror = resolve
            window.speechSynthesis.speak(utterance)
            const words = text.split(' ').length
            setTimeout(resolve, Math.max(3000, (words / 130) * 60000))
          })
        } else if (!played) {
          const words = text.split(' ').length
          const durationMs = Math.max(1500, (words / 150) * 60000)
          await new Promise(r => setTimeout(r, durationMs))
        }
      }
      setters.setCoaching(prev => ({ ...prev, speaking: false }))
    },

    async playTones(tones, options) {
      setters.setActiveTones(tones)
      const duration = options?.tempo ? (tones.length * (60000 / options.tempo)) : 2000
      await new Promise(r => setTimeout(r, duration))
      setters.setActiveTones(null)
    },

    showCelebration(type) {
      setters.setCelebration(type)
      setTimeout(() => setters.setCelebration(null), 2800)
    },

    clearVisual() { setters.setCurrentVisual(null) },
    updateDebug(state) { setters.setDebugState(state) },
    onLessonStart(info) { setters.setLessonInfo(info) },
    onLessonComplete(summary) { setters.setLessonComplete(summary) },

    showReinforcement(data) {
      setters.setReinforcement(data)
      setTimeout(() => setters.setReinforcement(null), 4000)
    },

    startMicroGame(game, moment) {
      console.log('[UI] Micro-game triggered:', game)
    },
  }
}

function TopBar({ timer, objective, onPause, onEnd, paused }) {
  return (
    <div className="wyl-bar">
      <div className="wyl-bar__left">
        <img
          src={DEFAULT_SOM_LOGO}
          alt="SOM"
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
        />
        <span className="wyl-bar__brand">School of Motesart</span>
        <div className="wyl-bar__sep" />
        <span className="wyl-bar__objective">{objective}</span>
      </div>
      <div className="wyl-bar__right">
        <span className="wyl-bar__timer">{timer}</span>
        <button className="wyl-bar__btn" onClick={onPause}>{paused ? 'Resume' : 'Pause'}</button>
        <button className="wyl-bar__btn wyl-bar__btn--end" onClick={onEnd}>End Session</button>
      </div>
    </div>
  )
}

function MotesartCard({ coaching, onToggleChat, chatOpen, onStudentQuestion, avatarSrc = DEFAULT_MOTESART_AVATAR }) {
  const isSpeaking = coaching?.speaking
  const [chatInput, setChatInput] = useState('')

  const handleSend = () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    if (onStudentQuestion) onStudentQuestion(text)
  }

  const handleKeyDown = (e) => {
    if (!window.__MOTESART_DEV_MODE) return
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); handleSend() }
  }

  return (
    <div className={`mc${chatOpen ? ' chat-open' : ''}`}>
      <div className="mc__main" onClick={onToggleChat}>
        <div className="mc__av-wrap">
          <div className="mc__live-ring" />
          <div className="mc__av">
            <img
              src={avatarSrc || DEFAULT_MOTESART_AVATAR}
              alt="Motesart"
              onError={(e) => {
                if (e.currentTarget.src.endsWith(DEFAULT_MOTESART_AVATAR)) return
                e.currentTarget.src = DEFAULT_MOTESART_AVATAR
              }}
            />
          </div>
        </div>
        <div className="mc__info">
          <div className="mc__name">Motesart</div>
          <div className="mc__status-row">
            <span className="mc__status">
              <span className="mc__status-dot" />
              {isSpeaking ? 'Speaking' : 'Listening'}
            </span>
          </div>
          {isSpeaking && (
            <div className="mc__speech">
              <div className="mc__speech-bars">
                {[0,1,2,3,4].map(i => <div key={i} className="mc__speech-bar" />)}
              </div>
              <span>Speaking aloud...</span>
            </div>
          )}
          <div className="mc__tap-hint">Tap to chat with Motesart</div>
        </div>
      </div>
      <div className="mc__chat">
        <p className="mc__chat-msg">{coaching?.message || 'Listening...'}</p>
        {coaching?.tags && coaching.tags.length > 0 && (
          <div className="mc__chat-tags">
            {coaching.tags.map((t, i) => (
              <span key={i} className={`mc__chat-tag${i === 0 ? ' mc__chat-tag--focus' : ''}`}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginTop:12, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12 }}>
          <input
            type="text" value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="Ask Motesart a question..."
            style={{ flex:1, padding:'8px 12px', fontSize:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'DM Sans, sans-serif' }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleSend() }}
            disabled={!chatInput.trim()}
            style={{ padding:'8px 14px', fontSize:11, fontWeight:600, background:chatInput.trim() ? 'linear-gradient(135deg,#e84b8a,#f97316)' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:10, color:chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)', cursor:chatInput.trim() ? 'pointer' : 'default', fontFamily:'DM Sans, sans-serif', transition:'all 0.2s' }}>
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}

function CelebrationOverlay({ type }) {
  if (!type) return null
  const messages = {
    confetti: 'Perfect!', mastery_achieved: 'Mastered!',
    streak: 'On Fire!', level_up: 'Level Up!', breakthrough: 'Breakthrough!',
  }
  return (
    <div className="wyl-celebration">
      <div className="wyl-celebration__text">{messages[type] || 'Nice!'}</div>
    </div>
  )
}

export default function WYLPracticeLive({ lessonId = 'L01_c_major_scale', studentId, studentProfile, wylProfile }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const { user: authUser } = useAuth()

  // Concept routing — read ?concept= from URL, stable for session lifetime.
  //
  // M1 R2-FE §B — CANONICAL CONCEPT LAUNCH ADAPTER. Homework launches carry
  // the canonical backend concept id (T_HALF_STEP, T_WHOLE_STEP,
  // T_MAJOR_SCALE_PATTERN, …). Resolution order:
  //   1. legacy internal slug → its CONCEPT_CONFIG_MAP entry (unchanged)
  //   2. canonical T_* id   → the ONE config entry whose conceptId matches
  //   3. anything else, or a canonical id with no real Practice Live config,
  //      → null → the fail-closed unavailable screen. NEVER a silent
  //      substitution of T_HALF_STEP or any other default.
  // Canonical ids stay canonical — nothing here renames, aliases, or invents
  // backend concepts; this is a presentation/route adapter only. The
  // assignment_id query param (canonical rec… id) passes through untouched.
  const currentConcept = React.useMemo(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('concept')
      const slug = param || 'major-scale-pattern'   // no param → unchanged default
      if (CONCEPT_CONFIG_MAP[slug]) return CONCEPT_CONFIG_MAP[slug]
      if (/^T_[A-Z0-9_]+$/.test(slug)) {
        const entry = Object.values(CONCEPT_CONFIG_MAP).find(c => c.conceptId === slug)
        if (entry) return entry
      }
      return null
    } catch { return null }
  }, [])

  const [practiceView, setPracticeView] = useState('cockpit')
  const [timer, setTimer] = useState(0)
  const [paused, setPaused] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [micError, setMicError] = useState(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const uiBridgeRef = useRef(null)

  const cachedVoicesRef = React.useRef([])
  const loadVoices = React.useCallback(() => {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) { cachedVoicesRef.current = voices; return resolve(voices) }
      const onVoices = () => {
        voices = window.speechSynthesis.getVoices()
        cachedVoicesRef.current = voices
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
        resolve(voices)
      }
      window.speechSynthesis.addEventListener('voiceschanged', onVoices)
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 3000)
    })
  }, [])

  const [lessonInfo, setLessonInfo] = useState(null)
  const [lessonComplete, setLessonComplete] = useState(null)
  const [currentMoment, setCurrentMoment] = useState(null)
  const [currentVisual, setCurrentVisual] = useState(null)
  const [coaching, setCoaching] = useState({ message: 'Starting lesson...', speaking: false, tags: [] })
  const [feedback, setFeedback] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const [reinforcement, setReinforcement] = useState(null)
  const [activeTones, setActiveTones] = useState(null)
  const [debugState, setDebugState] = useState(null)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const [ttsUnavailable, setTtsUnavailable] = useState(false)
  const [retryMode, setRetryMode] = useState(false)
  const [promptMode, setPromptMode] = useState(false)
  const [theoryIsSpeaking, setTheoryIsSpeaking] = useState(false)

  const [waitingForInput, setWaitingForInput] = useState(null)
  const [inputResolver, setInputResolver] = useState(null)

  const engineRef = useRef(null)
  const orchestratorRef = useRef(null)
  const bridgeRef = useRef(null)
  const tamiStackRef = useRef(null)
  const perceptionBridgeRef = useRef(null)

  const [isListeningActive, setIsListeningActive] = React.useState(false)
  const [lastTranscript, setLastTranscript] = React.useState('')
  const [studentEmotion, setStudentEmotion] = React.useState('neutral')
  const [teachingStep, setTeachingStep] = React.useState(0)
  const [awaitingResponse, setAwaitingResponse] = React.useState(false)
  const [practiceCorrect, setPracticeCorrect] = React.useState(0)
  const [responseTimeout, setResponseTimeout] = React.useState(null)
  // Cache-only read (M1 §C): a server-refreshed Concept_State snapshot used
  // for phase presentation — never locally derived. Null-safe so an
  // unsupported concept reaches the fail-closed screen instead of crashing.
  const [conceptState, setConceptState] = useState(() =>
    currentConcept ? (getState(currentConcept.conceptId) || {}) : {})
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [micCheckState, setMicCheckState] = React.useState('idle')
  const [micFailed, setMicFailed] = React.useState(false)

  const ACTIVE_CONCEPT_ID = currentConcept?.conceptId ?? null
  const conceptConfig = ACTIVE_CONCEPT_ID ? CONCEPT_VIEW_CONFIG[ACTIVE_CONCEPT_ID] : undefined
  const phaseMap = {
    introduced: 'teach', practicing: 'guide',
    accurate_with_support: 'confirm', accurate_without_support: 'release', owned: 'release'
  }
  const currentPhase = phaseMap[conceptState?.ownership_state || 'introduced']
  const motesartStudentState = useMotesartStudentState({
    ageBand: studentProfile?.ageBand || studentProfile?.age_band,
    currentPhase,
    currentConcept: ACTIVE_CONCEPT_ID,
    conceptConfig,
    wylSignals: wylProfile,
    dpmSignals: conceptState
  })
  const motesartAvatar = studentProfile?.coachAvatar ||
    studentProfile?.avatar ||
    DEFAULT_MOTESART_AVATAR
  const teachingStepRef = React.useRef(0)
  const handleStudentInputRef = React.useRef(null)
  const practiceViewRef = React.useRef('cockpit')
  const quizCorrectRef = React.useRef(0)
  const practiceCorrectRef = React.useRef(0)
  React.useEffect(() => { practiceViewRef.current = practiceView }, [practiceView])

  const showDebug = React.useMemo(() => {
    try { return (new URLSearchParams(window.location.search)).get('debug') === '1' || studentProfile?.role === 'admin' }
    catch { return false }
  }, [studentProfile?.role])

  React.useEffect(() => {
    _onMicFail = () => setMicFailed(true)
    return () => { _onMicFail = null }
  }, [])

  const THEORY_STEPS = currentConcept?.steps ?? []

  const advanceTeaching = React.useCallback(async (step) => {
    if (step >= THEORY_STEPS.length) {
      setCoaching({ message: `Lesson complete! You learned ${currentConcept.concept}.`, speaking: false, tags: ['Complete'] })
      if (currentConcept?.nextConcept) {
        setTimeout(() => { window.location.href = '/practice-live?concept=' + currentConcept.nextConcept }, 2000)
      }
      setLessonComplete({ engagement: { attentionScore: 100 } })
      return
    }
    teachingStepRef.current = step
    setTeachingStep(step)
    const current = THEORY_STEPS[step]

    if (current.stage === 'teach') {
      quizCorrectRef.current = 0
      practiceCorrectRef.current = 0
      setPracticeCorrect(0)
    }

    if (current.type === 'speak') {
      setAwaitingResponse(false)
      setRetryMode(false)
      setPromptMode(false)
      setTheoryIsSpeaking(true)
      // Stop mic while Motesart is speaking to prevent speaker bleed
      stopListening()
      setCoaching({ message: current.text, speaking: true, tags: ['Teaching'] })
      try {
        console.log('[Motesart] speaking:', current.text.substring(0, 40))
        // ── api.speakText routes to Railway via VITE_RAILWAY_URL ──
        await api.speakText(sanitizeTTS(current.text), 'coach')
        setTtsUnavailable(false)
      } catch (err) {
        console.warn('[WYLPracticeLive] TTS failed:', err.message)
        setTtsUnavailable(true)
        await new Promise(r => setTimeout(r, Math.max(2000, current.text.split(' ').length * 350)))
      }
      setTheoryIsSpeaking(false)
      setCoaching(prev => ({ ...prev, speaking: false }))
      // Natural pause before advancing
      await new Promise(r => setTimeout(r, 400))
      advanceTeaching(step + 1)
    } else if (current.type === 'listen' || current.type === 'live_practice' || current.type === 'prove_it') {
      setAwaitingResponse(true)
      setRetryMode(false)
      setPromptMode(false)
      setTheoryIsSpeaking(false)
      const promptText = current.type === 'live_practice'
        ? buildPracticePrompt(current, practiceCorrectRef.current)
        : current.text || 'Your turn! I am listening...'
      setCoaching({ message: promptText, speaking: false, tags: [current.type === 'live_practice' ? 'Practice' : 'Listening'] })
      // Restart WYL mic only when NOT in concept view (concept view uses PCV's own mic)
      if (micAllowed && practiceViewRef.current !== 'concept') {
        setTimeout(() => {
          startListening((transcript) => handleStudentInputRef.current?.(transcript))
        }, 500)
      }
      // 15s silence — gentle prompt only, never auto-advance
      const timeout = setTimeout(() => {
        setPromptMode(true)
        setCoaching({ message: "Take your time — I am still listening.", speaking: false, tags: ['Encouraging'] })
      }, 15000)
      setResponseTimeout(timeout)
    }
  }, [THEORY_STEPS, currentConcept])

  const speakMotesart = React.useCallback(async (text) => {
    await api.speakText(sanitizeTTS(text), 'coach')
  }, [])

  const handleStudentInput = React.useCallback(async (transcript) => {
    if (!transcript || transcript.trim().length < 1) return
    // Gate: ignore noise/empty input
    if (!transcript || transcript.trim().length < 2) return
    // If not in a listen step, give gentle feedback
    if (!awaitingResponse) {
      setCoaching({ message: "Hold on — let me finish my thought first.", speaking: false, tags: ['Wait'] })
      return
    }

    setLastTranscript(transcript)
    const step = teachingStepRef.current
    const current = THEORY_STEPS[step]
    if (!current || (current.type !== 'listen' && current.type !== 'live_practice' && current.type !== 'prove_it')) return

    if (responseTimeout) clearTimeout(responseTimeout)

    const heard = transcript.toLowerCase().trim()
    const expected = current.expect
    const evaluation = evaluateStudentResponse(heard, expected, current.prompt, currentConcept.concept)
    const readyCheckAccepted = current.prompt === 'ready_check' && (
      expected?.some(e => e.toLowerCase().trim() === heard) ||
      /^(yes|yeah|yep|sure|ready|ok|okay|lets go|let's go|yea|i am|i'm ready|im ready|go|let us go|let go)$/.test(heard)
    )
    const acceptedAsCorrect = evaluation.correct || readyCheckAccepted

    if (current.stage === 'ready' && evaluation.reason !== 'question_or_confusion') {
      if (readyCheckAccepted) {
        console.log('[Motesart] Heard:', heard, '| Expected:', expected, '| Eval:', 'ready_acknowledged', true)
        setStudentEmotion('happy')
        setAwaitingResponse(false)
        setRetryMode(false)
        setPromptMode(false)
        await new Promise(r => setTimeout(r, 300))
        advanceTeaching(step + 1)
      } else {
        console.log('[Motesart] Heard:', heard, '| Expected:', expected, '| Eval:', 'ready_prompt', false)
        setStudentEmotion('neutral')
        setRetryMode(true)
        setPromptMode(false)
        const readyPrompt = 'Say yes or ready when you are ready to begin.'
        setCoaching({ message: readyPrompt, speaking: true, tags: ['Ready'] })
        try {
          await speakMotesart(readyPrompt)
        } catch (err) {
          console.error('[Motesart] ready-check prompt TTS failed silently', err)
        }
        setCoaching(prev => ({ ...prev, speaking: false }))
      }
      return
    }

    const projectedStudentState = {
      ...motesartStudentState,
      correctStreak: acceptedAsCorrect ? (motesartStudentState.correctStreak || 0) + 1 : 0,
      incorrectStreak: acceptedAsCorrect ? 0 : (motesartStudentState.incorrectStreak || 0) + 1,
      masteryDetected: acceptedAsCorrect && (motesartStudentState.correctStreak || 0) + 1 >= 2
    }
    const engineDecision = runMotesartThinkingEngine({
      userMessage: heard,
      routeContext: {
        pathname: window.location.pathname,
        component: 'WYLPracticeLive'
      },
      lessonContext: {
        lessonId,
        phase: currentPhase,
        step: teachingStepRef.current,
        prompt: current.prompt
      },
      conceptContext: {
        conceptId: ACTIVE_CONCEPT_ID,
        concept: currentConcept.concept,
        promptType: current.prompt
      },
      studentState: projectedStudentState,
      conceptConfig
    })
    const motesartReply = engineDecision.shouldUseMotesart
      ? buildMotesartVoiceResponse({ engineDecision, conceptConfig, studentState: projectedStudentState })
      : evaluation.motesartReply

    if (engineDecision.shouldUseMotesart) {
      motesartStudentState.recordStudentSignal({
        isCorrect: acceptedAsCorrect,
        studentMessage: heard,
        teachingMode: engineDecision.teachingMode,
        confusionDetected: evaluation.reason === 'question_or_confusion' || engineDecision.teachingMode === 'SIMPLIFY',
        masteryDetected: engineDecision.teachingMode === 'CELEBRATE_PROGRESS'
      })
    }

    if (import.meta.env.DEV) {
      console.log('[MotesartEngine]', {
        motesart_engine_used: engineDecision.shouldUseMotesart,
        teachingMode: engineDecision.teachingMode,
        speechMode: engineDecision.speechMode,
        bloomLevel: engineDecision.bloomLevel,
        zpdLevel: engineDecision.zpdLevel,
        concept: engineDecision.concept
      })
    }

    console.log('[Motesart] Heard:', heard, '| Expected:', expected, '| Eval:', evaluation.reason, evaluation.correct)

    try {
      tamiStackRef.current?.intelligence?.processEvaluation({
        isCorrect: acceptedAsCorrect,
        isWrong: !acceptedAsCorrect && evaluation.reason !== 'question_or_confusion',
        isTimeout: false,
        concept: ACTIVE_CONCEPT_ID || 'unknown',
        responseTimeMs: 0
      })
      if (import.meta.env.DEV) {
        console.log('[TAMi Wire] processEvaluation fired — isCorrect:', acceptedAsCorrect, ', concept:', ACTIVE_CONCEPT_ID)
      }
    } catch(e) { /* never crash the lesson */ }

    if (evaluation.reason === 'question_or_confusion') {
      const currentStep = THEORY_STEPS[step]
      const conceptKey = currentConcept?.conceptId || ''
      let helpResponse = ''

      if (currentStep?.type === 'prove_it' || currentStep?.stage === 'prove') {
        helpResponse = 'Take your best shot — no hints this time. Just say what you know.'
      } else if (currentStep?.type === 'live_practice') {
        helpResponse = 'Tell me what you played. Just describe the two keys out loud.'
      } else if (currentStep?.type === 'listen' && conceptKey === 'T_MAJOR_SCALE_PATTERN') {
        helpResponse = "I hear you — not sure what to say. Just say the number pairs that stay together — like 3 and 4, or 7 and 8. That's it."
      } else if (currentStep?.type === 'listen' && conceptKey === 'T_HALF_STEP') {
        helpResponse = 'Just say the two key numbers or names that make a half step. Like E and F, or 3 and 4.'
      } else if (currentStep?.type === 'listen' && conceptKey === 'T_WHOLE_STEP') {
        helpResponse = 'Just say how many keys a whole step skips, or give me an example — like C to D.'
      } else {
        helpResponse = "Good question. Stay with me — just say your answer out loud. It doesn't have to be perfect."
      }

      setCoaching({ message: helpResponse, speaking: true, tags: ['Explain'] })
      try {
        await speakMotesart(helpResponse)
      } catch (err) {
        console.error('[Motesart] confusion response TTS failed silently', err)
      }
      setCoaching(prev => ({ ...prev, speaking: false }))
      return
    }

    const firstQuizStep = THEORY_STEPS.findIndex(s => s.stage === 'quiz')
    const returnToQuiz = current.proveFailStep ?? (firstQuizStep >= 0 ? firstQuizStep : step)
    const reviewAndAdvance = async (message, targetStep) => {
      setAwaitingResponse(false)
      setCoaching({ message, speaking: true, tags: ['Review'] })
      try {
        await speakMotesart(message)
      } catch (err) {
        console.warn('[WYLPracticeLive] Review TTS failed:', err.message)
      }
      setCoaching(prev => ({ ...prev, speaking: false }))
      await new Promise(r => setTimeout(r, 500))
      advanceTeaching(targetStep)
    }
    const finishQuizAttempt = async () => {
      setAwaitingResponse(false)
      await new Promise(r => setTimeout(r, 800))
      if (current.quizEnd) {
        if (quizCorrectRef.current >= 2) {
          advanceTeaching(step + 1)
        } else {
          await reviewAndAdvance(QUIZ_REVIEW_TEXT, current.quizFailStep ?? 0)
        }
      } else {
        advanceTeaching(step + 1)
      }
    }

    if (acceptedAsCorrect) {
      setStudentEmotion('happy')
      setAwaitingResponse(false)

      if (current.stage === 'quiz') {
        quizCorrectRef.current += 1
      }

      if (current.type === 'live_practice') {
        const nextPracticeCorrect = practiceCorrectRef.current + 1
        practiceCorrectRef.current = nextPracticeCorrect
        setPracticeCorrect(nextPracticeCorrect)
        const target = current.practiceTarget || PRACTICE_TARGET
        const affirmText = nextPracticeCorrect >= target
          ? 'Practice locked. Onward.'
          : `Yes. Practice ${nextPracticeCorrect} of ${target}. Give me one more.`
        setCoaching({ message: affirmText, speaking: true, tags: ['Affirm'] })
        try {
          await speakMotesart(affirmText)
        } catch(e) {
          console.warn('[WYLPracticeLive] Affirm TTS failed:', e.message)
        }
        setCoaching(prev => ({ ...prev, speaking: false }))
        if (nextPracticeCorrect >= target) {
          await new Promise(r => setTimeout(r, 600))
          setRetryMode(false)
          setPromptMode(false)
          advanceTeaching(step + 1)
        } else {
          setAwaitingResponse(true)
          setRetryMode(false)
          setPromptMode(false)
          setCoaching({ message: buildPracticePrompt(current, nextPracticeCorrect), speaking: false, tags: ['Practice'] })
        }
        return
      }

      if (current.type === 'prove_it' || current.stage === 'prove') {
        const lockedText = current.lockedText || `${currentConcept.concept} locked.`
        setCoaching({ message: lockedText, speaking: true, tags: ['Complete'] })
        try {
          await speakMotesart(lockedText)
        } catch(e) {
          console.warn('[WYLPracticeLive] Prove-it TTS failed:', e.message)
        }
        setCoaching(prev => ({ ...prev, speaking: false }))
        await new Promise(r => setTimeout(r, 800))
        setRetryMode(false)
        setPromptMode(false)
        advanceTeaching(step + 1)
        return
      }

      if (current.prompt !== 'ready_check') {
        const affirmText = buildCorrectAnswerResponse()
        setCoaching({ message: affirmText, speaking: true, tags: ['Affirm'] })
        try {
          // ── api.speakText routes to Railway via VITE_RAILWAY_URL ──
          await speakMotesart(affirmText)
        } catch(e) {
          console.warn('[WYLPracticeLive] Affirm TTS failed:', e.message)
        }
        setCoaching(prev => ({ ...prev, speaking: false }))
      }
      // Natural pause before advancing after correct answer
      setRetryMode(false)
      setPromptMode(false)
      if (current.stage === 'quiz') {
        await finishQuizAttempt()
      } else {
        await new Promise(r => setTimeout(r, 800))
        advanceTeaching(step + 1)
      }
      try {
        tamiStackRef.current?.intelligence?.processConfidenceUpdate({ concept: ACTIVE_CONCEPT_ID, delta: +10 })
        if (import.meta.env.DEV) console.log('[TAMi Wire] processConfidenceUpdate fired — concept:', ACTIVE_CONCEPT_ID, ', delta: +10')
      } catch(e) { /* never crash the lesson */ }
    } else if (evaluation.reason === 'partial') {
      setStudentEmotion('neutral')
      setRetryMode(true)
      setPromptMode(false)
      const partialResponse = buildPartialAnswerResponse()
      setCoaching({ message: partialResponse, speaking: true, tags: ['Partial'] })
      try {
        await speakMotesart(partialResponse)
      } catch (err) {
        console.error('[Motesart] partial-answer TTS failed silently', err)
      }
      setCoaching(prev => ({ ...prev, speaking: false }))
    } else {
      setStudentEmotion('confused')
      setRetryMode(true)
      setPromptMode(false)
      setCoaching({ message: motesartReply || 'Almost! Try again. I am listening.', speaking: false, tags: ['Retry'] })
      try {
        const activeWYLProfile = {
          dominantMode: tamiStackRef.current?.profileManager?.getReinforcementMode?.()
        }
        const ageBand = studentProfile?.ageBand || studentProfile?.age_band || 'teen'
        const wylDominant = getDominantWYLMode(wylProfile, activeWYLProfile) || 'visual'
        const wrongResponse = buildWrongAnswerResponse(ACTIVE_CONCEPT_ID, ageBand, wylDominant)
        setCoaching({ message: wrongResponse, speaking: true, tags: ['Retry'] })
        await speakMotesart(wrongResponse)
        setCoaching(prev => ({ ...prev, speaking: false }))
      } catch (err) {
        console.error('[Motesart] wrong-answer TTS failed silently', err)
      }
      try {
        tamiStackRef.current?.intelligence?.processConfidenceUpdate({ concept: ACTIVE_CONCEPT_ID, delta: -15 })
        if (import.meta.env.DEV) console.log('[TAMi Wire] processConfidenceUpdate fired — concept:', ACTIVE_CONCEPT_ID, ', delta: -15')
      } catch(e) { /* never crash the lesson */ }
      if (current.stage === 'quiz') {
        await finishQuizAttempt()
      } else if (current.type === 'prove_it' || current.stage === 'prove') {
        quizCorrectRef.current = 0
        await reviewAndAdvance(PROVE_REVIEW_TEXT, returnToQuiz)
      }
    }
  }, [awaitingResponse, THEORY_STEPS, responseTimeout, advanceTeaching, speakMotesart, ACTIVE_CONCEPT_ID, conceptConfig, currentConcept?.concept, currentPhase, lessonId, motesartStudentState, studentProfile?.ageBand, studentProfile?.age_band, wylProfile])
  handleStudentInputRef.current = handleStudentInput

  const startLesson = React.useCallback(async () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      await audioCtx.resume()
      await loadVoices()
      window.speechSynthesis.cancel()
      const micOk = await ensureMicPermission()
      if (!micOk) {
        setMicError('Microphone access blocked. Please allow and retry.')
        setMicCheckState('denied')
        setCoaching({ message: 'Mic unavailable — type your answer instead.', speaking: false, tags: ['Setup'] })
      } else {
        setMicCheckState('ready')
        setMicError(null)
        setCoaching({ message: 'Mic ready ✅ — Speak a test word: Hello', speaking: false, tags: ['Setup'] })
        await new Promise(r => setTimeout(r, 1500))
      }
      setSessionStarted(true)
    } catch (err) {
      console.error('Start lesson error:', err)
      setSessionStarted(true)
    }
  }, [loadVoices])

  React.useEffect(() => {
    if (!sessionStarted) return
    setIsListeningActive(true)
    const t = setTimeout(() => advanceTeaching(0), 600)
    return () => clearTimeout(t)
  }, [sessionStarted])

  React.useEffect(() => {
    // Only start WYL recognition when NOT in concept view; concept view uses PCV's own mic.
    if (isListeningActive && practiceViewRef.current !== 'concept') {
      startListening((transcript) => handleStudentInputRef.current?.(transcript))
    }
    return () => stopListening()
  }, [isListeningActive, practiceView])

  // Stop WYL recognition immediately on entering concept view
  React.useEffect(() => {
    if (practiceView === 'concept') stopListening()
  }, [practiceView])

  const getCurrentMoment = useCallback(() => currentMoment, [currentMoment])
  const { initQuestionHandler, handleStudentQuestion, questionHandlerRef, questionHistory } =
    useTamiQuestions({
      engineRef, tamiStackRef, bridgeRef, setCoaching, setCurrentVisual,
      getCurrentMoment, inputResolver, handleStudentInput,
    })

  const objective = lessonInfo ? `${lessonInfo.title}` : 'Loading lesson...'

  useEffect(() => {
    if (paused || lessonComplete) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [paused, lessonComplete])

  const fmtTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) { videoRef.current.srcObject = stream; setCameraReady(true) }
      } catch (err) {
        console.log('Camera not available:', err.message)
        setCameraError(err.message.includes('denied') ? 'Camera access denied. You can still continue without it.' : err.message)
      }
    }
    startCamera()
    return () => {
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    async function initLesson() {
      const ui = createUIBridge({
        setCurrentMoment, setCurrentVisual, setCoaching, setFeedback,
        setCelebration, setReinforcement, setActiveTones, setDebugState,
        setLessonInfo, setLessonComplete, setWaitingForInput, setInputResolver,
      })
      uiBridgeRef.current = ui

      const { MotesartLessonEngine } = await import('../lesson_engine/motesart_lesson_engine.js')
      const { LessonOrchestrator } = await import('../lesson_engine/lesson_orchestrator.js')
      const { TAMiBridge } = await import('../lesson_engine/tami_bridge.js')
      const { TAMiIntelligenceLayer } = await import('../lesson_engine/tami_intelligence_layer.js')
      const { TAMiResponseContract } = await import('../lesson_engine/tami_response_contract.js')
      const { TAMiStrategyResolver } = await import('../lesson_engine/tami_strategy_resolver.js')
      const { TAMiMicroMemory } = await import('../lesson_engine/tami_micro_memory.js')
      const { TAMiStateManager } = await import('../lesson_engine/tami_state_manager.js')
      const { TAMiTimingEngine } = await import('../lesson_engine/tami_timing_engine.js')
      const { TAMiDifficultyLadder } = await import('../lesson_engine/tami_difficulty_ladder.js')
      const { TAMiProfileManager } = await import('../lesson_engine/tami_teaching_profiles.js')

      const engine = new MotesartLessonEngine()
      const orchestrator = new LessonOrchestrator(engine, ui, {
        enableDebug: true, difficulty: 'beginner',
        visualRegistryPath: '/lesson_data/visual_asset_registry.json',
      })

      if (typeof window !== 'undefined') {
        window.TAMiDifficultyLadder = TAMiDifficultyLadder
        window.TAMiProfileManager = TAMiProfileManager
      }

      const tami = TAMiBridge.createStack({
        engine, orchestrator, apiUrl: API_URL, debugMode: false,
        config: {
          intelligence: { maxAICallsPerLesson: 10 },
          timing: {}, resolver: {},
          memory: { windowMinutes: 10 }, difficulty: {},
        },
      })

      if (tami.difficultyLadder) {
        const conceptIds = ['C_KEYBOARD','C_HALFWHOLE','C_MAJSCALE','C_CMAJOR','C_FINGERS','C_OCTAVE']
        const initialConf = {}
        conceptIds.forEach(id => { initialConf[id] = 50 })
        tami.difficultyLadder.init(conceptIds, initialConf)
      }

      if (tami.profileManager) {
        tami.profileManager.initFromWYL(wylProfile || { visual:30, auditory:25, readwrite:20, kinesthetic:25 })
      }

      await initQuestionHandler()

      tami.bridge.onAction((action) => {
        console.log('[T.A.M.i Action]', action.source, action.type, action.dialogue?.substring(0, 50))
        if (action.celebration) {
          setCelebration(action.celebration)
          setTimeout(() => setCelebration(null), 2800)
        }
        if (action.visualAsset) {
          setCurrentVisual({ component: action.visualAsset, props: { mode: action.strategyType } })
        }
      })

      engineRef.current = engine
      orchestratorRef.current = orchestrator
      bridgeRef.current = tami.bridge
      tamiStackRef.current = tami

      const { createPerceptionBridge } = await import('../lesson_engine/perception_integration.js')
      // M1 R2-FE §E — CANONICAL AUTHORITY SEPARATION. The perception bridge's
      // classifier-derived state (confidence, trend, recommended_strategy) is
      // SESSION-SCOPED adaptive-teaching signal. It must NEVER be persisted
      // into the concept-state cache: replaceState() here used to clobber the
      // server-refreshed Concept_State snapshot with engine-invented numbers,
      // creating a second mastery authority. The bridge keeps its own
      // in-memory PerceptionSession for in-lesson adaptation; ownership truth
      // stays backend-derived (Practice_Events → Concept_State) only.
      const perceptionBridge = createPerceptionBridge({
        engine, stateManager: tami.stateManager,
        studentId: studentId ?? null, // M1: never invent an identity
        onStateUpdate: () => { /* session-only — no canonical/cache persist */ },
        onError: (err) => console.warn('[Perception] Error:', err.message),
      })
      perceptionBridgeRef.current = perceptionBridge

      tami.bridge.connect({
        lessonId, studentId: studentId ?? null, // M1: never invent an identity
        studentProfile: studentProfile || {},
        wylProfile: wylProfile || { visual:30, auditory:25, readwrite:20, kinesthetic:25 },
        dpmScores: motesartStudentState.dpmSignals || { drive:50, passion:50, motivation:50, overall:50 },
        ambassadorPrompt: 'You are Motesart, a warm piano teacher.',
        lessonData: { concepts: [
          { id:'C_KEYBOARD', startConfidence:50 }, { id:'C_HALFWHOLE', startConfidence:50 },
          { id:'C_MAJSCALE', startConfidence:50 }, { id:'C_CMAJOR', startConfidence:50 },
          { id:'C_FINGERS', startConfidence:50 }, { id:'C_OCTAVE', startConfidence:50 },
        ]},
      })
    }

    console.log('[WYLPracticeLive] Theory Phase active - engine init skipped')

    return () => {
      if (bridgeRef.current) bridgeRef.current.disconnect()
      if (orchestratorRef.current) orchestratorRef.current.stop()
    }
  }, [lessonId, studentId])

  useEffect(() => {
    const handler = (e) => {
      if (!waitingForInput) return
      if (e.key === ' ') { e.preventDefault(); handleStudentInput({ type:'verbal', value:'correct', timestamp:Date.now() }) }
      else if (e.key === 'x') { e.preventDefault(); handleStudentInput({ type:'verbal', value:'wrong', timestamp:Date.now() }) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [waitingForInput, handleStudentInput])

  // M1 R2-FE §D — telemetry (numeric confidence internals) is INTERNAL
  // TOOLING. The toggle is gated on elevated roles: an ordinary student can
  // never open it — not in dev, not in production, not via the shortcut.
  const telemetryAllowed = ['teacher', 'admin', 'founder']
    .includes(String(authUser?.role || '').toLowerCase())
  useEffect(() => {
    if (!telemetryAllowed) return undefined
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') { e.preventDefault(); setShowTelemetry(prev => !prev) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [telemetryAllowed])

  const handleEnd = useCallback(async () => {
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    if (tamiStackRef.current?.stateManager) {
      console.log('[Session Export]', tamiStackRef.current.stateManager.exportForStorage())
    }
    if (perceptionBridgeRef.current) {
      console.log('[Perception Export]', perceptionBridgeRef.current.exportForStorage())
      perceptionBridgeRef.current.detach()
      perceptionBridgeRef.current = null
    }
    if (orchestratorRef.current) await orchestratorRef.current.stop()
    // Fix 5 — write practice log on session end (non-blocking)
    try {
      const user = JSON.parse(localStorage.getItem('som_user') || '{}')
      const duration_min = Math.round((timer || 0) / 60)
      await api.logPracticeSession({
        concept_ids: currentConcept?.conceptId || null,
        activity_type: 'live_practice',
        duration_min: duration_min < 1 ? 1 : duration_min,
        student_id: user.student_id || user.id || null,
        piece_name: currentConcept?.title || currentConcept?.conceptId || null,
      })
    } catch (err) {
      console.error('Practice log save failed:', String(err))
    }
    navigate('/session-summary')
  }, [navigate])

  const handlePause = useCallback(() => {
    setPaused(p => {
      if (p) orchestratorRef.current?.resume()
      else orchestratorRef.current?.pause()
      return !p
    })
  }, [])

  if (lessonComplete) {
    return (
      <>
        <style>{css}</style>
        <div className="wyl-root" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.9)' }}>
            <h2 style={{ fontFamily:'Outfit', fontSize:32, marginBottom:16 }}>Session Complete</h2>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginBottom:24 }}>
              {fmtTime(timer)} · {lessonComplete.engagement?.attentionScore || 0}% attention
            </p>
            <button className="wyl-bar__btn" onClick={() => navigate('/dashboard')} style={{ fontSize:14, padding:'10px 24px' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  React.useEffect(() => {
    console.log('[MIC DEBUG]', {
      awaitingResponse,
      studentTurn: awaitingResponse,
      promptMode,
      retryMode,
      isSpeaking: theoryIsSpeaking,
      isLoading: false,
    })
  }, [awaitingResponse, promptMode, retryMode, theoryIsSpeaking])

  if (!currentConcept) {
    // M1 R2-FE §B — FAIL CLOSED, student-safe. An unsupported or unknown
    // concept never silently becomes a different lesson; the student gets a
    // clear unavailable state and a way back. No internals are shown.
    return (
      <div data-testid="practice-unavailable" style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', height:'100vh', padding:24, textAlign:'center',
        background:'#0d1117', color:'rgba(255,255,255,0.7)',
        fontFamily:'DM Sans, sans-serif', gap:14
      }}>
        <div style={{fontFamily:'Outfit, sans-serif', fontSize:20, fontWeight:700, color:'#fff'}}>
          This practice isn{'’'}t ready yet
        </div>
        <div style={{fontSize:13, color:'rgba(255,255,255,0.45)', maxWidth:420, lineHeight:1.6}}>
          Motesart doesn{'’'}t have this lesson set up for live practice
          right now. Your assignment is safe {'—'} ask your teacher, or
          head back and try another one.
        </div>
        <button
          onClick={() => navigate('/homework')}
          style={{marginTop:6, minHeight:44, padding:'10px 26px', borderRadius:22,
            border:'none', background:'#14b8a6', color:'#fff', fontSize:13,
            fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif'}}
        >Back to Homework</button>
      </div>
    )
  }

  if (!conceptConfig) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d1117', color:'#fff', textAlign:'center', padding:'24px', fontFamily:"'DM Sans', sans-serif" }}>
      <div style={{ fontSize:'32px', marginBottom:'16px' }}>{'\u26a0\ufe0f'}</div>
      <div style={{ fontSize:'18px', fontWeight:700, fontFamily:"'Outfit', sans-serif", marginBottom:'8px' }}>Concept not configured</div>
      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', marginBottom:'24px' }}>"{ACTIVE_CONCEPT_ID}" has no Practice Live config yet.</div>
      <button onClick={() => window.history.back()} style={{ padding:'10px 24px', borderRadius:20, border:'none', background:'#14b8a6', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>Go Back</button>
    </div>
  )

  if (practiceView === 'cockpit') return (
    <PracticeSessionCockpit
      onBegin={async () => { setPracticeView('concept'); startLesson() }}
      conceptTitle={currentConcept.concept}
      conceptDesc={currentConcept.description}
      motesartSuggestion={conceptConfig?.speechTexts?.teach}
    />
  )

  if (practiceView === 'concept') return (
    <>
      <PracticeConceptView
        conceptName={coaching.concept || currentConcept.concept}
        conceptDesc={currentConcept.description}
        phase={currentPhase}
        speechText={coaching.message || ''}
        highlightedKeys={conceptConfig.highlightedKeys}
        homeKeyIndex={conceptConfig.homeKeyIndex}
        answerOptions={[]}
        correctAnswer={null}
        bpm={conceptConfig.bpm}
        autoSpeak={false}
        studentTurn={awaitingResponse}
        retryMode={retryMode}
        promptMode={promptMode}
        isSpeaking={theoryIsSpeaking}
        promptDisplay={THEORY_STEPS[teachingStep]?.prompt_display || ''}
        turnLabel={THEORY_STEPS[teachingStep]?.type === 'live_practice'
          ? `Practice ${Math.min(practiceCorrect + 1, THEORY_STEPS[teachingStep]?.practiceTarget || PRACTICE_TARGET)} of ${THEORY_STEPS[teachingStep]?.practiceTarget || PRACTICE_TARGET}`
          : ''}
        onStudentResponse={handleStudentInput}
        onStudentTextChange={() => {}}
        onReplay={() => {
          const step = THEORY_STEPS[teachingStepRef.current]
          if (step?.type === 'speak') api.speakText(sanitizeTTS(step.text), 'coach')
        }}
        onBack={() => setPracticeView('cockpit')}
      />
      {micFailed && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:9998, padding:'8px 18px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, color:'#fca5a5', fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
          Mic is having trouble. Type your answer instead.
        </div>
      )}
      {showDebug && (
        <div style={{ position:'fixed', bottom:8, right:8, zIndex:9999, background:'rgba(0,0,0,0.85)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 10px', fontSize:10, color:'rgba(255,255,255,0.7)', fontFamily:'monospace', lineHeight:1.6, pointerEvents:'none' }}>
          <div>Voice: {theoryIsSpeaking ? 'speaking' : ttsUnavailable ? 'error' : 'ready'}</div>
          <div>Mic: {micFailed ? 'error' : micCheckState === 'ready' ? 'listening' : 'idle'}</div>
          <div>Student turn: {String(awaitingResponse)}</div>
          <div>Concept: {ACTIVE_CONCEPT_ID}</div>
          <div>Step: {teachingStep}</div>
        </div>
      )}
    </>
  )

  return (
    <>
      <style>{css}</style>
      <div className="wyl-root">
        <div className="wyl-camera">
          <video ref={videoRef} autoPlay playsInline muted style={{ display: cameraReady ? 'block' : 'none' }} />
          {!sessionStarted && (
            <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(10,10,30,0.92)', zIndex:50 }}>
              <div style={{ textAlign:'center', color:'#fff' }}>
                <div style={{ fontSize:'32px', fontWeight:700, marginBottom:'8px', fontFamily:'Outfit, sans-serif' }}>Ready to Begin?</div>
                <div style={{ fontSize:'16px', opacity:0.7, marginBottom:'36px' }}>I'll use your voice and piano to guide you step-by-step.</div>
                <button onClick={startLesson} style={{ background:'linear-gradient(135deg,#6c63ff,#48c6ef)', border:'none', borderRadius:'50px', padding:'18px 48px', color:'#fff', fontSize:'20px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 24px rgba(108,99,255,0.4)', fontFamily:'Outfit, sans-serif' }}>
                  Tap to begin — I'll guide you.
                </button>
                {ttsUnavailable && (
                  <div style={{ marginTop:16, padding:'10px 20px', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:10, color:'#fbbf24', fontSize:13, maxWidth:380 }}>
                    Voice unavailable — use Replay after server wakes
                  </div>
                )}
                {micError && (
                  <div style={{ marginTop:'20px', padding:'16px 24px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'12px', color:'#fca5a5', fontSize:'15px', textAlign:'center', maxWidth:'400px' }}>
                    <div style={{ marginBottom:'8px' }}>{micError}</div>
                    <div style={{ fontSize:'12px', color:'#9ca3af', marginBottom:'12px' }}>Tap the lock icon in your address bar, set Microphone to Allow, then tap Retry.</div>
                    <button onClick={async () => {
                      try {
                        const s = await navigator.mediaDevices.getUserMedia({audio:true})
                        s.getTracks().forEach(t=>t.stop())
                        micAllowed = true
                        setMicError(null)
                        setIsListeningActive(true)
                      } catch(e) {
                        setMicError('Still blocked. Open browser Settings > Site Settings > Microphone and allow this site.')
                      }
                    }} style={{ padding:'8px 20px', background:'rgba(139,92,246,0.8)', border:'none', borderRadius:'8px', color:'white', fontSize:'14px', cursor:'pointer' }}>
                      Retry Microphone
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {!cameraReady && (
            <div className="wyl-camera-placeholder">
              <div className="wyl-camera-placeholder__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                  <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </div>
              <span className="wyl-camera-placeholder__text">{cameraError || 'Connecting camera...'}</span>
            </div>
          )}
        </div>

        <div className="wyl-nametag">
          <div className="wyl-nametag__dot" />
          <span className="wyl-nametag__name">{studentProfile?.name || 'Student'}</span>
        </div>

        <TopBar timer={fmtTime(timer)} objective={objective} paused={paused} onPause={handlePause} onEnd={handleEnd} />
        <VisualOverlay visual={currentVisual} activeTones={activeTones} />
        <MotesartCard coaching={coaching} chatOpen={chatOpen} onToggleChat={() => setChatOpen(!chatOpen)} onStudentQuestion={handleStudentQuestion} avatarSrc={motesartAvatar} />
        <CelebrationOverlay type={celebration} />
        <TelemetryPanel engineRef={engineRef} tamiStackRef={tamiStackRef} questionHistory={questionHistory} visible={showTelemetry && telemetryAllowed} />

        {ttsUnavailable && sessionStarted && (
          <div style={{ position:'absolute', top:68, left:'50%', transform:'translateX(-50%)', zIndex:20, padding:'8px 18px', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:10, color:'#fbbf24', fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
            Voice unavailable — use Replay after server wakes
          </div>
        )}

        {waitingForInput && (
          <div style={{ position:'absolute', bottom:140, right:24, zIndex:10, padding:'8px 16px', background:'rgba(0,196,154,0.15)', border:'1px solid rgba(0,196,154,0.3)', borderRadius:12, fontSize:11, color:'var(--teal)', fontWeight:600 }}>
            {waitingForInput.mode === 'midi' ? 'Play now...' : waitingForInput.mode === 'speech' ? 'Voice Mode Active' : 'Tap to respond...'}
          </div>
        )}

        {feedback && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:30, fontSize:24, fontWeight:800, fontFamily:'Outfit', color: feedback.type === 'correct' || feedback.type === 'perfect' ? 'var(--teal-bright)' : 'var(--pink)', pointerEvents:'none' }}>
            {feedback.type === 'perfect' ? 'Perfect!' : feedback.type === 'correct' ? 'Correct' : feedback.type === 'wrong' ? 'Try again' : ''}
          </div>
        )}
        {showDebug && (
          <div style={{ position:'fixed', bottom:8, right:8, zIndex:9999, background:'rgba(0,0,0,0.85)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 10px', fontSize:10, color:'rgba(255,255,255,0.7)', fontFamily:'monospace', lineHeight:1.6, pointerEvents:'none' }}>
            <div>Voice: {theoryIsSpeaking ? 'speaking' : ttsUnavailable ? 'error' : 'ready'}</div>
            <div>Mic: {micFailed ? 'error' : micCheckState === 'ready' ? 'listening' : 'idle'}</div>
            <div>Student turn: {String(awaitingResponse)}</div>
            <div>Concept: {ACTIVE_CONCEPT_ID}</div>
            <div>Step: {teachingStep}</div>
          </div>
        )}
      </div>
    </>
  )
}
