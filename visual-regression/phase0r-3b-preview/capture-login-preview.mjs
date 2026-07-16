import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright'
const { chromium } = await import(playwrightSpecifier)

const baseURL = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4181'
const backendOrigin = 'https://deployable-python-codebase-som-production.up.railway.app'
const outputDir = path.dirname(fileURLToPath(import.meta.url))
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': '*' } })
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]
const states = [
  { name: 'current', text: null, injected: false },
  { name: 'proposed-pending', text: 'Warming up…', injected: true },
  { name: 'proposed-success', text: null, injected: true },
  { name: 'proposed-delayed', text: 'Sign-in may take a moment.', injected: true },
]

const injectPreviewState = async (page, text) => page.evaluate(statusText => {
  const wakeButton = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Wake up servers')
  if (!wakeButton) throw new Error('Current wake control was not found')
  const footer = wakeButton.parentElement
  wakeButton.remove()
  if (statusText) {
    const status = document.createElement('span')
    status.setAttribute('role', 'status')
    status.setAttribute('aria-live', 'polite')
    status.dataset.phase0rPreview = 'temporary-dom-injection'
    status.textContent = statusText
    status.style.color = 'rgba(255,255,255,0.42)'
    status.style.fontSize = '12px'
    status.style.marginLeft = '16px'
    status.style.textAlign = 'right'
    footer.append(status)
  }
}, text)

const configureNetwork = async (context, options = {}) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === new URL(baseURL).origin) return route.continue()
    if (url.origin === backendOrigin) {
      if (options.backendHandler) return options.backendHandler(route, url)
      return route.fulfill(json({ preview: true }))
    }
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    return route.fulfill({ status: 204, body: '' })
  })
}

await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })
const manifest = []

for (const state of states) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
    await configureNetwork(context)
    const page = await context.newPage()
    const consoleErrors = []
    const pageErrors = []
    const dialogs = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('pageerror', error => pageErrors.push(String(error)))
    page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss() })
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(500)
    if (state.injected) await injectPreviewState(page, state.text)
    const wakeButtonCount = await page.getByRole('button', { name: 'Wake up servers' }).count()
    const statusText = await page.locator('[role="status"][aria-live="polite"]').allTextContents()
    if ((!state.injected && wakeButtonCount !== 1) || (state.injected && wakeButtonCount !== 0)) throw new Error(`${state.name}: wake-control assertion failed`)
    if (state.text && !statusText.includes(state.text)) throw new Error(`${state.name}: status assertion failed`)
    if (!state.text && state.injected && statusText.length) throw new Error(`${state.name}: success footer should contain no status text`)
    const filename = `${state.name}__${viewport.name}.png`
    const screenshotPath = path.join(outputDir, filename)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    manifest.push({
      state: state.name,
      viewport: `${viewport.width}x${viewport.height}`,
      requestedRoute: '/login',
      finalPath: new URL(page.url()).pathname,
      sanitizedFixture: 'blank credentials',
      temporaryDomInjection: state.injected,
      implementedProductBehavior: false,
      wakeButtonVisible: wakeButtonCount === 1,
      statusRole: state.text ? 'status' : null,
      ariaLive: state.text ? 'polite' : null,
      statusClassification: state.name,
      filename,
      screenshotSha256: sha256(await fs.readFile(screenshotPath)),
      consoleErrors,
      pageErrors,
      dialogs,
    })
    await context.close()
  }
}

const currentAlertChecks = []
for (const outcome of ['json-response', 'network-failure']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await configureNetwork(context, {
    backendHandler: async (route, url) => {
      if (url.pathname === '/' && outcome === 'network-failure') return route.abort('failed')
      return route.fulfill(json({ preview: true }))
    },
  })
  const page = await context.newPage()
  const dialogs = []
  page.on('dialog', async dialog => { dialogs.push({ type: dialog.type(), messageClassification: dialog.message().includes('awake') ? 'wake-success' : 'wake-failure' }); await dialog.dismiss() })
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Wake up servers' }).click()
  await page.waitForTimeout(200)
  currentAlertChecks.push({ outcome, dialogCount: dialogs.length, dialogs })
  await context.close()
}

