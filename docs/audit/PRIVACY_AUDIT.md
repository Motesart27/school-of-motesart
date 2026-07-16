# Privacy Audit

Source: `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`  
Disposition: inventory only; no value or behavior changed.

- `src/pages/Settings.jsx:80–81` contains a hard-coded support email address and telephone number.
- `teacher-dashboard-v3.html` contains real-looking student first names and zero-engagement statistics.
- `src/pages/teacher-dashboard-v3.jsx` includes named student fixtures: Luke Valdez, Dwain M, Renee Taylor, and Sofia L.
- Parent, teacher, leaderboard, and TAMi surfaces include named or family-shaped sample fixtures whose real/fictional status is not established by code.
- `src/pages/Login.jsx:133–139` exposes server wake-up/status controls and infrastructure language.
- A repository handoff contains a test-account credential. It is not reproduced here.

No conclusion is made about whether named fixtures are real people. Settings, Login, fixture, credential, and prototype remediation remain outside Phase 0.
