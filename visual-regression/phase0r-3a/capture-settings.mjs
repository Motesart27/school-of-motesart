import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright'
const { chromium } = await import(playwrightSpecifier)

const outputDir = path.dirname(fileURLToPath(import.meta.url))
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const beforeBaseURL = process.env.BEFORE_BASE_URL || 'http://127.0.0.1:4179'
const afterBaseURL = process.env.AFTER_BASE_URL || 'http://127.0.0.1:4180'
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]
const cases = [
  { name: 'before-missing-data-sanitized', baseURL: beforeBaseURL, email: null, expectedEmail: 'phase0r-before@example.invalid', expectedPhone: '000-000-0000', classification: 'sanitized pre-change fallback behavior' },
  { name: 'after-missing-data', baseURL: afterBaseURL, email: null, expectedEmail: '', expectedPhone: '', classification: 'post-change empty fallback behavior' },
  { name: 'after-current-user-email', baseURL: afterBaseURL, email: 'phase0r-user@example.invalid', expectedEmail: 'phase0r-user@example.invalid', expectedPhone: '', classification: 'post-change current-user email behavior' },
]
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })
const manifest = []

for (const testCase of cases) {
  for (const viewport of viewports) {
    const user = { id: `phase0r-3a-${testCase.name}`, name: 'Phase 0R Student', role: 'student', status: 'active' }
    if (testCase.email !== null) user.email = testCase.email
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
    await context.addInitScript(({ storedUser }) => {
      localStorage.setItem('som_user', JSON.stringify(storedUser))
      localStorage.setItem('som_token', 'phase0r-3a-sanitized-token')
    }, { storedUser: user })
    await context.route('**/*', async intercepted => {
      const requestURL = new URL(intercepted.request().url())
      if (requestURL.origin === new URL(testCase.baseURL).origin) return intercepted.continue()
      if (requestURL.hostname.includes('railway.app')) {
        if (requestURL.pathname.endsWith('/auth/verify')) return intercepted.fulfill(json({ valid: true, user }))
        return intercepted.fulfill(json([]))
      }
      if (requestURL.hostname === 'fonts.googleapis.com') return intercepted.fulfill({ status: 200, contentType: 'text/css', body: '' })
      return intercepted.fulfill({ status: 204, body: '' })
    })
    const page = await context.newPage()
    const consoleErrors = []
    const pageErrors = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('pageerror', error => pageErrors.push(String(error)))
    const requestedURL = `${testCase.baseURL}/settings`
    await page.goto(requestedURL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1000)
    const inputs = page.locator('.set-field input')
    const emailValue = await inputs.nth(1).inputValue()
    const phoneValue = await inputs.nth(2).inputValue()
    if (emailValue !== testCase.expectedEmail || phoneValue !== testCase.expectedPhone) {
      throw new Error(`${testCase.name} ${viewport.name}: Settings contact assertion failed`)
    }
    const filename = `${testCase.name}__${viewport.name}.png`
    const screenshotPath = path.join(outputDir, filename)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    manifest.push({
      case: testCase.name,
      classification: testCase.classification,
      viewport: `${viewport.width}x${viewport.height}`,
      requestedRoute: '/settings',
      finalPath: new URL(page.url()).pathname,
      authFixture: 'sanitized student',
      emailAssertion: emailValue === '' ? 'empty' : emailValue === testCase.email ? 'current fixture value' : 'sanitized fallback value',
      phoneAssertion: phoneValue === '' ? 'empty' : 'sanitized fallback value',
      filename,
      screenshotSha256: sha256(await fs.readFile(screenshotPath)),
      consoleErrors,
      pageErrors,
    })
    await context.close()
  }
}

await browser.close()
await fs.writeFile(path.join(outputDir, 'settings-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
const failures = manifest.filter(item => item.finalPath !== '/settings' || item.consoleErrors.length || item.pageErrors.length)
console.log(`Captured ${manifest.length} sanitized Settings cases; failures: ${failures.length}`)
if (failures.length) process.exitCode = 1
