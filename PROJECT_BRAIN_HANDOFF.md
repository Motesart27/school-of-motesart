# SOM PROJECT BRAIN — HANDOFF
Last Updated: May 23, 2026 | Bundle: index-DTATOCQr.js

---

## Current State

Status: DEPLOYED_NOT_SHIPPED

Gate 0 Find Home and Gate 1 Skip & Together are deployed, but not shipped to students yet. Mobile verification is still pending.

All three gate routes are present in the production bundle and were confirmed by Codex after deploy.

---

## Latest Bundle

`index-DTATOCQr.js`

Production site:
`https://school-of-motesart.netlify.app`

Deploy containing Gate 1 UI:
`6a119b2c3d353478d9813088`

---

## Live Gate Routes

| Gate | Name | Route | Status |
|---|---|---|---|
| Gate 0 | Find Home | `/practice/C_MAJOR_GATE_FIND_HOME` | Live, not regressed |
| Gate 1 | Skip & Together | `/practice/C_MAJOR_GATE_SKIP_TOGETHER` | Live, commit `ef53c61` |
| Gate 2 | Pattern Mind | `/practice/C_MAJOR_GATE_0` | Preserved, not regressed |

Codex verified all three routes resolve to the deployed bundle `index-DTATOCQr.js`.

---

## Curriculum Brain Nodes

Both lesson JSON files have been audited and committed with the streams schema.

| Lesson | Gate | Status |
|---|---|---|
| `public/lesson_data/L00_find_home.json` | Gate 0 | v1.1, streams schema committed |
| `public/lesson_data/L01_skip_and_together.json` | Gate 1 | streams schema committed, renderer schema normalized |

L01 proof questions are normalized to the renderer-compatible schema:

`gate_steps.step_6_quiz_it.questions[]`

This matches L00 and the gate renderer pattern.

---

## Architecture Law

Gate teaches. GamePage reinforces. GamePage logs.

This is locked.

- Gate components teach, quiz, and collect ownership proof.
- GamePage reinforces through Academic/Game modes.
- GamePage owns practice and homework logging.
- Gate components do not duplicate GamePage keyboard/game systems.
- GamePage does not become the teaching gate.

---

## SOM Brain Formula

Locked model: 5 training areas, 5 engines.

| Training Area | Engine | Role |
|---|---|---|
| Ear | FindTheNote | Pitch, home, skip/together recognition |
| Timing | RhythmRacer | Pulse, beat alignment, timing consistency |
| Knowledge | GateProofLoop | Teaching, quiz, ownership explanation |
| Body | LivePractice | Physical playing and transfer |
| Converter | MotesartConverter | Real-song conversion into the number system |

The streams schema turns each lesson node into a brain node by declaring which engines are live, planned, or future.

---

## Current Gate Status

### Gate 0 — Find Home

- Route: `/practice/C_MAJOR_GATE_FIND_HOME`
- Component: `src/components/gate0/FindHomeGate.jsx`
- Lesson JSON: `public/lesson_data/L00_find_home.json`
- Homework route: `/game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1`
- Status: DEPLOYED_NOT_SHIPPED

### Gate 1 — Skip & Together

- Route: `/practice/C_MAJOR_GATE_SKIP_TOGETHER`
- Component: `src/components/gate0/SkipAndTogetherGate.jsx`
- Lesson JSON: `public/lesson_data/L01_skip_and_together.json`
- Commit: `ef53c61`
- Status: DEPLOYED_NOT_SHIPPED

### Gate 2 — Pattern Mind

- Route: `/practice/C_MAJOR_GATE_0`
- Component: `src/components/gate0/MajorScalePatternGate.jsx`
- Status: Preserved and not regressed
- Direction: re-thread later so skip/together language leads before W-W-H terminology.

---

## Next

1. Mobile verification.
   - iPhone `390x844`
   - iPhone `430x932`
   - Verify Gate 0, Gate 1, and Gate 2 routes load cleanly.
   - Verify gate completion behavior on mobile.
2. Wire `find_together` in GamePage.
   - Target assignment route: `/game?mode=academic&concept=find_together&assignment_id=gate1_find_together&level=1`
   - Keep GamePage as reinforcement/logging engine only.
3. Gate 2 re-thread.
   - Preserve existing Pattern Mind work.
   - Reorder language so skip/together comes before W-W-H.

---

## Protected Direction

Do not add Airtable writes until table and field names are verified.

Do not edit auth, registration, dashboards, or unrelated route files.

Do not rebuild Gate 2 from scratch. Preserve it and re-thread the language only when that pass begins.

Do not deploy data-only curriculum changes unless a UI/runtime change requires it.

---

## Documents To Read Before Next Build

- `docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md`
- `docs/MOTESART_VOICE_BIBLE.md`
- `public/lesson_data/L00_find_home.json`
- `public/lesson_data/L01_skip_and_together.json`
- `src/components/gate0/FindHomeGate.jsx`
- `src/components/gate0/SkipAndTogetherGate.jsx`
- `src/pages/PracticeChapterWrapper.jsx`
- `src/pages/GamePage.jsx`

---

## Current Ship Gate

The current product state is DEPLOYED_NOT_SHIPPED.

Ship only after mobile verification passes on:

- iPhone `390x844`
- iPhone `430x932`

After mobile verification, proceed to GamePage `find_together` wiring, then Gate 2 re-thread.
