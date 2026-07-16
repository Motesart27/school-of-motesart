# SOM PROJECT BRAIN — HANDOFF
Last Updated: May 23, 2026 | Bundle: index-DfXy9PFK.js

## TWO-LANE ARCHITECTURE (LOCKED)

### Lane 1 — Gate UI (proof / mastery / ownership)
- /practice/C_MAJOR_GATE_FIND_HOME → FindHomeGate.jsx → L00_find_home.json
- /practice/C_MAJOR_GATE_SKIP_TOGETHER → SkipAndTogetherGate.jsx → L01_skip_and_together.json
- /practice/C_MAJOR_GATE_0 → MajorScalePatternGate.jsx (Gate 2, preserved)
- Purpose: 9-step proof loop, ownership gate, sessionStorage completion, homework launch

### Lane 2 — Practice Live Cockpit (conversational teaching)
- /practice-live?concept=find-home → T_FIND_HOME (cfa6321)
- /practice-live?concept=skip-and-together → T_SKIP_AND_TOGETHER (cfa6321)
- /practice-live?concept=half-step → T_HALF_STEP (existing)
- /practice-live?concept=whole-step → T_WHOLE_STEP (existing)
- Purpose: live Motesart AI conversation, voice, visual cockpit, real-time coaching
- Motesart answers lesson questions and redirects off-topic back to lesson warmly

### Lane 3 — GamePage (homework reinforcement)
- /game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1
- /game?mode=academic&concept=find_together&assignment_id=gate1_find_together&level=1
- Purpose: Find the Note ear training, Academic mode locked by assignment_id

## LAST 5 COMMITS
- cfa6321: feat(practice-live): add Find Home and Skip Together concept scripts
- 2dcee33: docs: session handoff — Gate 1 Skip & Together live, curriculum brain nodes
- ef53c61: feat(gate1): add Skip and Together gate UI
- 21a13d5: fix(curriculum): normalize L01 proof questions to gate_steps schema
- 9622e97: feat(curriculum): add streams schema to lesson brain — L00 v1.1, L01

## CURRICULUM BRAIN NODES
- L00_find_home.json v1.1 — 32/32 audit, streams: ear LIVE, timing PLANNED
- L01_skip_and_together.json v1.0 — 42/42 audit, streams: ear PLANNED, timing PLANNED
- L00_major_scale_pattern.json — Gate 2, preserved, language update pending

## CURRENT STATUS
- Gate 0 Find Home: DEPLOYED_NOT_SHIPPED (mobile verification pending)
- Gate 1 Skip & Together: DEPLOYED_NOT_SHIPPED (mobile verification pending)
- Practice Live find-home: LIVE (cfa6321)
- Practice Live skip-and-together: LIVE (cfa6321)
- Pattern Mind Gate 2: PRESERVED at /practice/C_MAJOR_GATE_0

## WHAT'S NEEDED NEXT (Ordered)
1. Mobile verification — iPhone 390x844 and 430x932
   - /practice/C_MAJOR_GATE_FIND_HOME
   - /practice/C_MAJOR_GATE_SKIP_TOGETHER
   - /practice-live?concept=find-home (logged in as Jordan Rivers test student)
2. Verify find_together concept recognized in GamePage Academic mode
3. Gate 2 re-thread — Pattern Mind language update (skip/together leads, W-W-H as music-world name)
4. Wire Rhythm Racer as second homework engine (timing streams PLANNED_NOT_WIRED)
5. Verify SOM_Mastery_Ledger Airtable table before any evidence writes
6. Add VITE_MOTESART_CLAUDE_KEY to Netlify env vars

## SOM BRAIN FORMULA (locked)
- Motesart language → trains memory
- Find the Note → trains ear
- Rhythm Racer → trains timing
- Gate quizzes → trains understanding
- Live practice → trains muscle memory
- Motesart Converter → turns real songs into number-system practice
- T.A.M.i → reads all streams, routes forward, tracks perfect reps

## ARCHITECTURE LAWS (locked)
- Gate teaches. GamePage reinforces. GamePage logs.
- JSON is the lesson. React is only the renderer.
- Do NOT delete FindHomeGate.jsx or SkipAndTogetherGate.jsx
- Do NOT replace Gate UI with Practice Live
- Gate UI = proof. Practice Live = teaching. Both are needed.
- Constitution v1.1 governs all student-facing language

## PROTECTED FILES
- Registration.jsx, auth.py, GamePage.jsx
- MajorScalePatternGate.jsx — preserved as Gate 2 (Article XV)
- FindHomeGate.jsx — Gate Lane 1, do not delete
- SkipAndTogetherGate.jsx — Gate Lane 1, do not delete
- WYLPracticeLive.jsx — Practice Live cockpit, surgical edits only
- lessonDataLoader.js — supports v1+v2 schemas
- L00_find_home.json, L01_skip_and_together.json — audited, do not modify without amendment

## BASELINES
- Bundle: index-DfXy9PFK.js
- AIRTABLE_BASE_ID: appTN4wNd5Kgbqdwl
- MOTESART_ENGINE: 23fb225
- MOTESART_PERSONALITY: 05ae905
- Test-account credentials are intentionally not stored in source control. Use the approved operational credential channel.
- SOM backend: https://deployable-python-codebase-som-production.up.railway.app
- TTS backend: https://protective-flow-production.up.railway.app
- Netlify site ID: 68b307a9-ef37-4298-9e72-805381200e1c

## DOCTRINE DOCUMENTS (all in repo)
- motesart_constitution.md — build process, protected files, approval discipline
- docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md — student language, gate order, teaching voice
- docs/MOTESART_VOICE_BIBLE.md — school-safe culturally responsive voice
- docs/SOM_ADAPTIVE_MUSIC_INTELLIGENCE_STRATEGY.md — adaptive strategy

## SESSION START PROTOCOL (next session)
0. Confirm active model. Run /status to check the active model. SOM default is
   Sonnet (set in .claude/settings.json). The "Opus Plan" subscription header is
   NOT the active model. Stay on Sonnet for routine work. Escalate to Opus 4.8
   only for the tasks listed in the Model Escalation Matrix (see CLAUDE.md), then
   return to Sonnet. Do not force Opus every session.
1. Read PROJECT_BRAIN_HANDOFF.md (this file)
2. Read docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md
3. Read motesart_constitution.md
4. Never claim a tool is unavailable without checking
5. Visual approval before any code
6. One feature per session
