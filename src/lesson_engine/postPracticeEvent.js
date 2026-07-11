import { getStudentId } from './concept_state_store.js'

const API_BASE = 'https://motesart-converter.netlify.app'

export function postPracticeEvent(payload) {
  const studentId = getStudentId()
  if (!studentId) {
    console.warn('[identity] no real student id — event not sent', {
      concept_id: payload.concept_id,
      chapter: payload.chapter,
    })
    return Promise.resolve({ skipped: true, reason: 'no_student_id' })
  }

  return fetch(API_BASE + '/api/practice-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, student_instrument_id: studentId }),
  })
}
