/**
 * m1r2_fe_qa.mjs — M1 R2-FE FINAL FRONTEND CODEX REMEDIATION QA (branch-only).
 *
 * 30 adversarial scenarios against the PRODUCTION build (vite preview) with
 * the Railway API fully mocked via Playwright route interception (ZERO real
 * backend traffic, ZERO evidence writes, ZERO Airtable mutation):
 *
 *   §A  active-assignment cross-instrument race (stale success AND stale
 *       error dropped mid-flight; card clears the instant the student
 *       switches) ·
 *   §B  Homework → Practice Live launches on canonical T_* ids; slug
 *       back-compat; unknown concept FAILS CLOSED (no default substitution);
 *       Back to Homework recovery ·
 *   §C/§E  frontend NEVER writes academic mastery state (game shell +
 *       practice live leave the server-snapshot concept-state cache
 *       byte-identical; no confidence/ownership_state/mistake_history
 *       appears anywhere in storage) ·
 *   §D  Article XIII — student practice-log surfaces render tier language
 *       only (DPM words, accuracy tiers, no "% accuracy" prose) ·
 *   §E  telemetry (numeric internals) role-gated: student shortcut inert,
 *       teacher tooling preserved ·
 *   §F/§G  Gate 1 ownership is DATA-driven (unique is_ownership_gate in the
 *       SHIPPED L01 JSON) and TWO-PROOF (skip AND together must both be
 *       evidenced; either alone fails; broken lesson data fails clear) ·
 *   §K  BE.2 response compatibility (accuracy_tier renders, absent numerics
 *       stay absent — never fabricated 70/0; elevated numerics intact) ·
 *   §J  409 selection_required / 403 wrong_student / 503 retryable flows
 *       preserved through the §A-guarded fetch path ·
 *   §N  full network capture: converter ZERO, gate-evidence ZERO,
 *       /student?email= ZERO, no origins beyond the frozen baseline set ·
 *   mobile 390x844 + 393x852 + 430x932 with overflow checks.
 *
 * §F/§G and §K run as in-browser unit governance: the REAL shipped modules
 * (ownershipGovernance.js, practiceLogApi.js) are esbuild-bundled from the
 * work tree and executed against the REAL /lesson_data JSON served by the
 * production preview — the exact artifacts under review, not copies.
 *
 * Usage:  npm run build && node tests/m1r2_fe_qa.mjs
 * Output: qa-artifacts/m1r2-fe-qa-results.json, qa-artifacts/m1r2-fe-screens/
 * (artifacts are NOT committed)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import esbuild from 'esbuild'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'qa-artifacts')
const SCREENS = resolve(OUT, 'm1r2-fe-screens')
mkdirSync(SCREENS, { recursive: true })

const PORT = 4174
const APP = `http://localhost:${PORT}`
const API = 'https://deployable-python-codebase-som-production.up.railway.app'
const CONVERTER_HOSTS = /(motesart-converter\.netlify\.app|school-of-motesart\.netlify\.app\/api\/)/
// Third-party origins present in index.html at the frozen baseline c89bed0
// (fonts + icon/chart CDN). Anything beyond this exact set fails governance.
const BASELINE_THIRD_PARTY = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net',
])

const PIANO = 'recSI_ALICE_PIANO'
const CELLO = 'recSI_ALICE_CELLO'
const SINGLE = 'recSI_ALICE'

const IDENT_RESOLVED = {
  user_id: 'recUSER_ALICE', student_record_id: 'recSTU_ALICE',
  student_instrument_id: SINGLE, role: 'student', selection_required: false,
  identity_status: 'resolved',
  owned_instruments: [{ student_instrument_id: SINGLE, instrument: 'Piano', label: 'Alice' }],
}
const IDENT_MULTI = {
  user_id: 'recUSER_ALICE', student_record_id: 'recSTU_ALICE',
  student_instrument_id: null, role: 'student', selection_required: true,
  identity_status: 'selection_required',
  owned_instruments: [
    { student_instrument_id: PIANO, instrument: 'Piano', label: 'Alice' },
    { student_instrument_id: CELLO, instrument: 'Cello', label: 'Alice' },
  ],
}
// M1 R3.1-FE — canonical /practice-log/dashboard/{studentId} fixture. Shape
// matches src/services/practiceLogApi.js's transformPeriod/transformSession/
// transformCalendar contract exactly (frozen field names, PRACTICE_LOG_SCHEMA.md).
const practiceLogPeriod = (dpm) => ({
  trend: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    all: [11, 0, 13, 35, 0, 0, 0], homework: [11, 0, 0, 22, 0, 0, 0],
    sheet_music: [0, 0, 13, 0, 0, 0, 0], games: [0, 0, 0, 8, 0, 0, 0], live_practice: [0, 0, 0, 5, 0, 0, 0],
  },
  goal_vs_actual: { labels: ['Homework', 'Sheet Music', 'Games', 'Live Practice'], actual: [33, 13, 8, 5], goal: [60, 30, 15, 10] },
  breakdown: {
    homework: { minutes: 39, pct: 46 }, sheet_music: { minutes: 22, pct: 26 },
    games: { minutes: 13, pct: 15 }, live_practice: { minutes: 12, pct: 14 },
  },
  consistency_days: 4, consistency_total: 7,
  dpm,
  piece_progress: [
    { name: 'C Major Scale', sessions: 8, accuracy_tier: 'owned' },
    { name: 'Hanon No. 1', sessions: 5, accuracy_tier: 'developing' },
  ],
  insight_text: 'Thursday was your strongest session this week.',
  personal_bests: { longest_session_min: 35, most_sessions_week: 4, best_month_min: 312 },
})
const DEFAULT_PRACTICE_LOG_DASHBOARD = {
  student: { id: 'recSTU_ALICE', name: 'Alice', instrument: 'Piano', grade: '6th Grade', school: 'Westside Music', level: 4 },
  periods: {
    // Article XIII: student payloads withhold dpm on most periods (null) —
    // 'week' carries it so D1/D2 can verify the tier-WORD mapping still works
    // when the backend DOES supply it (e.g. an elevated/allowed context).
    week: practiceLogPeriod({ drive: 82, passion: 74, motivation: 66 }),
    month: practiceLogPeriod(null), quarter: practiceLogPeriod(null), year: practiceLogPeriod(null),
  },
  sessions: [
    {
      log_id: 'log1', title: 'C Major — Hands Together', practiced_at: new Date().toISOString(),
      activity_type: 'homework', duration_min: 22, accuracy_tier: 'owned', self_rating: 'ok',
      dpm: { drive: 82, passion: 71, motivation: 88 }, ambassador_note: 'Great consistency this session.', source: 'school',
    },
    {
      log_id: 'log2', title: 'Hanon Exercise No. 1', practiced_at: new Date(Date.now() - 86400000).toISOString(),
      activity_type: 'sheet_music', duration_min: 18, accuracy_tier: 'developing', self_rating: 'ok',
      dpm: null, ambassador_note: '', source: 'school',
    },
  ],
  calendar: { days: { '1': 20, '2': 0, '3': 35, '4': 12 } },
}

const row = (id, num, title, si, extra = {}) => ({
  id, assignment_id: id, assignment_number: num, name: title, title,
  status: 'Assigned', student: ['recSTU_ALICE'], due_date: '2026-08-14',
  minutes_target: 15, type: 'Homework', teacher_feedback: null,
  homework_template: null, student_instruments: [si], created_by: null,
  concept_id: 'T_HALF_STEP', completed_at: null, evidence_ref: null, ...extra,
})
// Canonical Airtable-shaped rec… ids (rec + ≥14 alphanumerics) — anything
// shorter is correctly refused a launch route by isCanonicalAssignmentId.
const ASG_SINGLE = 'recMNA00000000001'
const PIANO_ROWS = [row('recPNO00000000001', 11, 'Piano scales', PIANO)]
const CELLO_ROWS = [row('recCLO00000000001', 21, 'Cello bowing', CELLO)]
const SINGLE_ROWS = [row(ASG_SINGLE, 1, 'Half step homework', SINGLE)]
const ACTIVE_PIANO = row('recACT00000000001', 31, 'Warm-up focus', PIANO)

// Server-snapshot concept-state cache seed (what a REAL server refresh leaves
// behind). §C/§E require this to survive game/practice surfaces UNCHANGED.
const CACHE_KEY = `som_concept_states::${SINGLE}`
const CACHE_SEED = JSON.stringify({
  T_HALF_STEP: {
    concept_id: 'T_HALF_STEP', ownership_state: 'practicing',
    evidence_count: 3, _source: 'server', last_updated: '2026-08-01T00:00:00.000Z',
  },
})

const results = []
const governanceLog = []
let failures = 0
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

async function ensurePreview() {
  try { const r = await fetch(`${APP}/homework`); if (r.ok) return null } catch { /* spawn */ }
  const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore', detached: true })
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 250))
    try { const r = await fetch(`${APP}/homework`); if (r.ok) return child } catch { /* retry */ }
  }
  throw new Error('vite preview did not become ready on :' + PORT)
}

