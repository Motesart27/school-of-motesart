import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsMobile from '../hooks/useIsMobile.js'

const leaders = [
  { rank:1, name:'Renee', level:8, streak:14, points:'12,840', badge:'👑 Ambassador', badgeBg:'linear-gradient(135deg,#a855f7,#ec4899)', av:'R', avBg:'linear-gradient(135deg,#a855f7,#ec4899)' },
  { rank:2, name:'Alex', level:7, streak:11, points:'11,200', badge:'⭐ Rising Star', badgeBg:'linear-gradient(135deg,#eab308,#f97316)', av:'A', avBg:'#374151' },
  { rank:3, name:'Luke', level:6, streak:8, points:'9,750', badge:'⭐ Rising Star', badgeBg:'linear-gradient(135deg,#eab308,#f97316)', av:'L', avBg:'#374151' },
  { rank:4, name:'Motesart', level:5, streak:6, points:'8,450', badge:'⭐ Rising Star', badgeBg:'linear-gradient(135deg,#eab308,#f97316)', av:'M', avBg:'linear-gradient(135deg,#14b8a6,#06b6d4)', me:true },
  { rank:5, name:'Sam', level:5, streak:3, points:'7,200', badge:'⭐ Rising Star', badgeBg:'linear-gradient(135deg,#eab308,#f97316)', av:'S', avBg:'#374151' },
  { rank:6, name:'Jordan', level:4, streak:2, points:'5,880', av:'J', avBg:'#374151' },
  { rank:7, name:'Taylor', level:3, streak:1, points:'3,420', av:'T', avBg:'#374151' },
  { rank:8, name:'Charlie', level:3, streak:0, points:'2,100', av:'C', avBg:'#374151' },
  { rank:9, name:'Maria', level:2, streak:0, points:'1,650', av:'M', avBg:'#374151' },
  { rank:10, name:'Devon', level:1, streak:0, points:'820', av:'D', avBg:'#374151' },
]

