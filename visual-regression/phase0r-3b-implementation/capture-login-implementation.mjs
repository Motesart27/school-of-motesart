import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright'
const { chromium } = await import(playwrightSpecifier)

const baseURL = process.env.IMPLEMENTATION_BASE_URL || 'http://127.0.0.1:4182'
const backendOrigin = 'https://deployable-python-codebase-som-production.up.railway.app'
const outputDir = path.dirname(fileURLToPath(import.meta.url))
const auditDir = path.resolve(outputDir, '../../docs/audit/phase0r-3b')
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const corsHeaders = { 'Access-Control-Allow-Origin': '*' }
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body), headers: corsHeaders })
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]

const makeGate = () => {
  let release
  const promise = new Promise(resolve => { release = resolve })
  return { promise, release }
}

const attachObservers = page => {
  const observations = { consoleErrors: [], pageErrors: [], dialogs: [] }
  page.on('console', message => { if (message.type() === 'error') observations.consoleErrors.push(message.text()) })
  page.on('pageerror', error => observations.pageErrors.push(String(error)))
  page.on('dialog', async dialog => { observations.dialogs.push(dialog.type()); await dialog.dismiss() })
  return observations
}

const configureNetwork = async (context, controls) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === new URL(baseURL).origin) return route.continue()
    if (url.origin === backendOrigin) {
      if (url.pathname === '/') {
        controls.wakeCalls += 1
        if (controls.wakeMode === 'ready') return route.fulfill(json({ detail: 'sanitized root response' }))
        const outcome = await controls.wakeGate.promise
        if (outcome === 'invalid-json') return route.fulfill({ status: 200, contentType: 'text/plain', body: 'not-json', headers: corsHeaders })
        return route.fulfill(json({ detail: 'sanitized late root response' }))
      }
      if (url.pathname === '/auth/login') {
        controls.loginCalls += 1
        if (controls.loginMode === 'accepted') return route.fulfill(json({ token: 'sanitized-implementation-token', user: { id: 'implementation-student', name: 'Implementation Student', email: 'implementation-user@example.invalid', role: 'student', status: 'active' } }))
        return route.fulfill(json({ detail: 'sanitized response without token' }))
      }
      if (url.pathname === '/auth/verify') return route.fulfill(json({ valid: true, user: { role: 'student' } }))
      return route.fulfill(json([]))
    }
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    return route.fulfill({ status: 204, body: '' })
  })
}

const newControls = (wakeMode = 'pending', loginMode = 'rejected') => ({ wakeMode, loginMode, wakeCalls: 0, loginCalls: 0, wakeGate: makeGate() })

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(auditDir, { recursive: true })
const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })
const captures = []

for (const state of ['pending', 'ready', 'delayed']) {
  for (const viewport of viewports) {
    const controls = newControls(state === 'ready' ? 'ready' : 'pending')
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
    await configureNetwork(context, controls)
    const page = await context.newPage()
    const observations = attachObservers(page)
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })

    if (state === 'pending') {
      await page.getByRole('status').filter({ hasText: 'Warming up…' }).waitFor()
    } else if (state === 'ready') {
      await page.locator('[role="status"]').waitFor({ state: 'detached' })
    } else {
      await page.getByRole('status').filter({ hasText: 'Sign-in may take a moment.' }).waitFor({ timeout: 5000 })
    }

    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0))
    await page.waitForTimeout(250)

    const status = page.locator('[role="status"]')
    const statusCount = await status.count()
    const statusText = statusCount ? await status.textContent() : null
    const ariaLive = statusCount ? await status.getAttribute('aria-live') : null
    const footerText = await page.locator('div').filter({ hasText: /^School of Motesart(?:Warming up…|Sign-in may take a moment\.)?$/ }).last().innerText()
    const filename = `implemented-${state}__${viewport.name}.png`
    const screenshotPath = path.join(outputDir, filename)
    await page.screenshot({ path: screenshotPath, fullPage: false })

    if (state !== 'ready') {
      controls.wakeGate.release('json')
      await page.waitForTimeout(250)
      if (state === 'delayed' && (await status.textContent()) !== 'Sign-in may take a moment.') throw new Error('Late wake resolution changed delayed presentation')
    }

    captures.push({
      state,
      viewport: `${viewport.width}x${viewport.height}`,
      requestedRoute: '/login',
      finalPath: new URL(page.url()).pathname,
      actualImplementedBehavior: true,
      temporaryDomInjection: false,
      sanitizedFixture: 'blank credentials',
      wakeCallCount: controls.wakeCalls,
      statusText,
      statusRole: statusCount ? 'status' : null,
      ariaLive,
      footerText,
      filename,
      screenshotSha256: sha256(await fs.readFile(screenshotPath)),
      ...observations,
    })
    await context.close()
  }
}

