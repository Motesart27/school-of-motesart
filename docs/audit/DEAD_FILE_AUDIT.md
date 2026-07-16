# Dead File Audit

Source: `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`  
Method: `rg` reference/import census.  
Disposition: candidates only; no deletion.

| Candidate | Import/reference result |
|---|---|
| `teacher-dashboard-v3.html` | No runtime import; standalone root prototype |
| `src/pages/teacher-dashboard-v3.jsx` | No route or runtime import |
| `src/pages/StudentDashboard.jsx.save` | No runtime import |
| `src/components/MiniCoachCard.jsx` | No importer found |
| `src/pages/MyCoach.jsx` | No importer found; routed page is `MyCoachPage.jsx` |
| `src/pages/WYLPractice.jsx` | No importer found; deprecated; canonical route uses `WYLPracticeLive.jsx` |
| `public/logo-anim.mp4.mp4` | No source reference found |
| `src/pages/GamesDashboard.css` lines approximately 357–524 | selectors not found in current JSX |
| Unused page assets | `image2`–`image11`, `amb3`, `amb4`, and a source avatar duplicate have no discovered runtime reference; `amb1`, `amb2`, and `image1` are referenced |

Dynamic references and operational use require separate validation before deletion. Phase 0 performs no cleanup.
