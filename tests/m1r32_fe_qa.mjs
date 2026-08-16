/**
 * m1r32_fe_qa.mjs — M1 R3.2-FE Codex remediation closure QA.
 *
 * Directly proves the four Codex R3.2 findings are closed:
 *   HIGH-1  Teacher TAMi dashboard no longer presents hard-coded student/DPM/WYL
 *           data as "Live Class Data" — the active route is quarantined truthfully.
 *   HIGH-2  The frontend never POSTs to the unsupported /tami/lesson-moment
 *           operation (fails closed); supported TAMi calls carry Authorization.
 *   MED-1   Privileged UI does not mount from cached localStorage role; it waits
 *           for backend /auth/verify and fails closed on 401/403/outage.
 *   MED-2   Browser QA is reproducible from the repo via scripts/qa-bootstrap.mjs
 *           (pinned Playwright, isolated scratch, no production dep mutation).
 *
 * PART 1: Node-only static source audits over the REAL shipped files.
 * PART 2: Playwright browser/DOM/network coverage against a vite-preview build
 *         with fully mocked network (ZERO live backend, ZERO live Airtable).
 * Playwright is NOT a project dependency; resolve it with the repo-contained
 * bootstrap:  node scripts/qa-bootstrap.mjs tests/m1r32_fe_qa.mjs
 *
 * Usage (standalone, requires playwright already linked + a built dist):
 *   node tests/m1r32_fe_qa.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8')

let pass = 0
let fail = 0
const failures = []
function check(id, desc, cond, extra = '') {
  if (cond) { pass++ } else { fail++; failures.push(`${id}: ${desc}${extra ? ' — ' + extra : ''}`); console.error(`FAIL ${id} — ${desc}${extra ? ' — ' + extra : ''}`) }
}

// ═════════════════════════════════════════════════════════════════════════
// PART 1 — static source audits
// ═════════════════════════════════════════════════════════════════════════
function part1() {
  // ── A. Teacher TAMi quarantine (HIGH-1) ──
  const tt = read('src/pages/TeacherTamiDashboard.jsx')
  check('A1', 'TeacherTamiDashboard: no "Live Class Data" claim', !/Live Class Data/.test(tt))
  check('A2', 'TeacherTamiDashboard: fabricated roster names removed',
    !/Emma Rodriguez|Tyler Kim|Marcus Williams|Luna Chen|Mia Thompson/.test(tt))
  check('A3', 'TeacherTamiDashboard: fabricated data constants removed (STUDENTS/TAMI_INSIGHTS/WEEKLY_DPM)',
    !/const STUDENTS\s*=/.test(tt) && !/TAMI_INSIGHTS/.test(tt) && !/WEEKLY_DPM/.test(tt))
  check('A4', 'TeacherTamiDashboard: no hard-coded dpm/drive/passion metric fields',
    !/dpm:\s*\d+/.test(tt) && !/drive:\s*\d+/.test(tt))
  check('A5', 'TeacherTamiDashboard: truthful unavailable state present',
    /not available in M1/.test(tt) && /teacher-tami-quarantine/.test(tt))

  // ── B. TAMi bridge (HIGH-2) ──
  const br = read('src/lesson_engine/tami_bridge.js')
  check('B1', 'tami_bridge: lesson-moment escalation disabled by default',
    /lessonMomentEnabled:\s*config\.lessonMomentEnabled === true/.test(br))
  check('B2', 'tami_bridge: _callBackend fails closed (returns fallback) when disabled — no fetch',
    /if \(!this\.config\.lessonMomentEnabled\)/.test(br) && /endpoint_unsupported/.test(br))
  check('B3', 'tami_bridge: Authorization attached to supported call via getAuthToken',
    /getAuthToken/.test(br) && /Authorization:\s*`Bearer \$\{_token\}`/.test(br))
  // guard must appear BEFORE the fetch/url construction in _callBackend
  const cbIdx = br.indexOf('async _callBackend')
  const guardIdx = br.indexOf('if (!this.config.lessonMomentEnabled)', cbIdx)
  const fetchIdx = br.indexOf('await fetch(', cbIdx)
  check('B4', 'tami_bridge: fail-closed guard precedes the network fetch',
    cbIdx >= 0 && guardIdx > cbIdx && fetchIdx > guardIdx)

  // ── C. Backend-verified role gate (MED-1) ──
  const ac = read('src/context/AuthContext.jsx')
  check('C1', 'AuthContext: roleVerified state exists', /const \[roleVerified, setRoleVerified\] = useState\(false\)/.test(ac))
  check('C2', 'AuthContext: roleVerified set true only on verified /auth/verify success',
    /setRoleVerified\(true\)/.test(ac) && /api\.verifySession\(\)/.test(ac))
  check('C3', 'AuthContext: verification failure/outage leaves roleVerified false + logout',
    /setRoleVerified\(false\)/.test(ac) && /logout\(\)/.test(ac))
  check('C4', 'AuthContext: roleVerified exposed on context value', /user, login, logout, updateUser, verifying, roleVerified/.test(ac))
  const app = read('src/App.jsx')
  check('C5', 'App: PrivilegedRoute requires roleVerified before mount',
    /function PrivilegedRoute/.test(app) && /if \(!roleVerified\) return <AccessVerifying/.test(app))
  check('C6', 'App: privileged guards route through PrivilegedRoute',
    /function TeacherRoute[\s\S]*?<PrivilegedRoute allow=\{\['teacher', 'admin', 'founder'\]\}/.test(app) &&
    /function AdminRoute[\s\S]*?<PrivilegedRoute allow=\{\['admin'\]\}/.test(app))

  // ── D. Reproducible QA bootstrap (MED-2) ──
  const pkg = JSON.parse(read('package.json'))
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  check('D1', 'package.json: playwright is NOT a production/dev dependency',
    !('playwright' in allDeps) && !('playwright-core' in allDeps))
  check('D2', 'package.json: one-command qa:browser script present', pkg.scripts && pkg.scripts['qa:browser'] === 'node scripts/qa-bootstrap.mjs')
  const boot = read('scripts/qa-bootstrap.mjs')
  check('D3', 'qa-bootstrap: pins an exact Playwright version', /PLAYWRIGHT_VERSION = '1\.49\.1'/.test(boot))
  check('D4', 'qa-bootstrap: isolated scratch install (mkdtempSync, playwright@ pinned)',
    /mkdtempSync/.test(boot) && /playwright@\$\{PLAYWRIGHT_VERSION\}/.test(boot))
  check('D5', 'qa-bootstrap: exports QA_CHROMIUM + cleans links + restores dist',
    /QA_CHROMIUM/.test(boot) && /checkout', '--', 'dist'/.test(boot) && /rmSync\(link/.test(boot))

  console.log(`\nPart 1 (static): ${pass}/${pass + fail} passed`)
}

// ═════════════════════════════════════════════════════════════════════════
// PART 2 — browser/DOM/network
// ═════════════════════════════════════════════════════════════════════════
const PORT = 4188
const APP = `http://localhost:${PORT}`
const API = 'https://deployable-python-codebase-som-production.up.railway.app'
const SINGLE = 'recSI_ALICE'
const IDENT = {
  user_id: 'recUSER_ALICE', student_record_id: 'recSTU_ALICE',
  student_instrument_id: SINGLE, role: 'student', selection_required: false,
  identity_status: 'resolved',
  owned_instruments: [{ student_instrument_id: SINGLE, instrument: 'Piano', label: 'Alice' }],
}

async function ensurePreview() {
  try { const r = await fetch(`${APP}/`); if (r.ok) return null } catch { /* spawn */ }
  const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore', detached: true })
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 250))
    try { const r = await fetch(`${APP}/`); if (r.ok) return child } catch { /* retry */ }
  }
  throw new Error('vite preview not ready on :' + PORT)
}

