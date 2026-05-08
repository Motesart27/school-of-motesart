import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsMobile from '../hooks/useIsMobile.js'

const INITIAL_DPM = { drive: 50, passion: 50, motivation: 50, overall: 50 }

function computeDPM(dpm, outcomeType, replayCount, momentHistory) {
  const next = { ...dpm }
  if (outcomeType === 'correct' || outcomeType === 'perfect') {
    next.drive = Math.min(100, next.drive + 3)
  } else if (outcomeType === 'timeout') {
    next.drive = Math.max(0, next.drive - 5)
  }
  if (replayCount > 0) {
    next.passion = Math.min(100, next.passion + 1)
  }
  const recent = momentHistory.slice(-5)
  const recentCorrect = recent.filter(o => o === 'correct' || o === 'perfect').length
  next.motivation = Math.round((recentCorrect / Math.max(recent.length, 1)) * 100)
  next.overall = Math.round((next.drive + next.passion + next.motivation) / 3)
  return next
}

function badge(val) {
  if (val >= 70) return { label: 'Strong', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
  if (val >= 40) return { label: 'Growing', color: '#f97316', bg: 'rgba(249,115,22,0.15)' }
  return { label: 'Critical', color: '#f87171', bg: 'rgba(239,68,68,0.15)' }
}

function CircleGauge({ value, label, color, size = 100 }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(55,65,81,0.5)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{value}%</div>
        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  )
}

