import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

const loginStyles = `
  @keyframes laserSpin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`

const extractUser = (data) => ({
  id: data.user?.id || data.id,
  email: data.user?.email || data.email,
  role: data.user?.role || data.role,
  name: data.user?.name || data.name || "",
})

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true })
  }, [user, navigate])

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)
    const emailVal = loginEmail.trim()
    const passVal = loginPassword
    try {
      const data = await api.login(emailVal, passVal)
      const token = data?.token || data?.access_token || data?.data?.token
      if (!token) {
        setLoginError("Login failed — invalid response format")
        return
      }
      const userData = data?.user || data?.data?.user || extractUser(data) || { email: emailVal }
      login(userData, token)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setLoginError(err?.message || "Login failed. Check your credentials and try again.")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleGoogle = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://deployable-python-codebase-som-production.up.railway.app"
    window.location.href = backendUrl + "/auth/google"
  }

  return (
    <>
      <style>{loginStyles}</style>
      <div style={S.page}>
        <div style={S.card}>

          <div style={S.logoWrapper}>
            <div style={S.logoGlow} />
            <div style={S.laserRing1} />
            <div style={S.laserRing2} />
            <div style={S.logoCircle}>
              <img src="/SOM_logo.png" alt="School of Motesart" style={S.logoImg} />
            </div>
          </div>

          <h1 style={S.logoTitle}>School of <span style={S.logoAccent}>Motesart</span></h1>
          <p style={S.logoSub}>FIND THE NOTE · MASTER YOUR EAR</p>

          <form onSubmit={handleLogin} style={S.form}>
            <input
              style={S.input}
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              style={S.input}
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "-") e.stopPropagation() }}
              autoComplete="current-password"
            />
            {loginError && <p style={S.error}>{loginError}</p>}
            <button style={S.btn} type="submit" disabled={loginLoading}>
              {loginLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={S.registerBlock}>
            <a href="/register" style={S.registerBtn}>Go to Registration</a>
            <a href="/register" style={S.registerSmall}>Open full registration flow</a>
          </div>

          <div style={S.divider}><span>or</span></div>

          <div style={S.socialRow}>
            <button style={S.googleBtn} onClick={handleGoogle} type="button">
              Continue with Google
            </button>
          </div>

          <div style={S.footer}>
            <span>School of Motesart</span>
            <button
              style={S.wakeBtn}
              type="button"
              onClick={() => api.wake().then(() => alert("Server is awake!")).catch(() => alert("Server may be starting up..."))}
            >
              Wake up servers
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

const S = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily: "DM Sans,sans-serif", padding: 16 },
  card: { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center" },
  logoWrapper: { position: "relative", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoGlow: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.32) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", filter: "blur(14px)", pointerEvents: "none", animation: "glowPulse 4s ease-in-out infinite", zIndex: 1 },
  laserRing1: { position: "absolute", top: "50%", left: "50%", width: 158, height: 158, borderRadius: "50%", border: "2px solid transparent", borderTop: "2px solid #d946ef", borderRight: "2px solid #a855f7", animation: "laserSpin 3s linear infinite", filter: "drop-shadow(0 0 8px rgba(217,70,239,0.65))", zIndex: 5, pointerEvents: "none" },
  laserRing2: { position: "absolute", top: "50%", left: "50%", width: 170, height: 170, borderRadius: "50%", border: "1.5px solid transparent", borderBottom: "1.5px solid #06b6d4", borderLeft: "1.5px solid #7c3aed", animation: "laserSpin 5s linear infinite reverse", filter: "drop-shadow(0 0 6px rgba(6,182,212,0.45))", opacity: 0.8, zIndex: 5, pointerEvents: "none" },
  logoCircle: { width: 140, height: 140, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", zIndex: 10, boxShadow: "0 0 30px rgba(168,85,247,0.25)" },
  logoImg: { width: 130, height: 130, objectFit: "contain" },
  logoTitle: { textAlign: "center", fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 4px", fontFamily: "Outfit,sans-serif" },
  logoAccent: { color: "#d946ef", textShadow: "0 0 20px rgba(217,70,239,0.45)" },
  logoSub: { textAlign: "center", fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", margin: "0 0 24px" },
  form: { display: "flex", flexDirection: "column", gap: 12, width: "100%" },
  input: { padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 15, outline: "none", fontFamily: "DM Sans,sans-serif" },
  btn: { padding: "13px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#d946ef,#a855f7)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, fontFamily: "DM Sans,sans-serif" },
  error: { color: "#f87171", fontSize: 13, margin: 0, textAlign: "center" },
  registerBlock: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "18px 0 0", width: "100%" },
  registerBtn: { display: "block", width: "100%", padding: "12px 0", borderRadius: 10, border: "2px solid rgba(217,70,239,0.6)", background: "transparent", color: "#d946ef", fontSize: 15, fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" },
  registerSmall: { fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "underline", textAlign: "center" },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "rgba(255,255,255,0.3)", fontSize: 13, width: "100%" },
  socialRow: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, width: "100%" },
  googleBtn: { padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans,sans-serif" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, color: "rgba(255,255,255,0.3)", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, width: "100%" },
  wakeBtn: { padding: "6px 16px", background: "linear-gradient(135deg,#d946ef,#a855f7)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans,sans-serif" },
}