async function launchBrowser() {
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  try { return await chromium.launch({ args }) }
  catch { return await chromium.launch({ executablePath: process.env.QA_CHROMIUM || '/opt/pw-browsers/chromium', args }) }
}

async function makeCtx(browser, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] })
  const reqLog = []
  const tamiChatReqs = []
  const somUser = opts.somUser || { id: 'recUSER_ALICE', email: 'alice@example.com', role: opts.somRole || 'student', name: 'Alice' }
  await context.addInitScript((u) => {
    localStorage.setItem('som_token', 'qa-token')
    localStorage.setItem('som_user', JSON.stringify(u))
  }, somUser)
  const verify = opts.verify || { status: 200, role: somUser.role }
  await context.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/auth/verify') {
      if (verify.abort) return route.abort()
      if (verify.delayMs) await new Promise(r => setTimeout(r, verify.delayMs))
      if (verify.status && verify.status >= 400) return route.fulfill({ status: verify.status, json: { detail: 'denied' } })
      return route.fulfill({ json: { ok: true, valid: true, user: { id: somUser.id, email: somUser.email, name: somUser.name, role: verify.role || somUser.role } } })
    }
    if (u.pathname === '/auth/learning-identity') return route.fulfill({ json: { ...IDENT, role: verify.role || somUser.role } })
    if (u.pathname === '/assignments/mine') return route.fulfill({ json: [] })
    if (/^\/concept-state\//.test(u.pathname)) return route.fulfill({ json: { has_active_assignment: false, assignment: null } })
    if (/^\/students\//.test(u.pathname)) return route.fulfill({ json: { id: 'recSTU_ALICE', name: 'Alice', student_instruments: [SINGLE] } })
    return route.fulfill({ status: 200, json: {} })
  })
  await context.route(`${APP}/api/**`, async (route) => {
    const url = route.request().url()
    if (/\/api\/tami\/chat/.test(url)) {
      tamiChatReqs.push({ url, auth: route.request().headers()['authorization'] || null })
      if (opts.tamiChatStatus && opts.tamiChatStatus >= 400) return route.fulfill({ status: opts.tamiChatStatus, json: { detail: 'unauthorized' } })
      return route.fulfill({ json: { reply: 'QA-OK' } })
    }
    return route.fulfill({ status: 200, json: {} })
  })
  context.on('request', (r) => reqLog.push(r.url()))
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  return { context, page, reqLog, tamiChatReqs, pageErrors }
}