function Bar({ value, color }) {
  return (
    <div style={{ height: 8, background: 'rgba(55,65,81,0.5)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function OutcomeChip({ label, color, bg, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${color}`,
        background: bg, color, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >{label}</button>
  )
}

const OUTCOME_COLORS = {
  correct:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: '✓' },
  perfect:  { color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',   icon: '★' },
  wrong:    { color: '#f87171', bg: 'rgba(239,68,68,0.1)',     icon: '✗' },
  timeout:  { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',  icon: '⏱' },
  replay:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  icon: '↩' },
  manual:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   icon: '✎' },
}

export default function DPMPlayground() {
  const mob = useIsMobile()
  const navigate = useNavigate()
  const { user } = useAuth()
  const dashRoute = { admin:'/admin', teacher:'/teacher', ambassador:'/ambassador', parent:'/parent', student:'/student' }[user?.role] || '/student'

  const [dpm, setDpm] = useState({ ...INITIAL_DPM })
  const [replayCount, setReplayCount] = useState(0)
  const [history, setHistory] = useState([])
  const [log, setLog] = useState([])
  const [manualDrive, setManualDrive] = useState(50)
  const [manualPassion, setManualPassion] = useState(50)

  const addLog = useCallback((outcome, before, after) => {
    setLog(prev => [{ outcome, before: { ...before }, after: { ...after }, delta: after.overall - before.overall, ts: Date.now() }, ...prev].slice(0, 30))
  }, [])

  const submitOutcome = useCallback((outcomeType) => {
    const newHistory = [...history, outcomeType]
    setHistory(newHistory)
    setDpm(prev => {
      const next = computeDPM(prev, outcomeType, replayCount, newHistory)
      addLog(outcomeType, prev, next)
      return next
    })
  }, [history, replayCount, addLog])

  const doReplay = useCallback(() => {
    const nr = replayCount + 1
    setReplayCount(nr)
    setDpm(prev => {
      const next = { ...prev, passion: Math.min(100, prev.passion + 1) }
      next.overall = Math.round((next.drive + next.passion + next.motivation) / 3)
      addLog('replay', prev, next)
      return next
    })
  }, [replayCount, addLog])

  const reset = useCallback(() => {
    setDpm({ ...INITIAL_DPM })
    setReplayCount(0)
    setHistory([])
    setLog([])
    setManualDrive(50)
    setManualPassion(50)
  }, [])

  const applyManual = useCallback(() => {
    const next = { drive: manualDrive, passion: manualPassion, motivation: dpm.motivation, overall: 0 }
    next.overall = Math.round((next.drive + next.passion + next.motivation) / 3)
    addLog('manual', dpm, next)
    setDpm(next)
  }, [dpm, manualDrive, manualPassion, addLog])

  const dpmComponents = [
    { key: 'drive',      label: 'Drive',      color: '#3b82f6', desc: '+3 on correct/perfect · −5 on timeout' },
    { key: 'passion',    label: 'Passion',     color: '#f97316', desc: '+1 on each replay / exploration' },
    { key: 'motivation', label: 'Motivation',  color: '#22c55e', desc: '% correct in last 5 outcomes' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#111827,#111827,#1f2937)', color:'#fff', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom:80 }}>

      <div style={{ borderBottom:'1px solid #1f2937', position:'sticky', top:0, background:'rgba(17,24,39,0.95)', backdropFilter:'blur(12px)', zIndex:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:24 }}>🎛</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>DPM Playground</div>
            <div style={{ fontSize:11, color:'#fb923c', marginTop:2 }}>Drive · Passion · Motivation — interactive scoring simulator</div>
          </div>
        </div>
        <button onClick={() => navigate(dashRoute)} style={{ padding:'6px 14px', background:'none', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, fontSize:12, cursor:'pointer', color:'#9ca3af' }}>
          Back to Dashboard
        </button>
      </div>

      <div style={{ maxWidth: mob ? '100%' : 1100, margin:'0 auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Overall + Components */}
        <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '260px 1fr', gap:14 }}>
          <div style={{ background:'rgba(31,41,55,0.7)', border:'1px solid rgba(55,65,81,0.5)', borderRadius:16, padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:1, textTransform:'uppercase' }}>Overall DPM</div>
            <CircleGauge value={dpm.overall} label="DPM" color="#14b8a6" size={130} />
            {(() => { const b = badge(dpm.overall); return <span style={{ fontSize:11, padding:'3px 10px', borderRadius:6, background:b.bg, color:b.color, fontWeight:700 }}>{b.label}</span> })()}
            <div style={{ fontSize:11, color:'#6b7280', textAlign:'center' }}>avg(Drive + Passion + Motivation)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', paddingTop:8, borderTop:'1px solid rgba(55,65,81,0.4)' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#a78bfa' }}>{replayCount}</div>
                <div style={{ fontSize:10, color:'#9ca3af' }}>Replays</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#14b8a6' }}>{history.length}</div>
                <div style={{ fontSize:10, color:'#9ca3af' }}>Outcomes</div>
              </div>
            </div>
          </div>

          <div style={{ background:'rgba(31,41,55,0.7)', border:'1px solid rgba(55,65,81,0.5)', borderRadius:16, padding:20, display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:1, textTransform:'uppercase' }}>Score Breakdown</div>
            {dpmComponents.map(({ key, label, color, desc }) => {
              const val = dpm[key]
              const b = badge(val)
              return (
                <div key={key}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:14 }}>{label}</span>
                      <span style={{ fontSize:10, color:'#6b7280', marginLeft:8 }}>{desc}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16, fontWeight:800, color }}>{val}%</span>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:b.bg, color:b.color, fontWeight:600 }}>{b.label}</span>
                    </div>
                  </div>
                  <Bar value={val} color={color} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Outcome buttons */}
        <div style={{ background:'rgba(31,41,55,0.7)', border:'1px solid rgba(55,65,81,0.5)', borderRadius:16, padding:20 }}>
          <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:16 }}>Simulate Outcome</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
            <OutcomeChip label="✓ Correct"  color="#22c55e" bg="rgba(34,197,94,0.08)"    onClick={() => submitOutcome('correct')} />
            <OutcomeChip label="★ Perfect"  color="#14b8a6" bg="rgba(20,184,166,0.08)"   onClick={() => submitOutcome('perfect')} />
            <OutcomeChip label="✗ Wrong"    color="#f87171" bg="rgba(239,68,68,0.08)"    onClick={() => submitOutcome('wrong')} />
            <OutcomeChip label="⏱ Timeout" color="#6b7280" bg="rgba(107,114,128,0.08)" onClick={() => submitOutcome('timeout')} />
            <OutcomeChip label="↩ Replay"  color="#a78bfa" bg="rgba(167,139,250,0.08)" onClick={doReplay} />
          </div>
          {history.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:11, color:'#6b7280', marginRight:4 }}>History:</span>
              {history.slice(-20).map((o, i) => {
                const c = OUTCOME_COLORS[o] || OUTCOME_COLORS.wrong
                return <span key={i} style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background:c.bg, color:c.color, fontWeight:700 }}>{c.icon}</span>
              })}
              {history.length > 20 && <span style={{ fontSize:10, color:'#6b7280' }}>+{history.length - 20} more</span>}
            </div>
          )}
          <button onClick={reset} style={{ padding:'7px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, fontSize:12, cursor:'pointer', color:'#f87171', fontWeight:600 }}>
            Reset to 50 / 50 / 50
          </button>
        </div>

        {/* Manual override + Event log */}
        <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:14 }}>
          <div style={{ background:'rgba(31,41,55,0.7)', border:'1px solid rgba(55,65,81,0.5)', borderRadius:16, padding:20 }}>
            <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:14 }}>Manual Override</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Drive',   val:manualDrive,   set:setManualDrive,   color:'#3b82f6' },
                { label:'Passion', val:manualPassion, set:setManualPassion, color:'#f97316' },
              ].map(({ label, val, set, color }) => (
                <div key={label}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                    <span style={{ color:'#d1d5db' }}>{label}</span>
                    <span style={{ fontWeight:700, color }}>{val}</span>
                  </div>
                  <input type="range" min={0} max={100} value={val}
                    onChange={e => set(Number(e.target.value))}
                    style={{ width:'100%', accentColor:color, cursor:'pointer' }}
                  />
                </div>
              ))}
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                Motivation is computed from last 5 outcomes — currently {dpm.motivation}%
              </div>
              <button onClick={applyManual}
                style={{ padding:'9px 0', background:'rgba(20,184,166,0.15)', border:'1px solid rgba(20,184,166,0.4)', borderRadius:10, fontSize:13, cursor:'pointer', color:'#14b8a6', fontWeight:700 }}>
                Apply Override
              </button>
            </div>
          </div>

          <div style={{ background:'rgba(31,41,55,0.7)', border:'1px solid rgba(55,65,81,0.5)', borderRadius:16, padding:20 }}>
            <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:14 }}>Event Log</div>
            {log.length === 0
              ? <div style={{ fontSize:12, color:'#4b5563', fontStyle:'italic', textAlign:'center', padding:'24px 0' }}>Simulate outcomes above to see DPM changes here</div>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto' }}>
                  {log.map((entry, i) => {
                    const c = OUTCOME_COLORS[entry.outcome] || OUTCOME_COLORS.wrong
                    const sign = entry.delta >= 0 ? '+' : ''
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'rgba(17,24,39,0.5)', borderRadius:8, fontSize:12 }}>
                        <span style={{ fontSize:15, flexShrink:0 }}>{c.icon}</span>
                        <span style={{ color:c.color, fontWeight:600, width:58, flexShrink:0, textTransform:'capitalize' }}>{entry.outcome}</span>
                        <div style={{ flex:1, display:'flex', gap:8 }}>
                          <span style={{ color:'#6b7280' }}>D:{entry.after.drive}</span>
                          <span style={{ color:'#6b7280' }}>P:{entry.after.passion}</span>
                          <span style={{ color:'#6b7280' }}>M:{entry.after.motivation}</span>
                        </div>
                        <span style={{ fontWeight:700, color: entry.delta >= 0 ? '#22c55e' : '#f87171', flexShrink:0 }}>
                          {sign}{entry.delta}% overall
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>

        {/* Scoring rules */}
        <div style={{ background:'rgba(31,41,55,0.7)', border:'1px solid rgba(55,65,81,0.5)', borderRadius:16, padding:20 }}>
          <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:14 }}>Scoring Rules Reference</div>
          <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Drive',      color:'#3b82f6', rules:['Correct / Perfect → +3','Timeout → −5','Wrong → no change','Capped 0–100'] },
              { label:'Passion',    color:'#f97316', rules:['Each Replay → +1','Grows with exploration','Never decreases from outcomes','Capped 0–100'] },
              { label:'Motivation', color:'#22c55e', rules:['% of last 5 outcomes correct','Recalculated every submission','5× correct in a row → 100%','5× timeout in a row → 0%'] },
            ].map(({ label, color, rules }) => (
              <div key={label} style={{ padding:14, background:'rgba(17,24,39,0.5)', borderRadius:12, borderLeft:`3px solid ${color}` }}>
                <div style={{ fontSize:13, fontWeight:700, color, marginBottom:8 }}>{label}</div>
                {rules.map((r, i) => <div key={i} style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>• {r}</div>)}
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(20,184,166,0.08)', border:'1px solid rgba(20,184,166,0.2)', borderRadius:10, fontSize:11, color:'#5eead4' }}>
            <strong>Overall DPM</strong> = round((Drive + Passion + Motivation) / 3) — thresholds: 0–39 Critical · 40–69 Growing · 70–100 Strong
          </div>
        </div>

      </div>
    </div>
  )
}
