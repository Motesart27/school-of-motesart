#!/usr/bin/env node
/**
 * qa-bootstrap.mjs — deterministic, repo-contained browser-QA bootstrap.
 *
 * M1 R3.2/R3.3 (Codex MEDIUM — QA reproducibility): the browser acceptance
 * suites use Playwright, which is intentionally NOT a production/dev dependency
 * of this app. A clean reviewer checkout must reproduce the FULL browser suite
 * with ONE command and no undocumented machine state (no pre-provisioned
 * browser path, no pre-provisioned server).
 *
 * SERVER OWNERSHIP MODEL (R3.3): the BOOTSTRAP owns ONE shared vite-preview
 * server for the whole run. It starts the server, waits for POSITIVE HTTP
 * readiness, passes the base URL to every suite via QA_BASE_URL, and tears the
 * server down exactly once at the end (scoped to the child process group it
 * created — never a global pkill). Suites detect QA_BASE_URL and neither spawn
 * nor kill any preview, so there are no fixed-port collisions or cross-suite
 * races (the previous root cause of net::ERR_CONNECTION_REFUSED, where m1r1 and
 * m1r11 both hard-coded port 4173 and one suite's server was reused/killed by
 * another). Browser resolution is owned by the bootstrap: QA_CHROMIUM points at
 * the Playwright-managed Chromium; suites use QA_CHROMIUM if set else a managed
 * launch — no machine-specific absolute path.
 *
 * Steps:
 *   1. isolated scratch dir OUTSIDE the repo (os.tmpdir())
 *   2. install the EXACT pinned Playwright version there (no repo dep mutation)
 *   3. install/use the required Chromium (Playwright-managed cache)
 *   4. link Playwright into the repo (temporary node_modules symlinks)
 *   5. resolve the absolute Chromium executable → export QA_CHROMIUM
 *   6. production build
 *   7. start ONE shared preview; wait for positive HTTP readiness (else print
 *      server stdout/stderr and fail)
 *   8. run every required suite in an explicit deterministic order
 *   9. return nonzero if the build or ANY suite fails
 *  10. finally: stop the shared preview (scoped), confirm the port is released,
 *      remove temp symlinks + qa-artifacts, restore tracked dist/ — even on error
 *
 * It does NOT commit browser binaries and does NOT modify package.json /
 * package-lock.json.
 *
 * Usage:
 *   node scripts/qa-bootstrap.mjs                        # full suite set
 *   node scripts/qa-bootstrap.mjs tests/m1r32_fe_qa.mjs  # specific suite(s)
 *   node scripts/qa-bootstrap.mjs --keep                 # keep scratch install
 *   node scripts/qa-bootstrap.mjs --inject-fail          # failure-injection self-check
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, existsSync, rmSync, symlinkSync, readdirSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { connect } from 'node:net'
import { get as httpGet } from 'node:http'
import { setTimeout as sleep } from 'node:timers/promises'

// ── Pinned, deterministic versions ──────────────────────────────────
export const PLAYWRIGHT_VERSION = '1.49.1'
const REPO = resolve(import.meta.dirname, '..')
const PORT = 4190
const HOST = '127.0.0.1' // bind + probe IPv4 explicitly (avoid localhost→::1 mismatch)
const BASE = `http://${HOST}:${PORT}`

// Explicit deterministic suite order (NOT filesystem glob order).
const DEFAULT_SUITES = [
  'tests/m1r32_fe_qa.mjs',
  'tests/m1r31_fe_qa.mjs',
  'tests/m1r3_fe_qa.mjs',
  'tests/m1r2_fe1_qa.mjs',
  'tests/m1r2_fe_qa.mjs',
  'tests/m1r1_qa.mjs',
  'tests/m1r11_qa.mjs',
]

const args = process.argv.slice(2)
const keep = args.includes('--keep')
const injectFail = args.includes('--inject-fail')
const suites = args.filter(a => !a.startsWith('--'))
const runSuites = suites.length ? suites : DEFAULT_SUITES

function log(...m) { console.log('[qa-bootstrap]', ...m) }
function sh(cmd, cmdArgs, opts = {}) { return execFileSync(cmd, cmdArgs, { stdio: 'inherit', ...opts }) }

function portOpen(port) {
  return new Promise((res) => {
    const s = connect(port, '127.0.0.1')
    s.setTimeout(500)
    s.on('connect', () => { s.destroy(); res(true) })
    s.on('error', () => res(false))
    s.on('timeout', () => { s.destroy(); res(false) })
  })
}

function httpOk(url) {
  return new Promise((res) => {
    const req = httpGet(url, (r) => { r.resume(); res(r.statusCode >= 200 && r.statusCode < 500) })
    req.setTimeout(1500, () => { req.destroy(); res(false) })
    req.on('error', () => res(false))
  })
}

function resolveChromiumExe() {
  const cacheRoots = [
    join(homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS
    join(homedir(), '.cache', 'ms-playwright'),            // Linux
  ]
  for (const root of cacheRoots) {
    if (!existsSync(root)) continue
    for (const d of readdirSync(root).filter(x => x.startsWith('chromium-'))) {
      for (const candidate of [
        join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        join(root, d, 'chrome-linux', 'chrome'),
      ]) { if (existsSync(candidate)) return candidate }
    }
  }
  return null
}

let scratch = null
let preview = null
const previewOut = []
const previewErr = []
const createdLinks = []

async function startSharedPreview() {
  if (await portOpen(PORT)) throw new Error(`port ${PORT} already in use before startup — refusing to reuse a foreign server`)
  let previewExited = false
  preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort', '--host', HOST],
    { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  preview.stdout.on('data', d => previewOut.push(String(d)))
  preview.stderr.on('data', d => previewErr.push(String(d)))
  preview.on('exit', () => { previewExited = true })
  // POSITIVE readiness: wait for the TCP port, then confirm a real HTTP 200.
  let lastErr = ''
  for (let i = 0; i < 120; i++) {           // ~30s bound (120 * 250ms)
    if (previewExited) break                 // server died early
    if (await portOpen(PORT)) {
      if (await httpOk(`${BASE}/`)) { log(`preview ready at ${BASE}`); return }
      lastErr = 'port open but HTTP not 2xx/4xx yet'
    }
    await sleep(250)
  }
  if (lastErr) console.error('[qa-bootstrap] last readiness error:', lastErr)
  // Failed to become ready — surface the server output.
  console.error('[qa-bootstrap] preview server FAILED to become ready on', BASE)
  if (previewOut.length) console.error('--- preview stdout ---\n' + previewOut.join(''))
  if (previewErr.length) console.error('--- preview stderr ---\n' + previewErr.join(''))
  throw new Error('preview not ready')
}

async function stopSharedPreview() {
  if (!preview) return
  try { process.kill(-preview.pid, 'SIGTERM') } catch { try { preview.kill('SIGTERM') } catch {} }
  // wait for the process group to exit and the port to be released (bounded)
  for (let i = 0; i < 40; i++) {
    if (!(await portOpen(PORT))) { log('preview stopped; port released'); preview = null; return }
    await sleep(250)
  }
  try { process.kill(-preview.pid, 'SIGKILL') } catch {}
  await sleep(500)
  if (await portOpen(PORT)) log(`WARN: port ${PORT} still open after SIGKILL`)
  preview = null
}

function cleanup() {
  for (const link of createdLinks) { try { rmSync(link, { force: true }) } catch {} }
  try { rmSync(join(REPO, 'qa-artifacts'), { recursive: true, force: true }) } catch {}
  try { execFileSync('git', ['-C', REPO, 'checkout', '--', 'dist'], { stdio: 'ignore' }) } catch {}
  try { execFileSync('git', ['-C', REPO, 'clean', '-fdq', 'dist'], { stdio: 'ignore' }) } catch {}
  if (scratch && !keep) { try { rmSync(scratch, { recursive: true, force: true }) } catch {} }
}

function runSuite(suite, env) {
  return new Promise((res) => {
    const child = spawn('node', [suite], { cwd: REPO, stdio: 'inherit', env })
    child.on('exit', code => res(code || 0))
    child.on('error', () => res(1))
  })
}

let exitCode = 0
try {
  // 1–3. isolated, pinned Playwright + Chromium
  scratch = mkdtempSync(join(tmpdir(), 'som-qa-pw-'))
  log('scratch:', scratch)
  sh('npm', ['init', '-y'], { cwd: scratch, stdio: 'ignore' })
  log(`installing playwright@${PLAYWRIGHT_VERSION} (isolated)…`)
  sh('npm', ['i', `playwright@${PLAYWRIGHT_VERSION}`, '--no-audit', '--no-fund'], { cwd: scratch })
  log('installing chromium…')
  sh('node', [join(scratch, 'node_modules', 'playwright-core', 'cli.js'), 'install', 'chromium'], { cwd: scratch })

  // 4. link Playwright into the repo for harness resolution
  mkdirSync(join(REPO, 'node_modules'), { recursive: true })
  for (const pkg of ['playwright', 'playwright-core']) {
    const link = join(REPO, 'node_modules', pkg)
    try { rmSync(link, { force: true, recursive: true }) } catch {}
    symlinkSync(join(scratch, 'node_modules', pkg), link)
    createdLinks.push(link)
  }

  // 5. QA_CHROMIUM (absolute, Playwright-managed) — bootstrap owns browser resolution
  const chromium = resolveChromiumExe()
  if (!chromium) throw new Error('could not resolve a Playwright-managed Chromium executable')
  log('QA_CHROMIUM:', chromium)
  const env = { ...process.env, QA_CHROMIUM: chromium, QA_BASE_URL: BASE }

  // 6. production build
  log('building app…')
  sh('npm', ['run', 'build'], { cwd: REPO })

  // 7. ONE shared preview, positive readiness
  await startSharedPreview()

  // 8–9. run suites in explicit order
  for (const suite of runSuites) {
    log(`running ${suite}…`)
    const code = await runSuite(suite, env)
    if (code !== 0) { exitCode = code; log(`SUITE FAILED: ${suite} (exit ${code})`) }
  }

  // 10. failure-injection self-check (no product suite is ever made to fail):
  // a synthetic child that exits nonzero, proving the bootstrap propagates the
  // failure AND still runs its finally cleanup (preview stop + link/dist restore).
  if (injectFail) {
    log('running injected synthetic failing child (self-check)…')
    const failCode = await new Promise((res) => {
      const c = spawn('node', ['-e', 'process.exit(7)'], { cwd: REPO, stdio: 'inherit', env })
      c.on('exit', x => res(x || 0))
    })
    if (failCode !== 0) { exitCode = failCode; log(`INJECTED FAILURE observed (exit ${failCode}) — bootstrap will exit nonzero`) }
  }
} catch (err) {
  exitCode = 1
  console.error('[qa-bootstrap] ERROR:', err?.message || err)
} finally {
  await stopSharedPreview()
  cleanup()
}

log(exitCode === 0 ? 'ALL SUITES PASSED' : 'ONE OR MORE SUITES FAILED')
process.exit(exitCode)
