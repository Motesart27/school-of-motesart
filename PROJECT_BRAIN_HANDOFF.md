# SOM PROJECT BRAIN — HANDOFF
Last Updated: May 21, 2026 | Bundle: index-BWDhKcE_.js

---

## LAST 3 COMMITS

| SHA | Message |
|---|---|
| 6c4c896 | feat(gate0): wire Find Home homework to GamePage Academic mode |
| 2e07881 | fix(loader): update schema validation to support Find Home v2 JSON structure |
| c9c2a5a | feat(gate0): build Find Home UI (FindHomeGate.jsx) |

---

## GATE 0 — FIND HOME

**Status: DEPLOYED_NOT_SHIPPED**
Mobile verification pending before shipping to real students.

| Item | Value |
|---|---|
| Route | /practice/C_MAJOR_GATE_FIND_HOME |
| Component | src/components/gate0/FindHomeGate.jsx |
| Lesson JSON | public/lesson_data/L00_find_home.json |
| Homework URL | /game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1 |
| Bundle | index-BWDhKcE_.js |
| Gate runner | lessonDataLoader.js (supports v1 and v2 schema) |

### Architecture Law (Locked)

> Gate teaches. GamePage reinforces. GamePage logs.

- Gate component (FindHomeGate.jsx): teaches, quizzes, collects ownership proof
- GamePage in Academic mode: spaced retrieval homework after gate is passed
- GamePage logs game sessions to Game_Sessions table via Railway backend
- Gate never logs game sessions. GamePage never teaches.

---

## GATE ARCHITECTURE

| Gate | Name | Status | Lesson File |
|---|---|---|---|
| Gate 0 | Find Home | DEPLOYED_NOT_SHIPPED | L00_find_home.json |
| Gate 1 | Skip & Together | Not started | L01_skip_and_together.json (to draft) |
| Gate 2 | The Family Pattern | RECLASSIFIED from old C_MAJOR_GATE_0 | L00_major_scale_pattern.json (language update pending) |
| Gate 3 | Numbers in C | Not started | |
| Gate 4 | Feel the Pattern | Not started | |
| Gate 5 | Say It Back | Not started | |
| Gate 6 | Finger Path | Not started | |
| Gate 7 | Play It | Not started | |
| Gate 8 | Homework Reinforcement | Not started | |

### Gate 2 (Pattern Mind — Reclassified)
- Route: /practice/C_MAJOR_GATE_0 (stays live, do not delete)
- Component: MajorScalePatternGate.jsx (preserved per Constitution Article XV)
- Status: DEPLOYED_NOT_SHIPPED — language update pending (skip/together must lead before W-W-H)
- DO NOT direct first-time students here until Gates 0 and 1 are in front of it

---

## WHAT'S NEXT (Ordered)

1. **Mobile verification** — iPhone 390x844 and 430x932
   - Test /practice/C_MAJOR_GATE_FIND_HOME full flow on both viewports
   - Test /game?mode=academic&concept=find_home homework flow
   - If both pass → Gate 0 ships
2. **Gate 1 JSON draft** — L01_skip_and_together.json
   - Same 9-step gate template as L00_find_home.json
   - Constitution audit before building any UI
3. **Gate 1 UI** — SkipAndTogetherGate.jsx
4. **Gate 2 language re-thread** — skip/together language leads, W-W-H revealed as music-world name
5. **SOM_Mastery_Ledger verification** — TO VERIFY field names in Airtable before any evidence write
6. **VITE_MOTESART_CLAUDE_KEY** — add to Netlify env vars (enables parseIntent AI fallback)

---

## WHAT'S WORKING

- Voice loop wired and deployed (Theory Phase)
  - Mic: continuous=false, micRunningRef lock, no abort loop
  - Smart evaluator: natural language patterns, question/confusion handling
  - Transcript appears in speech bubble area
- Begin Session → startLesson() → advanceTeaching() chain confirmed
- Dynamic concept routing via ?concept= URL param
  - /practice-live?concept=half-step → Half Step ✅
  - /practice-live?concept=whole-step → Whole Step ✅
  - /practice-live?concept=scale-degree → Scale Degrees ✅
- Phase 1B verified: Audio works, TTS hits protective-flow, wrong answer does NOT advance
- Motesart personality locked: funny/sarcastic/genuine coaching energy
- Evaluator tightened: loose partial matches rejected
- lessonDataLoader.js: supports v1 schema (root concept_id) and v2 schema (_meta.concept_id)

---

## DOCTRINE DOCUMENTS (all in repo)

| File | Purpose |
|---|---|
| motesart_constitution.md | Build process, protected files, approval discipline |
| docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md | Student language, gate order, teaching voice (v1.1 ratified May 21, 2026) |
| docs/MOTESART_VOICE_BIBLE.md | School-safe culturally responsive voice |
| docs/SOM_ADAPTIVE_MUSIC_INTELLIGENCE_STRATEGY.md | Adaptive strategy |

---

## BASELINES

| Baseline | SHA |
|---|---|
| MOTESART_ENGINE | 23fb225 |
| TAMI_P1 | 51eaab4 |
| TAMI_CONTRACT | a403d22 |
| TAMI_P2 | 89dd2ba |
| TAMI_P1A_WIRE | 915345a |
| MOTESART_PERSONALITY | 05ae905 |
| EVALUATOR_TIGHTEN | e94db09 |
| LANGUAGE_CONSTITUTION | 38fda2a |

---

## PROTECTED FILES

- Registration.jsx, auth.py — login/auth flow, never touch
- GamePage.jsx — game engine, protected
- All working dashboards
- MajorScalePatternGate.jsx — PRESERVED (Constitution Article XV), reclassified as Gate 2
- L00_major_scale_pattern.json — PRESERVED, language update pending

---

## TO VERIFY

- SOM_Mastery_Ledger table in Airtable (appTN4wNd5Kgbqdwl): does it exist? field names?
- Game_Sessions table: confirm field names match L00_find_home.json evidence_logging schema
- VITE_MOTESART_CLAUDE_KEY in Netlify env vars
- End-to-end mic test on iPhone 390x844 and 430x932 (mobile ship gate for Gate 0)

---

## AIRTABLE

- Base ID: appTN4wNd5Kgbqdwl
- PAT: AIRTABLE_PAT (Railway env var — verify not truncated)
- Gate evidence target: SOM_Mastery_Ledger (TO VERIFY)
- Homework log target: Game_Sessions (TO VERIFY field names)
