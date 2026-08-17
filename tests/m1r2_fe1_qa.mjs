/**
 * m1r2_fe1_qa.mjs — M1 R2-FE.1 LEGACY LEARNING-AUTHORITY QUARANTINE QA.
 *
 * Proves, against the PRODUCTION build (vite preview, Railway API mocked,
 * Converter host intercepted and counted — ZERO real network):
 *
 *   1–4   /find-it /play-it /move-it /own-it can no longer execute legacy
 *         proof-loop writes — they redirect to /homework, produce ZERO
 *         Converter traffic, and leave a seeded server Concept_State
 *         snapshot byte-identical (no browser-derived confidence /
 *         mastery_ready persisted anywhere).
 *   5–7   /practice/T_HALF_STEP · T_WHOLE_STEP · T_MAJOR_SCALE_PATTERN
 *         resolve to canonical Practice Live (exact T_* passthrough — no
 *         alias, no default substitution) with ZERO Converter
 *         Concept_State loads.
 *   8–10  Governed gate routes survive the wrapper rewrite:
 *         C_MAJOR_GATE_0 · C_MAJOR_GATE_FIND_HOME · C_MAJOR_GATE_SKIP_TOGETHER.
 *  11–14  Network governance: gate Practice_Event writes ZERO; Converter
 *         /api/practice-events ZERO; /api/concept-state ZERO;
 *         /api/concept-state/recompute ZERO — across every scenario.
 *  15–17  No live student path persists browser-derived confidence or
 *         mastery_ready, and local Concept_State stays a pure
 *         server-snapshot cache (byte-identical after every route).
 *   18    Unsupported canonical concept fails CLOSED (student-safe screen).
 *   19    A canonical rec… assignment_id survives the /practice redirect;
 *         a malformed assignment_id is dropped.
 *   20    Article XIII stays clean on every visited student surface.
 *
 * Plus a STATIC REACHABILITY AUDIT: the App.jsx import graph is walked and
 * every source file containing Converter learning-state references is
 * classified LIVE or QUARANTINED. Any LIVE learning-state reference fails
 * the run (the TeacherDashboard converter product-homepage link is the one
 * governed exception — a window.open to the product, not a learning-state
 * endpoint).
 *
 * Usage:  npm run build && node tests/m1r2_fe1_qa.mjs
 * Output: qa-artifacts/m1r2-fe1-qa-results.json (not committed)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'qa-artifacts')
const SCREENS = resolve(OUT, 'm1r2-fe1-screens')
mkdirSync(SCREENS, { recursive: true })

const PORT = 4175
const APP = process.env.QA_BASE_URL || `http://localhost:${PORT}`
const API = 'https://deployable-python-codebase-som-production.up.railway.app'
const CONVERTER = 'https://motesart-converter.netlify.app'
const BASELINE_THIRD_PARTY = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net',
])

const SINGLE = 'recSI_ALICE'
const IDENT_RESOLVED = {
  user_id: 'recUSER_ALICE', student_record_id: 'recSTU_ALICE',
  student_instrument_id: SINGLE, role: 'student', selection_required: false,
  identity_status: 'resolved',
  owned_instruments: [{ student_instrument_id: SINGLE, instrument: 'Piano', label: 'Alice' }],
}
const CACHE_KEY = `som_concept_states::${SINGLE}`
const CACHE_SEED = JSON.stringify({
  T_MAJOR_SCALE_PATTERN: {
    concept_id: 'T_MAJOR_SCALE_PATTERN', ownership_state: 'practicing',
    evidence_count: 2, _source: 'server', last_updated: '2026-08-01T00:00:00.000Z',
  },
})
const CANON_ASGN = 'recMNA00000000001'

const results = []
const governanceLog = []
const converterHits = []
let failures = 0
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

async function ensurePreview() {
  if (process.env.QA_BASE_URL) return null // bootstrap owns the shared preview lifecycle
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
  const exe = process.env.QA_CHROMIUM
  return exe ? await chromium.launch({ executablePath: exe, args }) : await chromium.launch({ args })
}

async function makeContext(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 800 },
    ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}),
    permissions: ['camera', 'microphone'],
  })
  const state = { pageErrors: [] }
  await context.addInitScript(({ seed }) => {
    localStorage.setItem('som_token', 'qa-token')
    localStorage.setItem('som_user', JSON.stringify({ id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' }))
    localStorage.setItem('som_student_id', seed.student)
    localStorage.setItem(seed.key, seed.value)
  }, { seed: { student: SINGLE, key: CACHE_KEY, value: CACHE_SEED } })

  await context.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/auth/verify') {
      return route.fulfill({ json: { valid: true, user: { id: 'recUSER_ALICE', email: 'alice@example.com', role: 'student', name: 'Alice' } } })
    }
    if (u.pathname === '/auth/learning-identity') return route.fulfill({ json: IDENT_RESOLVED })
    if (u.pathname === '/assignments/mine') return route.fulfill({ json: [] })
    if (/^\/concept-state\/[^/]+\/active-assignment$/.test(u.pathname)) {
      return route.fulfill({ json: { has_active_assignment: false, assignment: null } })
    }
    return route.fulfill({ status: 404, json: { detail: 'qa-unmocked' } })
  })
  // Converter host: intercept, RECORD, and refuse — any hit is a governance
  // event. The request never leaves the harness.
  await context.route(`${CONVERTER}/**`, async (route) => {
    converterHits.push({ scenario: opts.name, method: route.request().method(), url: route.request().url() })
    return route.fulfill({ status: 410, json: { detail: 'quarantined-by-fe1-qa' } })
  })
  context.on('request', (req) => {
    governanceLog.push({ scenario: opts.name, method: req.method(), url: req.url() })
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => state.pageErrors.push(String(e)))
  return { context, page, state }
}

const storageClean = async (page) => {
  const cache = await page.evaluate((k) => localStorage.getItem(k), CACHE_KEY)
  const dump = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
  return {
    cacheIntact: cache === CACHE_SEED,
    noMastery: !dump.includes('mastery_ready') && !dump.includes('"confidence"')
      && !dump.includes('mistake_history'),
  }
}

// ── 1–4: legacy direct routes are decommissioned ──
async function legacyRouteScenario(browser, path, num, viewport) {
  const { context, page, state } = await makeContext(browser, {
    name: `FE1-${num}-${path}`, ...(viewport ? { mobile: true, viewport } : {}),
  })
  await page.goto(`${APP}${path}`)
  await page.waitForURL(/\/homework/, { timeout: 10000 })
  await page.waitForTimeout(800)
  const clean = await storageClean(page)
  const conv = converterHits.filter(h => h.scenario === `FE1-${num}-${path}`)
  check(`FE1.${num} ${path} redirects to /homework (legacy proof-loop decommissioned)`, true)
  check(`FE1.${num} ${path} produced ZERO Converter requests`, conv.length === 0, JSON.stringify(conv))
  check(`FE1.${num} ${path} wrote NO browser-derived confidence/mastery; server cache byte-identical`,
    clean.cacheIntact && clean.noMastery)
  if (viewport) {
    check(`FE1.${num} ${viewport.width}x${viewport.height}: no horizontal overflow`,
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
  }
  check(`FE1.${num} no page errors`, state.pageErrors.length === 0, state.pageErrors.join('; '))
  await context.close()
}

// ── 5–7: /practice/T_* resolves canonical Practice Live ──
async function practiceRedirect(browser, tid, expectText, num) {
  const { context, page, state } = await makeContext(browser, { name: `FE1-${num}-${tid}` })
  await page.goto(`${APP}/practice/${tid}`)
  await page.waitForURL(new RegExp(`/practice-live\\?concept=${tid}$`), { timeout: 10000 })
  await page.getByText(expectText, { exact: false }).first().waitFor({ timeout: 15000 })
  const clean = await storageClean(page)
  const conv = converterHits.filter(h => h.scenario === `FE1-${num}-${tid}`)
  check(`FE1.${num} /practice/${tid} → canonical Practice Live (exact T_* passthrough)`, true, page.url())
  check(`FE1.${num} ${tid}: ZERO Converter Concept_State loads (wrapper no longer asks Converter)`,
    conv.length === 0, JSON.stringify(conv))
  check(`FE1.${num} ${tid}: cache untouched, no local mastery writes`,
    clean.cacheIntact && clean.noMastery)
  check(`FE1.${num} ${tid}: no crash`, state.pageErrors.length === 0, state.pageErrors.join('; '))
  await page.screenshot({ path: resolve(SCREENS, `fe1-${num}-${tid}.png`) })
  await context.close()
}

// ── 8–10: governed gates survive ──
async function gateScenario(browser, gateId, marker, num) {
  const { context, page, state } = await makeContext(browser, { name: `FE1-${num}-${gateId}` })
  await page.goto(`${APP}/practice/${gateId}`)
  await page.getByText(marker, { exact: false }).first().waitFor({ timeout: 20000 })
  const clean = await storageClean(page)
  const conv = converterHits.filter(h => h.scenario === `FE1-${num}-${gateId}`)
  const evidencePosts = governanceLog.filter(r =>
    r.scenario === `FE1-${num}-${gateId}` && r.method === 'POST' && /practice[-_]event/i.test(r.url))
  check(`FE1.${num} gate route /practice/${gateId} still renders (${marker})`, true)
  check(`FE1.${num} ${gateId}: gate evidence writes remain ZERO`, evidencePosts.length === 0,
    JSON.stringify(evidencePosts))
  check(`FE1.${num} ${gateId}: ZERO Converter traffic`, conv.length === 0)
  check(`FE1.${num} ${gateId}: no local mastery persistence`, clean.cacheIntact && clean.noMastery)
  check(`FE1.${num} ${gateId}: no crash`, state.pageErrors.length === 0, state.pageErrors.join('; '))
  await page.screenshot({ path: resolve(SCREENS, `fe1-${num}-${gateId}.png`) })
  await context.close()
}

// ── 18: unsupported canonical concept fails closed ──
async function unsupportedConcept(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'FE1-18', mobile: true, viewport: { width: 393, height: 852 },
  })
  await page.goto(`${APP}/practice/T_NOT_A_REAL_CONCEPT`)
  await page.waitForURL(/\/practice-live\?concept=T_NOT_A_REAL_CONCEPT/, { timeout: 10000 })
  await page.locator('[data-testid="practice-unavailable"]').waitFor({ timeout: 15000 })
  const body = await page.locator('body').innerText()
  check('FE1.18 unsupported canonical concept FAILS CLOSED (no default substitution)',
    !body.includes('Major Scale Pattern'))
  check('FE1.18 393x852: no horizontal overflow',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
  await page.screenshot({ path: resolve(SCREENS, 'fe1-18-fail-closed.png') })
  await context.close()
}

// ── 19: assignment_id passthrough rules ──
async function assignmentPassthrough(browser) {
  const a = await makeContext(browser, { name: 'FE1-19a' })
  await a.page.goto(`${APP}/practice/T_HALF_STEP?assignment_id=${CANON_ASGN}`)
  await a.page.waitForURL(/\/practice-live\?/, { timeout: 10000 })
  const ua = new URL(a.page.url())
  check('FE1.19 canonical rec… assignment_id SURVIVES the /practice redirect',
    ua.searchParams.get('concept') === 'T_HALF_STEP' &&
    ua.searchParams.get('assignment_id') === CANON_ASGN, a.page.url())
  await a.context.close()

  const b = await makeContext(browser, { name: 'FE1-19b' })
  await b.page.goto(`${APP}/practice/T_HALF_STEP?assignment_id=42`)
  await b.page.waitForURL(/\/practice-live\?/, { timeout: 10000 })
  const ub = new URL(b.page.url())
  check('FE1.19 malformed assignment_id is DROPPED (assignment_number is never an identifier)',
    ub.searchParams.get('concept') === 'T_HALF_STEP' && ub.searchParams.get('assignment_id') === null,
    b.page.url())
  await b.context.close()
}

// ── 20: Article XIII sweep on visited student surfaces ──
async function articleXIII(browser) {
  const { context, page } = await makeContext(browser, {
    name: 'FE1-20', mobile: true, viewport: { width: 390, height: 844 },
  })
  const sweeps = []
  for (const path of ['/find-it', '/practice/T_HALF_STEP', '/practice-log']) {
    await page.goto(`${APP}${path}`)
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    sweeps.push({ path, body })
  }
  const dirty = sweeps.filter(s =>
    /confidence/i.test(s.body) || /mastery/i.test(s.body) || /%\s*accuracy/i.test(s.body) ||
    /(accuracy|drive|passion|motivation)[^.%]{0,20}\d+\s*%/i.test(s.body))
  check('FE1.20 Article XIII clean on every visited student surface (no confidence/mastery/% accuracy)',
    dirty.length === 0, JSON.stringify(dirty.map(d => d.path)))
  check('FE1.20 390x844: no horizontal overflow',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
  await context.close()
}

// ── STATIC REACHABILITY AUDIT ──
// Walk the real import graph from src/App.jsx (and main.jsx) and classify
// every file containing Converter learning-state references.
function staticReachabilityAudit() {
  const SRC = join(ROOT, 'src')
  const seen = new Set()
  const queue = [join(SRC, 'main.jsx'), join(SRC, 'App.jsx')]
  const exts = ['', '.js', '.jsx', '/index.js', '/index.jsx']
  const resolveImport = (fromFile, spec) => {
    if (!spec.startsWith('.')) return null // packages: out of scope
    const base = join(dirname(fromFile), spec)
    for (const e of exts) { const p = base + e; if (existsSync(p) && !p.endsWith('/')) return p }
    return null
  }
  while (queue.length) {
    const f = queue.pop()
    if (!f || seen.has(f)) continue
    seen.add(f)
    let src = ''
    try { src = readFileSync(f, 'utf8') } catch { continue }
    // strip block/line comments so QUARANTINE banners and dead notes never
    // count as live imports or live references
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const m of code.matchAll(/(?:import\s[^'"]*?|import\(|from\s*)['"]([^'"]+)['"]/g)) {
      const dep = resolveImport(f, m[1])
      if (dep) queue.push(dep)
    }
  }
  // every source file with converter learning-state references
  const offenders = []
  const walk = (dir) => {
    for (const name of readdirSyncSafe(dir)) {
      const p = join(dir, name)
      if (statIsDir(p)) { walk(p); continue }
      if (!/\.(jsx?|mjs)$/.test(p)) continue
      const raw = readFileSync(p, 'utf8')
      const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      const hasLearningState = /motesart-converter\.netlify\.app[^\n"'`]*\/api\/(practice-events|concept-state)/.test(code)
        || /['"`]\/api\/(practice-events|concept-state)/.test(code)
        || (/motesart-converter\.netlify\.app/.test(code) && /api\/(practice-events|concept-state)/.test(code))
      const hasProductLink = /window\.open\(['"`]https:\/\/motesart-converter\.netlify\.app['"`]/.test(code)
      if (hasLearningState || (/motesart-converter\.netlify\.app/.test(code) && !hasProductLink)) {
        offenders.push({ file: p.slice(ROOT.length + 1), live: seen.has(p), kind: 'learning-state' })
      } else if (hasProductLink) {
        offenders.push({ file: p.slice(ROOT.length + 1), live: seen.has(p), kind: 'product-link (allowed)' })
      }
    }
  }
  walk(SRC)
  const liveLearning = offenders.filter(o => o.live && o.kind === 'learning-state')
  console.log('\n── STATIC REACHABILITY AUDIT (Converter references) ──')
  for (const o of offenders.sort((x, y) => x.file.localeCompare(y.file))) {
    console.log(`  ${o.live ? 'LIVE       ' : 'QUARANTINED'}  ${o.kind.padEnd(22)}  ${o.file}`)
  }
  check('AUDIT: ZERO LIVE Converter learning-state references reachable from App.jsx',
    liveLearning.length === 0, JSON.stringify(liveLearning))
  check('AUDIT: quarantined legacy sources are NOT in the live import graph',
    offenders.filter(o => o.kind === 'learning-state').every(o => !o.live))
  return offenders
}
import { readdirSync, statSync } from 'node:fs'
function readdirSyncSafe(d) { try { return readdirSync(d) } catch { return [] } }
function statIsDir(p) { try { return statSync(p).isDirectory() } catch { return false } }

// ── network governance across every scenario ──
function networkGovernance() {
  const convEvidence = converterHits.filter(h => /\/api\/practice-events/.test(h.url))
  const convState = converterHits.filter(h => /\/api\/concept-state(?!\/recompute)/.test(h.url))
  const convRecompute = converterHits.filter(h => /\/api\/concept-state\/recompute/.test(h.url))
  const emailLookup = governanceLog.filter(r => /\/student\?email=/.test(r.url))
  const gateEvidence = governanceLog.filter(r => r.method === 'POST' && /practice[-_]event/i.test(r.url))
  const offBaseline = governanceLog.filter(r => {
    if (r.url.startsWith(APP) || r.url.startsWith(API)) return false
    try { return !BASELINE_THIRD_PARTY.has(new URL(r.url).origin) } catch { return true }
  })
  check('FE1.12 NETWORK: Converter /api/practice-events ZERO across all scenarios',
    convEvidence.length === 0, JSON.stringify(convEvidence.slice(0, 3)))
  check('FE1.13 NETWORK: Converter /api/concept-state ZERO across all scenarios',
    convState.length === 0, JSON.stringify(convState.slice(0, 3)))
  check('FE1.14 NETWORK: Converter /api/concept-state/recompute ZERO across all scenarios',
    convRecompute.length === 0, JSON.stringify(convRecompute.slice(0, 3)))
  check('FE1.11 NETWORK: total Converter requests of ANY kind: ZERO',
    converterHits.length === 0, JSON.stringify(converterHits.slice(0, 3)))
  check('NETWORK: gate/game evidence POSTs ZERO (flag stays OFF)', gateEvidence.length === 0)
  check('NETWORK: /student?email= ZERO', emailLookup.length === 0)
  check('NETWORK: no origins beyond the frozen baseline set', offBaseline.length === 0,
    JSON.stringify([...new Set(offBaseline.map(r => { try { return new URL(r.url).origin } catch { return r.url } }))]))
}

// ── run ──
const previewChild = await ensurePreview()
const browser = await launch()
try {
  await legacyRouteScenario(browser, '/find-it', 1, { width: 430, height: 932 })
  await legacyRouteScenario(browser, '/play-it', 2)
  await legacyRouteScenario(browser, '/move-it', 3)
  await legacyRouteScenario(browser, '/own-it', 4)
  await practiceRedirect(browser, 'T_HALF_STEP', 'Half Step', 5)
  await practiceRedirect(browser, 'T_WHOLE_STEP', 'Whole Step', 6)
  await practiceRedirect(browser, 'T_MAJOR_SCALE_PATTERN', 'Major Scale Pattern', 7)
  await gateScenario(browser, 'C_MAJOR_GATE_0', 'Pattern Mind', 8)
  await gateScenario(browser, 'C_MAJOR_GATE_FIND_HOME', 'Find Home', 9)
  await gateScenario(browser, 'C_MAJOR_GATE_SKIP_TOGETHER', 'Skip & Together', 10)
  await unsupportedConcept(browser)
  await assignmentPassthrough(browser)
  await articleXIII(browser)
  networkGovernance()
  staticReachabilityAudit()
} finally {
  await browser.close()
  if (previewChild) { try { process.kill(-previewChild.pid) } catch { /* gone */ } }
}

writeFileSync(resolve(OUT, 'm1r2-fe1-qa-results.json'),
  JSON.stringify({ results, requests: governanceLog, converterHits }, null, 2))
const passed = results.filter(r => r.ok).length
console.log(`\nQA TOTAL: ${passed}/${results.length} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
