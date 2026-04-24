import React, { useState } from 'react'
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

  .pcv-root {
    min-height: 100vh;
    background: linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%);
    font-family: 'DM Sans',-apple-system,sans-serif;
    display: flex;
    justify-content: center;
    padding-bottom: 32px;
    color: #fff;
  }
  .pcv-root * { box-sizing: border-box; }
  .pcv-inner {
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    animation: pcvFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  .pcv-speak-bar {
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(180deg,#e84b8a,#f97316);
    animation: speakBar 0.72s ease-in-out infinite alternate;
    transform-origin: bottom;
  }
  .pcv-btn-answer {
    min-height: 52px;
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
`

// ── Arrow SVG overlay drawn in percentage-based coordinate space ──
function KeyArrow({ from, to }) {
  const kW   = 100 / 8         // each white key = 12.5% wide
  const x1   = (from + 0.5) * kW
  const x2   = (to   + 0.5) * kW
  const y    = 44              // vertical position in percentage space

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3, overflow:'visible' }}
    >
      <defs>
        <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <marker id="arrowTip" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#065f46">
            <animate attributeName="opacity" values="1;0.35;1" dur="1.1s" repeatCount="indefinite" />
          </polygon>
        </marker>
      </defs>
      {/* Origin pulse dot */}
      <circle cx={x1} cy={y} fill="#6ee7b7">
        <animate attributeName="r"       values="2;3.8;2"   dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.35;1"  dur="1.1s" repeatCount="indefinite" />
      </circle>
      {/* Flowing dashed shaft */}
      <line
        x1={x1 + 2.8} y1={y} x2={x2 - 2.5} y2={y}
        stroke="url(#arrowGrad)" strokeWidth="2.2"
        strokeDasharray="5 3" markerEnd="url(#arrowTip)"
      >
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.75s" repeatCount="indefinite" />
      </line>
    </svg>
  )
}

// ── Piano keyboard — 8 white keys, 5 black keys ──
function Piano({ highlightedKeys, homeKeyIndex, showHomeKey }) {
  const bkWidthPct = 7.2   // black key width as % of container
  const kW = 100 / 8       // white key span per key

  return (
    <div style={{ position:'relative', width:'100%', height:162, userSelect:'none' }}>
      {/* White keys */}
      <div style={{ display:'flex', height:'100%', gap:2 }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const isFocus = highlightedKeys.includes(i)
          const isHome  = showHomeKey && i === homeKeyIndex
          const bg      = isFocus ? '#d4f5e0' : isHome ? '#fde8c8' : '#f8f8f6'
          const bdr     = isFocus ? '2px solid #6ee7b7' : isHome ? '2px solid #f6ad55' : '1px solid #d1d5db'
          return (
            <div key={i} style={{
              flex: 1, background: bg, borderRadius: '0 0 9px 9px',
              border: bdr, position: 'relative',
              animation: isFocus ? 'keyGlow 1.6s ease-in-out infinite' : 'none',
            }}>
              <span style={{
                position:'absolute', bottom:22, left:0, right:0, textAlign:'center',
                display:'block', fontSize:11, fontWeight:800, lineHeight:1,
                color: isFocus ? '#059669' : isHome ? '#b7791f' : '#555',
                animation: isFocus ? 'numGlow 1.6s ease-in-out infinite' : 'none',
              }}>{i + 1}</span>
              <span style={{
                position:'absolute', bottom:7, left:0, right:0, textAlign:'center',
                display:'block', fontSize:9, fontWeight:600,
                color: isFocus ? '#047857' : isHome ? '#975a16' : '#999',
              }}>{WHITE_KEY_NAMES[i]}</span>
            </div>
          )
        })}
      </div>

      {/* Black keys — absolutely positioned */}
      {BLACK_OFFSETS.map(offset => (
        <div key={offset} style={{
          position:'absolute', top:0, zIndex:2,
          left: `calc(${(offset + 1) * kW}% - ${bkWidthPct / 2}%)`,
          width: `${bkWidthPct}%`, height:'61%',
          background: 'linear-gradient(180deg,#2d3250 0%,#1a1a2e 100%)',
          borderRadius:'0 0 6px 6px',
          boxShadow:'0 5px 14px rgba(0,0,0,0.65)',
        }} />
      ))}

      {/* Animated arrow between highlighted keys */}
      {highlightedKeys.length >= 2 && (
        <KeyArrow from={highlightedKeys[0]} to={highlightedKeys[1]} />
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
  stats            = { correct: 3, attempts: 5, streak: 2, accuracy: 60 },
  bpm              = 92,
  onAnswer,
  onReplay,
  onBack,
}) {
  const [showHomeKey, setShowHomeKey] = useState(false)
  const [bpmVal, setBpmVal]           = useState(bpm)
  const phaseIdx = PHASES.indexOf(phase)

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
      <div className="pcv-inner">

        {/* ── Top nav ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 14px 10px', gap:10 }}>
          <button onClick={onBack} style={{
            minHeight:44, padding:'8px 14px', borderRadius:12,
            background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.11)',
            color:'rgba(255,255,255,0.65)', fontFamily:FONTS.body, fontSize:13, fontWeight:600, cursor:'pointer',
          }}>← Back</button>

          <div style={{
            flex:1, textAlign:'center', padding:'6px 12px', borderRadius:20,
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
            fontFamily:FONTS.display, fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.92)',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>{conceptName}</div>

          <div style={{ display:'flex', alignItems:'center', gap:2, padding:'4px 10px', borderRadius:12,
            background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <button className="pcv-icon-btn" style={{ color:'rgba(255,255,255,0.45)', fontSize:15, minWidth:28, minHeight:44 }}
              onClick={() => setBpmVal(b => Math.max(40, b - 4))}>−</button>
            <div style={{ minWidth:38, textAlign:'center' }}>
              <div style={{ fontFamily:FONTS.display, fontSize:14, fontWeight:700, color:'#fff', lineHeight:1 }}>{bpmVal}</div>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.07em' }}>BPM</div>
            </div>
            <button className="pcv-icon-btn" style={{ color:'rgba(255,255,255,0.45)', fontSize:15, minWidth:28, minHeight:44 }}
              onClick={() => setBpmVal(b => Math.min(200, b + 4))}>+</button>
          </div>
        </div>

        {/* ── Phase flow dots ── */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'4px 14px 14px' }}>
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

        {/* ── Motesart speech row ── */}
        <div style={{ ...S.glass, margin:'0 12px 14px', padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden',
              border:'2px solid rgba(232,75,138,0.5)', background:'rgba(20,20,40,0.8)' }}>
              <img src="/Motesart Avatar 1.PNG" alt="Motesart"
                onError={e => { e.currentTarget.style.display='none' }}
                style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
            </div>
            <div style={{ position:'absolute', bottom:-2, right:-3,
              background:'rgba(10,10,26,0.92)', border:'1px solid rgba(232,75,138,0.28)',
              borderRadius:8, padding:'3px 4px',
              display:'flex', alignItems:'center', gap:1.5,
            }}>
              {[6, 10, 7, 12, 5].map((h, i) => (
                <div key={i} className="pcv-speak-bar" style={{ height: h, animationDelay:`${[0,0.14,0.28,0.08,0.22][i]}s` }} />
              ))}
            </div>
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#e84b8a', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>Motesart</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.82)', lineHeight:1.68, marginBottom:9 }}>{speechText}</div>
            <button onClick={onReplay} style={{
              minHeight:34, padding:'5px 13px', borderRadius:10,
              background:'rgba(232,75,138,0.1)', border:'1px solid rgba(232,75,138,0.25)',
              color:'#e84b8a', fontFamily:FONTS.body, fontSize:11, fontWeight:700, cursor:'pointer',
              display:'inline-flex', alignItems:'center', gap:5,
            }}>▶ Replay</button>
          </div>
        </div>

        {/* ── Keys in focus + home key toggle ── */}
        <div style={{ padding:'0 12px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:7, marginBottom:10 }}>
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

        {/* ── Piano keyboard ── */}
        <div style={{ padding:'0 12px 16px' }}>
          <div style={{ ...S.glass, borderRadius:16, padding:'14px 10px 10px', boxShadow:'0 8px 32px rgba(0,0,0,0.45)' }}>
            <Piano highlightedKeys={highlightedKeys} homeKeyIndex={homeKeyIndex} showHomeKey={showHomeKey} />
          </div>
        </div>

        {/* ── Answer options ── */}
        {answerOptions.length > 0 && (
          <div style={{ padding:'0 12px 12px' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.38)', textAlign:'center', marginBottom:10 }}>
              Which pair of keys makes a half step?
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
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

        {/* ── Stats footer ── */}
        <div style={{ margin:'4px 12px 0', ...S.glass, borderRadius:14, padding:'12px 16px',
          display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, textAlign:'center' }}>
          {[
            { label:'Correct',  value: stats?.correct  ?? 0,    color: COLORS.teal },
            { label:'Attempts', value: stats?.attempts ?? 0,    color:'rgba(255,255,255,0.45)' },
            { label:'Streak',   value: stats?.streak   ?? 0,    color:'#f97316' },
            { label:'Accuracy', value:`${stats?.accuracy ?? 0}%`, color:'#e84b8a' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily:FONTS.display, fontSize:17, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ ...S.label, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
