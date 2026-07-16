import { execFileSync } from 'node:child_process'

const base = 'e00a25f7cff1dbc894922eba51d7c33a311caba5'
const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' }).split('\n').filter(Boolean)
const allowedExact = new Set(['src/App.jsx', 'src/pages/MyCoachPage.jsx', 'src/pages/DevKit.jsx', 'src/pages/DevKit.css', 'PROJECT_BRAIN.md', 'docs/audit/PHASE_1C_IMPLEMENTATION_PLAN.md', 'docs/audit/PHASE_1C_ICON_REGISTRY.md', 'docs/audit/PHASE_1C_PRIMITIVE_API_REPORT.md', 'docs/audit/PHASE_1C_ICON_PRIMITIVE_VERIFICATION_REPORT.md'])
const allowedPrefixes = ['src/components/ui/', 'docs/audit/phase1c/', 'visual-regression/phase1c-icons-primitives/']
const paths = status.map(line => line.slice(3).replace(/^"|"$/g, ''))
const disallowed = paths.filter(file => !allowedExact.has(file) && !allowedPrefixes.some(prefix => file.startsWith(prefix)))
const protectedScopes = ['src/pages/Login.jsx','src/pages/Registration.jsx','src/pages/GamePage.jsx','src/context/AuthContext.jsx','src/services/api.js','src/pages/PracticeLogPage.jsx','index.html','src/main.jsx','src/styles/tokens.js','src/styles/foundations.css','src/styles/theme.js','tailwind.config.js','package.json','package-lock.json','netlify.toml','server.js','nixpacks.toml','visual-baselines/']
const protectedDiff = execFileSync('git', ['diff', '--name-only', base, '--', ...protectedScopes], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const summary = { changedPathCount: paths.length, disallowed, protectedOrConfigChanges: protectedDiff, pass: disallowed.length === 0 && protectedDiff.length === 0 }
console.log(JSON.stringify(summary, null, 2))
if (!summary.pass) process.exitCode = 1
