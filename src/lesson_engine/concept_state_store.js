/**
 * concept_state_store.js
 * LOCAL CACHE ONLY (demoted under M1 — the canonical Concept_State lives on
 * the backend behind /concept-state/{student_instrument_id}/{concept_id}).
 *
 * - Namespaced per real student_instrument_id (no 'default_student', ever).
 * - Written as a cache by practice surfaces; the server write path is
 *   src/services/evidenceClient.js.
 * - readThroughState() prefers server state when online and falls back to
 *   this cache when offline/unreachable.
 * Persists to localStorage so the cache survives page navigation.
 */

import { fetchConceptState } from '../services/evidenceClient.js'

const STORAGE_KEY_BASE = 'som_concept_states'
const STUDENT_KEY = 'som_student_id'

let _states = {}
let _listeners = []
let _loaded = false
let _loadedKey = null

/**
 * Cache namespace key. With a resolved identity: som_concept_states::<si_id>.
 * Without one, the legacy anonymous key is used for reads only — it is never
 * attributed to a student and never sent anywhere.
 */
function _storageKey() {
  const si = getStudentId()
  return si ? `${STORAGE_KEY_BASE}::${si}` : STORAGE_KEY_BASE
}

function _loadFromStorage() {
  const key = _storageKey()
  if (_loaded && _loadedKey === key) return
  _loaded = true
  _loadedKey = key
  _states = {}
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      _states = JSON.parse(raw)
    }
  } catch (e) {
    console.warn('[ConceptStateStore] Failed to load from storage:', e)
  }
}

function _saveToStorage() {
  try {
    localStorage.setItem(_storageKey(), JSON.stringify(_states))
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
 * Get current student_instrument_id from storage.
 * M1: NO 'default_student' fallback — unresolved identity returns null and
 * callers must skip evidence/attribution rather than invent an identity.
 */
export function getStudentId() {
  try {
    return localStorage.getItem(STUDENT_KEY) || null
  } catch (e) {
    return null
  }
}

/**
 * Set (or clear) the student_instrument_id. Passing null/undefined clears it.
 * Switching identity swaps the cache namespace on next access.
 */
export function setStudentId(id) {
  try {
    if (id) {
      localStorage.setItem(STUDENT_KEY, id)
    } else {
      localStorage.removeItem(STUDENT_KEY)
    }
  } catch (e) {
    console.warn('[ConceptStateStore] Failed to save student ID:', e)
  }
  // Force a namespace reload so no state bleeds across identities
  _loaded = false
  _loadedKey = null
}

/**
 * Read-through helper (M1): prefer canonical server state when online,
 * fall back to the local cache when offline or the server is unreachable.
 * Successful server reads refresh the local cache.
 */
export async function readThroughState(conceptId) {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine
  if (online) {
    const serverState = await fetchConceptState(conceptId)
    if (serverState && typeof serverState === 'object') {
      setState(conceptId, { ...serverState, _source: 'server' })
      return getState(conceptId)
    }
  }
  return getState(conceptId)
}

/**
 * Clear all state (for testing/reset).
 */
export function clearAll() {
  _states = {}
  _loaded = true
  _loadedKey = _storageKey()
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
  readThroughState,
  clearAll
}
