import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const moduleSpecifier = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright'
const { chromium } = await import(moduleSpecifier)

const here = path.dirname(fileURLToPath(import.meta.url))
const tokenPath = path.resolve(here, '../../docs/audit/phase1-preview/token-contract.json')
const tokenBytes = await fs.readFile(tokenPath)
const tokenContractHash = crypto.createHash('sha256').update(tokenBytes).digest('hex')
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const mime = file => file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream'

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname
    const relative = pathname === '/' ? 'foundation-preview.html' : pathname.slice(1)
    const file = path.resolve(here, relative)
    if (!file.startsWith(`${here}${path.sep}`) && file !== path.join(here, 'foundation-preview.html')) throw new Error('outside preview root')
    const bytes = await fs.readFile(file)
    response.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' })
    response.end(bytes)
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' })
    response.end('Not found')
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const baseURL = `http://127.0.0.1:${port}`

const viewports = [
  { name:'desktop-1440x900', width:1440, height:900 },
  { name:'tablet-768x1024', width:768, height:1024 },
  { name:'mobile-390x844', width:390, height:844 }
]
const boards = [
  { id:'tokens-type', filename:'tokens-type' },
  { id:'component-states', filename:'component-states' },
  { id:'icons-chart-overlays', filename:'icons-chart-overlays' }
]
const chromeExecutable = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath:chromeExecutable, headless:true, args:['--disable-dev-shm-usage','--no-sandbox'] })
const captures = []

for (const board of boards) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport:{ width:viewport.width, height:viewport.height }, reducedMotion:'reduce', colorScheme:'dark' })
    const page = await context.newPage()
    const consoleErrors = []
    const pageErrors = []
    const fontRequests = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('pageerror', error => pageErrors.push(String(error)))
    page.on('request', request => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) fontRequests.push(request.url().replace(/([?&]key=)[^&]+/g, '$1[redacted]'))
    })
    await page.goto(`${baseURL}/foundation-preview.html?board=${board.id}`, { waitUntil:'networkidle', timeout:30000 })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await page.waitForTimeout(500)
    const findings = await page.evaluate(boardId => {
      const active = document.querySelector('.board.active')
      const buttons = [...active.querySelectorAll('button')]
      const unnamedButtons = buttons.filter(button => !(button.getAttribute('aria-label') || button.textContent.trim())).length
      const undersizedTargets = buttons.filter(button => {
        const r = button.getBoundingClientRect()
        return !button.disabled && (r.width < 44 || r.height < 44)
      }).length
      const studentText = active.querySelector('.student-safe')?.textContent || ''
      const banned = ['Incorrect','Critical','At Risk'].filter(term => studentText.includes(term))
      return {
        board: window.__SOM_FOUNDATION_PREVIEW__,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        unnamedButtons,
        undersizedTargets,
        studentBannedLanguage: banned,
        dmSansLoaded: document.fonts.check('400 15px "DM Sans"'),
        outfitLoaded: document.fonts.check('600 20px "Outfit"'),
        computedBodyFamily: getComputedStyle(document.documentElement).fontFamily,
        computedHeadingFamily: getComputedStyle(active.querySelector('h2')).fontFamily,
        iconOnlyNamed: [...active.querySelectorAll('.icon-button')].every(button => Boolean(button.getAttribute('aria-label'))),
        statusTextPresent: [...active.querySelectorAll('.pill')].every(pill => pill.textContent.trim().length > 0),
        chartNonColorCues: boardId !== 'icons-chart-overlays' || Boolean(active.querySelector('.legend-dash') && active.querySelector('.legend-gap')),
        reducedMotionActive: matchMedia('(prefers-reduced-motion: reduce)').matches
      }
    }, board.id)
    const filename = `${board.filename}__${viewport.name}.png`
    const screenshotPath = path.join(here, filename)
    await page.screenshot({ path:screenshotPath, fullPage:false, animations:'disabled' })
    const bytes = await fs.readFile(screenshotPath)
    captures.push({
      board:board.id,
      viewport:`${viewport.width}x${viewport.height}`,
      filename,
      sha256:sha256(bytes),
      controllingStrategyVersion:'SOM_FRONTEND_REDESIGN_STRATEGY_v1.1.1',
      tokenContractSha256:tokenContractHash,
      fontFamiliesRequested:['DM Sans','Outfit'],
      fontFamiliesActuallyRendered: findings.dmSansLoaded && findings.outfitLoaded ? ['DM Sans','Outfit'] : [findings.dmSansLoaded ? 'DM Sans' : null, findings.outfitLoaded ? 'Outfit' : null].filter(Boolean),
      syneRequested:fontRequests.some(url => /Syne/i.test(url)),
      fontRequestCount:fontRequests.length,
      consoleErrors,
      pageErrors,
      accessibilityFindings:findings,
      statement:'Standalone DOM/CSS preview; not implemented product behavior and not an application route.'
    })
    await context.close()
  }
}

await browser.close()
server.close()
const manifest = {
  generatedAt:new Date().toISOString(),
  sourceCommit:'7d3794c3a9ebc8266b72ed9d1163a8ec96d645ee',
  strategyVersion:'SOM_FRONTEND_REDESIGN_STRATEGY_v1.1.1',
  tokenContractSha256:tokenContractHash,
  standalonePreview:true,
  implementedProductBehavior:false,
  captureCount:captures.length,
  captures
}
await fs.writeFile(path.join(here, 'preview-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const failures = captures.filter(item => item.consoleErrors.length || item.pageErrors.length || item.syneRequested || item.fontFamiliesActuallyRendered.length !== 2 || item.accessibilityFindings.horizontalOverflowPx || item.accessibilityFindings.unnamedButtons || item.accessibilityFindings.undersizedTargets || item.accessibilityFindings.studentBannedLanguage.length || !item.accessibilityFindings.iconOnlyNamed || !item.accessibilityFindings.statusTextPresent || !item.accessibilityFindings.chartNonColorCues)
console.log(JSON.stringify({ captures:captures.length, failures:failures.length, tokenContractSha256:tokenContractHash }, null, 2))
if (failures.length) process.exitCode = 1