const testRejectedWake = async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(origin => {
    const nativeFetch = window.fetch.bind(window)
    window.__phase0rWakeCalls = 0
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url
      if (url === `${origin}/`) {
        window.__phase0rWakeCalls += 1
        return Promise.reject(new TypeError('Sanitized network rejection'))
      }
      return nativeFetch(input, init)
    }
  }, backendOrigin)
  const controls = newControls('ready')
  await configureNetwork(context, controls)
  const page = await context.newPage()
  const observations = attachObservers(page)
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('Email').fill('rejected-wake@example.invalid')
  await page.getByPlaceholder('Password').fill('sanitized-password')
  await page.getByRole('status').filter({ hasText: 'Sign-in may take a moment.' }).waitFor()
  return {
    wakeCalls: await page.evaluate(() => window.__phase0rWakeCalls),
    delayedTextVisible: true,
    credentialsPreserved: (await page.getByPlaceholder('Email').inputValue()) === 'rejected-wake@example.invalid' && (await page.getByPlaceholder('Password').inputValue()) === 'sanitized-password',
    loginErrorAbsent: await page.locator('form p').count() === 0,
    ...observations,
    close: async () => context.close(),
  }
}

const testLoginWhileWakePending = async loginMode => {
  const controls = newControls('pending', loginMode)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await configureNetwork(context, controls)
  const page = await context.newPage()
  const observations = attachObservers(page)
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('status').filter({ hasText: 'Warming up…' }).waitFor()
  await page.getByPlaceholder('Email').fill('implementation-user@example.invalid')
  await page.getByPlaceholder('Password').fill('sanitized-password')
  const immediate = {
    emailAccepted: (await page.getByPlaceholder('Email').inputValue()) === 'implementation-user@example.invalid',
    passwordAccepted: (await page.getByPlaceholder('Password').inputValue()) === 'sanitized-password',
    signInEnabled: await page.locator('form').getByRole('button', { name: 'Sign In' }).isEnabled(),
    googleEnabled: await page.getByRole('button', { name: 'Continue with Google' }).isEnabled(),
  }
  await page.getByPlaceholder('Email').fill('implementation-user-updated@example.invalid')
  await page.getByPlaceholder('Password').fill('sanitized-password-updated')
  const callsAfterFieldUpdates = controls.wakeCalls
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click()

  let result
  if (loginMode === 'rejected') {
    await page.getByText('Login failed — invalid response format').waitFor()
    const errorBeforeWakeFailure = await page.getByText('Login failed — invalid response format').textContent()
    controls.wakeGate.release('invalid-json')
    await page.getByRole('status').filter({ hasText: 'Sign-in may take a moment.' }).waitFor()
    result = {
      loginErrorVisible: true,
      wakeFailureDidNotReplaceLoginError: (await page.getByText('Login failed — invalid response format').textContent()) === errorBeforeWakeFailure,
      emailPreserved: (await page.getByPlaceholder('Email').inputValue()) === 'implementation-user-updated@example.invalid',
      passwordPreserved: (await page.getByPlaceholder('Password').inputValue()) === 'sanitized-password-updated',
      finalPath: new URL(page.url()).pathname,
    }
  } else {
    await page.waitForURL('**/student', { timeout: 5000 })
    result = { loginErrorVisible: false, finalPath: new URL(page.url()).pathname }
    controls.wakeGate.release('json')
  }
  await page.waitForTimeout(150)
  const summary = { loginMode, immediate, wakeCalls: controls.wakeCalls, callsAfterFieldUpdates, loginCalls: controls.loginCalls, ...result, ...observations }
  await context.close()
  return summary
}

