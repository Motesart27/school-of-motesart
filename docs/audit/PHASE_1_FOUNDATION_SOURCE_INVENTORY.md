# Phase 1 Foundation Source Inventory

Date: 2026-07-16

Controlling source: `7d3794c3a9ebc8266b72ed9d1163a8ec96d645ee`

Session: Phase 1 Session 1A, inventory and preview only

No product, runtime, route, configuration, font-loader, dependency, or protected file was changed while producing this inventory.

## Color and token sources

The current repository has two explicit theme sources and extensive page-local styling:

| Source | Current role | Disposition |
|---|---|---|
| `src/styles/theme.js` | Legacy JS constants imported by Registration and PracticeConceptView | Keep temporarily; add a deprecation notice only in the separately approved Phase 1D session. It is not the Phase 1 authority. |
| `tailwind.config.js` | Emergent Tailwind palette, shadows, radii, and role colors | Keep temporarily; add a deprecation marker only in Phase 1D. It already contains several future canonical values. |
| Inline JSX style objects and embedded CSS | Page/component-local palettes, spacing, radii, shadows, and z-index | Legacy. Do not migrate repository-wide in Phase 1. New or deliberately migrated work must use the future token contract. |
| Page/component `@import` and injected Google Fonts links | Local typography loading | Legacy duplicate loaders; later Phase 1B will centralize only after approval. |

A lexical scan of 109 `.js`, `.jsx`, `.css`, and `.html` files under `src/` found color literals in **63 files**, with **6,015 occurrences** and **1,140 case-normalized literal strings**. Counts include repeated literals, gradients, comments, CSS embedded in JS, and named colors; they measure fragmentation, not 1,140 intended design tokens. The highest-count files were PracticeLogPage (360), TeacherDashboard (338), GamePage (319), AmbassadorDashboard JSX (232), StudentDashboard (226), AmbassadorDashboard CSS (216), AdminDashboard CSS (188), TeacherTamiDashboard (169), RhythmRacer (168), and HomeworkDashboard (167).

### Canonical versus conflicting values

| Concept | Phase 1 canonical contract | Current conflicts/examples | Treatment |
|---|---|---|---|
| Teal | `#14B8A6`; hover `#2DD4BF`; deep `#0D9488` | Legacy theme uses `#4ecdc4` and `#38b2ac`; Practice Live uses additional local teal values | Canonical in future tokens; legacy values may remain outside migrated scope. Protected/surgical files require their own gate. |
| TAMi identity | `#E84B8A` → `#A855F7` | Legacy primary gradients use violet/magenta variants; some pages use orange with magenta | Canonical only for TAMi identity; not a generic button gradient. |
| Coach | `#F97316`, soft `rgba(249,115,22,0.12)` | Legacy gold/orange values include `#F5A623`, `#e8622a`, and other local oranges | Coach semantic only; teacher role remains `#F5A623`. |
| Role accents | student `#14B8A6`, teacher `#F5A623`, parent `#3B82F6`, ambassador green `#22C55E`, admin `#F97316` | Tailwind largely agrees; local dashboards duplicate or diverge | Canonical in future tokens. Strategy does not specify the ambassador gold partner; that value remains unresolved. |
| DPM | Drive `#3B82F6`, Passion `#F97316`, Motivation `#22C55E` | DPM Playground and dashboards contain local variants | Canonical only when explicitly labeled by dimension. |
| Chart categorical | `#14B8A6`, `#A855F7`, `#38BDF8`, `#F5A623`, `#EC4899`, `#94A3B8` | Practice Log currently derives multiple local chart colors and uses Chart.js configuration literals | Future ChartFrame contract; no migration in 1A. |

Current radius systems range from square/4/6/8/10/12/14/16/20/24/30px to fully rounded controls. The contract narrows new/migrated work to chart/control `12px`, card `16px`, and pill `999px`. Current spacing is mostly arbitrary inline pixel values; the contract establishes a 4px base with 8/12/16/24/32/48px rhythm. Current shadows and glows vary broadly; the contract limits the standard card shadow to `0 4px 24px rgba(0,0,0,0.35)` and a selected/focus glow to the active accent at 25%, used sparingly. Z-index values are local and uncoordinated; observed UI layers include ordinary content, floating panels near 20, and overlays/modals at higher page-local values. The strategy supplies no exact z-index scale, so 1A does not invent one.

Values prohibited in new or migrated files include raw semantic color literals, legacy teal as the primary learning accent, unlabeled status color, decorative TAMi gradient use, arbitrary radius/spacing values where a contract token exists, and new page-local font loaders. Protected-file literals remain untouched until their named approval gate.

## Typography inventory

Nineteen tracked files reference `fonts.googleapis.com` (including the preserved dead `.save` file). Loader mechanisms are:

