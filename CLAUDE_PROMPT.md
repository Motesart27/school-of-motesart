# SOM — Claude Project System Prompt
> Paste this into your Claude Project's custom instructions.

---

You are working on School of Motesart (SOM), a music education platform.

## Stack
- Frontend: React 18 + Vite + Tailwind, served by Express (server.js), deployed on Railway
- Backend: FastAPI (Python) + Anthropic Claude API (claude-sonnet-4-20250514), deployed on Railway
- Database: Airtable (students, practice logs, homework, sessions, TAMi memory)
- TTS: ElevenLabs (TAMi = Juniper voice, Motesart Coach = Mark voice), proxied through Express
- Repos: Motesart27/Motesart-frontend (public), Motesart27/Deployable-python-codebase-som (private)
- Live: motesart-frontend-production.up.railway.app / deployable-python-codebase-som-production.up.railway.app

## Key Architecture
Frontend api.js → Backend FastAPI routers → Airtable (data) + Claude API (TAMi AI) + ElevenLabs (voice).
TAMi chat: TamiChat.jsx → api.chatWithTami() → /tami/chat → tami_service.py → Claude → response.
TTS: server.js Express proxy → ElevenLabs → audio stream to browser.
Auth: som_user in localStorage = { id, name, email, role, status }. Role determines dashboard routing.

## What's Built (DO NOT REWRITE)
Auth system, role-based dashboards (Student/Teacher/Parent/Admin/Ambassador), TAMi V2 with page awareness + ElevenLabs TTS + age-adaptive personality + host/narrator role, DPM scoring engine, Airtable integration, Express TTS proxy, dark UI with glassmorphism and role-colored accents.

## Rules (MUST FOLLOW)
1. Visual preview + user confirmation BEFORE any code commit (HIGH PRIORITY)
2. GitHub Web UI only for pushing code — no CLI git push
3. Read the live file from GitHub before editing — never edit from memory
4. Surgical edits only — smallest possible changes
5. No silent dependency changes
6. Never rewrite locked features without explicit request
7. Motesart avatar only (Rule #3) — never emoji
8. T.A.M.i avatar only (Rule #4) — never emoji
9. Write "Motesart" as "Motes-Art" in any TAMi spoken text
10. TAMi is the host/guide, NOT a coach
11. CodeMirror access: document.querySelector('.cm-content').cmTile.view (cmTile, NOT cmView)

## Design
Dark UI (#0f0f1a bg), glassmorphism cards, DM Sans + Outfit fonts.
Colors: Student=teal, Teacher=gold, Ambassador=blue, Admin=orange, Parent=purple.
TAMi header gradient: orange→pink.

## Airtable Tables
Users, Students, Sessions, Practice Logs, Homework Library, Homework Assignments, Student Instruments, Achievements, Messages, Assignments. Client: airtable_client.py (httpx + PAT). Base ID: appTN4wNd5Kgbqdwl. Note: som_user in localStorage does NOT have age — age must come from Airtable backend lookup.

## Current Version
See PROJECT_BRAIN.md in repo root for full changelog, locked feature list, Airtable schema, and known issues.
Read it at the start of every session.
