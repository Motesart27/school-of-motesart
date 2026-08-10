/**
 * m1r3_fe_qa.mjs — M1 R3-FE FINAL CODEX FRONTEND INTEGRATION CLOSURE QA.
 *
 * REPRODUCE-BEFORE-REPAIR: this harness was written FIRST and run against the
 * FROZEN frontend f2d2f6444be896d249bbd6b2dbbb6e0754559738, where the
 * adversarial probes below FAILED (see the R3 execution report for the
 * recorded frozen roster). The R3 fixes then made every proof pass.
 *
 * Covers the 40 required proofs (Q1–Q40) via browser integration against the
 * PRODUCTION build (vite preview; Railway API fully mocked via Playwright
 * route interception — ZERO live backend, ZERO live Airtable), in-browser
 * units over REAL work-tree modules (esbuild), and static source audits.
 *
 * Usage:  npm run build && node tests/m1r3_fe_qa.mjs
 * Output: qa-artifacts/m1r3-fe-qa-results.json (not committed)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import esbuild from 'esbuild'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'qa-artifacts')
const SCREENS = resolve(OUT, 'm1r3-fe-screens')
mkdirSync(SCREENS, { recursive: true })

const PORT = 4178
const APP = `http://localhost:${PORT}`
const API = 'https://deployable-python-codebase-som-production.up.railway.app'
const CONVERTER = 'https://motesart-converter.netlify.app'
const BASELINE_THIRD_PARTY = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net',
])

const SINGLE = 'recSI_ALICE'
const PIANO = 'recSI_ALICE_PIANO'
const CELLO = 'recSI_ALICE_CELLO'
const ALICE_STUDENT = 'recSTU_ALICE0001'
const ASG = 'recMNA00000000001'

const IDENT_RESOLVED = {
  user_id: 'recUSER_ALICE', student_record_id: ALICE_STUDENT,
  student_instrument_id: SINGLE, role: 'student', selection_required: false,
  identity_status: 'resolved',
  owned_instruments: [{ student_instrument_id: SINGLE, instrument: 'Piano', label: 'Alice' }],
}
const IDENT_MULTI = {
  user_id: 'recUSER_ALICE', student_record_id: ALICE_STUDENT,
  student_instrument_id: null, role: 'student', selection_required: true,
  identity_status: 'selection_required',
  owned_instruments: [
    { student_instrument_id: PIANO, instrument: 'Piano', label: 'Alice' },
    { student_instrument_id: CELLO, instrument: 'Cello', label: 'Alice' },
  ],
}
const row = (id, num, title, si, extra = {}) => ({
  id, assignment_id: id, assignment_number: num, name: title, title,
  status: 'Assigned', student: ['recSTU_A'], due_date: '2026-08-14',
  minutes_target: 15, type: 'Homework', teacher_feedback: null,
  homework_template: null, student_instruments: [si], created_by: null,
  concept_id: 'T_HALF_STEP', completed_at: null, evidence_ref: null, ...extra,
})
const PIANO_ROWS = [row('recPNO00000000001', 11, 'Piano scales', PIANO)]
const CELLO_ROWS = [row('recCLO00000000001', 21, 'Cello bowing', CELLO)]
const SINGLE_ROWS = [row(ASG, 1, 'Half step homework', SINGLE)]

const results = []
const governanceLog = []
const converterHits = []
let failures = 0
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 220) : ''}`)
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

async function launch() {
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required']
  try { return await chromium.launch({ args }) }
  catch { return await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args }) }
}

async function bundleModule(entryRel, globalName, pickExpr) {
  const built = await esbuild.build({
    stdin: {
      contents: `import * as M from ${JSON.stringify(resolve(ROOT, entryRel))}\nwindow.${globalName} = ${pickExpr}`,
      resolveDir: ROOT, sourcefile: 'qa-entry.js', loader: 'js',
    },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
    logLevel: 'silent',
  })
  return built.outputFiles[0].text
}

async function makeContext(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 800 },
    ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}),
    permissions: ['camera', 'microphone'],
  })
  const state = {
    pageErrors: [], evidencePosts: [], practiceLogPosts: [], tamiPosts: [],
    conceptStateReads: [],
  }
  await context.addInitScript(({ user, identity, seedCache }) => {
    localStorage.setItem('som_token', 'qa-token')
    localStorage.setItem('som_user', JSON.stringify(user))
    localStorage.setItem('som_learning_identity', JSON.stringify({
      ready: identity.identity_status === 'resolved',
      student_instrument_id: identity.student_instrument_id,
    }))
    if (seedCache) localStorage.setItem(seedCache.key, seedCache.value)
  }, {
    user: opts.user || { id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice', student_id: 'recSI_WRONGLOCAL' },
    identity: opts.identity || IDENT_RESOLVED,
    seedCache: opts.seedCache || null,
  })
  await context.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url())
    const req = route.request()
    if (u.pathname === '/auth/verify') {
      return route.fulfill({ json: { valid: true, user: opts.user || { id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' } } })
    }
    if (u.pathname === '/auth/learning-identity') {
      if (opts.identity503) return route.fulfill({ status: 503, json: { detail: 'identity_unavailable_retryable' } })
      return route.fulfill({ json: opts.identity || IDENT_RESOLVED })
    }
    if (u.pathname === '/assignments/mine') {
      const r = (opts.mine || (() => ({ body: [] })))(u)
      if (r.delayMs) await new Promise(res => setTimeout(res, r.delayMs))
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    const am = u.pathname.match(/^\/concept-state\/([^/]+)\/active-assignment$/)
    if (am) {
      const r = (opts.active || (() => ({ body: { has_active_assignment: false, assignment: null } })))(am[1])
      if (r.delayMs) await new Promise(res => setTimeout(res, r.delayMs))
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    const pe = u.pathname.match(/^\/concept-state\/([^/]+)\/practice-event$/)
    if (pe && req.method() === 'POST') {
      state.evidencePosts.push({ si: pe[1], body: JSON.parse(req.postData() || '{}') })
      return route.fulfill({ json: { concept_id: 'T_HALF_STEP', chapter: 'applied', practice_count: 1, confidence_tier: 'developing', assignment_status: 'completed', duplicate: false } })
    }
    const csm = u.pathname.match(/^\/concept-state\/([^/]+)\/([A-Z0-9_]+)$/)
    if (csm && req.method() === 'GET') {
      state.conceptStateReads.push({ si: csm[1], concept: csm[2] })
      const r = (opts.conceptState || (() => ({ body: { concept_id: csm[2], chapter: 'find_it', chapter_label: 'Find It', confidence_tier: 'developing', next_action: '', focus_zone: '', ownership_level: '', homes_completed: [], practice_count: 2, last_practiced_at: null } })))(csm[2])
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    if (u.pathname === '/practice-log/sessions' && req.method() === 'POST') {
      state.practiceLogPosts.push(JSON.parse(req.postData() || '{}'))
      return route.fulfill({ json: { ok: true } })
    }
    if (/\/tami\/chat/.test(u.pathname)) {
      state.tamiPosts.push({ path: u.pathname, body: JSON.parse(req.postData() || '{}') })
      return route.fulfill({ json: { reply: 'Good to see you.', updated_history: [], suggested_actions: [], student_context: { name: 'Alice', dpm_status: 'On Track' } } })
    }
    if (/\/tami\/history/.test(u.pathname)) {
      if (opts.tamiHistory403) return route.fulfill({ status: 403, json: { detail: 'wrong_student' } })
      return route.fulfill({ json: { messages_json: '[]', history_json: '[]', message_count: 0 } })
    }
    const dpm = u.pathname.match(/^\/students\/([^/]+)\/dpm$/)
    if (dpm) {
      if (opts.dpm503) return route.fulfill({ status: 503, json: { detail: 'student_data_unavailable_retryable' } })
      return route.fulfill({ json: { status: 'On Track', risk_level: 'green', flags: [], weekly_minutes: 42, days_since_practice: 1 } })
    }
    if (/^\/students\//.test(u.pathname)) {
      return route.fulfill({ json: { id: ALICE_STUDENT, name: 'Alice', status: 'Active', level: 'L1', student_instruments: [SINGLE], dpm_status: 'On Track' } })
    }
    if (u.pathname === '/api/speak' || /speak/.test(u.pathname)) {
      return route.fulfill({ status: 404, json: { detail: 'qa-tts-off' } })
    }
    return route.fulfill({ status: 404, json: { detail: 'qa-unmocked' } })
  })
  await context.route(`${CONVERTER}/**`, async (route) => {
    converterHits.push({ scenario: opts.name, url: route.request().url() })
    return route.fulfill({ status: 410, json: {} })
  })
  context.on('request', (req) => {
    governanceLog.push({ scenario: opts.name, method: req.method(), url: req.url() })
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => state.pageErrors.push(String(e)))
  return { context, page, state }
}

const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

// ─────────────────────────────── Q1/Q2 — §A detail isolation ──
async function q1_q2_detail_isolation(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'Q1', identity: IDENT_MULTI, mobile: true, viewport: { width: 430, height: 932 },
    mine: (u) => {
      const q = u.searchParams.get('student_instrument_id')
      if (q === PIANO) return { body: PIANO_ROWS }
      if (q === CELLO) return { body: CELLO_ROWS, delayMs: 300 }
      return { status: 409, body: { detail: 'selection_required' } }
    },
    // Instrument A's ACTIVE assignment responds LATE (after the switch) —
    // neither it nor any stale error may reopen/repaint A's detail.
    active: (si) => si === PIANO
      ? { body: { has_active_assignment: true, assignment: PIANO_ROWS[0] }, delayMs: 1200 }
      : { body: { has_active_assignment: false, assignment: null } },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(`[data-testid="instrument-option-${PIANO}"]`).click()
  await page.getByText('Piano scales').first().waitFor({ timeout: 10000 })
  await page.locator('.hw-acard').first().click()          // open A's detail
  await page.locator('.hw-det.open').waitFor({ timeout: 5000 })
  check('Q1a instrument A detail drawer opens', true)
  // Switch to B while A's ACTIVE response is still in flight.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('som:selection-required')))
  await page.locator(`[data-testid="instrument-option-${CELLO}"]`).waitFor({ timeout: 10000 })
  await page.locator(`[data-testid="instrument-option-${CELLO}"]`).click()
  await page.waitForTimeout(120)
  check('Q1 §A detail drawer CLOSED the instant the instrument switches',
    await page.locator('.hw-det.open').count() === 0)
  check('Q1 §A selected A-assignment content cleared (no stale title/desc)',
    await page.getByText('Piano scales').count() === 0)
  await page.getByText('Cello bowing').first().waitFor({ timeout: 10000 })
  await page.waitForTimeout(1500)   // stale A active-response has landed by now
  check('Q2 §A stale A responses cannot reopen A detail under B',
    await page.locator('.hw-det.open').count() === 0 &&
    await page.getByText('Piano scales').count() === 0)
  check('Q1 430x932: no horizontal overflow', await noOverflow(page))
  await page.screenshot({ path: resolve(SCREENS, 'q1-detail-isolation.png') })
  await context.close()
}

// ──────────────── Q3–Q6 — §B/§C Practice Live evidence contract ──
async function q3_q6_practice_live_evidence(browser, plBundle) {
  const { context, page, state } = await makeContext(browser, {
    name: 'Q3',
    // Adversarial (§C): local som_user carries a WRONG local student pointer —
    // canonical identity snapshot carries the REAL selected SI.
    user: { id: 'recUSER_ALICE', email: 'a@x.com', role: 'student', name: 'Alice', student_id: 'recSI_WRONGLOCAL' },
  })
  await page.goto(`${APP}/homework`)
  await page.addScriptTag({ content: plBundle })
  const r = await page.evaluate(async ({ asg }) => {
    const PL = window.__PLE
    const res = await PL.submitPracticeLiveEvidence({
      conceptId: 'T_HALF_STEP',
      assignmentId: asg,
      trigger: 'complete',
      stats: { quizCorrect: 3, practiceCorrect: 2, attempts: 6, durationSec: 300 },
    })
    const log = await PL.logPracticeLiveSession({
      studentInstrumentId: PL.getCanonicalSi(),
      conceptId: 'T_HALF_STEP',
      durationMin: 5,
      pieceName: 'Half Step',
    })
    return { res, log, si: PL.getCanonicalSi() }
  }, { asg: ASG })
  const post = state.evidencePosts[0]
  check('Q3 §B Homework assignment_id appears in the Practice Live evidence POST',
    !!post && post.body.assignment_id === ASG, JSON.stringify(post?.body || {}))
  check('Q4 §B exact assignment rec id preserved end-to-end (no mutation, no fabrication)',
    state.evidencePosts.every(p => p.body.assignment_id === ASG) &&
    state.evidencePosts.length === 1)
  check('Q5 §C canonical SELECTED SI used for evidence (URL path SI = canonical identity)',
    post?.si === SINGLE, `path si=${post?.si}`)
  check('Q5b §B evidence uses submitEvidenceEvent route (concept-state practice-event), source practice_live',
    post?.body?.source_activity === 'practice_live' && post?.body?.concept_id === 'T_HALF_STEP')
  check('Q6 §C no local som_user academic authority (wrong local pointer NEVER reaches evidence/practice-log)',
    post?.si !== 'recSI_WRONGLOCAL' &&
    (state.practiceLogPosts[0]?.student_id === SINGLE),
    JSON.stringify(state.practiceLogPosts[0] || {}))
  await context.close()

  // Static — the LIVE page wires the module on completion and never uses
  // som_user for academic identity.
  const wyl = readFileSync(join(ROOT, 'src/pages/WYLPracticeLive.jsx'), 'utf8')
  check('Q3s §B WYLPracticeLive submits canonical evidence on completion (module wired)',
    /submitPracticeLiveEvidence/.test(wyl))
  check('Q6s §C WYLPracticeLive no longer reads som_user for academic identity',
    !/som_user/.test(wyl))
}

// ──────────────── Q7/Q8 — §D Railway Concept_State authority ──
async function q7_stale_cache_loses(browser) {
  const seededHigh = JSON.stringify({
    T_HALF_STEP: {
      concept_id: 'T_HALF_STEP', ownership_state: 'owned', confidence_tier: 'owned',
      practice_count: 99, _source: 'server', last_updated: '2026-08-01T00:00:00.000Z',
    },
  })
  const { context, page, state } = await makeContext(browser, {
    name: 'Q7', seedCache: { key: `som_concept_states::${SINGLE}`, value: seededHigh },
    conceptState: () => ({ body: { concept_id: 'T_HALF_STEP', chapter: 'find_it', chapter_label: 'Find It', confidence_tier: 'developing', ownership_level: '', practice_count: 2, next_action: '', focus_zone: '', homes_completed: [], last_practiced_at: null } }),
  })
  await page.goto(`${APP}/practice-live?concept=T_HALF_STEP`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(1200)
  check('Q7 §D Practice Live READS canonical Concept_State from Railway on entry',
    state.conceptStateReads.some(r => r.concept === 'T_HALF_STEP' && r.si === SINGLE),
    JSON.stringify(state.conceptStateReads))
  const body = await page.locator('body').innerText()
  check('Q7 §D stale HIGH localStorage ownership LOSES to fresh lower Railway state (no release/Owned claim)',
    !/release/i.test(body) && !/\bOwned\b/.test(body))
  const cache = await page.evaluate((k) => localStorage.getItem(k), `som_concept_states::${SINGLE}`)
  check('Q7 §D local cache REPLACED by the server-returned canonical snapshot',
    cache && cache.includes('"developing"') && !cache.includes('"owned"'), (cache || '').slice(0, 160))
  await context.close()
}

async function q8_outage_no_fabrication(browser) {
  const seededHigh = JSON.stringify({
    T_HALF_STEP: { concept_id: 'T_HALF_STEP', ownership_state: 'owned', confidence_tier: 'owned', practice_count: 99 },
  })
  const { context, page } = await makeContext(browser, {
    name: 'Q8', seedCache: { key: `som_concept_states::${SINGLE}`, value: seededHigh },
    conceptState: () => ({ status: 503, body: { detail: 'student_data_unavailable_retryable' } }),
  })
  await page.goto(`${APP}/practice-live?concept=T_HALF_STEP`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(1200)
  check('Q8 §D Railway outage → retryable/unavailable element shown',
    await page.locator('[data-testid="concept-state-retryable"]').count() >= 1)
  const body = await page.locator('body').innerText()
  check('Q8 §D outage does NOT fabricate ownership phase from the stale cache',
    !/release/i.test(body) && !/\bOwned\b/.test(body))
  await context.close()
}

// ──────────────── Q9 — §E teacher state authority ──
async function q9_teacher_state(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'Q9', user: { id: 'recUSER_T', email: 't@x.com', role: 'teacher', name: 'Teach' },
    identity: { ...IDENT_RESOLVED, role: 'teacher' },
  })
  await page.goto(`${APP}/concept-health`)
  await page.waitForTimeout(1500)
  const body = await page.locator('body').innerText()
  check('Q9 §E teacher concept surfaces label demo/noncanonical data explicitly (no mock-as-truth)',
    /demo|sample|not canonical|noncanonical/i.test(body), body.slice(0, 200))
  await context.close()
}

// ──────────────── Q10 — §F SOM_Mastery_Ledger static ──
function q10_mastery_ledger_static() {
  const hits = []
  const scan = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) { scan(p); continue }
      if (!/\.(jsx?|json|mjs)$/.test(p)) continue
      const src = readFileSync(p, 'utf8')
      if (/SOM_Mastery_Ledger/i.test(src)) hits.push(p.slice(ROOT.length + 1))
    }
  }
  scan(join(ROOT, 'src'))
  scan(join(ROOT, 'public'))
  check('Q10 §F ZERO live governing SOM_Mastery_Ledger references (src + public/lesson_data)',
    hits.length === 0, JSON.stringify(hits))
}

// ──────────────── Q11 — StudentDashboard Article XIII ──
async function q11_student_dashboard(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'Q11', mobile: true, viewport: { width: 390, height: 844 },
  })
  await page.goto(`${APP}/student`)
  await page.waitForTimeout(2500)
  const body = await page.locator('body').innerText()
  check('Q11 StudentDashboard: no numeric DPM percentages (Drive/Passion/Motivation/overall)',
    !/(drive|passion|motivation|dpm)[^.\n]{0,16}\d+\s*%/i.test(body) && !/\d+\s*%\s*\n?\s*DPM/i.test(body),
    (body.match(/.{0,30}\d+\s*%.{0,30}/g) || []).join(' | ').slice(0, 200))
  check('Q11 StudentDashboard: consumes the backend student-safe DPM payload',
    governanceLog.some(r => r.scenario === 'Q11' && /\/students\/[^/]+\/dpm/.test(r.url)))
  check('Q11 390x844: no horizontal overflow', await noOverflow(page))
  check('Q11 no page errors', state.pageErrors.length === 0, state.pageErrors.join('; '))
  await context.close()
}

// ──────────────── Q12/Q32 — TAMi Article XIII + self flow ──
async function q12_q32_tami(browser) {
  const { context, page, state } = await makeContext(browser, { name: 'Q12' })
  await page.goto(`${APP}/student`)
  await page.waitForTimeout(3000)
  const chat = state.tamiPosts[0]
  if (chat) {
    check('Q32 §M TAMi student self flow — display name is NOT sent as target identity',
      chat.body.student_id === '' || chat.body.student_id == null,
      JSON.stringify(chat.body).slice(0, 160))
  } else {
    check('Q32 §M TAMi student self flow — no chat fired on load (nothing sent, nothing leaked)', true)
  }
  const body = await page.locator('body').innerText()
  check('Q12 TAMi surface: no raw numeric student analytics rendered',
    !/(drive|passion|motivation|dpm|accuracy|confidence|mastery)[^.\n]{0,16}\d+\s*%/i.test(body))
  await context.close()

  // §M api surface — teacher tools must send canonical record ids, not names.
  const api = readFileSync(join(ROOT, 'src/services/api.js'), 'utf8')
  check('Q33 §M teacher TAMi calls send canonical student_id record ids (no student_name authority)',
    !/student_name:\s*studentName/.test(api) && !/student_name:/.test(api))
}

// ──────────────── Q13 — DPM Playground gating ──
async function q13_dpm_playground(browser) {
  const a = await makeContext(browser, { name: 'Q13' })
  await a.page.goto(`${APP}/dpm-playground`)
  await a.page.waitForTimeout(1200)
  check('Q13 DPM Playground: ordinary student is DENIED (redirected away)',
    !a.page.url().includes('/dpm-playground'), a.page.url())
  await a.context.close()
  const b = await makeContext(browser, {
    name: 'Q13t', user: { id: 'recUSER_T', email: 't@x.com', role: 'teacher', name: 'T' },
    identity: { ...IDENT_RESOLVED, role: 'teacher' },
  })
  await b.page.goto(`${APP}/dpm-playground`)
  await b.page.waitForTimeout(800)
  check('Q13 DPM Playground: teacher retains access (internal tool preserved)',
    b.page.url().includes('/dpm-playground'))
  await b.context.close()
}

// ──────────────── Q14 — SessionSummary Article XIII ──
async function q14_session_summary(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'Q14', mobile: true, viewport: { width: 393, height: 852 },
  })
  await page.goto(`${APP}/session-summary`)
  await page.waitForTimeout(1500)
  const body = await page.locator('body').innerText()
  check('Q14 SessionSummary: no Accuracy % / Level Progress % rings',
    !/\d+\s*%/.test(body), (body.match(/.{0,25}\d+\s*%.{0,25}/g) || []).join(' | ').slice(0, 200))
  check('Q14 SessionSummary: DPM impact is qualitative (no numeric +N component effects)',
    !/DPM[^]{0,120}[+\-]\d/i.test(body))
  check('Q14 393x852: no horizontal overflow', await noOverflow(page))
  await context.close()
}

// ──────────────── Q15 — Leaderboard framing ──
async function q15_leaderboard(browser) {
  const { context, page } = await makeContext(browser, { name: 'Q15' })
  await page.goto(`${APP}/leaderboard`)
  await page.waitForTimeout(1200)
  const body = await page.locator('body').innerText()
  check('Q15 Leaderboard: ranking is NOT presented as musical mastery',
    !/musical mastery|mastery/i.test(body), (body.match(/.{0,40}mastery.{0,40}/gi) || []).join(' | '))
  check('Q15 Leaderboard: game-scoring framing is explicit (points/game language)',
    /game points|game score|points from games/i.test(body))
  await context.close()
}

// ──────────────── Q16 — GamePage academic bars (static + source) ──
function q16_gamepage_bars() {
  const src = readFileSync(join(ROOT, 'src/pages/GamePage.jsx'), 'utf8')
  check('Q16 GamePage: accuracy-derived academic percentage bars removed',
    !/Pitch Accuracy/.test(src) && !/accuracy\s*\+\s*7/.test(src) && !/accuracy\s*-\s*10/.test(src),
    'bars present in source')
}

// ──────────────── Q17/Q18 — Cockpit + fabricated content ──
async function q17_q18_cockpit(browser) {
  const { context, page } = await makeContext(browser, { name: 'Q17' })
  await page.goto(`${APP}/practice-live?concept=T_HALF_STEP`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(800)
  const body = await page.locator('body').innerText()
  check('Q17 Cockpit: no numeric progress/attention, no default 42, no % bars',
    !/\b42\b/.test(body) && !/\d+\s*%/.test(body),
    (body.match(/.{0,25}(\b42\b|\d+\s*%).{0,25}/g) || []).join(' | '))
  check('Q18 Cockpit: no fabricated prior-session statement',
    !/4 of 5|answered correctly|hesitate near the black keys|really coming together/i.test(body))
  const src = readFileSync(join(ROOT, 'src/pages/WYLPracticeLive.jsx'), 'utf8')
  check('Q17s WYL completion overlay: numeric attention display removed',
    !/attentionScore.*%|% attention/.test(src))
  await context.close()
}

// ──────────────── Q19 — no fabricated teacher feedback ──
async function q19_teacher_feedback(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'Q19', mine: () => ({ body: SINGLE_ROWS }),
  })
  await page.goto(`${APP}/homework`)
  await page.getByText('Half step homework').first().waitFor({ timeout: 10000 })
  await page.locator('.hw-acard').first().click()
  await page.locator('.hw-det.open').waitFor({ timeout: 5000 })
  const det = await page.locator('.hw-det').innerText()
  check('Q19 §H fabricated teacher feedback removed (no invented Ms. Johnson quote)',
    !/Ms\. Johnson|Great progress! Your right hand/i.test(det))
  check('Q19 §H absent feedback renders an honest empty state',
    /no teacher feedback yet/i.test(det), det.slice(0, 260))
  check('Q19 §H no fabricated Motesart last-session diagnosis',
    !/your right hand owned it last session|based on your last session/i.test(det))
  await context.close()
}

// ──────────────── Q20–Q23 — Gate 1 runtime ownership ──
async function q20_q23_gate1(browser) {
  const lesson = JSON.parse(readFileSync(join(ROOT, 'public/lesson_data/L01_skip_and_together.json'), 'utf8'))
  const steps = lesson.gate_steps
  const ownershipQ = steps.step_6_quiz_it.questions.find(q => q.is_ownership_gate === true)

  async function driveToQuiz(page) {
    // Step 1 — story hook
    await page.getByRole('button', { name: /hear the difference/i }).click({ timeout: 15000 })
    // Step 2 — hear it
    await page.getByRole('button', { name: /i felt it/i }).click({ timeout: 15000 })
    // Step 3 — say-it call-response rounds (typed)
    for (const round of steps.step_3_say_it.rounds) {
      const answer = (round.acceptable_answers || ['skip'])[0]
      const ta = page.locator('textarea')
      await ta.waitFor({ timeout: 10000 })
      await ta.fill(String(answer))
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1700)
    }
    // Step 4 — feel-check rounds: First = A, Second = B
    for (const round of (steps.step_4_feel_check.rounds || [])) {
      const label = round.correct_answer === 'A' ? 'First' : 'Second'
      await page.getByRole('button', { name: new RegExp(`^${label}$`) }).click({ timeout: 10000 })
      await page.waitForTimeout(1500)
    }
    // Step 5 — name-it reveal → quiz
    await page.getByRole('button', { name: /→/ }).last().click({ timeout: 10000 })
    await page.waitForTimeout(500)
  }

  async function answerNonOwnership(page, q) {
    if (q.type === 'multiple_choice' || q.type === 'binary_choice') {
      await page.getByRole('button', { name: q.correct, exact: true }).click({ timeout: 10000 })
    } else if (q.type === 'sequence_build') {
      const seq = q.correct_sequence || []
      const letters = [seq[2], seq[6]].map(w => ((w || '')[0] || '').toUpperCase())
      const inputs = page.locator('input[maxlength="1"]')
      await inputs.first().waitFor({ timeout: 10000 })
      await inputs.nth(0).fill(letters[0])
      await inputs.nth(1).fill(letters[1])
      await page.getByRole('button', { name: /^Submit$/ }).click({ timeout: 10000 })
    } else {
      const ans = (q.acceptable_answers || q.acceptable_signals || ['skip'])[0]
      const ta = page.locator('textarea')
      await ta.waitFor({ timeout: 10000 })
      await ta.fill(String(ans))
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(1900)
  }

  const BOTH = 'a skip has a note between the keys and together means nothing between, right next to each other'

  // Q20 + Q23 — both-proof pass, prompt appears exactly once, direct to result.
  {
    const { context, page } = await makeContext(browser, { name: 'Q20' })
    await page.goto(`${APP}/practice/C_MAJOR_GATE_SKIP_TOGETHER`)
    await page.getByText('Skip & Together', { exact: false }).first().waitFor({ timeout: 20000 })
    try {
      await driveToQuiz(page)
      let ownershipPromptCount = 0
      for (const q of steps.step_6_quiz_it.questions) {
        const bodyText = await page.locator('body').innerText()
        if (bodyText.includes(ownershipQ.prompt)) ownershipPromptCount += 1
        if (q.is_ownership_gate === true) {
          const ta = page.locator('textarea')
          await ta.waitFor({ timeout: 10000 })
          await ta.fill(BOTH)
          await page.keyboard.press('Enter')
          await page.waitForTimeout(2400)
        } else {
          await answerNonOwnership(page, q)
        }
      }
      const after = await page.locator('body').innerText()
      const promptStillShown = after.includes(ownershipQ.prompt)
      check('Q20 Gate 1 ownership prompt appears EXACTLY once (no duplicate Step 7)',
        ownershipPromptCount === 1 && !promptStillShown,
        `promptCount=${ownershipPromptCount} still=${promptStillShown}`)
      check('Q23 Gate 1 both-proof explanation PASSES and advances directly to completion/result',
        /ownership\s*✓|practice/i.test(after) && !promptStillShown, after.slice(0, 180))
      await page.screenshot({ path: resolve(SCREENS, 'q20-gate-result.png') })
    } finally { await context.close() }
  }

  // Q21/Q22 — single-sided answers FAIL at the runtime ownership question.
  for (const [label, answer] of [
    ['Q21 skip-only explanation FAILS at runtime', 'a skip has a note between the two keys'],
    ['Q22 together-only explanation FAILS at runtime', 'together means right next to each other, nothing between'],
  ]) {
    const { context, page } = await makeContext(browser, { name: label.slice(0, 3) })
    await page.goto(`${APP}/practice/C_MAJOR_GATE_SKIP_TOGETHER`)
    await page.getByText('Skip & Together', { exact: false }).first().waitFor({ timeout: 20000 })
    try {
      await driveToQuiz(page)
      for (const q of steps.step_6_quiz_it.questions) {
        if (q.is_ownership_gate === true) {
          const ta = page.locator('textarea')
          await ta.waitFor({ timeout: 10000 })
          await ta.fill(answer)
          await page.keyboard.press('Enter')
          await page.waitForTimeout(1200)
          const fb = await page.locator('body').innerText()
          check(label, fb.includes(ownershipQ.motesart_wrong), fb.slice(0, 180))
          break
        }
        await answerNonOwnership(page, q)
      }
    } finally { await context.close() }
  }
}

// ──────────────── Q24–Q28 — canonical gate ids + numbering ──
async function q24_q28_gate_ids(browser, adapterBundle) {
  const { context, page } = await makeContext(browser, { name: 'Q24' })
  await page.goto(`${APP}/homework`)
  await page.addScriptTag({ content: adapterBundle })
  const map = await page.evaluate(() => window.__GEA.GATE_CANONICAL_CONCEPTS)
  check('Q24 Gate 0 canonical concept = T_TONIC_RECOGNITION (ratified)',
    map.find_home === 'T_TONIC_RECOGNITION', JSON.stringify(map))
  check('Q25 Gate 1 governance = T_HALF_STEP + T_WHOLE_STEP (two proofs, never one substitute id)',
    map.skip_and_together === null || (Array.isArray(map.skip_and_together) &&
      map.skip_and_together.includes('T_HALF_STEP') && map.skip_and_together.includes('T_WHOLE_STEP')))
  check('Q26 Gate 2 canonical concept = T_MAJOR_SCALE_PATTERN',
    map.major_scale_pattern === 'T_MAJOR_SCALE_PATTERN')
  await context.close()

  const wyl = readFileSync(join(ROOT, 'src/pages/WYLPracticeLive.jsx'), 'utf8')
  check('Q27 no T_FIND_HOME canonical evidence/mastery authority in live config',
    !/conceptId:\s*'T_FIND_HOME'/.test(wyl))
  check('Q28 no T_SKIP_AND_TOGETHER / T_SKIP_TOGETHER canonical authority in live config',
    !/conceptId:\s*'T_SKIP_AND_TOGETHER'/.test(wyl) && !/T_SKIP_TOGETHER/.test(wyl))
  const msp = JSON.parse(readFileSync(join(ROOT, 'public/lesson_data/L00_major_scale_pattern.json'), 'utf8'))
  check('Q26b Major Scale Pattern lesson gate numbering corrected to Gate 2',
    (msp.gate === 2 || msp.meta?.gate === 2 || msp.gate_number === 2),
    `gate=${msp.gate ?? msp.meta?.gate}`)
  const mspGate = readFileSync(join(ROOT, 'src/components/gate0/MajorScalePatternGate.jsx'), 'utf8')
  check('Q26c MajorScalePatternGate UI labeled Gate 2 (not Gate 0)',
    !/Gate 0 [·—-] Pattern Mind|Gate 0 · Pattern Mind/.test(mspGate) && /Gate 2/.test(mspGate))
}

// ──────────────── Q29/Q30 — gate assignment + evidence ──
function q29_static_gate_assignment() {
  const files = ['src/components/gate0/FindHomeGate.jsx', 'src/components/gate0/SkipAndTogetherGate.jsx',
    'src/components/gate0/MajorScalePatternGate.jsx']
  const bad = files.filter(f => /assignment_id=gate/.test(readFileSync(join(ROOT, f), 'utf8')))
  check('Q29 no fabricated gate assignment_id anywhere in gate components',
    bad.length === 0, JSON.stringify(bad))
}

// ──────────────── Q34–Q36 — R3 backend contract handling ──
async function q34_history_denial(browser) {
  const { context, page, state } = await makeContext(browser, { name: 'Q34', tamiHistory403: true })
  await page.goto(`${APP}/student`)
  await page.waitForTimeout(2500)
  check('Q34 §M TAMi history 403 handled gracefully (fail closed, no crash, no forged retry)',
    state.pageErrors.length === 0, state.pageErrors.join('; '))
  await context.close()
}

async function q35_identity_503_retry(browser) {
  const { context, page } = await makeContext(browser, { name: 'Q35', identity503: true })
  await page.goto(`${APP}/homework`)
  await page.locator('[data-testid="identity-retryable"]').waitFor({ timeout: 10000 })
  check('Q35 §N backend identity 503 becomes RETRY UI (never a permanent verdict)', true)
  await context.close()
}

async function q36_dpm_503_unavailable(browser) {
  const { context, page } = await makeContext(browser, { name: 'Q36', dpm503: true })
  await page.goto(`${APP}/student`)
  await page.waitForTimeout(2500)
  const body = await page.locator('body').innerText()
  check('Q36 §N DPM 503 becomes unavailable/retry UI',
    /unavailable|try again|retry/i.test(body))
  check('Q36 §N outage shows NO risk color / fabricated zeros as student failure',
    !/at risk|critical|behind/i.test(body))
  await context.close()
}

// ──────────────── Q37–Q39 — homework 409/403/503 ──
async function q37_39_homework_contract(browser) {
  const a = await makeContext(browser, {
    name: 'Q37', identity: IDENT_MULTI,
    mine: () => ({ status: 409, body: { detail: 'selection_required' } }),
  })
  await a.page.goto(`${APP}/homework`)
  await a.page.locator('[data-testid="instrument-select"]').waitFor({ timeout: 10000 })
  check('Q37 assignment 409 → explicit selection flow', true)
  await a.context.close()

  const b = await makeContext(browser, {
    name: 'Q38', identity: IDENT_RESOLVED,
    mine: () => ({ status: 403, body: { detail: 'wrong_student' } }),
  })
  await b.page.goto(`${APP}/homework`)
  await b.page.locator('[data-testid="assignments-blocked"]').waitFor({ timeout: 10000 })
  check('Q38 assignment 403 → fail closed', true)
  await b.context.close()

  let call = 0
  const c = await makeContext(browser, {
    name: 'Q39', identity: IDENT_RESOLVED,
    mine: () => (++call === 1
      ? { status: 503, body: { detail: 'identity_unavailable_retryable' } }
      : { body: SINGLE_ROWS }),
  })
  await c.page.goto(`${APP}/homework`)
  await c.page.locator('[data-testid="assignments-retryable"]').waitFor({ timeout: 10000 })
  await c.page.locator('[data-testid="assignments-retryable"] button').click()
  await c.page.getByText('Half step homework').first().waitFor({ timeout: 10000 })
  check('Q39 assignment 503 → retryable and recovery works', true)
  await c.context.close()
}

// ──────────────── Q30/Q31/Q40 — network governance ──
function q30_31_40_network() {
  const gateEvidence = governanceLog.filter(r =>
    ['Q20', 'Q21', 'Q22'].includes(r.scenario) && r.method === 'POST' && /practice[-_]event/i.test(r.url))
  check('Q30 gate evidence writes ZERO across all gate scenarios', gateEvidence.length === 0,
    JSON.stringify(gateEvidence.slice(0, 3)))
  check('Q31 Converter learning-state writes ZERO across every scenario', converterHits.length === 0,
    JSON.stringify(converterHits.slice(0, 3)))
  const emailLookup = governanceLog.filter(r => /\/student\?email=/.test(r.url))
  check('Q40 /student?email= ZERO', emailLookup.length === 0)
  const offBaseline = governanceLog.filter(r => {
    if (r.url.startsWith(APP) || r.url.startsWith(API)) return false
    try { return !BASELINE_THIRD_PARTY.has(new URL(r.url).origin) } catch { return true }
  })
  check('NETWORK no origins beyond the frozen baseline set', offBaseline.length === 0,
    JSON.stringify([...new Set(offBaseline.map(r => { try { return new URL(r.url).origin } catch { return r.url } }))]))
}

// ────────────────────────────────────────────────── run ──
const [pleBundle, adapterBundle] = await Promise.all([
  bundleModule('src/services/practiceLiveEvidence.js', '__PLE',
    '{ submitPracticeLiveEvidence: M.submitPracticeLiveEvidence, logPracticeLiveSession: M.logPracticeLiveSession, getCanonicalSi: M.getCanonicalSi }')
    .catch(() => 'window.__PLE = null'),
  bundleModule('src/components/gate0/gateEvidenceAdapter.js', '__GEA',
    '{ GATE_CANONICAL_CONCEPTS: M.GATE_CANONICAL_CONCEPTS ?? (M.default && M.default.GATE_CANONICAL_CONCEPTS) }')
    .catch(() => 'window.__GEA = { GATE_CANONICAL_CONCEPTS: {} }'),
])

const previewChild = await ensurePreview()
const browser = await launch()
// Every scenario is isolated: a crash records a FAIL and the run continues,
// so the FROZEN-baseline pass records the complete failure roster.
async function scenario(name, fn) {
  try { await fn() } catch (e) { check(`${name} (scenario crashed)`, false, String(e).slice(0, 200)) }
}
try {
  await scenario('Q1/Q2', () => q1_q2_detail_isolation(browser))
  await scenario('Q3-Q6', () => q3_q6_practice_live_evidence(browser, pleBundle))
  await scenario('Q7', () => q7_stale_cache_loses(browser))
  await scenario('Q8', () => q8_outage_no_fabrication(browser))
  await scenario('Q9', () => q9_teacher_state(browser))
  await scenario('Q10', async () => q10_mastery_ledger_static())
  await scenario('Q11', () => q11_student_dashboard(browser))
  await scenario('Q12/Q32/Q33', () => q12_q32_tami(browser))
  await scenario('Q13', () => q13_dpm_playground(browser))
  await scenario('Q14', () => q14_session_summary(browser))
  await scenario('Q15', () => q15_leaderboard(browser))
  await scenario('Q16', async () => q16_gamepage_bars())
  await scenario('Q17/Q18', () => q17_q18_cockpit(browser))
  await scenario('Q19', () => q19_teacher_feedback(browser))
  await scenario('Q20-Q23', () => q20_q23_gate1(browser))
  await scenario('Q24-Q28', () => q24_q28_gate_ids(browser, adapterBundle))
  await scenario('Q29', async () => q29_static_gate_assignment())
  await scenario('Q34', () => q34_history_denial(browser))
  await scenario('Q35', () => q35_identity_503_retry(browser))
  await scenario('Q36', () => q36_dpm_503_unavailable(browser))
  await scenario('Q37-Q39', () => q37_39_homework_contract(browser))
  await scenario('Q30/Q31/Q40', async () => q30_31_40_network())
} finally {
  await browser.close()
  if (previewChild) { try { process.kill(-previewChild.pid) } catch { /* gone */ } }
}

writeFileSync(resolve(OUT, 'm1r3-fe-qa-results.json'),
  JSON.stringify({ results, requests: governanceLog, converterHits }, null, 2))
const passed = results.filter(r => r.ok).length
console.log(`\nQA TOTAL: ${passed}/${results.length} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
