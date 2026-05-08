# PROJECT BRAIN — School of Motesart (SOM)
> **Last Updated:** 2026-03-11
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
