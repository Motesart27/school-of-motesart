import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../services/api.js'
import { flushEvidenceQueue } from '../services/evidenceClient.js'
import { setStudentId } from '../lesson_engine/concept_state_store.js'

const AuthContext = createContext(null)

// ── M1 R1 canonical learning identity ────────────────────────────────────────
// The ONLY academic identity source is GET /auth/learning-identity (JWT-bound,
// resolved server-side). Email NEVER resolves student records, instruments,
// assignment identity, or evidence ownership. The legacy /student?email=
// follow-up is removed entirely — no silent substitute identity source.
//
// Contract (backend R1 @ 69147f5):
//   identity_status "resolved"           → student_instrument_id filled (exactly one owned instrument)
//   identity_status "selection_required" → student_instrument_id null; NEVER owned_instruments[0];
//                                          explicit student selection required (cached selection is a
//                                          convenience pointer only and must re-validate against the
//                                          CURRENT owned_instruments on every refresh)
//   identity_status "unresolved"         → zero owned instruments; academic evidence writes blocked
//   HTTP 503 identity_unavailable_retryable → transient; retryable; NEVER converted to permanent unresolved

// Cache-only snapshot consumed by evidenceClient (convenience pointer, never authority).
const IDENTITY_SNAPSHOT_KEY = 'som_learning_identity'
// Convenience pointer for an explicit multi-instrument selection, keyed to the user.
const SELECTED_INSTRUMENT_KEY = 'som_selected_instrument'

const EMPTY_IDENTITY = {
  user_id: null,
  student_record_id: null,
  student_instrument_id: null,
  role: null,
  identity_status: null,           // null until the first successful fetch settles
  selection_required: false,
  owned_instruments: [],
  selected_student_instrument_id: null,
  learning_identity_ready: false,
  learning_identity_retryable_error: false,
}

