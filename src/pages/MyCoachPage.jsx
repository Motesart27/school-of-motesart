/**
 * MyCoachPage.jsx — Full Coach Dashboard (V5 Sunset Gradient)
 * Located at: src/pages/MyCoachPage.jsx
 *
 * Background: Warm Sunset Gradient (#1a0612 -> #f0b556)
 * Default Coach: Motesart (Founder & Lead Coach)
 * Cards: Glass morphism with backdrop-filter blur
 * Avatar: Motesart cartoon (ambassador image, NOT emoji)
 * T.A.M.i avatar: tami-avatar.png (NOT emoji)
 */
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"
import useTextToSpeech from "../hooks/useTextToSpeech.js"

const COACHES = [
  {
    id: "motesart",
    initials: "M",
    name: "Motesart",
    title: "Piano · Voice · Ear Training — Founder & Lead Coach",
    specialty: "Piano & Voice",
    instruments: ["🎹 Piano", "🎤 Voice"],
    styles: ["⚡ High Energy", "🎯 Coach"],
    audience: "Ages 10–25",
    tamiScore: 94,
    students: 247,
    sessions: 312,
    rating: 4.9,
    experience: "8yr",
    voiceDuration: "0:15",
    isDefault: true,
    avatarUrl: "/ambassadors/motesart.png",
  },
  {
    id: "kira",
    initials: "KR",
    name: "Coach Kira",
    specialty: "Vocals & Jazz",
    sessions: 186,
    rating: 4.8,
    experience: "5yr",
    avatarUrl: "/ambassadors/kira.png",
  },
  {
    id: "dex",
    initials: "DX",
    name: "Coach Dex",
    specialty: "Guitar & Blues",
    sessions: 142,
    rating: 4.7,
    experience: "4yr",
    avatarUrl: "/ambassadors/dex.png",
  },
  {
    id: "luna",
    initials: "LN",
    name: "Coach Luna",
    specialty: "Production & Mix",
    sessions: 203,
    rating: 4.9,
    experience: "6yr",
    avatarUrl: "/ambassadors/luna.png",
  },
  {
    id: "reese",
    initials: "RS",
    name: "Coach Reese",
    specialty: "Drums & Rhythm",
    sessions: 118,
    rating: 4.6,
    experience: "3yr",
    avatarUrl: "/ambassadors/reese.png",
  },
]

const CLASSES = [
  { icon: "🎹", name: "Piano Masterclass", desc: "Advanced techniques with Motesart. Classical repertoire, improvisation, and performance prep.", day: "Mon & Wed", status: "Active", featured: true, accentStart: "#f5a623", accentEnd: "#e8622a" },
  { icon: "🎸", name: "Guitar Basics", desc: "Beginner chord progressions and strumming.", day: "Tue", status: "Active", accentStart: "#e8622a", accentEnd: "#f5a623" },
  { icon: "🎤", name: "Vocal Training", desc: "Breath control and vocal range expansion.", day: "Thu", status: "Pending", accentStart: "#c03c2e", accentEnd: "#e8622a" },
  { icon: "🎵", name: "Music Theory", desc: "Harmony, scales, and composition.", day: "Fri", status: "Active", accentStart: "#8B2FC9", accentEnd: "#e8622a" },
  { icon: "🥁", name: "Rhythm Lab", desc: "Percussion, timing, and beat-making.", day: "Sat", status: "Active", accentStart: "#0891b2", accentEnd: "#f5a623" },
]

const MYA_GREETINGS = {
  morning: [
    "Good morning! Ready to start your musical journey today?",
    "Morning! Let's warm up those musical muscles!",
  ],
  afternoon: [
    "Good afternoon! Time for your practice session?",
    "Hey! Ready to dive into some music this afternoon?",
  ],
  evening: [
    "Good evening! A perfect time to wind down with music.",
    "Evening! Let's make some music before the day ends.",
  ],
}

function getGreeting() {
  const h = new Date().getHours()
  const key = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const list = MYA_GREETINGS[key]
  return list[Math.floor(Math.random() * list.length)]
}

