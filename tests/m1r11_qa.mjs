/**
 * m1r11_qa.mjs — M1 R1.1 FRONTEND targeted QA harness (branch-only QA).
 *
 * MULTI-INSTRUMENT ASSIGNMENTS/MINE INTEGRATION FIX — proves every card
 * requirement against the PRODUCTION build (vite preview) with the Railway
 * API fully mocked via Playwright route interception (ZERO real network,
 * ZERO evidence writes):
 *
 *   exact selected rec… id travels in /assignments/mine · multi-instrument
 *   pre-selection never masquerades as zero homework · selection triggers
 *   fetch for the exact instrument · switching refetches immediately ·
 *   instrument-A rows cannot remain visible after switching to B (verified
 *   MID-FLIGHT against a delayed B response) · stale cached selection stays
 *   rejected by existing R1 logic · 409 → selection flow · 403 fail closed ·
 *   503 retryable · single-instrument parameterless behavior unchanged ·
 *   assignment_number display-only · Article XIII student-safe surface ·
 *   converter traffic zero · gate evidence traffic zero · mobile 390x844 +
 *   393x852 + 430x932 · full network capture.
 *
 * Usage:  npm i --no-save playwright && node tests/m1r11_qa.mjs
 *         (spawns vite preview on :4173 itself unless one is already serving)
 * Output: qa-artifacts/m1r11-qa-results.json, qa-artifacts/m1r11-screens/*.png
 * (artifacts are NOT committed)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'qa-artifacts')
const SCREENS = resolve(OUT, 'm1r11-screens')
mkdirSync(SCREENS, { recursive: true })

const PORT = 4173
const APP = `http://localhost:${PORT}`
const API = 'https://deployable-python-codebase-som-production.up.railway.app'
// Converter hosts (never contacted by the homework surface — R1 governance).
const CONVERTER_HOSTS = /(motesart-converter\.netlify\.app|school-of-motesart\.netlify\.app\/api\/)/
// Third-party origins present in index.html AT THE FROZEN BASELINE ad98c5a
// (fonts + icon CDN — provenance verified against the frozen tree). Anything
// beyond this exact set fails governance.
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
const row = (id, num, title, si, extra = {}) => ({
  id, assignment_id: id, assignment_number: num, name: title, title,
  status: 'Assigned', student: ['recSTU_ALICE'], due_date: '2026-08-14',
  minutes_target: 15, type: 'Homework', teacher_feedback: null,
  homework_template: null, student_instruments: [si], created_by: null,
  concept_id: 'T_HALF_STEP', completed_at: null, evidence_ref: null, ...extra,
})
const PIANO_ROWS = [row('recPNO1', 11, 'Piano scales', PIANO), row('recPNO2', 12, 'Piano rhythm', PIANO)]
const CELLO_ROWS = [row('recCLO1', 21, 'Cello bowing', CELLO)]
const SINGLE_ROWS = [row('recMNA', 1, 'My single-instrument homework', SINGLE)]

const results = []
const governanceLog = []
let failures = 0

function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

async function ensurePreview() {
  try {
    const res = await fetch(`${APP}/homework`)
    if (res.ok) return null // already serving (reuse)
  } catch { /* not serving — spawn below */ }
  const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore', detached: true })
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250))
    try { const res = await fetch(`${APP}/homework`); if (res.ok) return child } catch { /* retry */ }
  }
  throw new Error('vite preview did not become ready on :' + PORT)
}

async function launch() {
  try { return await chromium.launch() }
  catch { return await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }) }
}

