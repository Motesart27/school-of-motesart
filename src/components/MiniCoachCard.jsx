/**
 * MiniCoachCard.jsx â Small coach card for dashboards + pop-out bubble
 * Located at: src/components/MiniCoachCard.jsx
 *
 * Shows on: Student, Teacher, Parent, Game dashboards (NOT Ambassador)
 * Clicking opens a CoachBubble overlay with quick info + link to full Coach Dashboard
 * Default Coach: Motesart
 * Avatar: Motesart cartoon image (NOT emoji)
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const DEFAULT_COACH = {
  name: "Motesart",
  specialty: "Piano & Voice",
  initials: "M",
  sessions: 312,
  rating: 4.9,
  experience: "8yr",
  avatarUrl: "/ambassadors/motesart.png",
  role: "Piano \u00b7 Voice \u00b7 Ear Training \u2014 Founder & Lead Coach",
  tamiRole: "T.A.M.i Ambassador",
}

export default function MiniCoachCard({ coach = DEFAULT_COACH }) {
  const [showBubble, setShowBubble] = useState(false)
  const navigate = useNavigate()
  const c = coach

  return (
    <>
      <style>{`
        @keyframes miniCoachSpin{to{transform:rotate(360deg)}}
        @keyframes miniCoachBubbleIn{from{opacity:0;transform:scale(.9) translateY(20px)}}
      `}</style>

      {/* ââ Mini Card ââ */}
      <div
        onClick={() => setShowBubble(true)}
        style={{
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.15)",
          borderRadius: 16, padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", transition: "all .3s ease",
          marginBottom: 16,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(245,166,35,0.12)"
          e.currentTarget.style.borderColor = "rgba(245,166,35,0.25)"
          e.currentTarget.style.transform = "translateY(-2px)"
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(245,166,35,0.08)"
          e.currentTarget.style.borderColor = "rgba(245,166,35,0.15)"
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = "none"
        }}
      >
        {/* Spinning avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", padding: 2, flexShrink: 0,
          background: "conic-gradient(from 0deg, #f5a623, #e8622a, #c03c2e, #8B2FC9, #f5a623)",
          animation: "miniCoachSpin 4s linear infinite",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
            border: "2px solid rgba(26,6,18,0.8)",
          }}>
            <img
              src={c.avatarUrl}
              alt={c.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                e.target.style.display = "none"
                e.target.parentElement.style.background = "rgba(26,6,18,0.8)"
                e.target.parentElement.style.display = "flex"
                e.target.parentElement.style.alignItems = "center"
                e.target.parentElement.style.justifyContent = "center"
                const txt = document.createElement("span")
                txt.textContent = c.initials || "M"
                txt.style.cssText = "font-size:16px;font-weight:800;color:#f5a623;"
                e.target.parentElement.appendChild(txt)
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff3e6" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,243,230,0.5)" }}>{c.specialty} {"\u00b7"} Active now</div>
        </div>

        <button style={{
          padding: "8px 16px",
          border: "1px solid rgba(245,166,35,0.2)",
          borderRadius: 100, background: "transparent",
          color: "#f5a623", fontFamily: "'DM Sans', sans-serif",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Open {"\u2197"}</button>
      </div>

      {/* ââ Bubble Overlay ââ */}
      {showBubble && (
        <div
          onClick={() => setShowBubble(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              background: "linear-gradient(165deg, #2a0e20 0%, #4a1830 50%, #6a2520 100%)",
              border: "1px solid rgba(245,166,35,0.15)",
              borderRadius: 32, padding: 32,
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
              textAlign: "center",
              animation: "miniCoachBubbleIn .35s cubic-bezier(.16,1,.3,1)",
            }}
          >
            {/* Bubble avatar */}
            <div style={{
              width: 90, height: 90, borderRadius: "50%", margin: "0 auto 16px",
              padding: 3, animation: "miniCoachSpin 4s linear infinite",
              background: "conic-gradient(from 0deg, #f5a623, #e8622a, #c03c2e, #8B2FC9, #f5a623)",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                border: "3px solid rgba(26,6,18,0.85)",
              }}>
                <img
                  src={c.avatarUrl}
                  alt={c.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => {
                    e.target.style.display = "none"
                    e.target.parentElement.style.background = "rgba(26,6,18,0.85)"
                    e.target.parentElement.style.display = "flex"
                    e.target.parentElement.style.alignItems = "center"
                    e.target.parentElement.style.justifyContent = "center"
                    const txt = document.createElement("span")
                    txt.textContent = c.initials || "M"
                    txt.style.cssText = "font-size:32px;font-weight:800;color:#f5a623;"
                    e.target.parentElement.appendChild(txt)
                  }}
                />
              </div>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff3e6", marginBottom: 4 }}>{c.name}</h3>
            <div style={{ fontSize: 13, color: "rgba(255,243,230,0.5)", marginBottom: 16 }}>
              {c.role || c.specialty} {"\u00b7"} {c.tamiRole || "T.A.M.i Ambassador"}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { num: c.sessions || 312, lbl: "Sessions" },
                { num: c.rating || 4.9, lbl: "Rating" },
                { num: c.experience || "8yr", lbl: "Exp" },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: 10,
                  background: "rgba(0,0,0,0.2)", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f5a623" }}>{s.num}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,243,230,0.35)", marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setShowBubble(false); navigate("/my-coach") }}
              style={{
                width: "100%", padding: 14, border: "none", borderRadius: 100,
                background: "linear-gradient(135deg, #f5a623, #e8622a)",
                color: "#1a0612", fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >Go to Coach Dashboard {"\u2192"}</button>

            <button
              onClick={() => setShowBubble(false)}
              style={{
                marginTop: 12, padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 100, background: "transparent",
                color: "rgba(255,243,230,0.35)", fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >Close</button>
          </div>
        </div>
      )}
    </>
  )
}