const runFeasibility = async loginOutcome => {
  let wakeCalls = 0
  let loginCalls = 0
  let releaseWake
  const wakeGate = new Promise(resolve => { releaseWake = resolve })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await configureNetwork(context, {
    backendHandler: async (route, url) => {
      if (url.pathname === '/') {
        wakeCalls += 1
        await wakeGate
        return route.fulfill(json({ preview: true }))
      }
      if (url.pathname === '/auth/login') {
        loginCalls += 1
        if (loginOutcome === 'rejected') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: 'Sanitized login rejection' }), headers: { 'Access-Control-Allow-Origin': '*' } })
        return route.fulfill(json({ token: 'sanitized-preview-token', user: { id: 'preview-student', name: 'Preview Student', email: 'preview-user@example.invalid', role: 'student', status: 'active' } }))
      }
      if (url.pathname === '/auth/verify') return route.fulfill(json({ valid: true, user: { role: 'student' } }))
      return route.fulfill(json([]))
    },
  })
  const page = await context.newPage()
  const dialogs = []
  page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss() })
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await injectPreviewState(page, 'Warming up…')
  await page.evaluate(url => {
    window.__phase0rPreviewWakePromise = fetch(`${url}/`).then(response => response.json()).catch(() => null)
  }, backendOrigin)
  await page.getByPlaceholder('Email').fill('preview-user@example.invalid')
  await page.getByPlaceholder('Password').fill('preview-only-password')
  const immediateState = {
    email: await page.getByPlaceholder('Email').inputValue(),
    passwordPopulated: (await page.getByPlaceholder('Password').inputValue()).length > 0,
    signInEnabled: await page.locator('form').getByRole('button', { name: 'Sign In' }).isEnabled(),
    googleEnabled: await page.getByRole('button', { name: 'Continue with Google' }).isEnabled(),
  }
  await page.getByPlaceholder('Email').fill('preview-user-updated@example.invalid')
  await page.getByPlaceholder('Password').fill('preview-only-password-updated')
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click()
  let finalPath
  let loginErrorVisible = false
  if (loginOutcome === 'rejected') {
    await page.getByText('Sanitized login rejection').waitFor()
    loginErrorVisible = true
    finalPath = new URL(page.url()).pathname
  } else {
    await page.waitForURL('**/student', { timeout: 5000 })
    finalPath = new URL(page.url()).pathname
  }
  const wakeCallsBeforeRelease = wakeCalls
  const credentialState = loginOutcome === 'rejected' ? {
    emailPreserved: (await page.getByPlaceholder('Email').inputValue()) === 'preview-user-updated@example.invalid',
    passwordPreserved: (await page.getByPlaceholder('Password').inputValue()) === 'preview-only-password-updated',
  } : { emailPreserved: 'not-applicable-after-redirect', passwordPreserved: 'not-applicable-after-redirect' }
  releaseWake()
  await page.waitForTimeout(100)
  const result = { loginOutcome, immediateState, wakeCallsBeforeRelease, wakeCallsAfterFieldUpdates: wakeCallsBeforeRelease, loginCalls, loginErrorVisible, credentialState, finalPath, dialogCount: dialogs.length }
  await context.close()
  return result
}

const interactionSummary = {
  classification: 'temporary DOM/network feasibility simulation; not implemented product behavior',
  currentAlertChecks,
  proposedRejectedLogin: await runFeasibility('rejected'),
  proposedSuccessfulLogin: await runFeasibility('accepted'),
}

await browser.close()
await fs.writeFile(path.join(outputDir, 'preview-manifest.json'), `${JSON.stringify({
  sourceCommit: '91326c10a0a51bfa1f87acdff7523bab84a4473d',
  notice: 'Proposed states were produced through temporary browser DOM injection and are not implemented product behavior.',
  captures: manifest,
}, null, 2)}\n`)
await fs.writeFile(path.join(outputDir, 'interaction-summary.json'), `${JSON.stringify(interactionSummary, null, 2)}\n`)

const captureFailures = manifest.filter(item => item.finalPath !== '/login' || item.consoleErrors.length || item.pageErrors.length || item.dialogs.length)
const feasibilityFailures = [interactionSummary.proposedRejectedLogin, interactionSummary.proposedSuccessfulLogin].filter(item => item.wakeCallsBeforeRelease !== 1 || item.loginCalls !== 1 || item.dialogCount !== 0)
console.log(`Captured ${manifest.length} Login previews; capture failures: ${captureFailures.length}; feasibility failures: ${feasibilityFailures.length}`)
if (captureFailures.length || feasibilityFailures.length) process.exitCode = 1