const hasAccessVerifying = (page) => page.locator('[data-testid="access-verifying"]').count().then(n => n > 0)

// ── A. Teacher TAMi active route is truthfully quarantined ──
async function a_teacher_tami_quarantine(browser) {
  const { context, page } = await makeCtx(browser, { somRole: 'teacher', verify: { status: 200, role: 'teacher' } })
  await page.goto(`${APP}/teacher-tami`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="teacher-tami-quarantine"]', { timeout: 15000 })
  const body = await page.locator('body').innerText()
  check('A6', 'active /teacher-tami renders truthful quarantine state', /not available in M1/i.test(body))
  check('A7', 'active /teacher-tami shows NO "Live Class Data" claim', !/Live Class Data/.test(body))
  check('A8', 'active /teacher-tami shows NO fabricated student roster', !/Emma Rodriguez|Tyler Kim|Marcus Williams|Luna Chen/.test(body))
  check('A9', 'active /teacher-tami shows NO fabricated DPM percentages', !/\b\d{1,3}%/.test(body))
  await context.close()
}

// ── B. TAMi bridge: zero unsupported POSTs + Authorization on supported calls ──
async function b_bridge_lessonmoment_zero(browser) {
  const { context, page, reqLog } = await makeCtx(browser, { somRole: 'student', verify: { status: 200, role: 'student' } })
  await page.goto(`${APP}/practice-live`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)
  const lessonMoment = reqLog.filter(u => /lesson-moment/.test(u))
  check('B5', 'WYLPracticeLive: ZERO requests to unsupported /tami/lesson-moment', lessonMoment.length === 0, `${lessonMoment.length} seen`)
  await context.close()
}

