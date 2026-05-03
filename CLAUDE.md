# School of Motesart — Claude Code Constitution
# AUTO-LOADED every session. Keep under 200 lines. Last updated: April 27, 2026

## IDENTITY (never conflate)
- T.A.M.i = platform OS/decision engine. Never call it coach or teacher.
- Motesart = default student Ambassador. Delivers instruction. Never thinks.
- T.A.M.i is the OS. Motesart is the voice.
- Mya = OS-level voice assistant. Separate system, separate repo. Not SOM-internal. SOM work from Mya enters through MASTER_TASKS delegation only (business=SOM, assigned_agent=SOM Executive).
- "Mozart" in any message = "Motesart" (speech-to-text artifact)

## STACK
- Frontend: React 18/Vite → Netlify (site: 68b307a9-ef37-4298-9e72-805381200e1c)
- Backend: FastAPI → Railway (deployable-python-codebase-som-production.up.railway.app)
- TTS proxy: Express → Railway (protective-flow-production.up.railway.app)
- DB: Airtable (appTN4wNd5Kgbqdwl)
- Repo: Motesart27/school-of-motesart (main branch) — NOT Motesart-frontend

## BUILD + DEPLOY RULES
- Always: rm -rf node_modules/.vite && npm run build before deploy
- Deploy: npx netlify-cli deploy --prod --dir=dist --site=68b307a9-ef37-4298-9e72-805381200e1c
- AFTER EVERY DEPLOY verify bundle with: fetch('/assets/index-XXXX.js').then(r=>r.text()).then(src=>console.table({motesartReply:src.includes('motesartReply'),awaitingResponse:src.includes('awaitingResponse'),theoryContent:src.includes('I am Motesart')}))
- If any check false = stale build = redeploy with clear cache, do NOT debug code

## HARD RULES (non-negotiable)
1. Read live file from GitHub BEFORE any edit — never edit from memory
2. Surgical edits only — never rewrite working files
3. One feature per session
4. Every session: update PROJECT_BRAIN_HANDOFF.md with date/what/files/result
5. Protected files: Registration.jsx, auth.py, GamePage.jsx — do not touch
6. No invented field names, routes, or API contracts — mark as TO VERIFY if unsure
7. No silent dependency changes — call out new packages explicitly

## CURRENT STATE (May 3, 2026)
- T.A.M.i Phase 2 COMPLETE — live data adapter, student roster hook, dashboard intelligence (baseline: 89dd2ba)
- Motesart teaching engine LOCKED — zero drift from baseline 23fb225 (verified May 3, 2026)
- Phase 3 pre-conditions NOT started: teacher intervention log, parent notifications, live session writes, progress timeline
- PENDING: VITE_MOTESART_CLAUDE_KEY for parseIntent AI fallback — add to Netlify env vars, status unverified
- PENDING: End-to-end voice loop test on real device — status unverified

## AIRTABLE (read-only computed fields — NEVER write via API)
- Users table: "Student / User Name", "User Email", "Password Hash", "Role" (capitalized)
- DPM%, DPM Status, Weekly Practice Minutes, Total Practice Minutes = computed, read-only

## SESSION END CHECKLIST
After every session, update PROJECT_BRAIN_HANDOFF.md:
- Date, what was built, files modified, commit hashes, result, next steps
Then: git add PROJECT_BRAIN_HANDOFF.md CLAUDE.md && git commit -m "docs: session handoff [date]" && git push
