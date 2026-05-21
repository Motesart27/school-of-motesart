# MOTESART LANGUAGE CONSTITUTION
**Version 1.1 — Ratified May 21, 2026**

This document is the source of truth for all student-facing language,
the beginner gate order, and the role of Find the Note in the SOM
Mastery Intelligence Engine. It supersedes any prior conflicting
language in lesson JSONs, component code, or teacher scripts.

Every gate, lesson, JSON, ambassador script, T.A.M.i phrase, and
teacher prompt must conform. When this Constitution and any other
document disagree, this Constitution wins. The only document that
overrides this one is `motesart_constitution.md` (the system-level
constitution governing build process and protected files).

**Version 1.1 amendments** (May 21, 2026):
- Article III added — Motesart Translation Layer
- Article VII added — Earned Character Labels rule strengthened
- Article VIII strengthened — Feel Check is internal evidence,
  never a graded quiz
- Article IX strengthened — Narrative Intensity locked per age band
- Article XII strengthened — Student-Facing Confidence Rule
  (no percentages to students)
- Article XIII strengthened — Find the Note defined as an engine
  with gate-specific variants
- Article XIV added — Preservation Rule for existing Pattern Mind
  work, reclassified as Gate 2

Original v1.0 articles are preserved. Amended articles carry
inline notes indicating the change. Articles have been renumbered
to accommodate insertions; the v1.0 → v1.1 article map is in the
appendix.

---

## Article I — Foundational Principle

**Music is not random notes. Music is relationships.**

The Motesart Method teaches relationship before terminology, story
before formula, and ownership before mastery. Every beginner concept
is taught as a member of a family the student already understands —
home, family, holding hands, cousins, traveling — before any
academic music vocabulary is introduced.

This is not a stylistic choice. It is the pedagogical foundation
that allows the same curriculum to scale from a 7-year-old beginner
to an adult church musician to an advanced student studying harmony,
without rewriting the language at each level. The story deepens.
It does not get replaced.

---

## Article II — Protected Language

These words are the **first vocabulary** the student encounters.
Technical music vocabulary is never the first vocabulary.

| Motesart Language | Music-World Name | When Earned |
|---|---|---|
| Home | Tonic / Root / "1" | Gate 0 |
| Skip | Whole step | After Gate 1 ownership |
| Together | Half step | After Gate 1 ownership |
| Holding hands | (Same as Together) | Gate 1 |
| Family | Key / Scale | After Gate 2 ownership |
| Cousin | Relative minor | When relative minor is introduced |
| Traveling | Modulation | When modulation is introduced |
| Feeling | Quality (Major/Minor) | When major vs minor is introduced |

**The word "squeeze" is removed from all curriculum data.** It is
replaced by "together" or "holding hands." Any legacy reference to
squeeze in old JSON, old crosswalk data, or old past-conversation
memory is overridden by this Constitution.

The phrase "music-world name" is itself protected language. It is
the bridge between Motesart language and academic terminology, and
it must be used at every name-reveal moment.

---

## Article III — The Motesart Translation Layer
*[New in v1.1]*

The Motesart system speaks in **three languages simultaneously**.
Each layer has a fixed audience and fixed vocabulary. They never
collapse into one another.

### Layer 1 — Student-Facing (Motesart Language)
The voice the student hears. The voice T.A.M.i and Motesart use.
The voice on every gate screen, every WYL intervention, every Find
the Note prompt.

> Vocabulary: Home, Skip, Together, Holding hands, Family, Cousin,
> Traveling, Feeling, Music-world name

### Layer 2 — Teacher / Admin Dashboard
The technical music terminology teachers, parents on request, and
administrators see in dashboards, reports, and concept-state views.

> Vocabulary: Tonic, Whole step, Half step, Major/Minor scale,
> Relative minor, Modulation, Quality, Interval, Scale degree

### Layer 3 — Internal System (Engineering)
The identifiers used in JSON schemas, Airtable tables, code
constants, mistake codes, and inter-system messaging. Never
displayed to students or teachers.

> Vocabulary: `T_HALF_STEP`, `T_WHOLE_STEP`, `T_MAJOR_SCALE_PATTERN`,
> `is_ownership_gate`, `WRONG_HALF_STEP_LOCATION`, `confidence_score`,
> concept IDs, mistake codes, telemetry keys.

