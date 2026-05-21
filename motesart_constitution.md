# MOTESART — PROJECT CONSTITUTION
Supersedes the original Project Rules PDF and addendum v1/v2.
This document defines permanent rules. Current state lives in
PROJECT_BRAIN.md, not here.

Last ratified: April 22, 2026

---

## Article I — System Identity

These three layers are distinct. Never conflate them.

- **T.A.M.i** — the platform operating system. Hosts every page, owns
  all analytics, makes all teaching decisions. Never a coach or teacher.
- **Motesart** — the default student-facing Ambassador. Delivers
  instruction. Never thinks. T.A.M.i generates, Motesart speaks.
- **Ambassador Layer** — any voice/persona that delivers T.A.M.i's
  decisions. Loaded dynamically into system prompt. Same Claude API,
  no fine-tuning.
- **Intelligence Layer** — background analytics + Airtable ops. Silent.

Rule of thumb: T.A.M.i is the OS. Motesart is the voice.

---

## Article II — Source of Truth & Conflict Resolution

When instructions, documents, or memory disagree, the winner is
determined by this fixed precedence:

1. **Live production code** (GitHub main branch, deployed Airtable
   schema, deployed Railway endpoints) — authoritative for what exists
2. **This Constitution** — authoritative for rules and process
3. **PROJECT_BRAIN.md** — authoritative for current project state
4. **The current user instruction in chat**
5. **Prior session memory or handoffs**
6. **Legacy documents** (old PDFs, old addenda, old handoffs)

If a conflict cannot be resolved from (1)–(3), stop and ask.
Never guess to break a tie.

---

## Article III — Assumptions & Unknowns

No guessing. No invention.

- No invented route names, endpoint paths, or API contracts.
- No invented Airtable field names, table names, or schema.
- No assumed library versions or environment variables.
- No "it probably works like X" without verification.

If a fact is not confirmed by live code or PROJECT_BRAIN.md, it is
marked **TO VERIFY** and the work stops at that line until the human
confirms. Uncertainty is surfaced immediately, not absorbed silently.

---

## Article IV — Approval & Build Discipline

**Rule 1 — Visual approval before code (hard stop, no exceptions).**
Before any code or file change, produce a mockup, diff, or preview.
Wait for explicit approval ("approved", "go ahead", "looks good").
This applies to small changes, bug fixes, typos, and anything else.

**Rule 2 — Route & backend confirmation before wiring.**
After visual approval, confirm every button route and every backend
connection is mapped before writing integration code.

**Rule 3 — Never rewrite working files.**
Surgical edits only. No refactors, no "cleaning up," no reformatting
of functional code. If it's working, it's locked.

**Rule 4 — Read the live file before editing.**
Pull the raw file from GitHub main. Local memory of the file is
untrusted.

**Rule 5 — One feature per session.**
No stacking upgrades. Each feature gets its own focused session.

**Rule 6 — Component isolation.**
New features are built as standalone components and tested in
isolation before integration.

**Rule 7 — No silent dependency changes.**
Any new package, version bump, or environment variable is called
out explicitly and approved before anything else.

**Rule 8 — Deploy checklist before every deploy.**
State (a) which files changed, (b) what each change does,
(c) confirmation no other files were touched, (d) that the build
passes locally.

---

## Article V — Protected Files & Protected Flows

The following are in a locked state. Changes require explicit
re-approval and must be justified in writing before any edit.

**Protected files** (known as of this ratification):
- `Registration.jsx` (post-2026-03-28 rebuild)
- `auth.py` (post-2026-03-28 rebuild)

**Protected flows:**
- Login flow
- Registration flow
- Dashboard load and data hydration
- Auth: bcrypt hashing, exact-match email lookup

The canonical list of protected files lives in PROJECT_BRAIN.md and
is updated when new files are declared protected. A file being absent
from that list does not make it unprotected if it is part of a
protected flow.

---

## Article VI — Skills & Tool Usage Discipline

Before any file-producing or code-producing task, scan available
skills and call `view` on every relevant `SKILL.md`. This is
mandatory. Skills encode environment-specific constraints not in
training data.

Multiple skills may apply to one task. Read all that fit before
writing.

Common SOM triggers:
- Mockups, React, dashboards → `frontend-design`
- Word docs → `docx`
- Spreadsheets, registries, crosswalks → `xlsx`
- Presentations → `pptx`
- PDFs → `pdf`
- Internal writeups → `internal-comms`
- Anthropic product facts → `product-self-knowledge`
- Recurring SOM workflows → `skill-creator`