async function launch() {
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required']
  try { return await chromium.launch({ args }) }
  catch { return await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args }) }
}

/**
 * Bundle a REAL work-tree module for in-browser unit governance.
 * IIFE, import.meta.env replaced with an inert object — the module code
 * itself is byte-for-byte what ships.
 */
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

async function makeContext(browser, opts) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 800 },
    ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}),
    permissions: ['camera', 'microphone'],
  })
  const state = { mineCalls: [], activeCalls: [], pageErrors: [] }
  await context.addInitScript(({ stored, seedStudent, seedCache, user }) => {
    localStorage.setItem('som_token', 'qa-token')
    localStorage.setItem('som_user', JSON.stringify(user))
    if (stored) localStorage.setItem('som_selected_instrument', JSON.stringify(stored))
    if (seedStudent) localStorage.setItem('som_student_id', seedStudent)
    if (seedCache) localStorage.setItem(seedCache.key, seedCache.value)
  }, {
    stored: opts.storedSelection || null,
    seedStudent: opts.seedStudent || null,
    seedCache: opts.seedCache || null,
    user: opts.user || { id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' },
  })
  await context.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/auth/verify') {
      return route.fulfill({ json: { valid: true, user: opts.user || { id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' } } })
    }
    if (u.pathname === '/auth/learning-identity') {
      return route.fulfill({ json: opts.identity || IDENT_RESOLVED })
    }
    if (u.pathname === '/assignments/mine') {
      const call = state.mineCalls.length + 1
      state.mineCalls.push({ url: route.request().url(), qs: u.searchParams.get('student_instrument_id') })
      const r = (opts.mine || (() => ({ body: [] })))(u, call)
      if (r.delayMs) await new Promise(res => setTimeout(res, r.delayMs))
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    const am = u.pathname.match(/^\/concept-state\/([^/]+)\/active-assignment$/)
    if (am) {
      state.activeCalls.push({ si: am[1] })
      const r = (opts.active || (() => ({ body: { has_active_assignment: false, assignment: null } })))(am[1])
      if (r.delayMs) await new Promise(res => setTimeout(res, r.delayMs))
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    // M1 R3.1-FE — PracticeLogPage now reads real canonical data via
    // usePracticeLogDashboard() instead of local mock arrays; mock the
    // dashboard payload so the D1-D4 §D tier-word assertions still exercise
    // the real render path end to end.
    if (u.pathname.match(/^\/practice-log\/dashboard\/[^/]+$/)) {
      const r = opts.practiceLogDashboard || (() => ({ body: DEFAULT_PRACTICE_LOG_DASHBOARD }))
      const res = r(u)
      if (res.delayMs) await new Promise(resolve => setTimeout(resolve, res.delayMs))
      return route.fulfill({ status: res.status || 200, json: res.body })
    }
    return route.fulfill({ status: 404, json: { detail: 'qa-unmocked' } })
  })
  context.on('request', (req) => {
    governanceLog.push({ scenario: opts.name, method: req.method(), url: req.url() })
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => state.pageErrors.push(String(e)))
  return { context, page, state }
}

const sel = {
  optPiano: `[data-testid="instrument-option-${PIANO}"]`,
  optCello: `[data-testid="instrument-option-${CELLO}"]`,
  select: '[data-testid="instrument-select"]',
  active: '[data-testid="active-assignment"]',
  activeRetry: '[data-testid="active-assignment-retryable"]',
  blocked: '[data-testid="assignments-blocked"]',
  retryable: '[data-testid="assignments-retryable"]',
  unavailable: '[data-testid="practice-unavailable"]',
}

const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

// ─────────────────────────────────────────────────────────────── §A ──

async function a1_switch_clears_card(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'A1', identity: IDENT_MULTI,
    mine: (u) => u.searchParams.get('student_instrument_id') === PIANO
      ? { body: PIANO_ROWS }
      : u.searchParams.get('student_instrument_id') === CELLO
        ? { body: CELLO_ROWS }
        : { status: 409, body: { detail: 'selection_required' } },
    active: (si) => si === PIANO
      ? { body: { has_active_assignment: true, assignment: ACTIVE_PIANO } }
      : { body: { has_active_assignment: false, assignment: null }, delayMs: 500 },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.optPiano).click()
  await page.locator(sel.active).waitFor({ timeout: 10000 })
  check('A1 active-assignment card renders for instrument A', true)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('som:selection-required')))
  await page.locator(sel.optCello).waitFor({ timeout: 10000 })
  await page.locator(sel.optCello).click()
  await page.waitForTimeout(120) // cello active still ~380ms out — A must be GONE already
  check('A1 §A stale card cleared the INSTANT the instrument switches (before B responds)',
    await page.locator(sel.active).count() === 0 &&
    await page.getByText('Warm-up focus').count() === 0)
  await page.getByText('Cello bowing').waitFor({ timeout: 10000 })
  check('A1 instrument B surface renders with NO instrument-A active card',
    await page.getByText('Warm-up focus').count() === 0)
  await page.screenshot({ path: resolve(SCREENS, 'a1-after-switch.png') })
  await context.close()
}

async function a2_stale_success_dropped(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'A2', identity: IDENT_MULTI,
    mine: (u) => u.searchParams.get('student_instrument_id') === PIANO
      ? { body: PIANO_ROWS }
      : u.searchParams.get('student_instrument_id') === CELLO
        ? { body: CELLO_ROWS }
        : { status: 409, body: { detail: 'selection_required' } },
    // Instrument A's active assignment arrives LATE — after the student has
    // already switched to B. Its success payload must be dropped, not drawn.
    active: (si) => si === PIANO
      ? { body: { has_active_assignment: true, assignment: ACTIVE_PIANO }, delayMs: 1200 }
      : { body: { has_active_assignment: false, assignment: null } },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.optPiano).click()
  await page.waitForTimeout(150) // do NOT wait for A's active card — switch mid-flight
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('som:selection-required')))
  await page.locator(sel.optCello).waitFor({ timeout: 10000 })
  await page.locator(sel.optCello).click()
  await page.getByText('Cello bowing').waitFor({ timeout: 10000 })
  await page.waitForTimeout(1600) // stale A response has now landed — and been dropped
  check('A2 §A DELAYED instrument-A active-assignment success NEVER renders under B',
    await page.locator(sel.active).count() === 0 &&
    await page.getByText('Warm-up focus').count() === 0,
    `activeCalls=${JSON.stringify(state.activeCalls)}`)
  check('A2 B rows remain intact after the stale response lands',
    await page.getByText('Cello bowing').count() === 1)
  await page.screenshot({ path: resolve(SCREENS, 'a2-stale-dropped.png') })
  await context.close()
}

