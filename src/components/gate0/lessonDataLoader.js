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

  // Schema validation — supports v1 (root concept_id) and v2 (_meta.concept_id)
  const hasMeta = '_meta' in data && 'concept_id' in data._meta
  const hasRoot = 'concept_id' in data
  if (!hasMeta && !hasRoot) {
    throw new Error(`Lesson ${lessonId} missing concept_id in _meta or root`)
  }
  const required = ['mastery_rule', 'wyl_interventions', 'mistake_detection']
  for (const key of required) {
    if (!(key in data)) throw new Error(`Lesson ${lessonId} missing required key: ${key}`)
  }

  cache[lessonId] = data
  return data
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k])
}
