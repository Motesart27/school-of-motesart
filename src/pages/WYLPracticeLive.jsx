import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { VisualOverlay, VISUAL_COMPONENT_MAP, VISUAL_LABELS, C_MAJOR_NOTES, KeyboardDiagram } from '../components/TeachingVisuals'
import useTamiQuestions from '../hooks/useTamiQuestions'
import TelemetryPanel from '../components/TelemetryPanel'
import PracticeSessionCockpit from '../components/PracticeSessionCockpit.jsx'
import PracticeConceptView from '../components/PracticeConceptView.jsx'
import { CONCEPT_VIEW_CONFIG } from '../config/conceptViewConfig.js'
import { getState, setState } from '../lesson_engine/concept_state_store.js'

// ============================================
// PHASE 1A: Real-Time Adaptive Teaching Layer
// ===========================================

// --- Intent Parser (Claude API) -
const INTENT_SYSTEM_PROMPT = [
  'You are an intent classification engine for a real-time music teaching system.',
  'Analyze short student input and return structured JSON.',
  'OUTPUT: { "intent": "", "confidence": 0.0, "emotion": "", "content": "", "correctness": null }',
  'INTENT TYPES: answer_attempt, uncertain_answer, question, confusion, affirmation, hesitation, silence, off_topic',
  'EMOTIONS: confident, neutral, hesitant, frustrated, curious, disengaged',
  'CORRECTNESS: true, false, partial, or null. Be generous with beginners.'
].join(' ');

async function parseIntent(transcript, context) {
  if (!transcript || transcript.trim().length === 0) {
    return { intent: 'silence', confidence: 1.0, emotion: 'neutral', content: '', correctness: null };
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
    });
    const data = await resp.json();
    const text = data.content && data.content[0] ? data.content[0].text : '{}';
    return JSON.parse(text);
  } catch (err) {
    console.error('Intent parse error:', err);
    return { intent: 'answer_attempt', confidence: 0.5, emotion: 'neutral', content: transcript, correctness: null };
  }
}

// --- Speech Recognition ---
let _recognition = null;
let _isListening = false;
let _onTranscript = null;
// Ensure mic permission before speech recognition
async function ensureMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    console.log("Mic permission granted");
    return true;
  } catch (err) {
    console.error("Mic permission denied:", err);
    return false;
  }
}


function startListening(onTranscript) {
  if (_isListening) return;
  if (!micAllowed) { console.error("Mic not allowed"); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('SpeechRecognition not supported'); return; }
  _onTranscript = onTranscript;
  _recognition = new SR();
  _recognition.lang = 'en-US';
  _recognition.continuous = true;
  _recognition.interimResults = true;
  _recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (event.results[event.results.length - 1].isFinal && _onTranscript) {
      _onTranscript(transcript.trim());
    }
  };
  _recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'audio-capture') { _isListening = false; } else if (e.error !== 'no-speech') {
      setTimeout(() => { _isListening = false; startListening(_onTranscript); }, 1000);
    }
  };
  _recognition.onend = () => { if (_isListening) { try { _recognition.start(); } catch(e) {} } };
  _recognition.start();
  _isListening = true;
}

function stopListening() {
  _isListening = false;
  if (_recognition) { try { _recognition.stop(); } catch(e) {} _recognition = null; }
}

// --- Silence Detection ---
let _silenceTimer = null;
function resetSilenceTimer(onSilence, delay) {
  clearTimeout(_silenceTimer);
  _silenceTimer = setTimeout(() => { if (onSilence) onSilence(); }, delay || 5000);
}
function clearSilenceTimer() { clearTimeout(_silenceTimer); }

// --- Processing Guard ---
let _isProcessing = false;


// Module-level AudioContext for TTS playback (bypasses Chrome autoplay policy)
let _audioCtx = null
    let _currentSource = null
function getAudioContext() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return _audioCtx
}
// Unlock audio on first user interaction
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

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
   WYL Practice Live ÃÂ¢ÃÂÃÂ Full-Screen Practice Session with T.A.M.i
   ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
   Stage 4: Replaces the mock WYLPractice ith a live session
   wired to the Lesson Engine, Orchestrator, and T.A.M.i Bridge.

   This component:
   1. Loads the lesson engine + orchestrator
   2. Creates the full T.A.M.i stack (bridge, resolver, timing, memory)
   3. Implements the UI interface the orchestrator expects
   4. Renders teaching actions (dialogue, visuals, celebrations)
   5. Forwards student responses back to the engine

   All existing UI elements (camera, top bar, Motesart card,
   demo zoom, PIS sidebar) are preserved from the original.
   ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */

const AVATAR_SRC = '/motesart-avatar.png'
const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ CSS (unchanged from original WYLPractice) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
// NOTE: In production, move this to a .css file or Tailwind classes.
// Keeping inline for drop-in compatibility with the original.
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