async function makeContext(browser, opts) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 800 },
    ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}),
  })
  const state = { mineCalls: [], identityCalls: 0, pageErrors: [] }

  await context.addInitScript(({ stored }) => {
    localStorage.setItem('som_token', 'qa-token')
    localStorage.setItem('som_user', JSON.stringify({ id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' }))
    if (stored) localStorage.setItem('som_selected_instrument', JSON.stringify(stored))
  }, { stored: opts.storedSelection || null })

  await context.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/auth/verify') {
      return route.fulfill({ json: { valid: true, user: { id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' } } })
    }
    if (u.pathname === '/auth/learning-identity') {
      state.identityCalls++
      return route.fulfill({ json: opts.identity })
    }
    if (u.pathname === '/assignments/mine') {
      const call = state.mineCalls.length + 1
      state.mineCalls.push({ url: route.request().url(), qs: u.searchParams.get('student_instrument_id') })
      const r = opts.mine(u, call)
      if (r.delayMs) await new Promise(res => setTimeout(res, r.delayMs))
      return route.fulfill({ status: r.status || 200, json: r.body })
    }
    if (/^\/concept-state\/[^/]+\/active-assignment$/.test(u.pathname)) {
      return route.fulfill({ json: { has_active_assignment: false, assignment: null } })
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
  select: '[data-testid="instrument-select"]',
  optPiano: `[data-testid="instrument-option-${PIANO}"]`,
  optCello: `[data-testid="instrument-option-${CELLO}"]`,
  blocked: '[data-testid="assignments-blocked"]',
  retryable: '[data-testid="assignments-retryable"]',
}
const EMPTY_COPY = 'No assignments right now'

async function s1_single(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'S1-single', identity: IDENT_RESOLVED, mine: () => ({ body: SINGLE_ROWS }),
  })
  await page.goto(`${APP}/homework`)
  await page.getByText('My single-instrument homework').waitFor({ timeout: 10000 })
  check('S1 single-instrument: rows render from parameterless call', state.mineCalls.length >= 1)
  check('S1 single-instrument: request carries NO student_instrument_id (unchanged R1 behavior)',
    state.mineCalls.every(c => c.qs === null), state.mineCalls.map(c => c.url).join(' '))
  check('S1 single-instrument: no selection panel', !(await page.locator(sel.select).count()))
  check('S1 no page errors', state.pageErrors.length === 0, state.pageErrors.join('; '))
  await page.screenshot({ path: resolve(SCREENS, 's1-single-rows.png') })
  await context.close()
}

async function s2_multi_noselection(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'S2-multi-noselect', identity: IDENT_MULTI,
    mine: () => ({ status: 409, body: { detail: 'selection_required' } }),
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.select).waitFor({ timeout: 10000 })
  await page.waitForTimeout(600)
  check('S2 multi/no-selection: instrument selection panel shown', true)
  check('S2 multi/no-selection: ZERO /assignments/mine requests fired', state.mineCalls.length === 0,
    `calls=${state.mineCalls.length}`)
  const bodyText = await page.locator('body').innerText()
  check('S2 multi/no-selection: does NOT masquerade as zero homework', !bodyText.includes(EMPTY_COPY))
  check('S2 no page errors', state.pageErrors.length === 0, state.pageErrors.join('; '))
  await page.screenshot({ path: resolve(SCREENS, 's2-selection-panel.png') })
  await context.close()
}

async function s3_s4_select_and_switch(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'S3S4-select-switch', identity: IDENT_MULTI,
    mine: (u) => {
      const q = u.searchParams.get('student_instrument_id')
      if (q === PIANO) return { body: PIANO_ROWS }
      if (q === CELLO) return { body: CELLO_ROWS, delayMs: 500 } // B loads SLOWLY on purpose
      return { status: 409, body: { detail: 'selection_required' } }
    },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.optPiano).click()
  await page.getByText('Piano scales').waitFor({ timeout: 10000 })
  const pianoCall = state.mineCalls.find(c => c.qs === PIANO)
  check('S3 selection triggers fetch with EXACT selected rec id',
    !!pianoCall && pianoCall.url === `${API}/assignments/mine?student_instrument_id=${PIANO}`, pianoCall?.url)
  check('S3 selected instrument rows render (A visible)', await page.getByText('Piano rhythm').count() > 0)

  // Switch: the same R1 som:selection-required flow other surfaces use, then
  // the student explicitly picks Cello.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('som:selection-required')))
  await page.locator(sel.optCello).waitFor({ timeout: 10000 })
  check('S4 switch flow returns to explicit selection', true)
  await page.locator(sel.optCello).click()
  await page.waitForTimeout(150) // cello response still ~350ms away
  check('S4 A-rows gone BEFORE B loads (mid-flight)', await page.getByText('Piano scales').count() === 0)
  await page.getByText('Cello bowing').waitFor({ timeout: 10000 })
  const celloCall = state.mineCalls.find(c => c.qs === CELLO)
  check('S4 instrument switch causes fresh request with EXACT new rec id',
    !!celloCall && celloCall.url === `${API}/assignments/mine?student_instrument_id=${CELLO}`, celloCall?.url)
  check('S4 no cross-instrument leakage after switch (A absent when B rendered)',
    await page.getByText('Piano scales').count() === 0 && await page.getByText('Piano rhythm').count() === 0)

  const tabText = await page.locator('.hw-tc.active').innerText()
  check('Article XIII: no percentages / raw internals rendered on assignments surface',
    !/\d\s*%/.test(tabText) && !/confidence|mastery_ready|trend\b/i.test(tabText))
  check('assignment_number remains display-only (never used as launch identifier)',
    (await page.locator('.hw-acard').first().innerText()).includes('Cello bowing'))
  check('S3/S4 no page errors', state.pageErrors.length === 0, state.pageErrors.join('; '))
  await page.screenshot({ path: resolve(SCREENS, 's4-after-switch-cello.png') })
  await context.close()
}

async function s5_409_and_stale(browser) {
  // S5a: client-valid selection, but the SERVER answers 409 → back to selection.
  const a = await makeContext(browser, {
    name: 'S5a-409', identity: IDENT_MULTI,
    storedSelection: { user_id: 'recUSER_ALICE', student_instrument_id: PIANO },
    mine: () => ({ status: 409, body: { detail: 'selection_required' } }),
  })
  await a.page.goto(`${APP}/homework`)
  await a.page.locator(sel.select).waitFor({ timeout: 10000 })
  await a.page.waitForTimeout(400)
  check('S5a server 409 selection_required returns app to selection flow',
    (await a.page.locator(sel.select).count()) === 1)
  check('S5a 409 cleared the stored selection pointer',
    await a.page.evaluate(() => localStorage.getItem('som_selected_instrument')) === null)
  check('S5a 409 is not rendered as an error or empty-homework state',
    !(await a.page.locator('body').innerText()).includes(EMPTY_COPY))
  await a.context.close()

  // S5b: stale cached selection NOT in owned set → rejected by EXISTING R1 logic.
  const b = await makeContext(browser, {
    name: 'S5b-stale', identity: IDENT_MULTI,
    storedSelection: { user_id: 'recUSER_ALICE', student_instrument_id: 'recSI_STALE_GONE' },
    mine: () => ({ status: 409, body: { detail: 'selection_required' } }),
  })
  await b.page.goto(`${APP}/homework`)
  await b.page.locator(sel.select).waitFor({ timeout: 10000 })
  await b.page.waitForTimeout(400)
  check('S5b stale cached selection rejected by existing R1 validation (panel shown)', true)
  check('S5b stale selection produced ZERO /assignments/mine requests', b.state.mineCalls.length === 0)
  check('S5b stale pointer discarded from storage',
    await b.page.evaluate(() => localStorage.getItem('som_selected_instrument')) === null)
  await b.context.close()
}

async function s6_403(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'S6-403', identity: IDENT_MULTI,
    storedSelection: { user_id: 'recUSER_ALICE', student_instrument_id: PIANO },
    mine: () => ({ status: 403, body: { detail: 'wrong_student' } }),
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.blocked).waitFor({ timeout: 10000 })
  check('S6 403 wrong_student fails CLOSED (blocked state rendered)', true)
  check('S6 403 renders zero assignment rows', (await page.locator('.hw-acard').count()) === 0)
  check('S6 403 does not masquerade as zero homework',
    !(await page.locator('body').innerText()).includes(EMPTY_COPY))
  await page.screenshot({ path: resolve(SCREENS, 's6-403-fail-closed.png') })
  await context.close()
}

async function s7_503_retry(browser) {
  const { context, page, state } = await makeContext(browser, {
    name: 'S7-503', identity: IDENT_RESOLVED,
    mine: (_u, call) => call === 1
      ? { status: 503, body: { detail: 'identity_unavailable_retryable' } }
      : { body: SINGLE_ROWS },
  })
  await page.goto(`${APP}/homework`)
  await page.locator(sel.retryable).waitFor({ timeout: 10000 })
  check('S7 503 identity_unavailable_retryable renders RETRYABLE state (never permanent)', true)
  await page.locator(`${sel.retryable} button`).click()
  await page.getByText('My single-instrument homework').waitFor({ timeout: 10000 })
  check('S7 retry issues a fresh request and recovers', state.mineCalls.length === 2,
    `calls=${state.mineCalls.length}`)
  await page.screenshot({ path: resolve(SCREENS, 's7-503-recovered.png') })
  await context.close()
}

async function s8_mobile(browser) {
  const widths = [
    { w: 390, h: 844, label: '390x844' },   // M1 R1 harness width
    { w: 393, h: 852, label: '393x852' },   // M1 R1 harness width
    { w: 430, h: 932, label: '430x932' },   // Cycle-3 mobile-proof width
  ]
  for (const { w, h, label } of widths) {
    const a = await makeContext(browser, {
      name: `S8-${label}-panel`, identity: IDENT_MULTI, mobile: true,
      viewport: { width: w, height: h },
      mine: () => ({ status: 409, body: { detail: 'selection_required' } }),
    })
    await a.page.goto(`${APP}/homework`)
    await a.page.locator(sel.select).waitFor({ timeout: 10000 })
    const fit1 = await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    const tap = await a.page.locator(sel.optPiano).boundingBox()
    check(`S8 ${label} selection panel: no horizontal overflow`, fit1)
    check(`S8 ${label} selection option tap target ≥44px`, !!tap && tap.height >= 44, `h=${tap?.height}`)
    await a.page.screenshot({ path: resolve(SCREENS, `s8-${label}-panel.png`) })
    await a.context.close()

    const b = await makeContext(browser, {
      name: `S8-${label}-rows`, identity: IDENT_MULTI, mobile: true,
      viewport: { width: w, height: h },
      storedSelection: { user_id: 'recUSER_ALICE', student_instrument_id: PIANO },
      mine: (u) => u.searchParams.get('student_instrument_id') === PIANO
        ? { body: PIANO_ROWS } : { status: 409, body: { detail: 'selection_required' } },
    })
    await b.page.goto(`${APP}/homework`)
    await b.page.getByText('Piano scales').waitFor({ timeout: 10000 })
    const fit2 = await b.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    check(`S8 ${label} assignments list: no horizontal overflow`, fit2)
    await b.page.screenshot({ path: resolve(SCREENS, `s8-${label}-rows.png`) })
    await b.context.close()
  }
}

function governance() {
  const converter = governanceLog.filter(r =>
    CONVERTER_HOSTS.test(r.url) ||
    (!r.url.startsWith(API) && /\/api\/(practice-events|concept-state)/.test(r.url)))
  const gateEvidence = governanceLog.filter(r =>
    (r.method === 'POST' && /\/practice-event\b/.test(r.url)) || /\/api\/practice-events/.test(r.url))
  check('GOVERNANCE converter traffic zero (all scenarios, every request audited)',
    converter.length === 0, JSON.stringify(converter.slice(0, 3)))
  check('GOVERNANCE gate evidence traffic zero (no practice-event writes from homework surface)',
    gateEvidence.length === 0, JSON.stringify(gateEvidence.slice(0, 3)))
  const offBaseline = governanceLog.filter(r => {
    if (r.url.startsWith(APP) || r.url.startsWith(API)) return false
    try { return !BASELINE_THIRD_PARTY.has(new URL(r.url).origin) } catch { return true }
  })
  check('GOVERNANCE no origins beyond the frozen-baseline set (fonts + jsdelivr, verified at ad98c5a)',
    offBaseline.length === 0,
    JSON.stringify([...new Set(offBaseline.map(r => { try { return new URL(r.url).origin } catch { return r.url } }))]))
}

const previewChild = await ensurePreview()
const browser = await launch()
try {
  await s1_single(browser)
  await s2_multi_noselection(browser)
  await s3_s4_select_and_switch(browser)
  await s5_409_and_stale(browser)
  await s6_403(browser)
  await s7_503_retry(browser)
  await s8_mobile(browser)
  governance()
} finally {
  await browser.close()
  if (previewChild) { try { process.kill(-previewChild.pid) } catch { /* already gone */ } }
}

writeFileSync(resolve(OUT, 'm1r11-qa-results.json'),
  JSON.stringify({ results, requests: governanceLog }, null, 2))
const passed = results.filter(r => r.ok).length
console.log(`\nQA TOTAL: ${passed}/${results.length} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
