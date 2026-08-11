/**
 * m1r1_qa.mjs — M1 R1 FRONTEND targeted regression harness (branch-only QA).
 *
 * Runs the PRODUCTION build (vite preview) against a fully mocked backend
 * (Playwright route interception — ZERO real network evidence writes) and
 * verifies every M1 R1 card requirement:
 *
 *   identity: /student?email= never called · /auth/learning-identity under
 *   authenticated flow · one-instrument auto-resolve · multi-instrument never
 *   auto-picks · explicit selection works · stale cached selection rejected ·
 *   zero instruments block writes · 503 retryable · 403 fail-closed ·
 *   409 selection_required → selection flow · 409 duplicate_event_mismatch
 *   surfaced · canonical rec… assignment_id · assignment_number display-only ·
 *   /assignments/mine canonical fields · active-assignment null = none ·
 *   no fabricated concepts · bandless Rhythm Racer · student-safe responses ·
 *   offline queue byte-stability + exact client_event_id · one evidence event
 *   per activity · zero converter writes · zero gate writes · mobile 390x844 +
 *   393x852 · network capture.
 *
 * Usage:  npm i --no-save playwright && node tests/m1r1_qa.mjs
 * Output: qa-artifacts/qa-results.json, network-capture.json, screens/*.png
 * (artifacts are NOT committed)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'qa-artifacts')
const SCREENS = resolve(OUT, 'screens')
mkdirSync(SCREENS, { recursive: true })

const API = 'https://deployable-python-codebase-som-production.up.railway.app'
const CONVERTER = 'motesart-converter.netlify.app'
const PORT = 4173
const BASE = `http://localhost:${PORT}`

const results = []
const capture = []       // every interesting request across all scenarios
const consoleLog = []    // page console messages
let scenario = 'boot'

function record(name, pass, detail = '') {
  results.push({ test: name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}
const uuidV4 = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || '')

// ── student-safe canonical responses (backend R1 shapes, NOTHING internal) ──
const studentSafeState = (concept_id, chapter, assignment_status = null, duplicate = false) => ({
  concept_id, chapter,
  chapter_label: chapter === 'rhythm_racer' ? 'Rhythm Racer' : 'Find It',
  confidence_tier: 'developing',
  next_action: 'Reinforce pattern recognition',
  focus_zone: 'Half steps at 3→4 and 7→8',
  ownership_level: '',
  homes_completed: [],
  practice_count: 3,
  last_practiced_at: '2026-08-09T04:58:00+00:00',
  assignment_status, duplicate,
})

const IDENTITY = {
  resolved: {
    user_id: 'recUSERQA000000001', student_record_id: 'recSTUQA000000001',
    student_instrument_id: 'recSIQA0000000001', role: 'student',
    selection_required: false, identity_status: 'resolved',
    owned_instruments: [{ student_instrument_id: 'recSIQA0000000001', instrument: 'Piano', label: 'QA Student' }],
  },
  multi: {
    user_id: 'recUSERQA000000001', student_record_id: 'recSTUQA000000001',
    student_instrument_id: null, role: 'student',
    selection_required: true, identity_status: 'selection_required',
    owned_instruments: [
      { student_instrument_id: 'recSIQA000000000A', instrument: 'Piano', label: 'QA Student — Piano' },
      { student_instrument_id: 'recSIQA000000000B', instrument: 'Drums', label: 'QA Student — Drums' },
    ],
  },
  unresolved: {
    user_id: 'recUSERQA000000001', student_record_id: null,
    student_instrument_id: null, role: 'student',
    selection_required: false, identity_status: 'unresolved', owned_instruments: [],
  },
}

const ASSIGNMENT_REC = 'recASGNQA00000001'
const serializerRow = (over = {}) => ({
  id: ASSIGNMENT_REC, assignment_id: ASSIGNMENT_REC, assignment_number: 42,
  name: 'Half Step Hunt', status: 'Assigned', student: ['recSTUQA000000001'],
  due_date: '2026-08-15', title: 'Half Step Hunt', minutes_target: 10,
  type: 'Quiz', teacher_feedback: 'Slow and steady — listen first.',
  homework_template: null, student_instruments: ['recSIQA0000000001'],
  created_by: 'Teacher QA', concept_id: 'T_HALF_STEP', completed_at: null,
  evidence_ref: null, ...over,
})

// ── mock backend state (mutable per scenario) ────────────────────────────────
const mock = {
  offline: false, // when true the API route aborts like a dead network
  identity: () => IDENTITY.resolved,
  mine: () => [],
  active: () => ({ has_active_assignment: false, assignment: null }),
  practice: (si, body) => ({ status: 200, body: studentSafeState(body.concept_id, body.chapter, body.assignment_id ? 'completed' : null) }),
}

async function installRoutes(context) {
  await context.route(`${API}/**`, async (route) => {
    if (mock.offline) return route.abort('internetdisconnected')
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname + url.search
    const method = req.method()
    const post = req.postData() || null
    capture.push({ scenario, plane: 'SOM_BACKEND', method, path, body: post })

    if (method === 'POST' && url.pathname === '/auth/login') {
      return route.fulfill({ json: { success: true, token: 'qa-jwt-token', user: { id: 'recUSERQA000000001', name: 'QA Student', email: 'qa@som.test', role: 'student', avatar: '' }, student: null } })
    }
    if (url.pathname === '/auth/verify') {
      return route.fulfill({ json: { ok: true, valid: true, user: { id: 'recUSERQA000000001', email: 'qa@som.test', name: 'QA Student', role: 'student' } } })
    }
    if (url.pathname === '/auth/learning-identity') {
      const r = mock.identity()
      if (r && r.__status) return route.fulfill({ status: r.__status, json: { detail: r.detail } })
      return route.fulfill({ json: r })
    }
    if (url.pathname === '/assignments/mine') {
      return route.fulfill({ json: mock.mine() })
    }
    const active = url.pathname.match(/^\/concept-state\/([^/]+)\/active-assignment$/)
    if (active) {
      const r = mock.active(decodeURIComponent(active[1]))
      if (r && r.__status) return route.fulfill({ status: r.__status, json: { detail: r.detail } })
      return route.fulfill({ json: r })
    }
    const pe = url.pathname.match(/^\/concept-state\/([^/]+)\/practice-event$/)
    if (method === 'POST' && pe) {
      const body = JSON.parse(post || '{}')
      const r = mock.practice(decodeURIComponent(pe[1]), body)
      return route.fulfill({ status: r.status, json: r.body })
    }
    const cs = url.pathname.match(/^\/concept-state\/([^/]+)\/([^/]+)$/)
    if (method === 'GET' && cs) {
      return route.fulfill({ json: studentSafeState(decodeURIComponent(cs[2]), 'find_it') })
    }
    // WYL / practice logs / anything else on the SOM plane: benign 200
    return route.fulfill({ json: { ok: true } })
  })

  // Converter plane — MUST stay silent. Every hit is a violation.
  await context.route(`**://${CONVERTER}/**`, async (route) => {
    capture.push({ scenario, plane: 'CONVERTER(VIOLATION)', method: route.request().method(), path: route.request().url(), body: route.request().postData() || null })
    return route.fulfill({ json: {} })
  })
  // No third-party calls from QA either.
  await context.route('**://api.anthropic.com/**', (route) => route.abort())
  await context.route('**://protective-flow-production.up.railway.app/**', (route) => route.fulfill({ status: 404, body: '' }))
}

function somRequests(scen, pred) {
  return capture.filter(c => c.scenario === scen && c.plane === 'SOM_BACKEND' && pred(c))
}
const practicePosts = (scen) => somRequests(scen, c => c.method === 'POST' && /\/practice-event$/.test(c.path))

async function newPage(browser, { auth = true, viewport = { width: 1280, height: 800 }, seed } = {}) {
  const context = await browser.newContext({ viewport })
  await installRoutes(context)
  const page = await context.newPage()
  page.on('console', (m) => consoleLog.push({ scenario, type: m.type(), text: m.text() }))
  if (auth) {
    await page.addInitScript(() => {
      localStorage.setItem('som_token', 'qa-jwt-token')
      localStorage.setItem('som_user', JSON.stringify({ id: 'recUSERQA000000001', name: 'QA Student', email: 'qa@som.test', role: 'student' }))
    })
  }
  if (seed) {
    // Seed applies on FIRST load only — later navigations must observe the
    // app's own mutations (e.g. a discarded stale selection must stay gone).
    await page.addInitScript((kv) => {
      if (!sessionStorage.getItem('__qa_seeded')) {
        for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, JSON.stringify(v))
        sessionStorage.setItem('__qa_seeded', '1')
      }
    }, seed)
  }
  return { context, page }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function waitForIdentitySettled(page) {
  await page.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem('som_learning_identity') || 'null')?.ready === true } catch { return false }
  }, null, { timeout: 8000 }).catch(() => {})
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1)
}

// ── main ─────────────────────────────────────────────────────────────────────
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' })
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview server timeout')), 20000)
  preview.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) { clearTimeout(t); res() } })
  preview.stderr.on('data', (d) => process.stderr.write(d))
})

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--autoplay-policy=no-user-gesture-required'],
})

try {
  // S1 — real login flow: /auth/login then /auth/learning-identity; email lookup NEVER
  scenario = 'S1-login-flow'
  {
    mock.identity = () => IDENTITY.resolved
    const { context, page } = await newPage(browser, { auth: false })
    await page.goto(`${BASE}/login`)
    await page.fill('input[type="email"]', 'qa@som.test')
    await page.fill('input[type="password"]', 'qa-password')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/student', { timeout: 10000 }).catch(() => {})
    await waitForIdentitySettled(page)
    const li = somRequests(scenario, c => c.path === '/auth/learning-identity')
    record('learning-identity called under authenticated flow', li.length >= 1, `${li.length} calls`)
    await context.close()
  }

  // S2 — exactly one instrument auto-resolves; homework uses canonical endpoints
  scenario = 'S2-single-resolves'
  {
    mock.identity = () => IDENTITY.resolved
    mock.mine = () => [serializerRow(), serializerRow({ id: 'recASGNQA00000002', assignment_id: 'recASGNQA00000002', assignment_number: 41, status: 'Completed', completed_at: '2026-08-07T20:00:00Z', title: 'Whole Step Walk', concept_id: 'T_WHOLE_STEP', type: 'Homework', evidence_ref: 'evt-qa-1' })]
    mock.active = (si) => si === 'recSIQA0000000001'
      ? { has_active_assignment: true, assignment: serializerRow() }
      : { __status: 403, detail: 'wrong_student' }
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('[data-testid="active-assignment"]', { timeout: 8000 })
    const snap = await page.evaluate(() => JSON.parse(localStorage.getItem('som_learning_identity')))
    record('one instrument auto-resolves (snapshot = canonical si)', snap?.student_instrument_id === 'recSIQA0000000001' && snap?.identity_status === 'resolved')
    const activeCalls = somRequests(scenario, c => /active-assignment$/.test(c.path))
    record('active-assignment consumed with canonical si', activeCalls.length >= 1 && activeCalls.every(c => c.path.includes('recSIQA0000000001')))
    const mineCalls = somRequests(scenario, c => c.path === '/assignments/mine')
    record('/assignments/mine consumed', mineCalls.length >= 1)
    const upNext = await page.textContent('[data-testid="active-assignment"]')
    record('Up Next renders canonical serializer fields', upNext.includes('Half Step Hunt'))
    const body = await page.textContent('body')
    record('assignments/mine canonical field handling (title/status render)', body.includes('Whole Step Walk') && body.includes('Completed ✓'))
    // assignment_number display-only in detail panel
    await page.click('.hw-acard >> nth=0')
    await page.waitForSelector('[data-testid="assignment-meta"]', { timeout: 5000 })
    const meta = await page.textContent('[data-testid="assignment-meta"]')
    record('assignment_number is display-only (#42 shown, never an identifier)', meta.includes('Assignment #42'))
    // launch URL must carry the rec… assignment_id
    await page.click('.hw-back')
    await page.click('.hw-acard button:has-text("Launch")')
    await page.waitForURL('**/game**', { timeout: 5000 })
    record('launch carries canonical rec… assignment_id', page.url().includes(`assignment_id=${ASSIGNMENT_REC}`))
    for (const vp of [[390, 844], [393, 852]]) {
      await page.setViewportSize({ width: vp[0], height: vp[1] })
      await page.goto(`${BASE}/homework`); await waitForIdentitySettled(page)
      await page.waitForSelector('.hw-acard', { timeout: 5000 })
      record(`homework no horizontal overflow ${vp[0]}x${vp[1]}`, await noHorizontalOverflow(page))
      await page.screenshot({ path: `${SCREENS}/homework-${vp[0]}x${vp[1]}.png` })
    }
    await context.close()
  }

  // S3 — multiple instruments: NEVER auto-choose; explicit selection UI
  scenario = 'S3-multi-never-auto'
  {
    mock.identity = () => IDENTITY.multi
    mock.mine = () => []
    let activeHits = 0
    mock.active = () => { activeHits += 1; return { has_active_assignment: false, assignment: null } }
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('[data-testid="instrument-select"]', { timeout: 8000 })
    const snap = await page.evaluate(() => JSON.parse(localStorage.getItem('som_learning_identity')))
    record('multiple instruments never auto-select first', snap?.student_instrument_id === null && activeHits === 0, `snapshot si=${snap?.student_instrument_id}, active-assignment hits=${activeHits}`)
    await page.setViewportSize({ width: 390, height: 844 })
    record('selection UI no overflow 390x844', await noHorizontalOverflow(page))
    await page.screenshot({ path: `${SCREENS}/homework-selection-390x844.png` })
    await page.setViewportSize({ width: 393, height: 852 })
    await page.screenshot({ path: `${SCREENS}/homework-selection-393x852.png` })

    // S4 — explicit selection works
    scenario = 'S4-explicit-selection'
    await page.click('[data-testid="instrument-option-recSIQA000000000B"]')
    await page.waitForSelector('[data-testid="instrument-select"]', { state: 'detached', timeout: 5000 })
    await sleep(400)
    const snap2 = await page.evaluate(() => JSON.parse(localStorage.getItem('som_learning_identity')))
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('som_selected_instrument') || 'null'))
    const activeB = somRequests(scenario, c => /active-assignment$/.test(c.path) && c.path.includes('recSIQA000000000B'))
    record('explicit instrument selection works (snapshot + cached pointer + scoped reads)',
      snap2?.student_instrument_id === 'recSIQA000000000B' && stored?.student_instrument_id === 'recSIQA000000000B' && activeB.length >= 1)
    await context.close()
  }

  // S5 — stale cached selection is discarded → selection required again
  scenario = 'S5-stale-selection'
  {
    mock.identity = () => IDENTITY.multi
    const { context, page } = await newPage(browser, {
      seed: { som_selected_instrument: { user_id: 'recUSERQA000000001', student_instrument_id: 'recSI_STALE0000001' } },
    })
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('[data-testid="instrument-select"]', { timeout: 8000 })
    const stored = await page.evaluate(() => localStorage.getItem('som_selected_instrument'))
    const snap = await page.evaluate(() => JSON.parse(localStorage.getItem('som_learning_identity')))
    record('stale cached instrument selection rejected (discarded + selection required)', stored === null && snap?.student_instrument_id === null)
    await context.close()
  }

  // S6 — zero instruments: evidence writes blocked, student-safe setup state
  scenario = 'S6-zero-instruments'
  {
    mock.identity = () => IDENTITY.unresolved
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('[data-testid="identity-unresolved"]', { timeout: 8000 })
    const txt = await page.textContent('[data-testid="identity-unresolved"]')
    record('zero instruments → clear non-technical setup state', /Ask your teacher/i.test(txt) && !/instrument_id|unresolved|API|error/i.test(txt))
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASSIGNMENT_REC}`)
    await page.waitForSelector('button:has-text("End Game")', { timeout: 8000 })
    await page.click('button:has-text("End Game")')
    await sleep(1200)
    record('zero instruments block evidence writes (0 practice-event POSTs)', practicePosts(scenario).length === 0, `${practicePosts(scenario).length} posts`)
    const q = await page.evaluate(() => localStorage.getItem('som_evidence_queue'))
    record('zero instruments: nothing queued either', !q || JSON.parse(q).length === 0)
    await context.close()
  }

  // S7 — identity 503 is retryable, never permanent unresolved
  scenario = 'S7-identity-503'
  {
    let failing = true
    mock.identity = () => failing ? { __status: 503, detail: 'identity_unavailable_retryable' } : IDENTITY.resolved
    mock.mine = () => [serializerRow()]
    mock.active = () => ({ has_active_assignment: false, assignment: null })
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/homework`)
    await page.waitForSelector('[data-testid="identity-retryable"]', { timeout: 8000 })
    const unresolvedShown = await page.$('[data-testid="identity-unresolved"]')
    record('identity 503 → retryable state, NOT converted to unresolved', unresolvedShown === null)
    failing = false
    await page.click('[data-testid="identity-retryable"] button')
    await waitForIdentitySettled(page)
    await page.waitForSelector('.hw-acard', { timeout: 8000 })
    record('identity recovers after 503 clears (retry works)', true)
    await context.close()
  }

  // S8 — wrong-student 403 fails closed: no retry, no queue, no identity substitution
  scenario = 'S8-403-fail-closed'
  {
    mock.identity = () => IDENTITY.resolved
    mock.practice = () => ({ status: 403, body: { detail: 'wrong_student' } })
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASSIGNMENT_REC}`)
    await waitForIdentitySettled(page)
    // M1 R3.1-FE §B — zero-attempt sessions no longer submit evidence at all
    // (see GamePage.jsx submitSessionEvidence); play one note so this block
    // still exercises the 403 fail-closed path it's actually testing.
    await page.click('[data-testid="piano-key"]')
    await page.click('button:has-text("End Game")')
    await sleep(1500)
    const posts = practicePosts(scenario)
    const q = await page.evaluate(() => localStorage.getItem('som_evidence_queue'))
    record('wrong-student 403 fails closed (1 attempt, 0 retries, 0 queued)', posts.length === 1 && (!q || JSON.parse(q).length === 0), `${posts.length} attempts`)
    record('403 fail-closed console evidence', consoleLog.some(c => c.scenario === scenario && /fail(ing)? closed/i.test(c.text)))
    mock.practice = (si, body) => ({ status: 200, body: studentSafeState(body.concept_id, body.chapter) })
    await context.close()
  }

  // S9 — 409 selection_required on write → return to explicit selection flow
  scenario = 'S9-409-selection'
  {
    mock.identity = () => IDENTITY.multi
    mock.practice = () => ({ status: 409, body: { detail: 'selection_required' } })
    const { context, page } = await newPage(browser, {
      seed: { som_selected_instrument: { user_id: 'recUSERQA000000001', student_instrument_id: 'recSIQA000000000A' } },
    })
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASSIGNMENT_REC}`)
    await waitForIdentitySettled(page)
    await page.click('[data-testid="piano-key"]')
    await page.click('button:has-text("End Game")')
    await sleep(1500)
    const posts = practicePosts(scenario)
    record('409 selection_required: single attempt, no blind retry', posts.length === 1, `${posts.length} attempts`)
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('[data-testid="instrument-select"]', { timeout: 8000 })
    const stored = await page.evaluate(() => localStorage.getItem('som_selected_instrument'))
    record('409 selection_required returns frontend to explicit selection (cached selection cleared)', stored === null)
    mock.practice = (si, body) => ({ status: 200, body: studentSafeState(body.concept_id, body.chapter) })
    await context.close()
  }

  // S10 — 409 duplicate_event_mismatch surfaced as contract failure
  scenario = 'S10-409-dup-mismatch'
  {
    mock.identity = () => IDENTITY.resolved
    mock.practice = () => ({ status: 409, body: { detail: 'duplicate_event_mismatch' } })
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASSIGNMENT_REC}`)
    await waitForIdentitySettled(page)
    await page.click('[data-testid="piano-key"]')
    await page.click('button:has-text("End Game")')
    await sleep(1500)
    const posts = practicePosts(scenario)
    const q = await page.evaluate(() => localStorage.getItem('som_evidence_queue'))
    record('duplicate_event_mismatch: no rewrite/replay (1 attempt, 0 queued)', posts.length === 1 && (!q || JSON.parse(q).length === 0))
    record('duplicate_event_mismatch surfaced as CONTRACT FAILURE in console', consoleLog.some(c => c.scenario === scenario && /CONTRACT FAILURE.*duplicate_event_mismatch/i.test(c.text)))
    mock.practice = (si, body) => ({ status: 200, body: studentSafeState(body.concept_id, body.chapter) })
    await context.close()
  }

  // S11 — Find-the-Note: exactly ONE evidence event, canonical rec… assignment_id
  scenario = 'S11-ftn-one-event'
  {
    mock.identity = () => IDENTITY.resolved
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASSIGNMENT_REC}`)
    await waitForIdentitySettled(page)
    await page.click('[data-testid="piano-key"]')
    await page.click('button:has-text("End Game")')
    await sleep(1200)
    await page.click('button:has-text("End Game")').catch(() => {})
    await sleep(800)
    const posts = practicePosts(scenario)
    record('Find-the-Note sends exactly one evidence event', posts.length === 1, `${posts.length} posts`)
    if (posts.length) {
      const b = JSON.parse(posts[0].body)
      record('FtN payload: canonical rec… assignment_id used for evidence', b.assignment_id === ASSIGNMENT_REC)
      record('FtN payload: canonical concept/chapter/source/uuid', b.concept_id === 'T_HALF_STEP' && b.chapter === 'find_it' && b.source_activity === 'find_the_note' && uuidV4(b.client_event_id))
      record('FtN payload: assignment_number NOT used anywhere in the event', !('assignment_number' in b) && !posts[0].path.includes('42'))
      record('FtN grade_band from lock package only (T_HALF_STEP → K-2, never invented)', b.grade_band === 'K-2')
    }
    const msg = await page.textContent('body')
    record('student-safe response consumed (tier language, no raw numerics needed)', /Solid — keep the beat steady\./.test(msg))
    for (const vp of [[390, 844], [393, 852]]) {
      await page.setViewportSize({ width: vp[0], height: vp[1] })
      record(`game academic no horizontal overflow ${vp[0]}x${vp[1]}`, await noHorizontalOverflow(page))
      await page.screenshot({ path: `${SCREENS}/game-academic-${vp[0]}x${vp[1]}.png` })
    }
    await context.close()
  }

  // S12 — legacy numeric assignment id: never sent, never completion identity
  scenario = 'S12-numeric-assignment'
  {
    mock.identity = () => IDENTITY.resolved
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=42`)
    await waitForIdentitySettled(page)
    await page.click('[data-testid="piano-key"]')
    await page.click('button:has-text("End Game")')
    await sleep(1200)
    const posts = practicePosts(scenario)
    record('legacy numeric assignment id never linked (downgraded, no assignment_id in event)', posts.length === 1 && !('assignment_id' in JSON.parse(posts[0].body)))
    if (posts.length) {
      const b = JSON.parse(posts[0].body)
      record('numeric-id session downgrades to free_play (no fake completion)', b.activity_variant === 'free_play' && b.result !== 'complete')
    }
    await context.close()
  }

  // S13 — active-assignment: null means NO assignment; nothing fabricated
  scenario = 'S13-active-null'
  {
    mock.identity = () => IDENTITY.resolved
    mock.mine = () => []
    mock.active = () => ({ has_active_assignment: false, assignment: null })
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await sleep(800)
    const upNext = await page.$('[data-testid="active-assignment"]')
    const html = await page.content()
    record('active-assignment null → no Up Next, no inferred assignment', upNext === null)
    record('no fabricated T_MAJOR_SCALE_PATTERN anywhere in empty homework state', !html.includes('T_MAJOR_SCALE_PATTERN') && !html.includes('T_HALF_STEP'))
    const fabricated = capture.filter(c => c.scenario === scenario && /T_MAJOR_SCALE_PATTERN/.test((c.path || '') + (c.body || '')))
    record('no network traffic references a fabricated concept', fabricated.length === 0)
    // 503 → retryable state (never a permanent empty answer)
    mock.active = () => ({ __status: 503, detail: 'active_assignment_unavailable_retryable' })
    await page.goto(`${BASE}/homework`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('[data-testid="active-assignment-retryable"]', { timeout: 8000 })
    record('active-assignment 503 → retryable UI state', true)
    mock.active = () => ({ has_active_assignment: false, assignment: null })
    await context.close()
  }

  // S14 — Rhythm Racer full academic run: ONE event, bandless, canonical R_*
  scenario = 'S14-rr-bandless'
  {
    mock.identity = () => IDENTITY.resolved
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/rhythm-racer?mode=academic&concept=R_PULSE_WHOLE&assignment_id=${ASSIGNMENT_REC}&level=1`)
    await waitForIdentitySettled(page)
    await page.waitForSelector('button.rr2-play', { timeout: 8000 })
    await page.setViewportSize({ width: 390, height: 844 })
    record('rhythm-racer no horizontal overflow 390x844', await noHorizontalOverflow(page))
    await page.screenshot({ path: `${SCREENS}/rhythm-racer-390x844.png` })
    await page.setViewportSize({ width: 393, height: 852 })
    record('rhythm-racer no horizontal overflow 393x852', await noHorizontalOverflow(page))
    await page.screenshot({ path: `${SCREENS}/rhythm-racer-393x852.png` })
    await page.setViewportSize({ width: 1280, height: 800 })
    // No taps → each stage fails (miss) → 3 lives gone → out_of_lives → ONE canonical write
    for (let stage = 0; stage < 3; stage += 1) {
      await page.click('button.rr2-play:has-text("PLAY")', { timeout: 15000 }).catch(() => {})
      await page.waitForSelector('button.rr2-play:has-text("NEXT")', { timeout: 30000 }).catch(() => {})
      const done = await page.evaluate(() => document.body.textContent.includes('will sync') || document.body.textContent.includes('Saved') || document.body.textContent.includes('Not saved'))
      if (done) break
      await page.click('button.rr2-play:has-text("NEXT")', { timeout: 5000 }).catch(() => {})
    }
    await page.waitForFunction(() => /Saved|Not saved|sync/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {})
    await sleep(1000)
    const posts = practicePosts(scenario)
    record('Rhythm Racer sends exactly one evidence event', posts.length === 1, `${posts.length} posts`)
    if (posts.length) {
      const b = JSON.parse(posts[0].body)
      record('RR payload: bandless stays bandless (no grade_band key, no "3-5")', !('grade_band' in b), JSON.stringify(Object.keys(b)))
      record('RR payload: canonical R_* + rhythm_racer chapter/source + uuid + rec… assignment', b.concept_id === 'R_PULSE_WHOLE' && b.chapter === 'rhythm_racer' && b.source_activity === 'rhythm_racer' && uuidV4(b.client_event_id) && b.assignment_id === ASSIGNMENT_REC)
    }
    const bodyTxt = await page.evaluate(() => document.body.innerText)
    record('RR summary shows tier language, no % anywhere (visible text)', !/\d+\s*%/.test(bodyTxt))
    await page.screenshot({ path: `${SCREENS}/rr-summary-desktop.png` })
    await context.close()
  }

  // S15 — offline queue: byte-stable payload + exact client_event_id across reconnect
  scenario = 'S15-offline-idempotent'
  {
    mock.identity = () => IDENTITY.resolved
    const { context, page } = await newPage(browser)
    await page.goto(`${BASE}/game?mode=academic&concept=T_HALF_STEP&assignment_id=${ASSIGNMENT_REC}`)
    await waitForIdentitySettled(page)
    await page.click('[data-testid="piano-key"]')
    await context.setOffline(true)
    mock.offline = true
    await page.click('button:has-text("End Game")')
    await page.waitForFunction(() => {
      const q = JSON.parse(localStorage.getItem('som_evidence_queue') || '[]')
      return q.length === 1
    }, null, { timeout: 8000 })
    const queuedBefore = await page.evaluate(() => {
      const q = JSON.parse(localStorage.getItem('som_evidence_queue'))
      return { si: q[0].si, eventJson: JSON.stringify(q[0].event), id: q[0].event.client_event_id }
    })
    record('offline: event queued once with uuid client_event_id', uuidV4(queuedBefore.id))
    await sleep(500)
    const postsBefore = practicePosts(scenario).length
    await context.setOffline(false)
    mock.offline = false
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('som_evidence_queue') || '[]').length === 0, null, { timeout: 10000 })
    await sleep(500)
    const posts = practicePosts(scenario)
    const flushed = posts.slice(postsBefore)
    record('reconnect flush: exactly one successful server event', flushed.length === 1, `${flushed.length} flushed`)
    if (flushed.length === 1) {
      const sent = JSON.parse(flushed[0].body)
      const queued = JSON.parse(queuedBefore.eventJson)
      record('exact client_event_id survives offline flush', sent.client_event_id === queuedBefore.id)
      record('queued payload byte/structurally stable across retry', JSON.stringify(sent) === JSON.stringify(queued))
      record('queued canonical assignment_id preserved', sent.assignment_id === ASSIGNMENT_REC && sent.concept_id === 'T_HALF_STEP' && sent.chapter === 'find_it')
    }
    await context.close()
  }

  // ── Global invariants across ALL scenarios ──
  scenario = 'GLOBAL'
  {
    const emailLookups = capture.filter(c => /\/student\?email=|student%3Femail/i.test(c.path || ''))
    record('/student?email= is NEVER called (all scenarios)', emailLookups.length === 0, `${emailLookups.length} hits`)
    const converterHits = capture.filter(c => c.plane === 'CONVERTER(VIOLATION)')
    record('ZERO converter mastery/state writes in tested M1 flows', converterHits.length === 0, `${converterHits.length} hits`)
    const gateWrites = capture.filter(c => c.method === 'POST' && /practice-event/.test(c.path) && c.body && (JSON.parse(c.body).source_activity === 'gate' || JSON.parse(c.body).chapter === 'gate'))
    record('ZERO gate network evidence writes (flag held OFF)', gateWrites.length === 0)
    const gateSrc = readFileSync(resolve(ROOT, 'src/components/gate0/gateEvidenceAdapter.js'), 'utf8')
    record('gate seam remains flag-gated OFF in source (+ no .env enables it)', gateSrc.includes("VITE_GATE_EVIDENCE === '1'") && !existsSync(resolve(ROOT, '.env')))
    const allPractice = capture.filter(c => c.method === 'POST' && /practice-event/.test(c.path) && c.body)
    const bands = allPractice.map(c => JSON.parse(c.body)).filter(b => b.grade_band !== undefined)
    record('no invented grade_band anywhere (only lock-package K-2 on T_*)', bands.every(b => b.concept_id.startsWith('T_') && b.grade_band === 'K-2'))
    const rawNumerics = allPractice.map(c => JSON.parse(c.body)).some(b => 'confidence' in b || 'mastery' in b || 'accuracy' in b)
    record('no raw confidence/mastery/accuracy fields in any evidence payload', !rawNumerics)
  }
} finally {
  await browser.close()
  preview.kill('SIGTERM')
}

const passCount = results.filter(r => r.pass).length
writeFileSync(resolve(OUT, 'qa-results.json'), JSON.stringify({ generated: new Date().toISOString(), branch: 'fix/m1-r1-frontend-remediation-clean', pass: passCount, fail: results.length - passCount, results }, null, 2))
writeFileSync(resolve(OUT, 'network-capture.json'), JSON.stringify({ generated: new Date().toISOString(), note: 'Branch QA with fully mocked backend — zero real network evidence writes. NOT production evidence.', requests: capture }, null, 2))
writeFileSync(resolve(OUT, 'console-log.json'), JSON.stringify(consoleLog, null, 2))
console.log(`\n${passCount}/${results.length} passed`)
process.exit(passCount === results.length ? 0 : 1)
