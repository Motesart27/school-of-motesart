/**
 * lessonDataLoader.js
 * Loads and validates SOM lesson JSON files from public/lesson_data/
 * Used by Gate 0 and all future gate components.
 */

const LESSON_BASE = '/lesson_data/'

const cache = {}

export async function loadLesson(lessonId) {
  if (cache[lessonId]) return cache[lessonId]

  const url = `${LESSON_BASE}${lessonId}.json`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Lesson not found: ${lessonId} (${resp.status})`)

  const data = await resp.json()

  // Validate required top-level keys
  const required = ['concept_id', 'gate', 'teach', 'proof', 'mistake_detection', 'wyl_interventions', 'mastery_rule']
  for (const key of required) {
    if (!(key in data)) throw new Error(`Lesson ${lessonId} missing required key: ${key}`)
  }

  cache[lessonId] = data
  return data
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k])
}