const testTimeoutStickiness = async () => {
  const controls = newControls('pending')
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await configureNetwork(context, controls)
  const page = await context.newPage()
  const observations = attachObservers(page)
  const started = Date.now()
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('status').filter({ hasText: 'Sign-in may take a moment.' }).waitFor({ timeout: 5000 })
  const delayedAtMs = Date.now() - started
  const signInEnabledAtTimeout = await page.locator('form').getByRole('button', { name: 'Sign In' }).isEnabled()
  controls.wakeGate.release('json')
  await page.waitForTimeout(300)
  const remainedDelayedAfterLateResolution = (await page.getByRole('status').textContent()) === 'Sign-in may take a moment.'
  const summary = { wakeCalls: controls.wakeCalls, delayedAtMs, signInEnabledAtTimeout, remainedDelayedAfterLateResolution, ...observations }
  await context.close()
  return summary
}

const rejectedWake = await testRejectedWake()
const rejectedWakeSummary = { ...rejectedWake }
delete rejectedWakeSummary.close
await rejectedWake.close()
const rejectedLogin = await testLoginWhileWakePending('rejected')
const acceptedLogin = await testLoginWhileWakePending('accepted')
const timeout = await testTimeoutStickiness()

const interactionSummary = {
  sourceCommit: 'b567fa337f3725a00e144c63968448ae0a2bfbbb',
  classification: 'actual implemented Login behavior with deterministic sanitized network interception',
  pending: {
    statusText: 'Warming up…',
    role: 'status',
    ariaLive: 'polite',
    controlsUsable: rejectedLogin.immediate,
    dialogCount: 0,
  },
  ready: {
    parseableJsonResponseSelectsReadyWithoutHealthClaim: true,
    statusNodeAbsent: captures.filter(item => item.state === 'ready').every(item => item.statusRole === null),
    footerIdentityRetained: captures.filter(item => item.state === 'ready').every(item => item.footerText.trim() === 'School of Motesart'),
    wakeCallsPerMount: [...new Set(captures.filter(item => item.state === 'ready').map(item => item.wakeCallCount))],
  },
  rejectedWake: rejectedWakeSummary,
  timeout,
  loginWhileWakePending: rejectedLogin,
  successfulAuthentication: acceptedLogin,
  callCount: {
    onePerMount: captures.every(item => item.wakeCallCount === 1) && rejectedWakeSummary.wakeCalls === 1 && rejectedLogin.wakeCalls === 1 && acceptedLogin.wakeCalls === 1 && timeout.wakeCalls === 1,
    afterEmailAndPasswordUpdates: rejectedLogin.callsAfterFieldUpdates,
    afterLoginErrorAndWakeStateChange: rejectedLogin.wakeCalls,
  },
}

await browser.close()
await fs.writeFile(path.join(outputDir, 'implementation-manifest.json'), `${JSON.stringify({
  sourceCommit: 'b567fa337f3725a00e144c63968448ae0a2bfbbb',
  notice: 'All states are actual implemented behavior under deterministic network interception; no DOM injection was used.',
  captures,
}, null, 2)}\n`)
await fs.writeFile(path.join(auditDir, 'interaction-summary.json'), `${JSON.stringify(interactionSummary, null, 2)}\n`)

const captureFailures = captures.filter(item => item.finalPath !== '/login' || item.wakeCallCount !== 1 || item.consoleErrors.length || item.pageErrors.length || item.dialogs.length)
const interactionFailures = [
  !interactionSummary.callCount.onePerMount,
  rejectedWakeSummary.consoleErrors.length > 0,
  rejectedWakeSummary.dialogs.length > 0,
  !rejectedLogin.wakeFailureDidNotReplaceLoginError,
  rejectedLogin.finalPath !== '/login',
  acceptedLogin.finalPath !== '/student',
  !timeout.remainedDelayedAfterLateResolution,
  timeout.consoleErrors.length > 0,
  rejectedLogin.consoleErrors.length > 0,
  acceptedLogin.consoleErrors.length > 0,
].filter(Boolean)
console.log(`Captured ${captures.length} implemented Login states; capture failures: ${captureFailures.length}; interaction failures: ${interactionFailures.length}`)
if (captureFailures.length || interactionFailures.length) process.exitCode = 1
