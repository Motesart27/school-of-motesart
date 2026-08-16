#!/usr/bin/env node
/**
 * qa-bootstrap.mjs — deterministic, repo-contained browser-QA bootstrap.
 *
 * M1 R3.2 (Codex MEDIUM-2): the browser acceptance suites use Playwright, which
 * is intentionally NOT a production/dev dependency of this app. Previously a
 * reviewer had to reproduce an undocumented manual Playwright setup (including
 * an undeclared /opt/pw-browsers/chromium path). This script makes browser QA
 * reproducible from the frozen repository with ONE command and leaves the
 * worktree clean.
 *
 * What it does:
 *   1. creates an isolated scratch dir OUTSIDE the repo (os.tmpdir())
 *   2. installs the EXACT pinned Playwright version there (no repo dep mutation)
 *   3. installs/uses the required Chromium (Playwright-managed cache)
 *   4. links Playwright into the repo (temporary node_modules symlinks) so the
 *      harness `import { chromium } from 'playwright'` resolves
 *   5. exports QA_CHROMIUM so legacy suites that hard-code a browser path work
 *   6. builds the app and runs the requested suites (each spawns vite preview)
 *   7. returns a proper exit code (non-zero if any suite fails)
 *   8. removes the temporary symlinks + qa-artifacts
 *   9. restores tracked dist/ so the canonical worktree finishes clean
 *
 * It does NOT commit browser binaries and does NOT modify package.json /
 * package-lock.json.
 *
 * Usage:
 *   node scripts/qa-bootstrap.mjs                       # runs the default suite set
 *   node scripts/qa-bootstrap.mjs tests/m1r32_fe_qa.mjs # run specific suite(s)
 *   node scripts/qa-bootstrap.mjs --keep                # keep scratch install for reuse
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, existsSync, rmSync, symlinkSync, readdirSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, resolve } from 'node:path'

// ── Pinned, deterministic versions ──────────────────────────────────
export const PLAYWRIGHT_VERSION = '1.49.1'
const REPO = resolve(import.meta.dirname, '..')

const DEFAULT_SUITES = [
  'tests/m1r32_fe_qa.mjs',
  'tests/m1r31_fe_qa.mjs',
  'tests/m1r3_fe_qa.mjs',
  'tests/m1r2_fe1_qa.mjs',
  'tests/m1r2_fe_qa.mjs',
  'tests/m1r1_qa.mjs',
  'tests/m1r11_qa.mjs',
]
const QA_PORTS = [4173, 4174, 4179]

const args = process.argv.slice(2)
const keep = args.includes('--keep')
const suites = args.filter(a => !a.startsWith('--'))
const runSuites = suites.length ? suites : DEFAULT_SUITES

function log(...m) { console.log('[qa-bootstrap]', ...m) }
function sh(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { stdio: 'inherit', ...opts })
}

function killStalePreviews() {
  for (const p of QA_PORTS) {
    const r = spawnSync('lsof', ['-nP', `-tiTCP:${p}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
    const pid = (r.stdout || '').trim().split('\n').filter(Boolean)[0]
    if (pid) { try { process.kill(Number(pid)); log(`killed stale preview pid ${pid} on :${p}`) } catch {} }
  }
}

function resolveChromiumExe() {
  // Playwright caches browsers here on macOS/Linux by default.
  const cacheRoots = [
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),   // macOS
    join(homedir(), '.cache', 'ms-playwright'),              // Linux
  ]
  for (const root of cacheRoots) {
    if (!existsSync(root)) continue
    const dirs = readdirSync(root).filter(d => d.startsWith('chromium-'))
    for (const d of dirs) {
      for (const candidate of [
        join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        join(root, d, 'chrome-linux', 'chrome'),
      ]) {
        if (existsSync(candidate)) return candidate
      }
    }
  }
  return null
}

let scratch = null
const createdLinks = []

function cleanup() {
  // remove temporary project-tree linkage
  for (const link of createdLinks) { try { rmSync(link, { force: true }) } catch {} }
  // remove uncommitted QA artifacts
  try { rmSync(join(REPO, 'qa-artifacts'), { recursive: true, force: true }) } catch {}
  // restore tracked dist so the worktree finishes clean
  try { execFileSync('git', ['-C', REPO, 'checkout', '--', 'dist'], { stdio: 'ignore' }) } catch {}
  try { execFileSync('git', ['-C', REPO, 'clean', '-fdq', 'dist'], { stdio: 'ignore' }) } catch {}
  killStalePreviews()
  if (scratch && !keep) { try { rmSync(scratch, { recursive: true, force: true }) } catch {} }
}

let exitCode = 0
try {
  // 1. isolated scratch outside the repo
  scratch = mkdtempSync(join(tmpdir(), 'som-qa-pw-'))
  log('scratch:', scratch)

  // 2. exact pinned Playwright, isolated from the repo dependency state
  sh('npm', ['init', '-y'], { cwd: scratch, stdio: 'ignore' })
  log(`installing playwright@${PLAYWRIGHT_VERSION} (isolated)…`)
  sh('npm', ['i', `playwright@${PLAYWRIGHT_VERSION}`, '--no-audit', '--no-fund'], { cwd: scratch })

  // 3. required Chromium (Playwright-managed cache, not committed)
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

  // 5. QA_CHROMIUM for legacy suites that hard-code an executablePath
  const chromium = resolveChromiumExe()
  if (chromium) log('QA_CHROMIUM:', chromium)
  else log('WARN: could not resolve a Chromium executable for QA_CHROMIUM')
  const env = { ...process.env, ...(chromium ? { QA_CHROMIUM: chromium } : {}) }

  // 6. build once, then run suites (each spawns its own vite preview)
  killStalePreviews()
  log('building app…')
  sh('npm', ['run', 'build'], { cwd: REPO })

  for (const suite of runSuites) {
    killStalePreviews()
    log(`running ${suite}…`)
    const r = spawnSync('node', [suite], { cwd: REPO, stdio: 'inherit', env })
    if (r.status !== 0) { exitCode = r.status || 1; log(`SUITE FAILED: ${suite} (exit ${r.status})`) }
  }
} catch (err) {
  exitCode = 1
  console.error('[qa-bootstrap] ERROR:', err?.message || err)
} finally {
  cleanup()
}

log(exitCode === 0 ? 'ALL SUITES PASSED' : 'ONE OR MORE SUITES FAILED')
process.exit(exitCode)