/* Camera */
.wyl-camera { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.wyl-camera video { width:100%; height:100%; object-fit:cover; }
.wyl-camera-placeholder { position:absolute; inset:0; background:linear-gradient(150deg,#14142a 0%,#1c1c3a 50%,#1a1a30 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; }
.wyl-camera-placeholder__icon { width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; }
.wyl-camera-placeholder__text { font-size:13px; color:rgba(255,255,255,0.25); }

/* Nametag */
.wyl-nametag { position:absolute; top:76px; left:20px; display:flex; align-items:center; gap:6px; padding:4px 10px 4px 6px; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); border-radius:12px; z-index:5; }
.wyl-nametag__dot { width:6px; height:6px; border-radius:50%; background:#ff4f6e; animation:wylPulse 2s infinite; }
.wyl-nametag__name { font-size:11px; font-weight:600; color:rgba(255,255,255,0.9); }

/* Top Bar */
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

/* Motesart Card */
.mc { position:absolute; bottom:24px; left:24px; z-index:10; animation:mcSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
@keyframes mcSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.mc__main { display:flex; gap:16px; align-items:center; padding:18px 24px; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); box-shadow:0 12px 40px rgba(0,0,0,0.4); cursor:pointer; transition:box-shadow 0.2s,border-color 0.2s,border-radius 0.3s; min-width:260px; }
.mc__main:hover { box-shadow:0 14px 48px rgba(0,0,0,0.5); border-color:rgba(255,255,255,0.12); }
.mc__av-wrap { position:relative; width:72px; height:72px; flex-shrink:0; transition:width 0.5s cubic-bezier(0.16,1,0.3,1),height 0.5s cubic-bezier(0.16,1,0.3,1); }
.mc__live-ring { position:absolute; inset:-4px; border-radius:50%; border:2px solid var(--teal); animation:mcRing 3s ease-in-out infinite; transition:border-color 0.3s,border-width 0.3s; }
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

/* Chat panel */
.mc__chat { max-height:0; overflow:hidden; opacity:0; margin-top:0; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-top:none; border-radius:0 0 var(--radius-xl) var(--radius-xl); transition:max-height 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.3s ease,margin-top 0.3s ease,padding 0.3s ease; padding:0 24px; }
.mc.chat-open .mc__chat { max-height:400px; opacity:1; margin-top:-16px; padding:28px 24px 18px; }
.mc.chat-open .mc__main { border-radius:var(--radius-xl) var(--radius-xl) 0 0; }
.mc__chat-msg { font-size:13px; line-height:1.65; color:rgba(255,255,255,0.82); margin-bottom:10px; }
.mc__chat-tags { display:flex; gap:6px; }
.mc__chat-tag { font-size:9px; font-weight:600; color:rgba(255,255,255,0.4); padding:2px 8px; background:rgba(255,255,255,0.06); border-radius:12px; }
.mc__chat-tag--focus { color:var(--teal-bright); background:rgba(0,212,170,0.1); }

/* Visual overlay for teaching visuals */
.wyl-visual-overlay { position:absolute; bottom:140px; left:24px; right:24px; max-width:600px; z-index:8; animation:mcSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
.wyl-visual-card { padding:24px; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); box-shadow:0 12px 40px rgba(0,0,0,0.4); }
.wyl-visual-card__title { font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; color:rgba(255,255,255,0.9); margin-bottom:12px; }
.wyl-visual-card__component { min-height:120px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; }

/* Celebration overlay */
.wyl-celebration { position:absolute; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; pointer-events:none; animation:celebFade 2.5s ease-out forwards; }
@keyframes celebFade { 0%{opacity:0;transform:scale(0.8)} 15%{opacity:1;transform:scale(1.05)} 25%{transform:scale(1)} 80%{opacity:1} 100%{opacity:0} }
.wyl-celebration__text { font-family:'Outfit',sans-serif; font-size:48px; font-weight:800; background:linear-gradient(135deg,var(--teal-bright),var(--tami-pink)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 80px rgba(0,212,170,0.3); }
`

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
// UI INTERFACE for the Orchestrator
// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
//
// The orchestrator expects a `ui` object with these methods:
//   ui.renderMoment(moment, visual, options)
//   ui.showFeedback(feedback)
//   ui.waitForStudent(interactionMode, timeout) ÃÂ¢ÃÂÃÂ Promise<response>
//   ui.playSpeech(text, options) ÃÂ¢ÃÂÃÂ Promise<void>
//   ui.playTones(tones, options) ÃÂ¢ÃÂÃÂ Promise<void>
//   ui.showCelebration(type)
//   ui.clearVisual()
//   ui.updateDebug(state)
//   ui.onLessonStart(info)
//   ui.onLessonComplete(summary)
//
// We bridge these to React state updates via a ref-based
// callback system so the orchestrator can call into React.
// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

function createUIBridge(setters) {
  return {
    renderMoment(moment, visual, options) {
      setters.setCurrentMoment(moment)
      if (visual) setters.setCurrentVisual(visual)
    },

    showFeedback(feedback) {
      setters.setFeedback(feedback)
      // Clear feedback after timing
      const holdMs = feedback?.timing?.after || 2000
      setTimeout(() => setters.setFeedback(null), holdMs)
    },

    async waitForStudent(interactionMode, timeoutMs) {
      // Set the interaction mode so UI knows what input to show
      setters.setWaitingForInput({ mode: interactionMode, timeout: timeoutMs })

      return new Promise((resolve, reject) => {
        // Store the resolve/reject so the input handler can call it
        setters.setInputResolver({ resolve, reject })

        // Timeout
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
        // Stop any currently playing audio to prevent overlap
        if (_currentSource) { try { _currentSource.stop() } catch(e) {} _currentSource = null }
        if (window.speechSynthesis) window.speechSynthesis.cancel()
      setters.setCoaching(prev => ({
        ...prev,
        message: text,
        speaking: true,
      }))

      // If we have ElevenLabs TTS audio, play it
      if (options?.audio) {
        const audio = new Audio(options.audio)
        await audio.play().catch(() => {})
        await new Promise(r => {
          audio.onended = r
          setTimeout(r, 10000) // safety timeout
        })
      } else {
        // Call ElevenLabs TTS proxy using AudioContext (bypasses autoplay policy)
        let played = false
        try {
          const ttsResp = await fetch('/api/tts/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: 'coach' }),
          })
          if (ttsResp.ok) {
            const arrayBuf = await ttsResp.arrayBuffer()
            const ctx = getAudioContext()
            if (ctx.state === 'suspended') await ctx.resume()
            const audioBuf = await ctx.decodeAudioData(arrayBuf)
            const source = ctx.createBufferSource()
            source.buffer = audioBuf
            source.connect(ctx.destination)
            _currentSource = source
            source.start(0)
            await new Promise(r => {
              source.onended = () => { _currentSource = null; r() }
              setTimeout(r, 30000)
            })
            played = true
          }
        } catch (e) {
          console.warn('[WYLPracticeLive] TTS error:', e.message)
        }

        // Browser speechSynthesis fallback if ElevenLabs failed
        if (!played && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'
          utterance.rate = 0.95
          utterance.pitch = 1.0
          utterance.volume = 1.0
          // Wait for voices to load if needed
          let voices = window.speechSynthesis.getVoices()
          if (voices.length === 0) {
            await new Promise(r => {
              window.speechSynthesis.onvoiceschanged = () => r()
              setTimeout(r, 1000)
            })
            voices = window.speechSynthesis.getVoices()
          }
          // Strictly filter for English voices only
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
      // Future: Web Audio API or MIDI playback
      // For now, visual-only ÃÂ¢ÃÂÃÂ the keyboard diagram handles this
      setters.setActiveTones(tones)
      const duration = options?.tempo ? (tones.length * (60000 / options.tempo)) : 2000
      await new Promise(r => setTimeout(r, duration))
      setters.setActiveTones(null)
    },

    showCelebration(type) {
      setters.setCelebration(type)
      setTimeout(() => setters.setCelebration(null), 2800)
    },

    clearVisual() {
      setters.setCurrentVisual(null)
    },

    updateDebug(state) {
      setters.setDebugState(state)
    },

    onLessonStart(info) {
      setters.setLessonInfo(info)
    },

    onLessonComplete(summary) {
      setters.setLessonComplete(summary)
    },

    showReinforcement(data) {
      setters.setReinforcement(data)
      setTimeout(() => setters.setReinforcement(null), 4000)
    },

    startMicroGame(game, moment) {
      // Future: micro-game overlay
      console.log('[UI] Micro-game triggered:', game)
    },
  }
}


// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
// SUB-COMPONENTS (preserved from original)
// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

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
        <button className="wyl-bar__btn" onClick={onPause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
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
        if (!window.__MOTESART_DEV_MODE) return; // Voice-first: keyboard is dev-only
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSend()
    }
  }

  return (
    <div className={`mc${chatOpen ? ' chat-open' : ''}`}>
      <div className="mc__main" onClick={onToggleChat}>
        <div className="mc__av-wrap">
          <div className="mc__live-ring" />
          <div className="mc__av">
            <img src={AVATAR_SRC} alt="Motesart" />
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
        {/* Student question input */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12,
        }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="Ask Motesart a question..."
            style={{
              flex: 1, padding: '8px 12px', fontSize: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, color: 'rgba(255,255,255,0.85)', outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleSend() }}
            disabled={!chatInput.trim()}
            style={{
              padding: '8px 14px', fontSize: 11, fontWeight: 600,
              background: chatInput.trim() ? 'linear-gradient(135deg, #e84b8a, #f97316)' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 10,
              color: chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: chatInput.trim() ? 'pointer' : 'default',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}

// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
// VISUAL TEACHING COMPONENTS ÃÂ¢ÃÂÃÂ imported from TeachingVisuals.jsx
// (See src/components/TeachingVisuals.jsx)
// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

// KeyboardDiagram, FingerMapDiagram, ScalePathDiagram, HalfWholeStepDiagram,
// VisualOverlay, VISUAL_COMPONENT_MAP, VISUAL_LABELS, and C_MAJOR_NOTES
// are now imported from '../components/TeachingVisuals'

function CelebrationOverlay({ type }) {
  if (!type) return null

  const messages = {
    confetti: 'ÃÂ°ÃÂÃÂÃÂ Perfect!',
    mastery_achieved: 'ÃÂ¢ÃÂ­ÃÂ Mastered!',
    streak: 'ÃÂ°ÃÂÃÂÃÂ¥ On Fire!',
    level_up: 'ÃÂ°ÃÂÃÂÃÂ Level Up!',
    breakthrough: 'ÃÂ°ÃÂÃÂÃÂ¡ Breakthrough!',
  }

  return (
    <div className="wyl-celebration">
      <div className="wyl-celebration__text">{messages[type] || 'ÃÂ°ÃÂÃÂÃÂ Nice!'}</div>
    </div>
  )
}


// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
// MAIN COMPONENT
// ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

export default function WYLPracticeLive({ lessonId = 'L01_c_major_scale', studentId, studentProfile, wylProfile }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Core state ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const [practiceView, setPracticeView] = useState('cockpit')
  const [timer, setTimer] = useState(0)
  const [paused, setPaused] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [micError, setMicError] = useState(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const uiBridgeRef = useRef(null)

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Voice loader (ensures voices ready before TTS) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const cachedVoicesRef = React.useRef([]);
  const loadVoices = React.useCallback(() => {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoicesRef.current = voices;
        return resolve(voices);
      }
      const onVoices = () => {
        voices = window.speechSynthesis.getVoices();
        cachedVoicesRef.current = voices;
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        resolve(voices);
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 3000);
    });
  }, []);

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Lesson state (driven by orchestrator) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
  const [showTelemetry, setShowTelemetry] = useState(false) // Toggle with Ctrl+Shift+T

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Input state ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const [waitingForInput, setWaitingForInput] = useState(null)
  const [inputResolver, setInputResolver] = useState(null)

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Engine refs (not state  these don't trigger re-renders) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const engineRef = useRef(null)
  const orchestratorRef = useRef(null)
  const bridgeRef = useRef(null)
  const tamiStackRef = useRef(null)
  const perceptionBridgeRef = useRef(null)

  // --- Motesart Theory Phase: Call-and-Response Teaching ---
  const [isListeningActive, setIsListeningActive] = React.useState(false);
  const [lastTranscript, setLastTranscript] = React.useState('');
  const [studentEmotion, setStudentEmotion] = React.useState('neutral');
  const [teachingStep, setTeachingStep] = React.useState(0);
  const [awaitingResponse, setAwaitingResponse] = React.useState(false);
  const [responseTimeout, setResponseTimeout] = React.useState(null);
  const [conceptState, setConceptState] = useState(() => getState('T_HALF_STEP') || {})
  const [sessionCorrect, setSessionCorrect] = useState(0)

  const ACTIVE_CONCEPT_ID = 'T_HALF_STEP'
  const conceptConfig = CONCEPT_VIEW_CONFIG[ACTIVE_CONCEPT_ID]
  const phaseMap = {
    introduced: 'teach',
    practicing: 'guide',
    accurate_with_support: 'confirm',
    accurate_without_support: 'release',
    owned: 'release'
  }
  const currentPhase = phaseMap[conceptState?.ownership_state || 'introduced']
  const teachingStepRef = React.useRef(0);
  // orchestratorRef declared above (line 596)

  // The Motesart Theory Phase: Teaching that knowing the major scale pattern
  // means you know ALL 12 major scales. Uses call-and-response.
  const THEORY_STEPS = React.useMemo(() => [
    { type: 'speak', text: "Hey there! Welcome to your very first lesson at the School of Motes Art. I am Motes Art, your music teacher. Today, I am going to blow your mind. Are you ready?" },
    { type: 'listen', expect: ['yes', 'yeah', 'ready', 'yep', 'sure', 'ok', 'okay', 'lets go', 'lets go', 'yea'], prompt: 'ready_check' },
    { type: 'speak', text: "Awesome! Here is the secret. There is ONE pattern that unlocks ALL 12 major scales. Just one! It is called the Whole and Half Step Pattern. Say it with me: Whole, Whole, Half, Whole, Whole, Whole, Half." },
    { type: 'listen', expect: ['whole', 'half'], prompt: 'pattern_repeat' },
    { type: 'speak', text: "Great effort! Let me break it down. A Whole step means you skip one key. A Half step means you go to the very next key. No skipping. Now, the pattern is: Whole, Whole, Half, Whole, Whole, Whole, Half. Let us try it together. I say it, then you say it. Ready?" },
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
    { type: 'speak', text: "You did it! That pattern, Whole Whole Half Whole Whole Whole Half, works for EVERY major scale. C major, G major, D major, all 12 of them. You just learned the master key to all major scales!" },
    { type: 'speak', text: "Now lets apply it. Starting on C, we go: C, whole step to D, whole step to E, half step to F, whole step to G, whole step to A, whole step to B, and half step back to C. That is the C major scale!" },
    { type: 'speak', text: "Can you say the pattern one more time for me? The whole and half step pattern." },
    { type: 'listen', expect: ['whole', 'half'], prompt: 'full_pattern' },
    { type: 'speak', text: "Excellent work! You now know the secret that unlocks all 12 major scales. In our next lesson, we will apply this pattern starting on different notes. But for now, just remember: Whole, Whole, Half, Whole, Whole, Whole, Half. Great job today!" },
  ], []);

  const advanceTeaching = React.useCallback(async (step) => {
    if (step >= THEORY_STEPS.length) {
      setCoaching({ message: 'Lesson complete! You learned the major scale pattern.', speaking: false, tags: ['Complete'] });
      setLessonComplete({ engagement: { attentionScore: 100 } });
      return;
    }
    teachingStepRef.current = step;
    setTeachingStep(step);
    const current = THEORY_STEPS[step];
    
    if (current.type === 'speak') {
      setAwaitingResponse(false);
      setCoaching({ message: current.text, speaking: true, tags: ['Teaching'] });
      // ÃÂ°ÃÂÃÂÃÂ Route ALL speech through ElevenLabs (NO browser TTS)
      try {
        console.log("ÃÂ°ÃÂÃÂÃÂ¤ TAMi speaking:", current.text.substring(0, 40));
        if (uiBridgeRef.current && uiBridgeRef.current.playSpeech) {
          await uiBridgeRef.current.playSpeech(current.text);
        } else {
          // Direct ElevenLabs call if bridge not ready
          const res = await fetch('/api/tts/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: current.text, voice: 'coach' })
          });
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuf;
            source.connect(audioCtx.destination);
            await new Promise((resolve) => {
              source.onended = () => { console.log("ÃÂ°ÃÂÃÂÃÂ¤ TTS END"); resolve(); };
              source.start(0);
              setTimeout(resolve, 30000);
            });
          } else {
            console.error("ÃÂ°ÃÂÃÂÃÂ¨ ElevenLabs response not ok:", res.status);
            await new Promise(r => setTimeout(r, Math.max(2000, current.text.split(' ').length * 350)));
          }
        }
      } catch (err) {
        console.error("ÃÂ°ÃÂÃÂÃÂ¨ ElevenLabs TTS failed:", err);
        await new Promise(r => setTimeout(r, Math.max(2000, current.text.split(' ').length * 350)));
      }
      setCoaching(prev => ({ ...prev, speaking: false }));
      // Auto-advance to next step
      advanceTeaching(step + 1);
    } else if (current.type === 'listen') {
      setAwaitingResponse(true);
      setCoaching({ message: 'Your turn! I am listening...', speaking: false, tags: ['Listening'] });
      // Set a timeout - if student doesn't respond in 8 seconds, prompt them
      const timeout = setTimeout(() => {
        setCoaching({ message: "Do not be shy! Go ahead and say it.", speaking: false, tags: ['Encouraging'] });
      }, 8000);
      setResponseTimeout(timeout);
    }
  }, [THEORY_STEPS]);

  const handleStudentInput = React.useCallback(async (transcript) => {
    if (!transcript || transcript.trim().length < 1) return;
    if (!awaitingResponse) return;
    
    setLastTranscript(transcript);
    const step = teachingStepRef.current;
    const current = THEORY_STEPS[step];
    if (!current || current.type !== 'listen') return;
    
    // Clear the response timeout
    if (responseTimeout) clearTimeout(responseTimeout);
    
    const heard = transcript.toLowerCase().trim();
    const expected = current.expect;
    const matched = expected.some(e => heard.includes(e));
    
    console.log('[Motesart] Heard:', heard, '| Expected:', expected, '| Match:', matched);
    
    if (matched || current.prompt === 'ready_check') {
      // Student responded correctly (or close enough)
      setStudentEmotion('happy');
      setAwaitingResponse(false);
      
      if (current.prompt === 'call_response') {
        setCoaching({ message: 'Yes! Good!', speaking: true, tags: ['Affirm'] });
      // ÃÂ°ÃÂÃÂÃÂ ElevenLabs affirmation
      const affirmText = matched ? 'Yes!' : 'Good try!';
      try {
        if (uiBridgeRef.current && uiBridgeRef.current.playSpeech) {
          await uiBridgeRef.current.playSpeech(affirmText);
        } else {
          const affRes = await fetch('/api/tts/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: affirmText, voice: 'coach' })
          });
          if (affRes.ok) {
            const ab = await affRes.arrayBuffer();
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') await ctx.resume();
            const buf = await ctx.decodeAudioData(ab);
            const src = ctx.createBufferSource();
            src.buffer = buf; src.connect(ctx.destination);
            await new Promise(r => { src.onended = r; src.start(0); setTimeout(r, 5000); });
          }
        }
      } catch(e) { console.warn("Affirm TTS failed:", e); }
      }
      // Advance to next step
      advanceTeaching(step + 1);
    } else {
      // Student response didn't match - encourage retry
      setStudentEmotion('confused');
      setCoaching({ message: "Almost! Try again. I am listening.", speaking: false, tags: ['Retry'] });
    }
  }, [awaitingResponse, THEORY_STEPS, responseTimeout, advanceTeaching]);

   // Session Activation: only start after user clicks Start Lesson
   const startLesson = React.useCallback(async () => {
     try {
       // Unlock audio context
       const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
       await audioCtx.resume();
       // Load voices BEFORE anything else
       await loadVoices();
       // Clear any weird state ÃÂ¢ÃÂÃÂ NO primer utterance
       window.speechSynthesis.cancel();
        // Request mic permission in gesture chain
        const micOk = await ensureMicPermission();
        if (!micOk) {
          setMicError("Microphone access blocked. Please allow and retry.");
          // mic denied but lesson continues
        }
        setMicError(null);
       setSessionStarted(true);
     } catch (err) {
       console.error("Start lesson error:", err);
       setSessionStarted(true);
     }
   }, [loadVoices]);

   React.useEffect(() => {
     if (!sessionStarted) return;
     setIsListeningActive(true);
     const timer = setTimeout(() => {
       advanceTeaching(0);
     }, 600);
     return () => clearTimeout(timer);
   }, [sessionStarted]);

  React.useEffect(() => {
    if (isListeningActive) {
      startListening((transcript) => {
        handleStudentInput(transcript);
      });
    }
    return () => { stopListening(); };
  }, [isListeningActive, handleStudentInput]);

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Student question handling (custom hook) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const getCurrentMoment = useCallback(() => currentMoment, [currentMoment])
  const { initQuestionHandler, handleStudentQuestion, questionHandlerRef, questionHistory } =
    useTamiQuestions({
      engineRef,
      tamiStackRef,
      bridgeRef,
      setCoaching,
      setCurrentVisual,
      getCurrentMoment,
      inputResolver,
      handleStudentInput,
    })

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Objective display ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const objective = lessonInfo
    ? `${lessonInfo.title}`
    : 'Loading lesson...'

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Timer ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Camera ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraReady(true)
        }
      } catch (err) {
        console.log('Camera not available:', err.message)
          setCameraError(err.message.includes('denied') ? 'Camera access denied. You can still continue without it.' : err.message)
      }
    }
    startCamera()
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // LESSON INITIALIZATION
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

  useEffect(() => {
    async function initLesson() {
      // ---- 1. Create UI bridge ----
      const ui = createUIBridge({
        setCurrentMoment, setCurrentVisual, setCoaching, setFeedback,
        setCelebration, setReinforcement, setActiveTones, setDebugState,
        setLessonInfo, setLessonComplete, setWaitingForInput, setInputResolver,
      })
      uiBridgeRef.current = ui

      // ---- 2. Load engine modules ----
      // These are loaded as script modules from /lesson_engine/
      // In production, import them properly via Vite/bundler
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
      // Question handler is loaded via useTamiQuestions hook

      // ---- 3. Create engine + orchestrator ----
      const engine = new MotesartLessonEngine()
      const orchestrator = new LessonOrchestrator(engine, ui, {
        enableDebug: true,
        difficulty: 'beginner',
        visualRegistryPath: '/lesson_data/visual_asset_registry.json',
      })

      // ---- 4. Create T.A.M.i stack ----
      // Make difficulty ladder + profile manager available to createStack
      if (typeof window !== 'undefined') {
        window.TAMiDifficultyLadder = TAMiDifficultyLadder
        window.TAMiProfileManager = TAMiProfileManager
      }
      const tami = TAMiBridge.createStack({
        engine,
        orchestrator,
        apiUrl: API_URL,
        debugMode: false,
        config: {
          intelligence: { maxAICallsPerLesson: 10 },
          timing: {},
          resolver: {},
          memory: { windowMinutes: 10 },
          difficulty: {},
        },
      })

      // ---- 4a. Initialize difficulty ladder with lesson concepts ----
      if (tami.difficultyLadder) {
        const conceptIds = ['C_KEYBOARD', 'C_HALFWHOLE', 'C_MAJSCALE', 'C_CMAJOR', 'C_FINGERS', 'C_OCTAVE']
        const initialConf = {}
        conceptIds.forEach(id => { initialConf[id] = 50 })
        tami.difficultyLadder.init(conceptIds, initialConf)
        console.log('[T.A.M.i] Difficulty ladder initialized:', tami.difficultyLadder.getSnapshot())
      }

      // ---- 4a-2. Initialize teaching profile from WYL data ----
      if (tami.profileManager) {
        tami.profileManager.initFromWYL(
          wylProfile || { visual: 30, auditory: 25, readwrite: 20, kinesthetic: 25 }
        )
        console.log('[T.A.M.i] Profile initialized:', tami.profileManager.getSnapshot())
      }

      // ---- 4b. Init question handler (via hook) ----
      await initQuestionHandler()

      // ---- 5. Wire bridge action handler ----
      tami.bridge.onAction((action) => {
        console.log('[T.A.M.i Action]', action.source, action.type, action.dialogue?.substring(0, 50))

        // Guard: Don't let bridge overwrite coaching during Theory Phase
        // if (action.dialogue) {
          // const tags = [action.targetConcept, action.strategyType].filter(Boolean)
          // setCoaching({ message: action.dialogue, speaking: false, tags })
//         }

        // Handle celebration
        if (action.celebration) {
          setCelebration(action.celebration)
          setTimeout(() => setCelebration(null), 2800)
        }

        // Handle visual switch
        if (action.visualAsset) {
          setCurrentVisual({
            component: action.visualAsset,
            props: { mode: action.strategyType },
          })
        }

        // Handle timing holds
        if (action.timing?.holdMs > 0) {
          // The orchestrator should respect this hold before advancing
          // This is handled by the orchestrator's timing system
        }
      })

      // Store refs
      engineRef.current = engine
      orchestratorRef.current = orchestrator
      bridgeRef.current = tami.bridge
      tamiStackRef.current = tami

      // ---- 5b. Wire perception bridge ----
      const { createPerceptionBridge } = await import('../lesson_engine/perception_integration.js')
      const perceptionBridge = createPerceptionBridge({
        engine,
        stateManager: tami.stateManager,
        studentId: studentId || 'default_student',
        onStateUpdate: (conceptId, state) => {
          console.log('[Perception] State update:', conceptId, state.ownership_state, Math.round(state.confidence * 100) + '%')
          storeReplaceState(conceptId, state)
        },
        onError: (err) => console.warn('[Perception] Error:', err.message),
      })
      perceptionBridgeRef.current = perceptionBridge

      // ---- 6. Connect bridge and start lesson ----
      tami.bridge.connect({
        lessonId,
        studentId: studentId || 'default_student',
        studentProfile: studentProfile || {},
        wylProfile: wylProfile || { visual: 30, auditory: 25, readwrite: 20, kinesthetic: 25 },
        ambassadorPrompt: 'You are Motesart, a warm piano teacher.',
        lessonData: { concepts: [
          { id: 'C_KEYBOARD', startConfidence: 50 },
          { id: 'C_HALFWHOLE', startConfidence: 50 },
          { id: 'C_MAJSCALE', startConfidence: 50 },
          { id: 'C_CMAJOR', startConfidence: 50 },
          { id: 'C_FINGERS', startConfidence: 50 },
          { id: 'C_OCTAVE', startConfidence: 50 },
        ]},
      })

      // Theory Phase active - orchestrator disabled
      // await orchestrator.start(lessonId)
    }

    // Theory Phase: Engine init disabled
    // initLesson().then(() => {
      // console.log('[WYLPracticeLive] Engine initialized successfully');
    // }).catch(err => {
      // console.warn('[WYLPracticeLive] Engine init skipped (Theory Phase active):', err.message);
    // })
    console.log('[WYLPracticeLive] Theory Phase active - engine init skipped');

    // Cleanup
    return () => {
      if (bridgeRef.current) bridgeRef.current.disconnect()
      if (orchestratorRef.current) orchestratorRef.current.stop()
    }
  }, [lessonId, studentId])

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // INPUT HANDLING
  // (handleStudentInput + useTamiQuestions hook are declared
  //  above, before the initLesson useEffect)
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

  // Keyboard shortcut for verbal responses (space = correct, x = wrong for testing)
  useEffect(() => {
    const handler = (e) => {
      if (!waitingForInput) return

      if (e.key === ' ') {
        e.preventDefault()
        handleStudentInput({ type: 'verbal', value: 'correct', timestamp: Date.now() })
      } else if (e.key === 'x') {
        e.preventDefault()
        handleStudentInput({ type: 'verbal', value: 'wrong', timestamp: Date.now() })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [waitingForInput, handleStudentInput])

  // Ctrl+Shift+T toggles telemetry panel
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setShowTelemetry(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ End session ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const handleEnd = useCallback(async () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }

    // Export lesson data for Airtable
    if (tamiStackRef.current?.stateManager) {
      const exportData = tamiStackRef.current.stateManager.exportForStorage()
      console.log('[Session Export]', exportData)
      // Future: api.logPractice(exportData)
    }

    // Detach perception bridge and export concept states
    if (perceptionBridgeRef.current) {
      const perceptionExport = perceptionBridgeRef.current.exportForStorage()
      console.log('[Perception Export]', perceptionExport)
      perceptionBridgeRef.current.detach()
      perceptionBridgeRef.current = null
      // Future: api.saveConceptStates(perceptionExport)
    }

    if (orchestratorRef.current) {
      await orchestratorRef.current.stop()
    }

    navigate('/session-summary')
  }, [navigate])

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pause/Resume ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const handlePause = useCallback(() => {
    setPaused(p => {
      if (p) {
        orchestratorRef.current?.resume()
      } else {
        orchestratorRef.current?.pause()
      }
      return !p
    })
  }, [])

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // RENDER
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

  // Show lesson complete summary
  if (lessonComplete) {
    return (
      <>
        <style>{css}</style>
        <div className="wyl-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)' }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: 32, marginBottom: 16 }}>Session Complete</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
              {fmtTime(timer)} ÃÂ¢ÃÂÃÂ¢ {lessonComplete.engagement?.attentionScore || 0}% attention
            </p>
            <button className="wyl-bar__btn" onClick={() => navigate('/dashboard')} style={{ fontSize: 14, padding: '10px 24px' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  if (practiceView === 'cockpit') return (
    <PracticeSessionCockpit onBegin={() => setPracticeView('concept')} />
  )
  if (practiceView === 'concept') return (
    <PracticeConceptView
      conceptName="The Half Step"
      conceptDesc="The closest distance between two notes"
      phase={currentPhase}
      speechText={conceptConfig.speechTexts[currentPhase]}
      highlightedKeys={conceptConfig.highlightedKeys}
      homeKeyIndex={conceptConfig.homeKeyIndex}
      answerOptions={conceptConfig.answerOptions}
      correctAnswer={conceptConfig.correctAnswer}
      stats={{
        correct: sessionCorrect,
        attempts: conceptState?.attempts || 0,
        streak: conceptState?.correct_streak || 0,
        accuracy: Math.round((conceptState?.confidence || 0) * 100)
      }}
      bpm={conceptConfig.bpm}
      onAnswer={(isCorrect) => {
        const prev = getState(ACTIVE_CONCEPT_ID) || {}
        const newState = {
          ...prev,
          attempts: (prev.attempts || 0) + 1,
          correct_streak: isCorrect ? (prev.correct_streak || 0) + 1 : 0,
          ownership_state: isCorrect && (prev.correct_streak || 0) >= 2
            ? 'practicing'
            : prev.ownership_state || 'introduced'
        }
        setState(ACTIVE_CONCEPT_ID, newState)
        setConceptState(newState)
        if (isCorrect) setSessionCorrect(s => s + 1)
      }}
      onReplay={() => api.speakText(conceptConfig.speechTexts[currentPhase], 'coach').catch(err => console.error('[TTS] replay failed:', err))}
      onBack={() => setPracticeView('cockpit')}
    />
  )

  return (
    <>
      <style>{css}</style>
      <div className="wyl-root">
        {/* Camera feed */}
        <div className="wyl-camera">
          <video ref={videoRef} autoPlay playsInline muted style={{ display: cameraReady ? 'block' : 'none' }} />
            {!sessionStarted && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 10, 30, 0.92)', zIndex: 50 }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>Ready to Begin?</div>
                  <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '36px' }}>I'll use your voice and piano to guide you step-by-step.</div>
                  <button onClick={startLesson} style={{ background: 'linear-gradient(135deg, #6c63ff, #48c6ef)', border: 'none', borderRadius: '50px', padding: '18px 48px', color: '#fff', fontSize: '20px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 24px rgba(108,99,255,0.4)', fontFamily: 'Outfit, sans-serif' }}>Tap to begin &mdash; I'll guide you.</button>
          {micError && (
            <div style={{ marginTop: "20px", padding: "16px 24px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "12px", color: "#fca5a5", fontSize: "15px", textAlign: "center", maxWidth: "400px" }}>
              <div style={{ marginBottom: "8px" }}>{micError}</div>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "12px" }}>Tap the lock/tune icon in your address bar, set Microphone to Allow, then tap Retry below.</div>
              <button onClick={async () => { try { const s = await navigator.mediaDevices.getUserMedia({audio:true}); s.getTracks().forEach(t=>t.stop()); setMicError(null); setIsListeningActive(true); } catch(e) { setMicError("Still blocked. Open browser Settings > Site Settings > Microphone and allow this site."); }}} style={{ padding: "8px 20px", background: "rgba(139,92,246,0.8)", border: "none", borderRadius: "8px", color: "white", fontSize: "14px", cursor: "pointer" }}>Retry Microphone</button>
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
              <span className="wyl-camera-placeholder__text">{cameraError || "Connecting camera..."}</span>
            </div>
          )}
        </div>

        {/* Nametag */}
        <div className="wyl-nametag">
          <div className="wyl-nametag__dot" />
          <span className="wyl-nametag__name">{studentProfile?.name || 'Student'}</span>
        </div>

        {/* Top Bar */}
        <TopBar
          timer={fmtTime(timer)}
          objective={objective}
          paused={paused}
          onPause={handlePause}
          onEnd={handleEnd}
        />

        {/* Teaching Visual (from orchestrator/resolver) */}
        <VisualOverlay visual={currentVisual} activeTones={activeTones} />

        {/* Motesart Card (live coaching + question input) */}
        <MotesartCard
          coaching={coaching}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen(!chatOpen)}
          onStudentQuestion={handleStudentQuestion}
        />

        {/* Celebration overlay */}
        <CelebrationOverlay type={celebration} />

        {/* Telemetry dev panel (Ctrl+Shift+T) */}
        <TelemetryPanel
          engineRef={engineRef}
          tamiStackRef={tamiStackRef}
          questionHistory={questionHistory}
          visible={showTelemetry}
        />

        {/* Input indicator */}
        {waitingForInput && (
          <div style={{
            position: 'absolute', bottom: 140, right: 24, zIndex: 10,
            padding: '8px 16px', background: 'rgba(0,196,154,0.15)',
            border: '1px solid rgba(0,196,154,0.3)', borderRadius: 12,
            fontSize: 11, color: 'var(--teal)', fontWeight: 600,
          }}>
            {waitingForInput.mode === 'midi' ? 'ÃÂ°ÃÂÃÂÃÂ¹ Play now...' :
             waitingForInput.mode === 'speech' ? 'ÃÂ°ÃÂÃÂÃÂ¤ Voice Mode Active' :
             'ÃÂ°ÃÂÃÂÃÂ Tap to respond...'}
            <span style={{ fontSize: 9, marginLeft: 8, opacity: 0.5 }}>
              Listening for your answer...
            </span>
          </div>
        )}

        {/* Feedback indicator */}
        {feedback && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 30, fontSize: 24, fontWeight: 800, fontFamily: 'Outfit',
            color: feedback.type === 'correct' || feedback.type === 'perfect' ? 'var(--teal-bright)' : 'var(--pink)',
            textShadow: '0 0 40px rgba(0,0,0,0.5)', pointerEvents: 'none',
          }}>
            {feedback.type === 'perfect' ? 'ÃÂ¢ÃÂÃÂ¨ Perfect!' :
             feedback.type === 'correct' ? 'ÃÂ¢ÃÂÃÂ Correct' :
             feedback.type === 'wrong' ? 'ÃÂ¢ÃÂÃÂ Try again' :
             ''}
          </div>
        )}
      </div>
    </>
  )
}
