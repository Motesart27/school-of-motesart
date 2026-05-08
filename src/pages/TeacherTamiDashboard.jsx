import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile.js'

const STUDENTS = [
 { id:1, name:'Emma Rodriguez', initials:'ER', instrument:'Violin', dpm:25, drive:18, passion:25, motivation:32, weeklyMin:0, goalMin:150, status:'critical', avBg:'#dc2626', trend:'down', wyl:'Auditory', lastPractice:'14 days ago', hwRate:0 },
 { id:2, name:'Tyler Kim', initials:'TK', instrument:'Piano', dpm:20, drive:12, passion:20, motivation:28, weeklyMin:0, goalMin:120, status:'critical', avBg:'#dc2626', trend:'down', wyl:'Reading', lastPractice:'21 days ago', hwRate:33 },
 { id:3, name:'Mia Thompson', initials:'MT', instrument:'Cello', dpm:28, drive:22, passion:30, motivation:33, weeklyMin:10, goalMin:120, status:'critical', avBg:'#dc2626', trend:'down', wyl:'Kinesthetic',lastPractice:'10 days ago', hwRate:0 },
 { id:4, name:'Aiden Jackson', initials:'AJ', instrument:'Guitar', dpm:45, drive:42, passion:55, motivation:38, weeklyMin:35, goalMin:120, status:'atrisk', avBg:'#d97706', trend:'flat', wyl:'Visual', lastPractice:'5 days ago', hwRate:50 },
 { id:5, name:'Zoe Martinez', initials:'ZM', instrument:'Voice', dpm:40, drive:38, passion:48, motivation:35, weeklyMin:25, goalMin:100, status:'atrisk', avBg:'#d97706', trend:'flat', wyl:'Auditory', lastPractice:'6 days ago', hwRate:33 },
 { id:16, name:'Marcus Williams', initials:'MW', instrument:'Drums', dpm:88, drive:85, passion:92, motivation:88, weeklyMin:145, goalMin:120, status:'ontrack', avBg:'#059669', trend:'up', wyl:'Kinesthetic',lastPractice:'Today', hwRate:100 },
 { id:17, name:'Luna Chen', initials:'LC', instrument:'Piano', dpm:92, drive:90, passion:95, motivation:91, weeklyMin:180, goalMin:150, status:'ontrack', avBg:'#059669', trend:'up', wyl:'Reading', lastPractice:'Today', hwRate:100 },
 { id:18, name:'Harper Jones', initials:'HJ', instrument:'Violin', dpm:82, drive:80, passion:85, motivation:81, weeklyMin:130, goalMin:120, status:'ontrack', avBg:'#059669', trend:'up', wyl:'Visual', lastPractice:'Today', hwRate:100 },
]

const WYL_COLORS = { Auditory:'#a78bfa', Visual:'#2dd4bf', Kinesthetic:'#fbbf24', Reading:'#f97316' }

const TAMI_INSIGHTS = [
 { icon:' ¸', color:'#f87171', bg:'rgba(220,38,38,0.1)', border:'rgba(220,38,38,0.25)', title:'Emma Rodriguez needs intervention', body:'No practice in 14 days. Drive score dropped 12 points. Recommend immediate parent contact.' },
 { icon:'¯', color:'#fbbf24', bg:'rgba(234,179,8,0.08)', border:'rgba(234,179,8,0.2)', title:'Tyler Kim motivation breakthrough possible', body:'Passion score is rising despite low practice. Try game-mode challenges to convert interest into action.' },
 { icon:'', color:'#34d399', bg:'rgba(6,95,70,0.1)', border:'rgba(6,95,70,0.25)', title:'Luna Chen ready for advanced material', body:'Consistently exceeds practice goals by 20%+. DPM at 92. Consider level acceleration.' },
 { icon:'', color:'#2dd4bf', bg:'rgba(45,212,191,0.08)', border:'rgba(45,212,191,0.2)', title:'Class WYL profile mostly Kinesthetic', body:'7 of 24 students learn best through doing. Increase hands-on exercises and ear training games.' },
]

