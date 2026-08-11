/**
 * m1r31_fe_qa.mjs — M1 R3.1-FE Codex remaining frontend closure QA.
 *
 * PART 1 (below): Node-only unit coverage over the REAL, unmodified pure-
 * logic modules backing the safety-critical fixes (Gate 1 two-proof, legacy
 * alias rejection, gate governance mapping, gate-evidence-off default,
 * evidence idempotency, Article XIII tier transforms).
 *
 * PART 2: browser/DOM/network coverage via Playwright + a vite-preview build
 * with fully mocked network routes (ZERO live backend, ZERO live Airtable),
 * modeled directly on the makeContext() pattern already used by
 * tests/m1r3_fe_qa.mjs. Playwright itself is NOT a project dependency
 * (package.json/package-lock.json are untouched by this file); it was
 * installed to an isolated scratch directory outside the repo and resolved
 * here via a symlink at node_modules/playwright(-core) for this QA run only —
 * see the session closure report for the exact steps. No browser binaries or
 * QA artifacts are committed.
 *
 * Deep interactive flows that require simulating speech recognition / TTS
 * turn-by-turn (the full WYLPracticeLive teaching dialogue) are, consistent
 * with the existing suites' own precedent (see their Q3s/Q6s-style checks),
 * covered by STATIC SOURCE AUDITS against the real shipped file rather than
 * a full voice-driven E2E run — annotated inline where used.
 *
 * Usage: node tests/m1r31_fe_qa.mjs
 */
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { spawn } from 'node:child_process'
import * as esbuild from 'esbuild'
import { chromium } from 'playwright'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'qa-artifacts')
const SCREENS = resolve(OUT, 'm1r31-fe-screens')
mkdirSync(SCREENS, { recursive: true })

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

  // ─── Static source audits (WYLPracticeLive.jsx) — Practice Live's
  // completion-evidence durability (§A, items 1-2, 4-6, 13-14). The full
  // voice-driven teaching dialogue isn't E2E-testable here (would require
  // simulating ~10 speech-recognition turns); consistent with the existing
  // suites' own precedent for this exact file (see their Q3s/Q6s-style
  // checks), verified via regex audit against the real shipped source. ────
  const wylSrc = readFileSync(resolve(ROOT, 'src/pages/WYLPracticeLive.jsx'), 'utf8')
  {
    // The terminal guard must be set ONLY inside the result?.ok branch, not
    // before the request fires. Find the completion block and confirm the
    // guard assignment appears strictly after "if (result?.ok)".
    const blockStart = wylSrc.indexOf('if (step >= THEORY_STEPS.length)')
    const block = wylSrc.slice(blockStart, blockStart + 4000)
    const okIdx = block.indexOf('if (result?.ok)')
    const guardIdx = block.indexOf('evidenceSubmittedRef.current = true', okIdx >= 0 ? okIdx : 0)
    check('Q5', 'terminal evidenceSubmittedRef guard is set INSIDE the result?.ok success branch (not before the request)',
      blockStart !== -1 && okIdx !== -1 && guardIdx !== -1 && guardIdx > okIdx)
    check('Q6', 'completion path awaits submitPracticeLiveEvidence (no fire-and-forget .catch-only call)',
      /result = await submitPracticeLiveEvidence/.test(block))
    check('Q4', 'unresolved/selection-pending identity path (needsSelection) does not set the terminal guard',
      /needsSelection[\s\S]{0,200}setCompletionSaveState\('needs_selection'\)/.test(block) &&
      !/needsSelection[\s\S]{0,300}evidenceSubmittedRef\.current = true/.test(block))
  }
  check('Q12/Q13/Q49', 'retry reuses the SAME pinned client_event_id (evidenceClientEventIdRef), never a fresh one per attempt',
    /if \(!evidenceClientEventIdRef\.current\) evidenceClientEventIdRef\.current = newClientEventId\(\)/.test(wylSrc) &&
    /clientEventId: evidenceClientEventIdRef\.current/.test(wylSrc))
  check('Q10/Q11', 'visible retry state exists for 503/network (completionSaveState/retry banner), never a silent success',
    /setCompletionSaveState\('retry'\)/.test(wylSrc) && /data-testid=\{`practice-live-evidence-\$\{completionSaveState\}`\}/.test(wylSrc))
  check('Q14', 'navigation to the next concept only happens inside the confirmed-success branch',
    (() => {
      const blockStart = wylSrc.indexOf('if (step >= THEORY_STEPS.length)')
      const block = wylSrc.slice(blockStart, blockStart + 4000)
      const navCount = (block.match(/window\.location\.href = '\/practice-live\?concept='/g) || []).length
      // exactly two occurrences expected: the no-canonical-concept branch
      // (nothing to submit) and the confirmed-success branch — never a bare
      // unconditional one outside those branches.
      return navCount === 2
    })())

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

  console.log(`\nPart 1 (unit): ${pass}/${pass + fail} passed`)

  // ═══════════════════════════════════════════════════════════════════════
  // PART 2 — Playwright browser/DOM/network coverage
  // ═══════════════════════════════════════════════════════════════════════
  await runBrowserSuite()

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${pass}/${pass + fail} passed`)
  if (failures.length) {
    console.log('\nFailures:')
    failures.forEach(f => console.log('  - ' + f))
  }

  console.log(`
