import React from 'react'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

  .cockpit-root {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at 28% 38%, #12123a 0%, #0a0a1a 65%);
    font-family: 'DM Sans', -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #fff;
  }
  .cockpit-root *, .cockpit-root *::before, .cockpit-root *::after { box-sizing: border-box; }
  .cockpit-root h1, .cockpit-root h2, .cockpit-root h3 { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }

  @keyframes cpRing1 { 0%,100%{transform:scale(1);opacity:0.45} 50%{transform:scale(1.07);opacity:0.9} }
  @keyframes cpRing2 { 0%,100%{transform:scale(1);opacity:0.28} 50%{transform:scale(1.13);opacity:0.55} }
  @keyframes cpRing3 { 0%,100%{transform:scale(1);opacity:0.14} 50%{transform:scale(1.2);opacity:0.28} }
  @keyframes cpPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes cpFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cpGlow   { 0%,100%{box-shadow:0 0 28px rgba(232,75,138,0.18),0 0 56px rgba(232,75,138,0.08)} 50%{box-shadow:0 0 42px rgba(232,75,138,0.38),0 0 84px rgba(232,75,138,0.16)} }
  @keyframes cpBarGrow { from{width:0%} to{width:var(--cp-w)} }

  .cockpit-card {
    background: rgba(20,20,40,0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    animation: cpFadeUp 0.48s cubic-bezier(0.16,1,0.3,1) both;
  }

  .cockpit-begin-btn {
    background: linear-gradient(135deg, #e84b8a 0%, #f97316 100%);
    border: none;
    border-radius: 16px;
    color: #fff;
    font-family: 'Outfit', sans-serif;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
    cursor: pointer;
    padding: 17px 56px;
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
  }
  .cockpit-begin-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 36px rgba(232,75,138,0.42); }
  .cockpit-begin-btn:active { transform: translateY(0); }

  .cockpit-assign-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .cockpit-assign-row:last-child { border-bottom: none; padding-bottom: 0; }

  .cockpit-stage-dot {
    width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }

  .cockpit-scroll { flex: 1; overflow-y: auto; }
  .cockpit-scroll::-webkit-scrollbar { width: 4px; }
  .cockpit-scroll::-webkit-scrollbar-track { background: transparent; }
  .cockpit-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
`

export default function PracticeSessionCockpit({
  studentName      = 'Student',
  phase            = 'Phase 1',
  conceptTitle     = 'Middle C',
  conceptDesc      = 'Finding and playing Middle C with confidence on the piano keyboard.',
  conceptProgress  = 42,
  assignments      = [],
  motesartSuggestion = "Let's warm up your fingers and find Middle C today. You're making great progress!",
  onBegin,
}) {
  const pct = Math.max(0, Math.min(100, conceptProgress))
  const progressColor = pct >= 80 ? '#00C49A' : pct >= 40 ? '#f97316' : '#e84b8a'

  const stages = [
    { label: 'Find It', threshold: 33 },
    { label: 'Play It', threshold: 66 },
    { label: 'Own It',  threshold: 100 },
  ]

  return (
    <div className="cockpit-root">
      <style>{css}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/SOM_logo.png" alt="SOM"
            style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14,
            background: 'linear-gradient(135deg,#e84b8a,#f97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>School of Motesart</span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Practice Live</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C49A', animation: 'cpPulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{studentName}</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="cockpit-scroll">
        <div style={{ display: 'flex', gap: 24, padding: '28px 32px', alignItems: 'flex-start' }}>

          {/* ── Left column ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Phase pill + hero title */}
            <div style={{ animation: 'cpFadeUp 0.42s cubic-bezier(0.16,1,0.3,1) both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', marginBottom: 10,
                background: 'rgba(232,75,138,0.1)', border: '1px solid rgba(232,75,138,0.22)', borderRadius: 20,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e84b8a', animation: 'cpPulse 2s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#e84b8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{phase}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Today's Concept</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.08, marginBottom: 8 }}>{conceptTitle}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65, maxWidth: 400 }}>{conceptDesc}</div>
            </div>

            {/* Mastery progress card */}
            <div className="cockpit-card" style={{ padding: '20px 24px', animationDelay: '0.06s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Concept Mastery</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: progressColor }}>{pct}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 5, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 5,
                  background: `linear-gradient(90deg,${progressColor},${progressColor}99)`,
                  width: `${pct}%`,
                  transition: 'width 1.1s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
                {stages.map(s => {
                  const done = pct >= s.threshold
                  return (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="cockpit-stage-dot" style={{
                        background: done ? '#00C49A' : 'rgba(255,255,255,0.08)',
                        border: done ? 'none' : '1.5px solid rgba(255,255,255,0.14)',
                      }}>
                        {done && <span style={{ fontSize: 8, color: '#0a0a1a', fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: done ? '#00C49A' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Last session recap */}
            <div className="cockpit-card" style={{ padding: '18px 22px', animationDelay: '0.12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13 }}>🕐</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Session Recap</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                You practiced <strong style={{ color: 'rgba(255,255,255,0.88)' }}>{conceptTitle}</strong> and answered correctly <strong style={{ color: '#00C49A' }}>4 of 5 times</strong>. T.A.M.i noticed you hesitate near the black keys — we'll focus on that today.
              </div>
            </div>

            {/* Assignments */}
            {assignments.length > 0 && (
              <div className="cockpit-card" style={{ padding: '18px 22px', animationDelay: '0.18s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13 }}>📋</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assignments</span>
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {assignments.filter(a => a.done).length}/{assignments.length} done
                  </div>
                </div>
                {assignments.map((a, i) => (
                  <div key={i} className="cockpit-assign-row">
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      background: a.done ? '#00C49A' : 'rgba(255,255,255,0.05)',
                      border: a.done ? 'none' : '1.5px solid rgba(255,255,255,0.14)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {a.done && <span style={{ fontSize: 9, color: '#0a0a1a', fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                        color: a.done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
                        textDecoration: a.done ? 'line-through' : 'none',
                      }}>{a.title}</div>
                      {a.due && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>Due {a.due}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right column — avatar + suggestion ── */}
          <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

            {/* Energy ring + avatar */}
            <div style={{
              position: 'relative', width: 196, height: 196,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'cpFadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.08s both',
            }}>
              <div style={{ position: 'absolute', inset: -34, borderRadius: '50%', border: '1.5px solid rgba(232,75,138,0.14)', animation: 'cpRing3 4.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '1.5px solid rgba(232,75,138,0.24)', animation: 'cpRing2 3.8s ease-in-out infinite 0.4s' }} />
              <div style={{ position: 'absolute', inset: -8,  borderRadius: '50%', border: '2px solid rgba(232,75,138,0.44)', animation: 'cpRing1 3s ease-in-out infinite 0.8s' }} />
              <div style={{
                width: 164, height: 164, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(232,75,138,0.45)',
                background: 'rgba(20,20,40,0.85)',
                animation: 'cpGlow 3.2s ease-in-out infinite',
                flexShrink: 0,
              }}>
                <img
                  src="/Motesart Avatar 1.PNG"
                  alt="Motesart"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
            </div>

            {/* Name + ready status */}
            <div style={{ textAlign: 'center', animation: 'cpFadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.14s both' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Motesart</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 11px', background: 'rgba(0,196,154,0.09)',
                border: '1px solid rgba(0,196,154,0.22)', borderRadius: 12,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00C49A', animation: 'cpPulse 2s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#00C49A' }}>Ready to teach</span>
              </div>
            </div>

            {/* Suggestion bubble */}
            {motesartSuggestion && (
              <div className="cockpit-card" style={{
                padding: '16px 18px', width: '100%',
                borderColor: 'rgba(232,75,138,0.18)',
                animationDelay: '0.2s',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#e84b8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Motesart says</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, fontStyle: 'italic' }}>"{motesartSuggestion}"</div>
              </div>
            )}

            {/* Session tip */}
            <div style={{
              width: '100%', padding: '14px 16px',
              background: 'rgba(0,196,154,0.07)',
              border: '1px solid rgba(0,196,154,0.15)',
              borderRadius: 14,
              animation: 'cpFadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.26s both',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#00C49A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>💡 Session tip</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Speak your answers out loud — T.A.M.i listens and adapts in real time.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Begin session CTA ── */}
      <div style={{
        padding: '18px 32px 26px', flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'center',
      }}>
        <button className="cockpit-begin-btn" onClick={onBegin}>
          Begin Session →
        </button>
      </div>
    </div>
  )
}
