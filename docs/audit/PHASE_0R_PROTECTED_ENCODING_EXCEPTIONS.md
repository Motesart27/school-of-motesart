# Phase 0R.1A Protected and Uncertain Encoding Exceptions

These Phase 0 inventory entries were not edited. Each requires a later, separately authorized approval path.

| Audit entry | File / lines | Corrupted literal family | Intended replacement | Deferral reason | Future approval path |
|---|---|---|---|---|---|
| EX-001 | `src/pages/GamePage.jsx:48–56,192–196,648,650,654,784,813,1066,1130,1144,1148,1204,1206,1217` | broken hearts/stars/music/status glyphs | audited heart/life, star, music, check/close glyphs | Protected file | GamePage exception ticket + written justification + explicit approval |
| EX-002 | `src/pages/Settings.jsx:63` | corrupted settings glyph | settings icon | Settings remediation explicitly excluded from 0R.1A | Separate Phase 0R authorization |
| EX-003 | `src/pages/usePracticeLogDashboard.js:3,27,31–32,37,42,50,62,118,138,185–186,234,243,264–268,279–283,294–296,309–311,319,321–322` | encoded rules/dashes/middle dots | audited rules, em dashes, `·` | Dashboard data-hydration hook; protected-flow membership | Written protected-flow justification + explicit approval |
| EX-004 | `src/pages/TeacherDashboard.jsx` inventory lines | corrupted icons/arrows/status separators | audited corresponding glyphs | Dashboard load/data hydration protected flow | Written protected-flow justification + explicit approval |
| EX-005 | `src/pages/ParentDashboard.jsx:28,37,42,84,98` | corrupted quick-action glyphs | play/message/calendar/support glyphs | Dashboard load/data hydration protected flow | Written protected-flow justification + explicit approval |
| EX-006 | `src/pages/AdminDashboard.jsx` inventory lines | corrupted rules/icons/currency | audited rules/icons and `$4.8K`, `$1,200`, `$2,710` | Dashboard load/data hydration protected flow | Written protected-flow justification + explicit approval |
| EX-007 | `src/pages/AmbassadorDashboard.jsx` inventory lines | corrupted action/trend/status glyphs | audited corresponding glyphs | Dashboard load/data hydration protected flow | Written protected-flow justification + explicit approval |
| EX-008 | `src/pages/TeacherTamiDashboard.jsx:19–20,155,183,247,263,286,302` | corrupted status/action glyphs | warning/check/trend/action glyphs | Dashboard surface; protection status uncertain | Explicit protection determination and approval |
| EX-009 | `src/pages/TamiDashboard.jsx:35` | corrupted intelligence glyph | dashboard/intelligence glyph | Dashboard surface; protection status uncertain | Explicit protection determination and approval |
| EX-010 | `src/components/TamiChat.jsx` inventory lines | encoded rules/arrows/em dashes | audited Unicode rules/arrows/dashes | Shared protected-dashboard surface; status uncertain | Explicit protection determination and approval |
| EX-011 | `src/lesson_engine/perception_integration.js:3,7–13,35,37,82–84,111,155,227,292,373,375` | double-encoded rules/arrows/dash | audited Unicode rules/arrows/dash | Lesson-engine path; session forbids lesson-logic changes and status is uncertain | Explicit lesson-engine approval |

Registration, Login, WYLPracticeLive, lessonDataLoader, preserved gates, and protected JSONs had no separate inventoried row in `ENCODING_AUDIT.md`; they remain untouched.
