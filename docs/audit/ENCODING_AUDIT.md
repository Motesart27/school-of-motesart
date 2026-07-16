# Encoding Audit

Source: `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`  
Method: UTF-8 replacement/mojibake pattern scan of `src/`, followed by rendered-route inspection.  
Disposition: inventory only; no literal was replaced.

## Inventory and intended rendering

| File | Lines / occurrences | Corrupted family | Intended rendering |
|---|---|---|---|
| `src/lesson_engine/perception_integration.js` | 3, 7–13, 35, 37, 82–84, 111, 155, 227, 292, 373, 375 | double-encoded box drawing, arrows, em dash | Unicode box rules/arrows/em dash in comments only |
| `src/components/MiniCoachCard.jsx` | 2, 37, 104 | encoded em dash/box rule | em dash and box rule comments |
| `src/components/TamiChat.jsx` | 107, 133–152, 169, 179, 184, 203, 232, 291, 342, 604, 945, 1011 | encoded rules, arrows, em dashes | Unicode rule/arrows/em dashes |
| `src/pages/usePracticeLogDashboard.js` | 3, 27, 31–32, 37, 42, 50, 62, 118, 138, 185–186, 234, 243, 264–268, 279–283, 294–296, 309–311, 319, 321–322 | encoded rules, em dashes, middle dot | rule/em dash/middle dot (`·`) |
| `src/pages/MoveItChapter.jsx` | 304, 313 | double-encoded em dash; encoded arrows | em dash; `3→4` and `7→8` |
| `src/pages/PracticeLogPage.jsx` | 5, 8, 50, 290, 300, 332, 436, 472, 706 | encoded rules and close glyph | rule comments; close `×` |
| `src/pages/GamePage.jsx` | 48–56, 192–196, 648, 650, 654, 784, 813, 1066, 1130, 1144, 1148, 1204, 1206, 1217 | broken hearts, stars, music/status glyphs | heart/life, star, music, check/close glyphs; protected-file remediation deferred |
| `src/pages/Settings.jsx` | 63 | corrupted settings/icon glyph | intended settings icon; privacy defaults separately inventoried |
| `src/pages/AmbassadorDashboard.jsx` | 67, 127, 185, 219, 231, 277–279, 382, 408–411, 438, 441, 446, 461, 479, 489, 536, 539, 568, 667, 750, 784, 859, 973, 992, 1014 | corrupted action, trend, status and decorative glyphs | corresponding arrow/check/link/chart/decorative icons |
| `src/pages/TeacherTamiDashboard.jsx` | 19–20, 155, 183, 247, 263, 286, 302 | corrupted status/action glyphs | warning/check/trend/action icons |
| `src/pages/ParentDashboard.jsx` | 28, 37, 42, 84, 98 | corrupted quick-action glyphs | play/message/calendar/support icons |
| `src/pages/TeacherDashboard.jsx` | 10–33, 142, 146, 183, 187, 219, 225–226, 250, 259, 261, 277, 282, 288, 307–309, 314, 331–336, 343, 345–348, 352–355, 360, 381, 390, 401, 415, 424, 453, 462, 500, 503–506, 514 | corrupted icons/arrows/status separators | corresponding navigation, trend, status and action glyphs |
| `src/pages/TamiDashboard.jsx` | 35 | corrupted TAMi/dashboard glyph | intended dashboard/intelligence icon |
| `src/pages/AdminDashboard.jsx` | 2–3, 9, 24, 26, 84, 86, 117, 119, 127, 167, 169, 191, 193, 199, 218, 220, 270, 272, 331, 333, 380, 382, 436, 438, 469, 471, 474–475, 508, 510, 542, 544 | corrupted rules/icons and currency strings | rules/icons; `$4.8K`, `$1,200`, `$2,710` |

No Unicode replacement character (`U+FFFD`) was found. Several files contain multiple encoding generations (`â…`, `Ã¢…`) rather than invalid UTF-8 bytes. The intended renderings above are specifications for a separately authorized remediation phase, not changes made here.
