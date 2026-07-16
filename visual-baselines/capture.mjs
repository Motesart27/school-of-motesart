import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright'
const { chromium } = await import(playwrightSpecifier)

const sourceCommit = process.env.BASELINE_SOURCE_COMMIT
if (!sourceCommit) throw new Error('BASELINE_SOURCE_COMMIT is required')

const baseURL = process.env.BASELINE_BASE_URL || 'http://127.0.0.1:4174'
const outputDir = process.env.BASELINE_OUTPUT_DIR || path.dirname(fileURLToPath(import.meta.url))
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]

const routes = [
  { name: 'root-login', path: '/', role: null, guard: 'Public' },
  { name: 'login', path: '/login', role: null, guard: 'Public' },
  { name: 'register', path: '/register', role: null, guard: 'Public' },
  { name: 'dashboard-role-redirect', path: '/dashboard', role: 'student', guard: 'DashboardRedirect' },
  { name: 'student', path: '/student', role: 'student', guard: 'ProtectedRoute' },
  { name: 'tami', path: '/tami', role: 'student', guard: 'ProtectedRoute' },
  { name: 'teacher', path: '/teacher', role: 'teacher', guard: 'TeacherRoute' },
  { name: 'teacher-tami', path: '/teacher-tami', role: 'teacher', guard: 'TeacherRoute' },
  { name: 'parent', path: '/parent', role: 'parent', guard: 'ParentRoute' },
  { name: 'admin', path: '/admin', role: 'admin', guard: 'AdminRoute' },
  { name: 'ambassador', path: '/ambassador', role: 'ambassador', guard: 'AmbassadorRoute' },
  { name: 'game', path: '/game', role: 'student', guard: 'ProtectedRoute' },
  { name: 'games', path: '/games', role: 'student', guard: 'ProtectedRoute' },
  { name: 'homework', path: '/homework', role: 'student', guard: 'ProtectedRoute' },
  { name: 'leaderboard', path: '/leaderboard', role: 'student', guard: 'ProtectedRoute' },
  { name: 'practice', path: '/practice', role: 'student', guard: 'ProtectedRoute' },
  { name: 'practice-log', path: '/practice-log', role: 'student', guard: 'ProtectedRoute' },
  { name: 'session-summary', path: '/session-summary', role: 'student', guard: 'ProtectedRoute' },
  { name: 'settings', path: '/settings', role: 'student', guard: 'ProtectedRoute' },
  { name: 'my-coach', path: '/my-coach', role: 'student', guard: 'ProtectedRoute' },
  { name: 'practice-live', path: '/practice-live?concept=find-home', role: 'student', guard: 'ProtectedRoute' },
  { name: 'legacy-wyl-practice', path: '/wyl-practice', role: 'student', guard: 'Navigate -> /practice-live' },
  { name: 'legacy-live-practice', path: '/live-practice', role: 'student', guard: 'Navigate -> /practice-live' },
  { name: 'wyl-practice-staff', path: '/wyl-practice-staff', role: 'teacher', guard: 'TeacherRoute' },
  { name: 'curriculum', path: '/curriculum', role: 'teacher', guard: 'TeacherRoute' },
  { name: 'practice-concept', path: '/practice/C_MAJOR_GATE_FIND_HOME', role: 'student', guard: 'ProtectedRoute' },
  { name: 'play-it', path: '/play-it', role: 'student', guard: 'ProtectedRoute' },
  { name: 'find-it', path: '/find-it', role: 'student', guard: 'ProtectedRoute' },
  { name: 'move-it', path: '/move-it', role: 'student', guard: 'ProtectedRoute' },
  { name: 'own-it', path: '/own-it', role: 'student', guard: 'ProtectedRoute' },
  { name: 'concept-health', path: '/concept-health', role: 'teacher', guard: 'TeacherRoute' },
  { name: 'dpm-playground', path: '/dpm-playground', role: 'student', guard: 'ProtectedRoute' },
  { name: 'rhythm-racer', path: '/rhythm-racer', role: 'student', guard: 'ProtectedRoute' },
  { name: 'wildcard-redirect', path: '/__phase0_unmatched__', role: null, guard: 'Navigate -> /' },
]

const userForRole = role => ({
  id: `phase0-${role}`,
  name: role === 'teacher' ? 'Phase Zero Teacher' : role === 'parent' ? 'Phase Zero Parent' : role === 'admin' ? 'Phase Zero Admin' : role === 'ambassador' ? 'Phase Zero Ambassador' : 'Phase Zero Student',
  email: `phase0-${role}@example.invalid`, role, status: 'active', instrument: 'Piano',
})
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })
const manifest = []

for (const route of routes) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
    if (route.role) {
      const user = userForRole(route.role)
      await context.addInitScript(({ storedUser }) => {
        localStorage.setItem('som_user', JSON.stringify(storedUser))
        localStorage.setItem('som_token', 'phase0-audit-token')
      }, { storedUser: user })
    }
    await context.route('**/*', async intercepted => {
      const requestURL = new URL(intercepted.request().url())
      if (requestURL.origin === new URL(baseURL).origin) return intercepted.continue()
      if (requestURL.hostname.includes('railway.app')) {
        const user = route.role ? userForRole(route.role) : null
        if (requestURL.pathname.endsWith('/auth/verify')) return intercepted.fulfill(json({ valid: true, user }))
        if (/students|practice-logs|sessions|assignments/.test(requestURL.pathname)) return intercepted.fulfill(json([]))
        return intercepted.fulfill(json({}))
      }
      if (requestURL.hostname.includes('motesart-converter.netlify.app')) return intercepted.fulfill(json({ records: [], state: null }))
      if (requestURL.hostname === 'fonts.googleapis.com') return intercepted.fulfill({ status: 200, contentType: 'text/css', body: '' })
      if (requestURL.hostname === 'cdn.jsdelivr.net') return intercepted.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart = class { destroy() {} };' })
      return intercepted.abort()
    })

    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    page.on('pageerror', error => pageErrors.push(String(error)))
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    const requestedURL = `${baseURL}${route.path}`
    let status = 'captured'
    let finalURL = requestedURL
    try {
      await page.goto(requestedURL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)
      finalURL = page.url()
    } catch (error) { status = `navigation-error: ${error.message}` }

    const filename = `${route.name}__${viewport.name}.png`
    const screenshotPath = path.join(outputDir, filename)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    const screenshotBytes = await fs.readFile(screenshotPath)
    manifest.push({ sourceCommit, route: route.path, guard: route.guard, authFixture: route.role || 'public', viewport: `${viewport.width}x${viewport.height}`, filename, screenshotSha256: sha256(screenshotBytes), requestedURL, finalURL, status, consoleErrors, pageErrors })
    await context.close()
  }
}

await browser.close()
await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
const navigationFailures = manifest.filter(item => item.status !== 'captured')
const pageErrorEntries = manifest.filter(item => item.pageErrors.length)
console.log(`Captured ${manifest.length} baselines; navigation failures: ${navigationFailures.length}; page-error entries: ${pageErrorEntries.length}`)
if (navigationFailures.length || pageErrorEntries.length) process.exitCode = 1