---

## Article VII — Curriculum Constitutional Locks

**The three curricula are separate. Never merge them:**

1. **Traditional Registry** — school input, compliance layer.
   School-facing standards. T.A.M.i reads, never teaches in it.
   *Concept count: TO VERIFY IN LIVE PROJECT STATE — previous
   documents state both 32 and "30 after 2 merged."*
2. **Motesart Fast Curriculum** — student-facing teaching sequence,
   13-phase spine. What T.A.M.i follows.
3. **Number System Source** — internal compiler. What T.A.M.i
   thinks in.

Teacher syllabus upload triggers automatic concept mapping. It never
alters T.A.M.i's teaching sequence.

**Six non-negotiables:**
1. Numbers before letters
2. Ear before notation
3. Pattern before terminology
4. Function before complexity
5. Ownership before mastery (`ownership_status = owned` required)
6. Practical Mode applies but never replaces the diatonic spine

**Diatonic chord map — permanently locked:**
1-Major · 2-minor · 3-minor · 4-Major · 5-Major · 6-minor · 7-diminished

**Feel Mode:** T.A.M.i activates silently.
Sub-levels A (reduced look) · B (no-look scale) · C (no-look phrase).
`status = mastered` is unreachable without `ownership_status = owned`.

---

## Article VIII — Design Constitutional Locks

These are permanent. Hex values, nav order, and font specifics live
in PROJECT_BRAIN.md and may evolve; the locks below do not.

- **T.A.M.i and Motesart avatars must always be real images.**
  Never a letter, emoji, or placeholder.
- **All dashboards share identical layout.** Only role-specific
  colors and labels differ.
- **Naming convention: "My"** throughout user-facing navigation.
- **Sidebar nav is flat.** No accordions.
- **Design workflow:** HTML mockup → approval → React conversion.
  React is never written before the HTML is approved.
- **Theme direction:** dark base with glass morphism. Specific hex
  values maintained in PROJECT_BRAIN.md.

---

## Article IX — Production Data & Deployment Safety

The Airtable base is a live production database with real user
records. Treat it accordingly.

- **No destructive operations without explicit written approval.**
  Includes deleting records, deleting fields, renaming fields,
  changing field types, or truncating tables.
- **Schema changes are a dependency change** under Article IV,
  Rule 7. They require the same explicit approval.
- **Computed/formula fields cannot be written via API.** Never
  attempt. Never design code paths that require it.
- **No writing secrets, PATs, or credentials into repo files,
  artifacts, mockups, or chat history.**
- **Every failed deploy costs money.** Verify build passes locally
  before asking for deploy.
- **Version checkpoint before any new feature.** Last known working
  commit is recorded in PROJECT_BRAIN.md so rollback is one step.
- **GitHub web UI is the deploy workflow.** No CLI commands unless
  specifically requested. Large files via `bash_tool` heredoc,
  never `create_file`.

---

## Article X — Definition of Done

A feature is not "done" until all of the following are true:

1. Mockup or preview was approved before code was written.
2. Routes and backend connections were confirmed before wiring.
3. Code was written as surgical edits, not rewrites.
4. Build passes locally.
5. Deploy checklist was stated and confirmed.
6. Feature was verified working in the live environment after deploy.
7. No protected file or protected flow was regressed.
8. PROJECT_BRAIN.md was updated in the same session (Article XI).

"Deployed" is not "done." Verification in the live environment is
required.

---

## Article XI — Session Closure

Every session ends with a PROJECT_BRAIN.md changelog entry containing:
date, what was built or changed, files modified, result, and any new
TO VERIFY items surfaced during the session.

PROJECT_BRAIN.md is the only handoff format. No separate handoff
documents are created. PROJECT_BRAIN.md is loaded as first context in
every new session.

---

## Communication Standards

- "Mozart" means "Motesart." Speech-to-text artifact. Interpret, don't
  ask.
- Debug from real error messages or screenshots. No guessing from
  symptoms alone — request the actual error.
- Responses are concise and professional. No padding.

---

## Related Doctrine

The official student-facing language, beginner gate order, Motesart
teaching vocabulary, WYL remediation framing, and Find the Note
homework doctrine are governed by:

`docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md`

This document is the source of truth for what is taught and how it
is said. It does not replace this constitution, which governs build
process and protected files.
