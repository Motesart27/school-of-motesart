# SOM PROJECT BRAIN — HANDOFF
Last Updated: August 9, 2026 | Bundle: prod unchanged — branch work

## SESSION HANDOFF — August 9, 2026 (M1 R1 FRONTEND REMEDIATION · branch-only)
- What: Targeted correction package per the MYA M1 R1 frontend card (follows
  Codex PKG-RV review + completed backend R1). Branch
  `fix/m1-r1-frontend-remediation-clean` off frozen `feat/m1-evidence-frontend`
  @ a2c048b. NOT merged. NOT deployed. NO PR. Backend contract source of truth:
  Deployable-python-codebase-som `fix/m1-r1-backend-remediation-clean`
  @ 69147f5 (SHA verified against the local clone's git object DB).
- Identity (fixes 1–3): /student?email= REMOVED everywhere (api.js method
  deleted; AuthContext follow-up deleted; TamiParentSummary email lookup
  disabled to neutral fallback). Canonical academic identity now comes ONLY
  from GET /auth/learning-identity: resolved → auto-use; selection_required →
  explicit student selection via NEW src/components/InstrumentSelect.jsx
  (never owned_instruments[0]; cached pointer som_selected_instrument is
  convenience-only, revalidated against current owned_instruments, stale →
  discarded + re-selection); unresolved → student-safe setup state, writes
  blocked; 503 identity_unavailable_retryable → retryable (bounded auto-retry
  + manual Try Again), NEVER converted to permanent unresolved. AuthContext
  exposes user_id, student_record_id, student_instrument_id, role,
  identity_status, selection_required, owned_instruments,
  selected_student_instrument_id, learning_identity_ready,
  learning_identity_retryable_error (+ evidenceStudentInstrumentId /
  evidenceReady / selectInstrument / retryLearningIdentity). Cache snapshot
  som_learning_identity feeds evidenceClient (cache only, never authority).
- Write path (fixes 4, 13): evidenceClient posts only under the canonical/
  explicitly-selected instrument; 403 wrong_student FAILS CLOSED (no queue, no
  retry, no identity substitution — queued 403s dropped loudly); 409
  selection_required → som:selection-required event → AuthContext clears
  selection → selection UI; 409 duplicate_event_mismatch → CONTRACT FAILURE
  surfaced (console.error + flush report), never rewritten/replayed; 503/
  network → queued with exact client_event_id + immutable payload (flush sends
  identical JSON; QA asserts string-equality).
- Contracts (fixes 5–9): student-safe Concept_State fields only (no
  confidence/trend/mastery_ready/evidence_summary dependence); canonical rec…
  assignment_id is the ONLY evidence/completion linkage (isCanonicalAssignmentId
  guard in evidenceClient + GamePage + RRv2 — legacy numeric ids downgrade to
  free play with warn); assignment_number is display-only (detail panel chip);
  HomeworkDashboard aligned to the R1 serializer (canonical names, obsolete
  aliases removed, non-array /mine surfaced as contract error, no invented
  T_HALF_STEP launch fallback — concept-less assignments show "Not ready to
  launch"); NEW Up Next card consumes GET /concept-state/{si}/active-assignment
  (false → nothing rendered, 403 fail-closed, 503 retryable UI; no
  T_MAJOR_SCALE_PATTERN fabrication).
- Activities (fixes 10–12): Rhythm Racer bandless (no grade_band key when no
  authoritative R_* mapping; never "3-5"); FtN/RR each exactly one canonical
  evidence write, stable uuid client_event_id; zero converter learning-state
  writes in all touched flows.
- Governance (fixes 14–17): localStorage stays cache/pointer-only; Gate 0/1/2
  network evidence still OFF (adapter's held draft re-pinned to backend enums
  chapter='gate'/source_activity='gate' — alignment only, flag unchanged);
  Article XIII: touched surfaces render tier language only (QA asserts no
  visible %).
- QA (fix 18): NEW tests/m1r1_qa.mjs (Playwright vs production build, backend
  fully mocked — zero real network writes): 56/56 PASS covering every card
  test incl. offline byte-stability + exact client_event_id, 403/409/503
  semantics, canonical ids, fabrication bans, converter/gate zero, mobile
  390x844 + 393x852. `npm run build` clean (pre-existing >500kB advisory).
  Run: `npm i --no-save playwright && node tests/m1r1_qa.mjs` (artifacts to
  qa-artifacts/, not committed).
- Note: GamePage.jsx is CLAUDE.md-protected; edited strictly per the explicit
  MYA R1 card. No dependency changes (playwright installed --no-save).
  Observed, not changed: backend /assignments/mine returns [] for
  selection_required students (server resolves si; list can't scope to a
  client selection) — flagged in the R1 return; parent TamiParentSummary now
  shows neutral copy pending a canonical parent→child endpoint.

## SESSION HANDOFF — August 8, 2026 (PKG-FE · branch-only)
- What: M1 frontend evidence path per PKG-FE dispatch card (M1_SPEC amended
  2026-08-08, MYA Amendments 1–4). Branch `feat/m1-evidence-frontend` off
  main @ 9b5449f. NOT merged. NOT deployed. Backend contract frozen at
  Deployable-python-codebase-som feat/m1-evidence-write-path @ 0ee4585.
- Files: NEW src/services/evidenceClient.js, NEW src/components/gate0/
  gateEvidenceAdapter.js (flag-gated OFF — VITE_GATE_EVIDENCE=1 enables later,
  Amendment 4); MODIFIED api.js, AuthContext.jsx (learningIdentity), GamePage.jsx
  (evidence path, dead /session/log + /leaderboard/submit POSTs removed),
  RhythmRacerV2.jsx (Railway repoint, converter writes removed, tier language),
  HomeworkDashboard.jsx (live GET /assignments/mine; SHEETS/ARCH/ANN STAGED),
  concept_state_store.js (cache demotion, no default_student, read-through),
  FindHomeGate/SkipAndTogetherGate/MajorScalePatternGate (shared seam).
- Result: branch QA 38/38 (mocked backend — NOT production evidence):
  single idempotent evidence POSTs, client_event_id reuse on retry verified,
  zero converter calls, offline queue single-flush, mobile 390x844 + 393x852
  clean, `npm run build` clean. Awaiting Codex review; merge/deploy held.
- Note: GamePage.jsx is CLAUDE.md-protected; edited strictly per the explicit
  PKG-FE dispatch order. Article XIII sweep on touched surfaces only —
  StudentDashboard/TamiDashboard percentages left for a later pass.

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
- Test student: jordan.rivers.som.test4@gmail.com / TestStudent27!
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
