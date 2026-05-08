import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { VisualOverlay, VISUAL_COMPONENT_MAP, VISUAL_LABELS, C_MAJOR_NOTES, KeyboardDiagram } from '../components/TeachingVisuals'
import useTamiQuestions from '../hooks/useTamiQuestions'
import TelemetryPanel from '../components/TelemetryPanel'
import PracticeSessionCockpit from '../components/PracticeSessionCockpit.jsx'
import PracticeConceptView from '../components/PracticeConceptView.jsx'
import { CONCEPT_VIEW_CONFIG } from '../config/conceptViewConfig.js'
import { getState, setState } from '../lesson_engine/concept_state_store.js'
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

  const keywordMatch = expected.some(e => normalized.includes(e.toLowerCase()))
  const naturalPatterns = [
    /\b3\s*and\s*4\b/, /three\s*and\s*four/, /\be\s*(and|to)\s*f\b/,
    /next\s*to\s*each\s*other/, /neighbor/, /half\s*step/,
    /no\s*black\s*key/, /right\s*next/, /adjacent/, /closest/,
    /smallest\s*(distance|interval|move)/, /one\s*semitone/,
  ]
  const naturalMatch = naturalPatterns.some(p => p.test(normalized))

  if (keywordMatch || naturalMatch) {
    return { correct: true, confidence: keywordMatch ? 0.95 : 0.85, reason: 'matched', motesartReply: 'Yes!' }
  }

  const partialWords = ['step', 'note', 'key', 'close', 'small', 'near', 'short', 'distance']
  const partialMatch = partialWords.some(w => normalized.includes(w))

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

