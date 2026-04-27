# School of Motesart — Claude Code Constitution
# AUTO-LOADED every session. Keep under 200 lines. Last updated: April 27, 2026

## IDENTITY (never conflate)
- T.A.M.i = platform OS/decision engine. Never call it coach or teacher.
- Motesart = default student Ambassador. Delivers instruction. Never thinks.
- T.A.M.i is the OS. Motesart is the voice.
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

## CURRENT STATE (April 27, 2026)
- Voice loop: WORKING in bundle index-ByohIFMv.js
- Active path: Theory Phase (NOT old T.A.M.i visual engine)
- Dynamic concept routing: WORKING — ?concept=half-step / whole-step / scale-degree
- Key files modified this session: WYLPracticeLive.jsx, PracticeConceptView.jsx, conceptViewConfig.js
- Last commits: 904e868 (cockpit concept name), fedd806 (concept routing), 6a01ea3 (CLAUDE.md + handoff)
- PENDING: Add VITE_MOTESART_CLAUDE_KEY to Netlify env vars for parseIntent AI fallback
- PENDING: Live test voice loop end-to-end with mic on real device

## AIRTABLE (read-only computed fields — NEVER write via API)
- Users table: "Student / User Name", "User Email", "Password Hash", "Role" (capitalized)
- DPM%, DPM Status, Weekly Practice Minutes, Total Practice Minutes = computed, read-only

## SESSION END CHECKLIST
After every session, update PROJECT_BRAIN_HANDOFF.md:
- Date, what was built, files modified, commit hashes, result, next steps
Then: git add PROJECT_BRAIN_HANDOFF.md CLAUDE.md && git commit -m "docs: session handoff [date]" && git push