async function a3_stale_error_dropped(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'A3', identity: IDENT_MULTI,
    mine: (u) => u.searchParams.get('student_instrument_id') === PIANO
      ? { body: PIANO_ROWS }
      : u.searchParams.get('student_instrument_id') === CELLO
        ? { body: CELLO_ROWS }
        : { status: 409, body: { detail: 'selection_required' } },
    // A's active assignment FAILS late with 503. If the stale error were
    // applied it would paint the retryable banner over B's clean state.
    active: (si) => si === PIANO
      ? { status: 503, body: { detail: 'active_assignment_unavailable_retryable' }, delayMs: 1200 }
      : { body: { has_active_assignment: false, assignment: null } },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.optPiano).click()
  await page.waitForTimeout(150)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('som:selection-required')))
  await page.locator(sel.optCello).waitFor({ timeout: 10000 })
  await page.locator(sel.optCello).click()
  await page.getByText('Cello bowing').waitFor({ timeout: 10000 })
  await page.waitForTimeout(1600)
  check('A3 §A DELAYED instrument-A active-assignment ERROR never paints B (stale 503 dropped)',
    await page.locator(sel.activeRetry).count() === 0 &&
    await page.locator(sel.active).count() === 0)
  check('A3 B assignment list unaffected by the stale error',
    await page.getByText('Cello bowing').count() === 1)
  await context.close()
}