### Translation Examples

| Student hears | Teacher dashboard shows | System stores |
|---|---|---|
| "3 and 4 are together." | "Student identified the 3–4 half-step location." | `T_HALF_STEP_3_4_OWNED` |
| "You found the skip." | "Whole step interval recognized correctly." | `T_WHOLE_STEP.confidence += 0.08` |
| "1 is home." | "Tonic correctly identified in C major." | `T_TONIC_C_OWNED` |
| "You almost had it." | "Confidence 72% — approaching ownership." | `confidence_score: 72` |

The system must translate fluently between layers. A teacher
report that uses "together" instead of "half step" is non-conforming.
A student screen that surfaces "T_HALF_STEP" or "72% mastered" is
non-conforming. A JSON field that uses "skip" as a concept ID is
non-conforming.

### Translation Lock

When a developer, designer, AI agent, or future teammate needs to
write text that will appear on screen, they must first ask: **who is
reading this?** The answer determines the language layer. There is
no exception, no shortcut, no merged-vocabulary mode.

---

## Article IV — The Earned-Name Doctrine

Technical music vocabulary (whole step, half step, tonic, relative
minor, modulation, etc.) is never the first vocabulary the student
encounters for a concept. The technical name is introduced only
**after** the student has demonstrated ownership of the Motesart
language equivalent.

The name reveal follows a fixed phrasing pattern:

> "The music-world name for [Motesart word] is [technical name].
> You already know the music. Now you know what musicians call it."

Examples:

> "The music-world name for skip is **whole step**."
>
> "The music-world name for together is **half step**."
>
> "The music-world name for home is **tonic** — or sometimes the
> **root** of the key. Same idea. Just the technical name."
>
> "The music-world name for cousin is **relative minor**. Same
> family. Different feeling."

The name-reveal is its own micro-celebration moment within the gate.
It marks the transition from "I know the music" to "I know the
music AND the words for it." Both vocabularies are valid from that
point forward. The student may use either.

---

## Article V — Family Story Discipline

The family analogy is the through-line for the entire Motesart
beginner curriculum. To prevent the metaphor from collapsing under
its own weight, family vocabulary is reserved for **exactly five
roles**:

1. **Home** — the note 1, the tonic, the place songs come back to
2. **Family** — the seven notes that belong to a key
3. **Together pairs** — 3-and-4, 7-and-8 (the half steps)
4. **Cousin** — the relative minor (same family, different feeling)
5. **Traveling** — modulation (visiting another family)

**No other concept gets family vocabulary.** Chord substitutions are
not "siblings." Inversions are not "rearranging the furniture."
Voicings are not "outfits." If a future Motesart concept needs a
metaphor, it gets its own metaphor — it does not extend the family
metaphor.

This discipline protects the family story from becoming cute,
childish, or overloaded. The five roles must be defended as the
complete vocabulary set. New family roles can only be added by an
amendment to this Constitution.

---

## Article VI — Story Earned by Sound, Not by Lecture

