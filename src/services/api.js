const API_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'

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
    const error = new Error(err.detail || 'Session expired')
    error.status = 401
    throw error
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    const error = new Error(err.detail || 'Request failed')
    error.status = res.status
    throw error
  }

  return res.json()
}

export const api = {
  // ─── Auth ────────────────────────────────────────────────────
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Accepts a single data object: { name, email, password, role, avatar, wyl, instrument, genre, song, experience }
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  verifySession: () => request('/auth/verify'),

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
      method: "POST",
      body: JSON.stringify({
        event_type: eventType,
        ...data,
      }),
    }),


  // ─── Students ───────────────────────────────────────────────
  getStudents: () => request('/students'),
  getStudentByEmail: (email) => request(`/student?email=${encodeURIComponent(email)}`),

  // ─── Practice ───────────────────────────────────────────────
  getPracticeLogs: (studentId) =>
    request(`/practice-logs?student_id=${encodeURIComponent(studentId)}`),
  logPractice: (data) =>
    request('/practice-logs', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Homework ───────────────────────────────────────────────
  getHomework: (studentId) =>
    request(`/homework?student_id=${encodeURIComponent(studentId)}`),

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

  wake: () => fetch(`${API_URL}/`).then(r => r.json()),
}

export default api