// ─────────────────────────────────────────────────────────────── §B ──

async function b1_launch_canonical(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'B1', identity: IDENT_RESOLVED, mobile: true,
    viewport: { width: 430, height: 932 },
    mine: () => ({ body: SINGLE_ROWS }),
  })
  await page.goto(`${APP}/homework`)
  await page.getByText('Half step homework').waitFor({ timeout: 10000 })
  check('B1 430x932 homework: no horizontal overflow', await noOverflow(page))
  await page.getByRole('button', { name: 'Launch' }).first().click()
  await page.waitForURL(/\/practice-live\?/, { timeout: 10000 })
  const url = new URL(page.url())
  check('B1 §B launch carries the CANONICAL T_* concept id (never slug, never invented)',
    url.searchParams.get('concept') === 'T_HALF_STEP', page.url())
  check('B1 §L launch carries the canonical rec… assignment_id (assignment_number NEVER used)',
    url.searchParams.get('assignment_id') === ASG_SINGLE && !url.search.includes('assignment_number'),
    page.url())
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  check('B1 §B Practice Live resolves the T_* id to the Half Step experience',
    await page.locator(sel.unavailable).count() === 0)
  await page.screenshot({ path: resolve(SCREENS, 'b1-launch-halfstep.png') })
  await context.close()
}

async function b2_direct_tstar(browser) {
  const { context, page, state } = await makeContext(browser, { name: 'B2', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/practice-live?concept=T_WHOLE_STEP`)
  await page.getByText('Whole Step', { exact: false }).first().waitFor({ timeout: 15000 })
  check('B2 §B direct T_WHOLE_STEP resolves canonically (no alias, no substitution)',
    await page.locator(sel.unavailable).count() === 0)
  check('B2 no page crash on canonical resolution', state.pageErrors.length === 0,
    state.pageErrors.join('; '))
  await context.close()
}

async function b3_slug_backcompat(browser) {
  const { context, page } = await makeContext(browser, { name: 'B3', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/practice-live?concept=half-step`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  check('B3 §B legacy slug half-step still resolves (back-compat, same config entry)',
    await page.locator(sel.unavailable).count() === 0)
  await context.close()
}

async function b4_unknown_fails_closed(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'B4', identity: IDENT_RESOLVED, mobile: true,
    viewport: { width: 393, height: 852 },
  })
  await page.goto(`${APP}/practice-live?concept=T_NOT_A_REAL_CONCEPT`)
  await page.locator(sel.unavailable).waitFor({ timeout: 15000 })
  check('B4 §B unknown concept FAILS CLOSED (practice-unavailable screen)', true)
  const body = await page.locator('body').innerText()
  check('B4 §B NO default substitution (Major Scale Pattern is NOT silently taught)',
    !body.includes('Major Scale Pattern'))
  check('B4 student-safe copy, no crash', body.includes('isn’t ready') || body.includes("isn't ready"),
    state.pageErrors.join('; '))
  check('B4 393x852: no horizontal overflow', await noOverflow(page))
  await page.screenshot({ path: resolve(SCREENS, 'b4-fail-closed.png') })
  await context.close()
}

