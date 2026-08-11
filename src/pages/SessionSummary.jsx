import { useNavigate, useLocation } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile.js'

const css = `
.ss-page{min-height:100vh;background:linear-gradient(135deg,#111827,#111827,#1f2937);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ss-header{border-bottom:1px solid #1f2937;padding:16px;text-align:center}
.ss-main{max-width:672px;margin:0 auto;padding:24px 16px}
.ss-section{margin-bottom:24px}
.ss-perf{background:rgba(31,41,55,.5);backdrop-filter:blur(8px);border-radius:16px;border:1px solid rgba(55,65,81,.5);padding:24px;display:flex;justify-content:center;gap:32px}
.ss-ring{display:flex;flex-direction:column;align-items:center;position:relative}
.ss-ring-label{margin-top:8px;font-size:13px;color:#9ca3af}
.ss-ring-val{position:absolute;top:30px;font-size:24px;font-weight:700}
.ss-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.ss-stat{border-radius:12px;padding:16px;text-align:center;border:1px solid}
.ss-stat.purple{background:linear-gradient(135deg,rgba(147,51,234,.2),rgba(236,72,153,.2));border-color:rgba(147,51,234,.3)}
.ss-stat.blue{background:linear-gradient(135deg,rgba(59,130,246,.2),rgba(99,102,241,.2));border-color:rgba(59,130,246,.3)}
.ss-stat.orange{background:linear-gradient(135deg,rgba(249,115,22,.2),rgba(239,68,68,.2));border-color:rgba(249,115,22,.3)}
.ss-stat.teal{background:linear-gradient(135deg,rgba(20,184,166,.2),rgba(6,182,212,.2));border-color:rgba(20,184,166,.3)}
.ss-sicon{font-size:24px}
.ss-sval{font-size:24px;font-weight:700;margin-top:8px}
.ss-slbl{font-size:11px;color:#9ca3af;margin-top:2px}
.ss-detail{background:rgba(31,41,55,.5);border-radius:16px;border:1px solid rgba(55,65,81,.5);padding:16px}
.ss-drow{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(55,65,81,.5)}
.ss-drow:last-child{border-bottom:none}
.ss-dpm{background:rgba(31,41,55,.5);border-radius:12px;padding:16px;border:1px solid rgba(55,65,81,.5)}
.ss-dpm-row{display:flex;justify-content:space-around}
.ss-dpm-item{text-align:center}
.ss-lb-pos{background:linear-gradient(135deg,rgba(88,28,135,.3),rgba(131,24,67,.3));border:1px solid rgba(147,51,234,.3);border-radius:16px;padding:16px;text-align:center}
.ss-mini{background:rgba(31,41,55,.5);border-radius:16px;border:1px solid rgba(55,65,81,.5);padding:16px}
.ss-mini-row{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:8px;margin-bottom:8px}
.ss-mini-row.me{background:linear-gradient(135deg,rgba(19,78,74,.5),rgba(22,78,99,.5));border:1px solid rgba(20,184,166,.5)}
.ss-mini-row:last-child{margin-bottom:0}
.ss-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ss-abtn{padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
.ss-ateal{background:linear-gradient(135deg,#0d9488,#0891b2);color:#fff}
.ss-apurple{background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff}
.ss-outline{padding:10px 24px;background:rgba(55,65,81,.5);border:1px solid #4b5563;border-radius:12px;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
@media(max-width:639px){.ss-stats{grid-template-columns:repeat(2,1fr)}}
`

function fmtDuration(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// M1 R3.1-FE §E/§F — SessionSummary previously rendered ENTIRELY hardcoded
// data (fixed percentage rings, a fabricated leaderboard of other students,
// fixed session stats) regardless of what actually happened. It now reads
// the real session passed via navigate(..., { state }) (see GamePage.jsx's
// Summary button) and renders an honest empty state when none is present
// (e.g. direct navigation). No fabricated rank/leaders — no live
// leaderboard backend exists (see GamePage.jsx's logSession comment).
export default function SessionSummary() {
  const mob = useIsMobile()
  const navigate = useNavigate()
  const location = useLocation()
  const session = location.state || null

  return (
    <div className="ss-page"><style>{css}</style>
      <div className="ss-header"><h1 style={{fontSize: mob ? 18 : 24,fontWeight:700}}>Session Complete!</h1><p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>{session?.concept ? `Game Mode · ${session.concept}` : 'Game Mode'}</p></div>
      <div className="ss-main">
        {!session ? (
          <div className="ss-section"><div className="ss-detail" style={{textAlign:'center',color:'#9ca3af',fontSize:13}}>No session data available.</div></div>
        ) : (
          <>
            <div className="ss-section"><div className="ss-stats">
              <div className="ss-stat purple"><div className="ss-sicon">🎯</div><div className="ss-sval">Lv.{session.level ?? '—'}</div><div className="ss-slbl">Level Reached</div></div>
              <div className="ss-stat blue"><div className="ss-sicon">⏱️</div><div className="ss-sval">{fmtDuration(session.durationSec)}</div><div className="ss-slbl">Time Practiced</div></div>
              <div className="ss-stat orange"><div className="ss-sicon">🔥</div><div className="ss-sval">{session.bestStreak ?? 0}</div><div className="ss-slbl">Best Streak</div></div>
              <div className="ss-stat teal"><div className="ss-sicon">❤️</div><div className="ss-sval">{session.livesLeft ?? '—'}</div><div className="ss-slbl">Lives Left</div></div>
            </div></div>
            <div className="ss-section"><div className="ss-detail">
              <div style={{fontWeight:600,marginBottom:12}}>Session Details</div>
              {[
                ['Correct Answers', session.correct ?? 0, '#4ade80'],
                ['Total Attempts', session.attempts ?? 0, '#fff'],
                ['Points Earned', session.points != null ? `+${session.points}` : '—', '#facc15'],
              ].map(([l,v,c])=>(
                <div key={l} className="ss-drow"><span style={{color:'#9ca3af',fontSize:14}}>{l}</span><span style={{fontWeight:700,fontSize:14,color:c}}>{v}</span></div>
              ))}
            </div></div>
          </>
        )}
        <div className="ss-section"><div className="ss-actions">
          <button className="ss-abtn ss-ateal" onClick={()=>navigate('/game')}>🎮 Play Again</button>
          <button className="ss-abtn ss-apurple" onClick={()=>navigate('/')}>📊 Dashboard</button>
        </div></div>
      </div>
    </div>
  )
}
