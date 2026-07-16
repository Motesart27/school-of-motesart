# Phase 0R.1A Encoding Remediation Ledger

Locked baseline: `1683cb1225d9d43e7155f74bd96eca451e2294a6`

Scope: Phase 0R.1A only
Behavioral impact for every entry: **none**

| ID | File:original line | Original literal | Replacement | Surface | Protection check | Expected visual impact | Verification |
|---|---|---|---|---|---|---|---|
| ER-MCC-001 | `src/components/MiniCoachCard.jsx:2` | `â` | `—` | Unimported component comment | Ordinary; not a collision path | none | source scan/build |
| ER-MCC-002 | `src/components/MiniCoachCard.jsx:37` | `ââ … ââ` | `── … ──` | Unimported JSX comment | Ordinary; not a collision path | none | source scan/build |
| ER-MCC-003 | `src/components/MiniCoachCard.jsx:104` | `ââ … ââ` | `── … ──` | Unimported JSX comment | Ordinary; not a collision path | none | source scan/build |
| ER-MOVE-001 | `src/pages/MoveItChapter.jsx:304` | `Ã¢ÂÂ` | `—` | `/move-it` JSX comment | Ordinary; not a collision path | none | source scan/build |
| ER-MOVE-002 | `src/pages/MoveItChapter.jsx:313` | `3â4 and 7â8` | `3→4 and 7→8` | `/move-it` | Ordinary; not a collision path | expected text-pixel delta | route + 102-suite comparison |
| ER-PLOG-001 | `src/pages/PracticeLogPage.jsx:5` | encoded rule | `───` | `/practice-log` comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-002 | `src/pages/PracticeLogPage.jsx:8` | encoded rule | `───` | `/practice-log` comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-003 | `src/pages/PracticeLogPage.jsx:50` | encoded rule | `───` | `/practice-log` comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-004 | `src/pages/PracticeLogPage.jsx:290` | encoded rule | `───` | `/practice-log` comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-005 | `src/pages/PracticeLogPage.jsx:300` | encoded rule | `───` | `/practice-log` comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-006 | `src/pages/PracticeLogPage.jsx:332` | encoded rule | `───` | `/practice-log` comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-007 | `src/pages/PracticeLogPage.jsx:436` | encoded rule | `───` | `/practice-log` JSX comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-008 | `src/pages/PracticeLogPage.jsx:472` | encoded rule | `───` | `/practice-log` JSX comment | Ordinary; not a collision path | none | source scan/build |
| ER-PLOG-009 | `src/pages/PracticeLogPage.jsx:706` | `Ã¢ÂÂ` | `×` | `/practice-log` Log Session modal | Ordinary; not a collision path | expected modal text-pixel delta | modal before/after + build |

All edits are one-line literal substitutions. No surrounding expression, event handler, layout, styling, route, guard, data, or control-flow token changed.
