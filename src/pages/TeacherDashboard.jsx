import { useState } from 'react'
import api from '../services/api.js'
import { useNavigate } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile.js'
import tamiImg from './assets/image-1-nav-tab-active.png';

const STUDENTS_DATA = [
 { id:1, name:'Emma Rodriguez', initials:'ER', instrument:'Violin', grade:4, dpm:25, dpmColor:'#f87171', drive:18, passion:25, motivation:32, weeklyMin:0, goalMin:150, hw:'0 / 3', status:'critical', statusLabel:'¢  Critical', avBg:'#dc2626', lastPractice:'14 days ago' },
 { id:2, name:'Tyler Kim', initials:'TK', instrument:'Piano', grade:3, dpm:20, dpmColor:'#f87171', drive:12, passion:20, motivation:28, weeklyMin:0, goalMin:120, hw:'1 / 3', status:'critical', statusLabel:'¢  Critical', avBg:'#dc2626', lastPractice:'21 days ago' },
 { id:3, name:'Mia Thompson', initials:'MT', instrument:'Cello', grade:5, dpm:28, dpmColor:'#f87171', drive:22, passion:30, motivation:33, weeklyMin:10, goalMin:120, hw:'0 / 2', status:'critical', statusLabel:'¢  Critical', avBg:'#dc2626', lastPractice:'10 days ago' },
 { id:4, name:'Aiden Jackson', initials:'AJ', instrument:'Guitar', grade:5, dpm:45, dpmColor:'#fb923c', drive:42, passion:55, motivation:38, weeklyMin:35, goalMin:120, hw:'1 / 2', status:'atrisk', statusLabel:'° At Risk', avBg:'#d97706', lastPractice:'5 days ago' },
 { id:5, name:'Zoe Martinez', initials:'ZM', instrument:'Voice', grade:4, dpm:40, dpmColor:'#fb923c', drive:38, passion:48, motivation:35, weeklyMin:25, goalMin:100, hw:'1 / 3', status:'atrisk', statusLabel:'° At Risk', avBg:'#d97706', lastPractice:'6 days ago' },
 { id:6, name:'Noah Davis', initials:'ND', instrument:'Trumpet', grade:6, dpm:42, dpmColor:'#fb923c', drive:40, passion:50, motivation:36, weeklyMin:30, goalMin:120, hw:'1 / 2', status:'atrisk', statusLabel:'° At Risk', avBg:'#d97706', lastPractice:'4 days ago' },
 { id:7, name:'Lily Park', initials:'LP', instrument:'Clarinet', grade:3, dpm:38, dpmColor:'#fb923c', drive:35, passion:44, motivation:34, weeklyMin:20, goalMin:100, hw:'0 / 2', status:'atrisk', statusLabel:'° At Risk', avBg:'#d97706', lastPractice:'7 days ago' },
 { id:8, name:'Ethan Brown', initials:'EB', instrument:'Saxophone', grade:5, dpm:43, dpmColor:'#fb923c', drive:41, passion:49, motivation:39, weeklyMin:32, goalMin:120, hw:'2 / 3', status:'atrisk', statusLabel:'° At Risk', avBg:'#d97706', lastPractice:'3 days ago' },
 { id:9, name:'Sofia Patel', initials:'SP', instrument:'Flute', grade:6, dpm:57, dpmColor:'#facc15', drive:58, passion:62, motivation:50, weeklyMin:65, goalMin:120, hw:'2 / 3', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'2 days ago' },
 { id:10, name:'James Lee', initials:'JL', instrument:'Piano', grade:4, dpm:55, dpmColor:'#facc15', drive:52, passion:60, motivation:53, weeklyMin:60, goalMin:120, hw:'2 / 2', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'1 day ago' },
 { id:11, name:'Ava Wilson', initials:'AW', instrument:'Violin', grade:7, dpm:60, dpmColor:'#facc15', drive:58, passion:65, motivation:56, weeklyMin:70, goalMin:120, hw:'2 / 3', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'Today' },
 { id:12, name:'Oliver Garcia', initials:'OG', instrument:'Guitar', grade:3, dpm:52, dpmColor:'#facc15', drive:50, passion:58, motivation:48, weeklyMin:55, goalMin:100, hw:'1 / 2', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'2 days ago' },
 { id:13, name:'Isabella Nguyen', initials:'IN', instrument:'Harp', grade:6, dpm:54, dpmColor:'#facc15', drive:51, passion:59, motivation:52, weeklyMin:58, goalMin:120, hw:'2 / 3', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'1 day ago' },
 { id:14, name:'Liam Scott', initials:'LS', instrument:'Drums', grade:5, dpm:56, dpmColor:'#facc15', drive:55, passion:61, motivation:51, weeklyMin:62, goalMin:120, hw:'1 / 2', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'Today' },
 { id:15, name:'Chloe Adams', initials:'CA', instrument:'Voice', grade:4, dpm:53, dpmColor:'#facc15', drive:50, passion:57, motivation:52, weeklyMin:56, goalMin:100, hw:'2 / 3', status:'watch', statusLabel:'° Watch', avBg:'#a16207', lastPractice:'1 day ago' },
 { id:16, name:'Marcus Williams', initials:'MW', instrument:'Drums', grade:7, dpm:88, dpmColor:'#34d399', drive:85, passion:92, motivation:88, weeklyMin:145, goalMin:120, hw:'3 / 3 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
 { id:17, name:'Luna Chen', initials:'LC', instrument:'Piano', grade:8, dpm:92, dpmColor:'#34d399', drive:90, passion:95, motivation:91, weeklyMin:180, goalMin:150, hw:'3 / 3 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
 { id:18, name:'Harper Jones', initials:'HJ', instrument:'Violin', grade:6, dpm:82, dpmColor:'#34d399', drive:80, passion:85, motivation:81, weeklyMin:130, goalMin:120, hw:'2 / 2 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
 { id:19, name:'Jack Taylor', initials:'JT', instrument:'Cello', grade:7, dpm:86, dpmColor:'#34d399', drive:84, passion:89, motivation:85, weeklyMin:140, goalMin:120, hw:'3 / 3 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
 { id:20, name:'Ella Robinson', initials:'ERo', instrument:'Flute', grade:5, dpm:79, dpmColor:'#34d399', drive:76, passion:83, motivation:78, weeklyMin:115, goalMin:100, hw:'2 / 2 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Yesterday' },
 { id:21, name:'Daniel White', initials:'DW', instrument:'Trumpet', grade:8, dpm:84, dpmColor:'#34d399', drive:82, passion:87, motivation:83, weeklyMin:135, goalMin:120, hw:'3 / 3 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
 { id:22, name:'Grace Kim', initials:'GK', instrument:'Piano', grade:6, dpm:81, dpmColor:'#34d399', drive:79, passion:84, motivation:80, weeklyMin:125, goalMin:120, hw:'2 / 2 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
 { id:23, name:'Ryan Mitchell', initials:'RM', instrument:'Guitar', grade:7, dpm:80, dpmColor:'#34d399', drive:78, passion:83, motivation:79, weeklyMin:122, goalMin:120, hw:'3 / 3 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Yesterday' },
 { id:24, name:'Aria Lopez', initials:'AL', instrument:'Voice', grade:5, dpm:83, dpmColor:'#34d399', drive:81, passion:86, motivation:82, weeklyMin:128, goalMin:100, hw:'2 / 2 ¢', status:'ontrack', statusLabel:'¢ On Track', avBg:'#059669', lastPractice:'Today' },
]

const SCHEDULE = [
 { time:'2:00 PM', name:'Luna Chen', inst:'Piano · 45 min', status:'done' },
 { time:'3:00 PM', name:'Marcus Williams', inst:'Drums · 30 min', status:'done' },
 { time:'4:00 PM', name:'Emma Rodriguez', inst:'Violin · 45 min', status:'live' },
 { time:'5:00 PM', name:'Aiden Jackson', inst:'Guitar · 30 min', status:'next' },
 { time:'5:45 PM', name:'Sofia Patel', inst:'Flute · 30 min', status:'upcoming' },
]

const INSTRUMENTS = ['Piano','Violin','Guitar','Cello','Voice','Trumpet','Clarinet','Saxophone','Flute','Drums','Harp','Bass']

const STATUS_STYLES = {
 critical: { background:'rgba(220,38,38,0.2)', color:'#f87171', border:'1px solid rgba(220,38,38,0.3)' },
 atrisk: { background:'rgba(217,119,6,0.2)', color:'#fb923c', border:'1px solid rgba(217,119,6,0.3)' },
 watch: { background:'rgba(161,98,7,0.2)', color:'#facc15', border:'1px solid rgba(161,98,7,0.3)' },
 ontrack: { background:'rgba(6,95,70,0.2)', color:'#34d399', border:'1px solid rgba(6,95,70,0.3)' },
}

export default function TeacherDashboard() {
 const mob = useIsMobile()
 const navigate = useNavigate()

 // roster state
 const [filter, setFilter] = useState('all')
 const [search, setSearch] = useState('')
 const [rosterOpen, setRosterOpen] = useState(true)
 const [showAll, setShowAll] = useState(false)

 // modal/panel state
 const [showAddStudent, setShowAddStudent] = useState(false)
 const [showCreateAssignment, setShowCreateAssignment] = useState(false)
 const [showMessagePanel, setShowMessagePanel] = useState(false)

 // add student form
 const [newStudent, setNewStudent] = useState({ name:'', email:'', instrument:'Piano', grade:'' })

 // create assignment form
 const [newAssignment, setNewAssignment] = useState({ title:'', assignTo:'all', dueDate:'', notes:'' })
 const [assignmentSaving, setAssignmentSaving] = useState(false)

 // message form
 const [message, setMessage] = useState({ to:'all', subject:'', body:'' })
 const [messageSent, setMessageSent] = useState(false)

 const counts = {
 all: STUDENTS_DATA.length,
 critical: STUDENTS_DATA.filter(s => s.status === 'critical').length,
 atrisk: STUDENTS_DATA.filter(s => s.status === 'atrisk').length,
 watch: STUDENTS_DATA.filter(s => s.status === 'watch').length,
 ontrack: STUDENTS_DATA.filter(s => s.status === 'ontrack').length,
 }

 const filtered = STUDENTS_DATA.filter(s => {
 const matchFilter = filter === 'all' || s.status === filter
 const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.instrument.toLowerCase().includes(search.toLowerCase())
 return matchFilter && matchSearch
 })

 const displayed = showAll ? filtered : filtered.slice(0, 6)
 const avgDPM = Math.round(STUDENTS_DATA.reduce((a, s) => a + s.dpm, 0) / STUDENTS_DATA.length)
 const avgPractice = Math.round(STUDENTS_DATA.reduce((a, s) => a + s.weeklyMin, 0) / STUDENTS_DATA.length)

 const handleSendMessage = () => {
 setMessageSent(true)
 setTimeout(() => { setMessageSent(false); setShowMessagePanel(false); setMessage({ to:'all', subject:'', body:'' }) }, 2000)
 }

 async function handleCreateAssignment() {
   if (!newAssignment.title.trim()) return
   setAssignmentSaving(true)
   try {
     const user = JSON.parse(localStorage.getItem('som_user') || '{}')
     // notes and assignTo not sent — no backend columns exist yet
     await api.createAssignment({
       title: newAssignment.title.trim(),
       due_date: newAssignment.dueDate || null,
       type: 'Homework',
       created_by: user.name || user.email || 'Teacher',
     })
     setNewAssignment({ title:'', assignTo:'all', dueDate:'', notes:'' })
     setShowCreateAssignment(false)
   } catch (err) {
     console.error('createAssignment failed:', err)
   } finally {
     setAssignmentSaving(false)
   }
 }

 const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }
 const modalStyle = { background:'#131c2e', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, padding:24, width:'100%', maxWidth:480, position:'relative' }

 return (
 <div style={{ fontFamily:"'Inter',-apple-system,sans-serif", background:'#0a0e1a', color:'#e2e8f0', minHeight:'100vh', fontSize:13, paddingBottom:80 }}>
 <style>{`
 @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
 @keyframes fu { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
 @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.4} }
 @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
 @keyframes fadeIn { from{opacity:0} to{opacity:1} }
 .roster-body { overflow:hidden; transition:max-height 0.35s ease; max-height:4000px; }
 .roster-body.collapsed { max-height:0; }
 .row-hover:hover { background:rgba(255,255,255,0.025) !important; }
 .quick-btn:hover { opacity:0.8; }
 input,select,textarea { font-family:'Inter',sans-serif; }
 `}</style>

 {/* ¢¢ ADD STUDENT MODAL ¢¢ */}
 {showAddStudent && (
 <div style={overlayStyle} onClick={() => setShowAddStudent(false)}>
 <div style={modalStyle} onClick={e => e.stopPropagation()}>
 <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:16 }}>¢ Add New Student</div>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>
 {[
 { label:'Full Name', key:'name', placeholder:'e.g. Emma Rodriguez', type:'text' },
 { label:'Email', key:'email', placeholder:'student@email.com', type:'email' },
 { label:'Grade', key:'grade', placeholder:'e.g. 5', type:'number' },
 ].map(f => (
 <div key={f.key} style={ f.key==='name' ? { gridColumn:'1/-1'} : {}}>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>{f.label}</div>
 <input
 type={f.type}
 value={newStudent[f.key]}
 onChange={e => setNewStudent(p => ({...p, [f.key]: e.target.value}))}
 placeholder={f.placeholder}
 style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }}
 />
 </div>
 ))}
 <div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>Instrument</div>
 <select
 value={newStudent.instrument}
 onChange={e => setNewStudent(p => ({...p, instrument: e.target.value}))}
 style={{ width:'100%', background:'#1a2438', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }}
 >
 {INSTRUMENTS.map(i =><option key={i}>{i}</option>)}
 </select>
 </div>
 </div>
 <div style={{ display:'flex', gap:8 }}>
 <button onClick={() => setShowAddStudent(false)} style={{ flex:1, padding:'9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#9ca3af', fontSize:12, fontWeight:600, cursor:'pointer' }}>Cancel</button>
 <button onClick={() => setShowAddStudent(false)} style={{ flex:1, padding:'9px', borderRadius:8, border:'none', background:'#7c3aed', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Add Student</button>
 </div>
 </div>
 </div>
 )}

 {/* ¢¢ CREATE ASSIGNMENT MODAL ¢¢ */}
 {showCreateAssignment && (
 <div style={overlayStyle} onClick={() => setShowCreateAssignment(false)}>
 <div style={modalStyle} onClick={e => e.stopPropagation()}>
 <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:16 }}>° Create Assignment</div>
 <div style={{ marginBottom:10 }}>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>Title</div>
 <input value={newAssignment.title} onChange={e => setNewAssignment(p => ({...p, title:e.target.value}))} placeholder="e.g. Practice C Major Scale" style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }} />
 </div>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:12, marginBottom:10 }}>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>Assign To</div>
 <select value={newAssignment.assignTo} onChange={e => setNewAssignment(p => ({...p, assignTo:e.target.value}))} style={{ width:'100%', background:'#1a2438', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }}>
 <option value="all">All Students (24)</option>
 <option value="critical">Critical Only (3)</option>
 <option value="atrisk">At Risk (5)</option>
 <option value="individual">Individual Student...</option>
 </select>
 </div>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>Due Date</div>
 <input type="date" value={newAssignment.dueDate} onChange={e => setNewAssignment(p => ({...p, dueDate:e.target.value}))} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none', colorScheme:'dark' }} />
 </div>
 </div>
 <div style={{ marginBottom:16 }}>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>Notes / Instructions</div>
 <textarea value={newAssignment.notes} onChange={e => setNewAssignment(p => ({...p, notes:e.target.value}))} placeholder="Optional instructions..." rows={3} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none', resize:'vertical' }} />
 </div>
 <div style={{ display:'flex', gap:8 }}>
 <button onClick={() => setShowCreateAssignment(false)} style={{ flex:1, padding:'9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#9ca3af', fontSize:12, fontWeight:600, cursor:'pointer' }}>Cancel</button>
 <button onClick={handleCreateAssignment} disabled={assignmentSaving} style={{ flex:1, padding:'9px', borderRadius:8, border:'none', background:'linear-gradient(90deg,#7c3aed,#2dd4bf)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', opacity: assignmentSaving ? 0.6 : 1 }}>{assignmentSaving ? 'Saving…' : 'Create Assignment'}</button>
 </div>
 </div>
 </div>
 )}

 {/* ¢¢ MESSAGE CLASS PANEL ¢¢ */}
 {showMessagePanel && (
 <>
 <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:400, animation:'fadeIn .2s ease' }} onClick={() => setShowMessagePanel(false)} />
 <div style={{ position:'fixed', top:0, right:0, bottom:0, width:380, background:'#131c2e', borderLeft:'1px solid rgba(255,255,255,0.1)', zIndex:500, display:'flex', flexDirection:'column', animation:'slideIn .25s ease' }}>
 <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
 <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>°¬ Message Class</div>
 <div onClick={() => setShowMessagePanel(false)} style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14, color:'#9ca3af' }}>¢</div>
 </div>
 <div style={{ flex:1, padding:20, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:5 }}>Send To</div>
 <select value={message.to} onChange={e => setMessage(p => ({...p, to:e.target.value}))} style={{ width:'100%', background:'#1a2438', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }}>
 <option value="all">All Students (24)</option>
 <option value="critical">Critical Only (3)</option>
 <option value="atrisk">At Risk (5)</option>
 <option value="watch">Watch List (7)</option>
 <option value="individual">Individual Student...</option>
 </select>
 </div>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:5 }}>Subject</div>
 <input value={message.subject} onChange={e => setMessage(p => ({...p, subject:e.target.value}))} placeholder="e.g. Practice reminder this week" style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }} />
 </div>
 <div>
 <div style={{ fontSize:10, color:'#6b7280', marginBottom:5 }}>Message</div>
 <textarea value={message.body} onChange={e => setMessage(p => ({...p, body:e.target.value}))} placeholder="Write your message here..." rows={8} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none', resize:'vertical' }} />
 </div>
 </div>
 <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
 {messageSent ? (
 <div style={{ textAlign:'center', padding:'10px', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:9, color:'#34d399', fontWeight:700, fontSize:13 }}>¢ Message Sent!</div>
 ) : (
 <button onClick={handleSendMessage} style={{ width:'100%', padding:'10px', borderRadius:9, border:'none', background:'linear-gradient(90deg,#2dd4bf,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Send Message</button>
 )}
 </div>
 </div>
 </>
 )}

 {/* ¢¢ HEADER ¢¢ */}
 <div style={{ background:'#0d1525', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'8px 20px', display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, zIndex:200, flexWrap:'wrap' }}>
 <div style={{ color:'#9ca3af', cursor:'pointer', fontSize:16 }} onClick={() => navigate(-1)}>¢</div>
 <div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid rgba(251,191,36,0.55)', boxShadow:'0 0 12px rgba(251,191,36,0.25)', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', flexShrink:0 }}>JM</div>
 <div>
 <div style={{ fontSize:14, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
 Prof. J. Motes
 <span style={{ fontSize:9, fontWeight:600, background:'rgba(251,191,36,0.15)', color:'#fbbf24', padding:'2px 7px', borderRadius:4 }}>TEACH</span>
 </div>
 <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>Piano &amp; Theory · {counts.all} Students</div>
 </div>
 <div style={{ flex:1 }} />
 <div onClick={() => navigate('/teacher-tami')} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px 5px 5px', borderRadius:999, background:'rgba(42,28,18,0.85)', border:'1.5px solid rgba(180,100,50,0.6)', cursor:'pointer' }}>
 <img src={tamiImg} alt="TAMi" style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }} />
 <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 5px #22c55e', animation:'livePulse 2s infinite', flexShrink:0 }} />
 <span style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>T.A.M.i Dash</span>
 </div>
 <div style={{ width:32, height:32, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, cursor:'pointer', position:'relative' }}>
 °
 <div style={{ position:'absolute', top:5, right:5, width:7, height:7, background:'#ef4444', borderRadius:'50%', border:'1.5px solid #0d1525' }} />
 </div>
 </div>

 {/* ¢¢ PAGE ¢¢ */}
 <div style={{ padding:20, maxWidth: mob ? '100%' : 1400, margin:'0 auto' }}>

 {/* 1. COMPACT STAT BAR */}
 <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(45,212,191,0.06))', border:'1px solid rgba(124,58,237,0.18)', borderRadius:12, padding:'12px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', animation:'fu .3s ease both' }}>
 <div>
 <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Good evening, Prof. Motes °¹</div>
 <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>Next: <span style={{ color:'#2dd4bf', fontWeight:600 }}>Emma Rodriguez · 4:00 PM</span></div>
 </div>
 <div style={{ width:1, height:36, background:'rgba(255,255,255,0.08)', flexShrink:0 }} />
 <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
 {[
 { num:counts.all, label:'Students', color:'#a78bfa' },
 { num:avgPractice+'m', label:'Avg/Wk', color:'#2dd4bf' },
 { num:'72%', label:'HW Done', color:'#34d399' },
 { num:counts.critical, label:'Attention', color:'#fbbf24' },
 { num:avgDPM+'%', label:'Avg DPM', color:'#f87171' },
 ].map((q, i) => (
 <div key={i} style={{ textAlign:'center' }}>
 <div style={{ fontSize: mob ? 16 : 20, fontWeight:800, lineHeight:1, color:q.color }}>{q.num}</div>
 <div style={{ fontSize:9, color:'#6b7280', marginTop:2 }}>{q.label}</div>
 </div>
 ))}
 </div>
 <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
 <button className="quick-btn" onClick={() => navigate('/student')} style={{ padding:'7px 14px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', background:'rgba(45,212,191,0.12)', color:'#2dd4bf', border:'1px solid rgba(45,212,191,0.2)' }}>° Student View</button>
 <button className="quick-btn" onClick={() => navigate('/teacher?mode=academic')} style={{ padding:'7px 14px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.06)', color:'#a0aec0', border:'1px solid rgba(255,255,255,0.08)' }}>° Academic</button>
 <button className="quick-btn" onClick={() => navigate('/game')} style={{ padding:'7px 14px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', background:'#7c3aed', color:'#fff', border:'none' }}>°® Game Mode</button>
 <button className="quick-btn" onClick={() => navigate('/practice-live')} style={{ padding:'7px 14px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg, #e84b8a, #f97316)', color:'#fff', border:'none' }}>&#9679; Practice Live</button>
 </div>
 </div>

 {/* ¢¢ Small Coach Card ¢¢ */}
 <div onClick={() => navigate('/my-coach')} style={{ display:'flex',alignItems:'center',gap:14, background:'linear-gradient(135deg,rgba(30,20,10,.92),rgba(45,28,14,.88))', border:'1.5px solid rgba(249,115,22,.25)', borderRadius:14,padding:'14px 20px', maxWidth:360,cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,.3),0 0 12px rgba(249,115,22,.06)', marginBottom:16 }}>
 <img src="/Motesart Avatar 1.PNG" alt="Motesart" style={{ width:44, height:44, minWidth:44, borderRadius:'50%', objectFit:'cover' }} />
 <div style={{ flex:1,minWidth:0 }}>
 <div style={{ display:'flex',alignItems:'center',gap:6 }}>
 <span style={{ color:'#fff',fontSize:15,fontWeight:800 }}>Motesart</span>
 <span style={{ width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px rgba(34,197,94,.4)',display:'inline-block' }}/>
 <span style={{ color:'#4ade80',fontSize:10,fontWeight:600 }}>Active</span>
 </div>
 <div style={{ color:'#9ca3af',fontSize:11,marginTop:1 }}>Piano · Voice · Ear Training</div>
 </div>
 <div style={{ padding:'8px 14px',borderRadius:9,background:'linear-gradient(135deg,#f97316,#ea580c)',color:'#fff',fontSize:11,fontWeight:800,letterSpacing:'.5px',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(249,115,22,.3)' }}>OPEN</div>
 </div>


 {/* 2. QUICK ACTIONS */}
 <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16, animation:'fu .3s ease .05s both' }}>
 <button className="quick-btn" onClick={() => setShowAddStudent(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'#131c2e', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}><span style={{ fontSize:16 }}>¢</span>Add Student</button>
 <button className="quick-btn" onClick={() => setShowCreateAssignment(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'#131c2e', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}><span style={{ fontSize:16 }}>°</span>Create Assignment</button>
 <button className="quick-btn" style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'#131c2e', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}><span style={{ fontSize:16 }}>°</span>Today's Schedule</button>
 <button className="quick-btn" style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'#131c2e', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}><span style={{ fontSize:16 }}>°</span>Generate Report</button>
 <button className="quick-btn" onClick={() => setShowMessagePanel(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(234,179,8,0.3)', background:'rgba(234,179,8,0.08)', color:'#fbbf24', fontSize:12, fontWeight:600, cursor:'pointer' }}><span style={{ fontSize:16 }}>°¬</span>Message Class</button>
 <button className="quick-btn" onClick={() => window.open('https://motesart-converter.netlify.app', '_blank')} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(6,182,212,0.3)', background:'rgba(6,182,212,0.08)', color:'#06b6d4', fontSize:12, fontWeight:600, cursor:'pointer' }}><span style={{ fontSize:16 }}>°µ</span>Converter</button>
 </div>

 {/* 3. COLLAPSIBLE STUDENT ROSTER */}
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden', marginBottom:16, animation:'fu .3s ease .1s both' }}>
 <div onClick={() => setRosterOpen(o => !o)} style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', borderBottom: rosterOpen ? '1px solid rgba(255,255,255,0.06)' : 'none', background:'rgba(255,255,255,0.02)', flexWrap:'wrap' }}>
 <span style={{ fontSize:15, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
 ° Student Roster
 <span style={{ fontSize:11, fontWeight:600, color:'#9ca3af', background:'rgba(255,255,255,0.06)', padding:'2px 8px', borderRadius:10 }}>{counts.all} students</span>
 <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(220,38,38,0.15)', color:'#f87171', border:'1px solid rgba(220,38,38,0.2)' }}>¢  {counts.critical} Critical</span>
 <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(217,119,6,0.15)', color:'#fb923c', border:'1px solid rgba(217,119,6,0.2)' }}>° {counts.atrisk} At Risk</span>
 </span>
 <input value={search} onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()} placeholder="° Search..." style={{ width:160, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'5px 10px', color:'#fff', fontSize:11, outline:'none' }} />
 <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
 {[
 { key:'all', label:'All', ac:'#7c3aed' },
 { key:'critical', label:'°´', ac:'rgba(220,38,38,0.5)', tc:'#f87171' },
 { key:'atrisk', label:'° ', ac:'rgba(217,119,6,0.5)', tc:'#fb923c' },
 { key:'watch', label:'°¡', ac:'rgba(161,98,7,0.5)', tc:'#facc15' },
 { key:'ontrack', label:'°¢', ac:'rgba(6,95,70,0.5)', tc:'#34d399' },
 ].map(f => (
 <div key={f.key} onClick={() => { setFilter(f.key); setShowAll(false) }} style={{ padding:'4px 10px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background: filter===f.key ? f.ac : 'rgba(255,255,255,0.04)', color: filter===f.key ? '#fff' : (f.tc||'#9ca3af'), fontSize:10, fontWeight:600, cursor:'pointer' }}>{f.label}</div>
 ))}
 </div>
 <span style={{ fontSize:16, color:'#6b7280', marginLeft:'auto', transition:'transform .3s', transform: rosterOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display:'inline-block' }}>¢¾</span>
 </div>

 <div className={`roster-body${rosterOpen ? '' : ' collapsed'}`}>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '2.5fr 1fr 1fr 1fr 1fr 100px', padding:'8px 16px', fontSize:10, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, background:'rgba(255,255,255,0.01)' }}>
 <div>Student</div><div>DPM</div><div>Practice</div><div>Homework</div><div>Status</div><div>Actions</div>
 </div>
 {displayed.map(s => (
 <div key={s.id} className="row-hover" style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '2.5fr 1fr 1fr 1fr 1fr 100px', padding:'10px 16px', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
 <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', background:s.avBg, flexShrink:0 }}>{s.initials}</div>
 <div>
 <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{s.name}</div>
 <div style={{ fontSize:10, color:'#6b7280' }}>{s.instrument} · Grade {s.grade}</div>
 </div>
 </div>
 <div style={{ fontSize:13, fontWeight:700, color:s.dpmColor }}>{s.dpm}%</div>
 <div style={{ fontSize:12, color:'#9ca3af' }}>{s.weeklyMin} / {s.goalMin} min</div>
 <div style={{ fontSize:12, color:'#9ca3af' }}>{s.hw}</div>
 <div><span style={{ padding:'3px 9px', borderRadius:6, fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', gap:3, ...STATUS_STYLES[s.status] }}>{s.statusLabel}</span></div>
 <div style={{ display:'flex', gap:5 }}>
 {['°','°¬','¢'].map((icon, i) => (
 <button key={i} onClick={() => i===1 && setShowMessagePanel(true)} style={{ width:28, height:28, borderRadius:6, border:'none', background:'rgba(255,255,255,0.06)', color:'#9ca3af', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</button>
 ))}
 </div>
 </div>
 ))}
 {filtered.length > 6 && (
 <div style={{ padding:'10px 16px', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
 <button onClick={() => setShowAll(v => !v)} style={{ padding:'7px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#9ca3af', fontSize:11, fontWeight:600, cursor:'pointer' }}>
 {showAll ? 'Show less ¢´' : `Show all ${filtered.length} students ¢¾`}
 </button>
 </div>
 )}
 </div>
 </div>

 {/* 4. SCHEDULE + HOMEWORK */}
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:14, marginBottom:14, animation:'fu .3s ease .15s both' }}>
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden' }}>
 <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:13, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
 ° Today's Schedule <span style={{ fontSize:10, color:'#6b7280' }}>5 lessons</span>
 </div>
 {SCHEDULE.map((s, i) => {
 const isLive = s.status === 'live'
 const isDone = s.status === 'done'
 return (
 <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', borderBottom: i < SCHEDULE.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', opacity: isDone ? 0.45 : 1, background: isLive ? 'rgba(34,197,94,0.06)' : 'transparent', borderLeft: isLive ? '3px solid #22c55e' : '3px solid transparent' }}>
 <div style={{ fontSize:11, fontWeight:700, color: isLive ? '#34d399' : '#6b7280', minWidth:55 }}>{s.time}</div>
 <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: isLive ? '#34d399' : isDone ? 'rgba(255,255,255,0.15)' : '#6b7280', boxShadow: isLive ? '0 0 8px rgba(52,211,153,0.6)' : 'none', animation: isLive ? 'livePulse 2s infinite' : 'none' }} />
 <div style={{ flex:1 }}>
 <div style={{ fontSize:12, fontWeight:600, color: isDone ? '#9ca3af' : '#fff' }}>{s.name}</div>
 <div style={{ fontSize:10, color:'#6b7280' }}>{s.inst}</div>
 </div>
 <span style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:4, background: isLive ? 'rgba(34,197,94,0.2)' : isDone ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)', color: isLive ? '#34d399' : isDone ? '#4b5563' : '#9ca3af', border: isLive ? '1px solid rgba(34,197,94,0.3)' : 'none' }}>
 {isLive ? '¢ Live' : isDone ? 'Done' : s.status === 'next' ? 'Next' : s.time.split(' ')[0]}
 </span>
 </div>
 )
 })}
 </div>

 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden' }}>
 <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:13, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
 ° Homework Tracker <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(220,38,38,0.15)', color:'#f87171' }}>4 Overdue</span>
 </div>
 <div style={{ padding:'14px 16px' }}>
 <div style={{ display:'flex', gap:8, marginBottom:14 }}>
 {[
 { num:12, label:'Assigned', color:'#a78bfa', bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.05)' },
 { num:8, label:'Submitted', color:'#2dd4bf', bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.05)' },
 { num:5, label:'Graded', color:'#34d399', bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.05)' },
 { num:4, label:'Overdue', color:'#f87171', bg:'rgba(220,38,38,0.08)', border:'rgba(220,38,38,0.2)' },
 ].map((h, i) => (
 <div key={i} style={{ flex:1, textAlign:'center', background:h.bg, border:`1px solid ${h.border}`, borderRadius:10, padding:'10px 6px' }}>
 <div style={{ fontSize: mob ? 16 : 20, fontWeight:800, lineHeight:1, marginBottom:3, color:h.color }}>{h.num}</div>
 <div style={{ fontSize:9, color: h.label==='Overdue' ? '#f87171' : '#6b7280', fontWeight:500, textTransform:'uppercase', letterSpacing:0.3 }}>{h.label}</div>
 </div>
 ))}
 </div>
 {[
 { label:'Submitted', pct:67, grad:'linear-gradient(90deg,#7c3aed,#2dd4bf)' },
 { label:'Graded', pct:42, grad:'linear-gradient(90deg,#7c3aed,#a78bfa)' },
 { label:'Overdue', pct:33, grad:'linear-gradient(90deg,#dc2626,#f87171)' },
 ].map((b, i) => (
 <div key={i} style={{ marginBottom:10 }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#9ca3af', marginBottom:4 }}><span>{b.label}</span><span>{b.pct}%</span></div>
 <div style={{ height:7, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
 <div style={{ height:'100%', borderRadius:4, width:`${b.pct}%`, background:b.grad }} />
 </div>
 </div>
 ))}
 <div style={{ marginTop:12, fontSize:11, color:'#6b7280', padding:'7px 10px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:'1px solid rgba(255,255,255,0.04)' }}>
 ¢¡ <span style={{ color:'#fbbf24' }}>4 overdue</span> assignments need follow-up
 </div>
 </div>
 </div>
 </div>

 {/* 5. DPM HEALTH + RISK BREAKDOWN */}
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:14, animation:'fu .3s ease .2s both' }}>
 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:14 }}>°¯ Class DPM Health</div>
 <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
 <div style={{ position:'relative', width:130, height:130, flexShrink:0 }}>
 <svg width="130" height="130" style={{ transform:'rotate(-90deg)' }}>
 <defs>
 <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#2dd4bf"/>
 </linearGradient>
 </defs>
 <circle cx="65" cy="65" r="55" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
 <circle cx="65" cy="65" r="55" fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={2*Math.PI*55} strokeDashoffset={2*Math.PI*55-(2*Math.PI*55*avgDPM/100)}/>
 </svg>
 <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
 <div style={{ fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>{avgDPM}</div>
 <div style={{ fontSize:9, color:'#9ca3af', marginTop:1 }}>Class DPM</div>
 </div>
 </div>
 <div style={{ flex:1, minWidth:120 }}>
 {[
 { label:'Drive', val:'68%', color:'#a78bfa', pct:68 },
 { label:'Passion', val:'74%', color:'#2dd4bf', pct:74 },
 { label:'Motivation', val:'71%', color:'#fbbf24', pct:71 },
 ].map((p, i) => (
 <div key={i} style={{ marginBottom:10 }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
 <span style={{ color:'#9ca3af' }}>{p.label}</span>
 <span style={{ fontWeight:700, color:p.color }}>{p.val}</span>
 </div>
 <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
 <div style={{ height:'100%', width:`${p.pct}%`, background:p.color, borderRadius:3 }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div style={{ background:'#131c2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
 <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:14 }}>° Risk Breakdown</div>
 <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:10 }}>
 {[
 { key:'critical', num:counts.critical, label:'¢  Critical', color:'#f87171', bg:'rgba(220,38,38,0.1)', border:'rgba(220,38,38,0.25)' },
 { key:'atrisk', num:counts.atrisk, label:'° At Risk', color:'#fb923c', bg:'rgba(217,119,6,0.1)', border:'rgba(217,119,6,0.25)' },
 { key:'watch', num:counts.watch, label:'° Watch', color:'#facc15', bg:'rgba(161,98,7,0.1)', border:'rgba(161,98,7,0.25)' },
 { key:'ontrack', num:counts.ontrack, label:'¢ On Track', color:'#34d399', bg:'rgba(6,95,70,0.1)', border:'rgba(6,95,70,0.25)' },
 ].map(r => (
 <div key={r.key} onClick={() => { setFilter(r.key); setRosterOpen(true); setShowAll(false) }} style={{ background:r.bg, border:`1px solid ${r.border}`, borderRadius:10, padding:'14px', textAlign:'center', cursor:'pointer' }}>
 <div style={{ fontSize:26, fontWeight:900, color:r.color }}>{r.num}</div>
 <div style={{ fontSize:10, color:r.color, fontWeight:600, marginTop:2 }}>{r.label}</div>
 </div>
 ))}
 </div>
 <div style={{ marginTop:10, fontSize:10, color:'#6b7280', textAlign:'center' }}>Click any tile to filter roster ¢</div>
 </div>
 </div>

 </div>
 </div>
 )
}
