# Route Truth

Source: `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`  
Router: `src/App.jsx`  
Formal route-pattern count: 34

| Route | Current behavior | Fixture |
|---|---|---|
| `/`, `/login`, `/register` | Public | public |
| `/dashboard` | Role redirect; student fixture ends at `/student` | student |
| `/student` | ProtectedRoute | student |
| `/tami` | ProtectedRoute; **student-reachable** | student |
| `/game`, `/games`, `/homework`, `/leaderboard` | ProtectedRoute | student |
| `/practice`, `/practice-log`, `/session-summary`, `/settings`, `/my-coach` | ProtectedRoute | student |
| `/practice-live` | ProtectedRoute | student |
| `/practice/:conceptId` | ProtectedRoute; `C_MAJOR_GATE_FIND_HOME` representative | student |
| `/play-it`, `/find-it`, `/move-it`, `/own-it` | ProtectedRoute | student |
| `/dpm-playground` | ProtectedRoute; **student-reachable** | student |
| `/rhythm-racer` | ProtectedRoute | student |
| `/teacher`, `/teacher-tami`, `/wyl-practice-staff`, `/curriculum`, `/concept-health` | TeacherRoute | teacher |
| `/parent` | ParentRoute | parent |
| `/admin` | AdminRoute | admin |
| `/ambassador` | AmbassadorRoute | ambassador |
| `/wyl-practice`, `/live-practice` | Redirect to `/practice-live` | student |
| unmatched route fixture | Wildcard redirect to `/` | public |

The census differs from the target strategy because `/tami` and `/dpm-playground` are currently student-reachable and the future role-aware route split is not present. Phase 0 records these facts without changing guards, redirects, or route definitions.
