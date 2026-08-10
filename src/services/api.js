const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'

function parseDetail(detail, fallbackMsg, defaultMsg) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(e => e.msg || JSON.stringify(e)).join('; ')
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return fallbackMsg || defaultMsg || 'Request failed'
}

async function request(path, options = {}) {
  const token = localStorage.getItem('som_token')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let res
  try {
    const url = path.startsWith('/api/') ? path : `${API_URL}${path}`
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      const error = new Error('Request timed out')
      error.status = 0
      throw error
    }
    throw err
  }
  clearTimeout(timeout)

  if (res.status === 401) {
    localStorage.removeItem('som_token')
    localStorage.removeItem('som_user')
    window.dispatchEvent(new CustomEvent('som:force-logout'))
    const err = await res.json().catch(() => ({ detail: 'Session expired' }))
    const error = new Error(parseDetail(err.detail, err.message, 'Session expired'))
    error.status = 401
    throw error
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    const error = new Error(parseDetail(err.detail, err.message, 'Request failed'))
    error.status = res.status
    throw error
  }

  return res.json()
}

export const api = {
  // ─── Auth ────────────────────────────────────────────────────
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  verifySession: () => request('/auth/verify'),

  // ─── M1 R1 canonical learning identity ──────────────────────
  // JWT-resolved server-side. The ONLY academic identity source.
  // (The legacy /student?email= lookup is removed — email never
  // resolves student records, instruments, or evidence ownership.)
  getLearningIdentity: () => request('/auth/learning-identity'),

  // ─── WYL ─────────────────────────────────────────────────────
  submitWYL: (userId, wylData) =>
    request('/students/wyl', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...wylData }),
    }),

  updateWYL: (userId, wylData) =>
    request(`/students/${encodeURIComponent(userId)}/wyl`, {
      method: 'PUT',
      body: JSON.stringify(wylData),
    }),

  updateWYLFromBehavior: (userId, eventType, data) =>
    request(`/students/${userId}/wyl/update-from-behavior`, {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, ...data }),
    }),

  // ─── Students ───────────────────────────────────────────────
  getStudents: () => request('/students'),

  // ─── Practice ───────────────────────────────────────────────
  getPracticeLogs: (studentId) =>
    request(`/practice-logs?student_id=${encodeURIComponent(studentId)}`),
  logPractice: (data) =>
    request('/practice-logs', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Homework ───────────────────────────────────────────────
  // M1 R1 canonical serializer: assignment_id IS the Airtable rec… id
  // (the only completion/evidence linkage key); assignment_number is
  // the Autonumber display value and never identifies anything.
  // M1 R1.1: for a multi-instrument identity the canonical SELECTED
  // Student Instruments record travels as ?student_instrument_id=<rec…>
  // (encoded). The backend authorizes it with the SAME R1 identity
  // authority: 403 wrong_student · 409 selection_required · 503 retryable.
  getMyAssignments: (studentInstrumentId) =>
    request(
      studentInstrumentId
        ? `/assignments/mine?student_instrument_id=${encodeURIComponent(studentInstrumentId)}`
        : '/assignments/mine'
    ),

  // M1 R1: the student's current active assignment. Explicit contract:
  // { has_active_assignment: true,  assignment: {…canonical serializer…} }
  // { has_active_assignment: false, assignment: null }
  // 403 wrong_student → fail closed · 503 → retryable, never permanent.
  getActiveAssignment: (studentInstrumentId) =>
    request(`/concept-state/${encodeURIComponent(studentInstrumentId)}/active-assignment`),

  getHomework: (studentName) =>
    request(`/assignments/student/${encodeURIComponent(studentName)}`),

  createAssignment: (data) =>
    request('/assignments', { method: 'POST', body: JSON.stringify(data) }),

  logPracticeSession: (data) =>
    request('/practice-log/sessions', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Sessions ───────────────────────────────────────────────
  getSessions: (studentId) =>
    request(`/sessions?student_id=${encodeURIComponent(studentId)}`),

  // ─── T.A.M.i Chat ───────────────────────────────────────────
  chatWithTami: (studentName, message, conversationHistory = [], currentPage = '', userRole = '', userId = '') =>
    request('/api/tami/chat', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentName,
        user_id: userId,
        message,
        conversation_history: conversationHistory,
        current_page: currentPage,
        user_role: userRole,
      }),
    }),

  chatWithTamiVoice: (studentName, message, conversationHistory = [], currentPage = '', userRole = '', userId = '') =>
    request('/api/tami/chat/voice', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentName,
        user_id: userId,
        message,
        conversation_history: conversationHistory,
        current_page: currentPage,
        user_role: userRole,
      }),
    }),

  tamiWeeklyReview: (studentName) =>
    request('/tami/weekly-review', { method: 'POST', body: JSON.stringify({ student_name: studentName }) }),

  // ─── T.A.M.i History ─────────────────────────────────────────
  loadTamiHistory: async (userId) => {
    try {
      const data = await request(`/tami/history/${encodeURIComponent(userId)}`)
      const messages = JSON.parse(data.messages_json || '[]').filter(m => !m.isLoading)
      const history = JSON.parse(data.history_json || '[]').filter(m => !m.isLoading)
      return { messages, history, message_count: data.message_count || 0 }
    } catch {
      return { messages: [], history: [], message_count: 0 }
    }
  },

  saveTamiHistory: (userId, messages, history) => {
    const clean = messages.filter(m => !m.isLoading)
    const cleanHistory = history.filter(m => !m.isLoading)
    request('/tami/history', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        messages_json: JSON.stringify(clean),
        history_json: JSON.stringify(cleanHistory),
        message_count: clean.length,
      }),
    }).catch(() => {})
  },

  clearTamiHistory: (userId) => {
    request(`/tami/history/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {})
  },

  // ─── TTS ─────────────────────────────────────────────────────
  speakText: async (text, voiceType = 'coach') => {
    const railwayUrl = import.meta.env.VITE_RAILWAY_URL
    const ttsUrl = railwayUrl
      ? `${railwayUrl}/api/tts/speak`
      : '/api/tts/speak'

    console.log('[TTS] Calling:', ttsUrl, '| text:', text.substring(0, 60))

    let res
    try {
      res = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceType }),
      })
    } catch (networkErr) {
      console.warn('[TTS] Network error — Railway may be sleeping:', networkErr.message)
      throw networkErr
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[TTS] Failed — status ${res.status} | url: ${ttsUrl} | body: ${body.substring(0, 200)}`)
      throw new Error(`TTS failed: ${res.status}`)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play()
    return new Promise(resolve => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.onerror = (e) => {
        console.warn('[TTS] Audio playback error:', e)
        URL.revokeObjectURL(url)
        resolve()
      }
    })
  },

  wake: () => fetch(`${API_URL}/`).then(r => r.json()),
}

export default api
