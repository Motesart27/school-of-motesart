# SOM PROJECT BRAIN — HANDOFF
Last Updated: May 22, 2026 | Bundle: index-BWDhKcE_.js

---

## Current State

Gate 0 Find Home is deployed, but not shipped to students yet.

**Gate 0 status:** DEPLOYED_NOT_SHIPPED

Mobile verification is still the ship gate. Verify on iPhone-sized viewports before sending real students through the flow.

---

## Latest Bundle

`index-BWDhKcE_.js`

Production site:
`https://school-of-motesart.netlify.app`

---

## Last 3 Commits

| SHA | Summary |
|---|---|
| `6c4c896` | homework wire |
| `2e07881` | loader fix |
| `c9c2a5a` | Find Home UI |

---

## Gate 0 — Find Home

| Item | Value |
|---|---|
| Status | DEPLOYED_NOT_SHIPPED |
| Route | `/practice/C_MAJOR_GATE_FIND_HOME` |
| Component | `src/components/gate0/FindHomeGate.jsx` |
| Lesson JSON | `public/lesson_data/L00_find_home.json` |
| Homework URL | `/game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1` |
| Latest bundle | `index-BWDhKcE_.js` |

The Step 8 Homework button now routes to GamePage Academic mode:

`/game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1`

When `assignment_id` is present, GamePage treats the session as homework and locks the mode toggle to Academic.

---

## Architecture Law

**Gate teaches. GamePage reinforces. GamePage logs.**

This is locked.

- Gate components teach the concept, run the proof loop, and collect ownership evidence.
- GamePage reinforces concepts through game or academic practice.
- GamePage logs practice/homework sessions.
- Gate components do not duplicate GamePage keyboard/game logic.
- GamePage does not become the teaching gate.

---

## Gate Map

| Gate | Name | Status | Notes |
|---|---|---|---|
| Gate 0 | Find Home | DEPLOYED_NOT_SHIPPED | Mobile verification pending |
| Gate 1 | Skip & Together | NEXT | Draft JSON next |
| Gate 2 | Pattern Mind | Preserved / reclassified | Existing `/practice/C_MAJOR_GATE_0`; do not delete |

Pattern Mind remains live at:

`/practice/C_MAJOR_GATE_0`

Do not route first-time beginners directly into Pattern Mind until Find Home and Gate 1 are in front of it.

---

## Next

1. Mobile verification on iPhone `390x844`.
2. Mobile verification on iPhone `430x932`.
3. Confirm `/practice/C_MAJOR_GATE_FIND_HOME` completes cleanly on mobile.
4. Confirm Step 8 launches:
   `/game?mode=academic&concept=find_home&assignment_id=gate0_find_home&level=1`
5. Confirm GamePage Academic mode toggle is disabled when `assignment_id` is present.
6. Confirm `/practice/C_MAJOR_GATE_0` still loads Pattern Mind.
7. If mobile passes, mark Gate 0 as shipped.
8. Draft Gate 1 JSON.

---

## Protected Direction

Do not add Airtable writes inside Gate 0 until table/field names are verified.

Do not build Gate 1 UI before the Gate 1 JSON is drafted and reviewed against:

- `docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md`
- `docs/MOTESART_VOICE_BIBLE.md`
- the current Find Home gate structure

Do not modify GamePage casually. GamePage is the reinforcement engine and logging surface.

---

## Documents To Read Before Next Build

- `docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md`
- `docs/MOTESART_VOICE_BIBLE.md`
- `public/lesson_data/L00_find_home.json`
- `src/components/gate0/FindHomeGate.jsx`
- `src/pages/GamePage.jsx`

---

## Airtable / Logging Notes

Gate 0 currently stores completion locally through session storage handoff and routes to `/student`.

Homework practice routes into GamePage Academic mode. GamePage is responsible for homework/session logging.

Airtable verification is still required before any new evidence writes:

- `SOM_Mastery_Ledger`
- `Game_Sessions`

Do not assume field names.

---

## Current Ship Gate

Gate 0 cannot be considered shipped until mobile verification passes on:

- iPhone `390x844`
- iPhone `430x932`

After that, proceed to Gate 1 JSON draft.
