/**
 * MyCoach.jsx — "My Coach" Card for T.A.M.i Dashboard
 * Located at: src/components/MyCoach.jsx
 * 
 * Background: Deep Royal Purple #2d1b69
 * Avatar: Motesart cartoon (ambassador's image, NOT emoji)
 * T.A.M.i mimic: uses tami-avatar.png (NOT emoji)
 * Text: lavender/colored tones — NO pure white
 */
import { useState, useEffect, useRef } from "react"

const DEFAULT_AMBASSADOR = {
  name: "Motesart",
  title: "Piano · Voice · Ear Training — Founder & Lead Coach",
  instruments: ["🎹 Piano", "🎤 Voice"],
  styles: ["⚡ High Energy", "🎯 Coach"],
  audience: "Ages 10–25",
  tamiScore: 94,
  students: 247,
  rating: 4.9,
  voiceDuration: "0:15",
  isDefault: true,
  avatarUrl: "/ambassadors/motesart.png", // Motesart cartoon avatar
}

// Color palette — no pure white anywhere
const C = {
  name: "#f0e6ff",             // soft lavender-white for name
  subtitle: "rgba(200,180,255,0.55)",
  label: "rgba(200,180,255,0.7)",
  labelDim: "rgba(200,180,255,0.45)",
  textMid: "rgba(200,180,255,0.65)",
  textDim: "rgba(200,180,255,0.4)",
  green: "#22c55e",
  purple: "#a855f7",
  pink: "#e84b8a",
  orange: "#f97316",
  blue: "#3b82f6",
  teal: "#14b8a6",
  gold: "#eab308",
  ringBorder: "#2d1b69",       // matches page bg so ring looks clean
}

