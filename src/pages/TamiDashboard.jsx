import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsMobile from '../hooks/useIsMobile.js'

export default function TamiDashboard() {
 const mob = useIsMobile()
 const { user } = useAuth()
 const navigate = useNavigate()
 const dashRoute = { admin: '/admin', teacher: '/teacher', ambassador: '/ambassador', parent: '/parent', student: '/student' }[user?.role] || '/student'
 const userName = user?.name || user?.email?.split('@')[0] || 'Student'

 return (
 <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#111827,#111827,#1f2937)', color:'#fff', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflowX:'hidden', paddingBottom:80 }}>

 {/* HEADER */}
 <div style={{ borderBottom:'1px solid #1f2937', position:'sticky', top:0, background:'rgba(17,24,39,0.95)', backdropFilter:'blur(12px)', zIndex:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
 <div style={{ display:'flex', alignItems:'center', gap:12 }}>
 <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid rgba(249,115,22,0.7)', overflow:'hidden', flexShrink:0, boxShadow:'0 0 14px rgba(232,75,138,0.5)' }}>
 <img src="/tami-avatar.png" alt="TAMi" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}/>
 </div>
 <div>
 <div style={{ fontSize:16, fontWeight:700 }}>{userName}</div>
 <div style={{ fontSize:11, color:'#fb923c', marginTop:2 }}>TAMi Dashboard · Teaching Assistant for Musical Intelligence</div>
 </div>
 </div>
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, marginRight:4 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#d1d5db' }}>
 <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e' }}/>
 Analyzing your data
 </div>
 <div style={{ fontSize:10, color:'#6b7280' }}>Last updated: Feb 27, 2026</div>
 </div>
 <button onClick={() => navigate(dashRoute)} style={{ padding:'6px 14px', background:'none', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, fontSize:12, cursor:'pointer', color:'#9ca3af' }}> Back to Dashboard</button>
 <button onClick={() => navigate('/settings')} style={{ padding:'6px 10px', background:'none', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, fontSize:14, cursor:'pointer', color:'#9ca3af' }}>¸</button>
 </div>
 </div>

 {/* MAIN */}
 <div style={{ maxWidth: mob ? '100%' : 1280, margin:'0 auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

 {/* Row 1: DPM + WYL */}
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:12 }}>
 <TCard title="DPM Breakdown">
 <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
 <div style={{ position:'relative' }}>
 <svg width="110" height="110" viewBox="0 0 100 100">
 <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(55,65,81,0.5)" strokeWidth="8"/>
 <circle cx="50" cy="50" r="42" fill="none" stroke="#14b8a6" strokeWidth="8" strokeDasharray="263.9" strokeDashoffset="240" strokeLinecap="round" transform="rotate(-90 50 50)"/>
 </svg>
 <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
 <div style={{ fontSize: mob ? 18 : 22, fontWeight:800 }}>9%</div>
 <div style={{ fontSize:10, color:'#9ca3af' }}>Overall</div>
 </div>
 </div>
 <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
 {[{l:'Drive',v:1,c:'#3b82f6',badge:'Critical'},{l:'Passion',v:27,c:'#f97316',badge:'Growing'},{l:'Motivation',v:0,c:'#22c55e',badge:'Critical'}].map(d => (
 <div key={d.l}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
 <span style={{ fontSize:12, color:'#9ca3af' }}>{d.l}</span>
 <div style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ fontSize:12, fontWeight:700, color:d.c }}>{d.v}%</span>
 <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background: d.badge==='Growing' ? 'rgba(249,115,22,0.2)' : 'rgba(239,68,68,0.2)', color: d.badge==='Growing' ? '#fb923c' : '#f87171' }}>{d.badge}</span>
 </div>
 </div>
 <div style={{ height:6, background:'rgba(55,65,81,0.5)', borderRadius:4, overflow:'hidden' }}>
 <div style={{ height:'100%', width:`${d.v}%`, background:d.c, borderRadius:4 }}/>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4,1fr)', gap:8, marginTop:16, paddingTop:12, borderTop:'1px solid rgba(55,65,81,0.5)', textAlign:'center' }}>
 {[{v:'0',l:'Days Practiced'},{v:'1',l:'Game Sessions'},{v:'0%',l:'Homework Done'},{v:'9%',l:'Overall DPM'}].map(s => (
 <div key={s.l}><div style={{ fontSize:16, fontWeight:700, color:'#14b8a6' }}>{s.v}</div><div style={{ fontSize:9, color:'#9ca3af', marginTop:2 }}>{s.l}</div></div>
 ))}
 </div>
 </TCard>

 <TCard title="WYL Profile · Way You Learn">
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:12 }}>
 <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
 {[{l:'Kinesthetic',v:90,badge:'Primary',c:'#f97316'},{l:'Auditory',v:75,badge:'Strong',c:'#14b8a6'},{l:'Visual',v:60,badge:'Active',c:'#3b82f6'},{l:'Reading/Writing',v:20,badge:'Low',c:'#6b7280',dim:true}].map(w => (
 <div key={w.l} style={{ opacity: w.dim ? 0.5 : 1 }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
 <span style={{ fontSize:11, color:'#d1d5db' }}>{w.l}</span>
 <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:`${w.c}33`, color:w.c }}>{w.badge}</span>
 </div>
 <div style={{ height:5, background:'rgba(55,65,81,0.5)', borderRadius:3, overflow:'hidden' }}>
 <div style={{ height:'100%', width:`${w.v}%`, background:w.c, borderRadius:3 }}/>
 </div>
 </div>
 ))}
 </div>
 <div style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:8, padding:10 }}>
 <div style={{ fontSize:11, fontWeight:700, color:'#fb923c', marginBottom:8 }}>How TAMi Adapts</div>
 <div style={{ fontSize:11, color:'#9ca3af', marginBottom:6 }}>Teaching sequence:</div>
 <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:10 }}>
 {['Do','','Hear','','See'].map((s,i) => (
 <span key={i} style={{ fontSize:11, color: s==='' ? '#6b7280' : '#fff', fontWeight: s==='' ? 400 : 700, padding: s==='' ? 0 : '2px 8px', background: s==='' ? 'none' : 'rgba(249,115,22,0.2)', borderRadius: s==='' ? 0 : 4 }}>{s}</span>
 ))}
 </div>
 {[{l:'Text',v:'Minimal'},{l:'Action prompts',v:'Always first'},{l:'Audio examples',v:'High priority'},{l:'Visual diagrams',v:'When needed'}].map(r => (
 <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:4 }}>
 <span style={{ color:'#6b7280' }}>{r.l}</span>
 <span style={{ color:'#d1d5db', fontWeight:600 }}>{r.v}</span>
 </div>
 ))}
 </div>
 </div>
 </TCard>
 </div>

 {/* Row 2: Practice + Game */}
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:12 }}>
 <TCard title="Practice Analytics">
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr 1fr', gap:8, marginBottom:12 }}>
 {[{l:'This Week',v:'0 min',sub:'0 sessions'},{l:'Weekly Goal',v:'60 min',sub:'0% complete'},{l:'Streak',v:'0 days',sub:'Best: 0'}].map(s => (
 <div key={s.l} style={{ textAlign:'center', padding:10, background:'rgba(55,65,81,0.3)', borderRadius:8 }}>
 <div style={{ fontSize:9, color:'#9ca3af', marginBottom:4 }}>{s.l}</div>
 <div style={{ fontSize:16, fontWeight:700, color:'#14b8a6' }}>{s.v}</div>
 <div style={{ fontSize:9, color:'#6b7280', marginTop:2 }}>{s.sub}</div>
 </div>
 ))}
 </div>
 <div style={{ fontSize:11, color:'#9ca3af', marginBottom:6 }}>Daily intensity this week</div>
 <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:50 }}>
 {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
 <div key={d} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
 <div style={{ width:'100%', height:2, background:'rgba(20,184,166,0.2)', borderRadius:2 }}/>
 <span style={{ fontSize:8, color:'#6b7280' }}>{d}</span>
 </div>
 ))}
 </div>
 </TCard>

 <TCard title="Game Performance · Find the Note">
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:10, marginBottom:12 }}>
 <div style={{ padding:12, background:'rgba(55,65,81,0.3)', borderRadius:8, textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#9ca3af', marginBottom:6 }}>Find the Note</div>
 <div style={{ display:'inline-block', padding:'2px 10px', background:'rgba(249,115,22,0.2)', border:'1px solid rgba(249,115,22,0.4)', borderRadius:12, fontSize:11, fontWeight:700, color:'#fb923c', marginBottom:6 }}>Level 1</div>
 <div style={{ fontSize:12, fontWeight:700 }}>1 Session</div>
 <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>0% accuracy · 0 streak</div>
 </div>
 <div style={{ padding:12, background:'rgba(55,65,81,0.3)', borderRadius:8 }}>
 <div style={{ fontSize:9, color:'#9ca3af', marginBottom:6 }}>Game DPM Impact</div>
 {[{l:'Passion boost',v:'+27%'},{l:'Lives',v:'3/3'},{l:'Leaderboard',v:'#1'}].map(r => (
 <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
 <span style={{ color:'#6b7280' }}>{r.l}</span>
 <span style={{ color:'#22c55e', fontWeight:700 }}>{r.v}</span>
 </div>
 ))}
 </div>
 </div>
 <div style={{ fontSize:10, color:'#6b7280', padding:'8px 10px', background:'rgba(55,65,81,0.2)', borderRadius:6 }}>
 3 more sessions to next DPM threshold
 </div>
 </TCard>
 </div>

 {/* Row 3: Homework + Weekly Report */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12 }}>
 <TCard title="Homework Progress">
 <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:12 }}>
 <svg width="70" height="70" viewBox="0 0 100 100">
 <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(55,65,81,0.5)" strokeWidth="8"/>
 <circle cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="8" strokeDasharray="263.9" strokeDashoffset="263.9" strokeLinecap="round" transform="rotate(-90 50 50)"/>
 <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">0%</text>
 <text x="50" y="60" textAnchor="middle" fill="#9ca3af" fontSize="9">Done</text>
 </svg>
 <div>
 <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Level 3 Mastery</div>
 <div style={{ fontSize:10, color:'#9ca3af' }}>In Progress</div>
 <div style={{ fontSize:10, color:'#60a5fa', marginTop:6 }}>Complete Motivation +25%</div>
 </div>
 </div>
 <button onClick={() => navigate('/homework')} style={{ width:'100%', padding:9, background:'linear-gradient(135deg,rgba(37,99,235,0.2),rgba(79,70,229,0.2))', border:'1px solid rgba(59,130,246,0.3)', color:'#60a5fa', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>Go to Homework </button>
 </TCard>

 <div style={{ background:'linear-gradient(135deg,rgba(232,75,138,0.12),rgba(249,115,22,0.12))', border:'1px solid rgba(232,75,138,0.25)', borderRadius:12, overflow:'hidden' }}>
 <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(232,75,138,0.2)', display:'flex', alignItems:'center', gap:10 }}>
 <div style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(249,115,22,0.6)', overflow:'hidden', flexShrink:0 }}>
 <img src="/tami-avatar.png" alt="TAMi" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}/>
 </div>
 <span style={{ fontSize:14, fontWeight:700, color:'#fb923c' }}>TAMi Weekly Report</span>
 </div>
 <div style={{ padding:16 }}>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:14 }}>
 {[{v:'1',l:'Game Sessions',c:'#f97316'},{v:'0',l:'Practice Mins',c:'#14b8a6'},{v:'27%',l:'Passion',c:'#f97316'},{v:'0%',l:'Homework',c:'#3b82f6'},{v:'9%',l:'DPM',c:'#14b8a6'},{v:'0',l:'Streak',c:'#a855f7'}].map(s => (
 <div key={s.l} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(0,0,0,0.2)', borderRadius:8 }}>
 <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
 <div style={{ fontSize:8, color:'#9ca3af', marginTop:2 }}>{s.l}</div>
 </div>
 ))}
 </div>
 <div style={{ padding:'12px 14px', background:'rgba(0,0,0,0.2)', borderRadius:8, borderLeft:'3px solid #fb923c' }}>
 <div style={{ fontSize:10, color:'#fb923c', fontWeight:700, marginBottom:6 }}>TAMi says</div>
 <p style={{ fontSize:12, color:'#d1d5db', lineHeight:1.6, fontStyle:'italic' }}>"Your Passion is real one game session proves that. One practice log this week changes everything for your Drive. Finish Level 3 Mastery and your Motivation wakes up. You're close."</p>
 </div>
 </div>
 </div>
 </div>

 </div>
 </div>
 )
}

function TCard({ title, children }) {
 return (
 <div style={{ background:'rgba(31,41,55,0.8)', backdropFilter:'blur(8px)', borderRadius:12, border:'1px solid rgba(55,65,81,0.5)', overflow:'hidden' }}>
 <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(55,65,81,0.5)', fontSize:14, fontWeight:600 }}>{title}</div>
 <div style={{ padding:16 }}>{children}</div>
 </div>
 )
}
