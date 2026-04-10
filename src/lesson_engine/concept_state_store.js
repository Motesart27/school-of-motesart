/**
 * concept_state_store.js
 * Singleton shared state store for Concept_State.
 * Written by perception bridge during practice.
 * Read by CurriculumPath (student) and ConceptHealth (teacher).
 * Persists to localStorage so state survives page navigation.
 */

const STORAGE_KEY = 'som_concept_states'
const STUDENT_KEY = 'som_student_id'

let _states = {}
let _listeners = []
let _loaded = false

function _loadFromStorage() {
  if (_loaded) return
  _loaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      _states = JSON.parse(raw)
    }
  } catch (e) {
    console.warn('[ConceptStateStore] Failed to load from storage:', e)
  }
}

function _saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_states))
  } catch (e) {
    console.warn('[ConceptStateStore] Failed to save to storage:', e)
  }
}

function _notify(conceptId, state) {
  _listeners.forEach(fn => {
    try { fn(conceptId, state) } catch (e) { console.warn('[ConceptStateStore] Listener error:', e) }
  })
}

/**
 * Get state for a single concept.
 * Returns null if no state recorded.
 */
export function getState(conceptId) {
  _loadFromStorage()
  return _states[conceptId] || null
}

/**
 * Get all concept states as a map { concept_id: state }.
 * This is the format getStudentCurriculumView expects.
 */
export function getAllStates() {
  _loadFromStorage()
  return { ..._states }
}

/**
 * Get all states as an array wrapped in an array (one student).
 * This is the format getTeacherConceptHealthView expects: [{ T_HALF_STEP: {...}, ... }]
 */
export function getStatesForTeacherView() {
  _loadFromStorage()
  return Object.keys(_states).length > 0 ? [{ ..._states }] : []
}

/**
 * Write state for a concept. Called by perception bridge.
 * Merges with existing state (does not replace).
 */
export function setState(conceptId, state) {
  _loadFromStorage()
  const existing = _states[conceptId] || {}
  _states[conceptId] = { ...existing, ...state, concept_id: conceptId, last_updated: new Date().toISOString() }
  _saveToStorage()
  _notify(conceptId, _states[conceptId])
}

/**
 * Replace full state for a concept (used by perception flush).
 */
export function replaceState(conceptId, state) {
  _loadFromStorage()
  _states[conceptId] = { ...state, concept_id: conceptId, last_updated: new Date().toISOString() }
  _saveToStorage()
  _notify(conceptId, _states[conceptId])
}

/**
 * Subscribe to state changes. Returns unsubscribe function.
 */
export function subscribe(callback) {
  _listeners.push(callback)
  return () => {
    _listeners = _listeners.filter(fn => fn !== callback)
  }
}

/**
 * Get current student ID from storage.
 */
export function getStudentId() {
  try {
    return localStorage.getItem(STUDENT_KEY) || 'default_student'
  } catch (e) {
    return 'default_student'
  }
}

/**
 * Set student ID.
 */
export function setStudentId(id) {
  try {
    localStorage.setItem(STUDENT_KEY, id)
  } catch (e) {
    console.warn('[ConceptStateStore] Failed to save student ID:', e)
  }
}

/**
 * Clear all state (for testing/reset).
 */
export function clearAll() {
  _states = {}
  _loaded = true
  _saveToStorage()
  _notify(null, null)
}

export default {
  getState,
  getAllStates,
  getStatesForTeacherView,
  setState,
  replaceState,
  subscribe,
  getStudentId,
  setStudentId,
  clearAll
}