Character labels for individual scale degrees (such as "5 is the
Pull Note" or "7 wants to come home") are **never assigned in
advance**. They are earned by the student first hearing the sound
and feeling the pull.

The phrasing pattern for an earned character label is:

> "Did you hear how [N] wanted to land on [M]? That's why we say
> [character description]."

This protects the system from feeling like a cartoon. Adults and
older students will not tolerate a curriculum that hands them ten
character names in a glossary before they have heard a single note.
The story emerges from audiation, not from a character sheet.

---

## Article VII — The Earned Character Label Rule
*[Strengthened in v1.1 — formalizes Article VI as a hard rule]*

This Article makes the doctrine in Article VI **enforceable** by
giving it specific build constraints.

### The Rule

**A character label may not appear in a lesson JSON, Motesart
script, T.A.M.i phrase, or any student-facing screen until the
student has heard or experienced the sound that earns it.**

### What This Means in Practice

- "7 wants to go home" does not appear until the student has heard
  a 7-to-8 resolution at least once with intent.
- "5 pulls home" does not appear until the student has heard a
  V-I resolution at least once with intent.
- "6 is the cousin" does not appear until the student has heard the
  major-to-relative-minor shift at least once with intent.

"With intent" means the student is consciously listening to the
sound, not just hearing it incidentally during a different lesson.
A Feel Check or an audiation prompt counts. A background scale
playback does not.

### The Two-Step Pattern

Every character label introduction follows this exact sequence:

**Step 1 — Sound First.**
T.A.M.i or Motesart plays the sound and asks the student to feel
it. No name is given. The student responds with what they felt.

> "Listen to this. (plays 7 → 8) What did that feel like to you?"

**Step 2 — Name Earned.**
After the student responds, Motesart names what they just heard.

> "That feeling? That's why we say 7 wants to go home. It's
> resolving — coming home to 8."

### Build Constraint

Every lesson JSON that introduces a character label must declare
the prerequisite audiation event in its `prerequisites` array. The
gate runner must verify the audiation event has been completed
before rendering the labeling teach moment. A gate that introduces
a character label without a corresponding audiation prerequisite is
non-conforming.

---

## Article VIII — The Audiation Lock and Feel Check
*[Strengthened in v1.1 — Feel Check is internal evidence, never
a graded quiz that can block the student]*

Every gate must include a **Feel Check** at the end of the proof
loop. The Feel Check is not a quiz. It is a single prompt that
tests audiation — whether the student can recognize the gate's
concept by feel, without thinking through it.

Standard Feel Check phrasing:

> "Close your eyes. I'll play [stimulus]. After each one, just say
> [response option] — whichever you feel first. Don't think about
> it."

### What Feel Check IS

- **Internal evidence** captured for T.A.M.i to calibrate the
  student's `confidence_score` and audiation maturity
- **A trigger signal** for routing decisions — slow response time
  or low accuracy may suggest a future WYL ear-training intervention
- **An invisible diagnostic** that helps T.A.M.i decide whether the
  student is "owned by brain" (calculating) vs "owned by body"
  (audiating)

### What Feel Check IS NOT

- **Not a graded quiz.** A student cannot fail a Feel Check.
- **Not a gate blocker.** Feel Check results do not prevent
  advancement to the next gate.
- **Not surfaced to the student as a score.** Students never see
  Feel Check accuracy percentages or response times.
- **Not surfaced to the student as a label.** Students do not hear
  "your Feel Check was at 60%." They never hear about Feel Check
  by name at all.

### How Feel Check Affects the System

Feel Check data flows into the Mastery Ledger as a separate signal,
combined with proof-loop accuracy to produce a holistic ownership
picture. Teachers may see Feel Check data in their dashboards (per
Article III translation layer). Students never see it.

If a student's Feel Check signal trends weak over multiple gates,
T.A.M.i may schedule a remediation session or a WYL ear-training
intervention — but the trigger is invisible to the student. They
simply experience the system "knowing what they need."

The audiation lock is what makes the Motesart system feel
intelligent. It is the system measuring something the student
cannot see, then responding to it with care.

---

## Article IX — Narrative Intensity Per Age Band
*[Strengthened in v1.1 — narrative intensity is a hard requirement,
not a suggestion]*

The same gate doctrine, the same Motesart language, and the same
proof requirements apply across all student ages. **What changes is
the narrative intensity** — how much story scaffolding accompanies
the teaching.

Every gate JSON **must** declare a `narrative_intensity` block with
exactly three age band entries. A gate JSON missing this block is
non-conforming.

| Band | Intensity | Delivery |
|---|---|---|
| Child (under 13) | Full | Family analogy, story arc, characters earned by sound, holding-hands language, full emotional framing |
| Teen (13-17) | Medium | Skip/together language, family hint, no characters yet, no holding-hands language, light emotional framing |
| Adult (18+) | Minimal | Skip/together as terminology, family as parenthetical, no characters, no holding-hands language, no emotional framing |

### What Changes Between Bands

The **concept** stays identical. The **proof loop** stays identical.
The **language locks** stay identical (skip, together, home,
family). Only the **delivery wrapper** changes.

Example for Gate 1 (Skip & Together):

**Child intensity:**
> "Some notes hold hands. They're stuck right next to each other —
> there's no note between them to skip. Like family members standing
> shoulder to shoulder. We call those notes together."

**Teen intensity:**
> "Some notes are right next to each other with nothing between
> them. Other notes have a note in between that you skip past. We
> call them together and skip."

**Adult intensity:**
> "Two kinds of distance between notes. Together — adjacent, no
> note between. Skip — one note between. That's the foundation of
> the major scale pattern."

All three deliver the same concept, use the same protected
vocabulary, and end at the same proof loop. The student's
onboarding profile selects the band. The WYL engine may shift the
band in real time if behavioral signals suggest the student is
disengaging at one intensity level.

### Build Constraint

Every gate's `teach` block, `wyl_intervention` block, and
`motesart_intro` field must have three variants — one per band. If
a gate cannot articulate all three intensities for a moment, that
moment is not yet complete and the gate cannot be marked ready
for production.

---

## Article X — The Beginner Gate Order

The Motesart beginner curriculum runs through a fixed nine-gate
sequence. Each gate teaches exactly one concept. Each gate must be
**owned** (execution + ownership both proven) before the next gate
unlocks.

| Gate | Name | Concept | Homework Game Variant |
|---|---|---|---|
| Gate 0 | Find Home | 1 is home. Every song has a home note. | Find Home |
| Gate 1 | Skip & Together | Skip vs Together as physical distance | Find Together |
| Gate 2 | The Family Pattern | Skip-Skip-Together-Skip-Skip-Skip-Together | Find the Pattern |
| Gate 3 | Numbers in C | C-D-E-F-G-A-B-C = 1-2-3-4-5-6-7-8 | Find the Number |
| Gate 4 | Feel the Pattern | Audiation — hear skip vs together | Find the Sound |
| Gate 5 | Say It Back | Call and response ownership | Call & Response Mode |
| Gate 6 | Finger Path | Thumb-under ascending, crossover descending | Find the Finger |
| Gate 7 | Play It | Full play-through proof | Play It |
| Gate 8 | Homework Reinforcement | Spaced retrieval across all earned gates | All variants rotating |

(See Article XIV for the binding rule that the current production
Pattern Mind work is preserved and reclassified, not deleted.)

The previous 8-gate doctrine (ratified the same day this Constitution
was written) is **superseded** by this 9-gate order. The earlier
doctrine document remains as historical record and as the technical
template for proof loops, but the gate numbering and concept order
in this Article is the new source of truth.

---

## Article XI — The Speak-or-Text Input Rule

Every student answer in every gate, in every WYL intervention, and
in every Find the Note variant must support **both spoken and typed
input**. The choice is the student's, every time.

This is not a feature. It is the input contract for every gate.
A gate that does not support voice input is non-conforming and
must not be marked complete.

The default input mode is whichever the student last used. The
mic toggle appears next to every text input. Voice input uses the
existing `POST /api/mya/voice` pipeline (Deepgram → Claude → return
parsed answer). Text input writes directly to the answer handler.
Both inputs produce identical data shapes for T.A.M.i.

The only exception is the final play-through proof in Gate 7, where
the proof is an instrument performance, not a verbal answer. Even
in Gate 7, any verbal explanation step (the ownership question) must
still support both spoken and typed input.

---

## Article XII — Motesart Presence Rule

Motesart is the teacher. He is present on every teaching page,
present during practice, present during WYL interventions. His
avatar and a small speech bubble appear in the corner of every
gate screen except during a quiz moment, where his presence
disappears to prevent the student from asking him questions
during the test.

Quiz moments (the proof questions inside a gate) are the only
screens where Motesart is absent. During quiz moments, the avatar
is replaced with a small indicator that says "Test mode — answer
on your own." Once the quiz ends, Motesart reappears with the
feedback.

A "Repeat that" button is always available on Motesart's speech
bubble, allowing the student to replay any instruction. The button
uses the same voice pipeline as the speak-or-text rule.

---

## Article XIII — Student-Facing Confidence Rule
*[New in v1.1 — locks the tone for all student-facing feedback]*

**Students never hear percentages. Students never see scores.**
Motesart and T.A.M.i speak in consequences and felt outcomes,
not in numeric measurement.

### What Students See and Hear

Motesart and T.A.M.i speak the confidence tiers in plain language,
tied to the actual feeling of the moment.

| Internal Tier (system) | What Student Hears |
|---|---|
| Not ready (0–39%) | "Let's back up. We need more time here before we move on." |
| Developing (40–69%) | "You're getting there. Let's try that again." |
| Almost owned (70–84%) | "You almost had it. One more pass and it'll stick." |
| Owned (85–94%) | "Yes. You had it." |
| Mastered (95–100%) | "That is locked. You know where the [concept] lives." |

### What Students Never See

- Numeric mastery scores ("72% mastered")
- Progress percentages ("you're 60% through this concept")
- Confidence rankings ("ranked 3rd in your cohort")
- Quiz averages ("your average is 78%")
- Feel Check scores (per Article VIII)
- T-codes, gate IDs, mistake codes, or any internal-system terminology

### What Teachers and Admins See

Teachers, parents on request, and administrators see the **full
numeric data** via the Article III Layer 2 dashboard language.
Teachers see percentages, response times, trend lines, mistake
categories, and remediation queue depth. This is essential for
teacher intervention. It is invisible to the student.

### Why This Rule Exists

Numbers shift the student's attention from the music to the
measurement. A student who is told "you're 72% mastered" stops
listening to the sound and starts negotiating with the score.
A student who is told "you almost had it" stays in the music.

This is the Motesart tone. It is what makes the system feel like
a teacher and not a test.

### Build Constraint

Any student-facing component that renders a numeric score, a
percentage, a ranking, or an internal system code is non-conforming.
The render layer must consult the Article XIII tier-to-language
table and emit the language equivalent.

---

## Article XIV — Find the Note as the Universal Homework Engine
*[Strengthened in v1.1 — formalizes Find the Note as an engine,
not a single game, and locks gate-specific variants]*

The Find the Note game is not a separate ear-training experience.
It is the **universal homework reinforcement engine** that fires
after every gate, configured to the gate's concept.

### The Engine, Not a Game

Find the Note is one engine that powers many variants. The engine
provides:

- Audio synthesis and playback
- Staff notation rendering
- Piano keyboard input
- Streak tracking and gamification
- Telemetry to the Game_Sessions table in Airtable
- Level system (L1-L13+) with locked octave and notes-per-round rules

What changes per gate is the **framing** — the question, the
answer mode, the visual scaffolding. The engine stays the same.
The data shape that flows to T.A.M.i stays the same.

### Gate-Specific Variants (Locked)

| Gate | Variant | What the Engine Asks |
|---|---|---|
| Gate 0 | Find Home | "Where is 1?" Student taps the home note. |
| Gate 1 | Find Together | Engine plays two notes. Student answers "together or skip?" |
| Gate 2 | Find the Pattern | Engine plays a sequence with one wrong step. Student finds the error. |
| Gate 3 | Find the Number | Engine plays a note. Student taps the right number (1-8). |
| Gate 4 | Find the Sound | Engine plays without showing notation. Pure ear. |
| Gate 5 | Call & Response Mode | Engine speaks a pattern. Student says it back (voice input). |
| Gate 6 | Find the Finger | Engine adds finger highlight cues on keyboard. |
| Gate 7 | Play It | Full play-through proof at the student's earned level. |

### Gate JSON Contract

Each gate JSON must declare a `homework_game` block specifying:

- `variant` — which Find the Note framing applies
- `engine` — always `FindTheNote`
- `level_locked` — the maximum game level the student can play at
  for this gate's homework, based on what they have earned
- `notes_per_round` — derived from level (per the locked rule:
  L1-L3 = 1 octave, notes = level number)
- `scale` — the active key (C_major for all beginner gates)
- `ask_for` — what the game asks the student to identify
- `success_threshold` — percentage required to mark the homework
  session as a reinforcement pass

### Level Lock

The student's level in Find the Note **must match the highest gate
they have earned**. A student who has passed Gate 0 only can play
Find the Note at L1. A student who has passed through Gate 3 can
play at L1-L3. This protects the student from being asked to
identify content they have not yet been taught.

The Find the Note 13-level system (L1-L13+ with three tiers:
Beginner L1-L3, Intermediate L4-L9, Advanced L10-L12, Prodigy
L13+) remains locked as previously defined. The Constitution does
not alter the level system. It only specifies that each beginner
gate maps to L1-L3 only, and advancement past L3 requires
completion of the full Gate 0 through Gate 8 sequence.

### Telemetry Lock

The Find the Note telemetry pipeline (Game_Sessions table in
Airtable, via Railway backend) is the canonical evidence stream
for homework reinforcement. The Mastery Ledger reads from
Game_Sessions to determine whether a gate's ownership is reinforced
or decaying.

A new variant of Find the Note cannot be introduced without:
1. Declaring it in a gate JSON `homework_game` block
2. Conforming to the existing telemetry data shape
3. Being added to the locked variant table in this Article

---

## Article XV — Preservation of Pattern Mind
*[New in v1.1 — build discipline lock for the existing work]*

The current production Gate 0 component (`MajorScalePatternGate.jsx`),
its associated lesson JSON (`L00_major_scale_pattern.json`), and the
Netlify deployment at `/practice/C_MAJOR_GATE_0` represent shipped
work that is technically correct in every dimension except gate
numbering.

This Article makes it constitutional that **this work is preserved,
not deleted, not rewritten from scratch, and not abandoned**.

### Preservation Rule

The Pattern Mind work is reclassified as **Gate 2 — The Family
Pattern** per Article X. The reclassification is a **renaming and
re-threading**, not a rebuild.

The following remain in place and are not regressed:

- The component file `MajorScalePatternGate.jsx` (component name
  may be renamed to `FamilyPatternGate.jsx` for clarity)
- The lesson JSON structure and schema
- The WYL intervention routing logic
- The mistake detection code categories
- The `is_ownership_gate` flag-based detection
- The proof loop architecture
- The Mastery Ledger evidence write contract

What changes in the Gate 2 re-thread:

- The teaching language is updated to lead with **skip and
  together** before the major scale formula is revealed as the
  music-world name
- The route may be renamed from `/practice/C_MAJOR_GATE_0` to
  `/practice/C_MAJOR_GATE_2` (or a more student-friendly slug)
- The next-gate pointer is updated to point to Gate 3, not Gate 1
- The prerequisites array gains `T_HOME_OWNED` (from Gate 0) and
  `T_SKIP_TOGETHER_OWNED` (from Gate 1)

### Override Condition

The preservation rule may only be overridden by a **written
architecture review** that proves the existing component cannot
serve as Gate 2 with the language and threading updates alone.
The review must:

1. Identify the specific technical blocker
2. Propose a replacement architecture
3. Document what existing work is salvageable
4. Be approved before any deletion or rewrite

This protects the system from rebuild-waste pressure during
doctrine evolution.

### Existing Production State Protection

Until Gate 2 is officially re-threaded, the current
`/practice/C_MAJOR_GATE_0` route remains live as working reference
code. No student traffic should be directed to it as a "first
gate" experience until the language update is complete, but the
route itself stays in place to prevent build regressions in the
SOM Mastery Intelligence Engine.

---

## Article XVI — The Constitutional Locks

The following are the **ten permanent locks** that govern all
future Motesart work. (Expanded from v1.0's eight locks by adding
the Translation Layer and Confidence Rule locks.)

1. **Together, not squeeze.** No exceptions in any document, JSON,
   or script.

2. **Home before tonic. Skip before whole step. Together before
   half step. Family before key. Cousin before relative minor.
   Traveling before modulation. Feeling before quality.** Motesart
   language is always first. Technical vocabulary is always earned.

3. **The family vocabulary has exactly five roles.** Home, Family,
   Together, Cousin, Traveling. No new family roles without amendment.

4. **Character labels are earned by sound, not assigned by glossary.**
   The student must hear the pull before "Pull Note" is introduced.
   Lesson JSONs must declare audiation prerequisites.

5. **Every gate teaches exactly one concept.** Composite gates are
   non-conforming.

6. **Every input supports both speak and text.** Voice as a feature
   has been replaced by voice as a contract.

7. **Motesart is present on every teaching page.** He disappears only
   during quiz moments.

8. **Find the Note is the universal homework engine.** Not a separate
   game. Not an optional add-on. The reinforcement layer for every
   gate the student has earned. Engine fixed, variants gate-specific.

9. **Three language layers, never collapsed.** Student-facing
   (Motesart), Teacher/Admin (Music-world), Internal System
   (Engineering). Translation between layers is required.
   *[New in v1.1]*

10. **Students never hear percentages or see scores.** Motesart
    speaks consequences, not measurement. Teachers see numbers;
    students hear language.
    *[New in v1.1]*

These locks cannot be relaxed by user request, by build pressure,
by time pressure, or by a senior team member without a written
amendment to this Constitution.

---

## Article XVII — Amendment Process

This Constitution can be amended. Amendments require:

1. A written proposal stating the specific Article and the proposed
   change
2. A justification grounded in either pedagogical research, student
   data from the Mastery Ledger, or a documented teaching success
   that the Constitution does not currently accommodate
3. Explicit acknowledgment of which downstream documents will need
   to be updated (lesson JSONs, component code, teacher scripts,
   ambassador prompts)
4. Ratification by the Motesart system owner before any code or
   curriculum change reflects the amendment

Amendments are appended to this document with a version bump
(1.0 → 1.1 for clarifications, 1.0 → 2.0 for structural changes).
The original Article text is preserved in an amendments appendix.

---

## Article XVIII — Relationship to Other Documents

This Constitution governs **what is taught and how it is said**.

It does not govern:
- Build process, file protection, and deploy discipline. Those live
  in `motesart_constitution.md` (the system constitution).
- Specific lesson content beyond the language locks. Lesson JSONs
  carry the question text, mistake codes, and WYL interventions.
- The Mastery Intelligence Engine technical schema. That lives in
  `SOM_MASTERY_INTELLIGENCE_ENGINE_DOCTRINE.md`.

When the Language Constitution and a lesson JSON disagree, the
Language Constitution wins. When the Language Constitution and the
Mastery Intelligence Engine Doctrine disagree, the Language
Constitution wins for language; the Doctrine wins for technical
proof-loop structure. When the Language Constitution and the system
constitution (`motesart_constitution.md`) disagree, the system
constitution wins for build process; the Language Constitution wins
for student-facing language.

---

## Ratification

This Constitution is ratified as Version 1.1 on May 21, 2026.

### Scope

Constitution v1.1 governs beginner music language, gate sequencing,
T.A.M.i teaching voice, homework-game framing, and student-facing
mastery language. It does not replace engineering architecture
docs, Airtable schema docs, or the general SOM product constitution.

### Conformance Requirement

Every Motesart system component that touches student-facing
language — lesson JSONs, gate components, ambassador scripts,
T.A.M.i prompts, teacher dashboards, parent reports — must be
brought into conformance before any new gate is built.

The first build following this ratification is **Gate 0 — Find
Home**, built in conformance with every Article of this
Constitution. The current production Gate 0 (Pattern Mind) is
reclassified as Gate 2 — The Family Pattern (per Article XV
preservation rule), and its language must be updated to lead with
skip and together before the major scale formula is revealed as
the music-world name.

---

## Appendix A — v1.0 to v1.1 Article Map

| v1.0 Article | v1.1 Article | Status |
|---|---|---|
| I — Foundational Principle | I | Unchanged |
| II — Protected Language | II | Unchanged |
| — | III — Motesart Translation Layer | **New in v1.1** |
| III — Earned-Name Doctrine | IV | Unchanged |
| IV — Family Story Discipline | V | Unchanged |
| V — Story Earned by Sound | VI | Unchanged |
| — | VII — Earned Character Label Rule | **New in v1.1, strengthens VI** |
| VIII — Audiation Lock | VIII | **Strengthened — Feel Check is internal** |
| VI — Narrative Intensity | IX | **Strengthened — hard requirement** |
| VII — Beginner Gate Order | X | Unchanged |
| IX — Speak-or-Text Input | XI | Unchanged |
| X — Motesart Presence | XII | Unchanged |
| — | XIII — Student-Facing Confidence | **New in v1.1** |
| XI — Find the Note Engine | XIV | **Strengthened — engine, not game** |
| — | XV — Preservation of Pattern Mind | **New in v1.1** |
| XII — Constitutional Locks | XVI | **Expanded — 8 to 10 locks** |
| XIII — Amendment Process | XVII | Unchanged |
| XIV — Relationship to Other Docs | XVIII | Unchanged |

— End of Constitution v1.1 —