async function b5_back_to_homework(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'B5', identity: IDENT_RESOLVED, mine: () => ({ body: SINGLE_ROWS }),
  })
  await page.goto(`${APP}/practice-live?concept=T_NOT_A_REAL_CONCEPT`)
  await page.locator(sel.unavailable).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: 'Back to Homework' }).click()
  await page.waitForURL(/\/homework/, { timeout: 10000 })
  await page.getByText('Half step homework').waitFor({ timeout: 10000 })
  check('B5 §B fail-closed screen recovers to /homework (student never stranded)', true)
  await context.close()
}

// ──────────────────────────────────────────────────────────── §C/§E ──

async function c1_game_no_local_mastery(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'C1', identity: IDENT_RESOLVED,
    seedStudent: SINGLE, seedCache: { key: CACHE_KEY, value: CACHE_SEED },
  })
  await page.goto(`${APP}/game?mode=academic&concept=T_HALF_STEP&assignment_id=recMNA`)
  await page.waitForTimeout(2500)
  const after = await page.evaluate((k) => localStorage.getItem(k), CACHE_KEY)
  check('C1 §C game surface leaves the server concept-state snapshot BYTE-IDENTICAL',
    after === CACHE_SEED, `after=${after}`)
  const all = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
  check('C1 §C no confidence/mistake_history mastery keys written anywhere by the game shell',
    !all.includes('mistake_history') && !all.includes('"confidence"'),
    '')
  check('C1 game shell loads without crashing', state.pageErrors.length === 0,
    state.pageErrors.join('; '))
  await context.close()
}

async function c2_practice_live_no_write(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'C2', identity: IDENT_RESOLVED,
    seedStudent: SINGLE, seedCache: { key: CACHE_KEY, value: CACHE_SEED },
  })
  await page.goto(`${APP}/practice-live?concept=half-step`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(3000) // engines, bridges and timers settle
  const after = await page.evaluate((k) => localStorage.getItem(k), CACHE_KEY)
  check('C2 §E Practice Live leaves the server concept-state snapshot BYTE-IDENTICAL (no engine overwrite)',
    after === CACHE_SEED, `after=${after}`)
  await context.close()
}

async function c3_storage_sweep(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'C3', identity: IDENT_RESOLVED,
    seedStudent: SINGLE, seedCache: { key: CACHE_KEY, value: CACHE_SEED },
  })
  for (const path of ['/practice-live?concept=T_HALF_STEP', '/game?mode=academic&concept=T_HALF_STEP&assignment_id=recMNA00000000001']) {
    await page.goto(`${APP}${path}`)
    await page.waitForTimeout(2000)
  }
  const dump = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
  check('C3 §C/§E after game AND practice live: zero locally-derived mastery fields in ANY storage key',
    !dump.includes('mistake_history') && !dump.includes('ownership_state":"owned') &&
    !dump.includes('"confidence"'),
    '')
  check('C3 the ONLY concept-state content is the seeded server snapshot',
    (await page.evaluate((k) => localStorage.getItem(k), CACHE_KEY)) === CACHE_SEED)
  await context.close()
}

// ─────────────────────────────────────────────────────────────── §D ──

const DPM_WORDS = ['Strong', 'On Track', 'Building', 'Needs care', '—']
const TIER_WORDS = ['Mastered', 'Owned it', 'Almost there', 'Growing', 'Just starting', '—']

async function d1_dpm_words(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'D1', identity: IDENT_RESOLVED, mobile: true, viewport: { width: 390, height: 844 },
  })
  await page.goto(`${APP}/practice-log`)
  await page.locator('.pl-dpmval').first().waitFor({ timeout: 15000 })
  const vals = await page.locator('.pl-dpmval').allInnerTexts()
  check('D1 §D DPM tiles render Motesart tier WORDS (Drive/Passion/Motivation)',
    vals.length >= 3 && vals.every(v => DPM_WORDS.includes(v.trim())), JSON.stringify(vals))
  check('D1 §D DPM tiles contain NO raw numerics', vals.every(v => !/\d/.test(v)), JSON.stringify(vals))
  check('D1 390x844: no horizontal overflow', await noOverflow(page))
  await page.screenshot({ path: resolve(SCREENS, 'd1-dpm-words.png') })
  await context.close()
}