- `index.html`: one document link requesting DM Sans 300–800 and Syne 400/600/700/800.
- Runtime-created links: StudentDashboard requests DM Sans + Outfit; TamiChat requests Righteous.
- Embedded CSS `@import`: Practice Log, WYLPractice, Admin/Ambassador/Games dashboards, Teacher/Teacher-TAMi dashboards, Registration, WYLPracticeLive/Staff, PracticeConceptView, PracticeSessionCockpit, and the three preserved gates.
- The dead `StudentDashboard.jsx.save` also contains a runtime link pattern but is not active code.

Font-family references appear in 55 source files. Referenced families include DM Sans, Outfit, Syne, Inter, Orbitron, Georgia, Righteous, Segoe UI, system-ui, `-apple-system`, and generic sans-serif/monospace fallbacks. Inter is concentrated in dashboard/game styles; Orbitron is GamesDashboard-only; Righteous is TamiChat-only; Georgia appears in a small number of page treatments. Syne is loaded by `index.html` but is not part of the controlling Phase 1 typography contract.

The intended Phase 1B contract is exactly DM Sans 400/500/700 for body and controls and Outfit 500/600/700 for headings, loaded once. No production Syne load is permitted after that approved implementation. Per-page loaders in protected/preserved/surgical files cannot be silently removed; Phase 1B must prove the one-time loader does not break those flows and must defer any source deletion requiring a separate protected approval.

## Shared component inventory

There is no current generic foundation library for Button, Card, StatusPill, Input, Select, Tabs, FilterChips, Tooltip, Modal, Drawer, Toast, Skeleton, EmptyState, ErrorState, or ChartFrame.

| Existing source | Verified present use | Disposition |
|---|---|---|
| `ErrorBoundary.jsx` | Application error boundary | Reuse as application boundary; it is not the future inline ErrorState. |
| `MetronomeControl.jsx` | Practice-specific control | Leave specialized; do not force into a generic primitive. |
| `MotesartCoachCard.jsx` | Imported coach presentation | Adapt later only when its owning screen migrates. |
| `MiniCoachCard.jsx` | Phase 0R repaired but dead/unimported per audit | Do not call reusable merely by name; preserve until separately approved cleanup/migration. |
| `MyCoach.jsx` | Dead/unimported per audit | Preserve for design review; not a foundation source. |
| PracticeConceptView/PracticeSessionCockpit/ProofLoopPanel/TeachingVisuals | Practice-domain components | Leave domain-specific. PracticeSessionCockpit is a visual craft reference, not a primitive source. |
| TamiChat/TamiAdminBrief/TamiInterventionQueue/TamiParentSummary | TAMi/dashboard-specific components | Protected or dashboard-flow work; not automatic Phase 1 migration. |
| AmbassadorBubble/TelemetryPanel | Feature-specific presentation | Evaluate only in owning feature phase. |

Button, card, form, tab/filter, modal, toast, skeleton, empty/error, tooltip, and status-pill patterns are currently duplicated inline across pages. Existing behavior must be evaluated screen by screen; Phase 1C may add primitives without mass conversion.

## Chart.js and Practice Log census

- Chart.js 4.4.1 is loaded globally from jsDelivr in `index.html`.
- `src/pages/PracticeLogPage.jsx` reads `window.Chart`, creates four line/bar configurations, and renders one canvas.
- No other active source invokes `window.Chart`, `new Chart`, or a Chart.js import. Comments mentioning charts are not consumers.
- Practice Log uses current local/static demonstration structures for trend, goal-versus-actual, category, and per-student series. It labels values in minutes and contains local legend/tooltip semantics.
- Removing the CDN is operationally safe only after an approved PracticeLog ChartFrame/static-SVG migration has been verified and a repository-wide reference census remains zero. It is not safe to remove it in 1A or before that replacement lands.

## `/dev/kit` route feasibility

`src/App.jsx` defines all routes and inline guard components. `AdminRoute` already requires an authenticated `admin` role and redirects other roles to `/student`. No established general feature-flag convention for development routes was found.

The safest future plan is an explicitly approved Phase 1C change that:

1. gates module inclusion and route rendering behind one named build-time flag;
2. wraps `/dev/kit` in the existing `AdminRoute` without altering the guard;
3. omits every link from public, student, parent, teacher, and ambassador navigation;
4. defaults the flag to off, making rollback removal of the flag/route a single-commit revert;
5. verifies direct navigation as public/student fails through existing guard behavior.

Adding the route necessarily changes `src/App.jsx`, which is route configuration and therefore requires the separately reviewed Phase 1C authorization. The future session must not refactor guards, roles, AuthContext, or route order while adding it.

## Protected and deferred boundary

No proposal in this inventory authorizes edits to Registration, Login/Auth, GamePage, dashboards/data hydration, preserved gates/data, WYLPracticeLive, lessonDataLoader, lesson logic, role permissions, API contracts, or unavailable Rhythm Racer collision work. Their literals, loaders, and glyphs are evidence for later named approvals—not automatic foundation migration targets.
