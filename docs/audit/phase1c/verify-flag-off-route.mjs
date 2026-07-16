import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const baseURL = process.env.PHASE1C_FLAG_OFF_URL || 'http://127.0.0.1:4177'
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort())
await page.goto(`${baseURL}/dev/kit`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(300)
const finalPath = new URL(page.url()).pathname
await browser.close()
const files = fs.readdirSync(path.resolve('dist/assets'))
const assetText = files.filter(file => /\.(js|css)$/.test(file)).map(file => fs.readFileSync(path.join('dist/assets', file), 'utf8')).join('\n')
const result = { finalPath, devKitAssetNames: files.filter(file => /DevKit/i.test(file)), identifyingCopyMatches: (assetText.match(/Phase 1C Component Foundations/g) || []).length, pass: finalPath === '/' && !files.some(file => /DevKit/i.test(file)) && !assetText.includes('Phase 1C Component Foundations') }
console.log(JSON.stringify(result, null, 2))
if (!result.pass) process.exitCode = 1