export default function Leaderboard() {
  const mob = useIsMobile()
  const navigate = useNavigate()
  const [timeFilter, setTimeFilter] = useState('All Time')
  const [scopeFilter, setScopeFilter] = useState('Global')

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#111827,#111827,#1f2937)', color:'#fff', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom:'1px solid #1f2937', position:'sticky', top:0, background:'rgba(17,24,39,.9)', backdropFilter:'blur(12px)', zIndex:10, padding:16 }}>
        <div style={{ maxWidth:896, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => navigate(-1)} style={{ padding:8, background:'none', border:'none', cursor:'pointer', borderRadius:8, display:'flex', alignItems:'center' }}>
              <svg width="20" height="20" fill="none" stroke="#9ca3af" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <div style={{ fontSize:18, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>🏆 TAMi Ambassadors</div>
              <div style={{ fontSize:13, color:'#9ca3af' }}>Top performers in musical mastery</div>
            </div>
          </div>
          <button onClick={() => navigate('/game')} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#0d9488,#0891b2)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>🎮 Play Game</button>
        </div>
      </div>

      <div style={{ maxWidth:896, margin:'0 auto', padding:'24px 16px' }}>
        {/* User Card */}
        <div style={{ marginBottom:24, padding:16, background:'linear-gradient(135deg,rgba(19,78,74,.4),rgba(22,78,99,.4))', border:'1px solid rgba(20,184,166,.3)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#14b8a6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: mob ? 17 : 22, fontWeight:700, border:'2px solid rgba(20,184,166,.5)' }}>M</div>
            <div><div style={{ fontSize:18, fontWeight:700 }}>Motesart</div><div style={{ fontSize:13, color:'#5eead4' }}>Your Position</div></div>
          </div>
          <div><div style={{ fontSize:30, fontWeight:700, textAlign:'right' }}>#4</div><div style={{ fontSize:13, color:'#9ca3af' }}>8,450 pts</div></div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
          <div style={{ display:'flex', background:'rgba(31,41,55,.5)', borderRadius:8, padding:4, border:'1px solid rgba(55,65,81,.5)' }}>
            {['This Week','This Month','All Time'].map(t => (
              <button key={t} onClick={() => setTimeFilter(t)} style={{ padding:'6px 12px', fontSize:13, fontWeight:600, border:'none', borderRadius:6, cursor:'pointer', color: timeFilter===t ? '#fff' : '#9ca3af', background: timeFilter===t ? '#0d9488' : 'transparent' }}>{t}</button>
            ))}
          </div>
          <div style={{ display:'flex', background:'rgba(31,41,55,.5)', borderRadius:8, padding:4, border:'1px solid rgba(55,65,81,.5)' }}>
            {['Global','My School','My Class'].map(s => (
              <button key={s} onClick={() => setScopeFilter(s)} style={{ padding:'6px 12px', fontSize:13, fontWeight:600, border:'none', borderRadius:6, cursor:'pointer', color: scopeFilter===s ? '#fff' : '#9ca3af', background: scopeFilter===s ? '#9333ea' : 'transparent' }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background:'rgba(31,41,55,.5)', backdropFilter:'blur(8px)', borderRadius:16, border:'1px solid rgba(55,65,81,.5)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 80px 80px 100px', gap:8, padding:'12px 16px', background:'rgba(55,65,81,.3)', borderBottom:'1px solid rgba(55,65,81,.5)', fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.05em' }}>
            <div style={{ textAlign:'center' }}>Rank</div><div>Player</div><div style={{ textAlign:'center' }}>Level</div><div style={{ textAlign:'center' }}>Streak</div><div style={{ textAlign:'right' }}>Points</div>
          </div>
          {leaders.map(p => (
            <div key={p.rank} style={{ display:'grid', gridTemplateColumns:'60px 1fr 80px 80px 100px', gap:8, padding:'12px 16px', alignItems:'center', borderBottom:'1px solid rgba(55,65,81,.15)', background: p.me ? 'rgba(19,78,74,.2)' : p.rank<=3 ? 'linear-gradient(90deg,rgba(55,65,81,.2),transparent)' : 'transparent' }}>
              <div style={{ textAlign:'center' }}>
                {p.rank <= 3 ? (
                  <span style={{ width:32, height:32, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:16, background: p.rank===1 ? 'rgba(234,179,8,.2)' : p.rank===2 ? 'rgba(156,163,175,.2)' : 'rgba(180,83,9,.2)' }}>👑</span>
                ) : <span style={{ color:'#9ca3af', fontWeight:600 }}>{p.rank}</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, background:p.avBg, color: p.me ? '#fff' : '#d1d5db', flexShrink:0 }}>{p.av}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color: p.me ? '#5eead4' : '#fff' }}>{p.name}{p.me && <span style={{ fontSize:11, color:'#9ca3af', marginLeft:4 }}>(You)</span>}</div>
                  {p.badge && <span style={{ display:'inline-block', padding:'2px 8px', fontSize:10, fontWeight:600, color:'#fff', borderRadius:9999, marginTop:2, background:p.badgeBg }}>{p.badge}</span>}
                </div>
              </div>
              <div style={{ textAlign:'center' }}><span style={{ display:'inline-block', padding:'4px 10px', background:'rgba(147,51,234,.2)', color:'#c084fc', borderRadius:8, fontSize:13, fontWeight:600 }}>Lv.{p.level}</span></div>
              <div style={{ fontSize:13, fontWeight:600, textAlign:'center', color: p.streak >= 5 ? '#fb923c' : '#9ca3af' }}>{p.streak >= 5 ? '🔥 ' : ''}{p.streak}</div>
              <div style={{ fontSize:16, fontWeight:700, textAlign:'right', background:'linear-gradient(135deg,#c084fc,#f472b6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{p.points}</div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div style={{ marginTop:24, display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
          <button onClick={() => navigate('/student')} style={{ padding:'10px 24px', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg,#9333ea,#ec4899)', color:'#fff' }}>📊 View Dashboard</button>
          <button onClick={() => navigate('/game')} style={{ padding:'10px 24px', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg,#0d9488,#0891b2)', color:'#fff' }}>🎮 Play Now</button>
        </div>
      </div>
    </div>
  )
}
