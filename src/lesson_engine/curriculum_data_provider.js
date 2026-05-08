
// v2.0 - phase + state normalization for pilot loop
/**
 * curriculum_data_provider.js
 * Loads curriculum JSON files from /lesson_data/ and provides
 * them to UI components with normalized field names.
 */

import {
  normalizeConceptId,
  isPilotConcept,
  PILOT_CONCEPT_IDS,
  PHASE_MAP,
  FEEL_MODE_GATES,
  MASTERY_THRESHOLDS,
} from './lock_package_bridge_config.js'

let _cache = null
let _loading = null

async function loadCurriculumFiles() {
  if (_cache) return _cache
  if (_loading) return _loading
  _loading = (async () => {
    const base = '/lesson_data/'
    const [traditional, fastCurriculum, numberSystem, crosswalk] = await Promise.all([
      fetch(base + 'traditional_registry_v1_1.json').then(r => r.json()),
      fetch(base + 'motesart_fast_curriculum_v2_0.json').then(r => r.json()),
      fetch(base + 'motesart_number_system_source_v1_0.json').then(r => r.json()),
      fetch(base + 'curriculum_crosswalk_matrix.json').then(r => r.json()),
    ])
    _cache = { traditional, fastCurriculum, numberSystem, crosswalk }
    _loading = null
    return _cache
  })()
  return _loading
}

export async function getCurriculumData() {
  return loadCurriculumFiles()
}

export async function getConceptById(conceptId) {
  const normalized = normalizeConceptId(conceptId)
  const data = await loadCurriculumFiles()
  const concepts = data.traditional.concepts || data.traditional
  if (Array.isArray(concepts)) {
    return concepts.find(c => normalizeConceptId(c.concept_id || c.id) === normalized)
  }
  return concepts[normalized] || null
}

export async function getPhaseData(phaseNum) {
  const data = await loadCurriculumFiles()
  const phases = data.fastCurriculum.phases || data.fastCurriculum
  if (Array.isArray(phases)) {
    return phases.find(p => (p.phase_number || p.num) === phaseNum)
  }
  return null
}

export async function getAllPhases() {
  const data = await loadCurriculumFiles()
  return data.fastCurriculum.phases || data.fastCurriculum || []
}

export async function getAllConcepts() {
  const data = await loadCurriculumFiles()
  const concepts = data.traditional.concepts || data.traditional || []
  return Array.isArray(concepts) ? concepts : Object.values(concepts)
}

export async function getStudentCurriculumView(perceptionStates = {}) {
  const data = await loadCurriculumFiles()
  const phases = data.fastCurriculum.phases || data.fastCurriculum || []

  const normalizedPhases = (Array.isArray(phases) ? phases : []).map(p => ({
    id: p.phase_id || p.id || '',
    num: p.phase_number || p.num || 0,
    name: p.label || p.name || '',
    desc: p.description || p.desc || '',
    concepts: p.concepts || [],
    pilot_concepts: p.pilot_concepts || [],
    grade_band: p.grade_band || null,
    prerequisite_phase: p.prerequisite_phase || null,
  }))

  const conceptStates = {}
  const allConcepts = data.traditional.concepts || data.traditional || []
  const conceptList = Array.isArray(allConcepts) ? allConcepts : Object.values(allConcepts)

  conceptList.forEach(concept => {
    const id = normalizeConceptId(concept.concept_id || concept.id)
    if (!id) return
    const live = perceptionStates[id]
    conceptStates[id] = {
      concept_id: id,
      display_name: concept.display_name || concept.name || id,
      status: live?.ownership_state || live?.status || 'introduced',
      ownership_state: live?.ownership_state || 'introduced',
      confidence: live?.confidence || 0.5,
      attempts: live?.attempts || 0,
      correct_streak: live?.correct_streak || 0,
      phase: PHASE_MAP[id] || null,
      is_pilot: isPilotConcept(id),
      feelModes: {
        A: live?.feel_mode_a_passed || live?.feelModes?.A || false,
        B: live?.feel_mode_b_passed || live?.feelModes?.B || false,
        C: live?.feel_mode_c_passed || live?.feelModes?.C || false,
      },
      evidence_summary: live?.evidence_summary || null,
    }
  })

  const stateValues = Object.values(conceptStates)
  const owned = stateValues.filter(s => s.status === 'owned').length
  const practicing = stateValues.filter(s =>
    s.status === 'practicing' || s.status === 'accurate_with_support' || s.status === 'accurate_without_support'
  ).length

  return {
    phases: normalizedPhases,
    conceptStates,
    summary: {
      totalConcepts: stateValues.length,
      owned,
      practicing,
      introduced: stateValues.filter(s => s.status === 'introduced').length,
      pilotConcepts: stateValues.filter(s => s.is_pilot).length,
      overallConfidence: stateValues.length > 0
        ? stateValues.reduce((sum, s) => sum + s.confidence, 0) / stateValues.length
        : 0,
    },
  }
}

