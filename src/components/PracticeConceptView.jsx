import React, { useState, useEffect } from 'react'
import { COLORS, FONTS, GRADIENTS } from '../styles/theme.js'

const WHITE_KEY_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']
const BLACK_OFFSETS   = [0, 1, 3, 4, 5]
const PHASES          = ['teach', 'guide', 'confirm', 'release']
const PHASE_LABELS    = { teach: 'Teaching', guide: 'Guided Practice', confirm: 'Confirm', release: 'You Got This' }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');
  @keyframes keyGlow {
    0%,100% { box-shadow: 0 0 0 2px rgba(110,231,183,0); }
    50%      { box-shadow: 0 0 14px 4px rgba(110,231,183,0.55); }
  }
  @keyframes numGlow {
    0%,100% { color: #059669; text-shadow: none; }
    50%     { color: #10b981; text-shadow: 0 0 8px rgba(16,185,129,0.65); }
  }
  @keyframes speakBar {
    0%   { transform: scaleY(0.35); }
    100% { transform: scaleY(1); }
  }
  @keyframes pcvFadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes bounceDot {
    0%,100% { transform:translateY(0); opacity:0.5; }
    50%     { transform:translateY(-5px); opacity:1; }
  }
  @keyframes pulseGreen {
    0%,100% { opacity:1; transform:scale(1); }
    50%     { opacity:0.5; transform:scale(1.4); }
  }
  @keyframes doubleArrowPulse {
    0%,100% { opacity:1; transform:translateX(-50%) scaleX(1); }
    50%     { opacity:0.45; transform:translateX(-50%) scaleX(0.72); }
  }
  .pcv-root {
    min-height: 100vh;
    background: linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%);
    font-family: 'DM Sans',-apple-system,sans-serif;
    display: flex;
    flex-direction: column;
    color: #fff;
  }
  .pcv-root * { box-sizing: border-box; }
  .pcv-body {
    display: flex;
    flex: 1;
    gap: 24px;
    padding: 16px 28px 12px;
    align-items: flex-start;
    animation: pcvFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  .pcv-avatar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 200px;
    max-width: 220px;
  }
  .mot-av {
    width: 170px;
    height: 170px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid rgba(168,85,247,0.55);
    background: linear-gradient(135deg,#a855f7,#e84b8a);
    flex-shrink: 0;
  }
  .mot-av img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }
  .pcv-av-name {
    color: #d946ef;
    font-family: 'Outfit', sans-serif;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 2px;
  }
  .pcv-status-box {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 52px;
  }
  .pcv-status-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pcv-status-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.4px;
  }
  .pcv-speak-bars {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-left: auto;
  }
  .pcv-speak-bar {
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(180deg,#e84b8a,#f97316);
    animation: speakBar 0.72s ease-in-out infinite alternate;
    transform-origin: bottom;
  }
  .pcv-bounce-dots {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .pcv-bd {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: bounceDot 0.9s ease-in-out infinite;
  }
  .pcv-bd:nth-child(2) { animation-delay: 0.2s; }
  .pcv-bd:nth-child(3) { animation-delay: 0.4s; }
  .pcv-listen-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulseGreen 1.1s ease-in-out infinite;
    margin-left: auto;
  }
  .pcv-chat-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .pcv-chat-inp {
    flex: 1;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 6px 10px;
    color: #fff;
    font-size: 13px;
    outline: none;
    font-family: 'DM Sans', sans-serif;
  }
  .pcv-chat-inp::placeholder { color: rgba(255,255,255,0.3); }
  .pcv-send-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(96,165,250,0.2);
    border: 1px solid rgba(96,165,250,0.4);
    color: #60a5fa;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .pcv-mic-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(96,165,250,0.1);
    border: 1px solid rgba(96,165,250,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .pcv-speech-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .piano-container {
    position: relative;
    width: 100%;
    height: 140px;
    background: linear-gradient(180deg,#111,#000);
    border-radius: 12px;
    border: 2px solid #222;
    border-top: 4px solid #333;
    overflow: visible;
    user-select: none;
  }
  .pcv-btn-answer {
    min-height: 54px;
    padding: 16px;
    background: rgba(255,255,255,0.06);
    border: 1.5px solid rgba(255,255,255,0.11);
    border-radius: 14px;
    color: rgba(255,255,255,0.88);
    font-family: 'Outfit',sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s, border-color .15s, transform .12s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pcv-btn-answer:hover {
    background: rgba(255,255,255,0.11);
    border-color: rgba(255,255,255,0.22);
    transform: translateY(-1px);
  }
  .pcv-btn-answer:active { transform: translateY(0); }
  .pcv-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pcv-answer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }
  .pcv-speech-card { padding: 20px 22px; }
  .pcv-speech-text { font-size: 15px; color: rgba(255,255,255,0.85); line-height: 1.65; }
  @media (max-width: 700px) {
    .pcv-body { flex-direction: column; padding: 12px 16px; }
    .pcv-avatar-col { flex-direction: row; min-width: unset; max-width: unset; width: 100%; align-items: center; }
    .mot-av { width: 72px; height: 72px; }
    .piano-container { height: 120px; }
  }
  .pcv-unified-row {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px; flex-wrap: nowrap; min-height: 56px;
  }
  .pcv-pill {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 700;
    flex-shrink: 0; transition: all 0.3s; white-space: nowrap;
  }
  .pcv-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pcvPd 1.2s ease-in-out infinite; }
  @keyframes pcvPd { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
  .pcv-pill-speaking { background:rgba(232,75,138,0.15); color:#e84b8a; border:1px solid rgba(232,75,138,0.3); }
  .pcv-pill-listening { background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.3); }
  .pcv-pill-thinking { background:rgba(168,85,247,0.15); color:#a855f7; border:1px solid rgba(168,85,247,0.3); }
  .pcv-pill-retry { background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); }
  .pcv-row-wave { display:flex; align-items:center; gap:2px; flex-shrink:0; }
  .pcv-row-wb { width:3px; border-radius:2px; background:#e84b8a; transform-origin:bottom; animation:pcvWv 0.65s ease-in-out infinite alternate; }
  .pcv-row-wb:nth-child(1){height:5px;animation-delay:0s}
  .pcv-row-wb:nth-child(2){height:11px;animation-delay:0.1s}
  .pcv-row-wb:nth-child(3){height:7px;animation-delay:0.2s}
  .pcv-row-wb:nth-child(4){height:13px;animation-delay:0.15s}
  .pcv-row-wb:nth-child(5){height:4px;animation-delay:0.05s}
  @keyframes pcvWv{0%{transform:scaleY(0.3)}100%{transform:scaleY(1)}}
  .pcv-think-dots { display:flex; align-items:center; gap:3px; flex-shrink:0; }
  .pcv-td { width:5px; height:5px; border-radius:50%; background:#a855f7; animation:pcvBounce 0.9s ease-in-out infinite; }
  .pcv-td:nth-child(2){animation-delay:0.2s}.pcv-td:nth-child(3){animation-delay:0.4s}
  @keyframes pcvBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .pcv-row-replay {
    background:rgba(232,75,138,0.12); border:1px solid rgba(232,75,138,0.3);
    color:#e84b8a; border-radius:20px; padding:5px 13px;
    font-size:12px; font-weight:700; cursor:pointer; flex-shrink:0; white-space:nowrap;
  }
  .pcv-row-spacer { flex:1; }
  .pcv-row-mic {
    width:36px; height:36px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.3s; border:none; position:relative;
  }
  .pcv-row-mic.listening { background:rgba(34,197,94,0.2); border:1.5px solid rgba(34,197,94,0.6); }
  .pcv-row-mic.retry { background:rgba(245,158,11,0.2); border:1.5px solid rgba(245,158,11,0.5); }
  .pcv-row-inp {
    flex:1; min-width:0;
    background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
    border-radius:10px; padding:8px 13px; color:#fff; font-size:14px;
    font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s;
  }
  .pcv-row-inp.active { border-color:rgba(34,197,94,0.45); }
  .pcv-row-inp::placeholder { color:rgba(255,255,255,0.28); }
  .pcv-row-inp:disabled { opacity:0.25; }
  .pcv-row-sub {
    padding:7px 16px; border-radius:10px; border:none; flex-shrink:0;
    background:linear-gradient(135deg,#a855f7,#e84b8a);
    color:#fff; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap;
  }
  .pcv-row-sub:disabled { opacity:0.2; cursor:not-allowed; background:rgba(255,255,255,0.08); }
`

// ── Double-sided pulsing arrow ──
function KeyArrow({ from, to }) {
  const kW = 100 / 8
  const x1 = (from + 0.5) * kW
  const x2 = (to + 0.5) * kW
  const cx = (x1 + x2) / 2
  const y  = 44
  const hw = (x2 - x1) * 0.38

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 3, overflow: 'visible',
      }}
    >
      <g style={{
        transformOrigin: `${cx}% ${y}%`,
        animation: 'doubleArrowPulse 1s ease-in-out infinite',
        transform: 'scaleX(1)',
      }}>
        {/* left arrowhead */}
        <polygon
          points={`${x1},${y} ${x1 + 3.5},${y - 3} ${x1 + 3.5},${y + 3}`}
          fill="#34d399"
        />
        {/* shaft */}
        <rect
          x={x1 + 3} y={y - 1.2}
          width={x2 - x1 - 6} height={2.4}
          rx="1.2" fill="#34d399"
        />
        {/* right arrowhead */}
        <polygon
          points={`${x2},${y} ${x2 - 3.5},${y - 3} ${x2 - 3.5},${y + 3}`}
          fill="#34d399"
        />
      </g>
    </svg>
  )
}

// ── Piano keyboard ──
function Piano({ highlightedKeys, homeKeyIndex, showHomeKey }) {
  const kW = 100 / 8
  return (
    <div className="piano-container">
      <div style={{ display: 'flex', height: '100%', gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const isFocus = highlightedKeys.includes(i)
          const isHome  = showHomeKey && i === homeKeyIndex
          const bg   = isFocus ? '#d4f5e0' : isHome ? '#fde8c8' : '#f8f8f8'
          const bdrB = isFocus ? '4px solid #90d4a8' : isHome ? '4px solid #e8c890' : '4px solid #c8c8c8'
          return (
            <div key={i} style={{
              flex: 1, background: bg, borderRadius: '0 0 9px 9px',
              borderRight: '1px solid #e0e0e0', borderBottom: bdrB, position: 'relative',
              animation: isFocus ? 'keyGlow 1.6s ease-in-out infinite' : 'none',
            }}>
              <span style={{
                position: 'absolute', bottom: 22, left: 0, right: 0,
                textAlign: 'center', display: 'block', fontSize: 16, fontWeight: 900, lineHeight: 1,
                color: isFocus ? '#059669' : isHome ? '#b7791f' : '#555',
                animation: isFocus ? 'numGlow 1.6s ease-in-out infinite' : 'none',
              }}>{i + 1}</span>
              <span style={{
                position: 'absolute', bottom: 7, left: 0, right: 0,
                textAlign: 'center', display: 'block', fontSize: 11, fontWeight: 700,
                color: isFocus ? '#047857' : isHome ? '#975a16' : '#999',
              }}>{WHITE_KEY_NAMES[i]}</span>
            </div>
          )
        })}
      </div>
      {BLACK_OFFSETS.map(offset => (
        <div key={offset} style={{
          position: 'absolute', top: 0, zIndex: 2,
          left: `${(offset + 1) * kW - kW * 0.32}%`,
          width: `${kW * 0.62}%`, height: '62%',
          background: 'linear-gradient(180deg,#1a1a2e 0%,#0d0d1a 100%)',
          borderRadius: '0 0 6px 6px',
          boxShadow: '0 6px 12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)',
        }} />
      ))}
      {highlightedKeys.length >= 2 && (
        <KeyArrow from={highlightedKeys[0]} to={highlightedKeys[1]} />
      )}
    </div>
  )
}



// ── Unified Row — Motesart status + student response in one bar ──
function UnifiedRow({ isSpeaking, isLoading, studentTurn, retryMode, promptMode, onReplay, onStudentResponse }) {
  const [transcript, setTranscript] = React.useState('')
  const [micActive, setMicActive] = React.useState(false)
  const recognitionRef = React.useRef(null)

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setTranscript(text)
    }
    rec.onerror = () => { console.warn('[Mic] error'); setMicActive(false) }
    rec.onend = () => {
      setMicActive(false)
      // Auto-evaluate on speech end only if transcript is valid (2+ chars)
      setTranscript(prev => {
        if (prev && prev.trim().length >= 2) {
          // Schedule submit after state settles
          setTimeout(() => {
            const t = prev.trim()
            if (t.length >= 2) {
              onStudentResponse?.(t)
            }
          }, 300)
        }
        return prev
      })
    }
    rec.start()
    recognitionRef.current = rec
    setMicActive(true)
  }

  const stopMic = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
    setMicActive(false)
  }

  const handleSubmit = () => {
    const text = transcript.trim()
    if (!text || text.length < 2) return
    onStudentResponse?.(text)
    setTranscript('')
    stopMic()
  }

  // Determine pill state
  const pillClass = isSpeaking ? 'pcv-pill pcv-pill-speaking'
    : isLoading ? 'pcv-pill pcv-pill-thinking'
    : retryMode ? 'pcv-pill pcv-pill-retry'
    : studentTurn ? 'pcv-pill pcv-pill-listening'
    : 'pcv-pill pcv-pill-speaking'

  const pillText = isSpeaking ? 'speaking now'
    : isLoading ? 'thinking...'
    : retryMode ? 'almost — try again'
    : studentTurn ? 'your turn'
    : '—'

  const showStudentInput = (studentTurn || retryMode || promptMode) && !isSpeaking && (autoSpeak ? !isLoading : true)
  const micColor = retryMode ? '#f59e0b' : '#22c55e'
  const micClass = `pcv-row-mic ${retryMode ? 'retry' : 'listening'}`

  return (
    <div className="pcv-unified-row">
      <span style={{ fontSize:13, fontWeight:800, color:'#e84b8a', flexShrink:0, letterSpacing:'0.04em' }}>Motesart</span>

      <div className={pillClass}>
        <div className="pcv-pill-dot" />
        <span>{pillText}</span>
      </div>

      {/* Speaking: waveform + replay */}
      {(isSpeaking || (!studentTurn && !retryMode && !isLoading)) && (
        <>
          <div className="pcv-row-wave">
            {[5,11,7,13,4].map((h,i) => (
              <div key={i} className="pcv-row-wb" style={{ height:h, opacity: isSpeaking ? 1 : 0.25 }} />
            ))}
          </div>
          <button className="pcv-row-replay" onClick={onReplay}>↺ Replay</button>
        </>
      )}

      {/* Thinking: dots */}
      {isLoading && (
        <div className="pcv-think-dots">
          <div className="pcv-td" /><div className="pcv-td" /><div className="pcv-td" />
        </div>
      )}

      {/* Student turn: mic + input + submit */}
      {showStudentInput && (
        <>
          <div className="pcv-row-spacer" />
          <button
            className={micClass}
            onClick={() => micActive ? stopMic() : startMic()}
            style={{ background: micActive ? `rgba(${retryMode?'245,158,11':'34,197,94'},0.3)` : undefined }}
          >
            <svg width="15" height="18" viewBox="0 0 15 20" fill="none" stroke={micActive ? micColor : 'rgba(255,255,255,0.5)'} strokeWidth="1.8">
              <rect x="4.5" y="0" width="6" height="11" rx="3"/>
              <path d="M1 9a6.5 6.5 0 0013 0M7.5 17v3M4 20h7"/>
            </svg>
          </button>
          <input
            className={`pcv-row-inp${micActive ? ' active' : ''}`}
            placeholder={micActive ? 'Listening — speak now...' : 'Type or tap mic to speak...'}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && transcript.trim()) handleSubmit() }}
          />
          <button
            className="pcv-row-sub"
            disabled={!transcript.trim()}
            onClick={handleSubmit}
          >Submit</button>
        </>
      )}
    </div>
  )
}

// ── Main component ──
export default function PracticeConceptView({
  conceptName      = 'The Half Step',
  conceptDesc      = 'The smallest distance in music',
  phase            = 'teach',
  speechText       = 'Listen to how close together these two keys are. This is a half step — the smallest move in music.',
  highlightedKeys  = [2, 3],
  homeKeyIndex     = 0,
  answerOptions    = ['1 & 2', '3 & 4', '5 & 6', '7 & 8'],
  correctAnswer    = '3 & 4',
  bpm              = 92,
  studentTurn      = false,
  retryMode        = false,
  promptMode       = false,
  autoSpeak        = true,
  onAnswer,
  onReplay,
  onBack,
  onStudentSend,
  onStudentResponse,
}) {
  const [showHomeKey, setShowHomeKey]   = useState(false)
  const [bpmVal, setBpmVal]             = useState(bpm)
  const [isSpeaking, setIsSpeaking]     = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [displayedWords, setDisplayedWords] = useState([])
  const wordTimerRef = React.useRef(null)
  const phaseIdx = PHASES.indexOf(phase)

  // ── Word-by-word animation ──
  useEffect(() => {
    if (!speechText) return
    const words = speechText.split(' ')
    setDisplayedWords([])
    if (wordTimerRef.current) clearInterval(wordTimerRef.current)
    const estimatedDuration = Math.max(2000, (words.length / 2.5) * 1000)
    const interval = estimatedDuration / words.length
    let i = 0
    wordTimerRef.current = setInterval(() => {
      i++
      setDisplayedWords(words.slice(0, i))
      if (i >= words.length) clearInterval(wordTimerRef.current)
    }, interval)
    return () => clearInterval(wordTimerRef.current)
  }, [speechText])

  // Snap to full text when speaking ends
  useEffect(() => {
    if (!isSpeaking && speechText) {
      setDisplayedWords(speechText.split(' '))
      if (wordTimerRef.current) clearInterval(wordTimerRef.current)
    }
  }, [isSpeaking, speechText])

  useEffect(() => {
    if (!autoSpeak || !speechText || !onReplay) return
    setIsLoading(true)
    setIsSpeaking(false)
    onReplay()
      .then(() => { setIsLoading(false) })
      .catch(() => { setIsLoading(false) })
  }, [speechText, autoSpeak])

  const S = {
    glass: {
      background: 'rgba(20,20,40,0.65)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 18,
    },
    label: { fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.09em' },
  }

  return (
    <div className="pcv-root">
      <style>{css}</style>

      {/* ── Top nav ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px 10px', gap:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} style={{
          minHeight:40, padding:'7px 16px', borderRadius:12,
          background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.11)',
          color:'rgba(255,255,255,0.65)', fontFamily:FONTS.body, fontSize:13, fontWeight:600, cursor:'pointer',
        }}>← Back</button>
        <div style={{
          flex:1, textAlign:'center', padding:'6px 12px', borderRadius:20,
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
          fontFamily:FONTS.display, fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.92)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{conceptName}</div>
        <div style={{ display:'flex', alignItems:'center', gap:2, padding:'4px 10px', borderRadius:12,
          background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }}>
          <button className="pcv-icon-btn" style={{ color:'rgba(255,255,255,0.45)', fontSize:15, minWidth:28, minHeight:40 }}
            onClick={() => setBpmVal(b => Math.max(40, b - 4))}>−</button>
          <div style={{ minWidth:38, textAlign:'center' }}>
            <div style={{ fontFamily:FONTS.display, fontSize:14, fontWeight:700, color:'#fff', lineHeight:1 }}>{bpmVal}</div>
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.07em' }}>BPM</div>
          </div>
          <button className="pcv-icon-btn" style={{ color:'rgba(255,255,255,0.45)', fontSize:15, minWidth:28, minHeight:40 }}
            onClick={() => setBpmVal(b => Math.min(200, b + 4))}>+</button>
        </div>
      </div>

      {/* ── Phase dots ── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'8px 14px 10px' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {PHASES.map((p, i) => {
            const done   = i < phaseIdx
            const active = i === phaseIdx
            return (
              <div key={p} style={{
                height:7, borderRadius:4,
                width: active ? 28 : done ? 22 : 16,
                background: done ? COLORS.teal : active ? '#e84b8a' : 'rgba(255,255,255,0.14)',
                boxShadow: active ? '0 0 10px rgba(232,75,138,0.7)' : 'none',
                transition: 'all .3s',
              }} />
            )
          })}
        </div>
        <div style={{ ...S.label }}>{PHASE_LABELS[phase] || phase}</div>
      </div>

      {/* ── Main body: avatar left, speech right ── */}
      <div className="pcv-body">

        {/* Avatar column */}
        <div className="pcv-avatar-col">
          <div className="mot-av">
            <img src="/Motesart Avatar 1.PNG" alt="Motesart"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          </div>
          <div className="pcv-av-name">MOTESART</div>
        </div>

        {/* Speech + keys col */}
        <div className="pcv-speech-col">
          {/* Unified row card */}
          <div style={{
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:18, overflow:'hidden',
          }}>
            <UnifiedRow
              isSpeaking={isSpeaking}
              isLoading={isLoading}
              studentTurn={studentTurn}
              retryMode={retryMode}
              promptMode={promptMode}
              onReplay={async () => {
                if (isSpeaking || isLoading) return
                setIsLoading(true)
                try { await onReplay?.() } finally { setIsLoading(false); setIsSpeaking(false) }
              }}
              onStudentResponse={onStudentResponse}
            />
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', padding:'14px 20px 16px' }}>
              <div className="pcv-speech-text">
                {displayedWords.length > 0 ? displayedWords.join(' ') : speechText}
              </div>
            </div>
          </div>

                    {/* Keys in focus */}
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:7 }}>
            <span style={{ ...S.label }}>Keys in focus</span>
            {highlightedKeys.map(ki => (
              <div key={ki} style={{ background:'#d4f5e0', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:700, color:'#047857' }}>
                {WHITE_KEY_NAMES[ki]} {ki + 1}
              </div>
            ))}
            <div style={{ background:'#fde8c8', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:700, color:'#b7791f' }}>
              Home: {WHITE_KEY_NAMES[homeKeyIndex]} {homeKeyIndex + 1}
            </div>
          </div>

          {/* Home key toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => setShowHomeKey(s => !s)}>
            <div style={{ width:36, height:20, borderRadius:10, position:'relative',
              background: showHomeKey ? '#e84b8a' : 'rgba(255,255,255,0.14)', transition:'background .2s' }}>
              <div style={{ position:'absolute', top:3,
                left: showHomeKey ? 18 : 3,
                width:14, height:14, borderRadius:'50%', background:'#fff',
                transition:'left .2s', boxShadow:'0 1px 5px rgba(0,0,0,0.3)' }} />
            </div>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.48)', fontWeight:500, userSelect:'none' }}>Show home key</span>
          </div>
        </div>
      </div>

      {/* ── Piano — full width ── */}
      <div style={{ padding:'0 28px 14px' }}>
        <div style={{ ...S.glass, borderRadius:16, padding:'14px 10px 10px', boxShadow:'0 8px 32px rgba(0,0,0,0.45)' }}>
          <Piano highlightedKeys={highlightedKeys} homeKeyIndex={homeKeyIndex} showHomeKey={showHomeKey} />
        </div>
      </div>

      {/* ── Answer options ── */}
      {answerOptions.length > 0 && (
        <div style={{ padding:'0 28px 24px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.38)', textAlign:'center', marginBottom:10 }}>
            Which pair of keys makes a half step?
          </div>
          <div className="pcv-answer-grid">
            {answerOptions.map(opt => (
              <button key={opt} className="pcv-btn-answer" onClick={() => onAnswer?.(opt)}>{opt}</button>
            ))}
          </div>
          <div style={{ textAlign:'right' }}>
            <button style={{
              minHeight:34, padding:'6px 14px', borderRadius:10,
              background:'none', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.32)', fontFamily:FONTS.body, fontSize:11, fontWeight:600, cursor:'pointer',
            }}>Hint</button>
          </div>
        </div>
      )}
    </div>
  )
}
