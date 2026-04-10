import { useNavigate } from 'react-router-dom'
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

const LEADERS = [
  { rank:'👑', name:'Renee', letter:'R', pts:'12,840' },
  { rank:'👑', name:'Alex', letter:'A', pts:'11,200', color:'#d1d5db' },
  { rank:'👑', name:'Luke', letter:'L', pts:'9,750', color:'#b45309' },
  { rank:'#4', name:'Motesart (You)', letter:'M', pts:'8,450', me:true },
  { rank:'#5', name:'Sam', letter:'S', pts:'7,200' },
]

export default function SessionSummary() {
  const mob = useIsMobile()
  const navigate = useNavigate()
  return (
    <div className="ss-page"><style>{css}</style>
      <div className="ss-header"><h1 style={{fontSize: mob ? 18 : 24,fontWeight:700}}>Session Complete!</h1><p style={{fontSize:13,color:'#9ca3af',marginTop:4}}>Game Mode • Find the Note</p></div>
      <div className="ss-main">
        <div className="ss-section"><div className="ss-perf">
          <div className="ss-ring"><svg width="96" height="96" style={{transform:'rotate(-90deg)'}}><circle cx="48" cy="48" r="40" fill="none" stroke="#374151" strokeWidth="8"/><circle cx="48" cy="48" r="40" fill="none" stroke="#14b8a6" strokeWidth="8" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="62.8"/></svg><div className="ss-ring-val">75%</div><div className="ss-ring-label">Accuracy</div></div>
          <div className="ss-ring"><svg width="96" height="96" style={{transform:'rotate(-90deg)'}}><circle cx="48" cy="48" r="40" fill="none" stroke="#374151" strokeWidth="8"/><circle cx="48" cy="48" r="40" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="94.2"/></svg><div className="ss-ring-val">63%</div><div className="ss-ring-label">Level Progress</div></div>
        </div></div>
        <div className="ss-section"><div className="ss-stats">
          <div className="ss-stat purple"><div className="ss-sicon">🎯</div><div className="ss-sval">Lv.5</div><div className="ss-slbl">Level Reached</div></div>
          <div className="ss-stat blue"><div className="ss-sicon">⏱️</div><div className="ss-sval">4:32</div><div className="ss-slbl">Time Practiced</div></div>
          <div className="ss-stat orange"><div className="ss-sicon">🔥</div><div className="ss-sval">12</div><div className="ss-slbl">Best Streak</div></div>
          <div className="ss-stat teal"><div className="ss-sicon">❤️</div><div className="ss-sval">2</div><div className="ss-slbl">Lives Left</div></div>
        </div></div>
        <div className="ss-section"><div className="ss-detail">
          <div style={{fontWeight:600,marginBottom:12}}>Session Details</div>
          {[['Correct Answers','18','#4ade80'],['Total Attempts','24','#fff'],['Stages Completed','4','#c084fc'],['Points Earned','+1,250','#facc15']].map(([l,v,c])=>(
            <div key={l} className="ss-drow"><span style={{color:'#9ca3af',fontSize:14}}>{l}</span><span style={{fontWeight:700,fontSize:14,color:c}}>{v}</span></div>
          ))}
        </div></div>
        <div className="ss-section"><div className="ss-dpm">
          <div style={{fontSize:13,fontWeight:600,color:'#9ca3af',marginBottom:12}}>DPM Impact This Session</div>
          <div className="ss-dpm-row">
            {[['Drive','+2','#3b82f6'],['Passion','+3','#f97316'],['Motivation','+1','#22c55e']].map(([n,v,c])=>(
              <div key={n} className="ss-dpm-item"><div style={{fontSize:18,fontWeight:700,color:'#4ade80'}}>{v}</div><div style={{fontSize:11,color:'#6b7280',marginTop:4}}>{n}</div><div style={{width:32,height:4,borderRadius:9999,background:c,margin:'8px auto 0'}}/></div>
            ))}
          </div>
        </div></div>
        <div className="ss-section"><div className="ss-lb-pos"><div style={{fontSize:13,color:'#c4b5fd'}}>Your Current Position</div><div style={{fontSize:40,fontWeight:700,marginTop:4}}>#4</div><div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>on TAMi Leaderboard</div></div></div>
        <div className="ss-section"><div className="ss-mini">
          <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:600,marginBottom:12}}>🏆 TAMi Leaders</div>
          {LEADERS.map((l,i)=>(
            <div key={i} className={`ss-mini-row ${l.me?'me':''}`}>
              <div style={{width:24,textAlign:'center',fontSize:l.rank.startsWith('#')?11:16,fontWeight:700,color:l.rank.startsWith('#')?'#9ca3af':'inherit'}}>{l.rank.startsWith('#')?l.rank:<span style={{color:l.color||'inherit'}}>{l.rank}</span>}</div>
              <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,background:l.me?'linear-gradient(135deg,#14b8a6,#06b6d4)':'linear-gradient(135deg,#a855f7,#ec4899)',color:'#fff'}}>{l.letter}</div>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:l.me?'#5eead4':'#fff'}}>{l.name}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#c084fc'}}>{l.pts}</span>
            </div>
          ))}
        </div></div>
        <div className="ss-section"><div className="ss-actions">
          <button className="ss-abtn ss-ateal" onClick={()=>navigate('/game')}>🎮 Play Again</button>
          <button className="ss-abtn ss-apurple" onClick={()=>navigate('/')}>📊 Dashboard</button>
        </div></div>
        <div className="ss-section" style={{display:'flex',justifyContent:'center'}}><button className="ss-outline" onClick={()=>navigate('/leaderboard')}>🏆 View Full Leaderboard</button></div>
      </div>
    </div>
  )
}
