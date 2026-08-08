import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../services/api.js'
import { flushEvidenceQueue } from '../services/evidenceClient.js'
import { setStudentId } from '../lesson_engine/concept_state_store.js'

const AuthContext = createContext(null)

// ── M1 learning identity resolution ──────────────────────────────────────────
// student_instrument_id comes from the backend only: the login/verify payload
// directly, or the existing identity lookup (/student?email=) as a follow-up.
// NO default_student fallback anywhere in the M1 path — unresolved stays null.
const extractInstrumentId = (u) =>
  u?.student_instrument_id ||
  u?.learning_identity?.student_instrument_id ||
  null

async function resolveStudentInstrumentId(userData) {
  const direct = extractInstrumentId(userData)
  if (direct) return direct
  if (!userData?.email) return null
  try {
    const rec = await api.getStudentByEmail(userData.email)
    return (
      rec?.student_instrument_id ||
      rec?.student?.student_instrument_id ||
      rec?.learning_identity?.student_instrument_id ||
      null
    )
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('som_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const [verifying, setVerifying] = useState(false)

  // ── Persist to localStorage (but NEVER trust it as source of truth) ──
  useEffect(() => {
    if (user) localStorage.setItem('som_user', JSON.stringify(user))
    else localStorage.removeItem('som_user')
  }, [user])

  // ── Login: set user from backend response only ──
  const login = (userData, token) => {
    // SECURITY: Role comes from backend (Airtable) only.
    // Default to "student" if backend somehow omits role.
    const u = { ...userData, role: userData.role || 'student' }
    setUser(u)
    // Store JWT token
    if (token) localStorage.setItem('som_token', token)

    // M1: resolve learning identity (student_instrument_id), persist it in
    // som_user, sync the concept-state cache namespace, and flush any queued
    // evidence now that a fresh token is available.
    resolveStudentInstrumentId(u).then(si => {
      if (si) {
        setStudentId(si)
        setUser(prev => (prev ? { ...prev, student_instrument_id: si } : prev))
      } else {
        console.warn('[SOM Auth] student_instrument_id unresolved — evidence writes disabled until identity resolves')
      }
      flushEvidenceQueue()
    })
  }

  // ── Logout: clear everything ──
  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('som_user')
    localStorage.removeItem('som_token')
    // M1: clear the cache namespace pointer — never let a stale identity leak
    // into the next session (no default_student, no cross-student bleed).
    setStudentId(null)
  }, [])

  // ── Update user fields (NEVER allow role mutation from frontend) ──
  const updateUser = (updates) => {
    // SECURITY: Strip role from any frontend update attempt.
    // Role can ONLY change via Airtable → re-login.
    const { role, ...safeUpdates } = updates
    setUser(prev => prev ? { ...prev, ...safeUpdates } : null)
  }

  // ── Listen for force-logout from API 401 responses ──
  useEffect(() => {
    const handler = () => {
      console.warn('[SOM Auth] Force-logout: token rejected by backend')
      logout()
    }
    window.addEventListener('som:force-logout', handler)
    return () => window.removeEventListener('som:force-logout', handler)
  }, [logout])

  // ── Verify user still exists in Airtable on app boot ──
  // Prevents legacy/ghost users from persisting via stale localStorage
  useEffect(() => {
    if (!user || !user.email) return

    const token = localStorage.getItem('som_token')
    if (!token) {
      // No token = legacy session. Force re-login.
      console.warn('[SOM Auth] No token found — clearing legacy session')
      logout()
      return
    }

    let cancelled = false
    setVerifying(true)

    api.verifySession()
      .then(data => {
        if (cancelled) return
        if (!data || !data.valid) {
          console.warn('[SOM Auth] Session invalid — forcing re-login')
          logout()
        } else if (data.user) {
          // Refresh role from Airtable (in case admin changed it)
          setUser(prev => prev ? { ...prev, role: data.user.role || 'student' } : null)
          // M1: (re)resolve learning identity on verified boot
          resolveStudentInstrumentId({ ...user, ...data.user }).then(si => {
            if (cancelled || !si) return
            setStudentId(si)
            setUser(prev => (prev ? { ...prev, student_instrument_id: si } : prev))
          })
        }
      })
      .catch(() => {
        // Backend unreachable — do NOT grant access. Force re-login.
        if (!cancelled) {
          console.warn('[SOM Auth] Backend unreachable — clearing session')
          logout()
        }
      })
      .finally(() => { if (!cancelled) setVerifying(false) })

    return () => { cancelled = true }
  }, []) // Only on mount

  // ── M1: flush queued evidence on app start ──
  useEffect(() => {
    flushEvidenceQueue()
  }, [])

  // ── M1: learning identity exposed to every surface ──
  // Consumers must treat resolved:false as "no evidence writes" (sign-in
  // prompt / skip + warn) — never substitute a default identity.
  const learningIdentity = useMemo(() => ({
    student_instrument_id: user?.student_instrument_id || null,
    resolved: !!user?.student_instrument_id,
  }), [user])

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, verifying, learningIdentity }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