export async function getTeacherConceptHealthView(studentStates = []) {
  const data = await loadCurriculumFiles()
  const allConcepts = data.traditional.concepts || data.traditional || []
  const conceptList = Array.isArray(allConcepts) ? allConcepts : Object.values(allConcepts)

  const conceptHealth = conceptList.map(concept => {
    const id = normalizeConceptId(concept.concept_id || concept.id)
    let avgConfidence = 0.5
    let studentsOwned = 0
    let studentsPracticing = 0
    let studentsIntroduced = 0

    if (studentStates.length > 0) {
      const states = studentStates.map(s => s[id]).filter(Boolean)
      if (states.length > 0) {
        avgConfidence = states.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / states.length
        studentsOwned = states.filter(s => (s.ownership_state || s.status) === 'owned').length
        studentsPracticing = states.filter(s => {
          const st = s.ownership_state || s.status
          return st === 'practicing' || st === 'accurate_with_support' || st === 'accurate_without_support'
        }).length
        studentsIntroduced = states.filter(s => (s.ownership_state || s.status) === 'introduced').length
      }
    }

    return {
      concept_id: id,
      display_name: concept.display_name || concept.name || id,
      motesart_language: concept.motesart_language || '',
      grade_band: concept.grade_band || '',
      fast_phase: concept.fast_phase || '',
      is_pilot: isPilotConcept(id),
      mistake_tags_expected: concept.mistake_tags_expected || 'not_modeled_yet',
      avgConfidence,
      studentsOwned,
      studentsPracticing,
      studentsIntroduced,
      totalStudents: studentStates.length,
      evidence_summary: concept.evidence_summary || null,
    }
  })

  return {
    conceptHealth,
    studentStates,
    summary: {
      totalConcepts: conceptHealth.length,
      pilotConcepts: conceptHealth.filter(c => c.is_pilot).length,
      avgConfidence: conceptHealth.length > 0
        ? conceptHealth.reduce((sum, c) => sum + c.avgConfidence, 0) / conceptHealth.length
        : 0,
    },
  }
}

export function getFeelModeStatus(conceptId, perceptionState) {
  const id = normalizeConceptId(conceptId)
  const conf = perceptionState?.confidence || 0
  return {
    A: {
      label: 'With Visual Support',
      threshold: 0.85,
      passed: perceptionState?.feel_mode_a_passed || perceptionState?.feelModes?.A || false,
      current: conf,
    },
    B: {
      label: 'Without Support',
      threshold: 0.85,
      passed: perceptionState?.feel_mode_b_passed || perceptionState?.feelModes?.B || false,
      current: conf,
    },
    C: {
      label: 'Transfer / New Context',
      threshold: 0.80,
      passed: perceptionState?.feel_mode_c_passed || perceptionState?.feelModes?.C || false,
      current: conf,
    },
  }
}
