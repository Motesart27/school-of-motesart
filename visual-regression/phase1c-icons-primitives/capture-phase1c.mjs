import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
const { chromium } = await import(playwrightSpecifier)
const here = path.dirname(fileURLToPath(import.meta.url))
const baseURL = process.env.PHASE1C_BASE_URL || 'http://127.0.0.1:4175'
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const fixtureFor = role => ({ id: `phase1c-${role}`, name: `Sample ${role}`, email: `phase1c-${role}@example.invalid`, role, status: 'active', instrument: 'Piano' })
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]
const sections = ['icons-controls', 'states-forms', 'overlays-feedback']

await fs.mkdir(here, { recursive: true })
const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })

async function contextFor(role, viewport = viewports[0]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce', colorScheme: 'dark' })
  if (role) await context.addInitScript(({ user }) => { localStorage.setItem('som_user', JSON.stringify(user)); localStorage.setItem('som_token', 'phase1c-sanitized-token') }, { user: fixtureFor(role) })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === new URL(baseURL).origin) return route.continue()
    if (url.hostname.includes('railway.app')) {
      if (url.pathname.endsWith('/auth/verify')) return route.fulfill(json({ valid: true, user: role ? fixtureFor(role) : null }))
      if (/students|practice-logs|sessions|assignments/.test(url.pathname)) return route.fulfill(json([]))
      return route.fulfill(json({}))
    }
    if (url.hostname.includes('motesart-converter.netlify.app')) return route.fulfill(json({ records: [], state: null }))
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    if (url.hostname === 'cdn.jsdelivr.net') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=class{destroy(){}};' })
    return route.abort()
  })
  return context
}

const captures = []
for (const section of sections) {
  for (const viewport of viewports) {
    const context = await contextFor('admin', viewport)
    const page = await context.newPage()
    const consoleErrors = [], pageErrors = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('pageerror', error => pageErrors.push(String(error)))
    const requestedURL = `${baseURL}/dev/kit?section=${section}`
    await page.goto(requestedURL, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(`#${section}`)
    await page.waitForTimeout(500)
    if (section === 'overlays-feedback') {
      await page.getByRole('button', { name: 'Show polite toast' }).click()
      await page.getByRole('button', { name: 'Open modal' }).click()
    }
    const findings = await page.evaluate(() => ({
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      clippedControls: [...document.querySelectorAll('button,input,select')].filter(node => node.scrollWidth > node.clientWidth + 1).length,
      minimumTargetFailures: [...document.querySelectorAll('button')].filter(node => { const r = node.getBoundingClientRect(); return r.width < 44 || r.height < 44 }).length,
      focusVisibleRulePresent: [...document.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(rule => rule.cssText.includes(':focus-visible')) } catch { return false } }),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      registrySvgCount: document.querySelectorAll('.dev-kit__icon-grid svg').length,
      registrySizes: [...new Set([...document.querySelectorAll('.dev-kit__icon-grid svg')].map(node => node.getAttribute('width')))],
    }))
    const filename = `${section}__${viewport.name}.png`
    const screenshotPath = path.join(here, filename)
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' })
    captures.push({ section, route: `/dev/kit?section=${section}`, finalURL: page.url(), viewport: `${viewport.width}x${viewport.height}`, role: 'admin', featureFlag: true, filename, screenshotSha256: sha256(await fs.readFile(screenshotPath)), consoleErrors, pageErrors, ...findings })
    await context.close()
  }
}

for (const viewport of viewports) {
  const context = await contextFor('student', viewport)
  const page = await context.newPage()
  const consoleErrors = [], pageErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => pageErrors.push(String(error)))
  await page.goto(`${baseURL}/my-coach`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-som-icon="arrow-left"]')
  await page.waitForTimeout(500)
  const button = page.getByRole('button', { name: 'Back' })
  const box = await button.boundingBox()
  const filename = `my-coach-back__${viewport.name}.png`
  const screenshotPath = path.join(here, filename)
  await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' })
  captures.push({ section: 'my-coach-back', route: '/my-coach', finalURL: page.url(), viewport: `${viewport.width}x${viewport.height}`, role: 'student', featureFlag: true, filename, screenshotSha256: sha256(await fs.readFile(screenshotPath)), target: box, consoleErrors, pageErrors })
  await context.close()
}

