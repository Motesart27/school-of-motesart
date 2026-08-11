/**
 * MajorScalePatternGate.jsx
 * Gate 2 — Pattern Mind (M1 R3-FE §J — ratified numbering: T_MAJOR_SCALE_PATTERN is GATE 2)
 * SOM Mastery Intelligence Engine — Phase 1A
 *
 * Reads L00_major_scale_pattern.json and runs the full proof loop:
 *   teach → quiz (Q1-Q6 execution, Q7 ownership) → mistake detection
 *   → WYL intervention → re-quiz → evidence summary
 *
 * No Airtable writes. No MIDI. No keyboard. Pattern proof only.
 * Constitutional rules: numbers before letters, ownership before mastery,
 * confidence scores internal only, Motesart never speaks a percentage.
 */

import React, { useState, useEffect, useRef } from 'react'
import { loadLesson } from './lessonDataLoader.js'
import { buildGateResult, gateEvidenceAdapter } from './gateEvidenceAdapter.js'

// ─── Design tokens (SOM locked values) ───────────────────────────────────────
const T = {
  bg:       '#0a0a0f',
  surface:  'rgba(255,255,255,0.05)',
  border:   'rgba(255,255,255,0.09)',
  teal:     '#14b8a6',
  tealDim:  'rgba(20,184,166,0.18)',
  gold:     '#f59e0b',
  goldDim:  'rgba(245,158,11,0.15)',
  purple:   '#a855f7',
  red:      '#ef4444',
  redDim:   'rgba(239,68,68,0.14)',
  green:    '#22c55e',
  greenDim: 'rgba(34,197,94,0.13)',
  text:     '#f1f5f9',
  muted:    'rgba(255,255,255,0.45)',
  faint:    'rgba(255,255,255,0.22)',
  font:     "'DM Sans', -apple-system, sans-serif",
  display:  "'Outfit', -apple-system, sans-serif",
}

