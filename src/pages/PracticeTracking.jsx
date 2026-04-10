import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile.js'

const css = `
.pt-page{min-height:100vh;background:#111827;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.pt-header{border-bottom:1px solid #1f2937;position:sticky;top:0;background:rgba(17,24,39,.95);backdrop-filter:blur(12px);z-index:10;padding:12px 16px}
.pt-header-inner{max-width:896px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.pt-back{padding:8px;background:none;border:none;cursor:pointer;border-radius:8px;display:flex;align-items:center;color:#9ca3af}
.pt-back:hover{background:#1f2937}
.pt-logo{position:relative;width:40px;height:40px;flex-shrink:0}
.pt-logo-ring{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,#a855f7,#ec4899);animation:ptPulse 2s ease-in-out infinite;opacity:.6;filter:blur(4px)}
.pt-logo-inner{position:absolute;inset:2px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:18px}
@keyframes ptPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.8;transform:scale(1.05)}}
.pt-log-btn{padding:8px 16px;border-radius:12px;font-weight:600;font-size:13px;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#14b8a6,#10b981);color:#fff}
.pt-main{max-width:896px;margin:0 auto;padding:24px 16px}
.pt-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.pt-scard{background:rgba(31,41,55,.5);border-radius:16px;padding:20px;border:1px solid rgba(55,65,81,.5)}
.pt-stop{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pt-sval{font-size:30px;font-weight:700}
.pt-sdesc{font-size:13px;color:#9ca3af;margin-top:2px}
.pt-prog-info{display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:4px;margin-top:12px}
.pt-prog-track{height:8px;background:#374151;border-radius:9999px;overflow:hidden}
.pt-prog-fill{height:100%;border-radius:9999px;background:linear-gradient(135deg,#14b8a6,#10b981)}
.pt-history{background:rgba(31,41,55,.5);border-radius:16px;border:1px solid rgba(55,65,81,.5);overflow:hidden}
.pt-hist-header{padding:20px;border-bottom:1px solid rgba(55,65,81,.5);font-size:16px;font-weight:600}
.pt-log{padding:16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(55,65,81,.5);transition:background .2s}
.pt-log:hover{background:rgba(31,41,55,.3)}
.pt-log:last-child{border-bottom:none}
.pt-log-left{display:flex;align-items:center;gap:16px}
.pt-log-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.pt-log-icon.dpm{background:rgba(20,184,166,.2)}
.pt-log-icon.nodpm{background:#374151}
.pt-log-notes{font-size:13px;color:#9ca3af;margin-top:8px;padding-left:56px;padding-bottom:8px;border-bottom:1px solid rgba(55,65,81,.5)}
.pt-modal-bg{display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:16px}
.pt-modal-bg.show{display:flex}
.pt-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px)}
.pt-modal{position:relative;background:#111827;border:1px solid #374151;border-radius:16px;padding:24px;width:100%;max-width:448px;max-height:90vh;overflow-y:auto}
.pt-form-group{margin-bottom:16px}
.pt-form-label{display:block;font-size:13px;font-weight:600;color:#d1d5db;margin-bottom:4px}
.pt-form-input{width:100%;padding:12px 16px;background:#1f2937;border:1px solid #374151;border-radius:12px;color:#fff;font-size:14px;outline:none}
.pt-form-input:focus{border-color:rgba(20,184,166,.5)}
.pt-slider-row{display:flex;align-items:center;gap:16px}
.pt-slider{flex:1;accent-color:#14b8a6}
.pt-submit{width:100%;padding:14px;border-radius:12px;font-size:15px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(135deg,#14b8a6,#10b981);color:#fff}
.pt-warn{padding:12px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:12px;font-size:13px;color:#fbbf24;margin-bottom:16px}
@media(max-width:639px){.pt-summary{grid-template-columns:1fr}}
`

const LOGS = [
  { icon:'🎹', type:'Scales & Exercises', inst:'Piano', date:'2/25/2026', min:'15 min', dpm:true },
  { icon:'🎮', type:'Game', game:' - Find the Note', inst:'Piano', date:'2/24/2026', min:'10 min', dpm:true },
  { icon:'🎹', type:'Repertoire', inst:'Piano', date:'2/23/2026', min:'20 min', dpm:true, notes:'Worked on Ode to Joy - measures 12-24' },
  { icon:'👀', type:'Listening / Watching', inst:'Piano', date:'2/22/2026', min:'30 min', dpm:false, notes:'Watched masterclass on dynamics' },
  { icon:'👂', type:'Ear Training', inst:'Voice', date:'2/21/2026', min:'12 min', dpm:true },
]

