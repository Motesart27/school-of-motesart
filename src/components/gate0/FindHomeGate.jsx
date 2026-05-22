/**
 * FindHomeGate.jsx
 * Gate 0 — Find Home
 * SOM Mastery Intelligence Engine
 *
 * Fully JSON-driven. All content from L00_find_home.json.
 * No hardcoded teaching language in this component.
 * 9-step gate loop per Motesart Language Constitution v1.1
 *
 * Step 1 — Story Hook
 * Step 2 — Hear It
 * Step 3 — Say It (call & response)
 * Step 4 — Feel Check (internal, never shown as score)
 * Step 5 — Name It (earned music-world name)
 * Step 6 — Quiz It (Motesart absent)
 * Step 7 — Explain It (ownership gate)
 * → sessionStorage → navigate('/student')
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadLesson } from './lessonDataLoader.js'

// ─── Design tokens (SOM locked) ──────────────────────────────────────────────
const T = {
  bg:       '#0a0a0f',
  surface:  'rgba(255,255,255,0.04)',
  surfaceHi:'rgba(255,255,255,0.07)',
  border:   'rgba(255,255,255,0.08)',
  teal:     '#14b8a6',
  tealDim:  'rgba(20,184,166,0.15)',
  gold:     '#f59e0b',
  goldDim:  'rgba(245,158,11,0.12)',
  purple:   '#a855f7',
  purpleDim:'rgba(168,85,247,0.12)',
  red:      '#ef4444',
  redDim:   'rgba(239,68,68,0.12)',
  green:    '#22c55e',
  greenDim: 'rgba(34,197,94,0.10)',
  text:     '#f1f5f9',
  muted:    'rgba(255,255,255,0.45)',
  faint:    'rgba(255,255,255,0.20)',
  font:     "'DM Sans', -apple-system, sans-serif",
  display:  "'Outfit', -apple-system, sans-serif",
}

// ─── Web Audio synth ─────────────────────────────────────────────────────────
const NOTE_FREQ = {
  C4:261.63, D4:293.66, E4:329.63, F4:349.23,
  G4:392.00, A4:440.00, B4:493.88, C5:523.25, D5:587.33
}

function playNote(freq, duration = 0.6, ctx) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = 'triangle'
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

async function playSequence(notes, tempoMs, ctx) {
  if (!ctx) return
  for (let i = 0; i < notes.length; i++) {
    const freq = NOTE_FREQ[notes[i]]
    if (freq) playNote(freq, 0.55, ctx)
    await new Promise(r => setTimeout(r, tempoMs))
  }
}

// ─── Motesart avatar corner ───────────────────────────────────────────────────
function MotesartCorner({ message, showRepeat, onRepeat }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 24, zIndex: 100,
      display: 'flex', alignItems: 'flex-end', gap: 10, maxWidth: 300,
    }}>
      <img src="/Motesart Avatar 1.PNG" alt="Motesart"
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover',
          border: `2px solid ${T.teal}55`, flexShrink: 0 }}
        onError={e => { e.currentTarget.style.display = 'none' }} />
      {message && (
        <div style={{
          background: 'rgba(10,10,15,0.92)',
          border: `1px solid ${T.border}`,
          borderRadius: '16px 16px 16px 4px',
          padding: '10px 14px',
          fontSize: 13, color: T.text, lineHeight: 1.5,
          backdropFilter: 'blur(12px)',
          animation: 'fadeSlideUp 0.3s both',
        }}>
          {message}
          {showRepeat && (
            <button onClick={onRepeat} style={{
              display: 'block', marginTop: 8,
              background: 'none', border: `1px solid ${T.teal}44`,
              borderRadius: 6, padding: '3px 10px',
              color: T.teal, fontSize: 11, cursor: 'pointer',
              fontFamily: T.font,
            }}>🔊 Repeat that</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Home keyboard visual ─────────────────────────────────────────────────────
function HomeKeyboard({ highlightHome = false, playingNote = null, onTap = null }) {
  const whites = ['C','D','E','F','G','A','B','C']
  const notes  = ['C4','D4','E4','F4','G4','A4','B4','C5']
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', padding: '8px 0' }}>
      {whites.map((n, i) => {
        const note = notes[i]
        const isHome = note === 'C4' || note === 'C5'
        const isPlaying = playingNote === note
        return (
          <div key={i} onClick={() => onTap && onTap(note)}
            style={{
              width: 38, height: 110, borderRadius: '0 0 6px 6px',
              background: isPlaying ? T.teal
                : (highlightHome && isHome) ? `${T.teal}33`
                : 'rgba(255,255,255,0.92)',
              border: isPlaying ? `2px solid ${T.teal}`
                : (highlightHome && isHome) ? `2px solid ${T.teal}`
                : '1px solid rgba(0,0,0,0.15)',
              cursor: onTap ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'flex-end',
              paddingBottom: 8, transition: 'all 0.15s', position: 'relative',
              boxShadow: isPlaying ? `0 0 12px ${T.teal}66` : 'none',
            }}>
            {highlightHome && isHome && (
              <div style={{
                position: 'absolute', top: 6,
                fontFamily: T.display, fontWeight: 900, fontSize: 14,
                color: T.teal,
              }}>1</div>
            )}
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: (highlightHome && isHome) ? T.teal : 'rgba(0,0,0,0.4)',
              fontFamily: T.display,
            }}>
              {(highlightHome && isHome) ? 'HOME' : (isPlaying ? n : '')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Progress bar (steps 1-7) ─────────────────────────────────────────────────
function StepBar({ currentStep, totalSteps = 7 }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '0 24px 16px' }}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < currentStep ? T.teal
            : i === currentStep ? T.gold
            : 'rgba(255,255,255,0.08)',
          transition: 'background 0.4s',
        }} />
      ))}
    </div>
  )
}

// ─── Speak or text input ──────────────────────────────────────────────────────
function SpeakOrText({ onAnswer, disabled, placeholder = 'Type your answer...' }) {
  const [val, setVal] = useState('')
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = e => {
      const t = e.results[0][0].transcript
      setVal(t)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  function stopMic() {
    recRef.current?.stop()
    setListening(false)
  }

  function submit() {
    if (!val.trim() || disabled) return
    onAnswer(val.trim())
    setVal('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea value={val} onChange={e => setVal(e.target.value)}
          placeholder={placeholder} rows={2} disabled={disabled}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }}}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.border}`, borderRadius: 10,
            padding: '10px 12px', color: T.text, fontFamily: T.font,
            fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5,
          }} />
        <button onClick={listening ? stopMic : startMic} disabled={disabled}
          title={listening ? 'Stop listening' : 'Speak your answer'}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            border: `1.5px solid ${listening ? T.red : T.teal}`,
            background: listening ? T.redDim : T.tealDim,
            color: listening ? T.red : T.teal,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: listening ? 'pulse 1s infinite' : 'none',
          }}>
          {listening ? '⏹' : '🎤'}
        </button>
      </div>
      <button onClick={submit} disabled={!val.trim() || disabled} style={{
        background: T.tealDim, border: `1px solid ${T.teal}55`,
        borderRadius: 10, padding: '10px 0',
        color: T.teal, fontFamily: T.font, fontWeight: 700, fontSize: 14,
        cursor: (!val.trim() || disabled) ? 'not-allowed' : 'pointer',
        opacity: !val.trim() ? 0.5 : 1,
      }}>Submit answer</button>
    </div>
  )
}

// ─── Feedback flash ───────────────────────────────────────────────────────────
function Feedback({ feedback }) {
  if (!feedback) return null
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 12, marginTop: 10,
      background: feedback.correct ? T.greenDim : T.redDim,
      border: `1.5px solid ${feedback.correct ? T.green : T.red}44`,
      animation: 'fadeSlideUp 0.2s both',
    }}>
      <span style={{ fontSize: 14, color: feedback.correct ? T.green : T.red, fontWeight: 600 }}>
        {feedback.msg}
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FindHomeGate({ onGatePassed, ageBand = 'child' }) {
  const navigate = useNavigate()
  const [lesson, setLesson]         = useState(null)
  const [loadError, setLoadError]   = useState(null)
  const [step, setStep]             = useState(1)      // 1-7
  const [motesartMsg, setMotesartMsg] = useState('')
  const [showRepeat, setShowRepeat] = useState(false)
  const [lastAudio, setLastAudio]   = useState(null)
  const [playingNote, setPlayingNote] = useState(null)
  const [feedback, setFeedback]     = useState(null)
  const [crRound, setCrRound]       = useState(0)      // call-response round
  const [fcRound, setFcRound]       = useState(0)      // feel-check round
  const [fcData, setFcData]         = useState([])     // internal feel-check results
  const [fcStart, setFcStart]       = useState(null)   // timestamp for response time
  const [answers, setAnswers]       = useState({})     // quiz answers
  const [qIdx, setQIdx]             = useState(0)      // quiz question index
  const [attempts, setAttempts]     = useState({})     // attempt counts
  const [execScore, setExecScore]   = useState(0)
  const [ownershipPassed, setOwnershipPassed] = useState(false)
  const [activeWYL, setActiveWYL]   = useState(null)
  const ctxRef = useRef(null)
  const fbTimer = useRef(null)

  // Init audio context on first interaction
  function getCtx() {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    return ctxRef.current
  }

  useEffect(() => {
    loadLesson('L00_find_home')
      .then(data => {
        setLesson(data)
        // Step 1 — set story hook from ageBand
        const hook = data.narrative_intensity?.[ageBand]?.story_hook || ''
        setMotesartMsg(hook)
        setShowRepeat(true)
        setLastAudio(() => () => setMotesartMsg(hook))
      })
      .catch(e => setLoadError(e.message))
  }, [ageBand])

  // ── Step audio player ──────────────────────────────────────────────────────
  async function playScale(notes, tempoMs) {
    const ctx = getCtx()
    setPlayingNote(null)
    for (let i = 0; i < notes.length; i++) {
      setPlayingNote(notes[i])
      playNote(NOTE_FREQ[notes[i]], 0.5, ctx)
      await new Promise(r => setTimeout(r, tempoMs))
    }
    setPlayingNote(null)
  }

  async function playSingle(note) {
    playNote(NOTE_FREQ[note], 0.8, getCtx())
    setPlayingNote(note)
    setTimeout(() => setPlayingNote(null), 800)
  }

  // ── Step transitions ───────────────────────────────────────────────────────
  function goStep(n) {
    setFeedback(null)
    setStep(n)
  }

  // Step 2 — Hear It
  async function runHearIt() {
    if (!lesson) return
    const seq = lesson.gate_steps.step_2_hear_it.audio_sequence
    for (const ev of seq) {
      if (ev.event === 'play_scale') {
        setMotesartMsg('Listen...')
        await playScale(ev.notes, ev.tempo_ms)
      } else if (ev.event === 'play_single') {
        await playSingle(ev.note)
      } else if (ev.event === 'motesart_says') {
        setMotesartMsg(ev.text)
        await new Promise(r => setTimeout(r, 1600))
      } else if (ev.event === 'pause') {
        await new Promise(r => setTimeout(r, ev.ms))
      }
    }
    setMotesartMsg('Did you feel it? That last note — that\'s home.')
    setShowRepeat(true)
    setLastAudio(() => runHearIt)
  }

  // Step 3 — Say It: check one call-response round
  function handleCRAnswer(raw) {
    if (!lesson) return
    const rounds = lesson.gate_steps.step_3_say_it.rounds
    const round = rounds[crRound]
    const normalized = raw.toLowerCase().trim()
    const correct = round.acceptable_answers.some(a => normalized.includes(a.toLowerCase()))
    clearTimeout(fbTimer.current)
    setFeedback({ correct, msg: correct ? round.motesart_correct : round.motesart_wrong })
    if (correct) {
      fbTimer.current = setTimeout(() => {
        setFeedback(null)
        if (crRound + 1 < rounds.length) {
          setCrRound(i => i + 1)
          setMotesartMsg(rounds[crRound + 1].motesart_prompt)
        } else {
          // All CR rounds done → step 4
          setMotesartMsg(lesson.gate_steps.step_4_feel_check.student_facing_intro)
          goStep(4)
          setFcRound(0)
          setFcStart(Date.now())
        }
      }, 1400)
    } else {
      fbTimer.current = setTimeout(() => setFeedback(null), 2000)
    }
  }

  // Step 4 — Feel Check
  function handleFCAnswer(choice) {
    if (!lesson) return
    const rounds = lesson.gate_steps.step_4_feel_check.rounds
    const round = rounds[fcRound]
    const responseMs = Date.now() - (fcStart || Date.now())
    const correct = choice === round.correct_answer
    const signal = responseMs < 2000 ? 'audiating' : 'calculating'
    setFcData(prev => [...prev, { round_id: round.round_id, correct, responseMs, signal }])
    clearTimeout(fbTimer.current)
    setFeedback({ correct, msg: correct ? 'That felt right.' : 'Good — just feeling it out.' })
    fbTimer.current = setTimeout(() => {
      setFeedback(null)
      if (fcRound + 1 < rounds.length) {
        setFcRound(i => i + 1)
        setFcStart(Date.now())
      } else {
        // FC done → step 5
        goStep(5)
        const reveal = lesson.gate_steps.step_5_name_it[`${ageBand}_version`] || lesson.gate_steps.step_5_name_it.motesart_reveal
        setMotesartMsg(reveal)
      }
    }, 1200)
  }

  // Step 5 → step 6
  function handleNameItContinue() {
    goStep(6)
    const qs = lesson.gate_steps.step_6_quiz_it.questions
    setQIdx(0)
    setMotesartMsg('') // absent during quiz
  }

  // Step 6 — Quiz It
  function handleQuizAnswer(q, raw) {
    const normalized = raw.toLowerCase().trim()
    let correct = false
    if (q.type === 'multiple_choice') {
      correct = normalized === q.correct.toLowerCase()
    } else {
      correct = q.acceptable_answers.some(a => normalized.includes(a.toLowerCase()))
    }
    const att = (attempts[q.question_id] || 0) + 1
    setAttempts(prev => ({ ...prev, [q.question_id]: att }))
    setAnswers(prev => ({ ...prev, [q.question_id]: { correct } }))
    clearTimeout(fbTimer.current)
    setFeedback({ correct, msg: correct ? q.motesart_correct : q.motesart_wrong })

    if (correct) {
      fbTimer.current = setTimeout(() => {
        setFeedback(null)
        const qs = lesson.gate_steps.step_6_quiz_it.questions
        if (qIdx + 1 < qs.length) {
          setQIdx(i => i + 1)
        } else {
          // Quiz done — compute exec score
          const all = { ...answers, [q.question_id]: { correct: true } }
          const passed = Object.values(all).filter(a => a.correct).length
          const score = Math.round((passed / qs.length) * 100)
          setExecScore(score)
          goStep(7)
          setMotesartMsg('') // absent for ownership
        }
      }, 1400)
    } else {
      // Check WYL trigger (2 attempts)
      if (att >= 2) {
        const captured = raw
        fbTimer.current = setTimeout(() => {
          setFeedback(null)
          triggerWYL(q, captured)
        }, 1800)
      } else {
        fbTimer.current = setTimeout(() => setFeedback(null), 2000)
      }
    }
  }

  // detectMistake — reads mistake_detection.categories from lesson JSON.
  // No hardcoded question IDs. Uses question type and answer content only.
  function detectMistake(q, userAnswer = '') {
    const cats = lesson.mistake_detection.categories
    const ans = userAnswer.toLowerCase()
    for (const cat of cats) {
      if (cat.code === 'HOME_DEFINITION_MISSED' &&
          (ans.includes('louder') || ans.includes('faster') ||
           ans.includes('stop') || ans.includes('accent'))) {
        return cat.code
      }
      if (cat.code === 'HOME_IDENTIFICATION_MISSED' &&
          q.options?.includes('1') && !q.options?.includes('C')) {
        return cat.code
      }
      if (cat.code === 'TECHNICAL_NAME_CONFUSION' &&
          (ans.includes('dominant') || ans.includes('chord') ||
           ans.includes('bass') || ans.includes('scale'))) {
        return cat.code
      }
    }
    // Default: WRONG_HOME_NOTE — covers any other wrong answer
    return cats.find(c => c.code === 'WRONG_HOME_NOTE')?.code || cats[0]?.code
  }

  function triggerWYL(q, userAnswer = '') {
    const code = detectMistake(q, userAnswer)
    const wyls = lesson.wyl_interventions.interventions
    // Map mistake code to WYL mode using mistake_detection next_action from JSON
    const cat = lesson.mistake_detection.categories.find(c => c.code === code)
    const action = (cat?.next_action || '').toLowerCase()
    let mode = 'visual'
    if (action.includes('auditory')) mode = 'auditory'
    if (action.includes('kinesthetic')) mode = 'kinesthetic'
    if (action.includes('readwrite')) mode = 'readwrite'
    setActiveWYL({ mode, ...wyls[mode] })
  }

  // Step 7 — Explain It (ownership)
  function handleOwnership(raw) {
    const signals = lesson.gate_steps.step_7_explain_it.acceptable_signals
    const normalized = raw.toLowerCase()
    const correct = signals.some(s => normalized.includes(s.toLowerCase()))
    setOwnershipPassed(correct)
    clearTimeout(fbTimer.current)
    setFeedback({
      correct,
      msg: correct
        ? lesson.gate_steps.step_7_explain_it.motesart_correct
        : lesson.gate_steps.step_7_explain_it.motesart_wrong
    })
    if (correct) {
      fbTimer.current = setTimeout(() => {
        setFeedback(null)
        goStep(8) // complete
      }, 1800)
    } else {
      fbTimer.current = setTimeout(() => setFeedback(null), 2200)
    }
  }

  // Complete — write sessionStorage and call onGatePassed
  useEffect(() => {
    if (step !== 9 || !lesson) return
    const result = {
      gateId: 'C_MAJOR_GATE_FIND_HOME',
      concept: 'find_home',
      completedAt: new Date().toISOString(),
      executionScore: execScore,
      ownershipPassed,
      feelCheckData: fcData, // internal only — not surfaced to student
    }
    try {
      sessionStorage.setItem('gate0_find_home_result', JSON.stringify(result))
    } catch (e) {}
    onGatePassed?.(result)
  }, [step])

  // ── Confidence tier language (no percentages to student) ──────────────────
  function tierMsg(score) {
    const tiers = lesson?.mastery_rule?.confidence_tiers
    if (!tiers) return ''
    if (score >= 95) return tiers.mastered.motesart_response
    if (score >= 85) return tiers.owned.motesart_response
    if (score >= 70) return tiers.almost_owned.motesart_response
    if (score >= 40) return tiers.developing.motesart_response
    return tiers.not_ready.motesart_response
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadError) return (
    <div style={{ background: T.bg, color: T.red, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font, padding: 40, textAlign: 'center' }}>
      <div><div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div><div>{loadError}</div></div>
    </div>
  )

  if (!lesson) return (
    <div style={{ background: T.bg, color: T.muted, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2.5px solid ${T.teal}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13 }}>Loading gate...</div>
      </div>
    </div>
  )

  const qs = lesson.gate_steps.step_6_quiz_it.questions
  const currentQ = qs[qIdx]
  const fcRounds = lesson.gate_steps.step_4_feel_check.rounds
  const currentFC = fcRounds[fcRound]
  const isQuizStep = step === 6 || step === 7 || step === 8 || step === 9
  const testModeLabel = 'Test mode — answer on your own'

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: T.font, color: T.text, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px ${T.teal}44} 50%{box-shadow:0 0 20px ${T.teal}88} }
        * { box-sizing:border-box; }
        button:focus-visible { outline:2px solid ${T.teal}; outline-offset:2px; }
        textarea:focus { border-color:${T.teal} !important; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: `1px solid ${T.border}`, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 12, color: T.teal, letterSpacing: '0.06em' }}>MOTESART</div>
          <div style={{ fontSize: 11, color: T.muted }}>Gate 0 · Find Home</div>
        </div>
        <div style={{ flex: 1 }} />
        {isQuizStep && (
          <div style={{ fontSize: 11, color: T.gold, fontWeight: 600, padding: '3px 10px', background: T.goldDim, border: `1px solid ${T.gold}44`, borderRadius: 20 }}>
            {testModeLabel}
          </div>
        )}
        <div style={{ fontSize: 11, color: T.muted }}>Step {Math.min(step, 9)} of 9</div>
      </div>

      {/* ── Progress ── */}
      <div style={{ paddingTop: 12 }}>
        <StepBar currentStep={step - 1} totalSteps={9} />
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, maxWidth: 560, width: '100%', margin: '0 auto', padding: '12px 20px 120px' }}>

        {/* ──── STEP 1 — Story Hook ──── */}
        {step === 1 && (
          <div style={{ animation: 'fadeSlideUp 0.4s both' }}>
            <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.teal, marginBottom: 20, lineHeight: 1.2 }}>
              Find Home
            </div>

            {/* Keyboard with home highlighted */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: '20px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                The Keyboard
              </div>
              <HomeKeyboard highlightHome />
              <div style={{ fontSize: 12, color: T.teal, textAlign: 'center', marginTop: 10, fontWeight: 600 }}>
                HOME = 1 = C in C major
              </div>
            </div>

            {/* Story text from JSON via ageBand */}
            <div style={{ background: `linear-gradient(135deg, rgba(20,184,166,0.08), rgba(168,85,247,0.05))`, border: `1px solid ${T.teal}22`, borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: T.text }}>
                {lesson.narrative_intensity[ageBand].story_hook}
              </div>
            </div>

            <button onClick={() => { goStep(2); runHearIt() }} style={{
              width: '100%', padding: '15px 0', background: T.teal, border: 'none', borderRadius: 14,
              color: '#fff', fontFamily: T.display, fontWeight: 800, fontSize: 16, cursor: 'pointer',
            }}>
              Hear it →
            </button>
          </div>
        )}

        {/* ──── STEP 2 — Hear It ──── */}
        {step === 2 && (
          <div style={{ animation: 'fadeSlideUp 0.35s both' }}>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 6 }}>Hear It</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Listen to where the music lands.</div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: '20px 16px', marginBottom: 20 }}>
              <HomeKeyboard highlightHome={playingNote === 'C4' || playingNote === 'C5'} playingNote={playingNote} />
            </div>

            <button onClick={runHearIt} style={{
              width: '100%', padding: '13px 0', marginBottom: 12,
              background: T.tealDim, border: `1px solid ${T.teal}55`,
              borderRadius: 12, color: T.teal, fontFamily: T.display, fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>
              ▶ Play again
            </button>

            <button onClick={() => {
              goStep(3)
              const round0 = lesson.gate_steps.step_3_say_it.rounds[0]
              setMotesartMsg(round0.motesart_prompt)
              setCrRound(0)
            }} style={{
              width: '100%', padding: '15px 0', background: T.teal, border: 'none', borderRadius: 14,
              color: '#fff', fontFamily: T.display, fontWeight: 800, fontSize: 16, cursor: 'pointer',
            }}>
              I heard it → Say it
            </button>
          </div>
        )}

        {/* ──── STEP 3 — Say It ──── */}
        {step === 3 && (
          <div style={{ animation: 'fadeSlideUp 0.35s both' }}>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 6 }}>Say It</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
              Round {crRound + 1} of {lesson.gate_steps.step_3_say_it.rounds.length}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 17, color: T.text, fontWeight: 500, lineHeight: 1.6 }}>
                {lesson.gate_steps.step_3_say_it.rounds[crRound].motesart_prompt}
              </div>
            </div>

            <SpeakOrText onAnswer={handleCRAnswer} disabled={!!feedback} placeholder="Say or type your answer..." />
            <Feedback feedback={feedback} />
          </div>
        )}

        {/* ──── STEP 4 — Feel Check ──── */}
        {step === 4 && (
          <div style={{ animation: 'fadeSlideUp 0.35s both' }}>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 6 }}>Feel It</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>
              {lesson.gate_steps.step_4_feel_check.student_facing_intro}
            </div>
            <div style={{ fontSize: 11, color: T.faint, marginBottom: 20 }}>Round {fcRound + 1} of {fcRounds.length}</div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {['A', 'B'].map(choice => (
                <button key={choice} disabled={!!feedback}
                  onClick={() => handleFCAnswer(choice)} style={{
                    flex: 1, padding: '18px 0',
                    background: T.surface, border: `1.5px solid ${T.border}`,
                    borderRadius: 14, color: T.text,
                    fontFamily: T.display, fontWeight: 800, fontSize: 22,
                    cursor: feedback ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  {choice === 'A' ? 'First' : 'Second'}
                </button>
              ))}
            </div>

            <button onClick={async () => {
              const ctx = getCtx()
              const round = fcRounds[fcRound]
              setMotesartMsg('Sequence A...')
              await playSequence(round.play_A, 400, ctx)
              await new Promise(r => setTimeout(r, 600))
              setMotesartMsg('Sequence B...')
              await playSequence(round.play_B, 400, ctx)
              setMotesartMsg('Which one felt like home?')
              setFcStart(Date.now())
            }} style={{
              width: '100%', padding: '11px 0', marginBottom: 8,
              background: T.tealDim, border: `1px solid ${T.teal}44`,
              borderRadius: 10, color: T.teal, fontFamily: T.font, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>▶ Play both sequences</button>

            <Feedback feedback={feedback} />
          </div>
        )}

        {/* ──── STEP 5 — Name It ──── */}
        {step === 5 && (
          <div style={{ animation: 'fadeSlideUp 0.4s both' }}>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 6 }}>Name It</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>You earned this.</div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: '22px 22px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: T.text, marginBottom: 20 }}>
                {lesson.gate_steps.step_5_name_it[`${ageBand}_version`] || lesson.gate_steps.step_5_name_it.motesart_reveal}
              </div>
              {/* Home → Tonic visual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: T.tealDim, border: `1px solid ${T.teal}33`, borderRadius: 12 }}>
                <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.teal }}>Home</div>
                <div style={{ color: T.muted, fontSize: 18 }}>→</div>
                <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.text }}>Tonic</div>
                <div style={{ color: T.muted, fontSize: 12 }}>/ Root</div>
              </div>
            </div>

            <button onClick={handleNameItContinue} style={{
              width: '100%', padding: '15px 0', background: T.teal, border: 'none', borderRadius: 14,
              color: '#fff', fontFamily: T.display, fontWeight: 800, fontSize: 16, cursor: 'pointer',
            }}>
              Got it — prove it →
            </button>
          </div>
        )}

        {/* ──── STEP 6 — Quiz It ──── */}
        {step === 6 && currentQ && (
          <div style={{ animation: 'fadeSlideUp 0.35s both' }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
              {qs.map((q, i) => (
                <div key={q.question_id} style={{
                  height: 3, flex: 1, borderRadius: 2,
                  background: answers[q.question_id]?.correct ? T.teal
                    : i === qIdx ? T.gold : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Question {qIdx + 1} of {qs.length}
              </div>
              <div style={{ fontSize: 17, color: T.text, fontWeight: 500, lineHeight: 1.6, marginBottom: 18 }}>
                {currentQ.prompt}
              </div>

              {currentQ.type === 'multiple_choice' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {currentQ.options.map(opt => (
                    <button key={opt} disabled={!!feedback}
                      onClick={() => handleQuizAnswer(currentQ, opt)} style={{
                        padding: '13px 10px', borderRadius: 10, textAlign: 'center',
                        background: T.surface, border: `1.5px solid ${T.border}`,
                        color: T.text, fontFamily: T.font, fontSize: 14, fontWeight: 600,
                        cursor: feedback ? 'default' : 'pointer', transition: 'all 0.15s',
                      }}>{opt}</button>
                  ))}
                </div>
              ) : (
                <SpeakOrText onAnswer={raw => handleQuizAnswer(currentQ, raw)} disabled={!!feedback} />
              )}
            </div>

            <Feedback feedback={feedback} />

            {/* WYL panel */}
            {activeWYL && (
              <div style={{ marginTop: 16, background: T.surface, border: `1.5px solid ${T.teal}44`, borderRadius: 16, padding: '18px 20px', animation: 'fadeSlideUp 0.3s both' }}>
                <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Support
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
                  {activeWYL[ageBand]}
                </div>
                <button onClick={() => setActiveWYL(null)} style={{
                  background: T.tealDim, border: `1px solid ${T.teal}55`, borderRadius: 8, padding: '7px 16px',
                  color: T.teal, fontFamily: T.font, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>Got it — try again</button>
              </div>
            )}
          </div>
        )}

        {/* ──── STEP 7 — Explain It (ownership) ──── */}
        {step === 7 && (
          <div style={{ animation: 'fadeSlideUp 0.35s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 14px', background: T.purpleDim, border: `1px solid ${T.purple}44`, borderRadius: 10 }}>
              <span style={{ fontSize: 16 }}>🔑</span>
              <span style={{ fontSize: 13, color: T.purple, fontWeight: 600 }}>Ownership gate — explain it in your own words</span>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 17, color: T.text, fontWeight: 500, lineHeight: 1.6, marginBottom: 16 }}>
                {lesson.gate_steps.step_7_explain_it.prompt}
              </div>
              <SpeakOrText onAnswer={handleOwnership} disabled={!!feedback} placeholder="Explain in your own words..." />
            </div>

            <Feedback feedback={feedback} />
          </div>
        )}

        {/* ──── STEP 8 — Homework ──── */}
        {step === 8 && (
          <div style={{ animation: 'fadeSlideUp 0.4s both' }}>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 6 }}>Practice at Home</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
              {lesson.homework_game.prompt}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Your homework game
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 28 }}>🎯</div>
                <div>
                  <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 2 }}>
                    {lesson.homework_game.variant.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase())}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>
                    Level {lesson.homework_game.level_locked} · {lesson.homework_game.scale.replace(/_/g,' ')} · {lesson.homework_game.octaves} octave
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                {lesson.homework_game.description}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: T.faint }}>
                Find the Note game · Coming soon in this session
              </div>
            </div>

            <button onClick={() => navigate('/game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1')} style={{
              width: '100%', padding: '15px 0', background: T.teal, border: 'none', borderRadius: 14,
              color: '#fff', fontFamily: T.display, fontWeight: 800, fontSize: 16, cursor: 'pointer',
              marginBottom: 10,
            }}>
              Practice now — Find Home →
            </button>
            <button onClick={() => goStep(9)} style={{
              width: '100%', padding: '11px 0', background: 'none',
              border: `1px solid ${T.border}`, borderRadius: 14,
              color: T.muted, fontFamily: T.font, fontSize: 13, cursor: 'pointer',
            }}>
              Skip for now
            </button>
          </div>
        )}

        {/* ──── STEP 9 — Evidence / Complete ──── */}
        {step === 9 && (
          <div style={{ animation: 'fadeSlideUp 0.4s both', textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🏠</div>
            <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 26, color: T.teal, marginBottom: 8 }}>
              Home is locked.
            </div>
            <div style={{ fontSize: 15, color: T.muted, marginBottom: 28, lineHeight: 1.65, maxWidth: 380, margin: '0 auto 28px' }}>
              {tierMsg(execScore)}
            </div>

            {/* Evidence summary — no scores surfaced to student */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ padding: '5px 14px', borderRadius: 20, background: T.greenDim, border: `1px solid ${T.green}44`, fontSize: 12, color: T.green, fontWeight: 700 }}>
                  Execution ✓
                </div>
                {ownershipPassed && (
                  <div style={{ padding: '5px 14px', borderRadius: 20, background: T.purpleDim, border: `1px solid ${T.purple}44`, fontSize: 12, color: T.purple, fontWeight: 700 }}>
                    Ownership ✓
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                You know where home is. You can hear it, say it, and explain it.
              </div>
            </div>

            <div style={{ fontSize: 12, color: T.faint, marginTop: 12 }}>
              Saving your results...
            </div>
          </div>
        )}

      </div>

      {/* ── Motesart corner (absent during quiz/ownership steps) ── */}
      {!isQuizStep && step < 8 && (
        <MotesartCorner
          message={motesartMsg}
          showRepeat={showRepeat && !!lastAudio}
          onRepeat={() => lastAudio?.()}
        />
      )}
    </div>
  )
}