export default function MyCoach({ user, ambassador = DEFAULT_AMBASSADOR }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const waveRef = useRef(null)

  useEffect(() => {
    if (!waveRef.current || waveRef.current.children.length > 0) return
    for (let i = 0; i < 32; i++) {
      const bar = document.createElement("div")
      const h = 4 + Math.random() * 22
      Object.assign(bar.style, {
        width: "2.5px", borderRadius: "2px",
        background: "rgba(168,85,247,0.4)",
        animation: "vPulse 2s ease-in-out infinite",
        animationDelay: `${i * 0.06}s`,
      })
      bar.style.setProperty("--h", h + "px")
      waveRef.current.appendChild(bar)
    }
  }, [])

  const amb = ambassador

  return (
    <>
      <style>{`
        @keyframes mycoachSpin{to{transform:rotate(360deg)}}
        @keyframes mycoachShimmer{0%,100%{background-position:200% 0}50%{background-position:-200% 0}}
        @keyframes mycoachGlow{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes mycoachMimicGlow{0%,100%{box-shadow:0 0 0 rgba(168,85,247,0)}50%{box-shadow:0 0 14px rgba(168,85,247,0.35)}}
        @keyframes vPulse{0%,100%{height:3px;opacity:.3}50%{height:var(--h);opacity:.8}}
      `}</style>

      <div style={{
        borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)",
        overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* ── Banner ── */}
        <div style={{ height: 88, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: [
              "radial-gradient(ellipse at 15% 40%, rgba(168,85,247,0.2) 0%, transparent 55%)",
              "radial-gradient(ellipse at 75% 30%, rgba(232,75,138,0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 50% 90%, rgba(59,130,246,0.1) 0%, transparent 50%)",
              "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            ].join(","),
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.04) 45%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 55%,transparent 60%)",
            backgroundSize: "200% 100%", animation: "mycoachShimmer 5s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: 16, left: 24,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            color: C.label, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 10px ${C.green}` }} />
            My Coach · Active
          </div>
          {amb.isDefault && (
            <div style={{
              position: "absolute", top: 14, right: 20,
              padding: "5px 14px", borderRadius: 8,
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)",
              color: C.green, fontSize: 11, fontWeight: 700,
            }}>✓ Default Coach</div>
          )}
        </div>

        {/* ── Avatar Row ── */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, padding: "0 24px", marginTop: -34, position: "relative", zIndex: 2 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Glow */}
            <div style={{
              position: "absolute", inset: -10, borderRadius: "50%",
              background: "radial-gradient(circle,rgba(232,75,138,0.15),transparent 70%)",
              pointerEvents: "none", animation: "mycoachGlow 3s ease-in-out infinite",
            }} />
            {/* Spinning ring */}
            <div style={{
              width: 76, height: 76, borderRadius: "50%", padding: 2.5,
              background: `conic-gradient(from 0deg,${C.pink},${C.orange},${C.purple},${C.blue},${C.pink})`,
              animation: "mycoachSpin 10s linear infinite",
            }}>
              {/* AMBASSADOR AVATAR IMAGE — not emoji */}
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                overflow: "hidden", border: `3px solid ${C.ringBorder}`,
              }}>
                <img
                  src={amb.avatarUrl || "/ambassadors/motesart.png"}
                  alt={amb.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => {
                    e.target.style.display = "none"
                    e.target.parentElement.style.background = "linear-gradient(135deg,#e84b8a,#f97316)"
                    e.target.parentElement.innerHTML =
                      '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px">🎵</div>'
                  }}
                />
              </div>
            </div>
            {/* Active dot */}
            <div style={{
              position: "absolute", bottom: 2, right: 2, width: 14, height: 14,
              borderRadius: "50%", background: C.green,
              border: `3px solid ${C.ringBorder}`, boxShadow: `0 0 10px ${C.green}`, zIndex: 3,
            }} />
          </div>
          <div style={{ paddingBottom: 6 }}>
            {/* Name — soft lavender, NOT white */}
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800,
              letterSpacing: "-0.4px", lineHeight: 1.15, color: C.name,
            }}>{amb.name}</div>
            <div style={{ color: C.subtitle, fontSize: 12.5, marginTop: 2 }}>{amb.title}</div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 24px 24px" }}>
          {/* Voice Preview */}
          <div
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", borderRadius: 16,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 14, cursor: "pointer", transition: "all .3s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.1)"; e.currentTarget.style.borderColor = "rgba(168,85,247,0.18)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg,${C.purple},${C.pink})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: "0 4px 18px rgba(168,85,247,0.3)",
            }}>
              <div style={{ width: 0, height: 0, borderLeft: "9px solid #fff", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", marginLeft: 2 }} />
            </div>
            <div ref={waveRef} style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height: 28 }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
              <span style={{ fontSize: 12.5, color: C.label, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{amb.voiceDuration}</span>
              <span style={{ fontSize: 9.5, color: C.textDim }}>Voice preview</span>
            </div>
          </div>

          {/* T.A.M.i Mimic Status — uses TAMi AVATAR, not emoji */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px", borderRadius: 12,
            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.15)",
            marginBottom: 18,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", overflow: "hidden",
              border: "2px solid rgba(168,85,247,0.3)", flexShrink: 0,
              animation: "mycoachMimicGlow 3s ease-in-out infinite",
            }}>
              <img
                src="/tami-avatar.png"
                alt="T.A.M.i"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => {
                  e.target.style.display = "none"
                  e.target.parentElement.style.background = "linear-gradient(135deg,#a855f7,#ec4899)"
                  e.target.parentElement.innerHTML =
                    '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800">T</div>'
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>
              <strong style={{ color: C.purple, fontWeight: 700 }}>T.A.M.i</strong> is teaching in {amb.name}'s voice and style
            </div>
          </div>

          {/* Traits + Stats */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {amb.instruments.map((t, i) => (
                <span key={`i${i}`} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.18)", color: C.blue,
                }}>{t}</span>
              ))}
              {amb.styles.map((t, i) => (
                <span key={`s${i}`} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: "rgba(232,75,138,0.1)", border: "1px solid rgba(232,75,138,0.18)", color: C.pink,
                }}>{t}</span>
              ))}
              <span style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.18)", color: C.teal,
              }}>{amb.audience}</span>
            </div>
            <div style={{ display: "flex", gap: 22, flexShrink: 0 }}>
              {[
                { val: amb.tamiScore, label: "T.A.M.i", color: C.green },
                { val: amb.students, label: "Students", color: C.purple },
                { val: amb.rating, label: "Rating", color: C.gold },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 21, fontWeight: 800, display: "block", lineHeight: 1, color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: 9, color: C.labelDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4, display: "block" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