const accessMatrix = []
for (const role of [null, 'student', 'parent', 'teacher', 'ambassador', 'admin']) {
  const context = await contextFor(role)
  const page = await context.newPage()
  await page.goto(`${baseURL}/dev/kit`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(350)
  accessMatrix.push({ role: role || 'unauthenticated', finalPath: new URL(page.url()).pathname })
  await context.close()
}

const interactionContext = await contextFor('admin')
const page = await interactionContext.newPage()
await page.goto(`${baseURL}/dev/kit?section=icons-controls`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#icons-controls')
const primaryButton = page.getByRole('button', { name: 'Start practice' })
await primaryButton.evaluate(node => { node.dataset.keyboardClicks = '0'; node.addEventListener('click', () => { node.dataset.keyboardClicks = String(Number(node.dataset.keyboardClicks) + 1) }) })
await primaryButton.focus(); await page.keyboard.press('Enter')
const interaction = {
  buttonKeyboardClicks: await primaryButton.getAttribute('data-keyboard-clicks'),
  disabledButtonDisabled: await page.getByRole('button', { name: 'Unavailable' }).isDisabled(),
  loadingAccessibleName: await page.getByRole('button', { name: /Saving plan/ }).getAttribute('aria-busy'),
  iconOnlyAccessibleName: await page.getByRole('button', { name: 'Open settings' }).count(),
}
await page.goto(`${baseURL}/dev/kit?section=states-forms`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#states-forms')
interaction.inputLabel = await page.evaluate(() => { const label = [...document.querySelectorAll('label')].find(node => node.textContent.includes('Practice note')); return Boolean(label && document.getElementById(label.htmlFor)?.tagName === 'INPUT') })
interaction.selectLabel = await page.evaluate(() => { const label = [...document.querySelectorAll('label')].find(node => node.textContent.includes('Instrument')); return Boolean(label && document.getElementById(label.htmlFor)?.tagName === 'SELECT') })
interaction.inputErrorLinkage = await page.getByLabel('Required field').getAttribute('aria-describedby')
const chips = page.getByRole('button', { name: 'This week' })
await chips.click(); interaction.filterPressed = await chips.getAttribute('aria-pressed')
const warmup = page.getByRole('tab', { name: 'Warm-up' }); await warmup.focus(); await page.keyboard.press('End'); interaction.tabsEndFocus = await page.evaluate(() => document.activeElement?.textContent)
await page.keyboard.press('Home'); interaction.tabsHomeFocus = await page.evaluate(() => document.activeElement?.textContent)
await page.goto(`${baseURL}/dev/kit?section=overlays-feedback`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#overlays-feedback')
const tooltipTrigger = page.getByRole('button', { name: 'More context' }); await tooltipTrigger.focus(); interaction.tooltipDescribedBy = await tooltipTrigger.getAttribute('aria-describedby'); await page.keyboard.press('Escape'); interaction.tooltipClosedOnEscape = (await tooltipTrigger.getAttribute('aria-describedby')) === null
const modalInvoker = page.getByRole('button', { name: 'Open modal' }); await modalInvoker.focus(); await modalInvoker.click(); interaction.modalInitialFocus = await page.evaluate(() => document.activeElement?.textContent?.trim()); interaction.modalScrollLocked = await page.evaluate(() => document.body.style.overflow === 'hidden'); await page.getByRole('button', { name: 'Cancel' }).focus(); await page.keyboard.press('Tab'); interaction.modalFocusWrapped = await page.evaluate(() => document.activeElement?.getAttribute('aria-label')); await page.keyboard.press('Escape'); interaction.modalRestored = await page.evaluate(() => document.activeElement?.textContent?.trim())
const drawerInvoker = page.getByRole('button', { name: 'Open drawer' }); await drawerInvoker.focus(); await drawerInvoker.click(); interaction.drawerRole = await page.getByRole('dialog', { name: 'Sample details' }).count(); await page.getByRole('button', { name: 'Done' }).focus(); await page.keyboard.press('Tab'); interaction.drawerFocusWrapped = await page.evaluate(() => document.activeElement?.getAttribute('aria-label')); await page.keyboard.press('Escape'); interaction.drawerRestored = await page.evaluate(() => document.activeElement?.textContent?.trim())
await page.getByRole('button', { name: 'Show polite toast' }).click(); interaction.politeRegion = await page.locator('[role=status]').count(); interaction.dismissButton = await page.getByRole('button', { name: 'Dismiss Plan saved' }).count()
await page.getByRole('button', { name: 'Show urgent toast' }).click(); interaction.assertiveRegion = await page.locator('[role=alert]').count()
await interactionContext.close()

await browser.close()
const manifest = { sourceBase: 'e00a25f7cff1dbc894922eba51d7c33a311caba5', featureFlag: 'VITE_ENABLE_DEV_KIT=true', sanitizedFixtures: true, captureCount: captures.length, captures, accessMatrix, interaction }
await fs.writeFile(path.join(here, 'implementation-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
const failures = captures.filter(item => item.consoleErrors.length || item.pageErrors.length || item.horizontalOverflowPx || item.minimumTargetFailures)
console.log(JSON.stringify({ captures: captures.length, captureFailures: failures.length, accessMatrix, interaction }, null, 2))
if (failures.length) process.exitCode = 1
