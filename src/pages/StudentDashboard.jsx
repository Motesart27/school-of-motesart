import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Flat nav items with SVG icons
const NAV_ITEMS = [
  { key: 'Home', icon: 'home' },
  { key: 'Practice Live', icon: 'practicelive' },
  { key: 'Homework', icon: 'homework', badge: 3 },
  { key: 'Games', icon: 'games' },
  { key: 'Practice Log', icon: 'practicelog' },
  { key: 'My Progress', icon: 'progress' },
  { key: 'My Music', icon: 'music' },
  { key: 'Community', icon: 'community' },
]

const NAV_ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  practicelive: 'M15.536 8.464a5 5 0 010 7.072M12 18.364a8 8 0 000-12.728M8.464 8.464a5 5 0 000 7.072M12 12v.01',
  homework: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  games: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  practicelog: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  progress: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  music: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z',
  community: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
}

// Routes for nav items that have existing pages
const NAV_ROUTES = {
  'Homework': '/homework',
  'Practice Live': '/practice-live',
  'Games': '/games',
  'Practice Log': '/practice-log',
  'Settings': '/settings',
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('academic')
  const [activeItem, setActiveItem] = useState('Home')
  const [showTamiChat, setShowTamiChat] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const userName = user?.name || user?.email?.split('@')[0] || 'Student'
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'S'

  // Inject Google Fonts
  useEffect(() => {
    if (!document.querySelector('link[href*="Outfit"]')) {
      const link = document.createElement('link')
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const handleNavItem = (item) => {
    setActiveItem(item)
    if (item === 'Home') { setMode('academic'); navigate('/student'); return }
    if (NAV_ROUTES[item]) navigate(NAV_ROUTES[item])
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ===== LEFT SIDEBAR ===== */}
      <div style={{ width: isCollapsed ? 50 : 220, minWidth: isCollapsed ? 50 : 220, background: 'rgba(15,12,41,0.95)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', transition: 'width 0.25s ease, min-width 0.25s ease' }}>

        {/* Sidebar Header + Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: isCollapsed ? '12px 0' : '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', transition: 'opacity 0.2s ease, width 0.2s ease' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
              <img src="/Motesart Avatar 1.PNG" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, color: '#14b8a6', whiteSpace: 'nowrap' }}>School of Motesart</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(20,184,166,0.35)',
              background: 'rgba(20,184,166,0.08)', color: '#14b8a6', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,184,166,0.18)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,184,166,0.08)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.35)' }}
          >{isCollapsed ? '\u203A' : '\u2039'}</button>
        </div>

        {/* Identity Strip */}
        {isCollapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#14b8a6', background: 'rgba(20,184,166,0.08)' }}>{initials}</div>
          </div>
        ) : (
          <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 600, color: '#fff' }}>{userName}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#14b8a6', marginTop: 2 }}>Student</div>
            
          </div>
        )}

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => handleNavItem(item.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  background: activeItem === item.key ? 'rgba(20,184,166,0.12)' : 'none',
                  border: 'none',
                  borderLeft: activeItem === item.key ? '3px solid #14b8a6' : '3px solid transparent',
                  color: activeItem === item.key ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: 14, fontWeight: activeItem === item.key ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width={20} height={20} fill='none' stroke='currentColor' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round' viewBox='0 0 24 24'>
                  <path d={NAV_ICONS[item.icon]} />
                </svg>
                <span style={{ flex: 1 }}>{item.key}</span>
                {item.badge && (
                  <span style={{
                    background: '#14b8a6', color: '#fff', fontSize: 10, fontWeight: 700,
                    borderRadius: '50%', width: 20, height: 20,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div style={{ margin: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Quick Links */}
          <div style={{ padding: '8px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>QUICK LINKS</div>
            <button
              onClick={() => navigate('/practice-live')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)',
                borderRadius: 8, color: '#14b8a6', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 6,
              }}
            >
              <svg width={16} height={16} fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'><path d='M13 10V3L4 14h7v7l9-11h-7z' /></svg>
              Start Practice
            </button>
            <button
              onClick={() => navigate('/my-coach')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 8, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#8b5cf6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>M</span>
              My Coach — Motesart
            </button>
          </div>

          {/* Help Center */}
          <button
            onClick={() => {}}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              fontSize: 13, fontWeight: 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <svg width={18} height={18} fill='none' stroke='currentColor' strokeWidth={1.5} viewBox='0 0 24 24'><path d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
            Help Center
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              fontSize: 13, fontWeight: 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              marginBottom: 12,
            }}
          >
            <svg width={18} height={18} fill='none' stroke='currentColor' strokeWidth={1.5} viewBox='0 0 24 24'><path d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' /><path d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
            Settings
          </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div style={{ flex: 1, position: 'relative', overflowY: 'auto', height: '100vh' }}>

        {/* Top Bar */}
        <div style={{
          padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0,
          background: 'rgba(15,12,41,0.92)', backdropFilter: 'blur(12px)', zIndex: 10,
        }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 600 }}>
            {greeting}, {userName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Academic/Game Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={() => setMode('academic')} style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                color: mode === 'academic' ? '#fff' : 'rgba(255,255,255,0.45)',
                background: mode === 'academic' ? '#14b8a6' : 'transparent',
              }}>Academic</button>
              <button onClick={() => setMode('game')} style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                color: mode === 'game' ? '#fff' : 'rgba(255,255,255,0.45)',
                background: mode === 'game' ? '#14b8a6' : 'transparent',
              }}>Game</button>
            </div>
            {/* Notification Bell */}
            <div style={{ position: 'relative', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.6)' }}>
              <svg width={20} height={20} fill='none' stroke='currentColor' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round' viewBox='0 0 24 24'>
                <path d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
              </svg>
              <div style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid rgba(15,12,41,1)' }} />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ padding: '20px 24px', maxWidth: 920, margin: '0 auto' }}>
          {mode === 'academic' ? (
            <HomeDashboard navigate={navigate} userName={userName} />
          ) : (
            <GameView navigate={navigate} />
          )}
        </div>

        {/* ===== TAMi Floating Bubble + Chat ===== */}
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, display: 'none', flexDirection: 'column', alignItems: 'flex-end' }}>

          {/* Chat Panel */}
          {showTamiChat && (
            <div style={{
              width: 320, height: 420, background: 'rgba(15,12,41,0.98)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, marginBottom: 10,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)',
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px', background: 'linear-gradient(135deg, #ff6b35, #e91e8c)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  <img src="/tami-avatar.png" alt="TAMi" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>T.A.M.i</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>A.I. Teaching Assistant</div>
                </div>
                <button onClick={() => setShowTamiChat(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#e84b8a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>T.A.M.i</div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', maxWidth: '85%', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
                    Hey {userName}! 👋 Welcome back to Motes-Art! Ready to make some music magic today?
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <button style={{ padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>How am I doing?</button>
                  <button style={{ padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>Help me understand my dashboard</button>
                </div>
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="Ask T.A.M.i anything..." style={{ flex: 1, padding: '8px 14px', borderRadius: 20, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                <button onClick={() => navigate('/tami')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#e84b8a,#f97316)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
              </div>
            </div>
          )}

          {/* TAMi Avatar Circle */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowTamiChat(!showTamiChat)}
              style={{
                width: 52, height: 52, borderRadius: '50%', border: '2.5px solid rgba(249,115,22,0.6)',
                overflow: 'hidden', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(232,75,138,0.3), 0 0 12px rgba(249,115,22,0.15)',
                background: 'linear-gradient(135deg,rgba(232,75,138,0.2),rgba(249,115,22,0.2))',
              }}
            >
              <img src="/tami-avatar.png" alt="T.A.M.i" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid rgba(15,12,41,1)', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
          </div>
        </div>

      </div>
    </div>
  )
}

/* ===== HOME DASHBOARD (Academic Mode) ===== */
function HomeDashboard({ navigate, userName }) {
  const [dpmVisible, setDpmVisible] = useState(false)
  const dpmRef = useRef(null)

  const triggerDpm = useCallback(() => {
    setDpmVisible(false)
    setTimeout(() => setDpmVisible(true), 50)
  }, [])

  useEffect(() => {
    const node = dpmRef.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) triggerDpm() }, { threshold: 0.3 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [triggerDpm])
  // DPM donut calculations
  const C = 2 * Math.PI * 42
  const drive = 1, passion = 27, motivation = 0, overall = 9
  const dA = (drive / 100) * C
  const pA = (passion / 100) * C

  // Sparkline - highlight today
  const todayIndex = new Date().getDay()
  const dayIndex = todayIndex === 0 ? 6 : todayIndex - 1 // Mon=0 ... Sun=6
  const dayOpacity = [0.9, 0.72, 0.55, 0.38, 0, 0, 0]
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <>
      <style>{`
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>
      {/* 1. TAMi Affirmation Strip */}
      <div style={{
        background: 'rgba(232,75,138,0.06)', border: '1px solid rgba(232,75,138,0.15)',
        borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e84b8a', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#e84b8a', whiteSpace: 'nowrap' }}>T.A.M.i says:</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>You've been so consistent this week — keep that energy going!</span>
      </div>

      {/* 2. Today's Focus */}
      <div style={{
        background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)',
        borderRadius: 14, padding: '18px 20px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#5DCAA5', letterSpacing: 1, textTransform: 'uppercase' }}>Today's Focus</div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 6 }}>
          Complete Level 3 Scale Patterns — C Major & G Major
        </div>
        <div style={{ fontSize: 12, color: 'rgba(20,184,166,0.6)', marginTop: 4 }}>Assigned by Motesart · Due Friday</div>
        <button
          onClick={() => navigate('/practice-live')}
          style={{
            display: 'inline-block', marginTop: 12, padding: '8px 20px',
            background: 'linear-gradient(135deg,#d946ef,#a855f7)', color: '#fff', border: 'none',
            borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(20,184,166,0.3)',
          }}
        >Start Practice</button>
      </div>

      {/* 3. Three Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Current Level', value: '3', sub: 'Piano' },
          { label: 'Assignments Due', value: '1', sub: 'this week' },
          { label: 'Day Streak', value: '5', sub: 'personal best: 12', color: '#14b8a6' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: stat.color || '#fff', marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* 4. My Coach Banner */}
      <div
        onClick={() => navigate('/my-coach')}
        style={{
          background: 'linear-gradient(135deg,rgba(30,20,10,.92),rgba(45,28,14,.88))',
          border: '1.5px solid rgba(249,115,22,.25)', borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,.3), 0 0 12px rgba(249,115,22,.06)',
        }}
      >
        <div style={{ width: 48, height: 48, minWidth: 48, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(249,115,22,.4)', flexShrink: 0 }}>
          <img src="/Motesart Avatar 1.PNG" alt="Motesart" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>My Coach</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: '#fff' }}>Motesart</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,.4)', display: 'inline-block' }} />
            <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 600 }}>Active</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>Piano | Voice | Ear Training</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation() }}
            style={{
              padding: '6px 14px', border: '1.5px solid rgba(249,115,22,.4)', background: 'transparent',
              color: '#fb923c', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
            }}
          >▶ Preview Voice</button>
          <div style={{
            padding: '8px 14px', borderRadius: 9, background: 'linear-gradient(135deg,#f97316,#ea580c)',
            color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.5px', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(249,115,22,.3)',
          }}>OPEN</div>
        </div>
      </div>

      {/* 5. Two-Column: Practice Goal + DPM Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, alignItems: 'stretch' }}>

        {/* Left: Today's Practice Goal */}
        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600 }}>Today's Practice Goal</span>
            <span style={{ fontSize: 11, color: '#14b8a6', cursor: 'pointer', fontWeight: 500 }}>Edit</span>
          </div>
          <div style={{ padding: 16, flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 700, color: '#fff' }}>12</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginLeft: 4 }}>of 30 min</span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg,#14b8a6,#06b6d4)', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#5DCAA5' }}>Just 18 more minutes!</div>

            {/* Sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 16, height: 50 }}>
              {dayLabels.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{
                    width: 27, height: 27, borderRadius: 4,
                    background: dayOpacity[i] > 0 ? '#14b8a6' : 'rgba(255,255,255,0.07)',
                    opacity: dayOpacity[i] || (i >= dayIndex ? 1 : 0.3),
                  }} />
                  <span style={{ fontSize: 10, color: i === dayIndex ? '#14b8a6' : 'rgba(255,255,255,0.3)', fontWeight: i === dayIndex ? 600 : 400 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: DPM Score */}
        <div ref={dpmRef} onMouseEnter={triggerDpm} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600 }}>DPM Score</span>
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>Building</span>
          </div>
          <div style={{ padding: 16, flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#378ADD" strokeWidth="8"
                    strokeDasharray={dpmVisible ? `${dA} ${C - dA}` : `0 ${C}`} transform="rotate(-90 50 50)" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.2s ease-out' }} />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="8"
                    strokeDasharray={dpmVisible ? `${pA} ${C - pA}` : `0 ${C}`} strokeDashoffset={`${-(dA + 4)}`} style={{ transition: 'stroke-dasharray 1.2s ease-out 0.25s' }}
                    transform="rotate(-90 50 50)" strokeLinecap="round" />
                  {motivation > 0 && (
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="8"
                      strokeDasharray={dpmVisible ? `${(motivation / 100) * C} ${C - (motivation / 100) * C}` : `0 ${C}`}
                      strokeDashoffset={`${-(dA + pA + 8)}`}
                      transform="rotate(-90 50 50)" strokeLinecap="round"  style={{ transition: 'stroke-dasharray 1.2s ease-out 0.5s' }} />
                  )}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800 }}>{overall}%</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>DPM</div>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { color: '#378ADD', label: 'Drive', value: `${drive}%` },
                  { color: '#f59e0b', label: 'Passion', value: `${passion}%` },
                  { color: '#22c55e', label: 'Motivation', value: `${motivation}%` },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>{d.label}</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Community Card */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600 }}>Community</span>
          <span style={{ fontSize: 11, color: '#14b8a6', cursor: 'pointer', fontWeight: 500 }}>See All →</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left: Shoutout Feed */}
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(249,115,22,.3)' }}>
                  <img src="/Motesart Avatar 1.PNG" alt="Motesart" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Great job on your scales this week!</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Motesart · 2h ago</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#fff' }}>A</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Who wants to practice duets this weekend?</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Aiden · 5h ago</div>
                </div>
              </div>
            </div>
            {/* Right: Class Goal */}
            <div>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>🎉 Classmate Shoutout</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Aiden hit a 10-day streak!</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Class Practice Goal — 620 / 1000 min</div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '62%', background: 'linear-gradient(90deg,#14b8a6,#06b6d4)', borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ===== GAME VIEW ===== */
function GameView({ navigate }) {
  return (
    <>
      {/* Games Dashboard Promo Card */}
      <div onClick={() => navigate('/games')} style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
        border: '1.5px solid rgba(234,179,8,.35)', borderRadius: 18,
        padding: 0, cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 0 20px rgba(234,179,8,.12), inset 0 1px 0 rgba(255,255,255,.05)',
        marginBottom: 16, maxWidth: 480,
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(234,179,8,.15),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(147,51,234,.12),transparent 70%)', pointerEvents: 'none' }} />
        {/* Find the Note Banner Image */}
        <div style={{ position: 'relative', height: 100, overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
          <img src="/SOM Game vids 2/Backup Pics for Games/_Find the Note logo1.jpeg" alt="Find the Note" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.7)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 30%,rgba(15,12,41,.95))' }} />
          <div style={{ position: 'absolute', top: 10, right: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', backdropFilter: 'blur(4px)' }}>
            <span style={{ color: '#eab308', fontSize: 9, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>NEW GAMES</span>
          </div>
        </div>
        <div style={{ padding: '14px 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-.3px' }}>Games Dashboard</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.5)', display: 'inline-block' }} />
          </div>
          <p style={{ color: '#a5b4fc', fontSize: 12, margin: 0, lineHeight: 1.4, fontWeight: 500 }}>Level up your skills with fun music games. Train your ear, test your speed, and climb the leaderboard!</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, display: 'flex', gap: 14 }}>
              {[{ v: '5+', l: 'Games' }, { v: 'Live', l: 'Scores' }, { v: 'Global', l: 'Ranks' }].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#eab308' }}>{s.v}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#eab308,#f59e0b)', color: '#0a0e1a', fontSize: 12, fontWeight: 900, letterSpacing: '.5px', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(234,179,8,.35)' }}>PLAY NOW</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Game Stats">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[{ v: '0', l: 'Best Streak', c: '#f97316' }, { v: '0', l: 'Lives Lost', c: '#a855f7' }, { v: '0', l: 'On Fire Runs', c: '#14b8a6' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="DPM Game Scores">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[{ v: '0%', l: 'Drive', c: '#3b82f6' }, { v: '0%', l: 'Passion', c: '#f97316' }, { v: '0%', l: 'Motivation', c: '#22c55e' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Card title="Game Sessions">
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>No game sessions yet. Hit Play to start!</p>
        </Card>
        <Card title="Game Leaderboard">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'linear-gradient(135deg,rgba(147,51,234,0.15),rgba(236,72,153,0.15))', border: '1px solid rgba(147,51,234,0.3)', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(168,85,247,0.4)' }}>
              <img src="/Motesart Avatar 1.PNG" alt="Motesart" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ flex: 1, fontSize: 12, color: '#a855f7', fontWeight: 700 }}>Motesart Mo (You)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>0</span>
          </div>
          <button onClick={() => navigate('/leaderboard')} style={{ width: '100%', marginTop: 12, padding: 10, background: 'linear-gradient(135deg,rgba(147,51,234,0.2),rgba(236,72,153,0.2))', border: '1px solid rgba(147,51,234,0.3)', color: '#a855f7', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Full Leaderboard</button>
        </Card>
      </div>
    </>
  )
}

/* ===== REUSABLE CARD ===== */
function Card({ title, children, headerRight }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600 }}>{title}</span>
        {headerRight}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}