const CONCEPT_CONFIG_MAP = {
  'half-step': {
    concept: 'Half Step',
    description: 'The smallest distance in music — from one key to the very next key.',
    conceptId: 'T_HALF_STEP',
    steps: [
      { type: 'speak', text: "Alright. Let's start with something small — because in music, small is where everything begins. We're working on the half step." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay', 'lets go', 'yea'], prompt: 'ready_check' },
      { type: 'speak', text: "Awesome! A Half Step is the smallest distance in music. It is the distance from one key to the very next key with nothing in between. Like from E to F, or B to C. Say it back to me: Half Step." },
      { type: 'listen', expect: ['half', 'half step', 'have'], prompt: 'call_response' },
      { type: 'speak', text: "Perfect! Look at the piano — keys 3 and 4 are E and F. There is no black key between them, so E to F is a Half Step. Now here is the big secret: the Whole Half pattern unlocks all 12 major scales. Say it with me: Whole, Whole, Half, Whole, Whole, Whole, Half." },
      { type: 'listen', expect: ['whole', 'half'], prompt: 'pattern_repeat' },
      { type: 'speak', text: "Let us do call and response. I say it, you echo it. Ready?" },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok'], prompt: 'ready_check' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Half." },
      { type: 'listen', expect: ['half', 'have'], prompt: 'call_response' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Half." },
      { type: 'listen', expect: ['half', 'have'], prompt: 'call_response' },
      { type: 'speak', text: "You did it! That pattern works for EVERY major scale. C major, G major, D major, all 12 of them. What is the pattern one more time?" },
      { type: 'listen', expect: ['whole', 'half'], prompt: 'full_pattern' },
      { type: 'speak', text: "Excellent work! You now know the Half Step and the master pattern that unlocks all 12 major scales. Great job today!" },
    ]
  },
  'whole-step': {
    concept: 'Whole Step',
    description: 'A step that skips one key — twice the size of a half step.',
    conceptId: 'T_WHOLE_STEP',
    steps: [
      { type: 'speak', text: "Good. You know the half step. Now let's go one further. The whole step skips a key — twice the distance. Let's find it." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "Great! A Whole Step is twice as big as a Half Step. Instead of going to the very next key, you skip one and go to the key after that. From C to D — there is a black key in between, so that is a Whole Step. Say it back: Whole Step." },
      { type: 'listen', expect: ['whole', 'whole step'], prompt: 'call_response' },
      { type: 'speak', text: "Nice! Look at keys 1 and 3 on the piano. That is C and E — one key between them. A Whole Step. Now let us do call and response. I say it, you echo it. Ready?" },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok'], prompt: 'ready_check' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Whole." },
      { type: 'listen', expect: ['whole'], prompt: 'call_response' },
      { type: 'speak', text: "Now tell me in your own words — what is a Whole Step?" },
      { type: 'listen', expect: ['whole', 'skip', 'two', 'twice', 'jump', 'over', 'between', 'black key'], prompt: 'full_pattern' },
      { type: 'speak', text: "Fantastic! A Whole Step skips one key. You now know both the Half Step and the Whole Step — the two building blocks of every scale in music. Amazing work today!" },
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
  'major-scale-pattern': {
    concept: 'Major Scale Pattern',
    description: 'The Whole-Whole-Half formula that builds every major scale.',
    conceptId: 'T_MAJOR_SCALE_PATTERN',
    steps: [
      { type: 'speak', text: "Every major scale follows the same pattern: Whole, Whole, Half, Whole, Whole, Whole, Half. Seven steps. Same order every time. This is what makes a scale sound major." },
      { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay'], prompt: 'ready_check' },
      { type: 'speak', text: "C major: start on C. Whole step to D. Whole step to E. Half step to F. Say those first three steps." },
      { type: 'listen', expect: ['whole whole half', 'whole, whole, half', 'w w h', 'whole step whole step half step', 'whole whole half step'], prompt: 'call_response' },
      { type: 'speak', text: "Good. Whole, Whole, Half. Continue: Whole to G. Whole to A. Whole to B. Half back to C. What is the step that follows three wholes in a row?" },
      { type: 'listen', expect: ['half', 'half step', 'have', 'h'], prompt: 'full_pattern' },
      { type: 'speak', text: "Correct. Half. The full pattern: Whole, Whole, Half, Whole, Whole, Whole, Half. Say the complete pattern." },
      { type: 'listen', expect: ['whole', 'half', 'w w h w w w h', 'whole whole half whole whole whole half'], prompt: 'full_pattern' },
      { type: 'speak', text: "That is the key. Same pattern works for all 12 major keys — different starting note, same sequence every time." },
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
  }
}

const AVATAR_SRC = '/motesart-avatar.png'
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

function MotesartCard({ coaching, onToggleChat, chatOpen, onStudentQuestion }) {
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
          <div className="mc__av"><img src={AVATAR_SRC} alt="Motesart" /></div>
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

  // Concept routing — read ?concept= from URL, stable for session lifetime
  const currentConcept = React.useMemo(() => {
    try {
      const slug = new URLSearchParams(window.location.search).get('concept') || 'half-step'
      return CONCEPT_CONFIG_MAP[slug] || null
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
  const [responseTimeout, setResponseTimeout] = React.useState(null)
  const [conceptState, setConceptState] = useState(() => getState(currentConcept.conceptId) || {})
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [micCheckState, setMicCheckState] = React.useState('idle')
  const [micFailed, setMicFailed] = React.useState(false)

  const ACTIVE_CONCEPT_ID = currentConcept.conceptId
  const conceptConfig = CONCEPT_VIEW_CONFIG[ACTIVE_CONCEPT_ID]
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
  const teachingStepRef = React.useRef(0)
  const handleStudentInputRef = React.useRef(null)
  const practiceViewRef = React.useRef('cockpit')
  React.useEffect(() => { practiceViewRef.current = practiceView }, [practiceView])

  const showDebug = React.useMemo(() => {
    try { return (new URLSearchParams(window.location.search)).get('debug') === '1' || studentProfile?.role === 'admin' }
    catch { return false }
  }, [studentProfile?.role])

  React.useEffect(() => {
    _onMicFail = () => setMicFailed(true)
    return () => { _onMicFail = null }
  }, [])

  const THEORY_STEPS = currentConcept.steps

  const advanceTeaching = React.useCallback(async (step) => {
    if (step >= THEORY_STEPS.length) {
      setCoaching({ message: 'Lesson complete! You learned the major scale pattern.', speaking: false, tags: ['Complete'] })
      setLessonComplete({ engagement: { attentionScore: 100 } })
      return
    }
    teachingStepRef.current = step
    setTeachingStep(step)
    const current = THEORY_STEPS[step]

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
    } else if (current.type === 'listen') {
      setAwaitingResponse(true)
      setRetryMode(false)
      setPromptMode(false)
      setTheoryIsSpeaking(false)
      setCoaching({ message: 'Your turn! I am listening...', speaking: false, tags: ['Listening'] })
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
  }, [THEORY_STEPS])

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
    if (!current || current.type !== 'listen') return

    if (responseTimeout) clearTimeout(responseTimeout)

    const heard = transcript.toLowerCase().trim()
    const expected = current.expect
    const evaluation = evaluateStudentResponse(heard, expected, current.prompt, 'The Half Step')
    const acceptedAsCorrect = evaluation.correct || current.prompt === 'ready_check'
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

    if (evaluation.reason === 'question_or_confusion') {
      setCoaching({ message: motesartReply, speaking: false, tags: ['Explain'] })
      return
    }

    if (acceptedAsCorrect) {
      setStudentEmotion('happy')
      setAwaitingResponse(false)

      if (current.prompt === 'call_response') {
        const affirmText = motesartReply || 'Yes!'
        setCoaching({ message: affirmText, speaking: true, tags: ['Affirm'] })
        try {
          // ── api.speakText routes to Railway via VITE_RAILWAY_URL ──
          await api.speakText(sanitizeTTS(affirmText), 'coach')
        } catch(e) {
          console.warn('[WYLPracticeLive] Affirm TTS failed:', e.message)
        }
      }
      // Natural pause before advancing after correct answer
      await new Promise(r => setTimeout(r, 800))
      setRetryMode(false)
      setPromptMode(false)
      advanceTeaching(step + 1)
    } else if (evaluation.reason === 'partial') {
      setStudentEmotion('neutral')
      setRetryMode(true)
      setPromptMode(false)
      setCoaching({ message: motesartReply, speaking: false, tags: ['Partial'] })
    } else {
      setStudentEmotion('confused')
      setRetryMode(true)
      setPromptMode(false)
      setCoaching({ message: motesartReply || 'Almost! Try again. I am listening.', speaking: false, tags: ['Retry'] })
    }
  }, [awaitingResponse, THEORY_STEPS, responseTimeout, advanceTeaching, ACTIVE_CONCEPT_ID, conceptConfig, currentConcept.concept, currentPhase, lessonId, motesartStudentState])
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
      const { replaceState: storeReplaceState } = await import('../lesson_engine/concept_state_store.js')

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
      const perceptionBridge = createPerceptionBridge({
        engine, stateManager: tami.stateManager,
        studentId: studentId || 'default_student',
        onStateUpdate: (conceptId, state) => {
          storeReplaceState(conceptId, state)
        },
        onError: (err) => console.warn('[Perception] Error:', err.message),
      })
      perceptionBridgeRef.current = perceptionBridge

      tami.bridge.connect({
        lessonId, studentId: studentId || 'default_student',
        studentProfile: studentProfile || {},
        wylProfile: wylProfile || { visual:30, auditory:25, readwrite:20, kinesthetic:25 },
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

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') { e.preventDefault(); setShowTelemetry(prev => !prev) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
    const badSlug = new URLSearchParams(window.location.search).get('concept')
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', height:'100vh',
        background:'#0d1117', color:'rgba(255,255,255,0.7)',
        fontFamily:'DM Sans, sans-serif', gap:16
      }}>
        <div style={{fontSize:18, color:'#ef4444'}}>
          Concept not found: {badSlug || '(none)'}
        </div>
        <div style={{fontSize:13, color:'rgba(255,255,255,0.4)'}}>
          Check the assignment or URL parameter.
        </div>
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
        conceptDesc="The closest distance between two notes"
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
        <MotesartCard coaching={coaching} chatOpen={chatOpen} onToggleChat={() => setChatOpen(!chatOpen)} onStudentQuestion={handleStudentQuestion} />
        <CelebrationOverlay type={celebration} />
        <TelemetryPanel engineRef={engineRef} tamiStackRef={tamiStackRef} questionHistory={questionHistory} visible={showTelemetry} />

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
