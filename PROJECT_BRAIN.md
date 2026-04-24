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
- **TTS Proxy:** Express.js (server.js) — proxies ElevenLabs API calls
- **Build:** Vite → static assets served by Express
- **Deployed on:** Railway (motesart-frontend-production.up.railway.app)
- **Repo:** github.com/Motesart27/Motesart-frontend (PUBLIC)

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
- **Railway** — Hosting for both frontend and backend (auto-deploys from GitHub main branch)

### Environment Variables (Railway)
| Variable | Service | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Backend | Claude API access |
| `AIRTABLE_API_KEY` | Backend | Airtable data access |
| `AIRTABLE_BASE_ID` | Backend | SOM database identifier |
| `ELEVENLABS_API_KEY` | Frontend | TTS API access |
| `ELEVENLABS_TAMI_VOICE_ID` | Frontend | TAMi voice (Juniper) |
| `ELEVENLABS_VOICE_ID` | Frontend | Motesart Coach voice (Mark) |
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

### 2026-04-24 — Practice Live Views 1 & 2 (Cockpit + Concept)
**Changes:**
- Created `src/components/PracticeSessionCockpit.jsx` — View 1 of Practice Live. Full-screen session intro with animated energy rings, concept mastery progress bar (Find It / Play It / Own It stages), last session recap, assignments card, Motesart suggestion bubble, and Begin Session button.
- Created `src/components/PracticeConceptView.jsx` — View 2 of Practice Live. Concept teaching screen with 8-key piano, animated SVG arrow overlay between highlighted keys, phase flow dots (Teach → Guide → Confirm → Release), Motesart speech card (72px avatar, speaking bars, Replay button), answer option grid, BPM control, home key toggle, and stats footer.
- Wired both views into `src/pages/WYLPracticeLive.jsx` — surgical edits only: added two imports, one `practiceView` state variable, and two conditional returns (`'cockpit'` → `'concept'`) before the existing lesson engine. Lesson engine, TTS, and speech recognition untouched.
- Layout polish: PracticeConceptView widened to 640px max-width, speech card restructured with avatar left + text right + speak bars/Replay in border-top row, responsive breakpoint at 520px.

**Files Modified:**
- `src/components/PracticeSessionCockpit.jsx` (new)
- `src/components/PracticeConceptView.jsx` (new)
- `src/pages/WYLPracticeLive.jsx` (surgical wire-in)

**Result:** Both views live at `/practice-live`. Flow: Cockpit → Concept → existing lesson engine. No regressions — lesson engine, TAMi, TTS, and all locked features untouched.

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