export default function PracticeTracking() {
  const mob = useIsMobile()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [practiceType, setPracticeType] = useState('')
  const [minutes, setMinutes] = useState(30)

  return (
    <div className="pt-page"><style>{css}</style>
      <div className="pt-header"><div className="pt-header-inner">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="pt-back" onClick={()=>navigate('/')}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="pt-logo"><div className="pt-logo-ring"/><div className="pt-logo-inner">🎵</div></div>
          <div><div style={{fontSize:16,fontWeight:700}}>School of <span style={{background:'linear-gradient(135deg,#ec4899,#a855f7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Motesart</span></div><div style={{fontSize:11,color:'#9ca3af'}}>Practice Tracking</div></div>
        </div>
        <button className="pt-log-btn" onClick={()=>setShowModal(true)}>+ Log Practice</button>
      </div></div>

      <div className="pt-main">
        <div className="pt-summary">
          <div className="pt-scard">
            <div className="pt-stop"><span style={{fontSize:13,color:'#9ca3af'}}>This Week</span><span style={{fontSize: mob ? 18 : 24}}>⏱️</span></div>
            <div className="pt-sval">45</div><div className="pt-sdesc">minutes practiced</div>
            <div className="pt-prog-info"><span>75% of goal</span><span>60 min target</span></div>
            <div className="pt-prog-track"><div className="pt-prog-fill" style={{width:'75%'}}/></div>
          </div>
          <div className="pt-scard">
            <div className="pt-stop"><span style={{fontSize:13,color:'#9ca3af'}}>Sessions</span><span style={{fontSize: mob ? 18 : 24}}>🎯</span></div>
            <div className="pt-sval">4</div><div className="pt-sdesc">practice sessions this week</div>
          </div>
          <div className="pt-scard">
            <div className="pt-stop"><span style={{fontSize:13,color:'#9ca3af'}}>DPM Sessions</span><span style={{fontSize: mob ? 18 : 24}}>🔥</span></div>
            <div className="pt-sval" style={{color:'#14b8a6'}}>3</div><div className="pt-sdesc">counts toward DPM score</div>
          </div>
        </div>

        <div className="pt-history">
          <div className="pt-hist-header">Practice History</div>
          {LOGS.map((l,i)=>(
            <div key={i}>
              <div className="pt-log">
                <div className="pt-log-left">
                  <div className={`pt-log-icon ${l.dpm?'dpm':'nodpm'}`}>{l.icon}</div>
                  <div><div style={{fontWeight:600,fontSize:14}}>{l.type}{l.game&&<span style={{color:'#9ca3af'}}>{l.game}</span>}</div><div style={{fontSize:13,color:'#9ca3af',marginTop:2}}>{l.inst} • {l.date}</div></div>
                </div>
                <div><div style={{fontWeight:600,fontSize:14,textAlign:'right'}}>{l.min}</div><div style={{fontSize:11,marginTop:2,textAlign:'right',color:l.dpm?'#14b8a6':'#6b7280'}}>{l.dpm?'✓ DPM':'No DPM'}</div></div>
              </div>
              {l.notes && <div className="pt-log-notes">{l.notes}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <div className={`pt-modal-bg ${showModal?'show':''}`}>
        <div className="pt-modal-backdrop" onClick={()=>setShowModal(false)}/>
        <div className="pt-modal">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
            <span style={{fontSize:18,fontWeight:700}}>Log Practice Session</span>
            <button style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize: mob ? 16 : 20}} onClick={()=>setShowModal(false)}>✕</button>
          </div>
          <div className="pt-form-group"><label className="pt-form-label">Practice Date *</label><input type="date" className="pt-form-input" defaultValue="2026-02-25"/></div>
          <div className="pt-form-group"><label className="pt-form-label">Practice Type *</label>
            <select className="pt-form-input" value={practiceType} onChange={e=>setPracticeType(e.target.value)} style={{appearance:'auto'}}>
              <option value="">Select type...</option>
              {['Scales & Exercises','Repertoire','Sight Reading','Ear Training','Game','Theory','Listening / Watching','Other'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {practiceType==='Game' && <div className="pt-form-group"><label className="pt-form-label">Game Name</label><input className="pt-form-input" placeholder="e.g., Find the Note"/></div>}
          {practiceType==='Listening / Watching' && <div className="pt-warn">⚠️ Note: Listening/Watching activities are logged but don't count toward your DPM score.</div>}
          <div className="pt-form-group"><label className="pt-form-label">Minutes Practiced *</label>
            <div className="pt-slider-row"><input type="range" className="pt-slider" min="5" max="120" step="5" value={minutes} onChange={e=>setMinutes(e.target.value)}/><span style={{fontWeight:600,width:64,textAlign:'center'}}>{minutes} min</span></div>
          </div>
          <div className="pt-form-group"><label className="pt-form-label">Instrument *</label><select className="pt-form-input" style={{appearance:'auto'}}><option value="">Select instrument...</option><option>Piano</option><option>Voice</option><option>Guitar</option></select></div>
          <div className="pt-form-group"><label className="pt-form-label">Notes (optional)</label><textarea className="pt-form-input" rows="3" placeholder="What did you work on?" style={{resize:'none'}}/></div>
          <button className="pt-submit" onClick={()=>setShowModal(false)}>Log Practice</button>
        </div>
      </div>
    </div>
  )
}