async function d2_session_modal_tiers(browser) {
  const { context, page } = await makeContext(browser, { name: 'D2', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/practice-log`)
  await page.locator('.pl-srow').first().waitFor({ timeout: 15000 })
  await page.locator('.pl-srow').first().click()
  await page.locator('.pl-sdet.show').waitFor({ timeout: 5000 })
  const modal = await page.locator('.pl-sdet.show').innerText()
  check('D2 §D session detail Accuracy renders a TIER, never a percentage',
    !/\d+\s*%/.test(modal), modal.slice(0, 200))
  const dpmVals = await page.locator('.pl-sdet.show .pl-sdetdval').allInnerTexts()
  check('D2 §D session detail Drive/Passion/Motivation are words',
    dpmVals.length === 3 && dpmVals.every(v => DPM_WORDS.includes(v.trim())), JSON.stringify(dpmVals))
  check('D2 §D a tier word actually renders (not blank suppression)',
    TIER_WORDS.some(w => modal.includes(w)), '')
  await page.screenshot({ path: resolve(SCREENS, 'd2-session-modal.png') })
  await context.close()
}

async function d3_pieces_and_prose(browser) {
  const { context, page } = await makeContext(browser, { name: 'D3', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/practice-log`)
  await page.locator('.pl-dpmval').first().waitFor({ timeout: 15000 })
  const body = await page.locator('body').innerText()
  check('D3 §D zero "% accuracy" prose anywhere on the student surface',
    !/%\s*accuracy/i.test(body) && !/accuracy on Level/i.test(body))
  check('D3 §D piece/ambassador language is tier-based (Owned/Growing/… present)',
    TIER_WORDS.some(w => body.includes(w)))
  await context.close()
}

async function d4_no_academic_percent(browser) {
  const { context, page } = await makeContext(browser, { name: 'D4', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/practice-log`)
  await page.locator('.pl-dpmval').first().waitFor({ timeout: 15000 })
  const body = await page.locator('body').innerText()
  check('D4 §D student surface exposes NO raw academic internals (confidence/mastery tokens)',
    !/confidence/i.test(body) && !/mastery/i.test(body))
  check('D4 §D no percent adjacent to academic words (accuracy/drive/passion/motivation)',
    !/(accuracy|drive|passion|motivation)[^.%]{0,20}\d+\s*%/i.test(body) &&
    !/\d+\s*%[^.]{0,20}(accuracy|drive|passion|motivation)/i.test(body))
  await context.close()
}

// ─────────────────────────────────────────────────────────────── §E ──

async function e1_student_telemetry_blocked(browser) {
  const { context, page } = await makeContext(browser, { name: 'E1', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/practice-live?concept=half-step`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.keyboard.press('Control+Shift+T')
  await page.waitForTimeout(400)
  check('E1 §E STUDENT Ctrl+Shift+T is inert — telemetry (numeric internals) never opens',
    await page.locator('button[title="Toggle Telemetry Panel"]').count() === 0)
  await context.close()
}

async function e2_teacher_telemetry_allowed(browser) {
  // The TelemetryPanel mounts in the legacy camera view (not reached by the
  // Theory Phase flow), so the teacher-side proof is (a) the elevated-role
  // gate is COMPILED INTO the shipped bundle — the tooling was preserved,
  // not deleted — and (b) the shortcut is crash-free for an elevated role.
  const { context, page, state } = await makeContext(browser, {
    name: 'E2', identity: IDENT_RESOLVED,
    user: { id: 'recUSER_T', email: 'teacher@example.com', role: 'teacher', name: 'Teach' },
  })
  await page.goto(`${APP}/practice-live?concept=half-step`)
  await page.getByText('Half Step', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.keyboard.press('Control+Shift+T')
  await page.waitForTimeout(300)
  check('E2 §E teacher-role shortcut path is live and crash-free', state.pageErrors.length === 0,
    state.pageErrors.join('; '))
  const assets = await page.evaluate(async () => {
    const html = await (await fetch('/')).text()
    const srcs = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1])
    let bundle = ''
    for (const s of srcs) bundle += await (await fetch(s)).text()
    return {
      roleGate: /["']teacher["'],\s*["']admin["'],\s*["']founder["']/.test(bundle),
      panelKept: bundle.includes('Toggle Telemetry Panel'),
    }
  })
  check('E2 §E telemetry tooling PRESERVED in the shipped bundle behind the elevated-role gate',
    assets.roleGate && assets.panelKept, JSON.stringify(assets))
  await context.close()
}

// ──────────────────────────────────────────── §F/§G unit governance ──

async function fg_ownership(browser, ogBundle) {
  const { context, page } = await makeContext(browser, { name: 'FG', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/homework`)
  await page.addScriptTag({ content: ogBundle })
  const r = await page.evaluate(async () => {
    const res = await fetch('/lesson_data/L01_skip_and_together.json')
    const lesson = await res.json()
    const OG = window.__OG
    const q = OG.resolveOwnershipQuestion(lesson)
    const doctoredTwo = JSON.parse(JSON.stringify(lesson))
    doctoredTwo.gate_steps.step_6_quiz_it.questions.push({ ...q, question_id: 'G1_QX' })
    const doctoredZero = JSON.parse(JSON.stringify(lesson))
    doctoredZero.gate_steps.step_6_quiz_it.questions =
      doctoredZero.gate_steps.step_6_quiz_it.questions.map(x => ({ ...x, is_ownership_gate: false }))
    return {
      qId: q?.question_id, isGate: q?.is_ownership_gate === true,
      groups: q?.required_signal_groups ? Object.keys(q.required_signal_groups) : null,
      groupsNonEmpty: q?.required_signal_groups
        ? Object.values(q.required_signal_groups).every(l => Array.isArray(l) && l.length > 0) : false,
      both: OG.ownershipExplanationPasses(q, 'A skip has a note between the keys, but together means nothing between — right next to each other.'),
      skipOnly: OG.ownershipExplanationPasses(q, 'A skip has a note between the two keys.'),
      togetherOnly: OG.ownershipExplanationPasses(q, 'Together means the keys are right next to each other.'),
      gibberish: OG.ownershipExplanationPasses(q, 'banana banana banana'),
      empty: OG.ownershipExplanationPasses(q, ''),
      caseProof: OG.ownershipExplanationPasses(q, 'A SKIP has a NOTE BETWEEN; TOGETHER means NOTHING BETWEEN them!'),
      twoOwners: OG.resolveOwnershipQuestion(doctoredTwo),
      zeroOwners: OG.resolveOwnershipQuestion(doctoredZero),
    }
  })
  check('G1 §F SHIPPED L01 has exactly ONE data-driven ownership question (G1_Q7, is_ownership_gate)',
    r.qId === 'G1_Q7' && r.isGate, JSON.stringify({ qId: r.qId }))
  check('G2 §G shipped required_signal_groups carry BOTH semantic sides (skip + together)',
    Array.isArray(r.groups) && r.groups.length === 2 &&
    r.groups.includes('skip') && r.groups.includes('together') && r.groupsNonEmpty,
    JSON.stringify(r.groups))
  check('G3 §G explanation proving BOTH sides PASSES (case-insensitive)',
    r.both === true && r.caseProof === true)
  check('G4 §G skip-only explanation FAILS (half a proof is not ownership of two concepts)',
    r.skipOnly === false)
  check('G5 §G together-only explanation FAILS', r.togetherOnly === false)
  check('G6 §F gibberish/empty fail; doctored lessons (2 owners / 0 owners) fail CLEAR (null, no guess)',
    r.gibberish === false && r.empty === false && r.twoOwners === null && r.zeroOwners === null)
  await context.close()
}

// ───────────────────────────────────────────────── §K unit governance ──

async function k_transforms(browser, plBundle) {
  const { context, page } = await makeContext(browser, { name: 'K', identity: IDENT_RESOLVED })
  await page.goto(`${APP}/homework`)
  await page.addScriptTag({ content: plBundle })
  const r = await page.evaluate(() => {
    const PL = window.__PL
    const studentSession = PL.transformSession({
      log_id: 'L1', title: 'Half steps', practiced_at: '2026-08-08T10:00:00Z',
      activity_type: 'homework', duration_min: 12, accuracy_tier: 'owned',
      dpm: null, self_rating: 'ok', source: 'school', ambassador_note: '',
    })
    const bareSession = PL.transformSession({
      log_id: 'L2', title: 'Scales', practiced_at: '2026-08-08T10:00:00Z',
      activity_type: 'games', duration_min: 5, self_rating: 'great', source: 'school',
    })
    const studentPeriod = PL.transformPeriod({
      trend: { labels: ['M'], all: [10] }, breakdown: {}, consistency_days: 2,
      consistency_total: 7,
      piece_progress: [{ name: 'Ode to Joy', sessions: 3, accuracy_tier: 'developing' }],
      insight_text: '', personal_bests: {},
    })
    const elevatedSession = PL.transformSession({
      log_id: 'L3', title: 'Teacher view', practiced_at: '2026-08-08T10:00:00Z',
      activity_type: 'homework', duration_min: 20, accuracy_pct: 91,
      dpm: { drive: 82, passion: 74, motivation: 66 }, self_rating: 'great', source: 'school',
    })
    return { studentSession, bareSession, studentPeriod, elevatedSession }
  })
  check('K1 §K student session: accuracy_tier renders as tier word, DPM stays null (never 0, never 70)',
    r.studentSession.acc === 'Owned it' && r.studentSession.d === null &&
    r.studentSession.p === null && r.studentSession.m === null,
    JSON.stringify(r.studentSession))
  check('K1b §K session with NO accuracy at all renders "—" — the fabricated default-70 is gone',
    r.bareSession.acc === '—' && r.bareSession.d === null, JSON.stringify(r.bareSession))
  check('K2 §K student period: withheld DPM stays null; pieces render tier language + discrete band',
    r.studentPeriod.dpm === null &&
    r.studentPeriod.pieces[0].meta.includes('Growing') &&
    !/\d+%/.test(r.studentPeriod.pieces[0].meta) &&
    r.studentPeriod.pieces[0].pct === 45,
    JSON.stringify(r.studentPeriod.pieces))
  check('K3 §K elevated payloads keep real numerics (teacher/admin views intact)',
    r.elevatedSession.acc === '91%' && r.elevatedSession.d === 82,
    JSON.stringify(r.elevatedSession))
  await context.close()
}

// ─────────────────────────────────────────────────────────────── §J ──

async function j1_409(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'J1', identity: IDENT_MULTI,
    storedSelection: { user_id: 'recUSER_ALICE', student_instrument_id: PIANO },
    mine: () => ({ status: 409, body: { detail: 'selection_required' } }),
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.select).waitFor({ timeout: 10000 })
  await page.waitForTimeout(400)
  check('J1 §J server 409 selection_required returns to explicit selection (pointer cleared)',
    await page.evaluate(() => localStorage.getItem('som_selected_instrument')) === null,
    `mineCalls=${state.mineCalls.length}`)
  await context.close()
}

async function j2_403(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'J2', identity: IDENT_MULTI,
    storedSelection: { user_id: 'recUSER_ALICE', student_instrument_id: PIANO },
    mine: () => ({ status: 403, body: { detail: 'wrong_student' } }),
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.blocked).waitFor({ timeout: 10000 })
  check('J2 §J 403 wrong_student fails CLOSED — zero rows, never an empty-homework masquerade',
    (await page.locator('.hw-acard').count()) === 0 &&
    !(await page.locator('body').innerText()).includes('No assignments right now'))
  await context.close()
}

async function j3_503(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'J3', identity: IDENT_RESOLVED,
    mine: (_u, call) => call === 1
      ? { status: 503, body: { detail: 'identity_unavailable_retryable' } }
      : { body: SINGLE_ROWS },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.retryable).waitFor({ timeout: 10000 })
  await page.locator(`${sel.retryable} button`).click()
  await page.getByText('Half step homework').waitFor({ timeout: 10000 })
  check('J3 §J 503 renders RETRYABLE (never permanent) and retry recovers',
    state.mineCalls.length === 2, `calls=${state.mineCalls.length}`)
  await context.close()
}

// ─────────────────────────────────────────────────────────────── §N ──

function n1_governance() {
  const converter = governanceLog.filter(r =>
    CONVERTER_HOSTS.test(r.url) ||
    (!r.url.startsWith(API) && /\/api\/(practice-events|concept-state)/.test(r.url)))
  const gateEvidence = governanceLog.filter(r =>
    r.method === 'POST' && /practice[-_]event/i.test(r.url))
  const emailLookup = governanceLog.filter(r => /\/student\?email=/.test(r.url))
  const offBaseline = governanceLog.filter(r => {
    if (r.url.startsWith(APP) || r.url.startsWith(API)) return false
    try { return !BASELINE_THIRD_PARTY.has(new URL(r.url).origin) } catch { return true }
  })
  check('N1 §I GOVERNANCE converter traffic ZERO across all 29 prior scenarios',
    converter.length === 0, JSON.stringify(converter.slice(0, 3)))
  check('N1 §H GOVERNANCE gate-evidence writes ZERO (no Practice_Events POST from any surface)',
    gateEvidence.length === 0, JSON.stringify(gateEvidence.slice(0, 3)))
  check('N1 §J GOVERNANCE /student?email= ZERO (legacy identity lookup stays dead)',
    emailLookup.length === 0)
  check('N1 §N GOVERNANCE no origins beyond the frozen baseline set (fonts + jsdelivr)',
    offBaseline.length === 0,
    JSON.stringify([...new Set(offBaseline.map(r => { try { return new URL(r.url).origin } catch { return r.url } }))]))
}

// ────────────────────────────────────────────────────────────── run ──

const [ogBundle, plBundle] = await Promise.all([
  bundleModule('src/components/gate0/ownershipGovernance.js', '__OG',
    '{ resolveOwnershipQuestion: M.resolveOwnershipQuestion, ownershipExplanationPasses: M.ownershipExplanationPasses }'),
  bundleModule('src/services/practiceLogApi.js', '__PL',
    '{ transformSession: M.transformSession, transformPeriod: M.transformPeriod }'),
])

const previewChild = await ensurePreview()
const browser = await launch()
try {
  await a1_switch_clears_card(browser)
  await a2_stale_success_dropped(browser)
  await a3_stale_error_dropped(browser)
  await b1_launch_canonical(browser)
  await b2_direct_tstar(browser)
  await b3_slug_backcompat(browser)
  await b4_unknown_fails_closed(browser)
  await b5_back_to_homework(browser)
  await c1_game_no_local_mastery(browser)
  await c2_practice_live_no_write(browser)
  await c3_storage_sweep(browser)
  await d1_dpm_words(browser)
  await d2_session_modal_tiers(browser)
  await d3_pieces_and_prose(browser)
  await d4_no_academic_percent(browser)
  await e1_student_telemetry_blocked(browser)
  await e2_teacher_telemetry_allowed(browser)
  await fg_ownership(browser, ogBundle)
  await k_transforms(browser, plBundle)
  await j1_409(browser)
  await j2_403(browser)
  await j3_503(browser)
  n1_governance()
} finally {
  await browser.close()
  if (previewChild) { try { process.kill(-previewChild.pid) } catch { /* gone */ } }
}

writeFileSync(resolve(OUT, 'm1r2-fe-qa-results.json'),
  JSON.stringify({ results, requests: governanceLog }, null, 2))
const passed = results.filter(r => r.ok).length
console.log(`\nQA TOTAL: ${passed}/${results.length} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