NOT COVERED (deep interactive voice-driven WYLPracticeLive dialogue is
covered by static source audits — see Q4/Q5/Q6/Q10-Q14/Q49 above — not a
full E2E run;
consistent with the existing suites' own precedent for this file).
`)

  process.exit(fail === 0 ? 0 : 1)
}

// ═════════════════════════════════════════════════════════════════════════
// PART 2 helpers + scenarios
// ═════════════════════════════════════════════════════════════════════════

const PORT = 4179
const APP = `http://localhost:${PORT}`
const API = 'https://deployable-python-codebase-som-production.up.railway.app'
const CONVERTER = 'https://motesart-converter.netlify.app'
const SINGLE = 'recSI_ALICE'
const ASG = 'recMNA00000000001'
const IDENT_RESOLVED = {
  user_id: 'recUSER_ALICE', student_record_id: 'recSTU_ALICE',
  student_instrument_id: SINGLE, role: 'student', selection_required: false,
  identity_status: 'resolved',
  owned_instruments: [{ student_instrument_id: SINGLE, instrument: 'Piano', label: 'Alice' }],
}

async function ensurePreview() {
  try { const r = await fetch(`${APP}/homework`); if (r.ok) return null } catch { /* spawn */ }
  const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore', detached: true })
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 250))
    try { const r = await fetch(`${APP}/homework`); if (r.ok) return child } catch { /* retry */ }
  }
  throw new Error('vite preview not ready on :' + PORT)
}

async function launchBrowser() {
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  try { return await chromium.launch({ args }) }
  catch { return await chromium.launch({ executablePath: process.env.QA_CHROMIUM || '/opt/pw-browsers/chromium', args }) }
}

const governanceLog = []
const converterHits = []