const BUBBLE_ANIM = {
  idle:           'myaFloat 3s ease-in-out infinite',
  recording:      'myaRipple 1s ease-in-out infinite',
  processing:     'myaSpin 1s linear infinite',
  speaking:       'none',
  'replay-ready': 'myaBounce 0.6s ease-in-out infinite',
}

const BUBBLE_BG = {
  idle:           'linear-gradient(135deg, #f5a623, #e8622a)',
  recording:      'linear-gradient(135deg, #e8622a, #c03c2e)',
  processing:     'linear-gradient(135deg, #8B2FC9, #e8622a)',
  speaking:       'linear-gradient(135deg, #22c55e, #16a34a)',
  'replay-ready': 'linear-gradient(135deg, #f5a623, #8B2FC9)',
}

export default function MyCoachPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedCoach, setSelectedCoach] = useState("motesart")
  const [voiceState, setVoiceState] = useState("idle")

  const waveRef          = useRef(null)
  const voiceStateRef    = useRef("idle")
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const vadTimerRef      = useRef(null)
  const hasGreetedRef    = useRef(false)
  const micStreamRef     = useRef(null)
  const myaBubbleRef     = useRef(null)

  const { speak, stop, unlock, isSpeaking, isLoading, error: ttsError, analyserRef, playBase64 } = useTextToSpeech()
  const voiceForCoach = selectedCoach === "tami" ? "tami" : "coach"
  const activeCoach = COACHES.find(c => c.id === selectedCoach) || COACHES[0]

  function setVoiceStateSynced(s) {
    voiceStateRef.current = s
    setVoiceState(s)
  }

  // Waveform bars
  useEffect(() => {
    if (!waveRef.current || waveRef.current.children.length > 0) return
    for (let i = 0; i < 7; i++) {
      const bar = document.createElement("div")
      const heights = [12, 20, 28, 16, 24, 10, 20]
      Object.assign(bar.style, {
        width: "4px",
        borderRadius: "2px",
        background: "linear-gradient(180deg, #f5a623, #e8622a)",
        animation: "coachWave 1.2s ease-in-out infinite",
        animationDelay: `${i * 0.1}s`,
        height: heights[i] + "px",
      })
      waveRef.current.appendChild(bar)
    }
  }, [])

  // Mya greeting on first mount
  useEffect(() => {
    if (hasGreetedRef.current) return
    hasGreetedRef.current = true
    const timer = setTimeout(() => { speak(getGreeting(), 'coach') }, 800)
    return () => clearTimeout(timer)
  }, [speak])

  // Amplitude-driven bubble scale while speaking
  useEffect(() => {
    if (voiceState !== 'speaking' || !myaBubbleRef.current) return
    let rafId
    const tick = () => {
      if (!analyserRef.current || !myaBubbleRef.current) return
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128)
      const amplitude = sum / data.length / 128
      myaBubbleRef.current.style.transform = `scale(${1 + amplitude * 0.5})`
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      if (myaBubbleRef.current) myaBubbleRef.current.style.transform = 'scale(1)'
    }
  }, [voiceState]) // analyserRef is a stable ref object, not a dep

  function stopMic() {
    clearTimeout(vadTimerRef.current)
    vadTimerRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch (_) {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
    mediaRecorderRef.current = null
  }

  async function sendToMya() {
    const chunks = audioChunksRef.current
    if (!chunks.length) { setVoiceStateSynced('idle'); return }
    setVoiceStateSynced('processing')
    const blob = new Blob(chunks, { type: 'audio/webm' })
    const form = new FormData()
    form.append('audio', blob, 'recording.webm')
    try {
      const base = import.meta.env.VITE_RAILWAY_URL || ''
      const resp = await fetch(`${base}/api/mya/voice`, { method: 'POST', body: form })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.detail?.error || `mya/voice HTTP ${resp.status}`)
      if (!data.audio_base64) throw new Error('no audio in response')
      setVoiceStateSynced('speaking')
      playBase64(data.audio_base64, () => setVoiceStateSynced('idle'))
    } catch (err) {
      console.error('[Mya] voice error:', err)
      setVoiceStateSynced('idle')
    }
  }

  async function handleMicTap() {
    // VAD gate rule 1: reject tap if not idle
    if (voiceStateRef.current !== 'idle') return
    unlock()
    audioChunksRef.current = []
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return
    }
    micStreamRef.current = stream
    setVoiceStateSynced('recording')

    // VAD via separate AudioContext (mic analysis only, not playback)
    const micCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = micCtx.createMediaStreamSource(stream)
    const vad = micCtx.createAnalyser()
    vad.fftSize = 256
    src.connect(vad)
    const buf = new Uint8Array(vad.frequencyBinCount)

    const silenceCheck = () => {
      if (voiceStateRef.current !== 'recording') { micCtx.close(); return }
      vad.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128)
      const rms = sum / buf.length
      if (rms < 3) {
        // silence — start timer if not already running
        if (!vadTimerRef.current) {
          vadTimerRef.current = setTimeout(() => {
            vadTimerRef.current = null
            stopMic()
            micCtx.close()
            // sendToMya called from mr.onstop after MediaRecorder flushes
          }, 1500)
        }
      } else {
        // sound detected — reset silence timer
        if (vadTimerRef.current) {
          clearTimeout(vadTimerRef.current)
          vadTimerRef.current = null
        }
      }
      requestAnimationFrame(silenceCheck)
    }
    requestAnimationFrame(silenceCheck)

    const mr = new MediaRecorder(stream)
    mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
    mr.onstop = () => sendToMya()
    mediaRecorderRef.current = mr
    mr.start(100)
  }

  return (
    <>
      <style>{`
        @keyframes coachSpin{to{transform:rotate(360deg)}}
        @keyframes coachWave{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.4)}}
        @keyframes myaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes myaRipple{0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,0.7)}50%{box-shadow:0 0 0 14px rgba(245,166,35,0)}}
        @keyframes myaSpin{to{transform:rotate(360deg)}}
        @keyframes myaBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(165deg, #1a0612 0%, #3d1028 15%, #7a1e3e 30%, #b8392e 50%, #d96428 65%, #e8943a 80%, #f0b556 95%)",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#fff3e6",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Noise texture */}
        <div style={{
          position: "absolute", inset: 0,
          background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Ambient orbs */}
        {[
          { w: 450, h: 450, top: -100, right: -120, bg: "rgba(240,130,50,0.2)" },
          { w: 350, h: 350, top: 250, left: -100, bg: "rgba(180,40,80,0.15)" },
          { w: 400, h: 400, bottom: 80, right: "8%", bg: "rgba(245,166,35,0.15)" },
          { w: 280, h: 280, top: "45%", left: "25%", bg: "rgba(219,39,119,0.08)" },
        ].map((orb, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%", filter: "blur(100px)",
            pointerEvents: "none", zIndex: 0,
            width: orb.w, height: orb.h,
            top: orb.top, right: orb.right, bottom: orb.bottom, left: orb.left,
            background: orb.bg,
          }} />
        ))}

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 1, padding: "32px 32px 60px", maxWidth: 1200, margin: "0 auto" }}>

          {/* Back button */}
          <button onClick={() => navigate(-1)} style={{
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,243,230,0.6)",
            borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", marginBottom: 24,
          }}>{"←"} Back</button>

          {/* ── HERO SECTION ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
            marginBottom: 40, alignItems: "center",
          }}>
            {/* Left: headline */}
            <div>
              <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, color: "#fff3e6", marginBottom: 8 }}>
                Your{" "}
                <span style={{
                  background: "linear-gradient(135deg, #ffd6a0, #f5a623, #e8622a)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>Coach</span>
                <br />Dashboard
              </h1>
              <p style={{ fontSize: 16, color: "rgba(255,243,230,0.6)", lineHeight: 1.6, maxWidth: 420 }}>
                Choose your T.A.M.i Ambassador coach, explore private lesson classes, and level up your musical journey.
              </p>
              <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                {[
                  { val: "12", lbl: "Classes" },
                  { val: String(COACHES.length), lbl: "Coaches" },
                  { val: "98%", lbl: "Match Rate" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#f5a623" }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,243,230,0.35)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Spotlight Card */}
            <div style={{
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 32, padding: 28, position: "relative", overflow: "hidden",
              boxShadow: "0 4px 40px rgba(0,0,0,0.15)",
            }}>
              {/* Top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #f5a623, #e8622a, #c03c2e)" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                {/* Spinning avatar */}
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", padding: 3, flexShrink: 0,
                  background: "conic-gradient(from 0deg, #f5a623, #e8622a, #c03c2e, #8B2FC9, #f5a623)",
                  animation: "coachSpin 4s linear infinite",
                }}>
                  <div style={{
                    width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                    border: "3px solid rgba(26,6,18,0.8)",
                  }}>
                    <img
                      src={activeCoach.avatarUrl || "/ambassadors/motesart.png"}
                      alt={activeCoach.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => {
                        e.target.style.display = "none"
                        e.target.parentElement.style.background = "rgba(26,6,18,0.8)"
                        e.target.parentElement.style.display = "flex"
                        e.target.parentElement.style.alignItems = "center"
                        e.target.parentElement.style.justifyContent = "center"
                        const txt = document.createElement("span")
                        txt.textContent = activeCoach.initials || "M"
                        txt.style.cssText = "font-size:28px;font-weight:800;color:#f5a623;"
                        e.target.parentElement.appendChild(txt)
                      }}
                    />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff3e6" }}>{activeCoach.name}</h3>
                  <div style={{ fontSize: 13, color: "rgba(255,243,230,0.6)" }}>{activeCoach.specialty}</div>
                  <span style={{
                    display: "inline-block", marginTop: 4, padding: "3px 10px",
                    background: "rgba(245,166,35,0.15)", borderRadius: 100,
                    fontSize: 11, fontWeight: 600, color: "#f5a623",
                  }}>Your Active Coach</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { num: activeCoach.sessions || 312, label: "Sessions" },
                  { num: activeCoach.rating || 4.9, label: "Rating" },
                  { num: activeCoach.experience || "8yr", label: "Exp" },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: "center", padding: 12,
                    background: "rgba(0,0,0,0.2)", borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#f5a623" }}>{s.num}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,243,230,0.35)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Waveform */}
              <div ref={waveRef} style={{
                display: "flex", gap: 3, alignItems: "flex-end",
                height: 32, marginTop: 16, justifyContent: "center",
              }} />

              {/* Voice Test Button */}
              <button
                onClick={() => {
                  if (isSpeaking) { stop() }
                  else {
                    const msg = voiceForCoach === "coach"
                      ? "Hey! I am Motes Art, your piano and music coach. Ready to make some music today?"
                      : "Hi there! I am Tammy, your A.I. teaching assistant. How can I help you today?"
                    speak(msg, voiceForCoach)
                  }
                }}
                disabled={isLoading}
                style={{
                  marginTop: 16,
                  padding: "10px 24px",
                  background: isSpeaking
                    ? "linear-gradient(135deg, #e8622a, #c03c2e)"
                    : "linear-gradient(135deg, #f5a623, #e8622a)",
                  border: "none",
                  borderRadius: 24,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isLoading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.3s ease",
                  opacity: isLoading ? 0.7 : 1,
                  boxShadow: "0 4px 15px rgba(245,166,35,0.3)",
                }}
              >
                {isLoading ? "Loading..." : isSpeaking ? "Stop" : "Hear My Voice"}
              </button>
              {ttsError && <p style={{ color: "#ff6b6b", fontSize: 12, marginTop: 4 }}>{ttsError}</p>}
            </div>
          </div>

          {/* ── CLASSES BENTO GRID ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff3e6" }}>Your Classes</h2>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f5a623", cursor: "pointer" }}>See All {"→"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}>
            {CLASSES.map((cls, i) => (
              <div key={i} style={{
                gridColumn: cls.featured ? "span 2" : "span 1",
                background: cls.featured ? "rgba(245,166,35,0.08)" : "rgba(0,0,0,0.25)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${cls.featured ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 24, padding: 24, cursor: "pointer",
                position: "relative", overflow: "hidden",
                transition: "all .3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)"
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
              >
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${cls.accentStart}, ${cls.accentEnd})`,
                  opacity: cls.featured ? 1 : 0,
                }} />
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, marginBottom: 14,
                  background: "rgba(245,166,35,0.1)",
                }}>{cls.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "#fff3e6" }}>{cls.name}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,243,230,0.6)", lineHeight: 1.5 }}>{cls.desc}</p>
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,243,230,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cls.accentStart }} /> {cls.day}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,243,230,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cls.status === "Active" ? "#4ade80" : "#f97316" }} /> {cls.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── COACH PICKER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff3e6" }}>Choose Your Coach</h2>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f5a623", cursor: "pointer" }}>View All {"→"}</span>
          </div>

          <div style={{
            display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16,
            scrollbarWidth: "none", msOverflowStyle: "none",
          }}>
            {COACHES.map((coach) => (
              <div
                key={coach.id}
                onClick={() => setSelectedCoach(coach.id)}
                style={{
                  minWidth: 200, maxWidth: 200, flexShrink: 0,
                  background: "rgba(0,0,0,0.25)",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  border: selectedCoach === coach.id ? "2px solid #f5a623" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24, padding: "24px 20px", textAlign: "center",
                  cursor: "pointer", transition: "all .3s ease",
                  boxShadow: selectedCoach === coach.id ? "0 8px 30px rgba(245,166,35,0.2)" : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)" }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
              >
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", margin: "0 auto 14px",
                  background: selectedCoach === coach.id ? "rgba(245,166,35,0.15)" : "rgba(245,166,35,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                  border: selectedCoach === coach.id ? "3px solid #f5a623" : "3px solid transparent",
                  transition: "border .3s ease",
                }}>
                  <img
                    src={coach.avatarUrl}
                    alt={coach.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.style.display = "none"
                      const txt = document.createElement("span")
                      txt.textContent = coach.initials
                      txt.style.cssText = "font-size:32px;font-weight:800;color:#f5a623;"
                      e.target.parentElement.appendChild(txt)
                    }}
                  />
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff3e6", marginBottom: 2 }}>{coach.name}</h4>
                <div style={{ fontSize: 12, color: "rgba(255,243,230,0.6)", marginBottom: 10 }}>{coach.specialty}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f5a623" }}>{"★"} {coach.rating}</div>
                <button style={{
                  marginTop: 12, padding: "8px 20px", border: "none", borderRadius: 100,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all .25s ease",
                  background: selectedCoach === coach.id ? "linear-gradient(135deg, #f5a623, #e8622a)" : "rgba(255,255,255,0.06)",
                  color: selectedCoach === coach.id ? "#1a0612" : "rgba(255,243,230,0.6)",
                }}>
                  {selectedCoach === coach.id ? "Selected" : "Choose"}
                </button>
              </div>
            ))}

            {/* Coming Soon ghost */}
            <div style={{
              minWidth: 200, maxWidth: 200, flexShrink: 0,
              border: "2px dashed rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.1)",
              borderRadius: 24, padding: "24px 20px", textAlign: "center",
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(255,255,255,0.03)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "rgba(255,243,230,0.35)",
              }}>+</div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,243,230,0.35)", marginBottom: 2 }}>Coming Soon</h4>
              <div style={{ fontSize: 12, color: "rgba(255,243,230,0.35)", marginBottom: 10 }}>New Coaches</div>
              <div style={{ fontSize: 12, color: "transparent" }}>&nbsp;</div>
              <button disabled style={{
                marginTop: 12, padding: "8px 20px", border: "none", borderRadius: 100,
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.06)", color: "rgba(255,243,230,0.35)",
                opacity: 0.3,
              }}>Soon</button>
            </div>
          </div>

        </div>

        {/* Mya voice bubble — fixed FAB, state-driven animation */}
        <div
          ref={myaBubbleRef}
          onClick={handleMicTap}
          title={voiceState === 'idle' ? 'Talk to Mya' : voiceState}
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: BUBBLE_BG[voiceState] || BUBBLE_BG.idle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: voiceState === 'processing' ? 'wait' : 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            zIndex: 100,
            animation: BUBBLE_ANIM[voiceState] || BUBBLE_ANIM.idle,
            fontSize: 26,
            userSelect: 'none',
            transition: 'background 0.3s ease',
          }}
        >
          {voiceState === 'idle'           && '🎤'}
          {voiceState === 'recording'      && '⏺'}
          {voiceState === 'processing'     && '⏳'}
          {voiceState === 'speaking'       && '🔊'}
          {voiceState === 'replay-ready'   && '▶'}
        </div>
      </div>
    </>
  )
}