const WEEKLY_DPM = [
 { day:'Mon', val:48 }, { day:'Tue', val:52 }, { day:'Wed', val:49 },
 { day:'Thu', val:55 }, { day:'Fri', val:51 }, { day:'Sat', val:58 }, { day:'Sun', val:50 },
]

export default function TeacherTamiDashboard() {
 const mob = useIsMobile()
 const navigate = useNavigate()
 const [activeStudent, setActiveStudent] = useState(null)
 const [tamiInput, setTamiInput] = useState('')
 const [tamiMessages, setTamiMessages] = useState([
 { role:'tami', text:"Hello Prof. Motes! I've analyzed your class data. 3 students need immediate attention. Want me to draft parent messages for the critical cases?" }
 ])

 const maxDPM = Math.max(...WEEKLY_DPM.map(d => d.val))

 const sendTami = () => {
 if (!tamiInput.trim()) return
 const newMessages = [
 ...tamiMessages,
 { role:'user', text: tamiInput },
 { role:'tami', text:"I'm analyzing that now. Based on the class DPM trends, I recommend focusing on engagement strategies for your at-risk students this week. Would you like a detailed breakdown?" }
 ]
 setTamiMessages(newMessages)
 setTamiInput('')
 }

 return (
 <div style={{ fontFamily:"'Inter',-apple-system,sans-serif", background:'#0a0e1a', color:'#e2e8f0', minHeight:'100vh', fontSize:13, paddingBottom:80 }}>
 <style>{`
 @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
 @keyframes fu { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
 @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.4} }
 @keyframes tamiGlow { 0%,100%{box-shadow:0 0 20px rgba(232,75,138,0.3)} 50%{box-shadow:0 0 35px rgba(249,115,22,0.5)} }
 .hover-row:hover { background:rgba(255,255,255,0.025) !important; cursor:pointer; }
 `}</style>

 {/* HEADER */}
 <div style={{ background:'#0d1525', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'8px 20px', display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, zIndex:200, flexWrap:'wrap' }}>
 <div style={{ color:'#9ca3af', cursor:'pointer', fontSize:16 }} onClick={() => navigate('/teacher')}></div>
 <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#e84b8a,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff', flexShrink:0, animation:'tamiGlow 3s ease infinite' }}>T</div>
 <div>
 <div style={{ fontSize:14, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
 TAMi Dashboard
 <span style={{ fontSize:9, fontWeight:600, background:'linear-gradient(90deg,rgba(232,75,138,0.2),rgba(249,115,22,0.2))', color:'#f97316', padding:'2px 7px', borderRadius:4, border:'1px solid rgba(249,115,22,0.3)' }}>TEACHER AI</span>
 </div>
 <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>Prof. J. Motes · Piano &amp; Theory</div>
 </div>
 <div style={{ flex:1 }} />
 <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#34d399' }}>
 <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', animation:'livePulse 2s infinite' }} />
 Live Class Data
 </div>
 <div
 onClick={() => navigate('/teacher')}
 style={{ padding:'6px 14px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#9ca3af', fontSize:11, fontWeight:600, cursor:'pointer' }}
 > Teacher Dash</div>
 </div>

 {/* PAGE */}
 <div style={{ padding:20, maxWidth: mob ? '100%' : 1400, margin:'0 auto' }}>

 {/* ALERT BANNER */}
 <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10, animation:'fu .3s ease both' }}>
 <span style={{ fontSize:16 }}>¨</span>
 <span style={{ fontSize:12, color:'#f87171', fontWeight:600 }}>3 students are in Critical status Emma Rodriguez hasn&apos;t practiced in 14 days</span>
 <button style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:6, border:'1px solid rgba(220,38,38,0.4)', background:'rgba(220,38,38,0.2)', color:'#f87171', fontSize:11, fontWeight:600, cursor:'pointer' }}>Draft Parent Messages</button>
 </div>

 {/* TOP ROW: TAMi Chat + Weekly DPM */}
 <div style={{ display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:14, marginBottom:14, animation:'fu .3s ease .05s both' }}>

 {/* TAMi Chat */}
 <div style={{ background:'#131c2e', border:'1px solid rgba(232,75,138,0.2)', borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>
 <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#e84b8a,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', animation:'tamiGlow 3s ease infinite' }}>T</div>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Ask TAMi</div>
 <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'livePulse 2s infinite', marginLeft:4 }} />
 </div>
 <div style={{ flex:1, padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, minHeight:180, maxHeight:240, overflowY:'auto' }}>
 {tamiMessages.map((m, i) => (
 <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
 {m.role==='tami' && <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#e84b8a,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>T</div>}
 <div style={{ maxWidth:'80%', padding:'8px 12px', borderRadius: m.role==='user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role==='user' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', border: m.role==='user' ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)', fontSize:12, color:'#e2e8f0', lineHeight:1.5 }}>
 {m.text}
 </div>
 </div>
 ))}
 </div>
 <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
 <input
 value={tamiInput}
 onChange={e => setTamiInput(e.target.value)}
 onKeyDown={e => e.key==='Enter' && sendTami()}
 placeholder="Ask about your class..."
 style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 12px', color:'#fff', fontSize:12, outline:'none' }}
 />
 <button onClick={sendTami} style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#e84b8a,#f97316)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>Send</button>
 </div>
 </div>

 {/* Weekly DPM Chart */}
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:18 }}>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}> Class DPM This Week</div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:16 }}>Average across all 24 students</div>
 <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
 {WEEKLY_DPM.map((d, i) => (
 <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
 <div style={{ fontSize:9, color:'#9ca3af', fontWeight:700 }}>{d.val}</div>
 <div style={{ width:'100%', borderRadius:'4px 4px 0 0', background: d.day==='Thu' ? 'linear-gradient(180deg,#2dd4bf,#7c3aed)' : 'rgba(124,58,237,0.4)', height:`${(d.val/maxDPM)*80}px`, minHeight:4, transition:'height .3s' }} />
 <div style={{ fontSize:9, color:'#6b7280' }}>{d.day}</div>
 </div>
 ))}
 </div>
 <div style={{ marginTop:14, display:'flex', gap:10 }}>
 <div style={{ flex:1, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
 <div style={{ fontSize:16, fontWeight:800, color:'#34d399' }}>+7%</div>
 <div style={{ fontSize:9, color:'#6b7280', marginTop:1 }}>vs last week</div>
 </div>
 <div style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
 <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>52</div>
 <div style={{ fontSize:9, color:'#6b7280', marginTop:1 }}>Avg DPM</div>
 </div>
 </div>
 </div>
 </div>

 {/* TAMi INSIGHTS */}
 <div style={{ marginBottom:14, animation:'fu .3s ease .1s both' }}>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
 §  TAMi Insights
 <span style={{ fontSize:10, color:'#6b7280', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:8 }}>4 this week</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:10 }}>
 {TAMI_INSIGHTS.map((ins, i) => (
 <div key={i} style={{ background:ins.bg, border:`1px solid ${ins.border}`, borderRadius:12, padding:'12px 14px', display:'flex', gap:10 }}>
 <span style={{ fontSize:18, flexShrink:0 }}>{ins.icon}</span>
 <div>
 <div style={{ fontSize:12, fontWeight:700, color:ins.color, marginBottom:3 }}>{ins.title}</div>
 <div style={{ fontSize:11, color:'#9ca3af', lineHeight:1.5 }}>{ins.body}</div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* STUDENT FOCUS LIST */}
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden', marginBottom:14, animation:'fu .3s ease .15s both' }}>
 <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:13, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
 Student Focus Priority Cases
 <span style={{ fontSize:10, color:'#6b7280' }}>Click row for details</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'2fr 0.6fr 0.6fr 0.6fr 0.8fr 0.8fr 0.8fr', padding:'7px 16px', fontSize:10, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, background:'rgba(255,255,255,0.01)' }}>
 <div>Student</div><div>DPM</div><div>Drive</div><div>Passion</div><div>WYL</div><div>Practice</div><div>Status</div>
 </div>
 {STUDENTS.map(s => {
 const isActive = activeStudent === s.id
 const statusColors = { critical:'#f87171', atrisk:'#fb923c', watch:'#facc15', ontrack:'#34d399' }
 const statusLabels = { critical:'  Critical', atrisk:' At Risk', watch:' Watch', ontrack:' On Track' }
 return (
 <div key={s.id}>
 <div
 className="hover-row"
 onClick={() => setActiveStudent(isActive ? null : s.id)}
 style={{ display:'grid', gridTemplateColumns:'2fr 0.6fr 0.6fr 0.6fr 0.8fr 0.8fr 0.8fr', padding:'10px 16px', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.04)', background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent' }}
 >
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', background:s.avBg, flexShrink:0 }}>{s.initials}</div>
 <div>
 <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{s.name}</div>
 <div style={{ fontSize:10, color:'#6b7280' }}>{s.instrument}</div>
 </div>
 </div>
 <div style={{ fontSize:13, fontWeight:700, color:statusColors[s.status] }}>{s.dpm}%</div>
 <div style={{ fontSize:12, color:'#a78bfa', fontWeight:600 }}>{s.drive}</div>
 <div style={{ fontSize:12, color:'#2dd4bf', fontWeight:600 }}>{s.passion}</div>
 <div>
 <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:`${WYL_COLORS[s.wyl]}22`, color:WYL_COLORS[s.wyl], border:`1px solid ${WYL_COLORS[s.wyl]}44` }}>{s.wyl}</span>
 </div>
 <div style={{ fontSize:11, color:'#9ca3af' }}>{s.weeklyMin}/{s.goalMin}m</div>
 <div>
 <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, color:statusColors[s.status], background:`${statusColors[s.status]}22`, border:`1px solid ${statusColors[s.status]}44` }}>{statusLabels[s.status]}</span>
 </div>
 </div>

 {/* Expanded Detail Panel */}
 {isActive && (
 <div style={{ padding:'14px 16px 16px', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.04)', display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr 1fr', gap:12 }}>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>DPM Breakdown</div>
 {[
 { label:'Drive', val:s.drive, color:'#a78bfa' },
 { label:'Passion', val:s.passion, color:'#2dd4bf' },
 { label:'Motivation', val:s.motivation, color:'#fbbf24' },
 ].map((p, i) => (
 <div key={i} style={{ marginBottom:7 }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
 <span style={{ color:'#9ca3af' }}>{p.label}</span>
 <span style={{ color:p.color, fontWeight:700 }}>{p.val}%</span>
 </div>
 <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
 <div style={{ height:'100%', width:`${p.val}%`, background:p.color, borderRadius:3 }} />
 </div>
 </div>
 ))}
 </div>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Practice</div>
 <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>Last practice: <span style={{ color:'#fff' }}>{s.lastPractice}</span></div>
 <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>Weekly: <span style={{ color:'#fff' }}>{s.weeklyMin} / {s.goalMin} min</span></div>
 <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>HW rate: <span style={{ color:'#fff' }}>{s.hwRate}%</span></div>
 <div style={{ fontSize:11, color:'#9ca3af' }}>WYL style: <span style={{ color:WYL_COLORS[s.wyl], fontWeight:600 }}>{s.wyl}</span></div>
 </div>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>TAMi Recommendation</div>
 <div style={{ fontSize:11, color:'#9ca3af', lineHeight:1.6, background:'rgba(232,75,138,0.06)', border:'1px solid rgba(232,75,138,0.15)', borderRadius:8, padding:'8px 10px' }}>
 {s.status === 'critical' && `Contact parents immediately. Schedule a check-in. Try ${s.wyl.toLowerCase()} learning activities to re-engage.`}
 {s.status === 'atrisk' && `Monitor closely this week. Send an encouraging message. Assign shorter, achievable practice goals.`}
 {s.status === 'watch' && `Student is improving. Keep current pace and watch for consistency over next 2 weeks.`}
 {s.status === 'ontrack' && `Excellent progress! Consider introducing advanced material or leadership opportunities.`}
 </div>
 <div style={{ display:'flex', gap:6, marginTop:10 }}>
 <button style={{ flex:1, padding:'6px', borderRadius:7, border:'1px solid rgba(232,75,138,0.3)', background:'rgba(232,75,138,0.1)', color:'#e84b8a', fontSize:10, fontWeight:600, cursor:'pointer' }}>¬ Message</button>
 <button style={{ flex:1, padding:'6px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#9ca3af', fontSize:10, fontWeight:600, cursor:'pointer' }}> Full Profile</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
 })}
 </div>

 {/* WYL PROFILE + PRACTICE ANALYTICS */}
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:14, animation:'fu .3s ease .2s both' }}>

 {/* WYL Profile */}
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:18 }}>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}>§© WYL Learning Profiles</div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:14 }}>How your students learn best</div>
 {[
 { type:'Kinesthetic', count:9, pct:37, color:'#fbbf24', desc:'Learn by doing prefer practice & games' },
 { type:'Auditory', count:7, pct:29, color:'#a78bfa', desc:'Learn by listening prefer play-along' },
 { type:'Visual', count:5, pct:21, color:'#2dd4bf', desc:'Learn by seeing prefer notation & video' },
 { type:'Reading', count:3, pct:13, color:'#f97316', desc:'Learn by reading prefer written theory' },
 ].map((w, i) => (
 <div key={i} style={{ marginBottom:12 }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
 <span style={{ color:'#fff', fontWeight:600 }}>{w.type} <span style={{ color:'#6b7280', fontWeight:400 }}>({w.count} students)</span></span>
 <span style={{ color:w.color, fontWeight:700 }}>{w.pct}%</span>
 </div>
 <div style={{ height:7, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden', marginBottom:3 }}>
 <div style={{ height:'100%', width:`${w.pct}%`, background:w.color, borderRadius:4 }} />
 </div>
 <div style={{ fontSize:10, color:'#4b5563' }}>{w.desc}</div>
 </div>
 ))}
 </div>

 {/* Practice Analytics */}
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:18 }}>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}>µ Practice Analytics</div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:14 }}>This week across all students</div>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:10, marginBottom:14 }}>
 {[
 { num:'88m', label:'Avg Weekly Practice', color:'#2dd4bf' },
 { num:'72%', label:'HW Completion Rate', color:'#34d399' },
 { num:'14', label:'Students Practiced', color:'#a78bfa' },
 { num:'3', label:'Zero Practice', color:'#f87171' },
 ].map((s, i) => (
 <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
 <div style={{ fontSize: mob ? 17 : 22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.num}</div>
 <div style={{ fontSize:9, color:'#6b7280', marginTop:3, textTransform:'uppercase', letterSpacing:0.3 }}>{s.label}</div>
 </div>
 ))}
 </div>
 <div style={{ padding:'10px 12px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:8 }}>
 <div style={{ fontSize:11, color:'#a78bfa', fontWeight:600, marginBottom:2 }}>¤ TAMi Analysis</div>
 <div style={{ fontSize:11, color:'#9ca3af', lineHeight:1.5 }}>Practice rate improved 12% vs last week. Ear training game sessions correlate with 23% higher DPM scores.</div>
 </div>
 </div>
 </div>

 </div>
 </div>
 )
}