async function makeContext(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 800 },
    ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}),
    permissions: ['camera', 'microphone'],
  })
  const state = { evidencePosts: [], sessionPosts: [], pageErrors: [] }
  await context.addInitScript(({ user, identity }) => {
    localStorage.setItem('som_token', 'qa-token')
    localStorage.setItem('som_user', JSON.stringify(user))
    localStorage.setItem('som_learning_identity', JSON.stringify({
      ready: identity.identity_status === 'resolved',
      student_instrument_id: identity.student_instrument_id,
    }))
  }, {
    user: opts.user || { id: 'recUSER_ALICE', email: 'alice@example.com', role: opts.role || 'student', name: 'Alice' },
    identity: opts.identity || IDENT_RESOLVED,
  })
  await context.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url())
    const req = route.request()
    if (u.pathname === '/auth/verify') {
      return route.fulfill({ json: { valid: true, user: opts.user || { id: 'recUSER_ALICE', email: 'alice@example.com', role: opts.role || 'student', name: 'Alice' } } })
    }
    if (u.pathname === '/auth/learning-identity') return route.fulfill({ json: opts.identity || IDENT_RESOLVED })
    if (u.pathname === '/assignments/mine') return route.fulfill({ json: (opts.mine || (() => []))() })
    if (/^\/concept-state\/[^/]+\/active-assignment$/.test(u.pathname)) {
      return route.fulfill({ json: (opts.active || (() => ({ has_active_assignment: false, assignment: null })))() })
    }
    if (/^\/concept-state\/[^/]+\/practice-event$/.test(u.pathname) && req.method() === 'POST') {
      state.evidencePosts.push(JSON.parse(req.postData() || '{}'))
      const r = opts.practiceEventResponse ? opts.practiceEventResponse(state.evidencePosts.length) : { status: 200, body: { concept_id: 'T_HALF_STEP', confidence_tier: 'developing', assignment_status: 'completed' } }
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    if (/^\/concept-state\/[^/]+\/[A-Z0-9_]+$/.test(u.pathname) && req.method() === 'GET') {
      const r = (opts.conceptState || (() => ({ body: { concept_id: 'T_HALF_STEP', confidence_tier: 'developing', practice_count: 1 } })))()
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    if (u.pathname === '/practice-log/sessions' && req.method() === 'POST') {
      state.sessionPosts.push(JSON.parse(req.postData() || '{}'))
      const r = opts.sessionResponse ? opts.sessionResponse() : { status: 200, body: { session: null } }
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    if (/^\/practice-log\/dashboard\/[^/]+$/.test(u.pathname)) {
      const r = opts.practiceLogDashboard ? opts.practiceLogDashboard() : { body: { student: {}, periods: {}, sessions: [], calendar: {} } }
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    const dpm = u.pathname.match(/^\/students\/([^/]+)\/dpm$/)
    if (dpm) return route.fulfill({ json: { status: 'On Track', weekly_minutes: 42 } })
    if (/^\/students\//.test(u.pathname)) return route.fulfill({ json: { id: 'recSTU_ALICE', name: 'Alice', student_instruments: [SINGLE] } })
    return route.fulfill({ status: 404, json: { detail: 'qa-unmocked' } })
  })
  await context.route(`${CONVERTER}/**`, async (route) => {
    converterHits.push(route.request().url())
    return route.fulfill({ status: 410, json: {} })
  })
  context.on('request', (req) => governanceLog.push({ scenario: opts.name, url: req.url() }))
  const page = await context.newPage()
  page.on('pageerror', (e) => state.pageErrors.push(String(e)))
  return { context, page, state }
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

// ── B1/B2 — GamePage zero-activity vs one-attempt (§B) ──
async function b_game_zero_vs_one_attempt(browser) {
  {
    const { context, page, state } = await makeContext(browser, { name: 'B1-zero' })
    await page.goto(`${APP}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASG}`)
    await page.waitForSelector('button:has-text("End Game")', { timeout: 15000 })
    await page.click('button:has-text("End Game")')
    await page.waitForTimeout(1200)
    check('B1', 'zero-attempt Game: ZERO practice-event POSTs', state.evidencePosts.length === 0, `${state.evidencePosts.length} posts`)
    const body = await page.locator('body').innerText()
    check('B1', 'zero-attempt Game: DOM does NOT claim "Assignment Complete!"', !/Assignment Complete!/.test(body))
    check('B1', 'zero-attempt Game: DOM does NOT claim "Progress saved"', !/Progress saved/.test(body))
    await context.close()
  }
  {
    const { context, page, state } = await makeContext(browser, { name: 'B2-one' })
    await page.goto(`${APP}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASG}`)
    await page.waitForSelector('[data-testid="piano-key"]', { timeout: 15000 })
    await page.click('[data-testid="piano-key"]')
    await page.click('button:has-text("End Game")')
    await page.waitForTimeout(1200)
    check('B2', 'one-attempt homework Game: exactly one practice-event POST', state.evidencePosts.length === 1, `${state.evidencePosts.length} posts`)
    if (state.evidencePosts.length) {
      check('B2', 'one-attempt Game evidence carries the canonical assignment_id', state.evidencePosts[0].assignment_id === ASG)
    }
    await page.waitForSelector('text=Assignment Complete!', { timeout: 5000 }).catch(() => {})
    const body = await page.locator('body').innerText()
    check('B2', 'confirmed one-attempt Game DOES claim completion after confirmed evidence', /Assignment Complete!/.test(body))
    // Repeated End Game must not duplicate the POST.
    await page.click('button:has-text("End Game")').catch(() => {})
    await page.waitForTimeout(800)
    check('B2', 'repeated End Game does not duplicate the evidence POST', state.evidencePosts.length === 1, `${state.evidencePosts.length} posts`)
    await context.close()
  }
}

// ── C1 — legacy alias with assignment link fails closed (§C) ──
async function c_legacy_alias_fails_closed(browser) {
  const { context, page, state } = await makeContext(browser, { name: 'C1' })
  await page.goto(`${APP}/game?mode=academic&concept=C_HALFWHOLE&assignment_id=${ASG}`)
  await page.waitForSelector('[data-testid="piano-key"]', { timeout: 15000 })
  await page.click('[data-testid="piano-key"]')
  await page.click('button:has-text("End Game")').catch(() => {})
  await page.waitForTimeout(1200)
  check('C1', 'legacy alias (C_HALFWHOLE) + assignment link → ZERO evidence POSTs', state.evidencePosts.length === 0, `${state.evidencePosts.length} posts`)
  await context.close()
}

// ── D1/D2 — CurriculumPath: server wins over stale cache, honest outage (§D) ──
// /curriculum is TeacherRoute-gated (teacher/admin/founder) — use a teacher user.
async function d_curriculumpath_server_truth(browser) {
  const teacherOpts = { role: 'teacher', user: { id: 'recUSER_T', email: 't@example.com', role: 'teacher', name: 'Teach' }, identity: { ...IDENT_RESOLVED, role: 'teacher' } }
  {
    const { context, page } = await makeContext(browser, {
      name: 'D1', ...teacherOpts,
      conceptState: () => ({ body: { concept_id: 'T_HALF_STEP', confidence_tier: 'developing', practice_count: 2 } }),
    })
    await context.addInitScript((si) => {
      localStorage.setItem(`som_concept_states::${si}`, JSON.stringify({
        T_HALF_STEP: { concept_id: 'T_HALF_STEP', ownership_state: 'owned', confidence_tier: 'owned', practice_count: 99, _source: 'server' },
      }))
    }, SINGLE)
    await page.goto(`${APP}/curriculum`)
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    check('D1', 'CurriculumPath: stale HIGH local cache does not surface as "Owned" when server says developing', !/✓ Owned/.test(body))
    await context.close()
  }
  {
    const { context, page } = await makeContext(browser, {
      name: 'D2', ...teacherOpts,
      conceptState: () => ({ status: 503, body: { detail: 'unavailable_retryable' } }),
    })
    await page.goto(`${APP}/curriculum`)
    await page.waitForSelector('[data-testid="curriculum-unavailable"]', { timeout: 15000 })
    check('D2', 'CurriculumPath: genuine outage shows the honest unavailable/retry banner', true)
    await context.close()
  }
}

// ── E1 — StudentDashboard Academic↔Game repeated toggle: no crash (§G) ──
async function e_dashboard_toggle_no_crash(browser) {
  const { context, page, state } = await makeContext(browser, { name: 'E1' })
  await page.goto(`${APP}/student`)
  await page.waitForSelector('text=Academic', { timeout: 15000 })
  // Exact text match — the sidebar also has a "Games" nav item, which
  // has-text("Game") would ambiguously match alongside the mode toggle.
  const gameBtn = page.getByRole('button', { name: 'Game', exact: true })
  const academicBtn = page.getByRole('button', { name: 'Academic', exact: true })
  for (let i = 0; i < 4; i++) {
    await gameBtn.click()
    await page.waitForTimeout(200)
    await academicBtn.click()
    await page.waitForTimeout(200)
  }
  check('E1', 'StudentDashboard Academic→Game→Academic→Game (x4) produces zero page errors', state.pageErrors.length === 0, JSON.stringify(state.pageErrors))
  await context.close()
}

// ── F1 — /dashboard role routing (§H) ──
async function f_dashboard_routing(browser) {
  for (const [role, expectedPath] of [['founder', '/teacher'], ['teacher', '/teacher'], ['student', '/student']]) {
    const { context, page } = await makeContext(browser, {
      name: 'F1-' + role, role, user: { id: 'recUSER_X', email: 'x@example.com', role, name: 'X' },
      identity: { ...IDENT_RESOLVED, role },
    })
    await page.goto(`${APP}/dashboard`)
    await page.waitForTimeout(1000)
    const path = new URL(page.url()).pathname
    check('F1', `/dashboard role=${role} routes to ${expectedPath}`, path === expectedPath, `got ${path}`)
    await context.close()
  }
}

// ── G1 — PracticeLogPage: no raw % anywhere, real Log-a-Session persistence (§F, item 2) ──
async function g_practicelog_dom_and_persistence(browser) {
  const dashboardPayload = {
    student: { id: 'recSTU_ALICE', name: 'Alice', instrument: 'Piano' },
    periods: {
      week: {
        trend: { labels: ['Mon'], all: [10], homework: [10], sheet_music: [0], games: [0], live_practice: [0] },
        goal_vs_actual: { labels: ['Homework', 'Sheet Music', 'Games', 'Live Practice'], actual: [10, 0, 0, 0], goal: [10, 10, 10, 10] },
        breakdown: { homework: { minutes: 10, pct: 100 } }, consistency_days: 1, consistency_total: 7, dpm: null,
        piece_progress: [{ name: 'C Major Scale', sessions: 2, accuracy_tier: 'owned' }],
        insight_text: 'Nice start.', personal_bests: { longest_session_min: 10, most_sessions_week: 1, best_month_min: 10 },
      },
    },
    sessions: [{ log_id: 'log1', title: 'C Major', practiced_at: null, activity_type: 'homework', duration_min: 10, accuracy_tier: 'owned', self_rating: 'ok', dpm: null, ambassador_note: '', source: 'school' }],
    calendar: { days: {} },
  }
  {
    const { context, page } = await makeContext(browser, { name: 'G1-dom', practiceLogDashboard: () => ({ body: dashboardPayload }) })
    await page.goto(`${APP}/practice-log`)
    await page.waitForSelector('.pl-pbtile', { timeout: 15000 })
    const body = await page.locator('body').innerText()
    check('G1', 'PracticeLogPage: zero "% accuracy" prose', !/%\s*accuracy/i.test(body) && !/accuracy on Level/i.test(body))
    check('G1', 'PracticeLogPage: zero raw confidence/mastery tokens', !/confidence/i.test(body) && !/\bmastery\b/i.test(body))
    await context.close()
  }
  // Persistence: success path shows honest "logged" confirmation only after a
  // confirmed 200; error path (503) leaves the modal open with an honest message.
  {
    const { context, page, state } = await makeContext(browser, {
      name: 'G1-save-ok', practiceLogDashboard: () => ({ body: dashboardPayload }),
      sessionResponse: () => ({ status: 200, body: { session: { log_id: 'new1', title: 'Scales', practiced_at: new Date().toISOString(), activity_type: 'homework', duration_min: 15, self_rating: 'ok', source: 'school' } } }),
    })
    await page.goto(`${APP}/practice-log`)
    await page.waitForSelector('.pl-logbtn', { timeout: 15000 })
    await page.click('.pl-logbtn')
    await page.fill('.pl-loginput', 'Scales practice')
    await page.click('[data-testid="log-session-submit"]')
    await page.waitForTimeout(1000)
    check('G1', 'Log a Session (success): exactly one POST /practice-log/sessions fires', state.sessionPosts.length === 1, `${state.sessionPosts.length} posts`)
    const modalGone = await page.locator('.pl-logmod.show').count()
    check('G1', 'Log a Session (success): modal closes only after confirmed save', modalGone === 0)
    await context.close()
  }
  {
    const { context, page, state } = await makeContext(browser, {
      name: 'G1-save-503', practiceLogDashboard: () => ({ body: dashboardPayload }),
      sessionResponse: () => ({ status: 503, body: { detail: 'unavailable' } }),
    })
    await page.goto(`${APP}/practice-log`)
    await page.waitForSelector('.pl-logbtn', { timeout: 15000 })
    await page.click('.pl-logbtn')
    await page.fill('.pl-loginput', 'Scales practice')
    await page.click('[data-testid="log-session-submit"]')
    await page.waitForSelector('[data-testid="log-session-error"]', { timeout: 5000 })
    check('G1', 'Log a Session (503): honest error shown, modal STAYS open (no fake success)', await page.locator('.pl-logmod.show').count() === 1)
    const body = await page.locator('body').innerText()
    check('G1', 'Log a Session (503): no "logged"/"saved" success claim anywhere', !/session logged/i.test(body))
    await context.close()
  }
}

// ── H1 — Gate 2 label consistency (§J) ──
async function h_gate2_label(browser) {
  const { context, page } = await makeContext(browser, { name: 'H1' })
  await page.goto(`${APP}/practice/C_MAJOR_GATE_0`)
  await page.waitForSelector('text=Gate 2', { timeout: 15000 })
  const body = await page.locator('body').innerText()
  check('H1', 'MajorScalePatternGate labels itself Gate 2 on load', /Gate 2/.test(body))
  check('H1', 'no stray "Gate 1" label on the Gate 2 surface (old backwards next-gate copy is gone)', !/Gate 1/.test(body))
  await context.close()
}

// ── I1 — governance: /student?email= zero, converter zero, gate evidence zero ──
async function i_governance(browser) {
  check('I1', '/student?email= never called across any scenario run', !governanceLog.some(g => /\/student\?email=/.test(g.url)))
  check('I1', 'zero Converter traffic across any scenario run', converterHits.length === 0, JSON.stringify(converterHits))
}

// ── J1 — mobile viewports: no horizontal overflow across required surfaces ──
async function j_mobile_viewports(browser) {
  const viewports = [[390, 844], [393, 852], [430, 932]]
  for (const [w, h] of viewports) {
    const { context, page } = await makeContext(browser, { name: `J1-${w}x${h}`, viewport: { width: w, height: h }, mobile: true })
    await page.goto(`${APP}/student`)
    await page.waitForSelector('text=Academic', { timeout: 15000 })
    check('J1', `StudentDashboard ${w}x${h}: no horizontal overflow`, await noOverflow(page))
    await page.goto(`${APP}/homework`)
    await page.waitForTimeout(1000)
    check('J1', `HomeworkDashboard ${w}x${h}: no horizontal overflow`, await noOverflow(page))
    await context.close()
  }
}

async function runBrowserSuite() {
  const preview = await ensurePreview()
  const browser = await launchBrowser()
  try {
    await b_game_zero_vs_one_attempt(browser)
    await c_legacy_alias_fails_closed(browser)
    await d_curriculumpath_server_truth(browser)
    await e_dashboard_toggle_no_crash(browser)
    await f_dashboard_routing(browser)
    await g_practicelog_dom_and_persistence(browser)
    await h_gate2_label(browser)
    await j_mobile_viewports(browser)
    await i_governance(browser) // last: aggregates governanceLog/converterHits from all prior scenarios
  } finally {
    await browser.close()
    if (preview) { try { process.kill(-preview.pid) } catch { try { preview.kill() } catch {} } }
  }
}

main().catch(err => {
  console.error('QA harness crashed:', err)
  process.exit(1)
})