async function b_supported_tami_authorization(browser) {
  const { context, page, tamiChatReqs } = await makeCtx(browser, { somRole: 'ambassador', verify: { status: 200, role: 'ambassador' } })
  await page.goto(`${APP}/ambassador`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  await page.evaluate(() => window.dispatchEvent(new Event('open-tami-chat')))
  for (let i = 0; i < 40 && tamiChatReqs.length === 0; i++) await page.waitForTimeout(150)
  check('B6', 'supported /api/tami/chat call fired', tamiChatReqs.length > 0, `${tamiChatReqs.length}`)
  if (tamiChatReqs.length) {
    check('B7', 'supported TAMi call carries Authorization: Bearer', /^Bearer\s+.+/.test(tamiChatReqs[0].auth || ''), String(tamiChatReqs[0].auth))
  }
  await context.close()
}

async function b_tami_auth_failure_fails_closed(browser) {
  const { context, page } = await makeCtx(browser, { somRole: 'ambassador', verify: { status: 200, role: 'ambassador' }, tamiChatStatus: 401 })
  await page.goto(`${APP}/ambassador`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  await page.evaluate(() => window.dispatchEvent(new Event('open-tami-chat')))
  await page.waitForTimeout(2500)
  // 401 on a supported call fails closed: api.js clears the token + force-logout.
  const token = await page.evaluate(() => localStorage.getItem('som_token'))
  check('B8', 'TAMi auth 401 fails closed (token cleared, no fabricated success)', token === null, `token=${token}`)
  await context.close()
}

// ── C. Backend-verified role before privileged mount ──
async function c_role_authority(browser) {
  // C1 forged local admin, backend says student → privileged admin route denied
  {
    const { context, page } = await makeCtx(browser, { somRole: 'admin', verify: { status: 200, role: 'student' } })
    await page.goto(`${APP}/admin`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    check('C7', 'forged localStorage admin cannot mount /admin (backend says student)', !/\/admin$/.test(page.url()), page.url())
    await context.close()
  }
  // C2 pending verification never renders privileged UI (delay), then mounts
  {
    const { context, page } = await makeCtx(browser, { somRole: 'teacher', verify: { status: 200, role: 'teacher', delayMs: 2500 } })
    await page.goto(`${APP}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    check('C8', 'privileged component does NOT render before verification (shows Verifying)', await hasAccessVerifying(page))
    await page.waitForTimeout(3000)
    check('C9', 'after verification the placeholder clears and route mounts', !(await hasAccessVerifying(page)) && /\/teacher$/.test(page.url()), page.url())
    await context.close()
  }
  // C3 verified student denied a teacher route
  {
    const { context, page } = await makeCtx(browser, { somRole: 'student', verify: { status: 200, role: 'student' } })
    await page.goto(`${APP}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    check('C10', 'verified student denied /teacher', !/\/teacher$/.test(page.url()), page.url())
    await context.close()
  }
  // C4 401 on verify → fail closed to login
  {
    const { context, page } = await makeCtx(browser, { somRole: 'teacher', verify: { status: 401 } })
    await page.goto(`${APP}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    check('C11', '401 verification fails closed (privileged route not mounted)', !/\/teacher$/.test(page.url()), page.url())
    await context.close()
  }
  // C5 403 on verify → fail closed
  {
    const { context, page } = await makeCtx(browser, { somRole: 'teacher', verify: { status: 403 } })
    await page.goto(`${APP}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    check('C12', '403 verification fails closed (privileged route not mounted)', !/\/teacher$/.test(page.url()), page.url())
    await context.close()
  }
  // C6 verification outage (network abort) → fail closed
  {
    const { context, page } = await makeCtx(browser, { somRole: 'teacher', verify: { abort: true } })
    await page.goto(`${APP}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    check('C13', 'verification outage fails closed (privileged route not mounted)', !/\/teacher$/.test(page.url()), page.url())
    await context.close()
  }
  // C7 verified teacher mounts
  {
    const { context, page } = await makeCtx(browser, { somRole: 'teacher', verify: { status: 200, role: 'teacher' } })
    await page.goto(`${APP}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    check('C14', 'verified teacher mounts /teacher', /\/teacher$/.test(page.url()) && !(await hasAccessVerifying(page)), page.url())
    await context.close()
  }
}

async function part2() {
  const preview = await ensurePreview()
  const browser = await launchBrowser()
  try {
    await a_teacher_tami_quarantine(browser)
    await b_bridge_lessonmoment_zero(browser)
    await b_supported_tami_authorization(browser)
    await b_tami_auth_failure_fails_closed(browser)
    await c_role_authority(browser)
  } finally {
    await browser.close()
    if (preview) { try { process.kill(-preview.pid) } catch { try { preview.kill() } catch {} } }
  }
}

// ═════════════════════════════════════════════════════════════════════════
async function main() {
  part1()
  await part2()
  console.log(`\n${pass}/${pass + fail} passed`)
  if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  - ' + f)) }
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
