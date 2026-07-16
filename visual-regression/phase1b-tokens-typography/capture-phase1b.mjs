import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright'
const { chromium } = await import(playwrightSpecifier)

const here = path.dirname(fileURLToPath(import.meta.url))
const baseURL = process.env.PHASE1B_BASE_URL || 'http://127.0.0.1:4174'
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const canonicalFontNeedle = 'family=DM+Sans:wght@400;500;700&family=Outfit:wght@500;600;700&display=swap'
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const surfaces = [
  { name: 'login-public', path: '/login', role: null },
  { name: 'student-shell', path: '/student', role: 'student' },
  { name: 'practice-log', path: '/practice-log', role: 'student' },
]
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]
const fixture = {
  id: 'phase1b-student',
  name: 'Phase One Student',
  email: 'phase1b-student@example.invalid',
  role: 'student',
  status: 'active',
  instrument: 'Piano',
}

await fs.mkdir(here, { recursive: true })
const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })
const captures = []

for (const surface of surfaces) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce', colorScheme: 'dark' })
    if (surface.role) {
      await context.addInitScript(({ user }) => {
        localStorage.setItem('som_user', JSON.stringify(user))
        localStorage.setItem('som_token', 'phase1b-sanitized-token')
      }, { user: fixture })
    }

    await context.route('**/*', async intercepted => {
      const requestURL = new URL(intercepted.request().url())
      if (requestURL.origin === new URL(baseURL).origin) return intercepted.continue()
      if (requestURL.hostname.includes('railway.app')) {
        if (requestURL.pathname.endsWith('/auth/verify')) return intercepted.fulfill(json({ valid: true, user: fixture }))
        if (/students|practice-logs|sessions|assignments/.test(requestURL.pathname)) return intercepted.fulfill(json([]))
        return intercepted.fulfill(json({}))
      }
      if (requestURL.hostname.includes('motesart-converter.netlify.app')) return intercepted.fulfill(json({ records: [], state: null }))
      return intercepted.continue()
    })

    const page = await context.newPage()
    const consoleErrors = []
    const pageErrors = []
    const fontStylesheetRequests = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('pageerror', error => pageErrors.push(String(error)))
    page.on('request', request => {
      if (request.url().includes('fonts.googleapis.com/css2')) fontStylesheetRequests.push(request.url())
    })

    const requestedURL = `${baseURL}${surface.path}`
    await page.goto(requestedURL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.evaluate(() => Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 8000)),
    ]))
    await page.evaluate(() => Promise.race([
      Promise.allSettled([
        document.fonts.load('400 15px "DM Sans"'),
        document.fonts.load('500 20px "Outfit"'),
        document.fonts.load('600 20px "Outfit"'),
        document.fonts.load('700 20px "Outfit"'),
      ]),
      new Promise(resolve => setTimeout(resolve, 8000)),
    ]))
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await page.waitForTimeout(900)

    const computed = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const body = getComputedStyle(document.body)
      const heading = document.querySelector('h1,h2,h3,h4,h5,h6')
      const headingStyle = heading ? getComputedStyle(heading) : null
      const clipped = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,button,input,select,textarea')].filter(element => {
        const style = getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
      }).map(element => ({ tag: element.tagName, text: (element.value || element.textContent || '').trim().slice(0, 80) }))
      return {
        bodyFont: body.fontFamily,
        headingFont: headingStyle?.fontFamily || null,
        headingText: heading?.textContent?.trim().slice(0, 100) || null,
        variables: {
          surfaceBase: root.getPropertyValue('--som-surface-base').trim(),
          surfaceRaised: root.getPropertyValue('--som-surface-raised').trim(),
          textPrimary: root.getPropertyValue('--som-text-primary').trim(),
          textMuted: root.getPropertyValue('--som-text-muted').trim(),
          accentPrimary: root.getPropertyValue('--som-accent-primary').trim(),
          ambassadorGold: root.getPropertyValue('--som-role-ambassador-gold').trim(),
        },
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        clippedControlsAndHeadings: clipped,
        dmSansLoaded: document.fonts.check('400 15px "DM Sans"'),
        outfitLoaded: document.fonts.check('600 20px "Outfit"'),
        outfitRequiredByRenderedHeading: Boolean(headingStyle?.fontFamily?.includes('Outfit')),
      }
    })

    const filename = `${surface.name}__${viewport.name}.png`
    const screenshotPath = path.join(here, filename)
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' })
    const screenshotBytes = await fs.readFile(screenshotPath)
    const canonicalRequests = fontStylesheetRequests.filter(url => url.includes(canonicalFontNeedle))
    const legacyRequests = fontStylesheetRequests.filter(url => !url.includes(canonicalFontNeedle))
    captures.push({
      surface: surface.name,
      route: surface.path,
      authFixture: surface.role || 'public',
      viewport: `${viewport.width}x${viewport.height}`,
      requestedURL,
      finalURL: page.url(),
      filename,
      screenshotSha256: sha256(screenshotBytes),
      computed,
      canonicalFontRequestCount: canonicalRequests.length,
      canonicalFontRequests: [...new Set(canonicalRequests)],
      additionalLegacyFontRequests: [...new Set(legacyRequests)],
      syneRequestCount: fontStylesheetRequests.filter(url => /Syne/i.test(url)).length,
      consoleErrors,
      pageErrors,
    })
    await context.close()
  }
}

await browser.close()

const manifest = {
  sourceBase: '2c04f8b559954b8dcd5201d7b5dfdfe23650078c',
  captureCount: captures.length,
  sanitizedFixtures: true,
  captures,
}
await fs.writeFile(path.join(here, 'implementation-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const failures = captures.filter(item =>
  item.consoleErrors.length || item.pageErrors.length || item.canonicalFontRequestCount !== 1 ||
  item.syneRequestCount || !item.computed.dmSansLoaded ||
  (item.computed.outfitRequiredByRenderedHeading && !item.computed.outfitLoaded) ||
  item.computed.horizontalOverflowPx || Object.values(item.computed.variables).some(value => !value)
)
console.log(JSON.stringify({ captures: captures.length, failures: failures.length, consoleErrors: captures.flatMap(item => item.consoleErrors).length, pageErrors: captures.flatMap(item => item.pageErrors).length }, null, 2))
if (failures.length) process.exitCode = 1