// ─── WYL Intervention Display ─────────────────────────────────────────────────
function WYLIntervention({ intervention, onDismiss }) {
  const icons = { visual: '👁', auditory: '👂', kinesthetic: '✋', readwrite: '✏️' }
  const colors = {
    visual:      T.teal,
    auditory:    T.purple,
    kinesthetic: T.gold,
    readwrite:   '#60a5fa',
  }

  return (
    <div style={{
      background: T.surface,
      border: `1.5px solid ${colors[intervention.mode] || T.teal}`,
      borderRadius: 16,
      padding: '20px 22px',
      marginBottom: 16,
      animation: 'fadeSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{icons[intervention.mode]}</span>
        <span style={{
          fontFamily: T.display, fontWeight: 700, fontSize: 13,
          color: colors[intervention.mode], letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {intervention.mode} support
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.muted }}>triggered by mistake</span>
      </div>

      <div style={{
        fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 14,
      }}>
        {intervention.content}
      </div>

      {/* W-W-H visual diagram for visual intervention */}
      {intervention.mode === 'visual' && (
        <div style={{ marginBottom: 14 }}>
          <PatternDiagram />
        </div>
      )}

      {/* BIG/SMALL tap game for kinesthetic */}
      {intervention.mode === 'kinesthetic' && (
        <KinestheticTap onComplete={onDismiss} />
      )}

      {/* Fill-in for readwrite */}
      {intervention.mode === 'readwrite' && (
        <ReadWriteFill onComplete={onDismiss} />
      )}

      {intervention.mode !== 'kinesthetic' && intervention.mode !== 'readwrite' && (
        <button onClick={onDismiss} style={{
          background: `${colors[intervention.mode]}22`,
          border: `1px solid ${colors[intervention.mode]}66`,
          borderRadius: 10, padding: '8px 18px',
          color: colors[intervention.mode], fontFamily: T.font,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Got it — try again
        </button>
      )}
    </div>
  )
}

// ─── W-W-H Pattern Diagram ────────────────────────────────────────────────────
function PatternDiagram() {
  const steps = [
    { label: 'W', num: '1→2', wide: true },
    { label: 'W', num: '2→3', wide: true },
    { label: 'H', num: '3→4', wide: false, highlight: true },
    { label: 'W', num: '4→5', wide: true },
    { label: 'W', num: '5→6', wide: true },
    { label: 'W', num: '6→7', wide: true },
    { label: 'H', num: '7→8', wide: false, highlight: true },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', padding: '8px 0' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: s.wide ? 2 : 1 }}>
          <div style={{
            width: '100%', height: s.wide ? 40 : 24,
            background: s.highlight ? T.teal : 'rgba(255,255,255,0.12)',
            borderRadius: 6,
            border: s.highlight ? `1px solid ${T.teal}` : '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: T.display, fontWeight: 800, fontSize: 13,
              color: s.highlight ? '#fff' : T.muted,
            }}>{s.label}</span>
          </div>
          <span style={{ fontSize: 10, color: T.faint, letterSpacing: '0.02em' }}>{s.num}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Kinesthetic BIG/SMALL tap ────────────────────────────────────────────────
function KinestheticTap({ onComplete }) {
  const sequence = ['BIG','BIG','SMALL','BIG','BIG','BIG','SMALL']
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState(null)

  function tap(choice) {
    if (choice === sequence[idx]) {
      setFeedback({ ok: true, msg: idx === 2 ? 'Half step — tight!' : idx === 6 ? 'Second half step. Locked.' : 'Whole step — room to breathe.' })
      setTimeout(() => {
        setFeedback(null)
        if (idx + 1 >= sequence.length) { onComplete() }
        else setIdx(i => i + 1)
      }, 900)
    } else {
      setFeedback({ ok: false, msg: `That's a ${sequence[idx] === 'BIG' ? 'whole' : 'half'} step. Try again.` })
      setTimeout(() => setFeedback(null), 1200)
    }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
        Step {idx + 1} of 7 — is {idx + 1}→{idx + 2} a BIG (whole) or SMALL (half) step?
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {['BIG', 'SMALL'].map(c => (
          <button key={c} onClick={() => tap(c)} style={{
            flex: 1, padding: '14px 0',
            background: c === 'BIG' ? 'rgba(20,184,166,0.12)' : 'rgba(245,158,11,0.12)',
            border: `1.5px solid ${c === 'BIG' ? T.teal : T.gold}`,
            borderRadius: 12, color: c === 'BIG' ? T.teal : T.gold,
            fontFamily: T.display, fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>{c}</button>
        ))}
      </div>
      {feedback && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 13,
          background: feedback.ok ? T.greenDim : T.redDim,
          color: feedback.ok ? T.green : T.red,
          border: `1px solid ${feedback.ok ? T.green : T.red}44`,
        }}>{feedback.msg}</div>
      )}
    </div>
  )
}

// ─── Read/Write fill-in ───────────────────────────────────────────────────────
function ReadWriteFill({ onComplete }) {
  const [vals, setVals] = useState(['', ''])
  const [checked, setChecked] = useState(false)
  const [ok, setOk] = useState(false)

  function check() {
    const pass = vals[0].trim().toUpperCase() === 'H' && vals[1].trim().toUpperCase() === 'H'
    setOk(pass)
    setChecked(true)
    if (pass) setTimeout(onComplete, 1200)
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: T.text, marginBottom: 12, lineHeight: 1.6 }}>
        Fill in: W &nbsp;–&nbsp; W &nbsp;–&nbsp;
        <input value={vals[0]} onChange={e => setVals([e.target.value, vals[1]])}
          style={{ width: 36, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 6px', color: T.text, fontFamily: T.font, fontSize: 13, textAlign: 'center' }} />
        &nbsp;–&nbsp; W &nbsp;–&nbsp; W &nbsp;–&nbsp; W &nbsp;–&nbsp;
        <input value={vals[1]} onChange={e => setVals([vals[0], e.target.value])}
          style={{ width: 36, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 6px', color: T.text, fontFamily: T.font, fontSize: 13, textAlign: 'center' }} />
      </div>
      {!checked && (
        <button onClick={check} style={{
          background: T.tealDim, border: `1px solid ${T.teal}66`,
          borderRadius: 10, padding: '8px 18px',
          color: T.teal, fontFamily: T.font, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>Check</button>
      )}
      {checked && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 13,
          background: ok ? T.greenDim : T.redDim,
          color: ok ? T.green : T.red,
          border: `1px solid ${ok ? T.green : T.red}44`,
        }}>
          {ok ? 'Yes — H and H. The half steps sit at 3-4 and 7-8. Every time.' : 'Both blanks should be H — for Half step. Try again.'}
        </div>
      )}
    </div>
  )
}

// ─── Question card ────────────────────────────────────────────────────────────
function QuestionCard({ q, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null)
  const [typed, setTyped]       = useState('')

  function submit(answer) {
    if (disabled) return
    onAnswer(q, answer)
  }

  if (q.type === 'multiple_choice') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {q.options.map(opt => (
          <button key={opt} onClick={() => { setSelected(opt); submit(opt) }}
            disabled={disabled}
            style={{
              padding: '14px 12px', borderRadius: 12,
              background: selected === opt ? T.tealDim : T.surface,
              border: `1.5px solid ${selected === opt ? T.teal : T.border}`,
              color: T.text, fontFamily: T.font, fontSize: 14, fontWeight: 600,
              cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
              textAlign: 'center',
            }}>{opt}</button>
        ))}
      </div>
    )
  }

  if (q.type === 'binary_choice') {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {q.options.map(opt => (
          <button key={opt} onClick={() => { setSelected(opt); submit(opt) }}
            disabled={disabled}
            style={{
              flex: 1, padding: '16px 0', borderRadius: 12,
              background: selected === opt ? T.tealDim : T.surface,
              border: `1.5px solid ${selected === opt ? T.teal : T.border}`,
              color: T.text, fontFamily: T.display, fontSize: 16, fontWeight: 700,
              cursor: disabled ? 'default' : 'pointer',
            }}>{opt}</button>
        ))}
      </div>
    )
  }

  if (q.type === 'sequence_build') {
    const [a, setA] = useState('')
    const [b, setB] = useState('')
    function submitSeq() {
      submit(`${a.trim().toUpperCase()},${b.trim().toUpperCase()}`)
    }
    return (
      <div>
        <div style={{ fontSize: 14, color: T.text, marginBottom: 12, lineHeight: 1.7 }}>
          W &nbsp;–&nbsp; W &nbsp;–&nbsp;
          <input value={a} onChange={e => setA(e.target.value)}
            placeholder="?" maxLength={1}
            style={{ width: 44, background: 'rgba(255,255,255,0.08)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 8px', color: T.text, fontFamily: T.font, fontSize: 15, textAlign: 'center' }} />
          &nbsp;–&nbsp; W &nbsp;–&nbsp; W &nbsp;–&nbsp; W &nbsp;–&nbsp;
          <input value={b} onChange={e => setB(e.target.value)}
            placeholder="?" maxLength={1}
            style={{ width: 44, background: 'rgba(255,255,255,0.08)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 8px', color: T.text, fontFamily: T.font, fontSize: 15, textAlign: 'center' }} />
        </div>
        <button onClick={submitSeq} disabled={!a || !b || disabled} style={{
          background: T.tealDim, border: `1px solid ${T.teal}66`,
          borderRadius: 10, padding: '9px 20px',
          color: T.teal, fontFamily: T.font, fontSize: 13, fontWeight: 700,
          cursor: (!a || !b || disabled) ? 'not-allowed' : 'pointer', opacity: (!a || !b) ? 0.5 : 1,
        }}>Submit</button>
      </div>
    )
  }

  // recall_spoken_or_typed / ownership_explain
  return (
    <div>
      <textarea value={typed} onChange={e => setTyped(e.target.value)}
        placeholder={q.type === 'ownership_explain' ? 'Explain in your own words...' : 'Type your answer...'}
        rows={3}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${T.border}`, borderRadius: 12,
          padding: '12px 14px', color: T.text, fontFamily: T.font, fontSize: 14,
          resize: 'none', outline: 'none', boxSizing: 'border-box',
          lineHeight: 1.5,
        }} />
      <button onClick={() => submit(typed.trim())} disabled={!typed.trim() || disabled} style={{
        marginTop: 10,
        background: T.tealDim, border: `1px solid ${T.teal}66`,
        borderRadius: 10, padding: '9px 22px',
        color: T.teal, fontFamily: T.font, fontSize: 13, fontWeight: 700,
        cursor: (!typed.trim() || disabled) ? 'not-allowed' : 'pointer',
        opacity: !typed.trim() ? 0.5 : 1,
      }}>Submit answer</button>
    </div>
  )
}

// ─── Main Gate 2 Component ────────────────────────────────────────────────────
export default function MajorScalePatternGate({ onGatePassed }) {
  const [lesson, setLesson]           = useState(null)
  const [loadError, setLoadError]     = useState(null)
  const [phase, setPhase]             = useState('teach')   // teach | quiz | wyl | complete
  const [qIdx, setQIdx]               = useState(0)
  const [answers, setAnswers]         = useState({})        // questionId → { raw, correct, mistakeCode }
  const [feedback, setFeedback]       = useState(null)      // { correct, msg }
  const [activeWYL, setActiveWYL]     = useState(null)      // { mode, content, trigger }
  const [attemptCounts, setAttemptCounts] = useState({})    // questionId → number
  const [executionScore, setExecutionScore] = useState(0)
  const [ownershipPassed, setOwnershipPassed] = useState(false)
  const [confidenceScore, setConfidenceScore] = useState(0)
  const feedbackTimer = useRef(null)

  // Load lesson JSON on mount
  useEffect(() => {
    loadLesson('L00_major_scale_pattern')
      .then(setLesson)
      .catch(e => setLoadError(e.message))
  }, [])

  if (loadError) return (
    <div style={{ background: T.bg, color: T.red, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font, padding: 40, textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15 }}>Could not load Gate 2 lesson data.</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>{loadError}</div>
      </div>
    </div>
  )

  if (!lesson) return (
    <div style={{ background: T.bg, color: T.muted, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${T.teal}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 13 }}>Loading lesson...</div>
      </div>
    </div>
  )

  const questions      = lesson.proof.questions
  const currentQ       = questions[qIdx]
  // Data-driven: ownership gate is marked with is_ownership_gate: true in the JSON
  const isOwnershipQ   = currentQ?.is_ownership_gate === true
  const ownershipQ     = questions.find(q => q.is_ownership_gate === true)
  const totalQ         = questions.length

  // Detect mistake category from wrong answer
  function detectMistake(q, rawAnswer) {
    const a = rawAnswer.toLowerCase()
    if (q.question_id === 'G0_Q4' && a.includes('half')) return 'REVERSAL_CONFUSION'
    if ((q.question_id === 'G0_Q2' || q.question_id === 'G0_Q3') &&
        !a.includes('3 and 4') && !a.includes('7 and 8') && !a.includes('h,h') && !a.includes('h h')) {
      return 'WRONG_HALF_STEP_LOCATION'
    }
    if (q.question_id === 'G0_Q1' && (a.includes('incomplete') || a.split(' ').length < 5)) {
      return 'INCOMPLETE_PATTERN'
    }
    if (/\b[cdefgab]\b/i.test(rawAnswer) && !/whole|half|w|h/i.test(rawAnswer)) {
      return 'LETTER_SYSTEM_BLEED'
    }
    return 'INCOMPLETE_PATTERN'
  }

  // Check if typed answer matches acceptable answers
  function checkRecall(q, raw) {
    const a = raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
    if (q.acceptable_answers) {
      return q.acceptable_answers.some(acc => a.includes(acc.toLowerCase().replace(/[^a-z0-9 ]/g, '')))
    }
    if (q.acceptable_signals) {
      return q.acceptable_signals.some(sig => a.includes(sig.toLowerCase()))
    }
    return false
  }

  // Check sequence build (H,H)
  function checkSequence(q, raw) {
    const normalized = raw.toUpperCase().replace(/\s/g, '')
    const expected = (q.correct_sequence || []).join(',').toUpperCase()
    return normalized === expected || normalized === 'HH'
  }

  function isCorrect(q, raw) {
    if (q.type === 'multiple_choice' || q.type === 'binary_choice') {
      return raw.toLowerCase().trim() === (q.correct || '').toLowerCase().trim()
    }
    if (q.type === 'sequence_build') return checkSequence(q, raw)
    return checkRecall(q, raw)
  }

  // Select WYL intervention based on mistake code
  function selectWYL(mistakeCode) {
    const inv = lesson.wyl_interventions.interventions
    if (mistakeCode === 'REVERSAL_CONFUSION') return { mode: 'auditory', ...inv.auditory }
    if (mistakeCode === 'LETTER_SYSTEM_BLEED') return { mode: 'visual', ...inv.visual }
    if (mistakeCode === 'WRONG_HALF_STEP_LOCATION') return { mode: 'visual', ...inv.visual }
    // After 2 attempts → kinesthetic
    const attempts = attemptCounts[currentQ?.question_id] || 0
    if (attempts >= 2) return { mode: 'kinesthetic', ...inv.kinesthetic }
    return { mode: 'readwrite', ...inv.readwrite }
  }

  // Compute confidence score (0-100)
  function computeConfidence(answersMap, qs) {
    let correct = 0
    let total = 0
    qs.slice(0, -1).forEach(q => { // Q1-Q6 only
      total++
      if (answersMap[q.question_id]?.correct) correct++
    })
    return total > 0 ? Math.round((correct / total) * 100) : 0
  }

  function handleAnswer(q, raw) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)

    const correct = isCorrect(q, raw)
    const mistakeCode = correct ? null : detectMistake(q, raw)

    // Track attempts
    setAttemptCounts(prev => ({ ...prev, [q.question_id]: (prev[q.question_id] || 0) + 1 }))

    // Record answer
    setAnswers(prev => ({ ...prev, [q.question_id]: { raw, correct, mistakeCode } }))

    if (correct) {
      const msg = q.motesart_correct || 'That\'s it.'
      setFeedback({ correct: true, msg })

      if (q.is_ownership_gate === true) {
        // Ownership gate passed — detected via is_ownership_gate flag in lesson JSON
        setOwnershipPassed(true)
        const score = computeConfidence({ ...answers, [q.question_id]: { correct: true } }, questions)
        setConfidenceScore(score)
        setFeedback({ correct: true, msg })
        feedbackTimer.current = setTimeout(() => {
          setFeedback(null)
          setPhase('complete')
        }, 1800)
        return
      }

      feedbackTimer.current = setTimeout(() => {
        setFeedback(null)
        if (qIdx + 1 < totalQ) setQIdx(i => i + 1)
      }, 1500)

    } else {
      const msg = q.motesart_wrong || 'Not quite. Try again.'
      setFeedback({ correct: false, msg })

      // After showing feedback, trigger WYL if enough attempts
      const attempts = (attemptCounts[q.question_id] || 0) + 1
      if (attempts >= 2 && !isOwnershipQ) {
        feedbackTimer.current = setTimeout(() => {
          setFeedback(null)
          setActiveWYL(selectWYL(mistakeCode))
          setPhase('wyl')
        }, 1800)
      } else {
        feedbackTimer.current = setTimeout(() => setFeedback(null), 2000)
      }
    }
  }

  function onWYLDismiss() {
    setActiveWYL(null)
    setPhase('quiz')
    // Reset attempt count so student gets a fresh try
    setAttemptCounts(prev => ({ ...prev, [currentQ?.question_id]: 0 }))
  }

  // Motesart response from confidence tier
  function motesartResponse(score) {
    const tiers = lesson.mastery_rule.confidence_tiers
    if (score >= 95) return tiers.mastered.motesart_response
    if (score >= 85) return tiers.owned.motesart_response
    if (score >= 70) return tiers.almost_owned.motesart_response
    if (score >= 40) return tiers.developing.motesart_response
    return tiers.not_ready.motesart_response
  }

  // Progress fraction: execution questions only (ownership gate excluded from bar)
  const execQCount   = questions.filter(q => !q.is_ownership_gate).length
  const execAnswered = Object.keys(answers).filter(id => {
    const q = questions.find(qq => qq.question_id === id)
    return q && !q.is_ownership_gate && answers[id]?.correct
  }).length
  const progressPct = Math.round((execAnswered / execQCount) * 100)

  return (
    <div style={{
      background: T.bg,
      minHeight: '100vh',
      fontFamily: T.font,
      color: T.text,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${T.teal}; outline-offset: 2px; }
        textarea:focus { border-color: ${T.teal} !important; }
        input:focus { outline: none; border-color: ${T.teal} !important; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 24px',
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <img src="/Motesart Avatar 1.PNG" alt="Motesart"
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${T.teal}44` }}
          onError={e => { e.currentTarget.style.display='none' }} />
        <div>
          <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 13, color: T.teal, letterSpacing: '0.05em' }}>MOTESART</div>
          <div style={{ fontSize: 11, color: T.muted }}>Gate 2 · Pattern Mind</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 120 }}>
          <div style={{ fontSize: 10, color: T.muted }}>
            {phase === 'complete' ? 'Complete' : `${execAnswered}/${execQCount} execution`}
          </div>
          <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{
              width: `${phase === 'complete' ? 100 : progressPct}%`,
              height: '100%', background: T.teal, borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 48px', maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* ── TEACH phase ── */}
        {phase === 'teach' && (
          <div style={{ width: '100%', animation: 'fadeSlideUp 0.4s both' }}>
            {/* Motesart intro */}
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              padding: '22px 24px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Motesart</div>
              <div style={{ fontSize: 16, lineHeight: 1.7, color: T.text }}>{lesson.teach.motesart_intro}</div>
            </div>

            {/* Core concept */}
            <div style={{
              background: `linear-gradient(135deg, rgba(20,184,166,0.12), rgba(168,85,247,0.08))`,
              border: `1.5px solid ${T.teal}44`,
              borderRadius: 18, padding: '20px 24px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>The Pattern</div>
              <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 20, color: T.teal, marginBottom: 14, letterSpacing: '0.02em' }}>
                {lesson.teach.core_concept}
              </div>
              <PatternDiagram />
            </div>

            {/* Shorthand */}
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Remember this</div>
              <div style={{ fontSize: 15, lineHeight: 1.65, color: T.text }}>{lesson.teach.motesart_shorthand}</div>
            </div>

            {/* Key facts */}
            <div style={{ marginBottom: 24 }}>
              {lesson.teach.key_facts.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 16px', marginBottom: 6,
                  background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`,
                }}>
                  <span style={{ color: T.teal, fontWeight: 800, fontSize: 13, marginTop: 1, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.55, color: T.text }}>{f}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setPhase('quiz')} style={{
              width: '100%', padding: '16px 0',
              background: T.teal, border: 'none', borderRadius: 14,
              color: '#fff', fontFamily: T.display, fontWeight: 800, fontSize: 16,
              cursor: 'pointer', letterSpacing: '0.03em',
            }}>
              I'm ready — start the quiz →
            </button>
          </div>
        )}

        {/* ── QUIZ phase ── */}
        {phase === 'quiz' && currentQ && (
          <div style={{ width: '100%', animation: 'fadeSlideUp 0.35s both' }}>

            {/* Question number indicator */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {questions.map((q, i) => {
                const done = answers[q.question_id]?.correct
                const active = i === qIdx
                const isOwnership = q.is_ownership_gate === true
                return (
                  <div key={q.question_id} style={{
                    height: 4, borderRadius: 2,
                    flex: isOwnership ? 2 : 1,
                    background: done ? T.teal : active ? T.gold : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                )
              })}
            </div>

            {/* Ownership gate banner */}
            {isOwnershipQ && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                padding: '8px 14px', background: `rgba(168,85,247,0.12)`,
                border: `1px solid ${T.purple}44`, borderRadius: 10,
              }}>
                <span style={{ fontSize: 16 }}>🔑</span>
                <span style={{ fontSize: 13, color: T.purple, fontWeight: 600 }}>
                  Ownership gate — explain it in your own words to pass
                </span>
              </div>
            )}

            {/* Question card */}
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 18, padding: '22px 22px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Question {qIdx + 1} of {totalQ}
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.6, color: T.text, marginBottom: 20, fontWeight: 500 }}>
                {currentQ.prompt}
              </div>
              <QuestionCard q={currentQ} onAnswer={handleAnswer} disabled={!!feedback} />
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{
                padding: '14px 18px', borderRadius: 14, marginBottom: 10,
                background: feedback.correct ? T.greenDim : T.redDim,
                border: `1.5px solid ${feedback.correct ? T.green : T.red}55`,
                animation: 'fadeSlideUp 0.25s both',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{feedback.correct ? '✓' : '✗'}</span>
                  <span style={{
                    fontSize: 14, color: feedback.correct ? T.green : T.red, fontWeight: 600, lineHeight: 1.5,
                  }}>{feedback.msg}</span>
                </div>
              </div>
            )}

            {/* Skip to teach button */}
            <button onClick={() => setPhase('teach')} style={{
              background: 'none', border: 'none', color: T.muted,
              fontSize: 12, cursor: 'pointer', padding: '6px 0', fontFamily: T.font,
            }}>← Review the lesson</button>
          </div>
        )}

        {/* ── WYL phase ── */}
        {phase === 'wyl' && activeWYL && (
          <div style={{ width: '100%', animation: 'fadeSlideUp 0.35s both' }}>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              T.A.M.i · intervention
            </div>
            <WYLIntervention intervention={activeWYL} onDismiss={onWYLDismiss} />
          </div>
        )}

        {/* ── COMPLETE phase ── */}
        {phase === 'complete' && (
          <div style={{ width: '100%', animation: 'fadeSlideUp 0.4s both', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{
              fontFamily: T.display, fontWeight: 800, fontSize: 26, color: T.teal, marginBottom: 8,
            }}>Gate 2 — Pattern Mind</div>
            <div style={{ fontSize: 15, color: T.muted, marginBottom: 28, lineHeight: 1.6 }}>
              {motesartResponse(confidenceScore)}
            </div>

            {/* Evidence summary (teacher-facing internal, shown as clean list) */}
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: '18px 22px', marginBottom: 24, textAlign: 'left',
            }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Session evidence</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 14px', borderRadius: 20, background: T.greenDim, border: `1px solid ${T.green}44`, fontSize: 12, color: T.green, fontWeight: 700 }}>
                  Execution ✓
                </div>
                {ownershipPassed && (
                  <div style={{ padding: '6px 14px', borderRadius: 20, background: `rgba(168,85,247,0.13)`, border: `1px solid ${T.purple}44`, fontSize: 12, color: T.purple, fontWeight: 700 }}>
                    Ownership ✓
                  </div>
                )}
              </div>
              {questions.map(q => {
                const a = answers[q.question_id]
                return (
                  <div key={q.question_id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 0', borderBottom: `1px solid ${T.border}`,
                    fontSize: 12,
                  }}>
                    <span style={{ color: a?.correct ? T.green : T.red, fontWeight: 800, width: 14 }}>{a?.correct ? '✓' : '✗'}</span>
                    <span style={{ color: T.muted, flex: 1 }}>{q.prompt.slice(0, 55)}{q.prompt.length > 55 ? '…' : ''}</span>
                  </div>
                )
              })}
            </div>

            <button onClick={() => {
              // Shared construction + flag-gated-OFF evidence seam (Amendment 4).
              // onGatePassed payload preserved exactly for the wrapper.
              gateEvidenceAdapter(buildGateResult({
                concept: 'major_scale_pattern',
                executionScore: progressPct,
                ownershipPassed,
                confidenceScore,
              }))
              onGatePassed?.({ executionScore: progressPct, ownershipPassed, confidenceScore })
            }} style={{
              width: '100%', padding: '16px 0',
              background: T.teal, border: 'none', borderRadius: 14,
              color: '#fff', fontFamily: T.display, fontWeight: 800, fontSize: 16,
              cursor: 'pointer',
            }}>
              {/* M1 R3.1-FE §J — the prior copy claimed "Next: Sound
                  Recognition — Gate 1", which is both a backwards gate
                  number (Gate 2 cannot lead to Gate 1) and a gate with no
                  content-supported registry entry. Gate 2 is the last
                  ratified gate in this package — no fabricated next-gate
                  metadata. */}
              Gate 2 complete — Continue →
            </button>

            <button onClick={() => { setPhase('quiz'); setQIdx(0); setAnswers({}); setAttemptCounts({}); setOwnershipPassed(false); setFeedback(null) }}
              style={{ marginTop: 12, background: 'none', border: 'none', color: T.muted, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>
              Retry from the beginning
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