function readStoredSelection() {
  try {
    const raw = localStorage.getItem(SELECTED_INSTRUMENT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeStoredSelection(userId, studentInstrumentId) {
  try {
    if (userId && studentInstrumentId) {
      localStorage.setItem(SELECTED_INSTRUMENT_KEY, JSON.stringify({ user_id: userId, student_instrument_id: studentInstrumentId }))
    } else {
      localStorage.removeItem(SELECTED_INSTRUMENT_KEY)
    }
  } catch { /* storage unavailable — selection just won't persist */ }
}

/** The instrument evidence writes may use: resolved canonical id, or the
 *  explicit (validated) selection when the backend demands a selection. */
function effectiveInstrumentId(identity) {
  if (identity.identity_status === 'resolved') return identity.student_instrument_id || null
  if (identity.identity_status === 'selection_required') return identity.selected_student_instrument_id || null
  return null
}

/** Cache-only snapshot for non-React consumers (evidenceClient). Never authority. */
function writeIdentitySnapshot(identity) {
  try {
    const si = effectiveInstrumentId(identity)
    localStorage.setItem(IDENTITY_SNAPSHOT_KEY, JSON.stringify({
      student_instrument_id: si,
      identity_status: identity.identity_status,
      selection_required: !!identity.selection_required,
      ready: !!identity.learning_identity_ready,
      ts: new Date().toISOString(),
    }))
  } catch { /* cache only */ }
}

function clearIdentitySnapshot() {
  try { localStorage.removeItem(IDENTITY_SNAPSHOT_KEY) } catch { /* cache only */ }
}

/** Transient failures stay retryable — they are NEVER a permanent unresolved verdict. */
function isRetryableIdentityError(err) {
  const status = err?.status
  if (status === 503) return true            // identity_unavailable_retryable
  if (status === 0 || status === undefined) return true // network failure / timeout
  if (status === 408 || status === 429) return true
  if (status >= 500) return true
  return false
}

const IDENTITY_RETRY_DELAYS_MS = [5000, 10000, 20000] // then manual retry only

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('som_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const [verifying, setVerifying] = useState(false)
  // M1 R3.2 (Codex MEDIUM-1): privileged UI must NOT trust the cached
  // localStorage role. roleVerified is false until GET /auth/verify confirms
  // the role from the backend-verified JWT. Privileged route guards require
  // roleVerified === true before mounting; any verification failure / outage
  // leaves it false (fail closed).
  const [roleVerified, setRoleVerified] = useState(false)
  const [identity, setIdentity] = useState(EMPTY_IDENTITY)
  const identityRef = useRef(identity)
  identityRef.current = identity
  const retryTimerRef = useRef(null)
  const retryCountRef = useRef(0)
  const fetchSeqRef = useRef(0)

  // ── Persist display user to localStorage (cache — never identity authority) ──
  useEffect(() => {
    if (user) localStorage.setItem('som_user', JSON.stringify(user))
    else localStorage.removeItem('som_user')
  }, [user])

  const applyIdentity = useCallback((next) => {
    setIdentity(next)
    writeIdentitySnapshot(next)
    // Concept-state cache namespace follows the effective identity (cache only).
    setStudentId(effectiveInstrumentId(next))
  }, [])

  // ── Fetch GET /auth/learning-identity and settle the identity state ──
  const refreshLearningIdentity = useCallback(async () => {
    const token = localStorage.getItem('som_token')
    if (!token) {
      applyIdentity(EMPTY_IDENTITY)
      return null
    }
    const seq = ++fetchSeqRef.current
    try {
      const data = await api.getLearningIdentity()
      if (seq !== fetchSeqRef.current) return null // superseded by a newer fetch/logout

      const owned = Array.isArray(data?.owned_instruments) ? data.owned_instruments : []
      const ownedIds = new Set(owned.map(o => o?.student_instrument_id).filter(Boolean))

      // Re-validate any cached selection against the CURRENT owned_instruments.
      // A stale pointer (different user, or no longer owned) is discarded —
      // selection is required again. The cache is convenience, never identity.
      let selected = null
      if (data?.identity_status === 'selection_required') {
        const stored = readStoredSelection()
        if (
          stored?.student_instrument_id &&
          stored?.user_id === data?.user_id &&
          ownedIds.has(stored.student_instrument_id)
        ) {
          selected = stored.student_instrument_id
        } else if (stored) {
          writeStoredSelection(null, null) // discard stale pointer
        }
      } else {
        writeStoredSelection(null, null) // resolved/unresolved need no selection pointer
      }

      const next = {
        user_id: data?.user_id ?? null,
        student_record_id: data?.student_record_id ?? null,
        student_instrument_id: data?.student_instrument_id ?? null,
        role: data?.role ?? null,
        identity_status: data?.identity_status ?? 'unresolved',
        selection_required: !!data?.selection_required,
        owned_instruments: owned,
        selected_student_instrument_id: selected,
        learning_identity_ready: true,
        learning_identity_retryable_error: false,
      }
      retryCountRef.current = 0
      applyIdentity(next)

      // Queued evidence can flush once a usable identity exists.
      if (effectiveInstrumentId(next)) flushEvidenceQueue()
      return next
    } catch (err) {
      if (seq !== fetchSeqRef.current) return null
      const retryable = isRetryableIdentityError(err)
      // Transient failure NEVER downgrades a previously-good identity to
      // unresolved, and never becomes a permanent verdict.
      const prev = identityRef.current
      const next = {
        ...prev,
        learning_identity_ready: prev.learning_identity_ready && retryable ? prev.learning_identity_ready : false,
        learning_identity_retryable_error: retryable,
      }
      // Keep prior resolved/selection data visible while retrying; a
      // non-retryable unexpected failure clears readiness but invents nothing.
      setIdentity(next)
      writeIdentitySnapshot({ ...next, learning_identity_ready: false })
      if (retryable) {
        const delay = IDENTITY_RETRY_DELAYS_MS[retryCountRef.current]
        if (delay !== undefined) {
          retryCountRef.current += 1
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
          retryTimerRef.current = setTimeout(() => { refreshLearningIdentity() }, delay)
        }
        console.warn('[SOM Auth] learning-identity temporarily unavailable — retryable, not unresolved')
      } else {
        console.warn('[SOM Auth] learning-identity request failed (non-retryable):', err?.message)
      }
      return null
    }
  }, [applyIdentity])

  const retryLearningIdentity = useCallback(() => {
    retryCountRef.current = 0
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    return refreshLearningIdentity()
  }, [refreshLearningIdentity])

  // ── Explicit multi-instrument selection (fix 2B) ──
  // NEVER called automatically with owned_instruments[0] — this is the
  // student's explicit choice, validated against the current owned set.
  const selectInstrument = useCallback((studentInstrumentId) => {
    const cur = identityRef.current
    const ownedIds = new Set((cur.owned_instruments || []).map(o => o?.student_instrument_id).filter(Boolean))
    if (!cur.selection_required || !studentInstrumentId || !ownedIds.has(studentInstrumentId)) {
      console.warn('[SOM Auth] Ignored instrument selection outside the owned set:', studentInstrumentId)
      return false
    }
    writeStoredSelection(cur.user_id, studentInstrumentId)
    const next = { ...cur, selected_student_instrument_id: studentInstrumentId }
    applyIdentity(next)
    flushEvidenceQueue()
    return true
  }, [applyIdentity])

  const clearInstrumentSelection = useCallback(() => {
    const cur = identityRef.current
    writeStoredSelection(null, null)
    applyIdentity({ ...cur, selected_student_instrument_id: null })
  }, [applyIdentity])

  // ── Login: set user from backend response, then resolve canonical identity ──
  const login = (userData, token) => {
    // SECURITY: Role comes from backend (Airtable) only.
    const u = { ...userData, role: userData.role || 'student' }
    setUser(u)
    if (token) localStorage.setItem('som_token', token)
    // M1 R1: canonical learning identity comes ONLY from /auth/learning-identity.
    refreshLearningIdentity()
  }

  // ── Logout: clear everything (identity, snapshot, selection, cache namespace) ──
  const logout = useCallback(() => {
    fetchSeqRef.current += 1 // invalidate any in-flight identity fetch
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    setUser(null)
    setRoleVerified(false)
    localStorage.removeItem('som_user')
    localStorage.removeItem('som_token')
    clearIdentitySnapshot()
    writeStoredSelection(null, null)
    setIdentity(EMPTY_IDENTITY)
    // Clear the cache namespace pointer — no stale identity leaks into the
    // next session (no default_student, no cross-student bleed).
    setStudentId(null)
  }, [])

  // ── Update user fields (NEVER allow role mutation from frontend) ──
  const updateUser = (updates) => {
    const { role, ...safeUpdates } = updates
    setUser(prev => prev ? { ...prev, ...safeUpdates } : null)
  }

  // ── Force-logout from API 401 responses ──
  useEffect(() => {
    const handler = () => {
      console.warn('[SOM Auth] Force-logout: token rejected by backend')
      logout()
    }
    window.addEventListener('som:force-logout', handler)
    return () => window.removeEventListener('som:force-logout', handler)
  }, [logout])

  // ── Backend demanded an explicit selection (409 selection_required on a write) ──
  useEffect(() => {
    const handler = () => {
      console.warn('[SOM Auth] Backend requires explicit instrument selection — returning to selection flow')
      clearInstrumentSelection()
      refreshLearningIdentity()
    }
    window.addEventListener('som:selection-required', handler)
    return () => window.removeEventListener('som:selection-required', handler)
  }, [clearInstrumentSelection, refreshLearningIdentity])

  // ── Verify session with the backend, then resolve canonical identity ──
  // M1 R3.2 (Codex MEDIUM-1): runs whenever a user identity becomes available
  // (boot with a persisted session, or a fresh login). roleVerified only flips
  // true after the backend confirms the role via GET /auth/verify. Until then,
  // and on any failure/outage, roleVerified stays false so privileged UI does
  // not mount from cached local state.
  useEffect(() => {
    if (!user || !user.email) return

    const token = localStorage.getItem('som_token')
    if (!token) {
      console.warn('[SOM Auth] No token found — clearing legacy session')
      logout()
      return
    }

    let cancelled = false
    setVerifying(true)
    setRoleVerified(false) // re-prove on every (re)verification; never trust cache

    api.verifySession()
      .then(data => {
        if (cancelled) return
        if (!data || !data.valid) {
          console.warn('[SOM Auth] Session invalid — forcing re-login')
          setRoleVerified(false)
          logout()
        } else if (data.user) {
          // Role is taken ONLY from the backend-verified response, never the
          // cached som_user. This is the authority for privileged routing.
          setUser(prev => prev ? { ...prev, role: data.user.role || 'student' } : null)
          setRoleVerified(true)
          // M1 R1: (re)resolve canonical learning identity on verified boot —
          // any cached instrument selection re-validates in this refresh.
          refreshLearningIdentity()
        }
      })
      .catch(() => {
        if (!cancelled) {
          console.warn('[SOM Auth] Backend unreachable — clearing session')
          setRoleVerified(false)
          logout()
        }
      })
      .finally(() => { if (!cancelled) setVerifying(false) })

    return () => { cancelled = true }
  }, [user?.email]) // re-verify when the signed-in identity changes

  // ── Flush queued evidence on app start (evidenceClient re-checks identity) ──
  useEffect(() => {
    flushEvidenceQueue()
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current) }
  }, [])

  // ── M1 R1 learning identity exposed to every surface ──
  // evidence writes require: learning_identity_ready AND an effective
  // instrument (resolved, or explicitly selected out of owned_instruments).
  // unresolved / selection-pending / retryable-error states must NOT write.
  const learningIdentity = useMemo(() => ({
    user_id: identity.user_id,
    student_record_id: identity.student_record_id,
    student_instrument_id: identity.student_instrument_id,
    role: identity.role,
    identity_status: identity.identity_status,
    selection_required: identity.selection_required,
    owned_instruments: identity.owned_instruments,
    selected_student_instrument_id: identity.selected_student_instrument_id,
    learning_identity_ready: identity.learning_identity_ready,
    learning_identity_retryable_error: identity.learning_identity_retryable_error,
  }), [identity])

  const evidenceStudentInstrumentId = useMemo(() => effectiveInstrumentId(identity), [identity])
  const evidenceReady = identity.learning_identity_ready && !!evidenceStudentInstrumentId

  return (
    <AuthContext.Provider value={{
      user, login, logout, updateUser, verifying, roleVerified,
      learningIdentity,
      evidenceStudentInstrumentId,
      evidenceReady,
      selectInstrument,
      clearInstrumentSelection,
      refreshLearningIdentity,
      retryLearningIdentity,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
