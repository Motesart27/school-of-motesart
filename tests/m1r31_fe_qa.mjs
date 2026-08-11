/**
 * m1r31_fe_qa.mjs — M1 R3.1-FE Codex remaining frontend closure QA.
 *
 * HONEST SCOPE NOTE: the prior QA suites (m1r3_fe_qa.mjs, m1r2_fe1_qa.mjs,
 * m1r2_fe_qa.mjs, m1r1_qa.mjs, m1r11_qa.mjs) drive a real Chromium browser via
 * Playwright against a vite-preview build with mocked network routes. That is
 * the right tool for DOM-level adversarial coverage (percentage-bar absence,
 * retry-button clicks, mobile viewports, network request auditing). This
 * worktree does not have `playwright` installed — it is not declared in
 * package.json and no browser binaries are present — so those suites, and a
 * from-scratch DOM/network suite in the same style, CANNOT be executed here.
 * Installing Playwright + Chromium is a real dependency/environment change
 * that was not authorized for this closure package (Hard Rule 7: no silent
 * dependency changes), so it was not done.
 *
 * What THIS file does instead: reproduce-before-repair unit coverage over the
 * REAL, unmodified pure-logic modules that back the safety-critical fixes in
 * this package, run directly under Node (no browser). Each case is annotated
 * with the adversarial-coverage item number(s) from the M1 R3.1-FE spec it
 * exercises. Items that are inherently DOM/network/browser-only (mobile
 * viewport overflow, retry-button click flows, live network request auditing,
 * component crash reproduction) are listed at the bottom as NOT COVERED here
 * and require the Playwright suites once that dependency is available.
 *
 * Usage: node tests/m1r31_fe_qa.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import * as esbuild from 'esbuild'

const ROOT = resolve(import.meta.dirname, '..')

let pass = 0
let fail = 0
const failures = []

function check(id, desc, cond) {
  if (cond) {
    pass++
  } else {
    fail++
    failures.push(`${id}: ${desc}`)
    console.error(`FAIL ${id} — ${desc}`)
  }
}

// esbuild-BUNDLE a source file (and its whole real import graph) so it can be
// imported under plain Node: `import.meta.env.*` (Vite-only) is stubbed via
// `define`, and bundling resolves every relative import (./wylEvolution.js,
// ./api.js, …) into one file, so no separate module-resolution shim is
// needed. Runs the REAL file content end-to-end — only the Vite env
// injection is stubbed. Written to a throwaway temp file (import() needs a
// real specifier) and deleted immediately after.
async function importViteModule(relPath, envStub = {}) {
  const abs = resolve(ROOT, relPath)
  const define = { 'import.meta.env': '{}' }
  for (const [k, v] of Object.entries(envStub)) {
    if (v !== undefined) define[`import.meta.env.${k}`] = JSON.stringify(v)
  }
  const result = await esbuild.build({
    entryPoints: [abs], bundle: true, write: false, format: 'esm',
    platform: 'browser', define,
  })
  const tmpPath = resolve(dirname(abs), `__qa_tmp_${basename(abs)}`)
  writeFileSync(tmpPath, result.outputFiles[0].text, 'utf8')
  try {
    return await import(`${tmpPath}?t=${Date.now()}`)
  } finally {
    unlinkSync(tmpPath)
  }
}

async function main() {
  // ─── Gate 1 two-proof evaluator (ownershipGovernance.js) — pure module,
  // no import.meta usage, imported directly. Covers spec items 31-34. ───────
  const { ownershipExplanationPasses } = await import(resolve(ROOT, 'src/components/gate0/ownershipGovernance.js'))

  // The real production ownership question from public/lesson_data/L01_skip_and_together.json
  const lessonJson = JSON.parse(readFileSync(resolve(ROOT, 'public/lesson_data/L01_skip_and_together.json'), 'utf8'))
  const ownershipQ = lessonJson.gate_steps.step_6_quiz_it.questions.find(q => q.is_ownership_gate === true)
  check('Q31', 'exactly one is_ownership_gate question exists in the real lesson JSON', !!ownershipQ)

  check('Q31', 'Together-only answer FAILS the two-proof gate',
    ownershipExplanationPasses(ownershipQ, 'Together has no note between them.') === false)
  check('Q32', 'Skip-only answer FAILS the two-proof gate',
    ownershipExplanationPasses(ownershipQ, 'Skip has one note between them.') === false)
  check('Q34', 'Together+Skip two-proof answer PASSES',
    ownershipExplanationPasses(ownershipQ, 'Together has no note between them, while Skip has one note between.') === true)
  check('Q33', '"there is no note between" (generic, unnamed) FAILS — no overlapping-substring false pass',
    ownershipExplanationPasses(ownershipQ, 'There is no note between.') === false)
  check('Q33b', 'reordered dual proof still PASSES (order-independent)',
    ownershipExplanationPasses(ownershipQ, 'Skip has one note between, and together has no note between.') === true)
  check('Q33c', 'empty/garbage answer FAILS', ownershipExplanationPasses(ownershipQ, 'idk') === false)
  check('Q33d', 'null question fails closed (no crash)', ownershipExplanationPasses(null, 'anything') === false)

  // ─── Legacy concept alias resolution (lock_package_bridge_config.js) —
  // pure module. Covers items 11-14, 40-41 (concept-validity half). ────────
  const { validateConceptId, CONCEPT_ID_MAP } = await import(resolve(ROOT, 'src/lesson_engine/lock_package_bridge_config.js'))

  check('Q11a', 'C_HALFWHOLE normalizes to the registered canonical T_HALF_STEP',
    validateConceptId('C_HALFWHOLE').canonical === 'T_HALF_STEP' && validateConceptId('C_HALFWHOLE').valid === true)
  check('Q11b', 'raw URL concept "C_HALFWHOLE" is NOT itself the canonical id (alias substitution detectable by callers)',
    'C_HALFWHOLE' !== validateConceptId('C_HALFWHOLE').canonical)
  check('Q14', 'canonical T_HALF_STEP (exact form) validates valid + unchanged (no alias substitution)',
    validateConceptId('T_HALF_STEP').valid === true && validateConceptId('T_HALF_STEP').canonical === 'T_HALF_STEP')
  check('Q12', 'T_FIND_HOME is NOT a registered/valid canonical concept',
    validateConceptId('T_FIND_HOME').valid === false)
  check('Q13a', 'T_SKIP_AND_TOGETHER is NOT a registered/valid canonical concept',
    validateConceptId('T_SKIP_AND_TOGETHER').valid === false)
  check('Q13b', 'T_SKIP_TOGETHER is NOT a registered/valid canonical concept',
    validateConceptId('T_SKIP_TOGETHER').valid === false)
  check('Q13c', 'T_SKIP_TOGETHER is not a value anywhere in the alias→canonical map',
    !Object.values(CONCEPT_ID_MAP).includes('T_SKIP_TOGETHER'))

  // ─── Gate governance mapping (gateEvidenceAdapter.js) — needs import.meta
  // stub. Covers items 35-37 (numbering), 40-41 (no fabricated gate ids),
  // 42-43 (gate evidence OFF by default). ──────────────────────────────────
  const gateAdapter = await importViteModule('src/components/gate0/gateEvidenceAdapter.js', { VITE_GATE_EVIDENCE: undefined })
  check('Q35', 'Gate 0 (find_home) maps to the ratified T_TONIC_RECOGNITION',
    gateAdapter.GATE_CANONICAL_CONCEPTS.find_home === 'T_TONIC_RECOGNITION')
  check('Q36', 'Gate 1 (skip_and_together) has NO single substitute concept id (dual-proof, never one id)',
    gateAdapter.GATE_CANONICAL_CONCEPTS.skip_and_together === null)
  check('Q37', 'Gate 2 (major_scale_pattern) maps to T_MAJOR_SCALE_PATTERN',
    gateAdapter.GATE_CANONICAL_CONCEPTS.major_scale_pattern === 'T_MAJOR_SCALE_PATTERN')
  check('Q40', 'no live canonical T_SKIP_TOGETHER authority anywhere in the gate mapping',
    !Object.values(gateAdapter.GATE_CANONICAL_CONCEPTS).includes('T_SKIP_TOGETHER'))
  check('Q41', 'no live canonical T_FIND_HOME authority (Gate 0 uses T_TONIC_RECOGNITION, not T_FIND_HOME)',
    !Object.values(gateAdapter.GATE_CANONICAL_CONCEPTS).includes('T_FIND_HOME'))
  check('Q42', 'gate evidence adapter defaults OFF (VITE_GATE_EVIDENCE unset) — held, no network call',
    gateAdapter.GATE_EVIDENCE_ENABLED === false)
  {
    const held = await gateAdapter.gateEvidenceAdapter({ concept: 'major_scale_pattern', ownershipPassed: true, executionScore: 100 })
    check('Q42b', 'calling gateEvidenceAdapter() with the flag off returns held:true and submits nothing',
      held.held === true && held.submitted === false)
  }

  // ─── Evidence client primitives (evidenceClient.js) — needs import.meta
  // stub. Covers items 3, 48, 49 (idempotent client_event_id, canonical
  // assignment id format). ─────────────────────────────────────────────────
  const evidenceClient = await importViteModule('src/services/evidenceClient.js', { VITE_API_URL: 'https://example.invalid' })
  check('Q48a', 'isCanonicalAssignmentId accepts the exact rec… shape',
    evidenceClient.isCanonicalAssignmentId('recMNA00000000001') === true)
  check('Q48b', 'isCanonicalAssignmentId rejects a legacy numeric id',
    evidenceClient.isCanonicalAssignmentId('12345') === false)
  check('Q48c', 'isCanonicalAssignmentId rejects a C_ alias id',
    evidenceClient.isCanonicalAssignmentId('C_HALFWHOLE') === false)
  {
    const id1 = evidenceClient.newClientEventId()
    const id2 = evidenceClient.newClientEventId()
    check('Q3', 'newClientEventId produces distinct ids by default (callers must explicitly pin one to retry idempotently)',
      id1 !== id2 && typeof id1 === 'string' && id1.length > 0)
  }

  // ─── Article XIII tier transforms (practiceLogApi.js) — needs import.meta
  // stub. Covers item 47 (student-safe payload never numerically
  // reconstructed) at the transform-function level. ───────────────────────
  const practiceLogApi = await importViteModule('src/services/practiceLogApi.js', { VITE_API_URL: 'https://example.invalid' })
  {
    const studentSafeSession = practiceLogApi.transformSession({
      log_id: 'log1', title: 'C Major', practiced_at: null, activity_type: 'homework',
      duration_min: 20, accuracy_tier: 'owned', self_rating: 'ok', dpm: null, source: 'school',
    })
    check('Q47a', 'student-safe session (accuracy_tier present, dpm:null) renders tier language, never a raw %',
      studentSafeSession.acc === 'Owned it' && !/%/.test(String(studentSafeSession.acc)))
    check('Q47b', 'withheld DPM (dpm:null) stays null — never reconstructed as 0',
      studentSafeSession.d === null && studentSafeSession.p === null && studentSafeSession.m === null)

    const studentSafePeriod = practiceLogApi.transformPeriod({
      trend: { labels: ['Mon'], all: [10], homework: [10], sheet_music: [0], games: [0], live_practice: [0] },
      breakdown: {}, consistency_days: 1, consistency_total: 7, dpm: null,
      piece_progress: [{ name: 'C Major Scale', sessions: 3, accuracy_tier: 'almost_owned' }],
      personal_bests: {},
    })
    check('Q47c', 'student-safe period keeps dpm:null (never a fabricated zero)', studentSafePeriod.dpm === null)
    check('Q47d', 'student-safe piece meta renders tier language, not a raw accuracy %',
      /Almost there/.test(studentSafePeriod.pieces[0].meta) && !/%/.test(studentSafePeriod.pieces[0].meta))
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${pass}/${pass + fail} passed`)
  if (failures.length) {
    console.log('\nFailures:')
    failures.forEach(f => console.log('  - ' + f))
  }

  console.log(`
NOT COVERED by this Node-only unit run (require the Playwright browser
suites, which cannot execute in this environment — see header):
  1,2,4-10 (Practice Live retry/navigation-timing DOM flows)
  8,9,10 (zero/one-attempt Game DOM flows, repeated End Game)
  15,16 (CurriculumPath live-vs-cache DOM rendering)
  17-25 (DOM absence-of-percentage checks across /tami, PracticeLogPage,
         SessionSummary, StudentDashboard — the underlying source fixes are
         in place and reviewed; only the rendered-DOM assertion is unverified)
  26-30 (StudentDashboard Game-toggle crash reproduction, founder/teacher/
         student routing — requires a mounted router + auth context)
  38,39 (Gate 2 label consistency across rendered UI copy)
  44 (/student?email= — confirmed via static grep: zero occurrences in src/)
  45,46 (TAMi 503/403 DOM rendering)
  50,51 (mobile viewport overflow, exact off-baseline diff)

Reproduce-before-repair note: Q31-Q34 (Gate 1 two-proof) were run against
the ORIGINAL (pre-fix) ownershipGovernance.js during investigation and
Q31/Q33 FAILED there (the "note between" skip-group signal is a substring of
the together-group's "no note between", so a Together-only or unnamed answer
falsely passed both groups). They pass here against the fixed evaluator.
`)

  process.exit(fail === 0 ? 0 : 1)
}

main().catch(err => {
  console.error('QA harness crashed:', err)
  process.exit(1)
})
