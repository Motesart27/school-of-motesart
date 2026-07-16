# PROJECT BRAIN — School of Motesart (SOM)
> **Last Updated:** 2026-06-01
> **Stable Version:** v2.1.0
> **Status:** Production — Live on Railway
> **Owner:** Denarius Motes (@Motesart27)

---[PROJECT_BRAIN_SESSION_UPDATE.md](https://github.com/user-attachments/files/26125434/PROJECT_BRAIN_SESSION_UPDATE.md)## SESSION UPDATE — 2026-03-19
### Jean (VP HR) — Student Dashboard Design Sprint

**What was designed/decided this session:**

---

### STUDENT DASHBOARD — HOME PAGE (APPROVED ✓)

**Layout top to bottom:**
1. Smart top strip — two states, one slot:
   - GREEN/good day = T.A.M.i affirmation strip (pink border)
   - ORANGE/RED/bad day = red alert bar with "View Homework" link
2. Today's Focus card (dark teal) — teacher-assigned priority + "Start Practice" button → routes to Live Practice
3. Three stat cards: Current Level | Assignments Due | Day Streak
4. My Coach banner (full width) — avatar circle, coach name, teaching style tag, Preview Voice button, Change Coach link
5. Two-column cards (equal height):
   - Left: Today's Practice Goal — large number + horizontal progress bar + 7-day sparkline bar chart (NO ring/circle)
   - Right: DPM Score — multicolor donut (Drive=blue, Passion=orange, Motivation=green) + legend
6. Community card (full width) — shoutout feed + shared class goal bar + "See All" link
7. T.A.M.i floating bubble — bottom right corner, avatar + speech bubble

**Removed from home:** Practice timer, ring from practice goal, "or open Live Practice" link, streak from sidebar, "Piano · Motesart" from sidebar

---

### LEFT NAVIGATOR (APPROVED ✓)

**Structure — flat, no accordion, section titles clickable to reveal sub-items:**

| Section | Sub-items (= landing pages) |
|---|---|
| 🏠 Home | Home |
| 📚 Learn | Homework, Live Practice, Games, Practice Log, My Progress, Resources |
| 🎭 Perform | Recitals, My Music |
| 🌐 Connect | Community |
| *(divider)* | |
| *(no section)* | Help Center (circle ? icon), Settings |

**Nav rules:**
- Section names always visible
- Click section → reveals sub-items underneath (accordion style — others close)
- Sub-items have NO icons — text only
- Support (Help Center + Settings) always visible below divider, never collapses
- My Coach removed from nav — lives as banner card on home dashboard instead

---

### IDENTITY STRIP (TOP LEFT SIDEBAR) — APPROVED ✓

**Universal rules per role:**

| Role | Line 1 | Line 2 | Line 3 |
|---|---|---|---|
| Student (School) | Name | Student | Grade Level · Instrument · School Name |
| Student (Standalone) | Name | Student | Level 4 · Instrument · Independent |
| Teacher | Name | Teacher | Course Name ▾ (dropdown to switch courses) |
| Parent | Name | Parent | Child's account |
| Admin | Name | Admin | School of Motesart |
| Ambassador | Name | Ambassador | Instrument · Style |

**Key rule:** School students show Grade Level. Standalone students show Platform Level (L4). Teachers get a course switcher dropdown — switching course changes entire dashboard context.

---

### DESIGN SYSTEM (LOCKED ✓)

- Background: #0a0a0f
- Student accent: Teal #14b8a6
- Fonts: Outfit (headings/numbers, weight 600) | DM Sans (body, weight 400/500)
- Title Case: all labels, nav items, card headers, buttons
- Sentence case: descriptions, hints, timestamps, alerts
- Glass morphism cards: rgba(255,255,255,0.04) background, rgba(255,255,255,0.08) border
- DPM colors: Drive=#378ADD (blue) | Passion=#EF9F27 (orange) | Motivation=#22c55e (green)
- Alert: rgba(226,75,74,0.1) background, #f09595 text
- Affirmation: rgba(232,75,138,0.06) background, #e84b8a accent
- T.A.M.i bubble: pink-to-orange gradient #e84b8a → #f97316

---

### SCALING PLAN

**Phase 1 (current prototype):**
Home, Homework, Live Practice, Games, Practice Log, My Progress, Resources, Recitals, My Music, Community, Help Center, Settings

**Phase 2:**
- Recitals landing page
- My Music landing page
- Resources landing page
- Shoutouts as standalone feature

**Phase 3:**
- Challenges (classmate vs classmate)
- Expanded Games beyond Find the Note
- Deeper Community features

**Future consideration (parked):**
- Quick Access shortcuts based on real usage data

---

### TWO PRODUCT LEGS — KEY DISTINCTION

School environment and standalone environment share the same dashboard shell but differ in:
- Identity strip: Grade level vs Platform level
- Community: Class Feed with classmates vs Global community (TBD)
- Homework: Teacher assigned vs Self-directed or T.A.M.i suggested
- Resources: Teacher published vs Platform library

---

### PAGES TO DESIGN NEXT (in priority order — TBD with Motes)

- [ ] Homework landing page
- [ ] Live Practice landing page
- [ ] Games landing page
- [ ] Practice Log landing page
- [ ] My Progress landing page
- [ ] Community landing page
- [ ] Resources landing page
- [ ] Recitals landing page
- [ ] My Music landing page
- [ ] Help Center landing page
- [ ] Settings landing page
- [ ] Teacher Dashboard (with course switcher)
- [ ] Parent Dashboard
- [ ] Admin Dashboard

---

### THINGS TO DISCUSS WITH MOTES

1. Standalone student Community experience — global feed or school-only feature for now?
2. Which landing page to design next?
3. My Coach first-time selection onboarding experience




## 1. TECH STACK

### Frontend
- **Framework:** React 18.3.1 (Vite 5.4.2, ESM)
- **Routing:** react-router-dom 6.22.0
- **Styling:** Tailwind CSS 3.4.1 + custom CSS per dashboard
- **TTS Proxy:** Express.js (server.js) → Railway (protective-flow-production.up.railway.app)
- **Build:** Vite → static assets → Netlify CDN
- **Deployed on:** Netlify (site: 68b307a9-ef37-4298-9e72-805381200e1c)
- **Repo:** github.com/Motesart27/school-of-motesart (this repo)
- ⚠️ `motesart-frontend-production.up.railway.app` is a SEPARATE repo (Motesart OS dashboard). Do NOT verify SOM deploys there.

### Backend
- **Framework:** FastAPI (Python) with Pydantic models
- **AI Engine:** Anthropic Claude API (claude-sonnet-4-20250514) via AsyncAnthropic
- **Database:** Airtable (all student data, practice logs, homework, sessions, TAMi memory)
- **Airtable Client:** Custom httpx-based client (airtable_client.py)
- **Deployed on:** Railway (deployable-python-codebase-som-production.up.railway.app)
- **Repo:** github.com/Motesart27/Deployable-python-codebase-som (PRIVATE)

### External Services
- **ElevenLabs TTS** — Text-to-speech for TAMi and Motesart Coach voices
  - TAMi Voice: Juniper (ID: `aMSt68OGf4xUZXAnLpTU8`)
  - Motesart Coach Voice: Mark (ID: `UgBBYS2sOqTuMpoF3BR0`)
- **Anthropic Claude API** — Powers TAMi conversational AI
- **Airtable** — Primary database for all platform data
- **Netlify** — SOM frontend hosting (school-of-motesart repo, auto-deploys from main)
- **Railway** — Backend + TTS proxy hosting (Deployable-python-codebase-som repo, auto-deploys from main)

### Environment Variables
| Variable | Service | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Backend | Claude API access |
| `AIRTABLE_PAT` | Backend | Airtable data access — canonical going forward |
| `AIRTABLE_API_KEY` | Backend | Legacy/transition alias — removal is tracked work, not yet confirmed removed |
| `AIRTABLE_BASE_ID` | Backend | SOM database identifier |
| `ELEVENLABS_API_KEY` | Frontend/TTS proxy | TTS API access |
| `ELEVENLABS_TAMI_VOICE_ID` | Frontend/TTS proxy | TAMi voice (Juniper) |
| `ELEVENLABS_VOICE_ID` | Frontend/TTS proxy | Motesart Coach voice (Mark) |
| `PORT` | Frontend | Express server port (3000) |
| `VITE_API_URL` | Frontend | Backend URL for API calls |

---

## 2. ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                   │
│              Railway: motesart-frontend                │
│                                                       │
│  src/pages/          src/components/    src/services/  │
│  ├─ AdminDashboard   ├─ TamiChat.jsx   ├─ api.js     │
│  ├─ StudentDashboard ├─ MyCoach.jsx    └─ (API calls) │
│  ├─ TeacherDashboard ├─ MiniCoachCard                 │
│  ├─ ParentDashboard  └─ ErrorBoundary                 │
│  ├─ AmbassadorDashboard                               │
│  ├─ TamiDashboard                                     │
│  ├─ TeacherTamiDashboard                              │
│  ├─ HomeworkDashboard                                  │
│  ├─ Leaderboard                                       │
│  ├─ PracticeTracking                                   │
│  ├─ GamePage                                          │
│  ├─ SessionSummary                                     │
│  ├─ MyCoachPage                                       │
│  ├─ Settings                                          │
│  ├─ Login                                             │
│  └─ Registration                                      │
│                                                       │
│  server.js (Express) — TTS proxy + static serving     │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP (JSON + audio streams)
                       ▼
┌─────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                    │
│          Railway: deployable-python-codebase-som       │
│                                                       │
│  app/routers/        app/services/     app/models/    │
│  ├─ auth.py          ├─ tami_service   ├─ schemas.py  │
│  ├─ tami.py          └─ dpm_service    └─ (Pydantic)  │
│  ├─ students.py                                       │
│  ├─ homework.py      app/                             │
│  ├─ practice_logs.py ├─ airtable_client.py            │
│  ├─ sessions.py      └─ main.py (FastAPI app)         │
│  ├─ messages.py                                       │
│  └─ users.py                                          │
└──────────────────────┬────────────────────────────────┘
                       │ httpx (REST API)
                       ▼
┌─────────────────────────────────────────────────────┐
│                    AIRTABLE                            │
│                                                       │
│  Tables: Students, Practice Logs, Homework,           │
│          Sessions, TAMi Memory, Users, Messages       │
└───────────────────────────────────────────────────────┘
```

### Data Flow
1. **User opens app** → React loads → `useAuth()` checks `som_user` in localStorage
2. **User object:** `{ id, name, email, role, status }` — role determines dashboard routing
3. **TAMi Chat:** TamiChat.jsx → `api.chatWithTami(name, msg, history, currentPage, userRole)` → Backend `/tami/chat` → tami_service.py → Claude API → response
4. **TTS:** TAMi response text → Frontend server.js → ElevenLabs API → audio stream back to browser
5. **Student Data:** Backend routers → airtable_client.py → Airtable REST API

### Route Map
| Path | Page | Role Access |
|---|---|---|
| `/` | Home/Landing | Public |
| `/login` | Login | Public |
| `/register` | Registration | Public |
| `/student` | Student Dashboard | Student |
| `/teacher` | Teacher Dashboard | Teacher |
| `/parent` | Parent Dashboard | Parent |
| `/admin` | Admin Dashboard | Admin |
| `/ambassador` | Ambassador Dashboard | Ambassador |
| `/tami` | TAMi Dashboard | Student |
| `/teacher-tami` | Teacher TAMi Dashboard | Teacher |
| `/homework` | Homework Dashboard | Student/Teacher |
| `/leaderboard` | Leaderboard | All authenticated |
| `/practice` | Practice Tracking | Student |
| `/session-summary` | Session Summary | Student |
| `/game` | Music Game | Student |
| `/my-coach` | My Coach Page | All authenticated |
| `/settings` | Settings | All authenticated |

---

## 2b. AIRTABLE SCHEMA

> Base: **School of Motesart** (`appTN4wNd5Kgbqdwl`)
> Client: `airtable_client.py` — uses httpx + PAT auth

### Table Map (code key → Airtable table name)
| Code Key | Airtable Table Name | Purpose |
|---|---|---|
| `users` | Users | All platform users (login, roles, status) |
| `students` | Students | Student profiles, linked to practice/homework |
| `sessions` | Sessions | Practice sessions with timestamps + duration |
| `practice_logs` | Practice Logs | Detailed practice activity records |
| `homework_library` | Homework Library | Master list of available homework assignments |
| `homework_assignments` | Homework Assignments | Student-specific assigned homework |
| `student_instruments` | Student Instruments | Which instruments each student plays |
| `achievements` | Achievements | Badges, milestones, unlocked rewards |
| `messages` | Messages | In-app messaging between users |
| `assignments` | Assignments | General assignment tracking |

### Key Airtable Helpers (airtable_client.py)
- `airtable_get(table_key, params)` — GET records with optional filter/sort
- `airtable_get_record(table_key, record_id)` — GET single record by ID
- `airtable_post(table_key, fields)` — CREATE new record
- `airtable_patch(table_key, record_id, fields)` — UPDATE existing record
- `airtable_filter(field, value)` — Returns filterByFormula param string
- `airtable_patch(table_key, record_id, fields)` — PATCH a record's fields

### Known Field Patterns
- User records: `Name`, `Email`, `Role`, `Status`
- Student records: linked to User, contain instrument + teacher references
- Practice Logs: `Student` (linked), `Date`, `Duration`, `Instrument`, `Notes`
- Sessions: `Student` (linked), `Start`, `End`, `Type`
- Homework: `Title`, `Description`, `Due Date`, `Student` (linked), `Status`

> ⚠️ **IMPORTANT:** The frontend `som_user` localStorage object only stores `{ id, name, email, role, status }`. It does NOT include age, instrument, or teacher info — those must come from Airtable lookups on the backend.

---

## 3. WHAT'S BUILT — LOCKED IN

> ⚠️ **LOCKED IN — DO NOT REWRITE** unless explicitly requested by Motes.
> These features are working in production. Surgical edits only.

### Core Platform
- [x] **Authentication system** — Login/Registration with role-based routing
- [x] **Role-based dashboards** — Student, Teacher, Parent, Admin, Ambassador (each with custom CSS)
- [x] **Airtable integration** — Full CRUD for students, practice logs, homework, sessions, messages
- [x] **DPM scoring engine** — `dpm_service.py` computes student performance metrics
- [x] **Express TTS proxy** — `server.js` handles ElevenLabs API calls from frontend

### T.A.M.i V2 (Teaching Assistant for Musical Intelligence)
- [x] **Conversational AI engine** — Claude-powered, context-aware responses
- [x] **ElevenLabs TTS voice** — Juniper voice, auto-play audio in chat
- [x] **Page/dashboard awareness** — TAMi knows which dashboard the user is on (useLocation + PAGE_DESCRIPTIONS map)
- [x] **User role awareness** — TAMi adapts behavior based on student/teacher/parent/admin role
- [x] **Age-adaptive personality** — System prompt adjusts tone for ages 5-7, 8-12, 13-17, 18+
- [x] **Pronunciation rule** — "Motesart" written as "Motes-Art" for correct TTS pronunciation
- [x] **Greeting system** — Personalized welcome messages based on user name, role, and current page
- [x] **Quick action buttons** — "How am I doing?" and "Help me understand my dashboard"
- [x] **Voice mode** — Separate endpoint with shorter response formatting
- [x] **Chat widget** — Floating TAMi avatar, expandable chat panel with gradient header
- [x] **Host/narrator personality** — TAMi is a guide, NOT a coach (coaches are Motesart and teachers)

### Design System (LOCKED)
- [x] **Dark UI theme** — Dark backgrounds, glassmorphism cards
- [x] **Typography** — DM Sans / Outfit
- [x] **Role-specific color coding:**
  - Student: Teal/cyan
  - Teacher: Gold/amber
  - Ambassador: Blue
  - Admin: Orange
  - Parent: Purple/pink
- [x] **TAMi gradient header** — Orange-to-pink gradient on chat widget
- [x] **Motesart avatar** — Used in UI, never replaced with emoji (Rule #3)
- [x] **T.A.M.i avatar** — Character illustration for chat widget (Rule #4)

---

## 4. DEVELOPMENT RULES

> These rules apply to every AI session working on this project.

### Code Workflow Rules
1. **Visual approval before code** — Always show a rendered preview of changes and get explicit user confirmation before committing. HIGH PRIORITY.
2. **GitHub Web UI only for pushing** — All code pushes go through the GitHub web editor. No CLI git push. (Rule #6)
3. **Read live file before editing** — Always fetch the current file from GitHub before making changes. Never edit from memory. (Rule #8)
4. **Surgical edits only** — Make the smallest possible change. Don't rewrite entire files.
5. **No silent dependency changes** — Never add, remove, or upgrade packages without explicit approval.
6. **Heredoc for large files** — Use bash_tool heredoc syntax for files over ~50 lines. (Rule #7)
7. **CodeMirror editor access** — GitHub's editor uses: `document.querySelector('.cm-content').cmTile.view` (property is `cmTile`, NOT `cmView`)

### Protection Rules
8. **Never rewrite locked features** — Anything marked "LOCKED IN" in Section 3 must not be rebuilt or replaced.
9. **Pre-feature checkpoint** — Before starting any new feature, tag the current stable state.
10. **Budget-conscious deploys** — Railway auto-deploys from main. Be aware that every commit triggers a deploy.
11. **Test after deploy** — Always hard-refresh the live site and verify changes work after committing.

### TAMi-Specific Rules
12. **Motesart avatar only** — Never use emoji in place of the Motesart character avatar. (Rule #3)
13. **T.A.M.i avatar only** — Never use emoji in place of the TAMi character illustration. (Rule #4)
14. **Pronunciation** — Always write "Motesart" as "Motes-Art" in any text TAMi will speak aloud.
15. **TAMi is NOT a coach** — She is the host, narrator, and teaching assistant. Coaches are Motesart and the teachers.

---

## 5. DESIGN SYSTEM

### Colors
```
Background:       #0f0f1a (deep dark navy)
Card Background:  #1a1a2e (dark card)
Glass Effect:     rgba(255,255,255,0.05) with backdrop-blur

Student (Teal):   #00d4aa / #0ff
Teacher (Gold):   #f5a623 / #ffd700
Ambassador (Blue):#4a90d9 / #60a5fa
Admin (Orange):   #ff6b35 / #f97316
Parent (Purple):  #a855f7 / #c084fc

TAMi Gradient:    linear-gradient(135deg, #ff6b35, #e91e8c)
Success Green:    #10b981
Danger Red:       #ef4444
```

### Typography
```
Primary Font:    'DM Sans', sans-serif
Secondary Font:  'Outfit', sans-serif
Headings:        Outfit, bold
Body:            DM Sans, regular
```

### Component Patterns
- **Dashboard cards:** Dark glassmorphism with role-colored accents
- **Stat numbers:** Large, bold, role-colored
- **Buttons:** Rounded, role-colored backgrounds with white text
- **Chat widget:** Fixed bottom-right, floating TAMi avatar trigger, expandable panel
- **Navigation:** Top bar with role indicator and TAMi button

---

## 6. CHANGELOG

> Update this section at the end of every productive session.

### 2026-04-24 — Practice Live Full Deploy + Academic Homework Mode End-to-End

**Session scope:** Two back-to-back work blocks. Block 1 deployed the Practice Live view layer (Cockpit + Concept + config). Block 2 wired homework → game → practice-live and built Academic Mode top to bottom.

---

#### Commit 1 — `2023f8d` feat: add Practice Live Session Cockpit view
**What it did:** Created `src/components/PracticeSessionCockpit.jsx` (View 1 of Practice Live). Full-screen session intro: animated energy rings, concept mastery progress bar with Find It / Play It / Own It stage labels, last session recap card, assignments due card, Motesart suggestion bubble, and Begin Session button that transitions to View 2.

---

#### Commit 2 — `295a135` feat: add Practice Live Concept View (View 2)
**What it did:** Created `src/components/PracticeConceptView.jsx`. 8-key piano with animated SVG arrow overlay between highlighted keys, phase flow dots (Teach → Guide → Confirm → Release), Motesart speech card (72px avatar, speaking bars, Replay button wired to TTS), answer option grid, BPM control, home key toggle, and session stats footer. Wired into `WYLPracticeLive.jsx` via `practiceView` state variable — lesson engine, TTS, and speech recognition left untouched.

---

#### Commit 3 — `15fb5c5` feat: wire concept view config — T_HALF_STEP dynamic props
**What it did:** Created `src/config/conceptViewConfig.js` — centralized config object for concept-driven props (piano keys, arrow overlays, answer options, BPM range, label text) keyed by concept ID. Wired into `PracticeConceptView.jsx` and `WYLPracticeLive.jsx` so all concept-specific behavior is data-driven, not hardcoded. Added `speakText` helper to `src/services/api.js` for TTS proxy calls from the Replay button.

---

#### Commit 4 — `a77754e` feat: game reads URL params, homework routes by type, unify start practice
**What it did:**
- `GamePage.jsx`: Added `useSearchParams` to read `?mode=`, `?concept=`, `?assignment_id=` on mount. Initialized `mode` state from URL (`academic` vs `game`). Added `isHomeworkSession` flag (`!!(urlAssignmentId && urlMode === 'academic')`). Mode toggle button disabled when `isHomeworkSession` is true with "Academic Mode — assigned by teacher" subtext. Added `completeAssignment` placeholder and `conceptDisplayName` formatter.
- `HomeworkDashboard.jsx`: Added `useNavigate`. Added Launch button to each assignment card — routes to `/game?mode=academic&concept=T_HALF_STEP&assignment_id={id}` for Quiz type, `/practice-live?concept=T_HALF_STEP&assignment_id={id}` for Homework type.
- `StudentDashboard.jsx`: Unified Start Practice — Sidebar Quick Links `navigate('/practice')` changed to `navigate('/practice-live')`.

---

#### Commit 5 — `cdf823a` feat: academic mode UI and assignment completion signal
**What it did:**
- `GamePage.jsx`: Added purple academic banner above action buttons (`rgba(217,70,239,.1)` background, `#d946ef` text, "Academic Session — {conceptDisplayName}" header + "Assigned by your teacher" subtext).
- Leaderboard submit guarded: `if (!isHomeworkSession) { await fetch(…/leaderboard/submit) }` — free-play still submits, homework never does.
- On academic session end: calls `completeAssignment(urlAssignmentId)` and updates `concept_state_store.js` with `getState`/`setState` — increments `attempts`, blends `confidence` score, sets `last_session_date` and `ownership_state`.
- Game Over modal: title changes to "Assignment Complete!" for homework sessions, subtitle shows concept name, leaderboard points block hidden.

---

#### Commit 6 — `43a67b5` design: remove DPM card, green ABC toggle, hide replay counts in academic mode
**What it did:**
- `GamePage.jsx`: Removed DPM tracking card entirely (`{mode==='academic' && <div className="gp-dpm-bar">…</div>}` block deleted).
- ABC/# notation toggle restyled to pill buttons: active state = `#10b981` green solid fill + white text + no border; inactive state = `rgba(255,255,255,.06)` fill + `rgba(255,255,255,.4)` dimmed text + faint border. Replaces the previous flat unstyled toggle.
- Replay counts (scale replays, find-note replays) wrapped in `{!isHomeworkSession && <span>({count})</span>}` — counts visible in game mode, hidden in academic mode.

---

**All files modified this session:**
- `src/components/PracticeSessionCockpit.jsx` (created)
- `src/components/PracticeConceptView.jsx` (created)
- `src/config/conceptViewConfig.js` (created)
- `src/pages/WYLPracticeLive.jsx` (surgical wire-in: imports + practiceView state + two conditional returns)
- `src/pages/GamePage.jsx` (URL params + isHomeworkSession flag + academic mode UI + leaderboard guard + concept state update + modal + DPM removal + toggle restyle + replay count gates)
- `src/pages/HomeworkDashboard.jsx` (useNavigate + Launch button with type-based routing)
- `src/pages/StudentDashboard.jsx` (Start Practice route unified to /practice-live)
- `src/services/api.js` (speakText TTS helper added)

**Result:** Practice Live fully deployed (Cockpit → Concept → lesson engine). Game is context-aware via URL params. Homework routing connected end-to-end. Academic Mode locked top to bottom — leaderboard blocked, DPM removed, mode toggle disabled, completion signal fires, concept state updated on finish.

---

### 2026-03-11 — TAMi Page Awareness + Pronunciation Fix
**Changes:**
- Added `currentPage` and `userRole` params to `api.js` (chatWithTami, chatWithTamiVoice)
- Added `useLocation` + `PAGE_DESCRIPTIONS` map to `TamiChat.jsx` for page context
- Added `current_page` and `user_role` fields to `TamiChatRequest` schema (schemas.py)
- Passed new fields through `tami.py` router endpoints
- Added PAGE AWARENESS INSTRUCTIONS block to `tami_service.py` context
- Added PRONUNCIATION rule: "Motesart" → "Motes-Art" for TTS
- Updated greeting template to use "Motes-Art"

**Files Modified:**
- `src/services/api.js`
- `src/components/TamiChat.jsx`
- `motesart-backend/app/models/schemas.py`
- `motesart-backend/app/routers/tami.py`
- `motesart-backend/app/services/tami_service.py`

**Result:** TAMi now knows which dashboard the user is on and never says "I can't see your dashboard." Pronunciation is correct for TTS.

---

### Prior Session — TAMi V2 Rebuild
**Changes:**
- Upgraded TamiChat.jsx from Web Speech API to ElevenLabs TTS
- Changed header from "Fun Coach" to "A.I. Teaching Assistant"
- Updated TAMi personality from "AI music coach" to "friendly host and guide"
- Updated frontend greeting text, backend greeting prompt, quick actions
- Created Express TTS proxy (server.js)
- Fixed 502 errors, env var issues, pronunciation

**Result:** TAMi V2 fully operational with ElevenLabs voice, host personality, and chat widget.

---

## 7. NAMING & ROUTING CONVENTIONS

> These are standing rules. Follow them when adding new pages, buttons, nav items, or route strings. Do not introduce exceptions without updating this section.

### Practice Live

| Context | Use |
|---|---|
| Student-facing label (nav, buttons, headings) | **Practice Live** |
| Canonical route | `/practice-live` |
| Component name (internal) | `WYLPracticeLive` |
| Legacy redirects (keep, do not remove) | `/wyl-practice` → `/practice-live`, `/live-practice` → `/practice-live` |

**Rules:**
- All student-visible UI text uses "Practice Live". Never expose "WYL Practice" to students.
- "WYL" is an internal/architecture term only. It may appear in component filenames, internal comments, and admin-only surfaces.
- `WYLPractice.jsx` is orphaned and marked legacy. Do not import or re-wire it. See the deprecation header in that file.
- The Practice Live broadcast icon (SVG path `M15.536 8.464...`) lives in `NAV_ICONS.practicelive` in `StudentDashboard.jsx`. Use it for any new student-facing nav entry pointing to `/practice-live`.

### Route Access Tiers

| Route | Guard | Who can access |
|---|---|---|
| `/practice-live` | `ProtectedRoute` | All authenticated users |
| `/curriculum` | `TeacherRoute` | Teachers and Admins only — students get redirected to `/student` |
| `/wyl-practice-staff` | `ProtectedRoute` | All authenticated users (staff tool) |

**Rule:** Never downgrade `/curriculum` from `TeacherRoute` to `ProtectedRoute`. If a new teacher-only page is added, wrap it in `TeacherRoute`.

---

## 8. KNOWN ISSUES & UNFINISHED WORK

> Track anything partially broken, missing, or identified-but-not-fixed here.
> Next session picks these up without you having to remember to mention them.

### Open Items
- [ ] **Student age not in frontend user object** — `som_user` localStorage only has `{ id, name, email, role, status }`. TAMi's age-adaptive personality works based on what the backend pulls from Airtable, but if the student record doesn't have an age/DOB field, TAMi can't adapt. Need to verify Airtable Students table has age/DOB and that `get_student_context()` pulls it.
- [ ] **TAMi memory persistence** — TAMi memory table exists in Airtable schema concept but needs verification that conversation history is being saved/retrieved between sessions.
- [ ] **No git release tags yet** — No tagged releases exist. First stable tag should be created: `v2.1-tami-page-awareness`.

### Resolved (move items here when fixed)
- [x] TAMi couldn't see which dashboard user was on — Fixed 2026-03-11 (page awareness)
- [x] "Motesart" pronounced wrong by TTS — Fixed 2026-03-11 (Motes-Art rule)
- [x] TAMi was acting like a coach instead of host — Fixed in prior session (personality rewrite)

---

> **NEXT SESSION STARTS HERE** — Read this file first. Check the changelog and Known Issues above. You know the stack, the rules, and what's locked in. Get to work.


## Session: 2026-04-29 — Phase A Complete + Phase B1 Started

### Phase A Commits (school-of-motesart)
- 8ab4c8b: ♩ JSX escape fix (MetronomeControl)
- 9d3fa94: Practice log write on session end (WYLPracticeLive Fix 5)
- 34bd45c: Dynamic concept routing + HomeworkDashboard (Fix 2 frontend)
- 9c02440: Unknown concept error screen (Fix 3)
- b449c98: T_SCALE_DEGREES → T_SCALE_DEGREES_MAJOR rename (bridge sync)

### Phase A Commits (Deployable-python-codebase-som)
- 4eb0c60: HomeworkAssignmentCreate.student → Optional
- 01524cc: homework.py mounted in main.py (Fix 2 backend)
- d8f2de6: TAMi system prompt rewrite (grounded New Orleans voice, hype dropped)
- e5226fb: try/except added to POST /assignments (Rule 9)
- 24121ce: Remove linked-record writes causing 422 in POST /assignments

### Diagnostic Patterns Learned
1. 503 on specific endpoint + /health GREEN = unhandled exception in route handler
   Fix: add try/except, redeploy, read JSON error body
2. INVALID_VALUE_FOR_COLUMN on linked record field = send ["recXXX"] not plain string
3. Orphaned router (not in main.py) = 404/503 on all its endpoints
4. JSX Unicode escape: \u2669 in JSX tags = literal text. Use {'\u2669'} instead.

### Phase B1 Status
- Patch 1: T_SCALE_DEGREES → T_SCALE_DEGREES_MAJOR (b449c98) ✅
- Patch 2: Silent slug fallback guard in WYLPracticeLive line 600 — PENDING
- Curriculum drafts for 5 new concepts — PENDING

### Phase B1 Next Steps
1. Add guard at WYLPracticeLive.jsx line 600: return null for unknown slug, add !currentConcept check before conceptConfig guard
2. Add 5 CONCEPT_CONFIG_MAP entries: keyboard-layout, finger-numbering, octave-recognition, major-scale-pattern, c-major-scale
3. Add 5 CONCEPT_VIEW_CONFIG entries with keys, BPM, speech texts
4. Type/Created By Airtable writes deferred to Phase B2 (linked record format required)

### Motesart Teaching Thinking Engine Added

- T.A.M.i remains the platform intelligence/router.
- Motesart is the lesson-facing music teaching persona.
- conceptViewConfig.js remains the sacred source of truth for Motesart speechTexts.
- Added motesartThinkingEngine.js for lesson-context teaching decisions.
- Added motesartVoicePersona.js to preserve Motesart voice output.
- Added useMotesartStudentState.js to track session-level learning signals.
- WYLPracticeLive.jsx now routes lesson/practice responses through the Motesart engine.
- Engine selects teach/guide/confirm/release instead of generating generic replacement voice.
- Admin/dashboard/non-music contexts remain T.A.M.i.
- Verification required: Half Step must keep concept-specific text and never fall back to Middle C.

### T.A.M.i Intelligence Foundation Phase 1 Added

- T.A.M.i remains the platform intelligence/router for school operations.
- Motesart remains the lesson-facing music teaching persona.
- Added tamiSignalIntakeEngine.js to normalize role, route, WYL, DPM, question, and support signals.
- Added tamiDecisionEngine.js to classify P0/P1/P2/NONE operator decisions.
- Added tamiOutputFormation.js and tamiVoicePersona.js for short, action-focused T.A.M.i responses.
- Added useTamiIntelligence.js as the runtime hook for the Phase 1 foundation.
- useTamiQuestions.js now checks T.A.M.i operational/homework/progress/intervention requests before falling back to existing lesson question handling.
- Existing Claude escalation, timing behavior, lesson_engine files, WYL signal weighting, DPM formula, and Motesart lesson routing remain intact.
- Music concept questions inside lessons continue to route away from T.A.M.i and remain Motesart-owned.

### T.A.M.i Derived Score Compatibility Patch

- Added Phase 2 contract aliases: confusionScore, masteryRiskScore, engagementRiskScore
- Preserved expanded derived score names from prior patch
- No routing changes
- No Motesart changes

### T.A.M.i Phase 1 — Locked Baselines

| Constant | SHA | Purpose |
|---|---|---|
| `MOTESART_ENGINE_BASELINE` | `23fb225578a09579c46ed0731cd13e6433c30430` | Motesart engine at Phase 1 baseline — must not regress |
| `TAMI_INTELLIGENCE_PHASE_1_BASELINE` | `51eaab4a2fa00584a335eb6e171b3a65bc50e5e9` | T.A.M.i intake + decision engine complete — Phase 1 foundation locked |
| `TAMI_PHASE_1_CONTRACT_BASELINE` | `a403d22a5f1f737b9f632a48afab7ff716aa14b0` | Derived score contract extended — confusionScore, masteryRiskScore, engagementRiskScore |

**Phase 2 pre-conditions (all must be PASS before Phase 2 starts):**
- [ ] `normalizeTamiSignals()` exports `derivedScores` object
- [ ] `computeDerivedScores()` returns all 8 named keys including `confusionScore`, `masteryRiskScore`, `engagementRiskScore`
- [ ] `useTamiQuestions.js` checks `intelligenceResult.decision.action` before calling lesson handler
- [ ] `DELEGATE_TO_MOTESART` action correctly bypasses T.A.M.i and routes to Motesart lesson handler
- [ ] Motesart engine files untouched — zero diff vs `MOTESART_ENGINE_BASELINE`
- [ ] Full build passes — `npm run build` exits 0, no errors

### T.A.M.i Phase 2 — Live Data + Dashboard Intelligence

Date: 2026-05-02
Baseline entering Phase 2: a403d22a5f1f737b9f632a48afab7ff716aa14b0

Files created:
  src/ai/tami/tamiDataAdapter.js
  src/hooks/useTamiStudentRoster.js
  src/components/TamiInterventionQueue.jsx
  src/components/TamiParentSummary.jsx
  src/components/TamiAdminBrief.jsx

Files modified (surgical — lines added below existing content only):
  src/pages/TeacherDashboard.jsx
  src/pages/ParentDashboard.jsx
  src/pages/AdminDashboard.jsx

Data confirmed:
  api.getStudents() → GET /students (existing route — no backend changes)
  api.getPracticeLogs() → GET /practice-logs?student_id=... (existing route)
  ParentDashboard was hardcoded — TamiParentSummary now pulls live data via auth context
  AdminDashboard was static — TamiAdminBrief now uses live roster from hook

Phase 2 baseline commit: 89dd2ba — SHIPPED May 2, 2026

Phase 3 pre-conditions (NOT this session):
  Teacher intervention log — teacher marks action taken on a flagged student
  Parent notification system
  Live lesson session writes into practice log
  Student progress timeline view

## T.A.M.i Phase 2 — Pre-Build Checklist (ARCHIVED — Phase 2 shipped 89dd2ba)

> Phase 2 shipped May 2, 2026. These conditions were verified before Phase 2 started. Kept for audit trail only.

- [ ] `git log --oneline -1` on main matches `TAMI_PHASE_1_CONTRACT_BASELINE` (`a403d22`) or later
- [ ] `normalizeTamiSignals()` in `tamiSignalIntakeEngine.js` returns `derivedScores` object
- [ ] `computeDerivedScores()` returns all 8 keys: `motivationRiskScore`, `errorRiskScore`, `hintLoadScore`, `struggleLoadScore`, `engagementRiskScore`, `interventionRiskScore`, `confusionScore`, `masteryRiskScore`
- [ ] `useTamiQuestions.js` lines 87-89 check `intelligenceResult.decision.action` before delegating to lesson handler
- [ ] Motesart engine (`motesartThinkingEngine.js`, `motesartVoicePersona.js`) unchanged vs `MOTESART_ENGINE_BASELINE` (`23fb225`)
- [ ] `npm run build` exits 0 with no errors (pre-existing non-blocking warnings acceptable)
- [ ] T.A.M.i action `DELEGATE_TO_MOTESART` routes cleanly to Motesart lesson handler — T.A.M.i silent
- [ ] All 9 Phase 1 verification steps pass against current main branch

---

## Mya Calendar Tier 1 — Live-Proven Complete

Date: 2026-05-08/09
Final commit: b29fa78
Previous Tier 1 commit: df511c7

Status:
- LIVE-PROVEN COMPLETE

What shipped:
- Structured calendar read endpoint:
  - GET /api/mya/calendar/events
  - Supports both days and days_ahead
  - Default: 7 days
- Conflict gate before calendar writes
- Fail-closed behavior when calendar availability cannot be verified
- Suggested open slots fallback
- Voice/dispatch path blocks conflicting writes and offers options
- Credential leakage checked clean

Important production verification:
- Railway production confirmed hotfix behavior live
- GET /api/mya/calendar/events?days=10: PASS
- Conflict test against existing event: PASS
- Suggested slots returned: PASS, count 3
- Duplicate event was not created
- Credential leakage: NO

Critical bug fixed:
- Commit b29fa78 fixed _suggest_open_slots_sync.
- Previous bug: end_search was calculated from now instead of start_search.
- This caused future-dated conflicts beyond days_ahead to return [] suggested slots.
- Fix:
  end_search = start_search + timedelta(days=days_ahead + 1)

Standing rule:
- Mya calendar writes must never fail open.
- If availability is clear: schedule.
- If conflict exists: block and suggest options.
- If availability cannot be verified: block and ask Denarius for confirmation.
- Never silently double-book.

Known cleanup:
- Test event still exists manually in Google Calendar:
  - TIER1-VERIFY-TEST DELETE ME
  - May 15, 2026, 3:00–4:00 PM ET
  - Event ID: l9gebk21f4gn15erqn0marvr28

Next eligible build:
- Mya Calendar Tier 2A — Day Intelligence Endpoint
- Do not build payment calendar yet.
- Do not build Tier 3 until FinanceMind Executive lane is proven live.

## Mya / SOM / T.A.M.i Role Boundary

- Mya does not operate inside school-of-motesart. No SOM frontend source imports or references Mya.
- Mya delegates SOM work through MASTER_TASKS: `business=SOM`, `assigned_agent=SOM Executive`.
- SOM Executive exists in backend at `/api/executives/som/run`. It reads SOM-tagged tasks and processes them.
- T.A.M.i is SOM-internal educational intelligence. It has no coupling to Mya OS.
- Motesart is the current direct lesson delivery voice. Not Mya. Not T.A.M.i.
- This isolation is intentional. Do not add Mya imports or references to this repo.

## Cross-Brain Sync

This brain owns:
SOM frontend, T.A.M.i intelligence layer, Motesart teaching engine, Netlify deploys, lesson UI, mobile/audio proof gates.

Sister brain:
Deployable-python-codebase-som/PROJECT_BRAIN.md

This SHA at last sync:
0eafdd3d6231f89d91c3ad2183fd70a634da53cd (May 3, 2026)

Sister SHA at last sync:
fd4b8aaf50a853b5197d533140563b39126d0eff (May 3, 2026)

Drift check:
Run `git rev-parse HEAD` in both repos. If either SHA differs from the sync SHAs above, update needed.

## Cross-System Cycle Status (pointers — detail lives in sister brain)

- Cycle #2 audit observability: PARKED — blocked on exact Airtable field names for table tblDEyL8fzGGVvs2t. No SOM frontend action required.
- Cycle #3 VAD: DEPLOYED_NOT_SHIPPED — frontend change deployed, awaiting MOBILE_PASS at 390×844 and 430×932.
- Cycle #3A spoken response truncation: CLOSED/PASS — detail in Deployable-python-codebase-som/PROJECT_BRAIN.md.

---

## T.A.M.i Lesson Engine Wire — Phase 1A

Date: 2026-05-19
Baseline entering this work: TAMI_PHASE_2_BASELINE = 89dd2ba78f46d384a8208a2913528d30667fe3d1

Problem found via live browser audit:
- evaluateStudentResponse() never connected to T.A.M.i intelligence layer
- DPM scores never passed to engine init (tami.bridge.connect received no dpmScores)
- struggle/engagement/milestone detectors defined but unreachable from student answer path

Fix: 3 surgical additions to WYLPracticeLive.jsx only — no rewrites
- processEvaluation() called after every student answer (line 910)
- processConfidenceUpdate() called after correct (+10) and wrong (-15) resolution (lines 947, 961)
- dpmScores passed into tami.bridge.connect() from motesartStudentState.dpmSignals (line 1135)
- All T.A.M.i calls wrapped in try/catch — lesson can never crash from intelligence layer
- Dev-only [TAMi Wire] telemetry logs added for all 3 call sites

Result: T.A.M.i intelligence layer now receives student signals on every answer
- struggle_detected: fires when wrongStreak >= 2 or concept confidence <= 30
- milestone_reached: fires when correctStreak >= streakLength or mastery threshold crossed
- engagement_drop: still timer-driven via processResponseDelay (unchanged)

Note: tamiStackRef.current is null during Theory Phase (initLesson() defined but not called
in current Theory Phase mode). Optional chaining (?.) makes all additions safe no-ops
when the engine is not instantiated.

Next: Verify struggle/milestone/engagement fire correctly under real student use once
Theory Phase transitions to full engine mode.

Commit SHA: TAMI_PHASE_1A_WIRE_BASELINE = 915345a84ec6f3c46e5f4e10e1de07770f95b02d

What this enables:
- T.A.M.i intelligence layer now receives every student answer signal
- _detectStruggle fires at wrongStreak >= 2
- _detectMilestone fires at correctStreak >= streakLength
- _detectEngagementDrop fires on excessive replays or response delay
- Confidence updates adjust concept scoring in real time
- DPM drives engagement context at session start

Strategic doctrine (permanent, locked):
  "Most competitors correct notes. SOM corrects the learner."

All locked baselines:
  MOTESART_ENGINE_BASELINE           = 23fb225578a09579c46ed0731cd13e6433c30430
  TAMI_INTELLIGENCE_PHASE_1_BASELINE = 51eaab4a2fa00584a335eb6e171b3a65bc50e5e9
  TAMI_PHASE_1_CONTRACT_BASELINE     = a403d22a5f1f737b9f632a48afab7ff716aa14b0
  TAMI_PHASE_2_BASELINE              = 89dd2ba78f46d384a8208a2913528d30667fe3d1
  TAMI_PHASE_1A_WIRE_BASELINE        = 915345a84ec6f3c46e5f4e10e1de07770f95b02d

Open verification (required before Phase 1B):
  [ ] Live wrong-answer test: submit 2 wrong answers in real student session
      Expected: T.A.M.i coaching panel reacts — _detectStruggle fires
  [ ] Live correct-streak test: submit 4 correct answers
      Expected: _detectMilestone fires, encouragement triggers
  [ ] Confirm tami.bridge emits to setCoaching or equivalent UI state
  [ ] Confirm DPM values from real student record reach bridge.connect()

Proposed new agent (not yet built):
  SOM Market Intelligence Agent
  Mission: weekly research brief on AI music education, adaptive learning,
  gamification, computer vision posture correction, competitor movement
  Output feeds: PROJECT_BRAIN.md, SOM roadmap decisions, T.A.M.i curriculum strategy

Next build sequence (not this session):
  Phase 1B-1: Live verification — real student wrong-answer test
  Phase 1B-2: T.A.M.i event persistence — store signals to Airtable
  Phase 1B-3: WYL trigger layer — stagnation → teaching style change
  Phase 1B-4: DPM trigger layer — engagement drop → game/reward/encouragement
  Phase 1B-5: Posture/form research spec — define camera detection requirements
  Phase 1B-6: T.A.M.i Ambassador model — teacher/coach persona structure

## May 27, 2026 — Rhythm Racer MVP shipped

**What:** Full Rhythm Racer MVP build and deploy session

**Files created:**
- src/pages/RhythmRacer.jsx
- src/data/rhythmRacerLevels.js
- public/lesson_data/L_rhythm_racer_mvp.json
- public/avatars/motesart_avatar_1.png

**Files edited:**
- src/App.jsx — added /rhythm-racer route + import (one surgical change)

**Result:**
- Build passed: npm run build, bundle index-D3E2vpFR.js
- Netlify deployed: ce80adf — Published 5:59 PM today
- Route /rhythm-racer: HTTP 200, authenticated
- Mobile gate CLOSED: iPhone 390×844 ✅ · 430×932 ✅
- Status: SHIPPED

**Key decisions locked this session:**
- No hit zone band or label — car is the timing target
- One practice pad (ONE_PAD), future modes stubbed not exposed
- Motesart is the only teacher voice — no T.A.M.i labels in game
- Pedagogy order: whole → half → quarter → rest (longest duration first)
- Age-aware coaching bank keyed by (trigger, age_group)
- Route pattern: /rhythm-racer?concept=<id>&assignment_id=<id>&level=<1-4>
- Session write: POST /practice-log/sessions confirmed working
- Game_Sessions Airtable write: PLANNED_NOT_WIRED (stubbed gracefully)

**Rollback:** git revert ce80adf (five files, App.jsx reverts to 5a8d276 route set)

**Next session — Beginner Piano Level 1 OS:**
- Rhythm Racer is now available for Gate wiring
- Resume BEGINNER_PIANO_LEVEL_1_OS_VERIFICATION_REPORT.md
- All 8 gates now have their required games:
  Gates 1, 2, 7, 8 → Find the Note (already wired)
  Gates 4, 5, 6    → Rhythm Racer (now available)
  Gate 3           → manual completion
- Wire the gates in the next dedicated session
- Deferred: car visual redesign (racing car silhouette), On Fire trail animation

## June 1, 2026 — Onboarding + Comms skills prepared, first-lead email approved

**What:** Preparation + decisions only. No code deployed this session.

**Prepared (NOT yet uploaded/committed):**
- som-comms skill (zip)
- som-onboarding skill (zip)
- motesart-skill-router update to register both
- this PROJECT_BRAIN entry

**Decisions locked this session:**
- First-lead Email 1: clean plain-style version ACCEPTED after render check
  (links work, Zelle block renders). Send from the 21:38 HTML draft only.
- Strategic gate: stop building. Next win = one real student through the
  full onboarding -> practice flow (live manual test); automate from results.

**Pending execution (run order):**
1. Upload som-comms + som-onboarding
2. Update motesart-skill-router
3. Append this entry, commit + push
4. Add 4 onboarding fields manually in Airtable: Parent Name - Age -
   Instrument - Goal  -- TO VERIFY: target table not confirmed in live state
5. Use 21:38 Email 1 draft, fill placeholders, optional Zelle QR
6. Clear duplicate drafts by eye (21:09 plain-text, May 23 jrosier@ tests)
7. Send to first real lead -> 8. Stop, run live manual test

**TO VERIFY (surfaced this session):**
- Which Airtable base/table the 4 onboarding fields attach to.
- Age + Instrument data path: PROJECT_BRAIN already notes som_user
  localStorage stores only {id,name,email,role,status}; Age/Instrument come
  from an Airtable lookup. Confirm the onboarding skill reads them from
  Airtable, not localStorage, before relying on those fields.

**Result:** No deploy this session. No protected file or flow touched.
No app code changed. No Airtable changes. No email sent. Live manual test
pending. Last shipped baseline remains May 27 (commit ce80adf).

**Rollback:** N/A — no code changed.
## 2026-07-15/16 — Phase 0 recovery reconstruction

Phase 0 evidence was reconstructed from authoritative production source `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`, including deploy provenance, repository/route/encoding/privacy/dead-file audits, and the complete three-viewport formal regression baseline. No remediation, merge, or deployment occurred.

Phase 0 made zero product or runtime modifications. Repository changes were limited to additive audit artifacts and the required PROJECT_BRAIN governance entry.

The earlier local-only Phase 0 candidate 5ec9452c2265825626db54a2e04f601f21b2eade was lost before remote preservation and is superseded by this reconstructed candidate.

## 2026-07-15 — Phase 0R.1A non-protected encoding remediation

Phase 0 is closed and locked at `1683cb1225d9d43e7155f74bd96eca451e2294a6`. This session performed Phase 0R.1A only.

Exact product files changed:
- `src/components/MiniCoachCard.jsx`
- `src/pages/MoveItChapter.jsx`
- `src/pages/PracticeLogPage.jsx`

Fourteen inventoried corrupted literals were replaced one-to-one. Protected and uncertain dashboard, Settings, GamePage, shared Tami, and lesson-engine occurrences were deferred in `PHASE_0R_PROTECTED_ENCODING_EXCEPTIONS.md`. The unavailable `b4758d3` Rhythm Racer and Login collision paths were deferred in `PHASE_0R_DEFERRED_COLLISIONS.md`; no lost work was recreated.

Verification: locked install passed; production build passed; the repository has no test script; both complete 102-capture runs completed with zero navigation failures, zero console errors, and zero uncaught page errors. Dedicated before/after evidence confirms only the approved `/move-it` arrow text and `/practice-log` modal close glyph changes. Raw PNG hashes include documented animation/timing variance on unchanged routes; unexpected persistent product visual deltas were zero. No route, guard, behavior, layout, styling, configuration, dependency, API, Airtable, auth, or data-flow change was made.

Rollback condition: if any approved glyph substitution produces an unanticipated product effect, revert the single Phase 0R.1A commit and return the branch to the locked baseline for review. The resulting commit is preserved on `feat/som-redesign-phase-0r` and in the verified Phase 0R.1A bundle; its exact SHA is the branch tip and remote preservation record.

No later Phase 0R step, Phase 1 work, merge, or deployment was started.

## 2026-07-16 — Phase 0R.2A obsolete teacher-prototype removal

Phase 0R.1A is closed at `1000cdd5d09be1ad368e42bca5cd2e1d3709e24c`. This session performed Phase 0R.2A only.

Approved paths:
- `teacher-dashboard-v3.html` — deleted.
- `src/pages/teacher-dashboard-v3.jsx` — already absent from the authorized starting tree; no file was reconstructed or deleted.

A fresh tracked-repository census found zero runtime imports, routes, build/configuration references, deployment references, HTML links, asset references, or filesystem reads for either path. The removed HTML prototype contained named or real-looking student fixtures and inactivity-style statistics; no names or fixture details are reproduced in the Phase 0R evidence.

Verification: isolated `npm ci` passed; the production build passed; 102 of 102 browser captures completed with zero navigation failures, zero console errors, zero page errors, zero final-URL changes, zero route/guard changes, and zero unexpected persistent route visual changes. The removed prototype path is absent from build output; a direct request returns only the SPA shell and no prototype content. No duplicate screenshot corpus was committed.

The resulting Phase 0R.2A commit is the local and remote tip of `feat/som-redesign-phase-0r`, with exact SHA recorded by the branch preservation proof. Rollback condition: revert only that single Phase 0R.2A commit.

No other file was deleted. No product source, route, configuration, dependency, protected flow, collision path, locked baseline, later Phase 0R step, Phase 1 work, merge, or deployment was started.

## 2026-07-16 — Phase 0R.3A Settings personal-contact default removal

Phase 0R.2A is closed at `08eeb31d7b7a8bc21d3de76c071c5d169b9cf62d`. This session performed Phase 0R.3A only.

`src/pages/Settings.jsx` was the only product source file changed. The audited hardcoded email and telephone defaults were removed without reproducing those personal values in governance or evidence. Email remains read-only and now uses the current authenticated user's `email` property with an empty fallback. Repository truth defines no canonical phone property in the supported `som_user` contract, so the phone field now has an empty default; no phone persistence, backend field, API, Airtable, auth, or save behavior was added.

Verification was privacy-sanitized: isolated `npm ci` and production builds passed; nine targeted Settings captures passed across all three viewports; and paired full browser suites each completed 102 of 102 captures with zero navigation failures, console errors, page errors, final-URL changes, route/guard changes, or unexpected persistent visual changes. Expected visual changes were limited to removal of contact fallback text. The tracked committed `dist` artifact still contains the historical values and was preserved unchanged because build-output cleanup is outside this session.

The resulting Phase 0R.3A commit is the local and remote tip of `feat/som-redesign-phase-0r`, with its exact SHA recorded by the branch preservation proof. Rollback condition: revert only the single Phase 0R.3A commit.

Login work, the deferred Settings Back glyph, protected encoding work, later Phase 0R work, Phase 1, merge, deployment, and pull-request creation were not started.

## 2026-07-16 — Phase 0R.3B protected Login preview and exception ticket

Phase 0R.3A is closed at `91326c10a0a51bfa1f87acdff7523bab84a4473d`. This session was limited to governance analysis and rendered previews for the protected Login wake flow.

No Login, API, AuthContext, auth, route, backend, product, runtime, styling, dependency, or configuration source was edited. Current source confirms the public wake button calls the unauthenticated API root and produces browser alerts. Five controlled wake requests returned parseable JSON 404 responses in 86–240 ms, accepted the tested local frontend origin, set no cookie, and produced no observable auth/session side effect. The existing wake promise has no explicit timeout and treats parseable HTTP error JSON as resolution; the ticket recommends a four-second presentation-only bound without changing `api.js`.

The preview harness and 12 sanitized captures live under `visual-regression/phase0r-3b-preview/`. Temporary DOM injection demonstrates current, pending, success, and delayed states at all three viewports; it is explicitly not implemented behavior. Deterministic interaction tests preserved immediate typing, independent login submission and errors, one wake call per mount, unchanged successful redirect behavior, and zero proposed alerts.

Unavailable commit `b4758d32baed10f00e07848f0839e76dcf35d1e2` included Login work that was not recovered or reconstructed. Denarius must explicitly approve superseding it, both exact status strings, removal of the button and alerts, one non-blocking mount call with no auth change, and implementation in `Login.jsx` after preview review.

The resulting governance-only commit is the local and remote tip of `feat/som-redesign-phase-0r`, with its exact SHA recorded by the preservation proof. Implementation, Phase 0R.4, committed-dist work, Phase 1, merge, deployment, and pull-request creation were not started.

## 2026-07-16 — Phase 0R.3B protected Login silent-wake implementation

The Phase 0R.3B preview is closed at `b567fa337f3725a00e144c63968448ae0a2bfbbb`. Denarius approved all five protected-flow decisions: superseding the unavailable `b4758d3` Login work for this exact change, both exact status strings, removing the wake button and alerts, one non-blocking mount wake call with no auth change, and surgical implementation in `src/pages/Login.jsx`.

`src/pages/Login.jsx` was the only product source file changed. It now has isolated `pending`, `ready`, and `delayed` wake-presentation state; a guarded one-start request; and a four-second presentation-only bound. Pending displays `Warming up…`; rejected or timed-out presentation displays `Sign-in may take a moment.`; a resolved parseable-JSON request removes the status and retains `School of Motesart`. Resolution is not a backend-health, login-readiness, authentication-readiness, or health-check declaration.

Protected equality proof confirms `extractUser`, authenticated redirect, `handleLogin`, `handleGoogle`, credential form, token/user handoff, `api.js`, and AuthContext are unchanged. Deterministic pending, ready, rejection, timeout, login-while-wake-pending, and successful-auth tests passed with one wake call per mount, no alert/dialog, and no auth regression. Isolated `npm ci` and the production build passed. Nine actual-behavior Login screenshots passed across all viewports. The complete 102-capture route suite completed with zero navigation failures, console errors, page errors, final-URL changes, route/guard changes, or unexpected persistent visual differences outside Login.

The unavailable `b4758d32baed10f00e07848f0839e76dcf35d1e2` content was not reconstructed, inferred, or claimed; the production-derived branch remains controlling. The commit containing this entry is the Phase 0R.3B implementation commit, and its local and remote `feat/som-redesign-phase-0r` SHAs must match exactly in the preservation proof. Rollback condition: revert only that implementation commit.

Phase 0R.4, protected encoding work, committed-dist work, Phase 1, merge, deployment, and pull-request creation were not started.
