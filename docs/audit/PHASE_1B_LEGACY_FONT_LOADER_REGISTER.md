# Phase 1B Legacy Font Loader Register

Phase 1B establishes one canonical document-level request for DM Sans 400/500/700 and Outfit 500/600/700. It does **not** claim repository-wide removal of local loaders. The census below records every tracked local loader found at the Phase 1B starting commit.

| Loader path | Families and weights | Canonical coverage | Classification / future owner | Additional request when active | Blocks 1B |
|---|---|---|---|---|---|
| `src/pages/StudentDashboard.jsx` | DM Sans 400/500/600; Outfit 400/500/600/700/800 | Partial; 400/600/800 differ | Protected dashboard hydration; Phase 3 student migration | Yes, when mounted | No—documented debt |
| `src/pages/AdminDashboard.css` | DM Sans 400/500/600/700/800; Outfit 400/600/700/800 | Partial | Dashboard; Phase 6 admin | Yes, when CSS loads | No |
| `src/pages/AmbassadorDashboard.css` | DM Sans 400/500/600/700/800; Outfit 400/600/700/800 | Partial | Dashboard; Phase 6 ambassador | Yes, when CSS loads | No |
| `src/pages/GamesDashboard.css` | Orbitron 400/600/700/800/900; Inter 300/400/500/600/700 | Not covered; specialty legacy | Games redesign; Phase 7 | Yes | No |
| `src/pages/TeacherDashboard.jsx` | Inter 300–900 | Not covered | Protected dashboard hydration; Phase 4 teacher | Yes, when mounted | No |
| `src/pages/TeacherTamiDashboard.jsx` | Inter 300–900 | Not covered | Dashboard/TAMi; Phase 4/5 route consolidation | Yes, when mounted | No |
| `src/pages/PracticeLogPage.jsx` | DM Sans 400/500; Outfit 500/600 | Fully covered | Non-protected chart page; Phase 1D | Browser may coalesce cached faces, but the stylesheet URL is additional | No |
| `src/pages/Registration.jsx` | Outfit 600/700/800; DM Sans 400/500/600 | Partial | Protected Registration flow; explicit exception gate | Yes, when mounted | No |
| `src/pages/WYLPractice.jsx` | DM Sans 300–700 variable/italic; Outfit 400–800 | Partial | Audited dead legacy page; Phase 10 cleanup decision | No active importer found | No |
| `src/pages/WYLPracticeLive.jsx` | DM Sans 300–700 variable/italic; Outfit 400–800 | Partial | Surgical-only Practice Live; owning protected migration | Yes, when mounted | No |
| `src/pages/WYLPracticeStaff.jsx` | Outfit 400–800; DM Sans 400/500 | Partial | Teacher specialty route; owning design phase | Yes, when mounted | No |
| `src/components/PracticeConceptView.jsx` | DM Sans 300–700; Outfit 400/600/700/800 | Partial | Rendered inside surgical Practice Live; owning protected migration | Yes, when component renders | No |
| `src/components/PracticeSessionCockpit.jsx` | DM Sans 300–700; Outfit 400–800 | Partial | Rendered inside surgical Practice Live; owning protected migration | Yes, when component renders | No |
| `src/components/TamiChat.jsx` | Righteous regular via runtime-created link | Not covered | Dashboard/TAMi protected-flow work; Phase 5/6 | Yes, when Ambassador chat mounts | No |
| `src/components/gate0/MajorScalePatternGate.jsx` | DM Sans 300–700; Outfit 400/600/700/800 | Partial | Preserved gate | Yes, when gate mounts | No |
| `src/components/gate0/FindHomeGate.jsx` | DM Sans 300–700; Outfit 400/600/700/800 | Partial | Preserved gate | Yes, when gate mounts | No |
| `src/components/gate0/SkipAndTogetherGate.jsx` | DM Sans 300–700; Outfit 400/600/700/800 | Partial | Preserved gate | Yes, when gate mounts | No |
| `src/pages/StudentDashboard.jsx.save` | DM Sans 400/500/600; Outfit 400–800 via runtime link code | Partial | Preserved dead-file candidate; later cleanup approval | No active source execution | No |

## Disposition

- Canonical document stylesheet count: **1**.
- Canonical document families: **DM Sans and Outfit only**.
- Canonical approved weights: **DM Sans 400/500/700; Outfit 500/600/700**.
- Canonical Syne requests: **0**.
- New page-local loaders introduced: **0**.
- Tracked local loader locations preserved: **18** outside `index.html`, including one dead `.save` source and one unimported legacy page.
- These loaders can create additional stylesheet/font requests on their owning routes. They are explicit migration debt and do not block Phase 1B because modifying them would cross protected, preserved, specialty, dashboard, or later-phase boundaries.
