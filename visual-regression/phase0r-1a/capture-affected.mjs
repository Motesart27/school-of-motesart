import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const baseURL = process.env.BASELINE_BASE_URL || 'http://127.0.0.1:4174'
const label = process.env.EVIDENCE_LABEL
const outputDir = process.env.EVIDENCE_OUTPUT_DIR
if (!label || !outputDir) throw new Error('EVIDENCE_LABEL and EVIDENCE_OUTPUT_DIR are required')

const viewports = [[1440, 900], [768, 1024], [390, 844]]
const routes = [
  { name: 'move-it', path: '/move-it' },
  { name: 'practice-log-modal', path: '/practice-log', openModal: true },
]
const user = { id: 'phase0-student', name: 'Phase Zero Student', email: 'phase0-student@example.invalid', role: 'student', status: 'active', instrument: 'Piano' }
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] })
const manifest = []

for (const route of routes) for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
  await context.addInitScript(({ user }) => {
    localStorage.setItem('som_user', JSON.stringify(user))
    localStorage.setItem('som_token', 'phase0-audit-token')
  }, { user })
  await context.route('**/*', async intercepted => {
    const url = new URL(intercepted.request().url())
    if (url.origin === new URL(baseURL).origin) return intercepted.continue()
    if (url.hostname.includes('railway.app')) {
      if (url.pathname.endsWith('/auth/verify')) return intercepted.fulfill(json({ valid: true, user }))
      return intercepted.fulfill(json([]))
    }
    if (url.hostname === 'fonts.googleapis.com') return intercepted.fulfill({ status: 200, contentType: 'text/css', body: '' })
    if (url.hostname === 'cdn.jsdelivr.net') return intercepted.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart = class { destroy() {} };' })
    return intercepted.abort()
  })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => pageErrors.push(String(error)))
  const requestedURL = `${baseURL}${route.path}`
  await page.goto(requestedURL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  if (route.openModal) {
    await page.getByRole('button', { name: '+ Log a Session' }).click()
    await page.waitForTimeout(200)
  }
  const filename = `${route.name}__${label}__${width}x${height}.png`
  const target = path.join(outputDir, filename)
  await page.screenshot({ path: target, fullPage: false })
  const bytes = await fs.readFile(target)
  manifest.push({ label, route: route.path, viewport: `${width}x${height}`, requestedURL, finalURL: page.url(), filename, screenshotSha256: sha256(bytes), consoleErrors, pageErrors })
  await context.close()
}
await browser.close()
await fs.writeFile(path.join(outputDir, `${label}-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Captured ${manifest.length} affected-route ${label} images`)
